# Hotfix 65 — Character Card Layout and Confirm Selection

## Fixes
- Rebuilt the 36-card character grid so names and country/number labels occupy separate reserved areas.
- Reduced footballer sprite scale and card content spacing to prevent overlaps and clipping.
- Added adaptive name font sizing and wrapped/fixed text zones for long names.
- Tapping a footballer now highlights it locally without reserving it immediately.
- Added a large CONFIRM PLAYER button below the grid.
- The server reservation request is only sent after confirmation.
- If another player reserves the same footballer before confirmation, the local selection is cleared safely.
- Preserved server-authoritative first-confirmed, first-served conflict handling.
- Preserved lobby background and Start/Lobby music routing.

## Build
Full shared, server and client production build passed.
