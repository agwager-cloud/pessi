# Hotfix 71 — Tackle Variety, Timer Panel and Play Again

## Changes

- Expanded tackle styles from three to six:
  - slide tackle
  - flying kick
  - spin kick
  - shoulder charge
  - cartwheel tackle
  - scissor kick
- Added six server-selected flop styles so the result is genuinely different each tackle:
  - barrel roll
  - helicopter
  - starfish
  - backflip
  - ragdoll
  - somersault
- Added distinct pose, rotation, scale, trail colour and impact label for every tackle style.
- Enlarged the bot-shot countdown panel and moved its detail/locked text upward so it stays inside the frame.
- Fixed PLAY AGAIN in FinalResultsScene:
  - preserves the same connected humans, bots, selected characters and tournament size
  - clears scores, wins, eliminations and previous bracket state
  - randomises first-round matchups
  - routes everyone directly to TournamentScene
- BACK TO LOBBY still returns everyone to LobbyScene.

## Deployment

This hotfix changes client and server code. Push the source update to GitHub/Render and upload the itch.io ZIP.
