import type Phaser from "phaser";

export type MusicTrack = "startLobby" | "penalty" | "results";

const STORAGE_KEY = "pessiSoundMuted";
const AUDIO_VERSION = "v60";
const FADE_MS = 450;

const MUSIC_FILES: Record<MusicTrack, string> = {
  startLobby: `assets/audio/backgroundStartLobby.mp3?${AUDIO_VERSION}`,
  penalty: `assets/audio/background.mp3?${AUDIO_VERSION}`,
  results: `assets/audio/backgroundResults.mp3?${AUDIO_VERSION}`,
};

const VOLUMES: Record<MusicTrack, number> = {
  startLobby: 0.42,
  penalty: 0.50,
  results: 0.50,
};

let audio: HTMLAudioElement | null = null;
let currentTrack: MusicTrack | null = null;
let desiredTrack: MusicTrack | null = null;
let muted = readMutedSetting();
let listenersInstalled = false;
let fadeTimer: number | undefined;
let fadeResolve: (() => void) | null = null;
let pendingSwitch = false;
let switching = false;

function readMutedSetting(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMutedSetting(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Ignore storage errors in locked-down browsers/iframes.
  }
}

function getAudio(): HTMLAudioElement {
  if (audio) return audio;

  audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  audio.playbackRate = 1;
  audio.setAttribute("playsinline", "true");
  audio.addEventListener("error", () => {
    console.warn("[Pessi audio] Could not load music file:", audio?.src || "unknown source");
  });
  return audio;
}

function isAudioSourceForTrack(el: HTMLAudioElement, track: MusicTrack): boolean {
  const expectedFile = MUSIC_FILES[track].split("?")[0];
  try {
    return new URL(el.src, window.location.href).pathname.endsWith(expectedFile);
  } catch {
    return el.src.includes(expectedFile);
  }
}

function clearFade() {
  if (fadeTimer !== undefined) {
    window.clearInterval(fadeTimer);
    fadeTimer = undefined;
  }
  // Important: a new fade can interrupt an old one (for example, the winner
  // announcement ducking the music while a penalty -> results crossfade is
  // still running). Resolve the cancelled fade so the music switch state
  // machine cannot remain permanently stuck in `switching = true`.
  const resolve = fadeResolve;
  fadeResolve = null;
  resolve?.();
}

function fadeTo(targetVolume: number, duration = FADE_MS): Promise<void> {
  const el = getAudio();
  clearFade();

  const from = el.volume;
  if (duration <= 0 || Math.abs(from - targetVolume) < 0.001) {
    el.volume = targetVolume;
    return Promise.resolve();
  }

  const started = performance.now();
  return new Promise((resolve) => {
    fadeResolve = resolve;
    fadeTimer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.volume = from + (targetVolume - from) * eased;
      if (t >= 1) {
        // Resolve this fade directly before clearing its bookkeeping, so a
        // later fade cannot accidentally resolve the wrong promise.
        fadeResolve = null;
        if (fadeTimer !== undefined) window.clearInterval(fadeTimer);
        fadeTimer = undefined;
        el.volume = targetVolume;
        resolve();
      }
    }, 33);
  });
}

async function safePlay(): Promise<boolean> {
  if (muted || !desiredTrack) return false;
  const el = getAudio();
  el.muted = false;
  el.loop = true;
  el.playbackRate = 1;

  try {
    await el.play();
    return true;
  } catch (err) {
    // Browsers can block sound until the first click/tap/key press.
    // The desired track stays queued and will retry on the next gesture.
    console.warn("[Pessi audio] Music play was blocked until user interaction.", err);
    return false;
  }
}

async function applyDesiredTrack(immediate = false) {
  if (switching) {
    pendingSwitch = true;
    return;
  }

  switching = true;
  try {
    while (true) {
      pendingSwitch = false;
      const track = desiredTrack;
      const el = getAudio();

      if (muted || !track) {
        await fadeTo(0, immediate ? 0 : 180);
        el.pause();
        currentTrack = null;
      } else if (currentTrack !== track || !isAudioSourceForTrack(el, track)) {
        await fadeTo(0, currentTrack ? FADE_MS : 0);
        el.pause();
        el.src = MUSIC_FILES[track];
        el.currentTime = 0;
        currentTrack = track;
        el.volume = 0;
        const played = await safePlay();
        if (played && desiredTrack === track && !muted) {
          await fadeTo(VOLUMES[track], immediate ? 120 : FADE_MS);
        }
      } else {
        const played = await safePlay();
        if (played && desiredTrack === track && !muted) {
          await fadeTo(VOLUMES[track], immediate ? 120 : 220);
        }
      }

      if (!pendingSwitch) break;
    }
  } finally {
    switching = false;
  }
}

