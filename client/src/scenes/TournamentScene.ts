import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import { Net } from "../net/Net";
import { preloadAudio, playMusic } from "../audio/audio";
import type { BracketMatch, PlayerRecord, PublicState } from "../types";
import { addButton, addTopBar, H, W } from "../ui/ui";
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

export class TournamentScene extends Phaser.Scene {
  private unsub?: () => void;

  constructor() {
    super("TournamentScene");
  }

  preload() {
    this.load.image("lobbyBg", "assets/backgrounds/lobbyBg.jpg");
    preloadAudio(this);
  }

  create() {
    playMusic(this, "results");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());
    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("TournamentScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("TournamentScene")) this.render(state);
    });
  }

  shutdown() {
    this.unsub?.();
  }

  private render(state: PublicState) {
    [...this.children.list].forEach((child) => child.destroy());
    this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.44).setOrigin(0.5);

    const isRoundResults = state.phase === "roundResults";
    const isRoundLive = state.phase === "roundLive";
    
    addTopBar(this, state, isRoundResults ? `Round ${state.roundNumber} complete • winners are highlighted` : isRoundLive ? `Round ${state.roundNumber} is live • human matches are playing simultaneously` : `Tournament bracket • Round ${state.roundNumber}`);

    const isHost = Net.sessionId === state.hostId;
    const total = Math.max(2, state.tournamentSize);
    const panelX = 24;
    const panelY = 104;
    const panelW = 1232;
    const panelH = 552;

    this.drawPanel(panelX, panelY, panelW, panelH, 0.80);

    this.add.text(panelX + 22, panelY + 27, isRoundResults ? `ROUND ${state.roundNumber} RESULTS` : "TOURNAMENT BRACKET", {
      fontFamily: "Arial",
      fontSize: "30px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0, 0.5);

    this.add.text(W / 2, panelY + 30, `${total} players • ${Math.log2(total)} rounds`, {
      fontFamily: "Arial",
      fontSize: "20px",
      fontStyle: "900",
      color: "#dff7e5",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5);

    if (isRoundLive) {
      const roundMatches = state.bracket.filter((m) => m.round === state.roundNumber);
      const complete = roundMatches.filter((m) => m.status === "done").length;
      this.add.text(panelX + panelW - 158, panelY + 24, "MATCHES LIVE", {
        fontFamily: "Arial", fontSize: "18px", fontStyle: "900", color: "#fff2a6", stroke: "#000000", strokeThickness: 4
      }).setOrigin(0.5);
      this.add.text(panelX + panelW - 158, panelY + 48, `${complete} of ${roundMatches.length} complete`, {
        fontFamily: "Arial", fontSize: "15px", fontStyle: "bold", color: "#dff7e5", stroke: "#000000", strokeThickness: 3
      }).setOrigin(0.5);
    } else if (isHost) {
      const buttonLabel = isRoundResults ? "START NEXT ROUND" : `BEGIN ROUND ${state.roundNumber}`;
      const buttonType = isRoundResults ? "nextRound" : "beginRound";
      const buttonW = isRoundResults ? 286 : 268;
      const buttonX = panelX + panelW - 158;
      addButton(this, buttonX, panelY + 34, buttonW, 48, buttonLabel, () => Net.send(buttonType), isRoundResults ? 0x115b96 : 0x0b5d33);
    } else {
      this.add.text(panelX + panelW - 146, panelY + 34, isRoundResults ? "Host starts next round" : "Waiting for host", {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "900",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5);
    }

    const bracketX = panelX + 26;
    const bracketY = panelY + 72;
    const bracketW = panelW - 52;
    const bracketH = panelH - 92;
    const showFocusedCurrentRound = !isRoundResults && state.roundNumber > 1 && total > 2;
    const showFocusedRoundResults = isRoundResults && state.roundNumber > 1 && total > 2;

    if (showFocusedRoundResults) {
      this.drawFocusedRoundResults(state, bracketX, bracketY, bracketW, bracketH, total);
    } else if (showFocusedCurrentRound) {
      this.drawFocusedCurrentRound(state, bracketX, bracketY, bracketW, bracketH, total);
    } else if (total === 2) {
      this.drawTwoPlayerFinal(state, bracketX, bracketY, bracketW, bracketH);
    } else {
      this.drawSplitBracket(state, bracketX, bracketY, bracketW, bracketH, total);
    }

    const footer = showFocusedRoundResults
      ? `Only Round ${state.roundNumber} results are shown here. Earlier scores are hidden so the current winners stay readable.`
      : isRoundResults
        ? "Round complete. Winners are highlighted in gold. Host can build the next round when ready."
        : isRoundLive
          ? `${state.message} Tap any glowing LIVE match card to watch it. You can return to the bracket at any time.`
          : (showFocusedCurrentRound ? "Only the upcoming round matchups are shown here so the next games are easy to read." : state.message);
    this.add.text(W / 2, 690, footer, {
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

  private drawTwoPlayerFinal(state: PublicState, x: number, y: number, w: number, h: number) {
    const match = state.bracket.find((m) => m.round === 1 && m.matchNo === 1);
    this.add.text(W / 2, y + 24, "FINAL", {
      fontFamily: "Arial",
      fontSize: "38px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.drawMatchCard(state, match, 1, 1, x + w / 2 - 370, y + h / 2 - 105, 740, 210, "FINAL", true, 22);
  }

  private drawSplitBracket(state: PublicState, x: number, y: number, w: number, h: number, total: number) {
    const sideRounds = Math.log2(total) - 1;
    const finalRound = Math.log2(total);
    const firstRoundMatchesPerSide = total / 4;

    const widths = this.sideWidths(total);
    const gapX = total >= 32 ? 10 : total >= 16 ? 14 : 22;
    const centerX = x + w / 2;
    const finalW = total >= 32 ? 124 : total >= 16 ? 150 : 180;
    const finalH = total >= 32 ? 86 : total >= 16 ? 100 : 116;
    const finalBox: Box = {
      x: centerX - finalW / 2,
      y: y + h / 2 - finalH / 2,
      w: finalW,
      h: finalH,
      centerX,
      centerY: y + h / 2
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

      leftBoxes[r] = centers.map((cy) => ({ x: leftX, y: cy - cardH / 2, w: cardW, h: cardH, centerX: leftX + cardW / 2, centerY: cy }));
      rightBoxes[r] = centers.map((cy) => ({ x: rightX, y: cy - cardH / 2, w: cardW, h: cardH, centerX: rightX + cardW / 2, centerY: cy }));
    }

    const g = this.add.graphics();
    g.lineStyle(3, 0xffffff, 0.45);
    this.drawConnectors(g, leftBoxes, finalBox, "left");
    this.drawConnectors(g, rightBoxes, finalBox, "right");

    for (let r = 0; r < sideRounds; r++) {
      const actualRound = r + 1;
      const matchesPerSide = firstRoundMatchesPerSide / Math.pow(2, r);
      const totalMatchesThisRound = matchesPerSide * 2;

      for (let i = 0; i < matchesPerSide; i++) {
        const leftMatchNo = i + 1;
        const rightMatchNo = i + 1 + matchesPerSide;
        const leftMatch = state.bracket.find((m) => m.round === actualRound && m.matchNo === leftMatchNo);
        const rightMatch = state.bracket.find((m) => m.round === actualRound && m.matchNo === rightMatchNo);

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
          this.fontBase(total, r)
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
          this.fontBase(total, r)
        );
      }
    }

    const finalMatch = state.bracket.find((m) => m.round === finalRound && m.matchNo === 1);
    this.drawMatchCard(state, finalMatch, finalRound, 1, finalBox.x, finalBox.y, finalBox.w, finalBox.h, "FINAL", false, total >= 32 ? 10 : 13);
  }

  private drawConnectors(g: Phaser.GameObjects.Graphics, boxes: Box[][], finalBox: Box, side: Side) {
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
      const finalY = side === "left" ? finalBox.y + finalBox.h * 0.36 : finalBox.y + finalBox.h * 0.64;

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
    baseFont: number
  ) {
    const active = match?.status === "playing";
    const done = match?.status === "done";
    const fill = active ? 0x1c4e30 : done ? 0x11341d : 0x06150c;
    const border = active ? 0xfff2a6 : done ? 0x85d98c : 0xffffff;

    this.add.rectangle(x, y, w, h, fill, done ? 0.92 : 0.84)
      .setOrigin(0)
      .setStrokeStyle(2, border, active ? 0.95 : 0.44);

    const headerH = Math.max(13, Math.min(18, Math.floor(h * 0.32)));
    const titleSize = Math.max(8, Math.min(14, baseFont));
    this.add.rectangle(x + 3, y + 3, w - 6, headerH, 0x000000, 0.34).setOrigin(0);
    this.fitText(title, x + 7, y + 4 + headerH / 2, w - 14, titleSize, 7, {
      fontFamily: "Arial",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0, 0.5);

    const scoreW = Math.max(20, Math.min(34, w * 0.15));
    const rowsTop = y + headerH + 5;
    const availableRowsH = Math.max(24, h - headerH - 7);
    const rowH = availableRowsH / 2;
    const row1Y = rowsTop;
    const row2Y = rowsTop + rowH;
    const textX = x + 7;
    const textW = w - scoreW - 16;

    if (!match) {
      const p1 = this.placeholder(round, matchNo, 1);
      const p2 = this.placeholder(round, matchNo, 2);
      this.drawPlayerRow(p1, textX, row1Y, textW, rowH, baseFont, false, false, false);
      this.drawPlayerRow(p2, textX, row2Y, textW, rowH, baseFont, false, false, false);
      this.scoreBox(x + w - scoreW - 5, row1Y + rowH / 2, scoreW, "-");
      this.scoreBox(x + w - scoreW - 5, row2Y + rowH / 2, scoreW, "-");
      return;
    }

    const p1 = this.player(state, match.p1);
    const p2 = this.player(state, match.p2);
    const p1Winner = match.winnerId === match.p1;
    const p2Winner = match.winnerId === match.p2;
    const p1Self = p1?.id === Net.sessionId;
    const p2Self = p2?.id === Net.sessionId;

    if (p1Self || p2Self) {
      this.add.rectangle(x - 3, y - 3, w + 6, h + 6, 0x000000, 0)
        .setOrigin(0)
        .setStrokeStyle(4, 0x4ed7ff, 0.92);
    }

    this.drawPlayerRow(this.playerLine(p1, showFullPlayerDetail), textX, row1Y, textW, rowH, baseFont, p1Winner, Boolean(p1?.isBot), p1Self);
    this.drawPlayerRow(this.playerLine(p2, showFullPlayerDetail), textX, row2Y, textW, rowH, baseFont, p2Winner, Boolean(p2?.isBot), p2Self);

    this.scoreBox(x + w - scoreW - 5, row1Y + rowH / 2, scoreW, this.scoreText(match, true));
    this.scoreBox(x + w - scoreW - 5, row2Y + rowH / 2, scoreW, this.scoreText(match, false));

    if (active && state.liveMatchIds.includes(match.id)) {
      const hit = this.add.rectangle(x, y, w, h, 0x000000, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => Net.send("watchMatch", match.id));
      this.add.text(x + w / 2, y + h - 5, "● LIVE • TAP TO WATCH", {
        fontFamily: "Arial",
        fontSize: `${Math.max(8, Math.min(13, baseFont))}px`,
        fontStyle: "900",
        color: "#7dff9b",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5, 1);
    }
  }

  private drawPlayerRow(label: string, x: number, y: number, w: number, h: number, baseFont: number, winner: boolean, isBot: boolean, isSelf: boolean) {
    const fill = isSelf ? 0x1a73b8 : winner ? 0x6e5500 : isBot ? 0x0a3b1b : 0x0a2948;
    const alpha = isSelf ? 0.86 : winner ? 0.50 : 0.34;
    const border = isSelf ? 0x4ed7ff : winner ? 0xfff2a6 : 0xffffff;

    this.add.rectangle(x - 3, y + 1, w + 4, Math.max(10, h - 3), fill, alpha)
      .setOrigin(0)
      .setStrokeStyle(isSelf ? 2 : 0, border, isSelf ? 0.95 : 0);

    const display = isSelf ? `★ ${label}` : label;
    this.fitText(display, x, y + h / 2, w, Math.max(7, baseFont), 6, {
      fontFamily: "Arial",
      fontStyle: isSelf || winner ? "900" : "bold",
      color: winner ? "#fff2a6" : "#ffffff",
      stroke: "#000000",
      strokeThickness: isSelf ? 3 : 2
    }).setOrigin(0, 0.5);
  }


  private drawFocusedRoundResults(state: PublicState, x: number, y: number, w: number, h: number, total: number) {
    const completedRound = state.roundNumber;
    const currentMatches = state.bracket
      .filter((m) => m.round === completedRound)
      .sort((a, b) => a.matchNo - b.matchNo);
    const finalRound = Math.log2(total);
    const nextStage = completedRound >= finalRound - 1
      ? "final"
      : completedRound === finalRound - 2
        ? "semi finals"
        : completedRound === finalRound - 3
          ? "quarter finals"
          : `round ${completedRound + 1}`;

    this.add.text(W / 2, y + 18, `${this.stageLabel(total, completedRound).toUpperCase()} RESULTS ONLY`, {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "900",
      color: "#dff7e5",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5);

    this.add.text(W / 2, y + 47, `Earlier rounds are hidden. Gold players advance to the ${nextStage}.`, {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    if (currentMatches.length === 0) {
      this.add.text(W / 2, y + h / 2, "Waiting for round results...", {
        fontFamily: "Arial",
        fontSize: "24px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5);
      return;
    }

    const contentY = y + 76;
    const contentH = h - 82;
    const matchCount = currentMatches.length;
    const cols = matchCount <= 1 ? 1 : matchCount <= 2 ? 2 : 2;
    const rows = Math.ceil(matchCount / cols);
    const gapX = matchCount <= 2 ? 54 : 36;
    const gapY = rows >= 4 ? 14 : rows === 3 ? 18 : 24;
    const cardW = Math.min(matchCount <= 1 ? 690 : 548, (w - gapX * (cols - 1)) / cols);
    const cardH = Math.min(matchCount >= 8 ? 84 : matchCount >= 4 ? 118 : 168, (contentH - gapY * (rows - 1)) / rows);
    const gridW = cols * cardW + gapX * (cols - 1);
    const gridH = rows * cardH + gapY * (rows - 1);
    const startX = x + (w - gridW) / 2;
    const startY = contentY + Math.max(0, (contentH - gridH) / 2);
    const baseFont = matchCount >= 8 ? 14 : matchCount >= 4 ? 17 : 20;

    const winnerNames: string[] = [];

    currentMatches.forEach((match, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardX = startX + col * (cardW + gapX);
      const cardY = startY + row * (cardH + gapY);
      this.drawMatchCard(state, match, completedRound, match.matchNo, cardX, cardY, cardW, cardH, this.matchTitle(total, completedRound, match.matchNo), true, baseFont);

      const winner = this.player(state, match.winnerId ?? "");
      if (winner) {
        const ch = CHARACTERS[winner.characterIndex];
        winnerNames.push(winner.isBot ? ch.name : winner.name);
      }
    });

    const winnerText = winnerNames.length
      ? `Advancing: ${winnerNames.slice(0, 8).join(" • ")}${winnerNames.length > 8 ? " • ..." : ""}`
      : "Winners will appear in gold when the round is locked in.";
    this.add.text(W / 2, y + h - 15, winnerText, {
      fontFamily: "Arial",
      fontSize: winnerNames.length > 6 ? "13px" : "15px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: w - 60 }
    }).setOrigin(0.5);
  }


  private drawFocusedCurrentRound(state: PublicState, x: number, y: number, w: number, h: number, total: number) {
    const currentRound = state.roundNumber;
    const currentMatches = state.bracket
      .filter((m) => m.round === currentRound)
      .sort((a, b) => a.matchNo - b.matchNo);
    const finalRound = Math.log2(total);

    const heading = currentRound === finalRound
      ? "FINAL MATCHUP"
      : currentRound === finalRound - 1
        ? "SEMI FINAL MATCHUPS"
        : currentRound === finalRound - 2
          ? "QUARTER FINAL MATCHUPS"
          : `ROUND ${currentRound} MATCHUPS`;

    this.add.text(W / 2, y + 18, heading, {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "900",
      color: "#dff7e5",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2, y + 46, "Previous-round results are hidden here so the next pairings stay clean and readable.", {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    const contentY = y + 74;
    const contentH = h - 74;

    if (currentMatches.length <= 1) {
      const match = currentMatches[0];
      this.drawMatchCard(state, match, currentRound, 1, x + w / 2 - 250, contentY + contentH / 2 - 86, 500, 172, this.matchTitle(total, currentRound, 1), true, 20);
      return;
    }

    if (currentMatches.length === 2) {
      const leftW = 356;
      const cardH = 184;
      const gap = 58;
      const leftX = x + 42;
      const rightX = x + w - leftW - 42;
      const cardY = contentY + contentH / 2 - cardH / 2;
      this.drawMatchCard(state, currentMatches[0], currentRound, currentMatches[0].matchNo, leftX, cardY, leftW, cardH, this.matchTitle(total, currentRound, currentMatches[0].matchNo), true, 18);
      this.drawMatchCard(state, currentMatches[1], currentRound, currentMatches[1].matchNo, rightX, cardY, leftW, cardH, this.matchTitle(total, currentRound, currentMatches[1].matchNo), true, 18);

      const centerW = 232;
      const centerH = 126;
      const centerX = x + w / 2 - centerW / 2;
      const centerY = contentY + contentH / 2 - centerH / 2;
      this.drawMatchCard(state, undefined, currentRound + 1, 1, centerX, centerY, centerW, centerH, currentRound === finalRound - 1 ? "FINAL" : "NEXT ROUND", false, 14);

      const g = this.add.graphics();
      g.lineStyle(3, 0xffffff, 0.38);
      const leftMidX = leftX + leftW + 16;
      const rightMidX = rightX - 16;
      const centerLeft = centerX;
      const centerRight = centerX + centerW;
      const yA = cardY + cardH / 2;
      const yB = yA;
      const targetYTop = centerY + centerH * 0.35;
      const targetYBot = centerY + centerH * 0.65;
      g.lineBetween(leftX + leftW, yA, leftMidX, yA);
      g.lineBetween(leftMidX, yA, leftMidX, targetYTop);
      g.lineBetween(leftMidX, targetYTop, centerLeft, targetYTop);
      g.lineBetween(rightX, yB, rightMidX, yB);
      g.lineBetween(rightMidX, yB, rightMidX, targetYBot);
      g.lineBetween(rightMidX, targetYBot, centerRight, targetYBot);
      return;
    }

    // Fallback for larger rounds: clean 2-column grid of current matchups only.
    const cols = 2;
    const rows = Math.ceil(currentMatches.length / cols);
    const gapX = 34;
    const gapY = 22;
    const cardW = (w - gapX * (cols - 1)) / cols;
    const cardH = Math.min(144, (contentH - gapY * (rows - 1)) / rows);
    currentMatches.forEach((match, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardX = x + col * (cardW + gapX);
      const cardY = contentY + row * (cardH + gapY);
      this.drawMatchCard(state, match, currentRound, match.matchNo, cardX, cardY, cardW, cardH, this.matchTitle(total, currentRound, match.matchNo), true, 16);
    });
  }

  private stageLabel(total: number, round: number): string {
    const finalRound = Math.log2(total);
    if (round === finalRound) return "FINAL";
    if (round === finalRound - 1) return "SEMI FINAL";
    if (round === finalRound - 2) return "QUARTER FINAL";
    return `ROUND ${round}`;
  }

  private sideWidths(total: number): number[] {
    // Prioritise the first-round name columns. Later rounds mostly show short winner placeholders.
    if (total >= 32) return [270, 86, 62, 48];
    if (total === 16) return [330, 116, 68];
    if (total === 8) return [380, 124];
    return [450];
  }

  private sumWidths(widths: number[], count: number, gap: number): number {
    if (count <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) sum += widths[i] + (i > 0 ? gap : 0);
    return sum;
  }

  private cardHeight(total: number, matches: number, areaH: number, roundIndex: number): number {
    const gapY = matches >= 8 ? 6 : matches >= 4 ? 14 : 30;
    const raw = Math.floor((areaH - gapY * (matches - 1)) / matches);
    const max = total >= 32 ? (roundIndex === 0 ? 50 : 110) : total === 16 ? 78 : 124;
    return Math.min(max, raw);
  }

  private verticalCenters(y: number, h: number, count: number, cardH: number): number[] {
    if (count === 1) return [y + h / 2];
    const gap = (h - count * cardH) / (count + 1);
    const centers: number[] = [];
    for (let i = 0; i < count; i++) {
      centers.push(y + gap * (i + 1) + cardH * i + cardH / 2);
    }
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
    if (total === 16) return roundIndex === 0 ? 11 : 10;
    if (total === 8) return 14;
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
    return full ? `${p.name} • ${ch.name} • ${ch.country}` : `${p.name} • ${ch.country}`;
  }

  private scoreText(match: BracketMatch, p1: boolean): string {
    if (match.status === "pending") return "-";
    const normal = p1 ? match.p1Score : match.p2Score;
    const pens = p1 ? match.p1Shootout : match.p2Shootout;
    return String(normal + pens);
  }

  private scoreBox(x: number, y: number, w: number, label: string) {
    this.add.rectangle(x, y, w, 18, 0x000000, 0.58)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.45);
    this.add.text(x + w / 2, y, label, {
      fontFamily: "Arial",
      fontSize: label.length > 2 ? "9px" : "12px",
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
  }

  private drawPanel(x: number, y: number, w: number, h: number, alpha: number) {
    this.add.rectangle(x, y, w, h, 0x05170d, alpha)
      .setOrigin(0)
      .setStrokeStyle(3, 0xffffff, 0.45);
    this.add.rectangle(x + 8, y + 8, w - 16, h - 16, 0x000000, 0.05)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.16);
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
