# Hotfix 58 — Simultaneous Human Matches

## Major update
All matches involving at least one human now run simultaneously within each tournament round.

## Behaviour
- Every active human is assigned directly to their own match when the host begins the round.
- Human vs human and human vs bot matches run independently at the same time.
- Bot-only matches still auto-resolve immediately.
- Each match has its own tackle state, penalty state, shot clock, scores, shootout progression, result and timer.
- Controls are routed only to the sender's assigned match.
- Goalkeeper choices remain hidden from the opposing kicker.
- Eliminated players and players whose match has finished return to the live tournament bracket while other matches continue.
- The round advances only after every independent match has finished.

## Preserved
Render/itch.io connection behaviour, audio/commentary, winner sequence, Stay Middle default aim, player roster fixes, bot-only auto-resolution and all Hotfix 57 changes.
