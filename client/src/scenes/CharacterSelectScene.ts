import Phaser from "phaser";
import { CHARACTERS } from "@pessi/shared";
import { Net } from "../net/Net";
import { playMusic, playPlayerName, preloadAudio } from "../audio/audio";
import type { PlayerRecord, PublicState } from "../types";
import { addButton, addSoundToggle, drawFootballer, H, W } from "../ui/ui";
import { routeScene } from "../ui/routing";

export class CharacterSelectScene extends Phaser.Scene {
  private unsub?: () => void;
  private selectedIndex: number | null = null;
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

    const cleanup = () => {
      this.unsub?.();
      this.unsub = undefined;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    // Draw a visible loading screen immediately. This prevents a blank canvas
    // if the scene starts between WebSocket state messages or while itch.io is
    // restoring the Phaser canvas after the StartScene shuts down.
    this.renderWaitingForState();

    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("CharacterSelectScene")) return;
      this.handleState(state);
    });

    // Safety net: Net.onState normally supplies the cached state immediately,
    // but this delayed retry guarantees the scene renders even if a transition
    // and a server broadcast occur in the same frame.
    this.time.delayedCall(100, () => {
      if (!this.scene.isActive("CharacterSelectScene")) return;
      if (Net.state) this.handleState(Net.state);
      else this.renderWaitingForState();
    });
  }

  private handleState(state: PublicState) {
    const me = state.players.find((p) => p.id === Net.sessionId);
    const message = String(state.message ?? "Choose an available footballer.");

    if (me && me.characterIndex >= 0 && this.confirmedIndex !== me.characterIndex) {
      this.confirmedIndex = me.characterIndex;
      this.pendingIndex = null;
      this.selectedIndex = null;
    }
    if (me && me.characterIndex < 0 && this.pendingIndex !== null) {
      const takenByOther = state.players.some((p) => p.id !== me.id && p.characterIndex === this.pendingIndex);
      if (takenByOther || message.toLowerCase().includes("taken")) {
        this.pendingIndex = null;
        this.selectedIndex = null;
      }
    }
    if (me && me.characterIndex < 0 && this.selectedIndex !== null) {
      const selectedWasTaken = state.players.some((p) => p.id !== me.id && p.characterIndex === this.selectedIndex);
      if (selectedWasTaken) this.selectedIndex = null;
    }

    // Render before routing so there is never an empty frame, even when the
    // confirmed selection immediately advances this client to the lobby.
    this.render(state);
    routeScene(this, state);
  }

  private renderWaitingForState() {
    [...this.children.list].forEach((child) => child.destroy());
    if (this.textures.exists("lobbyBg")) {
      this.add.image(W / 2, H / 2, "lobbyBg").setDisplaySize(W, H);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x07170c, 1);
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x04130b, 0.52);
    this.add.text(W / 2, 300, "LOADING PLAYER SELECTION", {
      fontFamily: "Arial",
      fontSize: "36px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5);
    this.add.text(W / 2, 360, "Getting the latest available players from the room...", {
      fontFamily: "Arial",
      fontSize: "21px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5);
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

    this.add.text(34, 66, "Tap a player, then press CONFIRM to reserve them.", {
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
    const gridH = 492;
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
      const locallySelected = this.selectedIndex === index && !mine && !taken;

      const card = this.add.container(x + cardW / 2, y + cardH / 2);
      const bg = this.add.rectangle(0, 0, cardW, cardH, mine || locallySelected ? 0x0b5d33 : 0x07170c, mine || locallySelected ? 0.96 : 0.86)
        .setStrokeStyle(mine || locallySelected ? 4 : 2, mine || locallySelected ? 0xffd21f : 0xffffff, mine || locallySelected ? 1 : 0.32);
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
      // Hotfix 67: enlarge and lower the footballer so the portrait, name and
      // country read as one compact group instead of three widely separated
      // elements. The bottom text bands remain reserved to prevent overlap.
      const footballer = drawFootballer(this, 0, -15, fakePlayer, 0.41, false);
      card.add(footballer);

      // Responsive text sizing keeps ordinary names prominent while allowing
      // the longest names to wrap safely to a second line above the country.
      const nameSize = character.name.length > 22 ? 10 : character.name.length > 17 ? 11 : 12;
      card.add(this.add.text(0, 14, character.name, {
        fontFamily: "Arial",
        fontSize: `${nameSize}px`,
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        lineSpacing: -2,
        wordWrap: { width: cardW - 10, useAdvancedWrap: true },
        fixedWidth: cardW - 8,
        fixedHeight: 29
      }).setOrigin(0.5, 0));
      card.add(this.add.text(0, cardH / 2 - 8, `${character.country}  •  #${character.number}`, {
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#fff2a6",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
        fixedWidth: cardW - 10
      }).setOrigin(0.5));

      if (taken || pending) {
        footballer.setAlpha(0.28);
        bg.setFillStyle(0x242424, 0.92);
        card.add(this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.38));
        card.add(this.add.text(0, 0, pending ? "RESERVING..." : "UNAVAILABLE", {
          fontFamily: "Arial",
          fontSize: pending ? "13px" : "14px",
          fontStyle: "900",
          color: pending ? "#fff2a6" : "#dddddd",
          stroke: "#000000",
          strokeThickness: 4,
          align: "center"
        }).setOrigin(0.5));
      } else if (mine) {
        card.add(this.add.text(0, -cardH / 2 + 10, "YOUR PLAYER ✓", {
          fontFamily: "Arial",
          fontSize: "11px",
          fontStyle: "900",
          color: "#fff2a6",
          stroke: "#000000",
          strokeThickness: 3
        }).setOrigin(0.5));
      } else if (locallySelected) {
        card.add(this.add.text(0, -cardH / 2 + 10, "SELECTED", {
          fontFamily: "Arial",
          fontSize: "11px",
          fontStyle: "900",
          color: "#fff2a6",
          stroke: "#000000",
          strokeThickness: 3
        }).setOrigin(0.5));
      }

      if (!taken && !pending && me && me.characterIndex < 0 && this.pendingIndex === null) {
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerover", () => bg.setStrokeStyle(4, 0xffd21f, 0.95));
        bg.on("pointerout", () => bg.setStrokeStyle(locallySelected ? 4 : 2, locallySelected ? 0xffd21f : 0xffffff, locallySelected ? 1 : 0.32));
        bg.on("pointerdown", () => {
          this.selectedIndex = index;
          // Preview the commentator name immediately when the card is chosen.
          // The confirm action now only reserves the player and does not replay it.
          playPlayerName(character.name);
          this.render(state);
        });
      }
    });

    const canConfirm = Boolean(me && me.characterIndex < 0 && this.selectedIndex !== null && this.pendingIndex === null);
    if (canConfirm) {
      const selected = this.selectedIndex as number;
      addButton(this, W / 2, 644, 250, 50, "CONFIRM PLAYER", () => {
        if (this.pendingIndex !== null || this.selectedIndex === null) return;
        this.pendingIndex = this.selectedIndex;
        Net.send("selectCharacter", this.selectedIndex);
        this.render(state);
      }, 0x0b5d33);
      this.add.text(W / 2 - 150, 644, `Selected: ${CHARACTERS[selected].name}`, {
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "right"
      }).setOrigin(1, 0.5);
    }

    const safeMessage = String(state.message ?? "Choose an available footballer.");
    const statusColor = safeMessage.toLowerCase().includes("taken") ? "#ffb7b7" : "#ffffff";
    const footerMessage = me?.characterIndex >= 0
      ? "Player locked in — waiting for the other players."
      : this.pendingIndex !== null
        ? "Reserving player..."
        : this.selectedIndex !== null
          ? "Press CONFIRM PLAYER to lock in your choice."
          : safeMessage;
    this.add.text(W / 2, 696, footerMessage, {
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
