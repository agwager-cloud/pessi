# Hotfix 64 — Character Select Loading Fix

- Makes `characterSelect` an explicit server room phase when humans enter.
- Adds an immediate visible loading screen to CharacterSelectScene.
- Adds a delayed cached-state retry so an itch.io scene transition cannot leave a blank canvas.
- Makes state-message handling tolerant of stale/older server payloads.
- Renders before scene routing to prevent an empty transition frame.
- Keeps the lobby background and Start/Lobby music routing unchanged.
