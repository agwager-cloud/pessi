# Pessi's Pens — Hotfix 74

## Final progression and live connection recovery

This hotfix addresses the situation where the tournament reached the completed semi-final results screen but the host could not progress into the final.

### Investigation findings

The screenshot did not show a Phaser rendering exception. It showed a WebSocket closing warning while the game was still displaying the last authoritative Round 2 state. In the previous client, if the live socket dropped after the classroom had already loaded, the Start Next Round button silently did nothing because `Net.send()` only sent while the socket was open. The displayed bracket remained on screen, which looked like a game crash.

The previous server also used player session IDs generated separately for each WebSocket. A retry could therefore create a second temporary player, remove the wrong retry player when an older socket closed, or transfer host control away from the teacher. The next-round builder was also compact and did not repair a partial final bracket transition.

### Changes

- Added a browser-level WebSocket recovery layer loaded before the Phaser bundle.
- Uses one stable random player token for the page session.
- Automatically reconnects a dropped classroom connection for up to 45 seconds.
- Queues host progression clicks during recovery, including Start Next Round and Begin Round.
- Reuses the same server-side player record and host identity after reconnecting.
- Ignores delayed close events from an older retry socket after a replacement socket is active.
- Keeps a disconnected host reserved for 30 seconds before transferring host control.
- Keeps pre-game disconnected players for 45 seconds to allow a safe retry.
- Builds the next bracket round from sorted, completed matches only.
- Validates that every completed match has a winner.
- Repairs a partial next-round bracket instead of leaving the tournament frozen.
- Uses a deterministic one-match check to recognise completion of the final.
- Prevents duplicate final matches from repeated or delayed Start Next Round messages.

### Files changed

- `server/src/GameRoom.ts`
- `server/src/index.ts`
- `server/dist/GameRoom.js`
- `server/dist/index.js`
- `client/index.html`
- `client/public/network-recovery.js`
- `client/dist/index.html`
- `client/dist/network-recovery.js`

### Validation

- Server JavaScript syntax checks passed.
- Network recovery script syntax check passed.
- An automated 8-player bracket test successfully advanced from two completed semi-finals into one final.
- Repeating the next-round command did not create a duplicate final.
- Completing the final moved the room into `finalResults`.
- A stale retry socket closing after a replacement socket connected did not disconnect the active player or rewind the tournament phase.
