import type { GoalZone } from "@pessi/shared";

export type Phase = "characterSelect" | "lobby" | "tournament" | "roundLive" | "tackle" | "penalty" | "penaltyResult" | "roundResults" | "finalResults";

export type PlayerRecord = {
  id: string;
  sessionId: string | null;
  name: string;
  characterIndex: number;
  isBot: boolean;
  connected: boolean;
  eliminated: boolean;
  wins: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  matchNo: number;
  p1: string;
  p2: string;
  p1Score: number;
  p2Score: number;
  p1Shootout: number;
  p2Shootout: number;
  p1ShootoutTaken: number;
  p2ShootoutTaken: number;
  winnerId: string | null;
  loserId: string | null;
  events: ShotEvent[];
  status: "pending" | "playing" | "done";
};

export type ShotMode = "regular" | "shootout";
export type ShotEvent = {
  matchId: string;
  mode: ShotMode;
  kickerId: string;
  goalieId: string;
  goal: boolean;
  miss: boolean;
  saved: boolean;
  zone: GoalZone;
  goaliePick: GoalZone;
  aimX: number;
  aimY: number;
  power: number;
  text: string;
};

export type ActivePenalty = {
  mode: ShotMode;
  kickerId: string;
  goalieId: string;
  shotLabel: string;
  goaliePick: GoalZone | null;
  startedAt: number;
  timeoutAt: number;
};

export type TackleState = {
  kickerId: string;
  goalieId: string;
  kickerX: number;
  kickerY: number;
  goalieX: number;
  goalieY: number;
  tackleText: string;
  startedAt: number;
  timeoutAt: number;
  impactAt?: number | null;
};

export type PublicState = {
  roomCode: string;
  hostId: string | null;
  phase: Phase;
  tournamentSize: number;
  players: PlayerRecord[];
  bracket: BracketMatch[];
  activeMatchId: string | null;
  isSpectating: boolean;
  liveMatchIds: string[];
  activePenalty: ActivePenalty | null;
  tackle: TackleState | null;
  lastShot: ShotEvent | null;
  roundNumber: number;
  matchIndex: number;
  message: string;
};
