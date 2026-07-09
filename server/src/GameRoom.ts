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

type JoinOptions = { name?: string; characterIndex?: number };

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

export class GameRoom {
  readonly roomCode: string;
  readonly clients = new Map<string, ClientSocket>();
  hostId: string | null = null;
  tournamentSize: TournamentSize = 2;
  players = new Map<string, PlayerRecord>();
  bracket: BracketMatch[] = [];
  phase: PublicState["phase"] = "lobby";
  activeMatchId: string | null = null;
  activePenalty: ActivePenalty | null = null;
  tackle: TackleState | null = null;
  lastShot: ShotEvent | null = null;
  roundNumber = 0;
  matchIndex = 0;
  message = "Waiting for players.";
  private botCounter = 1;
  private tick: NodeJS.Timeout;
  private actionTimer: NodeJS.Timeout | null = null;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.tick = setInterval(() => this.update(), 100);
  }

  join(client: ClientSocket, options: JoinOptions) {
    this.clients.set(client.sessionId, client);
    const characterIndex = this.pickCharacterIndex(Number(options.characterIndex ?? 0));
    const existing = this.players.get(client.sessionId);
    if (existing) {
      existing.connected = true;
      existing.sessionId = client.sessionId;
    } else {
      this.players.set(client.sessionId, {
        id: client.sessionId,
        sessionId: client.sessionId,
        name: cleanName(options.name),
        characterIndex,
        isBot: false,
        connected: true,
        eliminated: false,
        wins: 0
      });
    }
    if (!this.hostId) this.hostId = client.sessionId;
    this.autoSizeToHumans();
    this.message = `${this.players.get(client.sessionId)?.name ?? "Player"} joined the chaos.`;
    this.broadcastState();
  }

  leave(sessionId: string) {
    this.clients.delete(sessionId);
    const player = this.players.get(sessionId);
    if (player) {
      player.connected = false;
      player.sessionId = null;
      if (this.phase === "lobby") this.players.delete(sessionId);
    }
    if (this.hostId === sessionId) {
      const nextHost = [...this.players.values()].find((p) => !p.isBot && p.connected);
      this.hostId = nextHost?.id ?? null;
    }
    this.autoSizeToHumans();
    this.broadcastState();
  }

  dispose() {
    clearInterval(this.tick);
    this.clearActionTimer();
  }

  isEmpty() {
    return this.clients.size === 0;
  }

  receive(client: ClientSocket, raw: unknown) {
    const msg = raw as { type?: string; data?: unknown };
    const type = String(msg.type ?? "");
    const data = msg.data;
    if (type === "setTournamentSize") this.hostOnly(client, () => this.setTournamentSize(Number(data)));
    else if (type === "addBot") this.hostOnly(client, () => this.addBot());
    else if (type === "removeBot") this.hostOnly(client, () => this.removeBot(String(data ?? "")));
    else if (type === "removePlayer") this.hostOnly(client, () => this.removePlayer(String(data ?? "")));
    else if (type === "startTournament") this.hostOnly(client, () => this.startTournament());
    else if (type === "beginRound") this.hostOnly(client, () => this.beginRound());
    else if (type === "move") this.handleMove(client, data);
    else if (type === "goaliePick") this.handleGoaliePick(client, String(data) as GoalZone);
    else if (type === "shoot") this.handleShoot(client, data);
    else if (type === "nextRound") this.hostOnly(client, () => this.nextRoundFromResults());
    else if (type === "backToLobby") this.hostOnly(client, () => this.backToLobby());
  }

  private hostOnly(client: ClientSocket, fn: () => void) {
    if (client.sessionId !== this.hostId) return;
    fn();
    this.broadcastState();
  }

  private publicState(viewerId?: string): PublicState {
    const visiblePenalty = this.activePenalty
      ? { ...this.activePenalty, goaliePick: viewerId === this.activePenalty.goalieId ? this.activePenalty.goaliePick : null }
      : null;
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      phase: this.phase,
      tournamentSize: this.tournamentSize,
      players: [...this.players.values()].sort((a, b) => a.name.localeCompare(b.name)),
      bracket: this.bracket,
      activeMatchId: this.activeMatchId,
      activePenalty: visiblePenalty,
      tackle: this.tackle,
      lastShot: this.lastShot,
      roundNumber: this.roundNumber,
      matchIndex: this.matchIndex,
      message: this.message
    };
  }

  private broadcastState() {
    for (const client of this.clients.values()) {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify({ type: "state", data: this.publicState(client.sessionId) }));
      }
    }
  }

  private pickCharacterIndex(requested: number): number {
    const used = new Set([...this.players.values()].map((p) => p.characterIndex));
    const safeRequested = Number.isFinite(requested) ? clamp(Math.floor(requested), 0, CHARACTERS.length - 1) : 0;
    if (!used.has(safeRequested)) return safeRequested;
    for (let i = 0; i < CHARACTERS.length; i++) if (!used.has(i)) return i;
    return safeRequested;
  }

  private autoSizeToHumans() {
    if (this.phase !== "lobby") return;
    const humans = [...this.players.values()].filter((p) => !p.isBot).length;
    this.tournamentSize = nextTournamentSize(humans);
    this.trimBotsToFit();
  }

  private setTournamentSize(size: number) {
    const humanCount = [...this.players.values()].filter((p) => !p.isBot).length;
    const allowed = TOURNAMENT_SIZES.find((n) => n === size && n >= humanCount) ?? nextTournamentSize(humanCount);
    this.tournamentSize = allowed;
    this.trimBotsToFit();
    this.fillBots();
    this.message = `Bracket set to ${this.tournamentSize}. Bots filled the remaining positions.`;
  }

  private trimBotsToFit() {
    const humans = [...this.players.values()].filter((p) => !p.isBot).length;
    const maxBots = Math.max(0, this.tournamentSize - humans);
    const bots = [...this.players.values()].filter((p) => p.isBot);
    while (bots.length > maxBots) {
      const bot = bots.pop();
      if (bot) this.players.delete(bot.id);
    }
  }

  private fillBots() {
    const humans = [...this.players.values()].filter((p) => !p.isBot).length;
    let bots = [...this.players.values()].filter((p) => p.isBot).length;
    while (humans + bots < this.tournamentSize) {
      this.addBot(false);
      bots++;
    }
  }

  private addBot(announce = true) {
    if (this.players.size >= this.tournamentSize) return;
    const characterIndex = this.pickCharacterIndex(this.botCounter % CHARACTERS.length);
    const character = CHARACTERS[characterIndex];
    const id = `bot_${Date.now()}_${this.botCounter++}`;
    this.players.set(id, {
      id,
      sessionId: null,
      name: character.name,
      characterIndex,
      isBot: true,
      connected: true,
      eliminated: false,
      wins: 0
    });
    if (announce) this.message = `${character.name} entered as a bot.`;
  }

  private removeBot(id: string) {
    const player = this.players.get(id);
    if (player?.isBot && this.phase === "lobby") {
      this.players.delete(id);
      this.message = `${player.name} bot removed.`;
    }
  }

  private removePlayer(id: string) {
    const player = this.players.get(id);
    if (!player || this.phase !== "lobby" || id === this.hostId) return;
    this.players.delete(id);
    this.message = `${player.name} removed from the lobby.`;
    this.autoSizeToHumans();
  }

  private startTournament() {
    if (this.phase !== "lobby") return;
    this.fillBots();
    const entrants = [...this.players.values()].slice(0, this.tournamentSize);
    if (entrants.length < 2) {
      this.message = "Need at least 2 players.";
      return;
    }
    for (const p of this.players.values()) {
      p.eliminated = !entrants.some((e) => e.id === p.id);
      p.wins = 0;
    }
    this.bracket = [];
    this.roundNumber = 1;
    this.matchIndex = 0;
    const shuffled = shuffle(entrants.map((p) => p.id));
    for (let i = 0; i < shuffled.length; i += 2) {
      this.bracket.push(this.createMatch(this.roundNumber, i / 2 + 1, shuffled[i], shuffled[i + 1]));
    }
    this.phase = "tournament";
    this.activeMatchId = null;
    this.activePenalty = null;
    this.tackle = null;
    this.lastShot = null;
    this.message = "First round matchups are ready. Host can begin Round 1.";
  }

  private beginRound() {
    if (this.phase !== "tournament") return;
    this.message = `Round ${this.roundNumber} begins. Someone call the drama police.`;
    this.playNextPendingMatch();
  }

  private createMatch(round: number, matchNo: number, p1: string, p2: string): BracketMatch {
    return {
      id: `r${round}m${matchNo}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      round,
      matchNo,
      p1,
      p2,
      p1Score: 0,
      p2Score: 0,
      p1Shootout: 0,
      p2Shootout: 0,
      p1ShootoutTaken: 0,
      p2ShootoutTaken: 0,
      winnerId: null,
      loserId: null,
      events: [],
      status: "pending"
    };
  }

  private activeMatch(): BracketMatch | null {
    if (!this.activeMatchId) return null;
    return this.bracket.find((m) => m.id === this.activeMatchId) ?? null;
  }

  private playNextPendingMatch() {
    this.clearActionTimer();
    let next = this.bracket.find((m) => m.round === this.roundNumber && m.status === "pending");
    while (next && this.players.get(next.p1)?.isBot && this.players.get(next.p2)?.isBot) {
      this.autoResolveBotMatch(next);
      next = this.bracket.find((m) => m.round === this.roundNumber && m.status === "pending");
    }
    if (!next) {
      this.activeMatchId = null;
      this.activePenalty = null;
      this.tackle = null;
      this.phase = this.isTournamentDone() ? "finalResults" : "roundResults";
      this.message = this.phase === "finalResults" ? "Tournament complete!" : "Round complete. Host can start the next round.";
      this.broadcastState();
      return;
    }
    this.activeMatchId = next.id;
    next.status = "playing";
    this.matchIndex = next.matchNo;
    this.startTackle(next.p1, next.p2);
  }

  private autoResolveBotMatch(match: BracketMatch) {
    match.status = "playing";
    match.p1Score = Math.random() < 0.72 ? 1 : 0;
    match.p2Score = Math.random() < 0.72 ? 1 : 0;
    if (match.p1Score === match.p2Score) {
      for (let i = 0; i < 5; i++) {
        match.p1ShootoutTaken++;
        match.p2ShootoutTaken++;
        if (Math.random() < 0.74) match.p1Shootout++;
        if (Math.random() < 0.74) match.p2Shootout++;
      }
      while (match.p1Shootout === match.p2Shootout) {
        match.p1ShootoutTaken++;
        match.p2ShootoutTaken++;
        if (Math.random() < 0.74) match.p1Shootout++;
        if (Math.random() < 0.74) match.p2Shootout++;
      }
    }
    const p1Total = match.p1Score * 10 + match.p1Shootout;
    const p2Total = match.p2Score * 10 + match.p2Shootout;
    const winnerId = p1Total >= p2Total ? match.p1 : match.p2;
    const loserId = winnerId === match.p1 ? match.p2 : match.p1;
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.status = "done";
    const winner = this.players.get(winnerId);
    const loser = this.players.get(loserId);
    if (winner) winner.wins++;
    if (loser) loser.eliminated = true;
  }

  private startTackle(kickerId: string, goalieId: string) {
    const now = Date.now();
    this.activePenalty = null;
    this.lastShot = null;
    this.phase = "tackle";
    this.tackle = {
      kickerId,
      goalieId,
      kickerX: 310,
      kickerY: 360,
      goalieX: 970,
      goalieY: 360,
      tackleText: randomFrom(TACKLE_LINES),
      startedAt: now,
      timeoutAt: now + 7200,
      impactAt: null
    };
    this.message = `${this.nameOf(goalieId)} is approaching for a ${this.tackle.tackleText}!`;
    this.broadcastState();
  }

  private startPenalty(mode: ShotMode, kickerId: string, goalieId: string) {
    const now = Date.now();
    const kickerIsBot = !!this.players.get(kickerId)?.isBot;
    const botKickDelayMs = 5200;
    const humanShotClockMs = 22000;
    this.tackle = null;
    this.phase = "penalty";
    this.lastShot = null;
    this.activePenalty = {
      mode,
      kickerId,
      goalieId,
      shotLabel: this.shotLabel(mode, kickerId),
      goaliePick: this.players.get(goalieId)?.isBot ? randomFrom(GOAL_ZONES) : null,
      startedAt: now,
      timeoutAt: now + (kickerIsBot ? botKickDelayMs : humanShotClockMs)
    };
    this.message = kickerIsBot
      ? `${this.nameOf(kickerId)} is winding up. Bot shot in 5 seconds!`
      : `${this.nameOf(kickerId)} steps up against ${this.nameOf(goalieId)}.`;
    if (kickerIsBot) {
      this.actionTimer = setTimeout(() => {
        if (this.activePenalty?.kickerId === kickerId) {
          this.resolveShot({ aimX: Math.random(), aimY: Math.random(), power: 45 + Math.random() * 48 });
        }
      }, botKickDelayMs);
    }
    this.broadcastState();
  }

  private shotLabel(mode: ShotMode, kickerId: string): string {
    const m = this.activeMatch();
    if (!m) return "Penalty";
    if (mode === "regular") return `${this.nameOf(kickerId)} regular penalty`;
    const isP1 = kickerId === m.p1;
    const taken = isP1 ? m.p1ShootoutTaken + 1 : m.p2ShootoutTaken + 1;
    return taken <= 5 ? `Shootout kick ${taken} of 5` : `Sudden death kick ${taken - 5}`;
  }

  private update() {
    if (this.phase === "tackle" && this.tackle) this.updateTackle();
    if (this.phase === "penalty" && this.activePenalty) this.updatePenaltyTimeout();
    if (this.phase !== "lobby") this.broadcastState();
  }

  private updateTackle() {
    const t = this.tackle;
    if (!t) return;
    const now = Date.now();

    if (t.impactAt) {
      if (now > t.timeoutAt) {
        this.message = `${this.nameOf(t.kickerId)} finally stops auditioning for theatre and remembers there is a penalty to take.`;
        this.startPenalty("regular", t.kickerId, t.goalieId);
      }
      return;
    }

    const kicker = this.players.get(t.kickerId);
    if (kicker?.isBot) {
      t.kickerX += (Math.random() - 0.4) * 18;
      t.kickerY += (Math.random() - 0.5) * 18;
      t.kickerX = clamp(t.kickerX, 180, 570);
      t.kickerY = clamp(t.kickerY, 170, 590);
    }

    const dx = t.kickerX - t.goalieX;
    const dy = t.kickerY - t.goalieY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = dist < 210 ? 38 : 27;
    t.goalieX += (dx / dist) * speed;
    t.goalieY += (dy / dist) * speed;

    if (dist < 78 || now > t.timeoutAt) {
      t.impactAt = now;
      t.timeoutAt = now + 6500;
      // Keep the collision visually centred for all clients.
      t.goalieX = t.kickerX + 58;
      t.goalieY = t.kickerY + 20;
      this.message = `${this.nameOf(t.goalieId)} unleashes a ${t.tackleText}! ${this.nameOf(t.kickerId)} begins a world-class flop.`;
      this.broadcastState();
    }
  }

  private updatePenaltyTimeout() {
    if (!this.activePenalty) return;
    if (Date.now() > this.activePenalty.timeoutAt) {
      if (!this.activePenalty.goaliePick) this.activePenalty.goaliePick = "LM";
      this.resolveShot({ aimX: Math.random(), aimY: Math.random(), power: 35 + Math.random() * 45 });
    }
  }

  private handleMove(client: ClientSocket, data: unknown) {
    if (this.phase !== "tackle" || !this.tackle) return;
    if (client.sessionId !== this.tackle.kickerId) return;
    const d = data as { dx?: number; dy?: number };
    this.tackle.kickerX = clamp(this.tackle.kickerX + clamp(Number(d.dx ?? 0), -1, 1) * 28, 180, 570);
    this.tackle.kickerY = clamp(this.tackle.kickerY + clamp(Number(d.dy ?? 0), -1, 1) * 28, 170, 590);
    this.broadcastState();
  }

  private handleGoaliePick(client: ClientSocket, zone: GoalZone) {
    if (this.phase !== "penalty" || !this.activePenalty) return;
    if (client.sessionId !== this.activePenalty.goalieId) return;
    if (!GOAL_ZONES.includes(zone)) return;
    this.activePenalty.goaliePick = zone;
    this.message = `${this.nameOf(client.sessionId)} has chosen a dive.`;
    this.broadcastState();
  }

  private handleShoot(client: ClientSocket, data: unknown) {
    if (this.phase !== "penalty" || !this.activePenalty) return;
    if (client.sessionId !== this.activePenalty.kickerId) return;
    this.resolveShot(data);
  }

  private resolveShot(data: unknown) {
    const p = this.activePenalty;
    const match = this.activeMatch();
    if (!p || !match || this.phase !== "penalty") return;
    this.clearActionTimer();
    const d = data as { aimX?: number; aimY?: number; power?: number };
    const aimX = clamp(Number(d.aimX ?? 0.5), 0, 1);
    const aimY = clamp(Number(d.aimY ?? 0.5), 0, 1);
    const power = clamp(Number(d.power ?? 60), 0, 100);
    const zone = zoneFromAim(aimX, aimY);
    const goaliePick = p.goaliePick ?? "LM";

    const inSweetSpot = power >= 25 && power <= 75;
    const softPower = power < 25;
    const chaosPower = power > 75;
    const softMissChance = softPower ? (power < 12 ? 0.82 : power < 18 ? 0.62 : 0.42) : 0;
    const chaosMissChance = chaosPower ? Math.min(0.62, 0.18 + ((power - 75) / 25) * 0.44) : 0;
    const cornerRisk = aimX < 0.08 || aimX > 0.92 || aimY < 0.08 ? 0.11 : 0;
    const baseMissChance = inSweetSpot ? 0.03 : 0;
    const miss = Math.random() < baseMissChance + softMissChance + chaosMissChance + cornerRisk;
    let saved = false;
    if (!miss) {
      // Exact-zone reads are now deterministic so the visual result and the score can never feel contradictory.
      // If the keeper chooses the same zone as the shot, it is a save. Otherwise it is a goal.
      saved = goaliePick === zone;
    }
    const goal = !miss && !saved;
    const missLines = softPower ? SHOT_LINES.softMiss : chaosPower ? SHOT_LINES.chaosMiss : SHOT_LINES.miss;
    const event: ShotEvent = {
      matchId: match.id,
      mode: p.mode,
      kickerId: p.kickerId,
      goalieId: p.goalieId,
      goal,
      miss,
      saved,
      zone,
      goaliePick,
      aimX,
      aimY,
      power: Math.round(power),
      text: randomFrom(goal ? SHOT_LINES.goal : miss ? missLines : SHOT_LINES.save)
    };

    this.applyShotToMatch(match, event);
    this.lastShot = event;
    this.activePenalty = null;
    this.phase = "penaltyResult";
    this.message = event.text;
    this.broadcastState();
    this.actionTimer = setTimeout(() => this.afterShot(match), 3300);
  }

  private applyShotToMatch(match: BracketMatch, event: ShotEvent) {
    match.events.push(event);
    const isP1 = event.kickerId === match.p1;
    if (event.mode === "regular") {
      if (event.goal) isP1 ? match.p1Score++ : match.p2Score++;
    } else if (isP1) {
      match.p1ShootoutTaken++;
      if (event.goal) match.p1Shootout++;
    } else {
      match.p2ShootoutTaken++;
      if (event.goal) match.p2Shootout++;
    }
  }

  private afterShot(match: BracketMatch) {
    if (match.winnerId) {
      this.finishMatch(match, match.winnerId, match.winnerId === match.p1 ? match.p2 : match.p1);
      return;
    }
    const regularShots = match.events.filter((e) => e.mode === "regular").length;
    if (regularShots === 1) {
      this.startTackle(match.p2, match.p1);
      return;
    }
    if (regularShots === 2 && match.p1Score !== match.p2Score) {
      const winner = match.p1Score > match.p2Score ? match.p1 : match.p2;
      this.finishMatch(match, winner, winner === match.p1 ? match.p2 : match.p1);
      return;
    }
    this.progressShootout(match);
  }

  private progressShootout(match: BracketMatch) {
    const winner = this.shootoutWinner(match);
    if (winner) {
      this.finishMatch(match, winner, winner === match.p1 ? match.p2 : match.p1);
      return;
    }
    const nextKicker = match.p1ShootoutTaken === match.p2ShootoutTaken ? match.p1 : match.p2;
    this.startPenalty("shootout", nextKicker, nextKicker === match.p1 ? match.p2 : match.p1);
  }

  private shootoutWinner(match: BracketMatch): string | null {
    const aTaken = match.p1ShootoutTaken;
    const bTaken = match.p2ShootoutTaken;
    const aGoals = match.p1Shootout;
    const bGoals = match.p2Shootout;
    if (aTaken <= 5 && bTaken <= 5) {
      if (!canTeamStillCatch(aTaken, aGoals, bGoals)) return match.p2;
      if (!canTeamStillCatch(bTaken, bGoals, aGoals)) return match.p1;
      if (aTaken === 5 && bTaken === 5 && aGoals !== bGoals) return aGoals > bGoals ? match.p1 : match.p2;
      return null;
    }
    if (aTaken === bTaken && aGoals !== bGoals) return aGoals > bGoals ? match.p1 : match.p2;
    return null;
  }

  private finishMatch(match: BracketMatch, winnerId: string, loserId: string) {
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.status = "done";
    const winner = this.players.get(winnerId);
    const loser = this.players.get(loserId);
    if (winner) winner.wins++;
    if (loser) loser.eliminated = true;
    this.message = `${this.nameOf(winnerId)} advances! ${this.nameOf(loserId)} joins the spectator choir.`;
    this.activePenalty = null;
    this.tackle = null;
    // Keep the final shot visible while the winner/next-match transition waits.
    this.phase = "penaltyResult";
    this.broadcastState();
    this.actionTimer = setTimeout(() => this.playNextPendingMatch(), 900);
  }

  private nextRoundFromResults() {
    if (this.phase !== "roundResults") return;
    const winners = this.bracket
      .filter((m) => m.round === this.roundNumber)
      .map((m) => m.winnerId)
      .filter((id): id is string => Boolean(id));
    if (winners.length <= 1) {
      this.phase = "finalResults";
      this.message = "Tournament complete!";
      return;
    }
    this.roundNumber++;
    this.matchIndex = 0;
    for (let i = 0; i < winners.length; i += 2) {
      this.bracket.push(this.createMatch(this.roundNumber, i / 2 + 1, winners[i], winners[i + 1]));
    }
    this.phase = "tournament";
    this.activeMatchId = null;
    this.activePenalty = null;
    this.tackle = null;
    this.lastShot = null;
    this.message = `Round ${this.roundNumber} matchups are ready. Host can begin the round.`;
  }

  private isTournamentDone(): boolean {
    const active = [...this.players.values()].filter((p) => !p.eliminated && this.bracket.some((m) => m.p1 === p.id || m.p2 === p.id));
    return active.length === 1 && this.bracket.some((m) => m.status === "done");
  }

  private backToLobby() {
    this.clearActionTimer();
    this.phase = "lobby";
    this.bracket = [];
    this.activeMatchId = null;
    this.activePenalty = null;
    this.tackle = null;
    this.lastShot = null;
    this.roundNumber = 0;
    this.matchIndex = 0;
    for (const p of this.players.values()) p.eliminated = false;
    this.autoSizeToHumans();
    this.message = "Back in the lobby. Ankles reset.";
  }

  private clearActionTimer() {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
  }

  private nameOf(id: string): string {
    return this.players.get(id)?.name ?? "Mystery Player";
  }
}
