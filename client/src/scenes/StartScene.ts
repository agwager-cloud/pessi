import Phaser from "phaser";
import { Net, type ConnectionProgress } from "../net/Net";
import { preloadAudio, playMusic } from "../audio/audio";
import { addButton, addSoundToggle, H, W } from "../ui/ui";

function inputHtml(placeholder: string, value = "") {
  return `<input value="${value}" placeholder="${placeholder}" maxlength="16" style="
    width: 320px; height: 44px; border-radius: 14px; border: 3px solid rgba(255,255,255,0.95);
    background: rgba(255,255,255,0.96); color:#102016; font-size: 21px; font-weight: 800;
    text-align:center; outline:none; box-sizing:border-box; box-shadow: 0 8px 20px rgba(0,0,0,0.25);" />`;
}

export class StartScene extends Phaser.Scene {
  private errorText?: Phaser.GameObjects.Text;
  private nameDom?: Phaser.GameObjects.DOMElement;
  private codeDom?: Phaser.GameObjects.DOMElement;
  private hostButton?: Phaser.GameObjects.Container;
  private joinButton?: Phaser.GameObjects.Container;
  private connectionPanel?: Phaser.GameObjects.Container;
  private connectionDetail?: Phaser.GameObjects.Text;
  private connectionElapsed?: Phaser.GameObjects.Text;
  private connectionProgressFill?: Phaser.GameObjects.Graphics;
  private isConnecting = false;

  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.image("titleBg", "assets/backgrounds/pessiTitleBg.jpg");
    preloadAudio(this);
  }

  create() {
    playMusic(this, "startLobby");
    this.add.image(W / 2, H / 2, "titleBg").setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.2);

    const panel = this.add.graphics();
    panel.fillStyle(0x062111, 0.68);
    panel.fillRoundedRect(W / 2 - 260, 226, 520, 330, 30);
    panel.lineStyle(4, 0xffffff, 0.42);
    panel.strokeRoundedRect(W / 2 - 260, 226, 520, 330, 30);

    this.add.text(W / 2, 264, "ENTER THE TOURNAMENT", {
      fontFamily: "Arial",
      fontSize: "31px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5);

    this.add.text(W / 2, 306, "Enter your name, then host a room or join with a code.", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    this.nameDom = this.add.dom(W / 2, 355).createFromHTML(inputHtml("Type your name"));
    this.codeDom = this.add.dom(W / 2, 414).createFromHTML(inputHtml("Room code to join"));

    this.hostButton = addButton(this, W / 2 - 116, 482, 196, 52, "HOST GAME", () => this.host(), 0x0b5d33);
    this.joinButton = addButton(this, W / 2 + 116, 482, 196, 52, "JOIN CODE", () => this.join(), 0x163c82);

    this.errorText = this.add.text(W / 2, 538, "", {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffdddd",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 700 }
    }).setOrigin(0.5);

    this.createConnectionPanel();

    this.add.text(W / 2, 610, "After entering the room, choose your footballer from the live character grid.", {
      fontFamily: "Arial",
      fontSize: "19px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5);

    addSoundToggle(this, W - 76, 40);
  }

  private createConnectionPanel() {
    const container = this.add.container(W / 2, 420).setDepth(50).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0xeaf2ff, 0.98);
    bg.fillRoundedRect(-235, -92, 470, 184, 24);
    bg.lineStyle(4, 0x94b7ff, 1);
    bg.strokeRoundedRect(-235, -92, 470, 184, 24);

    const title = this.add.text(0, -64, "Connecting to classroom server", {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#102346",
      align: "center"
    }).setOrigin(0.5);

    this.connectionDetail = this.add.text(0, -20, "Preparing the classroom connection...", {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "bold",
      color: "#18345f",
      align: "center",
      wordWrap: { width: 410 }
    }).setOrigin(0.5);

    const barBack = this.add.graphics();
    barBack.fillStyle(0xbcc9de, 1);
    barBack.fillRoundedRect(-195, 34, 390, 14, 7);

    this.connectionProgressFill = this.add.graphics();
    this.drawProgress(0.03);

    this.connectionElapsed = this.add.text(0, 68, "Waiting 0 seconds · free servers can take 60–100 seconds", {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#43536e",
      align: "center"
    }).setOrigin(0.5);

    container.add([bg, title, this.connectionDetail, barBack, this.connectionProgressFill, this.connectionElapsed]);
    this.connectionPanel = container;
  }

  private getName(): string {
    const input = this.nameDom?.node.querySelector("input") as HTMLInputElement | null;
    return (input?.value ?? "Player").trim() || "Player";
  }

  private getCode(): string {
    const input = this.codeDom?.node.querySelector("input") as HTMLInputElement | null;
    return (input?.value ?? "").trim();
  }

  private setConnecting(value: boolean) {
    this.isConnecting = value;

    if (value) {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
    }

    this.nameDom?.setVisible(!value);
    this.codeDom?.setVisible(!value);
    this.hostButton?.setVisible(!value);
    this.joinButton?.setVisible(!value);
    this.errorText?.setVisible(!value);
    this.connectionPanel?.setVisible(value);

    for (const dom of [this.nameDom, this.codeDom]) {
      const input = dom?.node.querySelector("input") as HTMLInputElement | null;
      if (input) input.disabled = value;
    }

    if (value) {
      this.updateConnectionProgress({
        elapsedSeconds: 0,
        attempt: 1,
        progress: 0.03,
        message: "Contacting the classroom server...",
      });
    }
  }

  private updateConnectionProgress(progress: ConnectionProgress) {
    this.connectionDetail?.setText(progress.message);
    this.connectionElapsed?.setText(
      progress.progress >= 1
        ? "Connected · loading the player screen"
        : `Waiting ${progress.elapsedSeconds} seconds · free servers can take 60–100 seconds`,
    );
    this.drawProgress(progress.progress);
  }

  private drawProgress(value: number) {
    const width = Math.max(10, Math.min(390, 390 * value));
    this.connectionProgressFill?.clear();
    this.connectionProgressFill?.fillStyle(value >= 1 ? 0x27a85b : 0x2d66e8, 1);
    this.connectionProgressFill?.fillRoundedRect(-195, 34, width, 14, 7);
  }

  private connectionFailure(action: "host" | "join", error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (/room code not found/i.test(message)) return "Room code not found. Check the five-digit code and try again.";

    const verb = action === "host" ? "create" : "join";
    if (!Net.isUsingPublishedServer()) return `Could not ${verb} the classroom: ${message}`;

    return `Could not ${verb} the classroom. If this game works in InPrivate/Incognito but not in a normal window, a browser extension or school filter is blocking it. Ask IT to allow ${Net.publishedServerHost()} and secure WebSocket connections.`;
  }

  private async host() {
    if (this.isConnecting) return;
    const name = this.getName();
    this.setConnecting(true);
    try {
      await Net.host(name, (progress) => this.updateConnectionProgress(progress));
      this.scene.start("CharacterSelectScene");
    } catch (error) {
      this.setConnecting(false);
      this.errorText?.setText(this.connectionFailure("host", error)).setVisible(true);
    }
  }

  private async join() {
    if (this.isConnecting) return;
    const code = this.getCode();
    if (!code) {
      this.errorText?.setText("Type a room code first.");
      return;
    }

    const name = this.getName();
    this.setConnecting(true);
    try {
      await Net.joinByCode(name, code, (progress) => this.updateConnectionProgress(progress));
      this.scene.start("CharacterSelectScene");
    } catch (error) {
      this.setConnecting(false);
      this.errorText?.setText(this.connectionFailure("join", error)).setVisible(true);
    }
  }
}