function retryAfterGesture() {
  if (!muted && desiredTrack) void applyDesiredTrack(true);
}

function installUnlockListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  const options: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener("pointerdown", retryAfterGesture, options);
  window.addEventListener("touchstart", retryAfterGesture, options);
  window.addEventListener("mousedown", retryAfterGesture, options);
  window.addEventListener("keydown", retryAfterGesture, options);
}

export function preloadAudio(_scene: Phaser.Scene) {
  // Music is intentionally managed with one lazy HTMLAudio element.
  // This keeps MP3 loading/decoding separate from Phaser scene creation.
  installUnlockListeners();
}

export function playMusic(_scene: Phaser.Scene, track: MusicTrack) {
  installUnlockListeners();
  const el = getAudio();
  if (desiredTrack === track && currentTrack === track && isAudioSourceForTrack(el, track) && !muted) return;
  desiredTrack = track;
  void applyDesiredTrack(!currentTrack);
}

export function stopMusic(_scene: Phaser.Scene) {
  desiredTrack = null;
  void applyDesiredTrack(false);
}

export function isSoundMuted(): boolean {
  return muted;
}

export function toggleSound(_scene: Phaser.Scene): boolean {
  muted = !muted;
  saveMutedSetting(muted);
  installUnlockListeners();

  if (muted) {
    stopAllSfx();
    void applyDesiredTrack(false);
  } else if (desiredTrack) {
    void applyDesiredTrack(true);
  }

  return muted;
}


// -----------------------------------------------------------------------------
// Hotfix 50: short SFX/commentary layer
// -----------------------------------------------------------------------------
// This intentionally does NOT replace or touch the stable background music route.
// It plays short MP3 files from public/assets/audio over the top of the current
// music using separate HTMLAudio elements.

export type SfxChannel = "commentary" | "playerName" | "crowd" | "winner" | "misc";
export type CommentaryKind = "goal" | "save" | "miss" | "tackle";

const SFX_VERSION = "v60";
const SFX_COUNTS: Record<CommentaryKind, number> = {
  goal: 8,
  save: 8,
  miss: 8,
  tackle: 12,
};

const CROWD_SFX_COUNTS: Record<CommentaryKind, number> = {
  goal: 6,
  save: 3,
  miss: 3,
  tackle: 3,
};

const activeSfx = new Map<SfxChannel, HTMLAudioElement>();

// Hotfix 52: keep commentary varied. Each kind uses every available clip in a
// shuffled bag before any phrase is allowed to repeat. Once a bag refills, the
// first new clip is prevented from matching the previous clip when possible.
const commentaryBags: Record<CommentaryKind, number[]> = {
  goal: [],
  save: [],
  miss: [],
  tackle: [],
};
const lastCommentaryIndex: Partial<Record<CommentaryKind, number>> = {};

// Hotfix 54: keep crowd reactions varied too. These bags are separate from
// commentary so a goal can play crowdGoalX and commentaryGoalY together without
// either category repeating in quick succession.
const crowdBags: Record<CommentaryKind, number[]> = {
  goal: [],
  save: [],
  miss: [],
  tackle: [],
};
const lastCrowdIndex: Partial<Record<CommentaryKind, number>> = {};

const PLAYER_NAME_FILE_OVERRIDES: Record<string, string> = {
  // Keep this filename ASCII-safe. Some browsers/build tools handle accented
  // filenames inconsistently once the game is zipped/uploaded.
  "MmmBop-pé": "MmmBop-pe.mp3",
};

function audioAssetUrl(fileName: string): string {
  return `assets/audio/${encodeURIComponent(fileName)}?${SFX_VERSION}`;
}

export function stopSfxChannel(channel: SfxChannel) {
  const current = activeSfx.get(channel);
  if (!current) return;
  try {
    current.pause();
    current.currentTime = 0;
    current.src = "";
    current.load();
  } catch {
    // Ignore browsers that dislike resetting media elements mid-cleanup.
  }
  activeSfx.delete(channel);
}

export function stopAllSfx() {
  [...activeSfx.keys()].forEach((channel) => stopSfxChannel(channel));
}

