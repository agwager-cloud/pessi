# Pessi's Pens — Hotfix 50 Sound Integration

## What this hotfix changes

- Keeps the existing background music system intact.
- Adds a separate short SFX/commentary layer that plays over the top of background music.
- Plays one random commentary clip on penalty goals, saves, and misses.
- Plays one random tackle commentary clip shortly after tackle impact.
- Plays the selected footballer's name when cycling characters on the StartScene.
- Stops commentary/name clips on scene shutdown or when the global sound toggle is muted.
- Fails safely if a sound file is missing, so missing future crowd files should not crash the game.

## Changed source files

- client/src/audio/audio.ts
- client/src/scenes/StartScene.ts
- client/src/scenes/PenaltyScene.ts
- client/src/scenes/TackleScene.ts

## Audio files

This hotfix includes the uploaded commentary and player-name MP3 files in:

- client/public/assets/audio/
- client/dist/assets/audio/

Crowd noise is not wired yet because the crowd files have not been added.

## Test checklist

1. Run `npm run build`.
2. Start locally with `npm run dev`.
3. On StartScene, cycle footballers with the arrow buttons and confirm names play.
4. Enter a penalty result and confirm goal/save/miss commentary plays over `background.mp3`.
5. Enter the tackle scene and confirm tackle commentary plays once after impact.
6. Toggle sound off and confirm background music and commentary/name sounds stop.
7. Confirm Start/Lobby/Tournament/Tackle/Penalty/Results music routing still works.
