# Hotfix 53 — Four New Players + Name Audio

## Summary

Adds four new selectable footballers, bringing the character roster from 32 to 36 while keeping tournament bracket sizes capped at 32.

New players:

- Vozinha-lasagna | Cape Verde | #1
- Neigh-mar | Brazil | #10
- Goose-man Dumbbell-e | France | #7
- Michael Old-lease | France | #11

## Audio

The four uploaded name MP3 files have been added to both:

- `client/public/assets/audio/`
- `client/dist/assets/audio/`

The StartScene player selection name-audio feature will now play the name when these characters are selected.

The display name `Michael Old-lease` maps to the uploaded filename `Michael Old-Lease.mp3` so the on-screen name can stay as requested while still playing the existing MP3 asset.

The SFX cache version was bumped to `v53`.

## Tournament cap

No tournament-size logic was expanded. The allowed tournament sizes remain:

```ts
[2, 4, 8, 16, 32]
```

This means 36 characters are available to choose from, but only up to 32 entrants are included in a tournament bracket.

## Changed files

- `shared/src/index.ts`
- `shared/dist/index.js`
- `shared/dist/index.d.ts`
- `client/src/audio/audio.ts`
- `client/public/assets/audio/Vozinha-lasagna.mp3`
- `client/public/assets/audio/Neigh-mar.mp3`
- `client/public/assets/audio/Goose-man Dumbbell-e.mp3`
- `client/public/assets/audio/Michael Old-Lease.mp3`
- `client/dist/assets/audio/Vozinha-lasagna.mp3`
- `client/dist/assets/audio/Neigh-mar.mp3`
- `client/dist/assets/audio/Goose-man Dumbbell-e.mp3`
- `client/dist/assets/audio/Michael Old-Lease.mp3`
- `client/dist/index.html`
- `client/dist/assets/index-D-VQZidn.js`
- `client/dist/assets/index-CcJQ6HRm.css`

## Build check

`npm run build` passed.
