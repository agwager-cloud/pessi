# Pessi's Pens Hotfix 56 — Render Wake-Up, Michael Police, Winner Audio

## What changed

1. StartScene online connection UX
   - Host/Join buttons now lock while connecting so users cannot spam the Render server.
   - Published itch.io builds show a clear message that the free online server may take up to 60 seconds to wake up.
   - Published WebSocket timeout increased to 75 seconds.
   - Local/LAN timeout remains shorter for classroom testing.

2. Player rename
   - Removed the in-game reference to Michael Old-lease / Michael Old-Lease.
   - Replaced with Michael Police.
   - Country remains France.
   - Jersey remains #11.
   - Added `Michael Police.mp3`.

3. FinalResultsScene winner announcement
   - When the final results scene loads, it now plays:
     1. `and the winner is.mp3`
     2. the winning footballer's name MP3
     3. one random `crowdGoal` cheer
   - The sequence plays over `backgroundResults.mp3`.
   - It plays once per final-results scene load.

4. Render server cleanup
   - Server now uses Node's built-in HTTP server instead of Express.
   - Runtime dependency issue with Express/body-parser is avoided.
   - Render build settings are updated in `render.yaml`.

## Important local cleanup

A zip extraction cannot delete old local files. After extracting this hotfix, run this once in PowerShell:

```powershell
cd C:\Projects\pessi
Remove-Item "client\public\assets\audio\Michael Old-Lease.mp3" -ErrorAction SilentlyContinue
Remove-Item "client\dist\assets\audio\Michael Old-Lease.mp3" -ErrorAction SilentlyContinue
Remove-Item "client\public\assets\audio\heartbeat.mp3" -ErrorAction SilentlyContinue
Remove-Item "client\dist\assets\audio\heartbeat.mp3" -ErrorAction SilentlyContinue
```

## Build test

This hotfix was built successfully with:

```bash
npm run build
npm run zip:itch
```

The Vite large bundle warning still appears, but the build succeeds.
