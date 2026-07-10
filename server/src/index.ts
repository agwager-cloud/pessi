import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { GameRoom, type ClientSocket } from "./GameRoom.js";

const port = Number(process.env.PORT ?? 2567);
const rooms = new Map<string, GameRoom>();

function makeCode(): string {
  let code = "";
  do {
    code = String(Math.floor(10000 + Math.random() * 90000));
  } while (rooms.has(code));
  return code;
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/") {
    sendJson(res, 200, {
      ok: true,
      game: "Pessi's Pens",
      websocketPath: "/ws",
      health: "/health",
    });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      game: "Pessi's Pens",
      rooms: rooms.size,
    });
    return;
  }

  const roomByCodeMatch = url.pathname.match(/^\/api\/room-by-code\/([^/]+)$/);
  if (roomByCodeMatch) {
    const code = decodeURIComponent(roomByCodeMatch[1] ?? "");
    if (!rooms.has(code)) {
      sendJson(res, 404, { error: "Room not found" });
      return;
    }
    sendJson(res, 200, { roomCode: code });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = createServer(handleHttp);
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

  ws.send(
    JSON.stringify({
      type: "welcome",
      data: { sessionId: client.sessionId, roomCode: room.roomCode },
    }),
  );

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
  console.log("WebSocket path: /ws");
  console.log("Local network clients should use http://<this-computer-ip>:5173 and ws://<this-computer-ip>:2567/ws");
});
