import Phaser from "phaser";
import type { PublicState } from "../types";

export function routeForPhase(phase: PublicState["phase"]): string {
  if (phase === "lobby") return "LobbyScene";
  if (phase === "tournament") return "TournamentScene";
  if (phase === "tackle") return "TackleScene";
  if (phase === "penalty" || phase === "penaltyResult") return "PenaltyScene";
  if (phase === "roundResults") return "TournamentScene";
  return "FinalResultsScene";
}

export function routeScene(scene: Phaser.Scene, state: PublicState) {
  const target = routeForPhase(state.phase);
  if (scene.scene.key !== target) scene.scene.start(target);
}
