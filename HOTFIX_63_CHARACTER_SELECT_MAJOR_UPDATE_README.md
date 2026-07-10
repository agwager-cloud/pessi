# Pessi's Pens — Hotfix 63 Major Character Selection Update

## Main changes

- Added a dedicated `CharacterSelectScene` between StartScene and LobbyScene.
- The scene uses the same `lobbyBg.jpg` background as LobbyScene.
- `backgroundStartLobby.mp3` continues seamlessly through StartScene, CharacterSelectScene and LobbyScene.
- All 36 footballers are displayed together in a 9 × 4 touch-friendly grid.
- Every card displays the footballer sprite, jersey number, character name and country.
- Taken characters are greyed out and marked `UNAVAILABLE` for all other connected players.
- Character reservations are server-authoritative: first confirmed request wins.
- If two players tap the same character at nearly the same time, the second player remains on the selection screen and receives a clear “just taken” warning.
- The selected player is highlighted as `YOUR PLAYER` rather than appearing disabled.
- Character name audio now plays only after the server confirms the selection.
- Character selection and name playback were removed from StartScene.
- StartScene now focuses only on name entry, hosting and joining by room code.
- A player who joins an existing lobby chooses a character before entering the lobby.
- Disconnected players release their reservation while selection is active.
- Added a host-only `CHANGE PLAYERS` button to FinalResultsScene.
- `CHANGE PLAYERS` keeps the room and player names, clears bots and old reservations, then sends every connected human back to CharacterSelectScene.
- Once all connected humans have selected new players, everyone automatically returns to LobbyScene.
- Existing tournament, simultaneous human matches, spectator mode, commentary, crowd audio and winner audio remain intact.

## Server update required

Yes. Character reservations and the new `changePlayers` flow are server-authoritative, so Render must redeploy after the Git push.

## Recommended tests

1. Host selects a player and enters the lobby.
2. A second device joins and sees the host's player greyed out.
3. Two devices tap the same available player at nearly the same time.
4. Confirm only one receives the player and the other gets the warning.
5. Disconnect during selection and confirm the player becomes available again.
6. Finish a tournament and use `CHANGE PLAYERS` as host.
7. Confirm all humans return to selection and the lobby music continues.
8. Confirm `PLAY AGAIN` still returns directly to the lobby with current players.
9. Test LAN, Render and itch.io builds.
