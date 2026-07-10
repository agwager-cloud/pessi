# Hotfix 61 — Tackle Audio Sequence

This client-only hotfix changes the tackle impact audio order.

## New sequence

At the exact moment of the tackle impact:

1. `whistle.mp3` starts.
2. A shuffled random `crowdTackle` sound starts simultaneously.
3. As soon as the whistle finishes, a shuffled random tackle commentary clip plays.

This replaces the Hotfix 60 order where the whistle played alone before both the crowd and commentary.

## Preserved behaviour

- Tackle commentary and crowd clips still use shuffled-bag selection to avoid rapid repeats.
- Tournament/results music routing remains unchanged.
- No server protocol or game-state logic was modified.
- Render does not require a redeployment for this hotfix.
