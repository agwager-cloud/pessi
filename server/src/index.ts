import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { GameRoom, type ClientSocket } from "./GameRoom.js";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(cors());
app.use(express.json());

const rooms = new Map<string, GameRoom>();

function makeCode(): string {
  let roomCode = "";
  do {
    roomCode = String(Math.floor(10000 + Math.random() * 90000));
  } while (rooms.has(roomCode));
  return roomCode;
}

app.get("/", (_req, res) => {
  res.json({ ok: true, game: "Pessi's Pens", websocketPath: "/ws", health: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, game: "Pessi's Pens", rooms: rooms.size });
});

app.get("/api/room-by-code/:code", (req, res) => {
  const exists = rooms.has(String(req.params.code));
  if (!exists) return res.status(404).json({ error: "Room not found" });
  return res.json({ roomCode: String(req.params.code) });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url ?? "/ws", `http://${req.headers.host ?? "localhost"}`);
  const isHost = url.searchParams.get("host") === "1";
  const requestedCode = url.searchParams.get("roomCode")?.trim() ?? "";
  const name = url.searchParams.get("name") ?? "Player";
  const characterIndex = Number(url.searchParams.get("characterIndex") ?? 0);

  let room: GameRoom | undefined;
  if (isHost) {
    const roomCode = makeCode();
    room = new GameRoom(roomCode);
    rooms.set(roomCode, room);
  } else {
    room = rooms.get(requestedCode);
  }

  if (!room) {
    ws.send(JSON.stringify({ type: "error", data: "Room code not found" }));
    ws.close();
    return;
  }

  const client: ClientSocket = { sessionId: randomUUID(), ws };
  ws.send(JSON.stringify({ type: "welcome", data: { sessionId: client.sessionId, roomCode: room.roomCode } }));
  room.join(client, { name, characterIndex });

  ws.on("message", (buffer) => {
    try {
      const msg = JSON.parse(buffer.toString());
      room?.receive(client, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", data: "Invalid message" }));
    }
  });

  ws.on("close", () => {
    room?.leave(client.sessionId);
    if (room?.isEmpty()) {
      room.dispose();
      rooms.delete(room.roomCode);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Pessi's Pens server listening on 0.0.0.0:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`WebSocket path: /ws`);
  console.log(`Local network clients should use http://<this-computer-ip>:5173 and ws://<this-computer-ip>:2567/ws`);
});
