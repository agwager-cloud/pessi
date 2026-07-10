import type { WebSocket } from "ws";
import {
  CHARACTERS,
  GOAL_ZONES,
  TOURNAMENT_SIZES,
  clamp,
  cleanName,
  nextTournamentSize,
  type GoalZone,
  type TournamentSize
} from "@pessi/shared";
import type { ActivePenalty, BracketMatch, PlayerRecord, PublicState, ShotEvent, ShotMode, TackleState } from "./types.js";

export type ClientSocket = {
  sessionId: string;
  ws: WebSocket;
};

type JoinOptions = { name?: string };

const TACKLE_LINES = [
  "banana-peel backflip tackle",
  "shopping-trolley shin tickler",
  "world-class accidental shoelace trip",
  "flying spaghetti slide tackle",
  "slow-motion marshmallow crunch",
  "dramatic ankle breeze collision",
  "goalie entered: fridge-mode activated",
  "wobbly flamingo mega tackle",
  "emotional support elbow nudge",
  "cartwheel of questionable defending"
];

const SHOT_LINES = {
  goal: [
    "GOOOOAL! The keeper guessed like a broken calculator.",
    "Top bins! The crowd throws imaginary sandwiches!",
    "Buried it! The net is filing a complaint.",
    "Goal! The goalie dove into next Thursday.",
    "Cool finish. Absolutely spicy."
  ],
  save: [
    "Saved! The goalie read that like a picture book.",
    "Denied! Big gloves, bigger drama.",
    "Saved! The keeper became a human fridge.",
    "No goal! The goalie guessed the snack cupboard correctly.",
    "Stopped! That shot had homework energy."
  ],
  miss: [
    "MISS! That ball may have landed in another suburb.",
    "Sprayed wide! Someone check the car park.",
    "Over the bar! NASA has been notified.",
    "Missed! The corner flag was the real target apparently.",
    "Skied it! That shot needs a boarding pass."
  ],
  softMiss: [
    "Clang! Off the post and out for a sad little jog.",
    "Too soft! The post has rejected that application.",
    "Ding! The crossbar says try eating your vegetables.",
    "Not enough mustard! The woodwork did the laughing."
  ],
  chaosMiss: [
    "Absolute chaos! That rocket has left the postcode.",
    "Wild miss! The ball has applied for air traffic control.",
    "Too spicy! The shot has gone sightseeing.",
    "Launch detected! That miss needs a passport."
  ]
};

function randomFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function zoneFromAim(x: number, y: number): GoalZone {
  const col = x < 1 / 3 ? "L" : x > 2 / 3 ? "R" : "M";
  const row = y < 0.5 ? "T" : "L";
  return `${row}${col}` as GoalZone;
}

function adjacentZones(zone: GoalZone): GoalZone[] {
  return {
    TL: ["TM", "LL"],
    TM: ["TL", "TR", "LM"],
    TR: ["TM", "LR"],
    LL: ["TL", "LM"],
    LM: ["LL", "TM", "LR"],
    LR: ["TR", "LM"]
  }[zone] as GoalZone[];
}

function canTeamStillCatch(taken: number, goals: number, otherGoals: number): boolean {
  const remaining = 5 - taken;
  return goals + remaining >= otherGoals;
}

type MatchRuntime = {
  matchId: string;
  phase: "tackle" | "penalty" | "penaltyResult";
  activePenalty: ActivePenalty | null;
  tackle: TackleState | null;
  lastShot: ShotEvent | null;
  message: string;
  timer: NodeJS.Timeout | null;
};

export class GameRoom {
  readonly roomCode: string;
  readonly clients = new Map<string, ClientSocket>();
  hostId: string | null = null;
  tournamentSize: TournamentSize = 2;
  players = new Map<string, PlayerRecord>();
  bracket: BracketMatch[] = [];
  phase: PublicState["phase"] = "lobby";
  roundNumber = 0;
  matchIndex = 0;
  message = "Waiting for players.";
  private botCounter = 1;
  private tick: NodeJS.Timeout;
  private runtimes = new Map<string, MatchRuntime>();
  private spectatorMatchByViewer = new Map<string, string>();

