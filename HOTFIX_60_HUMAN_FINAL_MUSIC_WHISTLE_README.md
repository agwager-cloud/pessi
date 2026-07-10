# Hotfix 60 — Human Final Results Music + Tackle Whistle

## Fixed human-final results music

Human-played finals could leave `background.mp3` running because the final winner announcement attempted to duck the shared music element while the penalty-to-results crossfade was still active. The new fade cancelled the old fade interval without resolving its Promise, leaving the music switch state machine stuck.

Hotfix 60 now:

- resolves interrupted fades safely
- allows the pending switch to `backgroundResults.mp3` to finish
- gives the results track a short head start before the winner announcement
- reasserts the results track immediately before the announcement
- preserves bot-final winner audio behaviour

Tournament, live bracket, round-results and final-results screens use `backgroundResults.mp3`.

## Added tackle whistle sequence

Added:

`client/public/assets/audio/whistle.mp3`

At tackle impact, audio now plays in this order:

1. `whistle.mp3`
2. a shuffled random tackle commentary clip
3. a shuffled random `crowdTackle` clip

The commentary and crowd reaction begin together after the whistle finishes.

## Deployment

This hotfix changes client code and a client audio asset only. Render does not require a server deployment. A GitHub push is optional for repository synchronisation.
