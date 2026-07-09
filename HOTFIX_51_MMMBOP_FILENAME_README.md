# Pessi's Pens — Hotfix 51: MmmBop-pe filename fix

## Purpose
Fixes the player-name audio preview for **MmmBop-pé** by avoiding the accented filename in the requested audio path.

## What changed
- `client/src/audio/audio.ts`
  - Updated the player-name override:
    - character display name: `MmmBop-pé`
    - audio file requested by game: `MmmBop-pe.mp3`
  - Bumped the SFX cache-buster from `v50` to `v51` so browsers request the updated file.
- Added/renamed audio asset:
  - `client/public/assets/audio/MmmBop-pe.mp3`
  - `client/dist/assets/audio/MmmBop-pe.mp3`
- Rebuilt the client so `client/dist/assets/index-DAFn8SaC.js` contains the new filename mapping.

## Notes
The old files can safely remain, but if you want to tidy the audio folder you may delete these if present:
- `MmmBop-pé.mp3`
- `MmmBop-p#U00e9.mp3`

The game will now request only:
- `MmmBop-pe.mp3`

## Build check
`npm run build` passed.