  constructor(roomCode: string) { this.roomCode = roomCode; this.tick = setInterval(() => this.update(), 100); }
  join(client: ClientSocket, options: JoinOptions) {
    this.clients.set(client.sessionId, client);
    const existing = this.players.get(client.sessionId);
    if (existing) { existing.connected = true; existing.sessionId = client.sessionId; }
    else this.players.set(client.sessionId, { id: client.sessionId, sessionId: client.sessionId, name: cleanName(options.name), characterIndex: -1, isBot: false, connected: true, eliminated: false, wins: 0 });
    if (!this.hostId) this.hostId = client.sessionId;
    // Character selection is now an explicit authoritative room phase. This
    // keeps every client on the same route and avoids the client having to
    // infer the scene from an unselected character alone.
    if (this.phase === "lobby") this.phase = "characterSelect";
    this.autoSizeToHumans();
    this.message = `${this.nameOf(client.sessionId)} is choosing a footballer.`;
    this.broadcastState();
  }
  leave(sessionId: string) {
    this.spectatorMatchByViewer.delete(sessionId);
    this.clients.delete(sessionId); const p=this.players.get(sessionId);
    if (p) { p.connected=false; p.sessionId=null; if(this.phase==="lobby"||this.phase==="characterSelect") this.players.delete(sessionId); }
    if(this.hostId===sessionId) this.hostId=[...this.players.values()].find(p=>!p.isBot&&p.connected)?.id??null;
    this.autoSizeToHumans(); this.broadcastState();
  }
  dispose(){ clearInterval(this.tick); this.clearAllTimers(); }
  isEmpty(){ return this.clients.size===0; }
  receive(client: ClientSocket, raw: unknown) {
    const msg=raw as {type?:string;data?:unknown}; const type=String(msg.type??""); const data=msg.data;
    if(type==="selectCharacter") this.selectCharacter(client, Number(data));
    else if(type==="changePlayers") this.hostOnly(client,()=>this.changePlayers());
    else if(type==="setTournamentSize") this.hostOnly(client,()=>this.setTournamentSize(Number(data)));
    else if(type==="addBot") this.hostOnly(client,()=>this.addBot());
    else if(type==="removeBot") this.hostOnly(client,()=>this.removeBot(String(data??"")));
    else if(type==="removePlayer") this.hostOnly(client,()=>this.removePlayer(String(data??"")));
    else if(type==="startTournament") this.hostOnly(client,()=>this.startTournament());
    else if(type==="beginRound") this.hostOnly(client,()=>this.beginRound());
    else if(type==="move") this.handleMove(client,data);
    else if(type==="goaliePick") this.handleGoaliePick(client,String(data) as GoalZone);
    else if(type==="shoot") this.handleShoot(client,data);
    else if(type==="watchMatch") this.watchMatch(client,String(data??""));
    else if(type==="stopWatching") this.stopWatching(client);
    else if(type==="nextRound") this.hostOnly(client,()=>this.nextRoundFromResults());
    else if(type==="backToLobby") this.hostOnly(client,()=>this.backToLobby());
  }
  private hostOnly(c:ClientSocket,fn:()=>void){ if(c.sessionId!==this.hostId)return; fn(); this.broadcastState(); }
  private runtimeForPlayer(id:string):MatchRuntime|null { return [...this.runtimes.values()].find(r=>{const m=this.matchById(r.matchId);return m&&(m.p1===id||m.p2===id);})??null; }
  private runtimeForViewer(id:string):{runtime:MatchRuntime|null;isSpectating:boolean} {
    const own=this.runtimeForPlayer(id);
    if(own)return {runtime:own,isSpectating:false};
    const watchedId=this.spectatorMatchByViewer.get(id);
    const watched=watchedId?this.runtimes.get(watchedId)??null:null;
    if(!watched&&watchedId)this.spectatorMatchByViewer.delete(id);
    return {runtime:watched,isSpectating:!!watched};
  }
  private watchMatch(c:ClientSocket,matchId:string){
    if(this.runtimeForPlayer(c.sessionId))return;
    if(!this.runtimes.has(matchId))return;
    this.spectatorMatchByViewer.set(c.sessionId,matchId);
    this.broadcastState();
  }
  private stopWatching(c:ClientSocket){this.spectatorMatchByViewer.delete(c.sessionId);this.broadcastState();}
  private publicState(viewerId?:string):PublicState {
    const view=viewerId?this.runtimeForViewer(viewerId):{runtime:null,isSpectating:false};
    const r=view.runtime;
    const visiblePenalty=r?.activePenalty?{...r.activePenalty,goaliePick:viewerId===r.activePenalty.goalieId?r.activePenalty.goaliePick:null}:null;
    const viewerPlayer = viewerId ? this.players.get(viewerId) : null;
    const viewerPhase = r ? r.phase : (viewerPlayer && !viewerPlayer.isBot && viewerPlayer.characterIndex < 0 ? "characterSelect" : this.phase);
    const liveCount=this.runtimes.size;
    return { roomCode:this.roomCode,hostId:this.hostId,phase:viewerPhase,tournamentSize:this.tournamentSize,players:[...this.players.values()].sort((a,b)=>a.name.localeCompare(b.name)),bracket:this.bracket,activeMatchId:r?.matchId??null,isSpectating:view.isSpectating,liveMatchIds:[...this.runtimes.keys()],activePenalty:visiblePenalty,tackle:r?.tackle??null,lastShot:r?.lastShot??null,roundNumber:this.roundNumber,matchIndex:r?this.matchById(r.matchId)?.matchNo??0:this.matchIndex,message:r?.message??(this.phase==="roundLive"?`Round ${this.roundNumber} is live • ${liveCount} human match${liveCount===1?"":"es"} still playing.`:this.message)};
  }
  private broadcastState(){ for(const c of this.clients.values()) if(c.ws.readyState===c.ws.OPEN)c.ws.send(JSON.stringify({type:"state",data:this.publicState(c.sessionId)})); }
  private selectCharacter(c: ClientSocket, requested: number) {
    const player = this.players.get(c.sessionId);
    if (!player || player.isBot || player.characterIndex >= 0) return;
    const index = Number.isFinite(requested) ? Math.floor(requested) : -1;
    if (index < 0 || index >= CHARACTERS.length) return;
    const taken = [...this.players.values()].some(p => p.id !== player.id && p.characterIndex === index);
    if (taken) {
      this.message = `${CHARACTERS[index].name} was just taken. Please choose another player.`;
      this.broadcastState();
      return;
    }
    player.characterIndex = index;
    this.message = `${player.name} selected ${CHARACTERS[index].name}.`;
    const waiting = [...this.players.values()].some(p => !p.isBot && p.connected && p.characterIndex < 0);
    if (!waiting && this.phase === "characterSelect") {
      this.phase = "lobby";
      this.autoSizeToHumans();
      this.message = "Everyone has selected a player. Welcome back to the lobby.";
    }
    this.broadcastState();
  }
  private changePlayers() {
    if (this.phase !== "finalResults") return;
    this.clearAllTimers();
    this.runtimes.clear();
    this.spectatorMatchByViewer.clear();
    for (const [id, player] of [...this.players.entries()]) {
      if (player.isBot) this.players.delete(id);
      else {
        player.characterIndex = -1;
        player.eliminated = false;
        player.wins = 0;
      }
    }
    this.bracket = [];
    this.roundNumber = 0;
    this.matchIndex = 0;
    this.phase = "characterSelect";
    this.autoSizeToHumans();
    this.message = "Choose new players — first in, best dressed!";
  }
  private pickCharacterIndex(requested:number){const used=new Set([...this.players.values()].filter(p=>p.characterIndex>=0).map(p=>p.characterIndex));const safe=Number.isFinite(requested)?clamp(Math.floor(requested),0,CHARACTERS.length-1):0;if(!used.has(safe))return safe;for(let i=0;i<CHARACTERS.length;i++)if(!used.has(i))return i;return safe;}
  private autoSizeToHumans(){if(this.phase!=="lobby"&&this.phase!=="characterSelect")return;const h=[...this.players.values()].filter(p=>!p.isBot).length;this.tournamentSize=nextTournamentSize(h);this.trimBotsToFit();}
  private setTournamentSize(size:number){const h=[...this.players.values()].filter(p=>!p.isBot).length;this.tournamentSize=TOURNAMENT_SIZES.find(n=>n===size&&n>=h)??nextTournamentSize(h);this.trimBotsToFit();this.fillBots();this.message=`Bracket set to ${this.tournamentSize}. Bots filled the remaining positions.`;}
  private trimBotsToFit(){const h=[...this.players.values()].filter(p=>!p.isBot).length;const bots=[...this.players.values()].filter(p=>p.isBot);while(bots.length>Math.max(0,this.tournamentSize-h)){const b=bots.pop();if(b)this.players.delete(b.id);}}
  private fillBots(){let h=[...this.players.values()].filter(p=>!p.isBot).length,b=[...this.players.values()].filter(p=>p.isBot).length;while(h+b<this.tournamentSize){this.addBot(false);b++;}}
  private addBot(announce=true){if(this.players.size>=this.tournamentSize)return;const ci=this.pickCharacterIndex(this.botCounter%CHARACTERS.length),ch=CHARACTERS[ci],id=`bot_${Date.now()}_${this.botCounter++}`;this.players.set(id,{id,sessionId:null,name:ch.name,characterIndex:ci,isBot:true,connected:true,eliminated:false,wins:0});if(announce)this.message=`${ch.name} entered as a bot.`;}
  private removeBot(id:string){const p=this.players.get(id);if(p?.isBot&&this.phase==="lobby"){this.players.delete(id);this.message=`${p.name} bot removed.`;}}
  private removePlayer(id:string){const p=this.players.get(id);if(!p||(this.phase!=="lobby"&&this.phase!=="characterSelect")||id===this.hostId)return;this.players.delete(id);this.autoSizeToHumans();}
  private createMatch(round:number,matchNo:number,p1:string,p2:string):BracketMatch{return{id:`r${round}m${matchNo}_${Date.now()}_${Math.floor(Math.random()*9999)}`,round,matchNo,p1,p2,p1Score:0,p2Score:0,p1Shootout:0,p2Shootout:0,p1ShootoutTaken:0,p2ShootoutTaken:0,winnerId:null,loserId:null,events:[],status:"pending"};}
  private startTournament(){if(this.phase!=="lobby")return;if([...this.players.values()].some(p=>!p.isBot&&p.connected&&p.characterIndex<0)){this.message="Waiting for every human player to choose a character.";return;}this.fillBots();const entrants=[...this.players.values()].slice(0,this.tournamentSize);if(entrants.length<2){this.message="Need at least 2 players.";return;}for(const p of this.players.values()){p.eliminated=!entrants.some(e=>e.id===p.id);p.wins=0;}this.bracket=[];this.roundNumber=1;const ids=shuffle(entrants.map(p=>p.id));for(let i=0;i<ids.length;i+=2)this.bracket.push(this.createMatch(1,i/2+1,ids[i],ids[i+1]));this.phase="tournament";this.message="First round matchups are ready. Host can begin Round 1.";}
  private beginRound(){if(this.phase!=="tournament")return;this.clearAllTimers();this.runtimes.clear();this.spectatorMatchByViewer.clear();for(const m of this.bracket.filter(m=>m.round===this.roundNumber&&m.status==="pending")){if(this.players.get(m.p1)?.isBot&&this.players.get(m.p2)?.isBot)this.autoResolveBotMatch(m);else{m.status="playing";const r:MatchRuntime={matchId:m.id,phase:"tackle",activePenalty:null,tackle:null,lastShot:null,message:"",timer:null};this.runtimes.set(m.id,r);this.startTackle(r,m.p1,m.p2);}}this.phase="roundLive";this.message=`Round ${this.roundNumber} is live. All human matches started together.`;this.checkRoundComplete();}
  private matchById(id:string){return this.bracket.find(m=>m.id===id)??null;}
  private autoResolveBotMatch(m:BracketMatch){m.status="playing";m.p1Score=Math.random()<.72?1:0;m.p2Score=Math.random()<.72?1:0;if(m.p1Score===m.p2Score){for(let i=0;i<5;i++){m.p1ShootoutTaken++;m.p2ShootoutTaken++;if(Math.random()<.74)m.p1Shootout++;if(Math.random()<.74)m.p2Shootout++;}while(m.p1Shootout===m.p2Shootout){m.p1ShootoutTaken++;m.p2ShootoutTaken++;if(Math.random()<.74)m.p1Shootout++;if(Math.random()<.74)m.p2Shootout++;}}const w=m.p1Score*10+m.p1Shootout>=m.p2Score*10+m.p2Shootout?m.p1:m.p2;this.markFinished(m,w,w===m.p1?m.p2:m.p1);}
  private startTackle(r:MatchRuntime,kickerId:string,goalieId:string){this.clearRuntimeTimer(r);const now=Date.now();r.phase="tackle";r.activePenalty=null;r.lastShot=null;r.tackle={kickerId,goalieId,kickerX:310,kickerY:360,goalieX:970,goalieY:360,tackleText:randomFrom(TACKLE_LINES),startedAt:now,timeoutAt:now+7200,impactAt:null};r.message=`${this.nameOf(goalieId)} is approaching for a ${r.tackle.tackleText}!`;}
  private startPenalty(r:MatchRuntime,mode:ShotMode,kickerId:string,goalieId:string){this.clearRuntimeTimer(r);const now=Date.now(),bot=!!this.players.get(kickerId)?.isBot,delay=5200;r.phase="penalty";r.tackle=null;r.lastShot=null;r.activePenalty={mode,kickerId,goalieId,shotLabel:this.shotLabel(r,mode,kickerId),goaliePick:this.players.get(goalieId)?.isBot?randomFrom(GOAL_ZONES):null,startedAt:now,timeoutAt:now+(bot?delay:22000)};r.message=bot?`${this.nameOf(kickerId)} is winding up. Bot shot in 5 seconds!`:`${this.nameOf(kickerId)} steps up against ${this.nameOf(goalieId)}.`;if(bot)r.timer=setTimeout(()=>{if(r.activePenalty?.kickerId===kickerId)this.resolveShot(r,{aimX:Math.random(),aimY:Math.random(),power:45+Math.random()*48});},delay);}
  private shotLabel(r:MatchRuntime,mode:ShotMode,kickerId:string){const m=this.matchById(r.matchId);if(!m)return"Penalty";if(mode==="regular")return`${this.nameOf(kickerId)} regular penalty`;const n=kickerId===m.p1?m.p1ShootoutTaken+1:m.p2ShootoutTaken+1;return n<=5?`Shootout kick ${n} of 5`:`Sudden death kick ${n-5}`;}
  private update(){for(const r of this.runtimes.values()){if(r.phase==="tackle"&&r.tackle)this.updateTackle(r);if(r.phase==="penalty"&&r.activePenalty&&Date.now()>r.activePenalty.timeoutAt){if(!r.activePenalty.goaliePick)r.activePenalty.goaliePick="LM";this.resolveShot(r,{aimX:Math.random(),aimY:Math.random(),power:35+Math.random()*45});}}if(this.phase!=="lobby")this.broadcastState();}
  private updateTackle(r:MatchRuntime){const t=r.tackle;if(!t)return;const now=Date.now();if(t.impactAt){if(now>t.timeoutAt)this.startPenalty(r,"regular",t.kickerId,t.goalieId);return;}if(this.players.get(t.kickerId)?.isBot){t.kickerX=clamp(t.kickerX+(Math.random()-.4)*18,180,570);t.kickerY=clamp(t.kickerY+(Math.random()-.5)*18,170,590);}const dx=t.kickerX-t.goalieX,dy=t.kickerY-t.goalieY,dist=Math.hypot(dx,dy)||1,s=dist<210?38:27;t.goalieX+=(dx/dist)*s;t.goalieY+=(dy/dist)*s;if(dist<78||now>t.timeoutAt){t.impactAt=now;t.timeoutAt=now+6500;t.goalieX=t.kickerX+58;t.goalieY=t.kickerY+20;r.message=`${this.nameOf(t.goalieId)} unleashes a ${t.tackleText}! ${this.nameOf(t.kickerId)} begins a world-class flop.`;}}
  private handleMove(c:ClientSocket,data:unknown){const r=this.runtimeForPlayer(c.sessionId);if(!r||r.phase!=="tackle"||!r.tackle||c.sessionId!==r.tackle.kickerId)return;const d=data as {dx?:number;dy?:number};r.tackle.kickerX=clamp(r.tackle.kickerX+clamp(Number(d.dx??0),-1,1)*28,180,570);r.tackle.kickerY=clamp(r.tackle.kickerY+clamp(Number(d.dy??0),-1,1)*28,170,590);}
  private handleGoaliePick(c:ClientSocket,z:GoalZone){const r=this.runtimeForPlayer(c.sessionId);if(!r||r.phase!=="penalty"||!r.activePenalty||c.sessionId!==r.activePenalty.goalieId||!GOAL_ZONES.includes(z))return;r.activePenalty.goaliePick=z;r.message=`${this.nameOf(c.sessionId)} has chosen a dive.`;}
  private handleShoot(c:ClientSocket,data:unknown){const r=this.runtimeForPlayer(c.sessionId);if(!r||r.phase!=="penalty"||!r.activePenalty||c.sessionId!==r.activePenalty.kickerId)return;this.resolveShot(r,data);}
  private resolveShot(r:MatchRuntime,data:unknown){const p=r.activePenalty,m=this.matchById(r.matchId);if(!p||!m||r.phase!=="penalty")return;this.clearRuntimeTimer(r);const d=data as {aimX?:number;aimY?:number;power?:number},aimX=clamp(Number(d.aimX??.5),0,1),aimY=clamp(Number(d.aimY??.5),0,1),power=clamp(Number(d.power??60),0,100),zone=zoneFromAim(aimX,aimY),gp=p.goaliePick??"LM";const sweet=power>=25&&power<=75,soft=power<25,chaos=power>75,miss=Math.random()<((sweet?.03:0)+(soft?(power<12?.82:power<18?.62:.42):0)+(chaos?Math.min(.62,.18+((power-75)/25)*.44):0)+(aimX<.08||aimX>.92||aimY<.08?.11:0));const saved=!miss&&gp===zone,goal=!miss&&!saved,missLines=soft?SHOT_LINES.softMiss:chaos?SHOT_LINES.chaosMiss:SHOT_LINES.miss;const e:ShotEvent={matchId:m.id,mode:p.mode,kickerId:p.kickerId,goalieId:p.goalieId,goal,miss,saved,zone,goaliePick:gp,aimX,aimY,power:Math.round(power),text:randomFrom(goal?SHOT_LINES.goal:miss?missLines:SHOT_LINES.save)};this.applyShot(m,e);r.lastShot=e;r.activePenalty=null;r.phase="penaltyResult";r.message=e.text;r.timer=setTimeout(()=>this.afterShot(r,m),3300);}
  private applyShot(m:BracketMatch,e:ShotEvent){m.events.push(e);const p1=e.kickerId===m.p1;if(e.mode==="regular"){if(e.goal)p1?m.p1Score++:m.p2Score++;}else if(p1){m.p1ShootoutTaken++;if(e.goal)m.p1Shootout++;}else{m.p2ShootoutTaken++;if(e.goal)m.p2Shootout++;}}
  private afterShot(r:MatchRuntime,m:BracketMatch){const regular=m.events.filter(e=>e.mode==="regular").length;if(regular===1){this.startTackle(r,m.p2,m.p1);return;}if(regular===2&&m.p1Score!==m.p2Score){const w=m.p1Score>m.p2Score?m.p1:m.p2;this.finishMatch(r,m,w,w===m.p1?m.p2:m.p1);return;}const w=this.shootoutWinner(m);if(w){this.finishMatch(r,m,w,w===m.p1?m.p2:m.p1);return;}const k=m.p1ShootoutTaken===m.p2ShootoutTaken?m.p1:m.p2;this.startPenalty(r,"shootout",k,k===m.p1?m.p2:m.p1);}
  private shootoutWinner(m:BracketMatch):string|null{const a=m.p1ShootoutTaken,b=m.p2ShootoutTaken,ag=m.p1Shootout,bg=m.p2Shootout;if(a<=5&&b<=5){if(!canTeamStillCatch(a,ag,bg))return m.p2;if(!canTeamStillCatch(b,bg,ag))return m.p1;if(a===5&&b===5&&ag!==bg)return ag>bg?m.p1:m.p2;return null;}return a===b&&ag!==bg?(ag>bg?m.p1:m.p2):null;}
  private markFinished(m:BracketMatch,w:string,l:string){m.winnerId=w;m.loserId=l;m.status="done";const wp=this.players.get(w),lp=this.players.get(l);if(wp)wp.wins++;if(lp)lp.eliminated=true;}
  private finishMatch(r:MatchRuntime,m:BracketMatch,w:string,l:string){this.markFinished(m,w,l);r.message=`${this.nameOf(w)} advances! ${this.nameOf(l)} joins the spectator choir.`;r.phase="penaltyResult";r.activePenalty=null;r.tackle=null;r.timer=setTimeout(()=>{this.runtimes.delete(m.id);for(const [viewer,watched] of this.spectatorMatchByViewer)if(watched===m.id)this.spectatorMatchByViewer.delete(viewer);this.checkRoundComplete();this.broadcastState();},900);}
  private checkRoundComplete(){if(this.runtimes.size>0)return;const pending=this.bracket.some(m=>m.round===this.roundNumber&&m.status!=="done");if(pending)return;this.phase=this.isTournamentDone()?"finalResults":"roundResults";this.message=this.phase==="finalResults"?"Tournament complete!":"Round complete. Host can start the next round.";}
  private nextRoundFromResults(){if(this.phase!=="roundResults")return;const winners=this.bracket.filter(m=>m.round===this.roundNumber).map(m=>m.winnerId).filter((x):x is string=>!!x);if(winners.length<=1){this.phase="finalResults";return;}this.roundNumber++;for(let i=0;i<winners.length;i+=2)this.bracket.push(this.createMatch(this.roundNumber,i/2+1,winners[i],winners[i+1]));this.phase="tournament";this.message=`Round ${this.roundNumber} matchups are ready. Host can begin the round.`;}
  private isTournamentDone(){const active=[...this.players.values()].filter(p=>!p.eliminated&&this.bracket.some(m=>m.p1===p.id||m.p2===p.id));return active.length===1&&this.bracket.some(m=>m.status==="done");}
  private backToLobby(){this.clearAllTimers();this.runtimes.clear();this.spectatorMatchByViewer.clear();this.phase="lobby";this.bracket=[];this.roundNumber=0;for(const p of this.players.values())p.eliminated=false;this.autoSizeToHumans();this.message="Back in the lobby. Ankles reset.";}
  private clearRuntimeTimer(r:MatchRuntime){if(r.timer){clearTimeout(r.timer);r.timer=null;}}
  private clearAllTimers(){for(const r of this.runtimes.values())this.clearRuntimeTimer(r);}
  private nameOf(id:string){return this.players.get(id)?.name??"Mystery Player";}
}
