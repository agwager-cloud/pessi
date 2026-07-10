import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import { Net } from "../net/Net";
import { playMusic, playPlayerName, preloadAudio } from "../audio/audio";
import type { PlayerRecord, PublicState } from "../types";
import { addSoundToggle, drawFootballer, H, W } from "../ui/ui";
import { routeScene } from "../ui/routing";

export class CharacterSelectScene extends Phaser.Scene {
  private unsub?: () => void;
  private pendingIndex: number | null = null;
  private confirmedIndex: number | null = null;

  constructor() {
    super("CharacterSelectScene");
  }

  preload() {
    this.load.image("lobbyBg", "assets/backgrounds/lobbyBg.jpg");
    preloadAudio(this);
  }

  create() {
    playMusic(this, "startLobby");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());

    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("CharacterSelectScene")) return;
      const me = state.players.find((p) => p.id === Net.sessionId);
      if (me && me.characterIndex >= 0 && this.confirmedIndex !== me.characterIndex) {
        this.confirmedIndex = me.characterIndex;
        this.pendingIndex = null;
        playPlayerName(CHARACTERS[me.characterIndex]?.name ?? me.name);
      }
      if (me && me.characterIndex < 0 && this.pendingIndex !== null) {
        const takenByOther = state.players.some((p) => p.id !== me.id && p.characterIndex === this.pendingIndex);
        if (takenByOther || state.message.toLowerCase().includes("taken")) this.pendingIndex = null;
      }
      routeScene(this, state);
      if (this.scene.isActive("CharacterSelectScene")) this.render(state);
    });
  }

  private render(state: PublicState) {
    [...this.children.list].forEach((child) => child.destroy());
    this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.52);

    const me = state.players.find((p) => p.id === Net.sessionId) ?? null;
    const selectedHumans = state.players.filter((p) => !p.isBot && p.characterIndex >= 0).length;
    const available = CHARACTERS.length - new Set(state.players.filter((p) => p.characterIndex >= 0).map((p) => p.characterIndex)).size;

    const top = this.add.graphics();
    top.fillStyle(0x07170c, 0.88);
    top.fillRoundedRect(16, 10, W - 32, 92, 18);
    top.lineStyle(3, 0xffffff, 0.3);
    top.strokeRoundedRect(16, 10, W - 32, 92, 18);

    this.add.text(34, 28, "CHOOSE YOUR FOOTBALLER", {
      fontFamily: "Arial",
      fontSize: "30px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0, 0.5);

    this.add.text(34, 66, "First in, best dressed! Tap an available player to reserve them.", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    this.add.text(W - 34, 29, `CODE ${state.roomCode}`, {
      fontFamily: "Arial",
      fontSize: "25px",
      fontStyle: "900",
      color: "#fff2a6"
    }).setOrigin(1, 0.5);
    this.add.text(W - 34, 66, `${available} available • ${selectedHumans} selected`, {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(1, 0.5);
    addSoundToggle(this, W - 250, 40);

    const columns = 9;
    const rows = 4;
    const gridX = 20;
    const gridY = 112;
    const gridW = W - 40;
    const gridH = 552;
    const gapX = 7;
    const gapY = 8;
    const cardW = (gridW - gapX * (columns - 1)) / columns;
    const cardH = (gridH - gapY * (rows - 1)) / rows;

    CHARACTERS.forEach((character, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = gridX + col * (cardW + gapX);
      const y = gridY + row * (cardH + gapY);
      const owner = state.players.find((p) => p.characterIndex === index) ?? null;
      const mine = owner?.id === Net.sessionId;
      const taken = Boolean(owner && !mine);
      const pending = this.pendingIndex === index && !mine;

      const card = this.add.container(x + cardW / 2, y + cardH / 2);
      const bg = this.add.rectangle(0, 0, cardW, cardH, mine ? 0x0b5d33 : 0x07170c, mine ? 0.96 : 0.86)
        .setStrokeStyle(mine ? 5 : 2, mine ? 0xffd21f : 0xffffff, mine ? 1 : 0.32);
      card.add(bg);

      const fakePlayer: PlayerRecord = {
        id: `character_${index}`,
        sessionId: null,
        name: character.name,
        characterIndex: index,
        isBot: false,
        connected: true,
        eliminated: false,
        wins: 0
      };
      const footballer = drawFootballer(this, 0, -18, fakePlayer, 0.48, false);
      card.add(footballer);

      const displayName = character.name.length > 20 ? character.name.replace(" ", "\n") : character.name;
      card.add(this.add.text(0, 38, displayName, {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: cardW - 8 }
      }).setOrigin(0.5, 0));
      card.add(this.add.text(0, cardH / 2 - 18, `${character.country} #${character.number}`, {
        fontFamily: "Arial",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center"
      }).setOrigin(0.5));

      if (taken || pending) {
        footballer.setAlpha(0.28);
        bg.setFillStyle(0x242424, 0.92);
        card.add(this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.38));
        card.add(this.add.text(0, 0, pending ? "SELECTING..." : "UNAVAILABLE", {
          fontFamily: "Arial",
          fontSize: pending ? "14px" : "15px",
          fontStyle: "900",
          color: pending ? "#fff2a6" : "#dddddd",
          stroke: "#000000",
          strokeThickness: 4,
          align: "center"
        }).setOrigin(0.5));
      } else if (mine) {
        card.add(this.add.text(0, -cardH / 2 + 12, "YOUR PLAYER ✓", {
          fontFamily: "Arial",
          fontSize: "12px",
          fontStyle: "900",
          color: "#fff2a6",
          stroke: "#000000",
          strokeThickness: 3
        }).setOrigin(0.5));
      } else if (me && me.characterIndex < 0 && this.pendingIndex === null) {
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerover", () => bg.setStrokeStyle(4, 0xffd21f, 0.95));
        bg.on("pointerout", () => bg.setStrokeStyle(2, 0xffffff, 0.32));
        bg.on("pointerdown", () => {
          if (this.pendingIndex !== null) return;
          this.pendingIndex = index;
          Net.send("selectCharacter", index);
          this.render(state);
        });
      }
    });

    const statusColor = state.message.toLowerCase().includes("taken") ? "#ffb7b7" : "#ffffff";
    this.add.text(W / 2, 690, me?.characterIndex >= 0 ? "Player locked in — waiting for the lobby." : state.message, {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "900",
      color: statusColor,
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 1120 }
    }).setOrigin(0.5);
  }
}
