import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import type { BracketMatch, PlayerRecord, PublicState } from "../types";
import { isSoundMuted, toggleSound } from "../audio/audio";

export const W = 1280;
export const H = 720;

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  fill = 0x143d2a
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, fill, 0.96).setStrokeStyle(3, 0xffffff, 0.75).setOrigin(0.5);
  const text = scene.add.text(0, 0, label, {
    fontFamily: "Arial",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#ffffff",
    align: "center"
  }).setOrigin(0.5);
  c.add([bg, text]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => bg.setFillStyle(0x1d6b45));
  bg.on("pointerout", () => bg.setFillStyle(fill));
  bg.on("pointerdown", () => {
    scene.tweens.add({ targets: c, scale: 0.96, duration: 70, yoyo: true });
    onClick();
  });
  return c;
}

export function addSoundToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(10000);
  const bg = scene.add.rectangle(0, 0, 86, 38, 0x07170c, 0.92)
    .setStrokeStyle(2, 0xfff2a6, 0.85)
    .setOrigin(0.5);
  const label = scene.add.text(0, 0, isSoundMuted() ? "MUTED" : "SOUND", {
    fontFamily: "Arial",
    fontSize: "13px",
    fontStyle: "900",
    color: isSoundMuted() ? "#ffdddd" : "#fff2a6",
    stroke: "#000000",
    strokeThickness: 3,
    align: "center"
  }).setOrigin(0.5);

  c.add([bg, label]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => bg.setFillStyle(0x123b27, 0.98));
  bg.on("pointerout", () => bg.setFillStyle(0x07170c, 0.92));
  bg.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
    event?.stopPropagation();
    const nowMuted = toggleSound(scene);
    label.setText(nowMuted ? "MUTED" : "SOUND");
    label.setColor(nowMuted ? "#ffdddd" : "#fff2a6");
    scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
  });

  return c;
}

export function addTitle(scene: Phaser.Scene, text: string, y = 42, size = 48) {
  scene.add.text(W / 2 + 4, y + 4, text, {
    fontFamily: "Arial",
    fontSize: `${size}px`,
    fontStyle: "900",
    color: "#000000",
    align: "center"
  }).setOrigin(0.5).setAlpha(0.35);
  return scene.add.text(W / 2, y, text, {
    fontFamily: "Arial",
    fontSize: `${size}px`,
    fontStyle: "900",
    color: "#fff2a6",
    stroke: "#073b17",
    strokeThickness: 8,
    align: "center"
  }).setOrigin(0.5);
}

export function drawPitch(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x1b7b3a, 0x1b7b3a, 0x105b2c, 0x105b2c, 1);
  g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 120) {
    g.fillStyle(x % 240 === 0 ? 0x1f8d43 : 0x187537, 0.28);
    g.fillRect(x, 0, 120, H);
  }
  g.lineStyle(4, 0xffffff, 0.55);
  g.strokeRect(54, 80, W - 108, H - 132);
  g.lineBetween(W / 2, 80, W / 2, H - 52);
  g.strokeCircle(W / 2, 360, 88);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(W / 2, 360, 5);
  return g;
}

export function drawGoal(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x, y, w, h);
  g.lineStyle(6, 0xffffff, 1);
  g.strokeRect(x, y, w, h);
  g.lineStyle(2, 0xffffff, 0.24);
  for (let i = 1; i < 8; i++) g.lineBetween(x + (w / 8) * i, y, x + (w / 8) * i, y + h);
  for (let i = 1; i < 4; i++) g.lineBetween(x, y + (h / 4) * i, x + w, y + (h / 4) * i);
  return g;
}

export function getPlayer(state: PublicState | null, id: string | null | undefined): PlayerRecord | null {
  if (!state || !id) return null;
  return state.players.find((p) => p.id === id) ?? null;
}

export function playerLabel(state: PublicState | null, id: string | null | undefined): string {
  const p = getPlayer(state, id);
  if (!p) return "Mystery Player";
  const ch = CHARACTERS[p.characterIndex];
  return `${p.name} (${ch.country} #${ch.number})`;
}

function hexColor(value: string | undefined, fallback: string): number {
  return Phaser.Display.Color.HexStringToColor(value ?? fallback).color;
}

