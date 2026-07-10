import Phaser from "phaser";
import { CHARACTERS, TOURNAMENT_SIZES } from "@pessi/shared";
import { Net } from "../net/Net";
import { preloadAudio, playMusic, stopSfxChannel } from "../audio/audio";
import type { PlayerRecord, PublicState } from "../types";
import { addButton, addTopBar, H, W } from "../ui/ui";
import { routeScene } from "../ui/routing";

type GridLayout = {
  cols: number;
  rows: number;
  cardW: number;
  cardH: number;
  gapX: number;
  gapY: number;
};

export class LobbyScene extends Phaser.Scene {
  private unsub?: () => void;
  private selectedId: string | null = null;

  constructor() {
    super("LobbyScene");
  }

  preload() {
    this.load.image("lobbyBg", "assets/backgrounds/lobbyBg.jpg");
    preloadAudio(this);
  }

  create() {
    // Character-name previews belong only to CharacterSelectScene. Stop any
    // remaining preview as soon as the lobby opens.
    stopSfxChannel("playerName");
    playMusic(this, "startLobby");
    const cleanup = () => {
      this.unsub?.();
      this.unsub = undefined;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("LobbyScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("LobbyScene")) this.render(state);
    });

    // Safety net: if a state update was missed during the StartScene -> LobbyScene
    // transition, do not leave the player looking at a blank canvas.
    this.time.delayedCall(80, () => {
      if (!this.scene.isActive("LobbyScene")) return;
      if (Net.state) this.render(Net.state);
      else this.renderWaitingForState();
    });
  }

  shutdown() {
    this.unsub?.();
    this.unsub = undefined;
  }

  private renderWaitingForState() {
    [...this.children.list].forEach((child) => child.destroy());
    if (this.textures.exists("lobbyBg")) {
      this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x07170c, 1).setOrigin(0.5);
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.45).setOrigin(0.5);
    addTopBar(this, null, "Loading lobby...");
    this.drawPanel(W / 2 - 260, 250, 520, 190);
    this.add.text(W / 2, 306, "Loading lobby", {
      fontFamily: "Arial",
      fontSize: "34px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5);
    this.add.text(W / 2, 368, "Waiting for the latest room state from the server.", {
      fontFamily: "Arial",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 440 }
    }).setOrigin(0.5);
  }

  private render(state: PublicState) {
    [...this.children.list].forEach((child) => child.destroy());
    this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.30).setOrigin(0.5);
    addTopBar(this, state, "Build the bracket and start the chaos");

    const isHost = Net.sessionId === state.hostId;
    const humans = state.players.filter((p) => !p.isBot).length;
    const bots = state.players.filter((p) => p.isBot).length;
    const needed = Math.max(0, state.tournamentSize - humans - bots);

    const leftX = 26;
    const leftY = 92;
    const leftW = 868;
    const leftH = 584;
    const rightX = 912;
    const rightY = 92;
    const rightW = 340;
    const rightH = 584;

    this.drawPanel(leftX, leftY, leftW, leftH);
    this.drawPanel(rightX, rightY, rightW, rightH);

