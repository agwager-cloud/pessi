# Hotfix 72 — Tackle Commentary Completion

- The tackle audio sequence now waits for the entire commentary clip to finish.
- Penalty-phase state updates are queued while tackle commentary is still playing.
- PenaltyScene opens immediately after the spoken phrase completes.
- Whistle and crowd timing remains unchanged.
- No server gameplay logic was changed.
