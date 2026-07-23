# Pessi's Pens — Hotfix 75

## Penalty timing and multi-device synchronisation

This hotfix keeps all Hotfix 73 school-network recovery and Hotfix 74 final-progression recovery changes, and repairs timing risks in the live penalty scene.

### Problems found

- The server started a human penalty timer before the kicker and goalkeeper devices had finished loading the Penalty scene.
- A bot kicker could begin its countdown before a human goalkeeper had loaded.
- Phones, iPads and computers compared server timestamps against their own device clocks, which could show different countdowns.
- Delayed Shoot or Goalkeeper Pick messages from an earlier penalty had no unique penalty identifier.

Pessi's Pens intentionally does not reveal the kicker's live aim and power to the goalkeeper or spectators. The final shot event remains server-authoritative and is shown identically to everyone after release.

### Changes

- A unique ID is created for every penalty.
- Human participants send `penaltyReady` after loading the Penalty scene.
- The timer starts only after all human participants are ready.
- A 3.5-second fallback starts the timer if a ready message is lost, preventing a freeze.
- Human kickers receive the full existing 22-second penalty window after loading.
- Bot kicks begin their 5.2-second countdown only after any human goalkeeper is ready.
- Every public room state includes `serverNow`, allowing all devices to use the same server clock.
- Shoot and goalkeeper-pick messages include the current penalty ID and stale messages are ignored.
- The pre-built itch.io client includes a compatibility layer that synchronises the existing stable client bundle and adds penalty IDs to outgoing messages.

### Deployment

This hotfix changes both the Render server and itch.io client.

1. Replace the current project files with the complete Hotfix 75 package.
2. Commit and push the project to GitHub so Render redeploys the server.
3. Wait until Render reports the service is live.
4. Upload `pessi-hotfix-75-itchio.zip` to the existing itch.io HTML5 project.

No new environment variables are required.