    this.add.text(leftX + 22, leftY + 26, "PLAYERS", {
      fontFamily: "Arial",
      fontSize: "30px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0, 0.5);

    this.add.text(leftX + leftW - 24, leftY + 27, "Blue cards = humans   Green cards = bots", {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#dff7e5",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(1, 0.5);

    this.add.text(rightX + rightW / 2, rightY + 26, isHost ? "HOST CONTROLS" : "TOURNAMENT STATUS", {
      fontFamily: "Arial",
      fontSize: "27px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5, 0.5);

    this.drawStatPill(leftX + 90, leftY + 74, 132, 42, `Humans ${humans}`, 0x133b62);
    this.drawStatPill(leftX + 232, leftY + 74, 128, 42, `Bots ${bots}`, 0x1b582e);
    this.drawStatPill(leftX + 408, leftY + 74, 184, 42, `Bracket ${state.tournamentSize}`, 0x123b27);
    this.drawStatPill(leftX + 594, leftY + 74, 146, 42, `Needed ${needed}`, needed > 0 ? 0x725200 : 0x1d5e36);

    this.drawPlayerGrid(state, isHost, leftX + 16, leftY + 108, leftW - 32, leftH - 128);

    if (isHost) {
      this.add.text(rightX + rightW / 2, rightY + 78, "Pick a bracket size. Bots fill the empty spots. Tap a card, then remove selected if needed.", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#dff7e5",
        align: "center",
        wordWrap: { width: rightW - 36 }
      }).setOrigin(0.5, 0);

      this.add.text(rightX + rightW / 2, rightY + 148, "Bracket size", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5);

      const spacing = 58;
      const startX = rightX + rightW / 2 - ((TOURNAMENT_SIZES.length - 1) * spacing) / 2;
      TOURNAMENT_SIZES.forEach((size, i) => {
        addButton(
          this,
          startX + i * spacing,
          rightY + 198,
          50,
          50,
          String(size),
          () => Net.send("setTournamentSize", size),
          size === state.tournamentSize ? 0x9a6b00 : 0x143d2a
        );
      });

      addButton(this, rightX + rightW / 2, rightY + 282, 236, 56, "+ ADD BOT", () => Net.send("addBot"), 0x315011);
      addButton(this, rightX + rightW / 2, rightY + 354, 266, 56, "REMOVE SELECTED", () => {
        if (this.selectedId) Net.send("removePlayer", this.selectedId);
      }, this.selectedId ? 0x792323 : 0x4d2b2b);
      addButton(this, rightX + rightW / 2, rightY + 438, 286, 70, "START TOURNAMENT", () => Net.send("startTournament"), 0x0b5d33);

      this.add.text(rightX + rightW / 2, rightY + 506, "The lobby adapts for 2, 4, 8, 16, or 32 players. Jersey numbers are shown inside each country circle.", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: rightW - 40 }
      }).setOrigin(0.5, 0);
    } else {
      this.add.text(rightX + rightW / 2, rightY + 210, "Waiting for the host to start the tournament.", {
        fontFamily: "Arial",
        fontSize: "27px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center",
        wordWrap: { width: rightW - 50 }
      }).setOrigin(0.5);

      this.add.text(rightX + rightW / 2, rightY + 310, "Check your footballer, warm up your tackling legs, and prepare for dramatic penalty chaos.", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: rightW - 60 },
        lineSpacing: 8
      }).setOrigin(0.5);
    }

    this.add.text(W / 2, 694, state.message, {
      fontFamily: "Arial",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 1160 }
    }).setOrigin(0.5);
  }

  private drawPanel(x: number, y: number, w: number, h: number) {
    this.add.rectangle(x, y, w, h, 0x05170d, 0.72)
      .setOrigin(0)
      .setStrokeStyle(3, 0xffffff, 0.45);
    this.add.rectangle(x + 8, y + 8, w - 16, h - 16, 0x000000, 0.05)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.16);
  }

  private drawStatPill(x: number, y: number, w: number, h: number, label: string, fill: number) {
    this.add.rectangle(x, y, w, h, fill, 0.92)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.35);
    this.add.text(x, y, label, {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
  }

  private drawPlayerGrid(state: PublicState, isHost: boolean, x0: number, y0: number, areaW: number, areaH: number) {
    const totalSlots = Math.max(state.tournamentSize, state.players.length);
    const layout = this.getGridLayout(totalSlots, areaW, areaH);
    const ordered = [...state.players].sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.name.localeCompare(b.name));

    for (let i = 0; i < totalSlots; i++) {
      const p = ordered[i];
      const col = Math.floor(i / layout.rows);
      const row = i % layout.rows;
      const x = x0 + col * (layout.cardW + layout.gapX);
      const y = y0 + row * (layout.cardH + layout.gapY);
      this.drawPlayerCard(state, p, x, y, layout.cardW, layout.cardH, isHost);
    }
  }

  private getGridLayout(totalSlots: number, areaW: number, areaH: number): GridLayout {
    const cols = totalSlots <= 2 ? 1 : totalSlots <= 16 ? 2 : 4;
    const rows = Math.ceil(totalSlots / cols);
    const gapX = totalSlots <= 16 ? 12 : 8;
    const gapY = totalSlots <= 8 ? 12 : 8;
    const cardW = Math.floor((areaW - (cols - 1) * gapX) / cols);
    const cardH = Math.floor((areaH - (rows - 1) * gapY) / rows);
    return { cols, rows, cardW, cardH, gapX, gapY };
  }

  private drawPlayerCard(state: PublicState, p: PlayerRecord | undefined, x: number, y: number, cardW: number, cardH: number, isHost: boolean) {
    if (!p) {
      this.add.rectangle(x, y, cardW, cardH, 0x06150c, 0.58)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.22);
      this.add.text(x + 12, y + cardH / 2, "Empty bot spot", {
        fontFamily: "Arial",
        fontSize: `${Math.min(18, Math.max(13, Math.floor(cardH * 0.32)))}px`,
        fontStyle: "bold",
        color: "#a7b7aa"
      }).setOrigin(0, 0.5);
      return;
    }

    if (p.characterIndex < 0) {
      const bg = this.add.rectangle(x, y, cardW, cardH, 0x3b3320, 0.82)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffd21f, 0.55);
      this.add.text(x + 18, y + cardH / 2 - 9, p.name, {
        fontFamily: "Arial", fontSize: "16px", fontStyle: "900", color: "#ffffff",
        stroke: "#000000", strokeThickness: 3
      }).setOrigin(0, 0.5);
      this.add.text(x + 18, y + cardH / 2 + 13, "Choosing a player...", {
        fontFamily: "Arial", fontSize: "13px", fontStyle: "bold", color: "#fff2a6"
      }).setOrigin(0, 0.5);
      if (isHost && p.id !== state.hostId) {
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerdown", () => { this.selectedId = p.id; this.render(state); });
      }
      return;
    }

    const ch = CHARACTERS[p.characterIndex] ?? CHARACTERS[0];
    const selected = p.id === this.selectedId;
    const primary = Phaser.Display.Color.HexStringToColor(ch.primary).color;
    const secondary = Phaser.Display.Color.HexStringToColor(ch.secondary).color;
    const fill = selected ? 0xffd21f : p.isBot ? 0x0f361c : 0x0c2846;
    const border = selected ? 0x000000 : p.isBot ? 0x80d48e : 0x8fc8ff;
    const textColor = selected ? "#07170c" : "#ffffff";
    const mutedColor = selected ? "#07170c" : "#d9f3df";

    const bg = this.add.rectangle(x, y, cardW, cardH, fill, selected ? 0.96 : 0.78)
      .setOrigin(0)
      .setStrokeStyle(2, border, selected ? 0.92 : 0.48);
    bg.setInteractive({ useHandCursor: Boolean(isHost) });
    bg.on("pointerdown", () => {
      if (!isHost) return;
      this.selectedId = p.id;
      this.render(state);
    });

    // Colour-coded side stripe: blue for humans, green for bots.
    this.add.rectangle(x + 3, y + 3, 5, cardH - 6, p.isBot ? 0x4bd46e : 0x58b7ff, 0.95).setOrigin(0);

    const circleRadius = Math.max(15, Math.min(22, cardH * 0.32));
    const circleX = x + 18 + circleRadius;
    const circleY = y + cardH / 2;
    this.add.circle(circleX, circleY, circleRadius, primary, 1).setStrokeStyle(3, secondary, 1);
    this.fitText(String(ch.number), circleX, circleY + 1, circleRadius * 1.45, Math.floor(circleRadius * 1.06), 10, {
      fontFamily: "Arial",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    const textX = x + 38 + circleRadius * 2;
    const rightPad = isHost && p.id !== state.hostId ? 20 : 8;
    const textW = Math.max(80, cardW - (textX - x) - rightPad);
    const compact = cardH < 54;
    const isHuman = !p.isBot;

    if (isHuman) {
      const nameY = y + (compact ? 7 : 8);
      const characterY = y + (compact ? cardH / 2 + 1 : cardH / 2 - 1);
      const countryY = y + cardH - (compact ? 8 : 9);
      this.fitText(p.name, textX, nameY, textW, compact ? 13 : 16, 10, {
        fontFamily: "Arial",
        fontStyle: "900",
        color: textColor,
        stroke: "#000000",
        strokeThickness: selected ? 0 : 2
      }).setOrigin(0, 0);
      this.fitText(ch.name, textX, characterY, textW, compact ? 11 : 13, 9, {
        fontFamily: "Arial",
        fontStyle: "bold",
        color: textColor
      }).setOrigin(0, 0.5);
      this.fitText(ch.country, textX, countryY, textW, compact ? 10 : 12, 8, {
        fontFamily: "Arial",
        fontStyle: "bold",
        color: mutedColor
      }).setOrigin(0, 1);
    } else {
      const nameY = y + (compact ? 9 : 11);
      const countryY = y + cardH - (compact ? 9 : 11);
      this.fitText(ch.name, textX, nameY, textW, compact ? 13 : 17, 9, {
        fontFamily: "Arial",
        fontStyle: "900",
        color: textColor,
        stroke: "#000000",
        strokeThickness: selected ? 0 : 2
      }).setOrigin(0, 0);
      this.fitText(ch.country, textX, countryY, textW, compact ? 10 : 12, 8, {
        fontFamily: "Arial",
        fontStyle: "bold",
        color: mutedColor
      }).setOrigin(0, 1);
    }

    if (isHost && p.id !== state.hostId) {
      this.add.text(x + cardW - 11, y + cardH / 2, "×", {
        fontFamily: "Arial",
        fontSize: compact ? "16px" : "19px",
        fontStyle: "900",
        color: selected ? "#07170c" : "#ffb4b4",
        stroke: "#000000",
        strokeThickness: selected ? 0 : 2
      }).setOrigin(0.5);
    }
  }

  private fitText(text: string, x: number, y: number, maxWidth: number, startSize: number, minSize: number, style: Phaser.Types.GameObjects.Text.TextStyle) {
    const label = this.add.text(x, y, text, {
      ...style,
      fontSize: `${startSize}px`
    });
    let size = startSize;
    while (label.width > maxWidth && size > minSize) {
      size -= 1;
      label.setFontSize(size);
    }
    return label;
  }
}
