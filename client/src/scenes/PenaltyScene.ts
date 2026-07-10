import Phaser from "phaser";
import { CHARACTERS, GOAL_ZONES, type GoalZone } from "@pessi/shared";
import { Net } from "../net/Net";
import { playMusic, playRandomCommentary, playRandomCrowd, preloadAudio, stopSfxChannel } from "../audio/audio";
import type { BracketMatch, PlayerRecord, PublicState } from "../types";
import { addButton, addTopBar, drawFootballer, getPlayer, playerLabel, W, H } from "../ui/ui";
import { routeScene } from "../ui/routing";

const GOAL = { x: 256, y: 142, w: 768, h: 278 };
const PENALTY_SPOT = { x: W / 2, y: 570 };
const POWER_BAR = { x: 54, y: 652, w: 332, h: 28 };
const BOT_SHOT_SECONDS = 5;
const DEFAULT_AIM_X = 0.5;
const DEFAULT_AIM_Y = 0.75;

const ZONE_LABELS: Record<GoalZone, string> = {
  TL: "TOP LEFT",
  TM: "TOP MIDDLE",
  TR: "TOP RIGHT",
  LL: "LOW LEFT",
  LM: "STAY MIDDLE",
  LR: "LOW RIGHT"
};

const ZONE_HINTS: Record<GoalZone, string> = {
  TL: "top left",
  TM: "top middle",
  TR: "top right",
  LL: "low left",
  LM: "stay middle",
  LR: "low right"
};

function shortText(text: string, max = 22): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function secondsRemaining(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function playerName(player: PlayerRecord | null): string {
  return player?.name || "Mystery Player";
}

function characterText(player: PlayerRecord | null): string {
  const ch = CHARACTERS[player?.characterIndex ?? 0];
  return `${ch.country} #${ch.number}`;
}

function twoLineName(text: string, maxFirstLine = 14): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxFirstLine) return clean;

  const middle = clean.length / 2;
  let breakPoints: number[] = [];
  for (let i = 1; i < clean.length - 1; i += 1) {
    if (clean[i] === " ") breakPoints.push(i);
  }
  if (breakPoints.length === 0) {
    for (let i = 1; i < clean.length - 1; i += 1) {
      if (clean[i] === "-" || clean[i] === "/") breakPoints.push(i + 1);
    }
  }

  if (breakPoints.length === 0) return clean;

  const splitAt = breakPoints.reduce((best, current) => {
    const bestScore = Math.abs(best - middle) + Math.max(0, best - maxFirstLine) * 2;
    const currentScore = Math.abs(current - middle) + Math.max(0, current - maxFirstLine) * 2;
    return currentScore < bestScore ? current : best;
  }, breakPoints[0]);

  const first = clean.slice(0, splitAt).trim();
  const second = clean.slice(splitAt).trim();
  return second ? `${first}\n${second}` : clean;
}

function cardFontSize(text: string, base = 13): string {
  if (text.length > 24) return `${Math.max(10, base - 3)}px`;
  if (text.length > 18) return `${Math.max(11, base - 2)}px`;
  if (text.length > 14) return `${Math.max(11, base - 1)}px`;
  return `${base}px`;
}

function playerDetail(player: PlayerRecord | null): { name: string; silly: string; country: string; number: string } {
  const ch = CHARACTERS[player?.characterIndex ?? 0];
  return {
    name: playerName(player),
    silly: ch.name,
    country: ch.country,
    number: `#${ch.number}`
  };
}

export class PenaltyScene extends Phaser.Scene {
  private unsub?: () => void;
  private state: PublicState | null = null;
  private aimX = DEFAULT_AIM_X;
  private aimY = DEFAULT_AIM_Y;
  private power = 50;
  private powerDir = 1;
  private kickButton?: Phaser.GameObjects.Container;
  private lastRenderKey = "";
  private kickSentForPenalty: string | null = null;
  private resultAnimationKey: string | null = null;
  private resultAnimationStartedAt = 0;
  private completedResultFrameKey: string | null = null;
  private soundPlayedForShotKey: string | null = null;
  private lastAimPenaltyKey: string | null = null;

  private aimOuter?: Phaser.GameObjects.Arc;
  private aimInner?: Phaser.GameObjects.Arc;
  private powerFill?: Phaser.GameObjects.Rectangle;
  private powerMarker?: Phaser.GameObjects.Rectangle;
  private powerText?: Phaser.GameObjects.Text;
  private countdownBg?: Phaser.GameObjects.Rectangle;
  private countdownTitle?: Phaser.GameObjects.Text;
  private countdownSeconds?: Phaser.GameObjects.Text;
  private countdownDetail?: Phaser.GameObjects.Text;
  private countdownLock?: Phaser.GameObjects.Text;

  private resultObjectsKey: string | null = null;
  private resultTrail?: Phaser.GameObjects.Graphics;
  private resultDiveArrow?: Phaser.GameObjects.Graphics;
  private resultDiveLabel?: Phaser.GameObjects.Text;
  private resultGoalie?: Phaser.GameObjects.Container;
  private resultGoalieLabel?: Phaser.GameObjects.Text;
  private resultKicker?: Phaser.GameObjects.Container;
  private resultKickerLabel?: Phaser.GameObjects.Text;
  private resultBall?: Phaser.GameObjects.Container;
  private resultThwack?: Phaser.GameObjects.Text;
  private resultMarkerCircle?: Phaser.GameObjects.Arc;
  private resultMarkerText?: Phaser.GameObjects.Text;

  constructor() {
    super("PenaltyScene");
  }

  preload() {
    this.load.image("penaltyBg", "assets/backgrounds/penaltyBg.jpg");
    preloadAudio(this);
  }

