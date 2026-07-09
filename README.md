# Pessi's Pens - Hotfix 49: Penalty Card Full Names

Changed file:
- client/src/scenes/PenaltyScene.ts

Fixes:
- Penalty score-card names no longer use ellipses for long names.
- Long names now wrap naturally across two lines inside the score-card.
- Font size gently reduces only for longer names, keeping names readable on iPad/phone.
- The matchup text under the penalty header now shows full player names instead of shortened names.
- The shot result sentence also uses full player names.

Build check:
- npm run build completed successfully in the repaired project workspace.

Apply:
- Copy the included client folder over your project folder.
- Restart npm run dev.
- Hard refresh the browser if needed.
