import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import { Net } from "../net/Net";
import { playPlayerName, preloadAudio, playMusic, stopSfxChannel } from "../audio/audio";
import { addButton, addSoundToggle, drawFootballer, H, W } from "../ui/ui";

function inputHtml(placeholder: string, value = "") {
  return `<input value="${value}" placeholder="${placeholder}" maxlength="16" style="
    width: 320px; height: 42px; border-radius: 14px; border: 3px solid rgba(255,255,255,0.95);
    background: rgba(255,255,255,0.96); color:#102016; font-size: 21px; font-weight: 800;
    text-align:center; outline:none; box-sizing:border-box; box-shadow: 0 8px 20px rgba(0,0,0,0.25);" />`;
}

export class StartScene extends Phaser.Scene {
  private characterIndex = 15;
  private preview?: Phaser.GameObjects.Container;
  private characterText?: Phaser.GameObjects.Text;
  private errorText?: Phaser.GameObjects.Text;
  private nameDom?: Phaser.GameObjects.DOMElement;
  private codeDom?: Phaser.GameObjects.DOMElement;

  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.image("titleBg", "assets/backgrounds/pessiTitleBg.jpg");
    preloadAudio(this);
  }

  create() {
    stopSfxChannel("playerName");
    playMusic(this, "startLobby");
    this.add.image(W / 2, H / 2, "titleBg").setDisplaySize(W, H);

    const shade = this.add.graphics();
    shade.fillStyle(0x000000, 0.18);
    shade.fillRect(0, 0, W, H);

    this.drawPanel(W / 2, 345, 430, 194, 0x062111, 0.52);
    this.drawPanel(W / 2, 596, 560, 206, 0x062111, 0.40);

    this.add.text(W / 2, 270, "Host a room or join by code", {
      fontFamily: "Arial",
      fontSize: "23px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5);

    this.nameDom = this.add.dom(W / 2, 312).createFromHTML(inputHtml("Type your name"));
    this.codeDom = this.add.dom(W / 2, 362).createFromHTML(inputHtml("Room code to join"));

    addButton(this, W / 2 - 116, 418, 196, 50, "HOST GAME", () => this.host(), 0x0b5d33);
    addButton(this, W / 2 + 116, 418, 196, 50, "JOIN CODE", () => this.join(), 0x163c82);

    this.characterText = this.add.text(W / 2, 528, "", {
      fontFamily: "Arial",
      fontSize: "25px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5);

    addButton(this, 414, 605, 60, 54, "◀", () => this.changeCharacter(-1), 0x614011);
    addButton(this, 866, 605, 60, 54, "▶", () => this.changeCharacter(1), 0x614011);

    this.errorText = this.add.text(W / 2, 485, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffdddd",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: 430 }
    }).setOrigin(0.5);

    addSoundToggle(this, W - 76, 40);

    this.add.text(W / 2, 692, "Choose your footballer above. Designed for touch, mouse and keyboard.", {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);

    this.updatePreview();
  }

  private drawPanel(x: number, y: number, w: number, h: number, fill: number, alpha: number) {
    const g = this.add.graphics();
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 26);
    g.lineStyle(3, 0xffffff, 0.38);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
    g.lineStyle(2, 0xffffff, 0.12);
    g.strokeRoundedRect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16, 20);
  }

  private changeCharacter(delta: number) {
    this.characterIndex = (this.characterIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    this.updatePreview();
    playPlayerName(CHARACTERS[this.characterIndex].name);
  }

  private updatePreview() {
    const ch = CHARACTERS[this.characterIndex];
    this.preview?.destroy();
    this.preview = drawFootballer(
      this,
      W / 2,
      610,
      { id: "preview", sessionId: null, name: ch.name, characterIndex: this.characterIndex, isBot: false, connected: true, eliminated: false, wins: 0 },
      0.78,
      false
    );
    this.characterText?.setText(`${ch.name}\n${ch.country}`);
  }

  private getName(): string {
    const input = this.nameDom?.node.querySelector("input") as HTMLInputElement | null;
    return (input?.value ?? "Player").trim() || "Player";
  }

  private getCode(): string {
    const input = this.codeDom?.node.querySelector("input") as HTMLInputElement | null;
    return (input?.value ?? "").trim();
  }

  private async host() {
    try {
      this.errorText?.setText("Creating room...");
      await Net.host(this.getName(), this.characterIndex);
      this.scene.start("LobbyScene");
    } catch (err) {
      this.errorText?.setText(`Could not host: ${(err as Error).message}`);
    }
  }

  private async join() {
    try {
      const code = this.getCode();
      if (!code) {
        this.errorText?.setText("Type a room code first.");
        return;
      }
      this.errorText?.setText("Joining room...");
      await Net.joinByCode(this.getName(), code, this.characterIndex);
      this.scene.start("LobbyScene");
    } catch (err) {
      this.errorText?.setText(`Could not join: ${(err as Error).message}`);
    }
  }
}
