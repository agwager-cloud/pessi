# Pessi's Pens — Render + itch.io Publishing Notes

## What changed in this publishing hotfix

- `server/src/index.ts` already used `process.env.PORT`; it now also has a simple `/` status route and clearer startup logs.
- `client/src/net/Net.ts` keeps LAN testing working, but published HTTPS pages now connect to the Render backend using `wss://.../ws`.
- `client/vite.config.ts` sets `base: "./"`, which is important for itch.io because the game is served from a nested URL.
- `render.yaml` was added as an optional Render Blueprint configuration.
- `client/.env.production.example` was added so the Render URL can be changed without editing source code.

## Render settings

Create a Render Web Service from the GitHub repo.

Use these settings if configuring manually:

- Root directory: leave blank / project root
- Runtime: Node
- Build command: `npm install && npm run build -w shared && npm run build -w server`
- Start command: `npm run start -w server`
- Health check path: `/health`

The server listens on `process.env.PORT`, which Render provides automatically.

Expected WebSocket URL after deployment:

`wss://pessis-pens-server.onrender.com/ws`

If your Render URL is different, create `client/.env.production` before building the itch ZIP:

```env
VITE_RENDER_SERVER_URL=https://your-render-service.onrender.com
```

## itch.io build

From the project root:

```bash
npm install
npm run build
npm run zip:itch
```

Upload:

`dist/pessis-pens-itch.zip`

The ZIP has `index.html` at the top level.

## Local testing still works

```bash
npm run dev
```

Computer:

`http://localhost:5173/`

Phone/iPad on same Wi-Fi:

`http://192.168.68.68:5173/`
