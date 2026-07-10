import Phaser from "phaser";
import type { PublicState } from "../types";
import { playMusic, type MusicTrack } from "../audio/audio";


function musicForPhase(phase: PublicState["phase"]): MusicTrack {
  if (phase === "characterSelect" || phase === "lobby") return "startLobby";
  if (phase === "tackle" || phase === "penalty" || phase === "penaltyResult") return "penalty";
  return "results";
}

export function routeForPhase(phase: PublicState["phase"]): string {
  if (phase === "characterSelect") return "CharacterSelectScene";
  if (phase === "lobby") return "LobbyScene";
  if (phase === "tournament" || phase === "roundLive") return "TournamentScene";
  if (phase === "tackle") return "TackleScene";
  if (phase === "penalty" || phase === "penaltyResult") return "PenaltyScene";
  if (phase === "roundResults") return "TournamentScene";
  return "FinalResultsScene";
}

export function routeScene(scene: Phaser.Scene, state: PublicState) {
  // Keep music tied to authoritative server phase, not whichever scene happened
  // to request a track most recently. This also corrects stale audio after a
  // rapid penalty -> bracket/results transition.
  playMusic(scene, musicForPhase(state.phase));
  const target = routeForPhase(state.phase);
  if (scene.scene.key !== target) scene.scene.start(target);
}
