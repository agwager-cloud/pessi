# Pessi's Pens — Hotfix 54: Crowd SFX Integration

## Purpose

Adds the uploaded crowd reaction MP3s to the game and wires them into the existing safe SFX layer.

This hotfix does **not** change the stable background music system. Crowd sounds and commentary now play as separate short HTMLAudio SFX layers over the top of the current background music.

## Added audio assets

Added to both:

```text
client/public/assets/audio/
client/dist/assets/audio/
```

Files:

```text
crowdGoal1.mp3
crowdGoal2.mp3
crowdGoal3.mp3
crowdGoal4.mp3
crowdGoal5.mp3
crowdGoal6.mp3

crowdSave1.mp3
crowdSave2.mp3
crowdSave3.mp3

crowdMiss1.mp3
crowdMiss2.mp3
crowdMiss3.mp3

crowdTackle1.mp3
crowdTackle2.mp3
crowdTackle3.mp3
```

## Behaviour

### PenaltyScene

When a penalty result is confirmed:

- Goal: plays one random `crowdGoal1-6` plus one random goal commentary clip.
- Save: plays one random `crowdSave1-3` plus one random save commentary clip.
- Miss: plays one random `crowdMiss1-3` plus one random miss commentary clip.

### TackleScene

When the tackle impact occurs:

- Plays one random `crowdTackle1-3` plus one random tackle commentary clip.

## Variety / no quick repeats

Crowd sounds now use their own shuffled bag system, separate from commentary.

- All 6 goal crowd clips play once before a goal crowd clip repeats.
- All 3 save clips play once before a save clip repeats.
- All 3 miss clips play once before a miss clip repeats.
- All 3 tackle clips play once before a tackle clip repeats.

The same clip is also avoided across bag reset boundaries where possible.

## Changed files

```text
client/src/audio/audio.ts
client/src/scenes/PenaltyScene.ts
client/src/scenes/TackleScene.ts
client/public/assets/audio/crowd*.mp3
client/dist/assets/audio/crowd*.mp3
client/dist/index.html
client/dist/assets/index-*.js
client/dist/assets/index-*.css
```

## Build check

```text
npm run build
✓ passed
```

## Install instructions

Copy the contents of this hotfix zip over the current project folder, replacing existing files when prompted.

Do not delete the existing commentary or player-name audio files; this hotfix only adds crowd reaction files and code.
