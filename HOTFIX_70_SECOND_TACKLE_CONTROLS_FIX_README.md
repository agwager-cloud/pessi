# Hotfix 70 — Second Tackle Controls Fix

## Problem

The first tackle scene displayed working DODGE/CHASE controls, but after the first penalty the second tackle scene had no movement arrows and felt automatic.

## Root cause

Phaser reuses the existing `TackleScene` object when the game returns to it. The first scene's D-pad display objects were removed during the penalty transition, but the scene-level `controlsCreated` flag remained `true`. The second tackle therefore skipped rebuilding the controls.

The global pointer listeners also remained attached between scene activations, which could create stale touch state over repeated tackles.

## Fix

- Reset `controlsCreated` every time `TackleScene.create()` runs.
- Clear held touch directions and movement timing on each activation.
- Properly unregister state and pointer listeners when the scene shuts down.
- Re-register clean pointer listeners for each tackle.
- Reset cached tackle state and impact audio state between tackle sequences.

## Expected sequence

1. First tackle: both human players receive DODGE/CHASE controls.
2. First penalty.
3. Second tackle: both human players receive fresh DODGE/CHASE controls.
4. Second penalty.

No server gameplay logic was changed in this hotfix.
