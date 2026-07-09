# Pessi's Pens — Hotfix 52: No repeated commentary phrases

## What changed

This hotfix improves commentary variety without touching the stable background music system.

Changed file:

```text
client/src/audio/audio.ts
```

Updated build files:

```text
client/dist/index.html
client/dist/assets/index-2ATpZbaL.js
client/dist/assets/index-CcJQ6HRm.css
```

## Behaviour

Each commentary type now uses a shuffled "bag" system:

- `commentaryGoal1.mp3` to `commentaryGoal8.mp3`
- `commentarySave1.mp3` to `commentarySave8.mp3`
- `commentaryMiss1.mp3` to `commentaryMiss8.mp3`
- `commentaryTackle1.mp3` to `commentaryTackle12.mp3`

The game will play every available clip in that category once before repeating any phrase.
After all clips in a category have been used, the bag refills and reshuffles.
The first clip in a new bag is also prevented from being the same as the final clip from the previous bag when possible.

## MmmBop-pé filename cleanup

Yes, you can delete the old accented/weird filename versions from your audio folder if this file is present and working:

```text
client/public/assets/audio/MmmBop-pe.mp3
```

Safe to delete if they exist:

```text
client/public/assets/audio/MmmBop-pé.mp3
client/public/assets/audio/MmmBop-p#U00e9.mp3
```

Do not delete:

```text
client/public/assets/audio/MmmBop-pe.mp3
```

## Build check

Ran:

```bash
npm run build
```

Result: passed.