export function playSfxFile(
  fileName: string,
  options: { channel?: SfxChannel; volume?: number; playbackRate?: number; restartChannel?: boolean } = {}
): HTMLAudioElement | null {
  if (muted || typeof window === "undefined") return null;

  const channel = options.channel ?? "misc";
  const restartChannel = options.restartChannel ?? true;
  if (restartChannel) stopSfxChannel(channel);

  const el = new Audio(audioAssetUrl(fileName));
  el.loop = false;
  el.preload = "auto";
  el.volume = Math.max(0, Math.min(1, options.volume ?? 0.88));
  el.playbackRate = Math.max(0.75, Math.min(1.25, options.playbackRate ?? 1));
  el.setAttribute("playsinline", "true");

  activeSfx.set(channel, el);

  const cleanup = () => {
    if (activeSfx.get(channel) === el) activeSfx.delete(channel);
  };
  el.addEventListener("ended", cleanup, { once: true });
  el.addEventListener("error", () => {
    cleanup();
    console.warn(`[Pessi audio] Missing or unreadable SFX: ${fileName}`);
  }, { once: true });

  void el.play().catch((err) => {
    cleanup();
    // Browser autoplay rules can block SFX until the first tap/click/key press.
    console.warn(`[Pessi audio] SFX play was blocked: ${fileName}`, err);
  });

  return el;
}

function playSfxFileAndWait(
  fileName: string,
  options: { channel?: SfxChannel; volume?: number; playbackRate?: number; restartChannel?: boolean; maxWaitMs?: number } = {}
): Promise<void> {
  if (muted || typeof window === "undefined") return Promise.resolve();

  const el = playSfxFile(fileName, options);
  if (!el) return Promise.resolve();

  const maxWaitMs = Math.max(600, options.maxWaitMs ?? 4200);
  return new Promise((resolve) => {
    let done = false;
    let timer: number | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer !== undefined) window.clearTimeout(timer);
      el.removeEventListener("ended", finish);
      el.removeEventListener("error", finish);
      resolve();
    };

    el.addEventListener("ended", finish, { once: true });
    el.addEventListener("error", finish, { once: true });
    timer = window.setTimeout(finish, maxWaitMs);
  });
}

