# Pessi's Pens Hotfix 73 — School Network / Render Wake Recovery

## Fixed

- Confirmed the client was not using `/health`; its failure came from relying on one long WebSocket attempt that could fail immediately in a filtered normal browser window.
- Added neutral `GET /api/status` and `GET /` readiness endpoints.
- Added a shared 100-second wake-and-connect window for Render free-tier cold starts.
- Added controlled secure-WebSocket retries instead of failing on the first blocked or early connection attempt.
- Added an idempotent host request ID so a retry cannot create multiple classroom rooms.
- Added a two-minute empty-room grace period so a host connection retry can safely return to the same room.
- Kept the production fallback fixed to `https://pessis-pens-server.onrender.com`.
- Preserved localhost and local-network testing for phones and iPads.
- Added a fixed in-game connection card with progress, elapsed time, and teacher-friendly messages.
- Added a clearer normal-window versus InPrivate/Incognito troubleshooting message.

## Deployment

This hotfix changes both the client and server.

1. Replace the existing project files with this hotfix.
2. Commit and push to GitHub so Render redeploys the server.
3. After Render reports a successful deployment, upload the separate itch.io ZIP.

No new environment variables are required.
