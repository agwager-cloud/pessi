import Phaser from "phaser";
import { Net } from "../net/Net";
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
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffdddd",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 650 }
    }).setOrigin(0.5);

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
    this.hostButton?.setAlpha(value ? 0.45 : 1);
    this.joinButton?.setAlpha(value ? 0.45 : 1);
    for (const dom of [this.nameDom, this.codeDom]) {
      const input = dom?.node.querySelector("input") as HTMLInputElement | null;
      if (!input) continue;
      input.disabled = value;
      input.style.opacity = value ? "0.72" : "1";
    }
  }

  private connectingMessage(action: "host" | "join"): string {
    const verb = action === "host" ? "Creating room" : "Joining room";
    if (!Net.isUsingPublishedServer()) return `${verb}...`;
    return `${verb}... waking up the free online server. This can take up to 60 seconds. Please wait — buttons are locked.`;
  }

  private async host() {
    if (this.isConnecting) return;
    this.setConnecting(true);
    try {
      this.errorText?.setText(this.connectingMessage("host"));
      await Net.host(this.getName());
      this.scene.start("CharacterSelectScene");
    } catch (err) {
      this.errorText?.setText(`Could not host: ${(err as Error).message}`);
      this.setConnecting(false);
    }
  }

  private async join() {
    if (this.isConnecting) return;
    const code = this.getCode();
    if (!code) {
      this.errorText?.setText("Type a room code first.");
      return;
    }
    this.setConnecting(true);
    try {
      this.errorText?.setText(this.connectingMessage("join"));
      await Net.joinByCode(this.getName(), code);
      this.scene.start("CharacterSelectScene");
    } catch (err) {
      this.errorText?.setText(`Could not join: ${(err as Error).message}`);
      this.setConnecting(false);
    }
  }
}
