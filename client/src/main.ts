import Phaser from "phaser";
import "./style.css";
import { StartScene } from "./scenes/StartScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { TournamentScene } from "./scenes/TournamentScene";
import { TackleScene } from "./scenes/TackleScene";
import { PenaltyScene } from "./scenes/PenaltyScene";
import { RoundResultsScene } from "./scenes/RoundResultsScene";
import { FinalResultsScene } from "./scenes/FinalResultsScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#07170c",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true
  },
  input: {
    activePointers: 3
  },
  scene: [StartScene, LobbyScene, TournamentScene, TackleScene, PenaltyScene, RoundResultsScene, FinalResultsScene]
};

new Phaser.Game(config);
