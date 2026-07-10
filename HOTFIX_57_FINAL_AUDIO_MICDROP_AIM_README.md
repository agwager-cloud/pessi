# Hotfix 57 — Final Audio Volume, Mic-drop Jersey, Default Aim

## Changes

1. Final Results winner announcement is louder and clearer:
   - "and the winner is.mp3" now plays at full volume.
   - Winning player name audio now plays at full volume.
   - Crowd goal cheer now plays louder.
   - Results background music ducks briefly under the announcement sequence, then restores.

2. Mic-drop Mayonnaise jersey number changed:
   - France #1 → France #16

3. Default penalty aim changed:
   - New penalty shots now start on STAY MIDDLE.
   - This prevents quick human shots from defaulting away from the keeper.

## Build status

Built successfully with:

```bash
npm run build
npm run zip:itch
```

Only the normal Vite large bundle warning appeared.

## Apply locally

Extract this hotfix zip into:

```text
C:\Projects\pessi
```

Then run:

```powershell
cd C:\Projects\pessi
npm run build
git status
git add .
git commit -m "Hotfix 57 final audio micdrop aim"
git push
```

Upload the included/new itch.io zip separately to itch.io.
