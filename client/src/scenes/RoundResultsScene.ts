import Phaser from "phaser";
import { Net } from "../net/Net";
import { preloadAudio, playMusic } from "../audio/audio";
import type { BracketMatch, PublicState } from "../types";
import { addButton, addTitle, addTopBar, drawPitch, formatMatchScore, getPlayer, W } from "../ui/ui";
import { routeScene } from "../ui/routing";

export class RoundResultsScene extends Phaser.Scene {
  private unsub?: () => void;
  constructor() { super("RoundResultsScene"); }

  preload() {
    preloadAudio(this);
  }

  create() {
    playMusic(this, "results");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());
    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("RoundResultsScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("RoundResultsScene")) this.render(state);
    });
  }

  shutdown() { this.unsub?.(); }

  private render(state: PublicState) {
    [...this.children.list].forEach((child) => child.destroy());
    drawPitch(this);
    addTopBar(this, state, state.message);
    addTitle(this, `Round ${state.roundNumber} Results`, 58, 44);
    this.drawRoundPanel(state);
    this.drawNextOpponents(state);
    this.drawMiniBracket(state);

    if (Net.sessionId === state.hostId) {
      addButton(this, W / 2, 660, 430, 58, "START NEXT ROUND", () => Net.send("nextRound"), 0x0b5d33);
    } else {
      this.add.text(W / 2, 660, "Waiting for the host to start the next round", {
        fontFamily: "Arial", fontSize: "22px", fontStyle: "900", color: "#ffffff", stroke: "#000000", strokeThickness: 4
      }).setOrigin(0.5);
    }
  }

  private drawRoundPanel(state: PublicState) {
    const matches = state.bracket.filter((m) => m.round === state.roundNumber);
    this.add.rectangle(258, 352, 430, 485, 0x07170c, 0.78).setStrokeStyle(4, 0xffd21f, 0.7);
    this.add.text(258, 134, "Completed matches", { fontFamily: "Arial", fontSize: "24px", fontStyle: "900", color: "#fff2a6" }).setOrigin(0.5);
    matches.forEach((m, i) => {
      const y = 176 + i * Math.min(48, 390 / Math.max(1, matches.length));
      this.add.text(68, y, formatMatchScore(state, m), {
        fontFamily: "Arial", fontSize: matches.length > 8 ? "13px" : "16px", fontStyle: "bold", color: "#ffffff", wordWrap: { width: 380 }
      }).setOrigin(0, 0.5);
    });
  }

  private drawNextOpponents(state: PublicState) {
    const winners = state.bracket.filter((m) => m.round === state.roundNumber).map((m) => m.winnerId).filter(Boolean) as string[];
    this.add.rectangle(1015, 352, 430, 485, 0x07170c, 0.78).setStrokeStyle(4, 0xffffff, 0.45);
    this.add.text(1015, 134, "Next round pairings", { fontFamily: "Arial", fontSize: "24px", fontStyle: "900", color: "#fff2a6" }).setOrigin(0.5);
    for (let i = 0; i < winners.length; i += 2) {
      const y = 178 + (i / 2) * Math.min(58, 390 / Math.max(1, winners.length / 2));
      const a = getPlayer(state, winners[i])?.name ?? "?";
      const b = getPlayer(state, winners[i + 1])?.name ?? "?";
      this.add.text(820, y, `${a}  vs  ${b}`, {
        fontFamily: "Arial", fontSize: winners.length > 8 ? "14px" : "18px", fontStyle: "900", color: "#ffffff", wordWrap: { width: 390 }, align: "center"
      }).setOrigin(0, 0.5);
    }
  }

  private drawMiniBracket(state: PublicState) {
    const cx = W / 2;
    this.add.rectangle(cx, 352, 240, 485, 0x07170c, 0.72).setStrokeStyle(4, 0xffffff, 0.35);
    this.add.text(cx, 130, "Alive", { fontFamily: "Arial", fontSize: "24px", fontStyle: "900", color: "#fff2a6" }).setOrigin(0.5);
    const alive = state.players.filter((p) => !p.eliminated && state.bracket.some((m) => m.p1 === p.id || m.p2 === p.id));
    alive.forEach((p, i) => {
      this.add.text(cx, 170 + i * Math.min(42, 410 / Math.max(1, alive.length)), p.name, {
        fontFamily: "Arial", fontSize: alive.length > 8 ? "13px" : "17px", fontStyle: "900", color: "#ffffff", align: "center", wordWrap: { width: 210 }
      }).setOrigin(0.5);
    });
  }
}