  create() {
    playMusic(this, "penalty");
    this.lastRenderKey = "";
    this.kickSentForPenalty = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());
    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("PenaltyScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("PenaltyScene")) {
        this.state = state;
        const key = this.renderKey(state);
        if (key !== this.lastRenderKey) {
          this.lastRenderKey = key;
          this.render(state);
        }
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.setAimFromPointer(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.setAimFromPointer(pointer);
    });
  }

  update(_time: number, delta: number) {
    if (this.state?.phase === "penaltyResult" && this.state.lastShot) {
      this.drawResultFrameOnly(this.state);
      return;
    }
    if (this.state?.phase !== "penalty") return;
    if (this.state.activePenalty?.kickerId === Net.sessionId && !this.isKickPending(this.state)) {
      this.power += this.powerDir * delta * 0.22;
      if (this.power >= 100) { this.power = 100; this.powerDir = -1; }
      if (this.power <= 0) { this.power = 0; this.powerDir = 1; }
      this.drawPowerOnly();
    }
    this.drawCountdownOnly(this.state);
  }

  shutdown() {
    this.unsub?.();
    this.input.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.clearSceneDisplay(false);
    this.lastRenderKey = "";
    this.kickSentForPenalty = null;
    this.resultAnimationKey = null;
    this.resultAnimationStartedAt = 0;
    this.completedResultFrameKey = null;
    this.resultObjectsKey = null;
    this.soundPlayedForShotKey = null;
    this.lastAimPenaltyKey = null;
    stopSfxChannel("commentary");
    stopSfxChannel("crowd");
  }

  private renderKey(state: PublicState): string {
    const p = state.activePenalty;
    const e = state.lastShot;
    const match = state.bracket.find((m) => m.id === state.activeMatchId);
    const scoreKey = match ? `${match.id}:${match.p1Score}:${match.p2Score}:${match.p1Shootout}:${match.p2Shootout}:${match.p1ShootoutTaken}:${match.p2ShootoutTaken}:${match.status}:${match.winnerId ?? ""}` : "no-match";
    if (state.phase === "penalty" && p) {
      return [state.phase, p.startedAt, p.kickerId, p.goalieId, p.mode, p.goaliePick ?? "", p.shotLabel, scoreKey].join("|");
    }
    if (state.phase === "penaltyResult" && e) {
      return [state.phase, e.matchId, e.kickerId, e.goalieId, e.zone, e.goaliePick, e.goal, e.miss, e.saved, e.power, e.aimX, e.aimY, e.text, scoreKey].join("|");
    }
    return `${state.phase}|${state.activeMatchId ?? ""}|${scoreKey}`;
  }

  private shotResultKey(state: PublicState): string | null {
    const e = state.lastShot;
    if (!e) return null;
    return [
      e.matchId,
      e.mode,
      e.kickerId,
      e.goalieId,
      e.zone,
      e.goaliePick,
      e.goal ? "goal" : e.miss ? "miss" : e.saved ? "saved" : "shot",
      e.power,
      Math.round(e.aimX * 1000),
      Math.round(e.aimY * 1000)
    ].join("|");
  }

  private ensureResultAnimationClock(state: PublicState) {
    const key = this.shotResultKey(state);
    if (!key) return;
    if (this.resultAnimationKey !== key) {
      this.resultAnimationKey = key;
      this.resultAnimationStartedAt = this.time.now;
      this.completedResultFrameKey = null;
    }
  }

  private penaltyKey(state: PublicState): string | null {
    const p = state.activePenalty;
    if (!p) return null;
    return `${p.startedAt}:${p.kickerId}:${p.goalieId}:${p.mode}`;
  }

  private isKickPending(state: PublicState): boolean {
    const key = this.penaltyKey(state);
    return Boolean(key && this.kickSentForPenalty === key);
  }

  private resetDefaultAimForNewPenalty(state: PublicState) {
    if (state.phase !== "penalty" || !state.activePenalty) return;
    const key = this.penaltyKey(state);
    if (!key || key === this.lastAimPenaltyKey) return;
    this.lastAimPenaltyKey = key;
    this.aimX = DEFAULT_AIM_X;
    this.aimY = DEFAULT_AIM_Y;
  }

  private render(state: PublicState) {
    this.resetDefaultAimForNewPenalty(state);
    this.clearSceneDisplay();
    this.drawPenaltyBoxBackground();

    const match = state.bracket.find((m) => m.id === state.activeMatchId) ?? null;
    const kickerId = state.activePenalty?.kickerId ?? state.lastShot?.kickerId ?? match?.p1 ?? null;
    const goalieId = state.activePenalty?.goalieId ?? state.lastShot?.goalieId ?? match?.p2 ?? null;
    const kicker = getPlayer(state, kickerId);
    const goalie = getPlayer(state, goalieId);
    const isKicker = kickerId === Net.sessionId && state.phase === "penalty";
    const isGoalie = goalieId === Net.sessionId && state.phase === "penalty";
    const kickerIsBot = !!kicker?.isBot;

    addTopBar(this, state, state.isSpectating ? `LIVE SPECTATOR • ${this.topMessage(state, kicker, goalie)}` : this.topMessage(state, kicker, goalie));
    if (state.isSpectating) {
      addButton(this, 112, 103, 190, 44, "← BRACKET", () => Net.send("stopWatching"), 0x115b96);
      this.add.text(W - 120, 102, "LIVE SPECTATOR", { fontFamily: "Arial", fontSize: "18px", fontStyle: "900", color: "#7dff9b", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
    }
    this.drawShotHeader(state, kicker, goalie);
    this.drawPenaltyGoal();
    this.drawZones(state);
    if (match) this.drawScoreboard(state, match);

    if (state.phase === "penaltyResult" && state.lastShot) {
      this.ensureResultAnimationClock(state);
      this.playPenaltyResultCommentaryOnce(state);
      this.completedResultFrameKey = null;
      this.drawResult(state);
      this.drawResultFrameOnly(state);
      return;
    }

    this.drawPenaltyActors(state, kicker, goalie, false);
    this.drawAimMarker(isKicker);
    if (isKicker) this.drawPowerPanel();
    this.drawActionPanel(state, isKicker, isGoalie, kickerIsBot);
  }

  private clearSceneDisplay(killTweens = true) {
    if (killTweens) {
      this.tweens.killAll();
      this.time.removeAllEvents();
    }
    [...this.children.list].forEach((child) => child.destroy());
    this.resetObjectRefs();
  }

  private resetObjectRefs() {
    this.kickButton = undefined;
    this.aimOuter = undefined;
    this.aimInner = undefined;
    this.powerFill = undefined;
    this.powerMarker = undefined;
    this.powerText = undefined;
    this.countdownBg = undefined;
    this.countdownTitle = undefined;
    this.countdownSeconds = undefined;
    this.countdownDetail = undefined;
    this.countdownLock = undefined;
    this.resultObjectsKey = null;
    this.resultTrail = undefined;
    this.resultDiveArrow = undefined;
    this.resultDiveLabel = undefined;
    this.resultGoalie = undefined;
    this.resultGoalieLabel = undefined;
    this.resultKicker = undefined;
    this.resultKickerLabel = undefined;
    this.resultBall = undefined;
    this.resultThwack = undefined;
    this.resultMarkerCircle = undefined;
    this.resultMarkerText = undefined;
  }

  private topMessage(state: PublicState, kicker: PlayerRecord | null, goalie: PlayerRecord | null): string {
    if (state.phase === "penaltyResult" && state.lastShot) return state.lastShot.text;
    const p = state.activePenalty;
    if (!p) return state.message;
    const kickerLabel = playerName(kicker);
    const goalieLabel = playerName(goalie);
    if (kicker?.isBot) return `${kickerLabel} is winding up against ${goalieLabel}. Bot shot in ${secondsRemaining(p.timeoutAt)}s.`;
    return `${kickerLabel} steps up against ${goalieLabel}.`;
  }

  private drawPenaltyBoxBackground() {
    if (this.textures.exists("penaltyBg")) {
      this.add.image(W / 2, H / 2, "penaltyBg")
        .setDisplaySize(W, H)
        .setDepth(0);
    }
    const g = this.add.graphics().setDepth(1);
    g.fillGradientStyle(0x04160c, 0x04160c, 0x020b05, 0x020b05, 0.24, 0.16, 0.52, 0.64);
    g.fillRect(0, 0, W, H);

    // Gentle spotlight to make the penalty area pop over the stadium background.
    g.fillStyle(0xffffff, 0.05);
    g.fillEllipse(W / 2, 250, 760, 240);

    // Penalty spot and arc only.
    g.fillStyle(0xffffff, 0.72);
    g.fillCircle(PENALTY_SPOT.x, PENALTY_SPOT.y, 5);
    g.lineStyle(3, 0xffffff, 0.22);
    g.beginPath();
    g.arc(PENALTY_SPOT.x, PENALTY_SPOT.y, 84, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335), false);
    g.strokePath();
  }

  private drawPenaltyGoal() {
    const x = GOAL.x;
    const y = GOAL.y;
    const w = GOAL.w;
    const h = GOAL.h;
    const g = this.add.graphics().setDepth(4);

    // Tight overlay aligned to the visible goal in the stadium artwork.
    g.fillStyle(0x000000, 0.14);
    g.fillRoundedRect(x + 10, y + 14, w, h + 10, 14);
    g.fillStyle(0xdff8ff, 0.10);
    g.fillRoundedRect(x, y, w, h, 10);

    // Main frame.
    g.lineStyle(10, 0xffffff, 0.98);
    g.strokeRoundedRect(x, y, w, h, 8);
    g.lineStyle(3, 0xbcd5e8, 0.72);
    g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 6);

    // Clean section separators to define the 6 shot zones.
    g.lineStyle(2, 0xffffff, 0.24);
    g.lineBetween(x + w / 3, y + 10, x + w / 3, y + h - 10);
    g.lineBetween(x + (w * 2) / 3, y + 10, x + (w * 2) / 3, y + h - 10);
    g.lineBetween(x + 10, y + h / 2, x + w - 10, y + h / 2);

    // Slight base line / depth cue.
    g.lineStyle(4, 0xfff2a6, 0.22);
    g.lineBetween(x - 24, y + h + 4, x + w + 24, y + h + 4);
  }

  private drawShotHeader(state: PublicState, kicker: PlayerRecord | null, goalie: PlayerRecord | null) {
    const title = state.activePenalty?.shotLabel ?? (state.lastShot ? "Penalty result" : "Penalty");
    this.add.text(W / 2, 92, title, {
      fontFamily: "Arial",
      fontSize: "27px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5);

    this.add.text(W / 2, 122, `${playerName(kicker)}  vs  ${playerName(goalie)}`, {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 830 },
      lineSpacing: -3
    }).setOrigin(0.5);
  }

  private drawZones(state: PublicState) {
    const isGoalie = state.phase === "penalty" && state.activePenalty?.goalieId === Net.sessionId;
    const isKicker = state.phase === "penalty" && state.activePenalty?.kickerId === Net.sessionId;
    const picked = state.activePenalty?.goaliePick;
    const shotZone = state.lastShot?.zone;
    const goaliePick = state.lastShot?.goaliePick;
    const zones: GoalZone[] = ["TL", "TM", "TR", "LL", "LM", "LR"];

    zones.forEach((z) => {
      const col = z.endsWith("L") ? 0 : z.endsWith("M") ? 1 : 2;
      const row = z.startsWith("T") ? 0 : 1;
      const x = GOAL.x + (GOAL.w / 3) * col;
      const y = GOAL.y + (GOAL.h / 2) * row;
      const w = GOAL.w / 3;
      const h = GOAL.h / 2;
      const isPicked = picked === z;
      const isShotZone = shotZone === z;
      const wasGoaliePick = goaliePick === z;
      const fill = isPicked ? 0xffd21f : isShotZone ? 0xffffff : wasGoaliePick ? 0x6db6ff : 0xffffff;
      const alpha = isPicked ? 0.24 : isShotZone ? 0.16 : wasGoaliePick ? 0.13 : isGoalie || isKicker ? 0.045 : 0.02;

      const rect = this.add.rectangle(x, y, w, h, fill, alpha).setOrigin(0).setDepth(8);
      const strokeWidth = isPicked ? 4 : (isShotZone || wasGoaliePick ? 2 : 0);
      const strokeColour = isPicked ? 0xffd21f : wasGoaliePick ? 0x6db6ff : 0xffffff;
      rect.setStrokeStyle(strokeWidth, strokeColour, isPicked ? 0.9 : 0.38);
      if (isGoalie) {
        rect.setInteractive({ useHandCursor: true });
        rect.on("pointerdown", () => Net.send("goaliePick", z));
      }

      this.add.text(x + w / 2, y + h / 2, ZONE_LABELS[z], {
        fontFamily: "Arial",
        fontSize: isGoalie ? "15px" : "14px",
        fontStyle: "900",
        color: isPicked ? "#fff2a6" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      }).setOrigin(0.5).setDepth(10).setAlpha(isGoalie || isKicker || state.phase === "penaltyResult" ? 0.98 : 0.43);
    });
  }

  private drawPenaltyActors(state: PublicState, kicker: PlayerRecord | null, goalie: PlayerRecord | null, resultMode: boolean) {
    const goalieY = GOAL.y + GOAL.h - 12;
    const kickerX = W / 2 - 104;
    const kickerY = resultMode ? 618 : 616;

    if (resultMode && state.lastShot) {
      this.drawAnimatedGoalie(state, goalie);
    } else {
      drawFootballer(this, W / 2, goalieY, goalie, 1.18, false).setDepth(18);
    }

    const kickerBody = drawFootballer(this, kickerX, kickerY, kicker, resultMode ? 1.12 : 1.26, false).setDepth(resultMode ? 18 : 22);
    if (resultMode) {
      kickerBody.setAngle(-10);
      this.tweens.add({ targets: kickerBody, angle: -17, scaleX: 1.04, scaleY: 0.96, duration: 220, yoyo: true, ease: "Sine.easeOut" });
    }

    if (!resultMode) {
      const ballPulse = 1 + Math.sin(this.time.now / 180) * 0.035;
      this.drawBall(PENALTY_SPOT.x, PENALTY_SPOT.y, 17 * ballPulse, 20);
    }
  }

  private drawBall(x: number, y: number, radius: number, depth: number): Phaser.GameObjects.Container {
    const ball = this.add.container(x, y).setDepth(depth);
    const shadow = this.add.ellipse(4, radius + 5, radius * 1.6, radius * 0.48, 0x000000, 0.28);
    const outer = this.add.circle(0, 0, radius, 0xffffff).setStrokeStyle(Math.max(2, radius * 0.18), 0x111111, 1);
    const p1 = this.add.circle(-radius * 0.32, -radius * 0.25, radius * 0.26, 0x1c3fba, 0.95);
    const p2 = this.add.circle(radius * 0.34, radius * 0.18, radius * 0.22, 0x1c3fba, 0.95);
    const shine = this.add.circle(-radius * 0.32, -radius * 0.42, radius * 0.17, 0xffffff, 0.55);
    ball.add([shadow, outer, p1, p2, shine]);
    return ball;
  }

  private drawAnimatedGoalie(state: PublicState, goalie: PlayerRecord | null) {
    const e = state.lastShot;
    if (!e) return;
    const startX = W / 2;
    const startY = GOAL.y + GOAL.h - 12;
    const diveTarget = this.zonePoint(e.goaliePick, false);
    const dx = diveTarget.x - startX;
    const diveX = startX + dx * 0.84;
    const diveY = Phaser.Math.Linear(startY, diveTarget.y, 0.72);
    const goalieBody = drawFootballer(this, startX, startY, goalie, 1.16, false).setDepth(18);
    goalieBody.setName("shotAnimation");
    this.tweens.add({
      targets: goalieBody,
      x: diveX,
      y: diveY,
      angle: dx < -10 ? -74 : dx > 10 ? 74 : 0,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 560,
      ease: "Cubic.easeOut"
    });
    this.drawDiveArrow(e.goaliePick);
  }

  private drawDiveArrow(zone: GoalZone) {
    const from = { x: W / 2, y: GOAL.y + GOAL.h - 42 };
    const to = this.zonePoint(zone, false);
    const g = this.add.graphics().setDepth(15);
    g.lineStyle(6, 0x6db6ff, 0.82);
    g.lineBetween(from.x, from.y, to.x, to.y);
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const head = 18;
    g.fillStyle(0x6db6ff, 0.88);
    g.fillTriangle(
      to.x,
      to.y,
      to.x - Math.cos(angle - 0.45) * head,
      to.y - Math.sin(angle - 0.45) * head,
      to.x - Math.cos(angle + 0.45) * head,
      to.y - Math.sin(angle + 0.45) * head
    );
    this.add.text(to.x, to.y - 30, `DIVE: ${ZONE_LABELS[zone]}`, {
      fontFamily: "Arial",
      fontSize: "14px",
      fontStyle: "900",
      color: "#cfe7ff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(19).setAlpha(0.92);
  }

  private zonePoint(zone: GoalZone, useAim: boolean, e?: NonNullable<PublicState["lastShot"]>): { x: number; y: number } {
    const col = zone.endsWith("L") ? 1 / 6 : zone.endsWith("M") ? 1 / 2 : 5 / 6;
    const row = zone.startsWith("T") ? 1 / 4 : 3 / 4;
    if (useAim && e) {
      const aimX = Number.isFinite(Number(e.aimX)) ? Number(e.aimX) : col;
      const aimY = Number.isFinite(Number(e.aimY)) ? Number(e.aimY) : row;
      return {
        x: GOAL.x + Phaser.Math.Clamp(aimX, 0.03, 0.97) * GOAL.w,
        y: GOAL.y + Phaser.Math.Clamp(aimY, 0.03, 0.97) * GOAL.h
      };
    }
    return { x: GOAL.x + col * GOAL.w, y: GOAL.y + row * GOAL.h };
  }

  private shotTarget(e: NonNullable<PublicState["lastShot"]>): { x: number; y: number } {
    const inside = this.zonePoint(e.zone, true, e);
    if (!e.miss) return inside;

    // Misses should visibly miss the goal instead of landing inside the net.
    const wideLeft = e.zone.endsWith("L");
    const wideRight = e.zone.endsWith("R");
    const high = e.zone.startsWith("T") || e.power > 88;
    const softMiss = e.power < 25;
    if (softMiss) {
      if (e.zone.startsWith("T")) return { x: inside.x, y: GOAL.y + 6 };
      if (wideLeft) return { x: GOAL.x + 6, y: inside.y };
      if (wideRight) return { x: GOAL.x + GOAL.w - 6, y: inside.y };
      return { x: (e.aimX ?? 0.5) < 0.5 ? GOAL.x + 6 : GOAL.x + GOAL.w - 6, y: inside.y - 10 };
    }
    if (high && !wideLeft && !wideRight) return { x: inside.x, y: GOAL.y - 64 };
    if (wideLeft) return { x: GOAL.x - 78, y: high ? GOAL.y - 32 : inside.y };
    if (wideRight) return { x: GOAL.x + GOAL.w + 78, y: high ? GOAL.y - 32 : inside.y };
    return { x: inside.x + 42, y: GOAL.y - 58 };
  }

  private drawShotAnimation(state: PublicState) {
    const e = state.lastShot;
    if (!e) return;
    const target = this.shotTarget(e);
    const ball = this.drawBall(PENALTY_SPOT.x, PENALTY_SPOT.y, 17, 38);
    ball.setName("shotAnimation");

    const trail = this.add.graphics().setDepth(33);
    trail.lineStyle(7, e.goal ? 0xffd21f : e.miss ? 0xffa834 : 0xffffff, 0.48);
    trail.lineBetween(PENALTY_SPOT.x, PENALTY_SPOT.y, target.x, target.y);
    trail.lineStyle(2, 0xffffff, 0.50);
    trail.lineBetween(PENALTY_SPOT.x, PENALTY_SPOT.y - 8, target.x, target.y - 8);

    this.tweens.add({
      targets: ball,
      x: target.x,
      y: target.y,
      scale: e.power > 84 ? 0.78 : 0.92,
      angle: e.zone.endsWith("L") ? -720 : 720,
      duration: e.saved ? 610 : 760,
      ease: e.miss ? "Quad.easeOut" : "Cubic.easeOut",
      onComplete: () => {
        if (e.saved) {
          const bounceX = target.x + (e.goaliePick.endsWith("L") ? 70 : e.goaliePick.endsWith("R") ? -70 : 50);
          this.tweens.add({ targets: ball, x: bounceX, y: target.y + 78, angle: ball.angle + 420, scale: 0.72, duration: 430, ease: "Bounce.easeOut" });
        } else if (e.miss) {
          this.tweens.add({ targets: ball, y: target.y + 28, angle: ball.angle + 240, duration: 480, yoyo: true, ease: "Sine.easeInOut" });
        } else {
          this.tweens.add({ targets: ball, scale: 1.08, duration: 150, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
        }
      }
    });

    this.time.delayedCall(170, () => {
      this.add.text(PENALTY_SPOT.x + 66, PENALTY_SPOT.y - 64, "THWACK!", {
        fontFamily: "Arial",
        fontSize: "28px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(40);
    });
  }

  private drawResultFrameOnly(state: PublicState) {
    const e = state.lastShot;
    if (!e) return;
    this.ensureResultAnimationClock(state);
    const key = this.shotResultKey(state);
    if (!key) return;
    if (this.completedResultFrameKey === key) return;
    if (this.resultObjectsKey !== key) this.createResultAnimationObjects(state, key);

    const elapsed = Math.max(0, this.time.now - this.resultAnimationStartedAt);
    const start = { x: PENALTY_SPOT.x, y: PENALTY_SPOT.y };
    const target = this.shotTarget(e);
    const ballTravelMs = e.saved ? 620 : e.miss ? 780 : 720;
    const ballT = Phaser.Math.Clamp(elapsed / ballTravelMs, 0, 1);
    const ballEase = Phaser.Math.Easing.Cubic.Out(ballT);
    let ballX = Phaser.Math.Linear(start.x, target.x, ballEase);
    let ballY = Phaser.Math.Linear(start.y, target.y, ballEase);
    const loft = e.zone.startsWith("T") ? 72 : 34;
    ballY -= Math.sin(ballEase * Math.PI) * loft;

    if (e.saved && elapsed > ballTravelMs) {
      const bounceT = Phaser.Math.Clamp((elapsed - ballTravelMs) / 520, 0, 1);
      const bounceEase = Phaser.Math.Easing.Cubic.Out(bounceT);
      const bounceX = target.x + (e.goaliePick.endsWith("L") ? 86 : e.goaliePick.endsWith("R") ? -86 : 58);
      const bounceY = target.y + 92;
      ballX = Phaser.Math.Linear(target.x, bounceX, bounceEase);
      ballY = Phaser.Math.Linear(target.y, bounceY, bounceEase) - Math.sin(bounceEase * Math.PI) * 22;
    } else if (e.miss && elapsed > ballTravelMs) {
      const settleT = Phaser.Math.Clamp((elapsed - ballTravelMs) / 520, 0, 1);
      ballX = Phaser.Math.Linear(target.x, target.x + (target.x < W / 2 ? -34 : 34), Phaser.Math.Easing.Sine.Out(settleT));
      ballY = Phaser.Math.Linear(target.y, target.y + 42, Phaser.Math.Easing.Sine.Out(settleT));
    }

    const trailColour = e.goal ? 0xffd21f : e.miss ? 0xffa834 : 0xffffff;
    this.resultTrail?.clear();
    this.resultTrail?.lineStyle(8, trailColour, 0.34);
    this.resultTrail?.lineBetween(start.x, start.y, ballX, ballY);
    this.resultTrail?.lineStyle(2, 0xffffff, 0.55);
    this.resultTrail?.lineBetween(start.x, start.y - 8, ballX, ballY - 8);

    this.drawDynamicDiveArrow(e.goaliePick, elapsed);

    const goalieStartX = W / 2;
    const goalieStartY = GOAL.y + GOAL.h - 12;
    const goalieTarget = this.goalieDivePoint(e.goaliePick);
    const diveT = Phaser.Math.Clamp((elapsed - 110) / 660, 0, 1);
    const diveEase = Phaser.Math.Easing.Cubic.Out(diveT);
    const goalieX = Phaser.Math.Linear(goalieStartX, goalieTarget.x, diveEase);
    const goalieY = Phaser.Math.Linear(goalieStartY, goalieTarget.y, diveEase) - Math.sin(diveEase * Math.PI) * (e.goaliePick.startsWith("T") ? 28 : 10);
    const goalieDx = goalieTarget.x - goalieStartX;
    const goalieAngle = Math.abs(goalieDx) < 18 ? 0 : Phaser.Math.Linear(0, goalieDx < 0 ? -76 : 76, diveEase);
    this.resultGoalie?.setPosition(goalieX, goalieY).setAngle(goalieAngle).setScale(Phaser.Math.Linear(1, 1.05, diveEase), Phaser.Math.Linear(1, 0.94, diveEase));
    this.resultGoalieLabel?.setPosition(goalieX, goalieY + 62);

    const kickerX = W / 2 - 98;
    const kickerY = 622;
    const kickT = Phaser.Math.Clamp(elapsed / 420, 0, 1);
    const kickWindup = Math.sin(kickT * Math.PI);
    this.resultKicker?.setPosition(kickerX, kickerY).setAngle(-13 * kickWindup).setScale(1 + 0.035 * kickWindup, 1 - 0.025 * kickWindup);
    this.resultKickerLabel?.setPosition(kickerX, kickerY + 66);

    const spin = (e.zone.endsWith("L") ? -1 : 1) * Phaser.Math.Linear(0, 720, Phaser.Math.Clamp(elapsed / 840, 0, 1));
    const ballScale = Phaser.Math.Linear(1, e.power > 84 ? 0.76 : 0.9, ballEase);
    this.resultBall?.setPosition(ballX, ballY).setAngle(spin).setScale(ballScale);

    if (elapsed >= ballTravelMs * 0.72) {
      this.updateDynamicShotMarker(target.x, target.y, e, true);
    } else {
      this.updateDynamicShotMarker(target.x, target.y, e, false);
    }

    if (this.resultThwack) {
      const visible = elapsed >= 90 && elapsed <= 760;
      this.resultThwack.setVisible(visible);
      if (visible) {
        const thwackAlpha = elapsed < 240
          ? Phaser.Math.Clamp((elapsed - 90) / 150, 0, 1)
          : Phaser.Math.Clamp(1 - (elapsed - 560) / 200, 0, 1);
        this.resultThwack.setAlpha(thwackAlpha);
      }
    }

    if (key && elapsed > 1600) this.completedResultFrameKey = key;
  }

  private createResultAnimationObjects(state: PublicState, key: string) {
    this.destroyResultAnimationObjects();
    const e = state.lastShot;
    if (!e) return;
    const kicker = getPlayer(state, e.kickerId);
    const goalie = getPlayer(state, e.goalieId);

    this.resultObjectsKey = key;
    this.resultTrail = this.add.graphics().setDepth(31);
    this.resultDiveArrow = this.add.graphics().setDepth(30);
    this.resultDiveLabel = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "14px",
      fontStyle: "900",
      color: "#cfe7ff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(39);

    this.resultGoalie = drawFootballer(this, W / 2, GOAL.y + GOAL.h - 12, goalie, 1.14, false).setDepth(37);
    this.resultGoalieLabel = this.add.text(W / 2, GOAL.y + GOAL.h + 26, shortText(playerName(goalie), 18), {
      fontFamily: "Arial",
      fontSize: "14px",
      fontStyle: "900",
      color: "#cfe7ff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(45);

    const kickerX = W / 2 - 108;
    const kickerY = 618;
    this.resultKicker = drawFootballer(this, kickerX, kickerY, kicker, 1.08, false).setDepth(27);
    this.resultKickerLabel = this.add.text(kickerX, kickerY + 66, shortText(playerName(kicker), 18), {
      fontFamily: "Arial",
      fontSize: "14px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(28);

    this.resultBall = this.drawBall(PENALTY_SPOT.x, PENALTY_SPOT.y, 17, 44);
    this.resultThwack = this.add.text(PENALTY_SPOT.x + 76, PENALTY_SPOT.y - 66, "THWACK!", {
      fontFamily: "Arial",
      fontSize: "30px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(46).setVisible(false);

    this.resultMarkerCircle = this.add.circle(0, 0, 25, 0x4cff4c, 0.34).setStrokeStyle(5, 0x000000, 0.72).setDepth(41).setVisible(false);
    this.resultMarkerText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(42).setVisible(false);
  }

  private destroyResultAnimationObjects() {
    [
      this.resultTrail,
      this.resultDiveArrow,
      this.resultDiveLabel,
      this.resultGoalie,
      this.resultGoalieLabel,
      this.resultKicker,
      this.resultKickerLabel,
      this.resultBall,
      this.resultThwack,
      this.resultMarkerCircle,
      this.resultMarkerText
    ].forEach((obj) => obj?.destroy());
    this.resultTrail = undefined;
    this.resultDiveArrow = undefined;
    this.resultDiveLabel = undefined;
    this.resultGoalie = undefined;
    this.resultGoalieLabel = undefined;
    this.resultKicker = undefined;
    this.resultKickerLabel = undefined;
    this.resultBall = undefined;
    this.resultThwack = undefined;
    this.resultMarkerCircle = undefined;
    this.resultMarkerText = undefined;
  }

  private goalieDivePoint(zone: GoalZone): { x: number; y: number } {
    const point = this.zonePoint(zone, false);
    if (zone === "LM") return { x: W / 2, y: GOAL.y + GOAL.h - 82 };
    if (zone === "TM") return { x: W / 2, y: GOAL.y + GOAL.h * 0.35 };
    return {
      x: point.x,
      y: zone.startsWith("T") ? point.y + 8 : point.y - 8
    };
  }

  private drawDynamicDiveArrow(zone: GoalZone, elapsed: number) {
    if (!this.resultDiveArrow || !this.resultDiveLabel) return;
    const from = { x: W / 2, y: GOAL.y + GOAL.h - 42 };
    const to = this.goalieDivePoint(zone);
    const arrowT = Phaser.Math.Clamp((elapsed - 90) / 520, 0, 1);
    const endX = Phaser.Math.Linear(from.x, to.x, Phaser.Math.Easing.Cubic.Out(arrowT));
    const endY = Phaser.Math.Linear(from.y, to.y, Phaser.Math.Easing.Cubic.Out(arrowT));
    const g = this.resultDiveArrow;
    g.clear();
    g.lineStyle(5, 0x6db6ff, 0.64);
    g.lineBetween(from.x, from.y, endX, endY);
    if (arrowT > 0.75) {
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
      const head = 16;
      g.fillStyle(0x6db6ff, 0.72);
      g.fillTriangle(
        to.x,
        to.y,
        to.x - Math.cos(angle - 0.45) * head,
        to.y - Math.sin(angle - 0.45) * head,
        to.x - Math.cos(angle + 0.45) * head,
        to.y - Math.sin(angle + 0.45) * head
      );
    }
    this.resultDiveLabel
      .setText(`DIVE: ${ZONE_LABELS[zone]}`)
      .setPosition(to.x, to.y - 30)
      .setAlpha(Phaser.Math.Clamp(arrowT, 0.15, 1));
  }

  private updateDynamicShotMarker(x: number, y: number, e: NonNullable<PublicState["lastShot"]>, visible: boolean) {
    if (!this.resultMarkerCircle || !this.resultMarkerText) return;
    if (!visible) {
      this.resultMarkerCircle.setVisible(false);
      this.resultMarkerText.setVisible(false);
      return;
    }
    const markerColour = e.goal ? 0x4cff4c : e.miss ? 0xffa834 : 0xff4c4c;
    this.resultMarkerCircle
      .setVisible(true)
      .setPosition(x, y)
      .setFillStyle(markerColour, 0.34);
    this.resultMarkerText
      .setVisible(true)
      .setPosition(x, y)
      .setText(e.goal ? "✓" : e.miss ? "WIDE" : "SAVE")
      .setFontSize(e.miss ? 15 : 18);
  }

  private drawNameBadge(x: number, y: number, name: string, detail: string, width: number, fill: number) {
    this.add.rectangle(x, y, width, 42, fill, 0.88).setStrokeStyle(3, 0xffffff, 0.65).setDepth(16);
    this.add.text(x, y - 7, shortText(name, width > 225 ? 21 : 19), {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5).setDepth(17);
    this.add.text(x, y + 12, detail, {
      fontFamily: "Arial",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fff2a6",
      align: "center"
    }).setOrigin(0.5).setDepth(17);
  }

  private drawAimMarker(isKicker: boolean) {
    if (!isKicker) return;
    this.aimOuter = this.add.circle(0, 0, 24, 0xffd21f, 0.88).setStrokeStyle(5, 0x000000, 0.82).setDepth(18);
    this.aimInner = this.add.circle(0, 0, 7, 0xffffff, 1).setDepth(19);
    this.updateAimMarkerOnly();
  }

  private updateAimMarkerOnly() {
    if (!this.aimOuter || !this.aimInner) return;
    const x = GOAL.x + this.aimX * GOAL.w;
    const y = GOAL.y + this.aimY * GOAL.h;
    this.aimOuter.setPosition(x, y);
    this.aimInner.setPosition(x, y);
  }

  private drawPowerPanel() {
    const panelX = POWER_BAR.x + POWER_BAR.w / 2;
    const panelY = POWER_BAR.y;
    this.add.rectangle(panelX, panelY, POWER_BAR.w + 28, 64, 0x07170c, 0.91).setStrokeStyle(4, 0xffffff, 0.66).setDepth(24);
    this.add.text(POWER_BAR.x, panelY - 23, "POWER METER", {
      fontFamily: "Arial",
      fontSize: "14px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(25);

    // Miss zones on both ends, smaller green sweet spot in the middle.
    this.add.rectangle(POWER_BAR.x + POWER_BAR.w * 0.125, panelY, POWER_BAR.w * 0.25, POWER_BAR.h, 0xde4b2a, 0.46).setOrigin(0.5).setDepth(25);
    this.add.rectangle(POWER_BAR.x + POWER_BAR.w * 0.50, panelY, POWER_BAR.w * 0.50, POWER_BAR.h, 0x2bb84a, 0.44).setOrigin(0.5).setDepth(25);
    this.add.rectangle(POWER_BAR.x + POWER_BAR.w * 0.875, panelY, POWER_BAR.w * 0.25, POWER_BAR.h, 0xde4b2a, 0.46).setOrigin(0.5).setDepth(25);
    this.add.rectangle(POWER_BAR.x + POWER_BAR.w / 2, panelY, POWER_BAR.w, POWER_BAR.h, 0x000000, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(26);
    this.add.text(POWER_BAR.x + 4, panelY + 24, "miss zone", { fontFamily: "Arial", fontSize: "10px", fontStyle: "bold", color: "#ffcab8" }).setOrigin(0, 0.5).setDepth(25);
    this.add.text(POWER_BAR.x + POWER_BAR.w * 0.5, panelY + 24, "sweet spot", { fontFamily: "Arial", fontSize: "10px", fontStyle: "bold", color: "#d9ffd6" }).setOrigin(0.5).setDepth(25);
    this.add.text(POWER_BAR.x + POWER_BAR.w - 4, panelY + 24, "miss zone", { fontFamily: "Arial", fontSize: "10px", fontStyle: "bold", color: "#ffcab8" }).setOrigin(1, 0.5).setDepth(25);

    this.powerFill = this.add.rectangle(POWER_BAR.x, POWER_BAR.y, 2, POWER_BAR.h - 8, 0xffd21f, 0.96)
      .setOrigin(0, 0.5)
      .setDepth(27);
    this.powerMarker = this.add.rectangle(POWER_BAR.x, POWER_BAR.y, 5, POWER_BAR.h + 14, 0xffffff, 1)
      .setStrokeStyle(2, 0x000000, 0.8)
      .setDepth(28);
    this.drawPowerOnly();
  }

  private drawPowerOnly() {
    if (!this.state || this.state.activePenalty?.kickerId !== Net.sessionId || this.state.phase !== "penalty") return;
    if (!this.powerFill || !this.powerMarker) return;
    const clamped = Phaser.Math.Clamp(this.power, 0, 100);
    const fillW = Math.max(2, clamped / 100 * POWER_BAR.w);
    const fillColour = clamped < 25 || clamped > 75 ? 0xde4b2a : 0x2bb84a;
    this.powerFill
      .setFillStyle(fillColour, 0.96)
      .setPosition(POWER_BAR.x, POWER_BAR.y)
      .setDisplaySize(fillW, POWER_BAR.h - 8);
    this.powerMarker.setPosition(POWER_BAR.x + fillW, POWER_BAR.y);
  }

  private drawActionPanel(state: PublicState, isKicker: boolean, isGoalie: boolean, kickerIsBot: boolean) {
    const p = state.activePenalty;
    if (!p) return;
    const width = 420;
    const panelY = 672;
    this.add.rectangle(W / 2, panelY, width, 64, 0x07170c, 0.91).setStrokeStyle(4, 0xffd21f, 0.72).setDepth(24);

    if (isKicker) {
      this.add.text(W / 2, panelY - 16, "Aim in the goal. Time the green sweet spot.", {
        fontFamily: "Arial",
        fontSize: "14px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: width - 28 }
      }).setOrigin(0.5).setDepth(25);
      this.add.text(W / 2, panelY + 15, `Shot clock: ${secondsRemaining(p.timeoutAt)}s`, {
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(25);
      const pending = this.isKickPending(state);
      this.kickButton = addButton(this, 1090, 655, 246, 66, pending ? "KICKING..." : "KICK!", () => {
        const key = this.penaltyKey(state);
        if (!key || this.kickSentForPenalty === key) return;
        this.kickSentForPenalty = key;
        this.showLocalKickFeedback();
        Net.send("shoot", { aimX: this.aimX, aimY: this.aimY, power: Math.round(this.power) });
      }, pending ? 0x555555 : 0x9a2f10);
      this.kickButton.setDepth(30);
      if (pending) this.kickButton.setAlpha(0.62);
      return;
    }

    if (isGoalie) {
      const picked = p.goaliePick;
      this.add.text(W / 2, panelY - 16, kickerIsBot ? "Goalie: pick a zone before the bot shoots." : "Goalie: pick where the shot is going.", {
        fontFamily: "Arial",
        fontSize: "14px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: width - 28 }
      }).setOrigin(0.5).setDepth(25);
      this.add.text(W / 2, panelY + 16, picked ? `Dive locked: ${ZONE_LABELS[picked]}` : "No dive chosen yet", {
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "900",
        color: picked ? "#fff2a6" : "#ffdddd",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(25);
      return;
    }

    this.add.text(W / 2, panelY - 14, `Spectator: ${shortText(playerLabel(state, p.kickerId), 28)} is shooting.`, {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: width - 28 }
    }).setOrigin(0.5).setDepth(25);
    this.add.text(W / 2, panelY + 17, kickerIsBot ? `Bot kick in ${secondsRemaining(p.timeoutAt)}s` : `Waiting for ${shortText(playerName(getPlayer(state, p.kickerId)), 18)}...`, {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(25);
  }

  private showLocalKickFeedback() {
    this.destroyNamed("localKickFeedback");
    const targetX = GOAL.x + this.aimX * GOAL.w;
    const targetY = GOAL.y + this.aimY * GOAL.h;
    const ghost = this.drawBall(PENALTY_SPOT.x, PENALTY_SPOT.y, 15, 42);
    ghost.setName("localKickFeedback");
    ghost.setAlpha(0.92);
    this.tweens.add({
      targets: ghost,
      x: Phaser.Math.Linear(PENALTY_SPOT.x, targetX, 0.32),
      y: Phaser.Math.Linear(PENALTY_SPOT.y, targetY, 0.32),
      scale: 0.72,
      angle: this.aimX < 0.5 ? -360 : 360,
      duration: 260,
      ease: "Cubic.easeOut"
    });
    this.add.text(W / 2, 580, "Shot launched — waiting for VAR...", {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(42).setName("localKickFeedback");
  }

  private drawCountdownOnly(state: PublicState) {
    if (state.phase !== "penalty" || !state.activePenalty) return;
    const p = state.activePenalty;
    const kicker = getPlayer(state, p.kickerId);
    const seconds = secondsRemaining(p.timeoutAt);
    const isGoalie = p.goalieId === Net.sessionId;
    const isKicker = p.kickerId === Net.sessionId;
    const botKicker = !!kicker?.isBot;
    const title = botKicker ? "BOT SHOT IN" : isKicker ? "SHOT CLOCK" : isGoalie ? "DIVE CLOCK" : "SHOT CLOCK";
    const detail = botKicker
      ? `${shortText(playerName(kicker), 18)} will kick automatically.`
      : isKicker
        ? "Take the kick before time runs out."
        : `${shortText(playerName(kicker), 18)} is lining up the shot.`;

    const x = 1120;
    const y = 514;
    const warning = seconds <= 2;

    if (!this.countdownBg) {
      this.countdownBg = this.add.rectangle(x, y, 238, 104, 0x07170c, 0.92).setDepth(31);
      this.countdownTitle = this.add.text(x, y - 32, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(32);
      this.countdownSeconds = this.add.text(x, y - 1, "", {
        fontFamily: "Arial",
        fontSize: "38px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(32);
      this.countdownDetail = this.add.text(x, y + 34, "", {
        fontFamily: "Arial",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 214 }
      }).setOrigin(0.5).setDepth(32);
      this.countdownLock = this.add.text(x, y + 54, "", {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(32).setVisible(false);
    }

    this.countdownBg
      .setFillStyle(warning ? 0x5b130b : 0x07170c, 0.92)
      .setStrokeStyle(4, warning ? 0xff4c4c : 0xffd21f, 0.85);
    this.countdownTitle?.setText(title);
    this.countdownSeconds?.setText(`${seconds}s`).setColor(warning ? "#ffdddd" : "#fff2a6");
    this.countdownDetail?.setText(detail);
    if (isGoalie && p.goaliePick && this.countdownLock) {
      this.countdownLock.setText(`Locked: ${ZONE_HINTS[p.goaliePick]}`).setVisible(true);
    } else {
      this.countdownLock?.setVisible(false);
    }
  }

  private setAimFromPointer(pointer: Phaser.Input.Pointer) {
    const s = this.state;
    if (s?.phase !== "penalty" || s.activePenalty?.kickerId !== Net.sessionId) return;
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    if (wx < GOAL.x || wx > GOAL.x + GOAL.w || wy < GOAL.y || wy > GOAL.y + GOAL.h) return;
    this.aimX = Phaser.Math.Clamp((wx - GOAL.x) / GOAL.w, 0.03, 0.97);
    this.aimY = Phaser.Math.Clamp((wy - GOAL.y) / GOAL.h, 0.03, 0.97);
    this.updateAimMarkerOnly();
  }

  private drawScoreboard(state: PublicState, match: BracketMatch) {
    const p1 = getPlayer(state, match.p1);
    const p2 = getPlayer(state, match.p2);
    const panelY = GOAL.y + GOAL.h / 2;
    this.drawPlayerScorePanel(134, panelY, p1, match.p1Score, match.p1Shootout, match.p1ShootoutTaken);
    this.drawPlayerScorePanel(1146, panelY, p2, match.p2Score, match.p2Shootout, match.p2ShootoutTaken);
  }

  private drawPlayerScorePanel(x: number, y: number, player: PlayerRecord | null, score: number, shootout: number, shootoutTaken: number) {
    const detail = playerDetail(player);
    const panelW = 208;
    const panelH = GOAL.h;
    const topY = y - panelH / 2;
    this.add.rectangle(x, y, panelW, panelH, 0x07170c, 0.93).setStrokeStyle(4, 0xffd21f, 0.78).setDepth(20);

    this.add.text(x, topY + 24, twoLineName(detail.name, 16), {
      fontFamily: "Arial",
      fontSize: cardFontSize(detail.name, 14),
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: 184 },
      lineSpacing: -4
    }).setOrigin(0.5).setDepth(21);

    drawFootballer(this, x, topY + 86, player, 0.50, false).setDepth(22);

    this.add.text(x, topY + 136, twoLineName(detail.silly, 14), {
      fontFamily: "Arial",
      fontSize: cardFontSize(detail.silly, 12),
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: 184 },
      lineSpacing: -4
    }).setOrigin(0.5).setDepth(21);

    this.add.text(x, topY + 166, `${detail.country} ${detail.number}`, {
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#d7f0ff",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center"
    }).setOrigin(0.5).setDepth(21);

    this.add.text(x, topY + 190, `Pens ${shootout}/${shootoutTaken}`, {
      fontFamily: "Arial",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center"
    }).setOrigin(0.5).setDepth(21);

    this.add.text(x, topY + 211, "TOTAL", {
      fontFamily: "Arial",
      fontSize: "10px",
      fontStyle: "900",
      color: "#dff7e5",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center"
    }).setOrigin(0.5).setDepth(21);

    this.add.line(0, 0, x - 74, topY + 222, x + 74, topY + 222, 0xffffff, 0.24).setLineWidth(2, 2).setDepth(21);

    this.add.text(x, topY + 248, String(score + shootout), {
      fontFamily: "Arial",
      fontSize: "52px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setDepth(22);
  }

  private drawShotResultInGoal(state: PublicState) {
    const e = state.lastShot;
    if (!e) return;
    const target = this.shotTarget(e);
    const markerColour = e.goal ? 0x4cff4c : e.miss ? 0xffa834 : 0xff4c4c;
    this.add.circle(target.x, target.y, 25, markerColour, 0.40).setStrokeStyle(5, 0x000000, 0.72).setDepth(23);
    const missLabel = e.power < 25 ? (e.zone.startsWith("T") ? "BAR" : "POST") : "WIDE";
    this.add.text(target.x, target.y, e.goal ? "✓" : e.miss ? missLabel : "SAVE", {
      fontFamily: "Arial",
      fontSize: e.miss ? "15px" : "18px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(24);
  }

  private playPenaltyResultCommentaryOnce(state: PublicState) {
    const e = state.lastShot;
    if (!e) return;
    const key = this.shotResultKey(state);
    if (!key || this.soundPlayedForShotKey === key) return;
    this.soundPlayedForShotKey = key;

    if (e.goal) {
      playRandomCrowd("goal");
      playRandomCommentary("goal");
    } else if (e.saved) {
      playRandomCrowd("save");
      playRandomCommentary("save");
    } else if (e.miss) {
      playRandomCrowd("miss");
      playRandomCommentary("miss");
    }
  }

  private drawResult(state: PublicState) {
    const e = state.lastShot;
    if (!e) return;
    const kicker = getPlayer(state, e.kickerId);
    const goalie = getPlayer(state, e.goalieId);
    const colour = e.goal ? "#b7ffb7" : e.miss ? "#ffdb9c" : "#ffb7b7";
    const border = e.goal ? 0x4cff4c : e.miss ? 0xffa834 : 0xff4c4c;
    this.add.rectangle(W / 2, 650, 936, 98, 0x07170c, 0.92).setStrokeStyle(5, border, 0.92).setDepth(30);
    this.add.text(W / 2, 620, e.goal ? "GOAL!" : e.miss ? "MISS!" : "SAVED!", {
      fontFamily: "Arial",
      fontSize: "31px",
      fontStyle: "900",
      color: colour,
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, 648, `${playerName(kicker)} shot ${ZONE_HINTS[e.zone]}. ${playerName(goalie)} chose ${ZONE_HINTS[e.goaliePick]}.`, {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 888 },
      lineSpacing: -2
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, 678, e.text, {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "900",
      color: "#fff2a6",
      align: "center",
      wordWrap: { width: 880 }
    }).setOrigin(0.5).setDepth(31);
  }

  private destroyNamed(name: string) {
    this.children.list
      .filter((child) => child.name === name)
      .forEach((child) => child.destroy());
  }
}