function shuffleNumbers(values: number[]): number[] {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function refillCommentaryBag(kind: CommentaryKind) {
  const count = SFX_COUNTS[kind];
  const allIndexes = Array.from({ length: count }, (_, i) => i + 1);
  let bag = shuffleNumbers(allIndexes);
  const lastIndex = lastCommentaryIndex[kind];

  // Avoid a boundary repeat, e.g. Goal 4 being the last clip of one bag and
  // the first clip of the next bag. This keeps the experience feeling fresh
  // even after a long tournament has used every phrase once.
  if (count > 1 && bag[0] === lastIndex) {
    const swapIndex = bag.findIndex((value) => value !== lastIndex);
    if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
  }

  commentaryBags[kind] = bag;
}

function nextCommentaryIndex(kind: CommentaryKind): number {
  if (commentaryBags[kind].length === 0) refillCommentaryBag(kind);
  const next = commentaryBags[kind].shift() ?? 1;
  lastCommentaryIndex[kind] = next;
  return next;
}

function refillCrowdBag(kind: CommentaryKind) {
  const count = CROWD_SFX_COUNTS[kind];
  const allIndexes = Array.from({ length: count }, (_, i) => i + 1);
  let bag = shuffleNumbers(allIndexes);
  const lastIndex = lastCrowdIndex[kind];

  // Avoid playing the same crowd roar/gasp/boo twice across a bag reset.
  if (count > 1 && bag[0] === lastIndex) {
    const swapIndex = bag.findIndex((value) => value !== lastIndex);
    if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
  }

  crowdBags[kind] = bag;
}

function nextCrowdIndex(kind: CommentaryKind): number {
  if (crowdBags[kind].length === 0) refillCrowdBag(kind);
  const next = crowdBags[kind].shift() ?? 1;
  lastCrowdIndex[kind] = next;
  return next;
}

export function resetCommentaryVarietyHistory(kind?: CommentaryKind) {
  const kinds: CommentaryKind[] = kind ? [kind] : ["goal", "save", "miss", "tackle"];
  kinds.forEach((entry) => {
    commentaryBags[entry] = [];
    delete lastCommentaryIndex[entry];
  });
}

export function resetCrowdVarietyHistory(kind?: CommentaryKind) {
  const kinds: CommentaryKind[] = kind ? [kind] : ["goal", "save", "miss", "tackle"];
  kinds.forEach((entry) => {
    crowdBags[entry] = [];
    delete lastCrowdIndex[entry];
  });
}

export function playRandomCommentary(kind: CommentaryKind): HTMLAudioElement | null {
  const index = nextCommentaryIndex(kind);
  const label = kind === "goal" ? "Goal" : kind === "save" ? "Save" : kind === "miss" ? "Miss" : "Tackle";
  return playSfxFile(`commentary${label}${index}.mp3`, {
    channel: "commentary",
    volume: kind === "tackle" ? 0.92 : 0.90,
    restartChannel: true,
  });
}

export function playRandomCrowd(kind: CommentaryKind): HTMLAudioElement | null {
  const index = nextCrowdIndex(kind);
  const label = kind === "goal" ? "Goal" : kind === "save" ? "Save" : kind === "miss" ? "Miss" : "Tackle";
  return playSfxFile(`crowd${label}${index}.mp3`, {
    channel: "crowd",
    // Crowd sits under the commentary and over the background music.
    volume: kind === "goal" ? 0.72 : kind === "tackle" ? 0.62 : 0.66,
    restartChannel: true,
  });
}

export async function playTackleImpactSequence(): Promise<void> {
  if (muted || typeof window === "undefined") return;

  // Hotfix 61: the referee whistle and crowd reaction fire together at the
  // exact tackle impact. The shuffled commentary follows immediately after
  // the whistle finishes so the spoken line remains clear and readable.
  playRandomCrowd("tackle");
  await playSfxFileAndWait("whistle.mp3", {
    channel: "misc",
    volume: 0.96,
    restartChannel: true,
    maxWaitMs: 2600,
  });

  if (muted) return;

  // Wait for the complete spoken phrase before resolving. TackleScene uses this
  // promise to hold the transition into PenaltyScene, preventing longer funny
  // commentary clips from being cut off by the next authoritative phase update.
  const index = nextCommentaryIndex("tackle");
  await playSfxFileAndWait(`commentaryTackle${index}.mp3`, {
    channel: "commentary",
    volume: 0.96,
    restartChannel: true,
    maxWaitMs: 9000,
  });
}

export function playPlayerName(playerCharacterName: string): HTMLAudioElement | null {
  const fileName = PLAYER_NAME_FILE_OVERRIDES[playerCharacterName] ?? `${playerCharacterName}.mp3`;
  const restoreVolume = desiredTrack ? VOLUMES[desiredTrack] : (audio?.volume ?? 0);
  const shouldDuckMusic = Boolean(audio && !audio.paused && !muted);
  if (shouldDuckMusic && audio) audio.volume = Math.min(audio.volume, 0.16);

  const clip = playSfxFile(fileName, {
    channel: "playerName",
    volume: 1.0,
    restartChannel: true,
  });
  if (clip && shouldDuckMusic) {
    const restore = () => {
      if (!muted && desiredTrack && audio) void fadeTo(restoreVolume, 180);
    };
    clip.addEventListener("ended", restore, { once: true });
    clip.addEventListener("error", restore, { once: true });
  }
  return clip;
}

export async function playWinnerAnnouncement(playerCharacterName: string): Promise<void> {
  if (muted || typeof window === "undefined") return;

  stopSfxChannel("winner");
  stopSfxChannel("playerName");
  stopSfxChannel("crowd");

  // Hotfix 57: make the final announcement stand out. The SFX are at/near
  // full volume and the results background music ducks briefly underneath the
  // sequence, then restores afterwards.
  const shouldDuckMusic = Boolean(audio && !audio.paused && !muted);
  const restoreVolume = desiredTrack ? VOLUMES[desiredTrack] : (audio?.volume ?? 0);
  if (shouldDuckMusic) await fadeTo(Math.min(audio?.volume ?? 0.24, 0.24), 140);

  try {
    const playerFileName = PLAYER_NAME_FILE_OVERRIDES[playerCharacterName] ?? `${playerCharacterName}.mp3`;
    await playSfxFileAndWait("and the winner is.mp3", {
      channel: "winner",
      volume: 1.0,
      restartChannel: true,
      maxWaitMs: 3600,
    });
    await playSfxFileAndWait(playerFileName, {
      channel: "winner",
      volume: 1.0,
      restartChannel: true,
      maxWaitMs: 3600,
    });

    const crowdIndex = nextCrowdIndex("goal");
    await playSfxFileAndWait(`crowdGoal${crowdIndex}.mp3`, {
      channel: "crowd",
      volume: 0.96,
      restartChannel: true,
      maxWaitMs: 5000,
    });
  } finally {
    if (shouldDuckMusic && !muted && desiredTrack) {
      await fadeTo(restoreVolume, 260);
    }
  }
}