export function drawFootballer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: PlayerRecord | null,
  scale = 1,
  label = true
): Phaser.GameObjects.Container {
  const ch = CHARACTERS[player?.characterIndex ?? 0];
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const primary = hexColor(ch.primary, "#244ecf");
  const secondary = hexColor(ch.secondary, "#ffffff");
  const shorts = hexColor(ch.shorts, "#111111");
  const skin = hexColor(ch.skin, "#d69b6a");
  const hair = hexColor(ch.hair, "#24160f");
  const beard = ch.beard ? hexColor(ch.beard, ch.hair) : null;
  const boot = 0x17110c;
  const outline = 0x080806;

  // Soft shadow to ground the character.
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 68 * scale, 72 * scale, 14 * scale);

  // Legs and boots sit behind the shorts.
  g.lineStyle(8 * scale, skin, 1);
  g.lineBetween(-13 * scale, 36 * scale, -23 * scale, 58 * scale);
  g.lineBetween(13 * scale, 36 * scale, 23 * scale, 58 * scale);
  g.lineStyle(7 * scale, secondary, 1);
  g.lineBetween(-23 * scale, 57 * scale, -25 * scale, 66 * scale);
  g.lineBetween(23 * scale, 57 * scale, 25 * scale, 66 * scale);
  g.fillStyle(boot, 1);
  g.fillRoundedRect(-36 * scale, 63 * scale, 22 * scale, 9 * scale, 4 * scale);
  g.fillRoundedRect(14 * scale, 63 * scale, 22 * scale, 9 * scale, 4 * scale);

  // Arms use the character skin tone with kit-coloured sleeves.
  g.lineStyle(10 * scale, primary, 1);
  g.lineBetween(-22 * scale, -16 * scale, -35 * scale, -2 * scale);
  g.lineBetween(22 * scale, -16 * scale, 35 * scale, -2 * scale);
  g.lineStyle(8 * scale, skin, 1);
  g.lineBetween(-35 * scale, -2 * scale, -47 * scale, 12 * scale);
  g.lineBetween(35 * scale, -2 * scale, 47 * scale, 12 * scale);
  g.fillStyle(skin, 1);
  g.fillCircle(-48 * scale, 13 * scale, 5 * scale);
  g.fillCircle(48 * scale, 13 * scale, 5 * scale);

  // Head, hair and face. Each character now has its own skin/hair palette.
  g.lineStyle(2 * scale, outline, 0.34);
  g.fillStyle(skin, 1);
  g.fillCircle(-16 * scale, -48 * scale, 4 * scale);
  g.fillCircle(16 * scale, -48 * scale, 4 * scale);
  g.fillCircle(0, -47 * scale, 18 * scale);
  g.fillStyle(hair, 1);
  g.fillEllipse(0, -58 * scale, 31 * scale, 16 * scale);
  g.fillRoundedRect(-15 * scale, -61 * scale, 30 * scale, 14 * scale, 6 * scale);
  g.fillCircle(-10 * scale, -53 * scale, 8 * scale);
  if ((player?.characterIndex ?? 0) % 3 === 0) {
    g.fillTriangle(-4 * scale, -64 * scale, 7 * scale, -65 * scale, 2 * scale, -74 * scale);
  }
  if (beard !== null) {
    g.fillStyle(beard, 0.92);
    g.fillEllipse(0, -37 * scale, 23 * scale, 11 * scale);
    g.fillRoundedRect(-11 * scale, -43 * scale, 22 * scale, 10 * scale, 5 * scale);
  }
  g.fillStyle(0x0b0705, 1);
  g.fillCircle(-6 * scale, -49 * scale, 2 * scale);
  g.fillCircle(6 * scale, -49 * scale, 2 * scale);
  g.fillStyle(0x3a1f12, 0.75);
  g.fillRoundedRect(-5 * scale, -40 * scale, 10 * scale, 2 * scale, 1 * scale);

  // Kit, shorts and bold number.
  g.fillStyle(primary, 1);
  g.fillRoundedRect(-22 * scale, -30 * scale, 44 * scale, 55 * scale, 10 * scale);
  g.lineStyle(5 * scale, secondary, 1);
  g.lineBetween(-18 * scale, -20 * scale, 18 * scale, -20 * scale);
  g.lineStyle(2 * scale, 0xffffff, 0.20);
  g.lineBetween(-13 * scale, -25 * scale, -13 * scale, 18 * scale);
  g.lineBetween(13 * scale, -25 * scale, 13 * scale, 18 * scale);
  g.fillStyle(shorts, 1);
  g.fillRoundedRect(-24 * scale, 20 * scale, 48 * scale, 22 * scale, 5 * scale);
  g.lineStyle(2 * scale, outline, 0.40);
  g.strokeRoundedRect(-24 * scale, 20 * scale, 48 * scale, 22 * scale, 5 * scale);
  c.add(g);

  c.add(scene.add.text(0, -2 * scale, String(ch.number), {
    fontFamily: "Arial",
    fontSize: `${22 * scale}px`,
    fontStyle: "900",
    color: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4 * scale
  }).setOrigin(0.5));
  if (label) {
    c.add(scene.add.text(0, 82 * scale, player?.name ?? ch.name, {
      fontFamily: "Arial",
      fontSize: `${15 * scale}px`,
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 150 * scale }
    }).setOrigin(0.5, 0));
  }
  return c;
}

export function addTopBar(scene: Phaser.Scene, state: PublicState | null, subtitle = "") {
  const g = scene.add.graphics();
  g.fillStyle(0x07170c, 0.78);
  g.fillRoundedRect(18, 10, W - 36, 60, 16);
  addSoundToggle(scene, state?.roomCode ? W - 250 : W - 76, 40);
  const title = subtitle || state?.message || "Pessi's Pens";
  scene.add.text(34, 26, title, {
    fontFamily: "Arial",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#ffffff"
  }).setOrigin(0, 0.5);
  if (state?.roomCode) {
    scene.add.text(W - 34, 26, `CODE ${state.roomCode}`, {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "900",
      color: "#fff2a6"
    }).setOrigin(1, 0.5);
    scene.add.text(W - 34, 52, `Round ${state.roundNumber || "-"}`, {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(1, 0.5);
  }
}

export function formatMatchScore(state: PublicState, m: BracketMatch): string {
  const p1 = getPlayer(state, m.p1)?.name ?? "?";
  const p2 = getPlayer(state, m.p2)?.name ?? "?";
  const p1Total = m.p1Score + m.p1Shootout;
  const p2Total = m.p2Score + m.p2Shootout;
  const marker = m.winnerId ? "✓" : m.status === "playing" ? "▶" : "";
  return `${marker} ${p1} ${p1Total}-${p2Total} ${p2}`;
}
