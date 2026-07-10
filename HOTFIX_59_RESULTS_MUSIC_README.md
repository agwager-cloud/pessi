# Hotfix 59 — Results and Tournament Music Routing

## Fixed

Tournament bracket scenes, live-round bracket waiting screens, round-results scenes, and the final-results scene now reliably play:

```text
backgroundResults.mp3
```

Penalty and tackle scenes continue to play:

```text
background.mp3
```

Start and lobby scenes continue to play:

```text
backgroundStartLobby.mp3
```

## Technical change

The shared audio controller now verifies the actual HTMLAudio source rather than relying only on its stored track label. If a rapid scene transition leaves the source pointing at `background.mp3`, it is corrected automatically.

Music selection is also reinforced from the authoritative server phase whenever state routing occurs, preventing an old penalty/tackle scene from leaving the wrong music active after moving to a bracket or results scene.

The audio cache version was advanced to `v59` so browsers and itch.io load the corrected route cleanly.
