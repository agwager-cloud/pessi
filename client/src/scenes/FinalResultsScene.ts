import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import { Net } from "../net/Net";
import { playWinnerAnnouncement, preloadAudio, playMusic } from "../audio/audio";
import type { BracketMatch, PlayerRecord, PublicState } from "../types";
import {
  addButton,
  addTopBar,
  drawFootballer,
  getPlayer,
  H,
  W,
} from "../ui/ui";
import { routeScene } from "../ui/routing";

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
};

type Side = "left" | "right";

export class FinalResultsScene extends Phaser.Scene {
  private unsub?: () => void;
  private announcedWinnerId: string | null = null;

  constructor() {
    super("FinalResultsScene");
  }

  preload() {
    this.load.image("lobbyBg", "assets/backgrounds/lobbyBg.jpg");
    preloadAudio(this);
  }

  create() {
    this.announcedWinnerId = null;
    playMusic(this, "results");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());
    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("FinalResultsScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("FinalResultsScene")) this.render(state);
    });
  }

  shutdown() {
    this.unsub?.();
  }

  private render(state: PublicState) {
    [...this.children.list].forEach((child) => child.destroy());
    this.drawBackground();
    addTopBar(this, state, "Tournament complete • final bracket and scores");

    const final = [...state.bracket].reverse().find((m) => m.winnerId);
    const champ = getPlayer(state, final?.winnerId ?? null);
    this.playChampionAudioOnce(champ);

    this.add
      .text(W / 2, 82, "Pessi's Pens Champion", {
        fontFamily: "Arial",
        fontSize: "42px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#073b17",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5);

    this.drawChampionCard(state, champ);

    const panelX = 24;
    const panelY = 190;
    const panelW = 1232;
    const panelH = 438;
    this.drawPanel(panelX, panelY, panelW, panelH, 0.72, 0xffffff, 0.36);

    this.add
      .text(panelX + 24, panelY + 28, "COMPLETED TOURNAMENT BRACKET", {
        fontFamily: "Arial",
        fontSize: "24px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        panelX + panelW - 24,
        panelY + 28,
        `${state.tournamentSize} players • all scores locked in`,
        {
          fontFamily: "Arial",
          fontSize: "18px",
          fontStyle: "900",
          color: "#dff7e5",
          stroke: "#000000",
          strokeThickness: 3,
        },
      )
      .setOrigin(1, 0.5);

    const bracketX = panelX + 24;
    const bracketY = panelY + 64;
    const bracketW = panelW - 48;
    const bracketH = panelH - 86;
    const total = Math.max(2, state.tournamentSize || 2);

    if (total === 2) {
      this.drawTwoPlayerFinal(state, bracketX, bracketY, bracketW, bracketH);
    } else {
      this.drawSplitBracket(
        state,
        bracketX,
        bracketY,
        bracketW,
        bracketH,
        total,
      );
    }

    this.add
      .text(
        W / 2,
        648,
        champ
          ? `${champ.name} wins the golden shin pad after a ridiculous penalty tournament.`
          : "Tournament complete.",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          align: "center",
          wordWrap: { width: 1120 },
        },
      )
      .setOrigin(0.5);

    if (Net.sessionId === state.hostId) {
      addButton(
        this,
        W / 2 - 310,
        692,
        250,
        46,
        "BACK TO LOBBY",
        () => Net.send("backToLobby"),
        0x143d2a,
      );
      addButton(
        this,
        W / 2,
        692,
        250,
        46,
        "CHANGE PLAYERS",
        () => Net.send("changePlayers"),
        0x8a5a00,
      );
      addButton(
        this,
        W / 2 + 310,
        692,
        250,
        46,
        "PLAY AGAIN",
        () => Net.send("playAgain"),
        0x0b5d33,
      );
    }
  }

  private playChampionAudioOnce(champ: PlayerRecord | null) {
    if (!champ || this.announcedWinnerId === champ.id) return;
    this.announcedWinnerId = champ.id;
    const characterName = CHARACTERS[champ.characterIndex]?.name ?? champ.name;
    // A human-played final arrives directly from the penalty music. Give the
    // corrected results crossfade a brief head start before ducking it for the
    // winner sequence. Bot-only finals already sit on the results track, but
    // use the same safe path for consistency.
    this.time.delayedCall(650, () => {
      if (!this.scene.isActive("FinalResultsScene")) return;
      playMusic(this, "results");
      void playWinnerAnnouncement(characterName);
    });
  }

  private drawBackground() {
    this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.52).setOrigin(0.5);
    const glow = this.add.graphics();
    glow.fillStyle(0xffd21f, 0.1);
    glow.fillEllipse(W / 2, 148, 920, 172);
    glow.fillStyle(0xffffff, 0.07);
    glow.fillEllipse(W / 2, 364, 1120, 440);
  }

  private drawChampionCard(state: PublicState, champ: PlayerRecord | null) {
    const cardW = 660;
    const cardH = 78;
    const cardX = W / 2;
    const cardY = 138;
    this.add
      .rectangle(cardX, cardY, cardW, cardH, 0x07170c, 0.88)
      .setStrokeStyle(5, 0xffd21f, 0.95);

    if (!champ) {
      this.add
        .text(cardX, cardY, "Champion pending", {
          fontFamily: "Arial",
          fontSize: "28px",
          fontStyle: "900",
          color: "#fff2a6",
          stroke: "#000000",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      return;
    }

    const ch = CHARACTERS[champ.characterIndex];
    this.add
      .text(cardX, cardY - 20, champ.name, {
        fontFamily: "Arial",
        fontSize: "30px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5);
    this.add
      .text(
        cardX,
        cardY + 22,
        `${ch.name} • ${ch.country} #${ch.number} • wins the golden shin pad!`,
        {
          fontFamily: "Arial",
          fontSize: "18px",
          fontStyle: "900",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          align: "center",
        },
      )
      .setOrigin(0.5);

    drawFootballer(this, 176, 144, champ, 0.58, false);
    drawFootballer(this, 1104, 144, champ, 0.58, false);
  }

  private drawTwoPlayerFinal(
    state: PublicState,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const match = state.bracket.find((m) => m.round === 1 && m.matchNo === 1);
    this.drawMatchCard(
      state,
      match,
      1,
      1,
      x + w / 2 - 380,
      y + h / 2 - 92,
      760,
      184,
      "FINAL",
      true,
      22,
      true,
    );
  }

  private drawSplitBracket(
    state: PublicState,
    x: number,
    y: number,
    w: number,
    h: number,
    total: number,
  ) {
    const sideRounds = Math.log2(total) - 1;
    const finalRound = Math.log2(total);
    const firstRoundMatchesPerSide = total / 4;

    const widths = this.sideWidths(total);
    const gapX = total >= 32 ? 7 : total >= 16 ? 12 : 20;
    const centerX = x + w / 2;
    const finalW = total >= 32 ? 132 : total >= 16 ? 168 : 198;
    const finalH = total >= 32 ? 92 : total >= 16 ? 104 : 122;
    const finalBox: Box = {
      x: centerX - finalW / 2,
      y: y + h / 2 - finalH / 2,
      w: finalW,
      h: finalH,
      centerX,
      centerY: y + h / 2,
    };

    const leftBoxes: Box[][] = [];
    const rightBoxes: Box[][] = [];

    for (let r = 0; r < sideRounds; r++) {
      const matches = firstRoundMatchesPerSide / Math.pow(2, r);
      const cardW = widths[r];
      const cardH = this.cardHeight(total, matches, h, r);
      const centers = this.verticalCenters(y, h, matches, cardH);

      const leftX = x + this.sumWidths(widths, r, gapX);
      const rightX = x + w - this.sumWidths(widths, r + 1, gapX) + gapX;

      leftBoxes[r] = centers.map((cy) => ({
        x: leftX,
        y: cy - cardH / 2,
        w: cardW,
        h: cardH,
        centerX: leftX + cardW / 2,
        centerY: cy,
      }));
      rightBoxes[r] = centers.map((cy) => ({
        x: rightX,
        y: cy - cardH / 2,
        w: cardW,
        h: cardH,
        centerX: rightX + cardW / 2,
        centerY: cy,
      }));
    }

    const g = this.add.graphics();
    g.lineStyle(3, 0xfff2a6, 0.42);
    this.drawConnectors(g, leftBoxes, finalBox, "left");
    this.drawConnectors(g, rightBoxes, finalBox, "right");

    for (let r = 0; r < sideRounds; r++) {
      const actualRound = r + 1;
      const matchesPerSide = firstRoundMatchesPerSide / Math.pow(2, r);
      for (let i = 0; i < matchesPerSide; i++) {
        const leftMatchNo = i + 1;
        const rightMatchNo = i + 1 + matchesPerSide;
        const leftMatch = state.bracket.find(
          (m) => m.round === actualRound && m.matchNo === leftMatchNo,
        );
        const rightMatch = state.bracket.find(
          (m) => m.round === actualRound && m.matchNo === rightMatchNo,
        );

        this.drawMatchCard(
          state,
          leftMatch,
          actualRound,
          leftMatchNo,
          leftBoxes[r][i].x,
          leftBoxes[r][i].y,
          leftBoxes[r][i].w,
          leftBoxes[r][i].h,
          this.matchTitle(total, actualRound, leftMatchNo),
          actualRound === 1,
          this.fontBase(total, r),
          false,
        );
        this.drawMatchCard(
          state,
          rightMatch,
          actualRound,
          rightMatchNo,
          rightBoxes[r][i].x,
          rightBoxes[r][i].y,
          rightBoxes[r][i].w,
          rightBoxes[r][i].h,
          this.matchTitle(total, actualRound, rightMatchNo),
          actualRound === 1,
          this.fontBase(total, r),
          false,
        );
      }
    }

    const finalMatch = state.bracket.find(
      (m) => m.round === finalRound && m.matchNo === 1,
    );
    this.drawMatchCard(
      state,
      finalMatch,
      finalRound,
      1,
      finalBox.x,
      finalBox.y,
      finalBox.w,
      finalBox.h,
      "FINAL",
      false,
      total >= 32 ? 10 : 13,
      true,
    );
  }

  private drawConnectors(
    g: Phaser.GameObjects.Graphics,
    boxes: Box[][],
    finalBox: Box,
    side: Side,
  ) {
    for (let r = 0; r < boxes.length - 1; r++) {
      const current = boxes[r];
      const next = boxes[r + 1];
      for (let i = 0; i < next.length; i++) {
        const a = current[i * 2];
        const b = current[i * 2 + 1];
        const target = next[i];
        if (!a || !b || !target) continue;

        const startX = side === "left" ? a.x + a.w : a.x;
        const targetX = side === "left" ? target.x : target.x + target.w;
        const midX = side === "left" ? startX + 10 : startX - 10;

        g.lineBetween(startX, a.centerY, midX, a.centerY);
        g.lineBetween(startX, b.centerY, midX, b.centerY);
        g.lineBetween(midX, a.centerY, midX, b.centerY);
        g.lineBetween(midX, target.centerY, targetX, target.centerY);
      }
    }

    const lastRound = boxes[boxes.length - 1];
    if (lastRound?.[0]) {
      const last = lastRound[0];
      const startX = side === "left" ? last.x + last.w : last.x;
      const finalX = side === "left" ? finalBox.x : finalBox.x + finalBox.w;
      const midX = side === "left" ? startX + 14 : startX - 14;
      const finalY =
        side === "left"
          ? finalBox.y + finalBox.h * 0.36
          : finalBox.y + finalBox.h * 0.64;

      g.lineBetween(startX, last.centerY, midX, last.centerY);
      g.lineBetween(midX, last.centerY, midX, finalY);
      g.lineBetween(midX, finalY, finalX, finalY);
    }
  }

  private drawMatchCard(
    state: PublicState,
    match: BracketMatch | undefined,
    round: number,
    matchNo: number,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    showFullPlayerDetail: boolean,
    baseFont: number,
    finalEmphasis: boolean,
  ) {
    const done = match?.status === "done" || Boolean(match?.winnerId);
    const isChampionMatch = finalEmphasis && done;
    const compactFirstRound = round === 1 && h <= 48;
    const fill = isChampionMatch ? 0x16381d : done ? 0x0d2b19 : 0x06150c;
    const border = isChampionMatch ? 0xffd21f : done ? 0x85d98c : 0xffffff;

    this.add
      .rectangle(x, y, w, h, fill, isChampionMatch ? 0.94 : 0.9)
      .setOrigin(0)
      .setStrokeStyle(
        isChampionMatch ? 3 : 2,
        border,
        isChampionMatch ? 0.95 : 0.58,
      );

    let rowsTop: number;
    let rowH: number;
    let textX: number;
    let textW: number;
    let scoreW: number;
    let scoreH: number;

    if (compactFirstRound) {
      const badgeW = 25;
      this.add
        .rectangle(x + 3, y + 3, badgeW, h - 6, 0x000000, 0.34)
        .setOrigin(0)
        .setStrokeStyle(1, 0xffffff, 0.12);
      this.fitText(`M${matchNo}`, x + 5, y + h / 2, badgeW - 4, 8, 6, {
        fontFamily: "Arial",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      scoreW = Math.max(26, Math.min(34, w * 0.13));
      scoreH = Math.max(13, Math.min(16, (h - 10) / 2));
      rowsTop = y + 4;
      rowH = (h - 8) / 2;
      textX = x + badgeW + 9;
      textW = w - badgeW - scoreW - 19;
    } else {
      const headerH = Math.max(14, Math.min(22, Math.floor(h * 0.27)));
      this.add
        .rectangle(x + 3, y + 3, w - 6, headerH, 0x000000, 0.38)
        .setOrigin(0);
      this.fitText(
        title,
        x + 7,
        y + 4 + headerH / 2,
        w - 14,
        Math.max(8, Math.min(15, baseFont)),
        7,
        {
          fontFamily: "Arial",
          fontStyle: "900",
          color: "#fff2a6",
          stroke: "#000000",
          strokeThickness: 2,
        },
      ).setOrigin(0, 0.5);

      scoreW = Math.max(22, Math.min(38, w * 0.16));
      scoreH = Math.max(15, Math.min(20, (h - headerH - 10) / 2));
      rowsTop = y + headerH + 5;
      rowH = Math.max(11, (h - headerH - 8) / 2);
      textX = x + 7;
      textW = w - scoreW - 17;
    }

    if (!match) {
      this.drawPlayerRow(
        this.placeholder(round, matchNo, 1),
        textX,
        rowsTop,
        textW,
        rowH,
        baseFont,
        false,
        false,
        false,
      );
      this.drawPlayerRow(
        this.placeholder(round, matchNo, 2),
        textX,
        rowsTop + rowH,
        textW,
        rowH,
        baseFont,
        false,
        false,
        false,
      );
      this.scoreBox(
        x + w - scoreW - 5,
        rowsTop + rowH / 2,
        scoreW,
        "-",
        scoreH,
      );
      this.scoreBox(
        x + w - scoreW - 5,
        rowsTop + rowH + rowH / 2,
        scoreW,
        "-",
        scoreH,
      );
      return;
    }

    const p1 = this.player(state, match.p1);
    const p2 = this.player(state, match.p2);
    const p1Winner = match.winnerId === match.p1;
    const p2Winner = match.winnerId === match.p2;
    const p1Self = p1?.id === Net.sessionId;
    const p2Self = p2?.id === Net.sessionId;

    this.drawPlayerRow(
      this.playerLine(p1, showFullPlayerDetail),
      textX,
      rowsTop,
      textW,
      rowH,
      baseFont,
      p1Winner,
      Boolean(p1?.isBot),
      p1Self,
    );
    this.drawPlayerRow(
      this.playerLine(p2, showFullPlayerDetail),
      textX,
      rowsTop + rowH,
      textW,
      rowH,
      baseFont,
      p2Winner,
      Boolean(p2?.isBot),
      p2Self,
    );
    this.scoreBox(
      x + w - scoreW - 5,
      rowsTop + rowH / 2,
      scoreW,
      this.scoreText(match, true),
      scoreH,
    );
    this.scoreBox(
      x + w - scoreW - 5,
      rowsTop + rowH + rowH / 2,
      scoreW,
      this.scoreText(match, false),
      scoreH,
    );
  }

  private drawPlayerRow(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    baseFont: number,
    winner: boolean,
    isBot: boolean,
    isSelf: boolean,
  ) {
    const fill = isSelf
      ? 0x1a73b8
      : winner
        ? 0x6e5500
        : isBot
          ? 0x0a3b1b
          : 0x0a2948;
    const alpha = isSelf ? 0.86 : winner ? 0.58 : 0.34;
    const border = isSelf ? 0x4ed7ff : winner ? 0xfff2a6 : 0xffffff;

    this.add
      .rectangle(x - 3, y + 1, w + 4, Math.max(10, h - 3), fill, alpha)
      .setOrigin(0)
      .setStrokeStyle(
        winner || isSelf ? 1 : 0,
        border,
        winner || isSelf ? 0.9 : 0,
      );

    const display = winner ? `✓ ${label}` : isSelf ? `★ ${label}` : label;
    this.fitText(display, x, y + h / 2, w, Math.max(7, baseFont), 6, {
      fontFamily: "Arial",
      fontStyle: winner || isSelf ? "900" : "bold",
      color: winner ? "#fff2a6" : "#ffffff",
      stroke: "#000000",
      strokeThickness: winner || isSelf ? 3 : 2,
    }).setOrigin(0, 0.5);
  }

  private sideWidths(total: number): number[] {
    if (total >= 32) return [272, 90, 70, 58];
    if (total === 16) return [312, 124, 78];
    if (total === 8) return [372, 138];
    return [450];
  }

  private sumWidths(widths: number[], count: number, gap: number): number {
    if (count <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) sum += widths[i] + (i > 0 ? gap : 0);
    return sum;
  }

  private cardHeight(
    total: number,
    matches: number,
    areaH: number,
    roundIndex: number,
  ): number {
    const gapY = matches >= 8 ? 5 : matches >= 4 ? 11 : 24;
    const raw = Math.floor((areaH - gapY * (matches - 1)) / matches);
    const max =
      total >= 32 ? (roundIndex === 0 ? 48 : 104) : total === 16 ? 74 : 116;
    const min = total >= 32 && roundIndex === 0 ? 38 : 36;
    return Math.max(min, Math.min(max, raw));
  }

  private verticalCenters(
    y: number,
    h: number,
    count: number,
    cardH: number,
  ): number[] {
    if (count === 1) return [y + h / 2];
    const gap = Math.max(3, (h - count * cardH) / (count + 1));
    const centers: number[] = [];
    for (let i = 0; i < count; i++)
      centers.push(y + gap * (i + 1) + cardH * i + cardH / 2);
    return centers;
  }

  private matchTitle(total: number, round: number, matchNo: number): string {
    const finalRound = Math.log2(total);
    if (round === finalRound) return "FINAL";
    if (round === finalRound - 1) return `SEMI ${matchNo}`;
    if (round === finalRound - 2) return `QF ${matchNo}`;
    if (round === 1) return `MATCH ${matchNo}`;
    return `R${round} M${matchNo}`;
  }

  private fontBase(total: number, roundIndex: number): number {
    if (total >= 32) return roundIndex === 0 ? 9 : 8;
    if (total === 16) return roundIndex === 0 ? 10 : 9;
    if (total === 8) return 13;
    return 16;
  }

  private placeholder(round: number, matchNo: number, slot: 1 | 2): string {
    if (round === 1) return "TBD";
    const source = (matchNo - 1) * 2 + slot;
    return `Winner R${round - 1} M${source}`;
  }

  private player(state: PublicState, id: string): PlayerRecord | null {
    return state.players.find((p) => p.id === id) ?? null;
  }

  private playerLine(p: PlayerRecord | null, full: boolean): string {
    if (!p) return "Mystery player";
    const ch = CHARACTERS[p.characterIndex];
    if (p.isBot) return `${ch.name} • ${ch.country}`;
    return full
      ? `${p.name} • ${ch.name} • ${ch.country}`
      : `${p.name} • ${ch.country}`;
  }

  private scoreText(match: BracketMatch, p1: boolean): string {
    if (match.status === "pending") return "-";
    const normal = p1 ? match.p1Score : match.p2Score;
    const pens = p1 ? match.p1Shootout : match.p2Shootout;
    return String(normal + pens);
  }

  private scoreBox(x: number, y: number, w: number, label: string, h = 18) {
    this.add
      .rectangle(x, y, w, h, 0x000000, 0.68)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.55);
    const fontSize = Math.max(9, Math.min(13, h - 3));
    this.add
      .text(x + w / 2, y, label, {
        fontFamily: "Arial",
        fontSize: `${label.length > 3 ? Math.max(8, fontSize - 2) : fontSize}px`,
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
  }

  private drawPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    alpha: number,
    border = 0xffffff,
    borderAlpha = 0.45,
  ) {
    this.add
      .rectangle(x, y, w, h, 0x05170d, alpha)
      .setOrigin(0)
      .setStrokeStyle(3, border, borderAlpha);
    this.add
      .rectangle(x + 8, y + 8, w - 16, h - 16, 0x000000, 0.08)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.13);
  }

  private fitText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    startSize: number,
    minSize: number,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    const label = this.add.text(x, y, text, {
      ...style,
      fontSize: `${startSize}px`,
    });

    let size = startSize;
    while (label.width > maxWidth && size > minSize) {
      size -= 1;
      label.setFontSize(size);
    }

    if (label.width > maxWidth) {
      let trimmed = text;
      while (trimmed.length > 2 && label.width > maxWidth) {
        trimmed = trimmed.slice(0, -2);
        label.setText(`${trimmed}…`);
      }
    }

    return label;
  }
}
