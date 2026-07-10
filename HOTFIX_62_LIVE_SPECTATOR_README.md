# Pessi's Pens — Hotfix 62: Live Human Match Spectator Mode

## What changed

- Eliminated players and players waiting after finishing their own match can watch any other live human match.
- Tournament bracket cards now show `LIVE • TAP TO WATCH` while a human match is active.
- The bracket shows live round progress, for example `3 of 4 complete`.
- Spectators receive the watched match's live tackle, penalty, score and result state.
- Spectator mode is read-only. Existing server-side action validation still permits only the actual kicker or goalkeeper to act.
- A `BRACKET` button is shown during live spectating so the viewer can switch matches or return to the waiting screen.
- When a watched match finishes, its spectators automatically return to the TournamentScene.
- Players who are still actively playing their own match cannot leave it to spectate another match.

## Regression protection

The update does not change:

- simultaneous human match runtimes
- penalty/tackle resolution
- tournament advancement
- bot-only auto simulation
- audio sequencing and routing
- LAN, Render or itch.io connection logic

## Build verification

The full workspace production build completed successfully:

```text
npm run build
```

## Deployment

This update changes both server and client code.

- Push the source update to GitHub so Render redeploys the server.
- Upload the new itch.io ZIP to the existing itch.io project.
