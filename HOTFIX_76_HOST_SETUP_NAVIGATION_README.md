# Pessi's Pens — Hotfix 76

## Host setup navigation and unready-player recovery

This hotfix fixes the pre-tournament setup problem where a late student joining the room could pull the host out of the Lobby and back into Character Select.

### Changes

- New/unconfirmed students are routed to Character Select individually.
- A late student no longer changes the whole room phase or removes the host from the Lobby.
- After confirming a footballer, the host automatically enters the Lobby.
- The host can move freely between:
  - **Character Select** using the new `CHARACTER SELECT` button in the Lobby.
  - **Lobby** using the new `GO TO LOBBY` button in Character Select.
- Selected students remain in the Lobby while unselected students continue choosing.
- Unselected students appear as gold `Choosing a player...` cards in the Lobby.
- The host can still select one student card and use `REMOVE SELECTED`.
- A new `REMOVE UNREADY` button removes all students who have not confirmed a footballer, preventing one idle device from blocking the class.
- `START TOURNAMENT` gives a clearer message when unready students remain.
- Hotfixes 73–75 remain included.

## Deployment

This hotfix changes both server and client code.

```powershell
cd C:\Projects\pessi

git add .
git commit -m "Fix host lobby and character select navigation"
git push
```

Wait for Render to deploy, then upload `pessi-hotfix-76-itchio.zip` to itch.io.
