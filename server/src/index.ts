import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { GameRoom, type ClientSocket } from "./GameRoom.js";

const port = Number(process.env.PORT ?? 2567);
const rooms = new Map<string, GameRoom>();
const hostRequestRooms = new Map<string, string>();
const emptyRoomCleanupTimers = new Map<string, NodeJS.Timeout>();
const EMPTY_ROOM_GRACE_MS = 120_000;

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
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function statusPayload() {
  return {
    ok: true,
    ready: true,
    game: "Pessi's Pens",
    rooms: rooms.size,
    websocketPath: "/ws",
  };
}

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/" || url.pathname === "/api/status" || url.pathname === "/health") {
    sendJson(res, 200, statusPayload());
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

function removeHostRequestMappings(roomCode: string): void {
  for (const [requestId, mappedCode] of hostRequestRooms) {
    if (mappedCode === roomCode) hostRequestRooms.delete(requestId);
  }
}

function cancelEmptyRoomCleanup(roomCode: string): void {
  const timer = emptyRoomCleanupTimers.get(roomCode);
  if (!timer) return;
  clearTimeout(timer);
  emptyRoomCleanupTimers.delete(roomCode);
}

function scheduleEmptyRoomCleanup(room: GameRoom): void {
  cancelEmptyRoomCleanup(room.roomCode);
  const timer = setTimeout(() => {
    emptyRoomCleanupTimers.delete(room.roomCode);
    if (!room.isEmpty()) return;
    room.dispose();
    rooms.delete(room.roomCode);
    removeHostRequestMappings(room.roomCode);
  }, EMPTY_ROOM_GRACE_MS);
  emptyRoomCleanupTimers.set(room.roomCode, timer);
}

function getOrCreateHostRoom(requestId: string): GameRoom {
  if (requestId) {
    const existingCode = hostRequestRooms.get(requestId);
    const existingRoom = existingCode ? rooms.get(existingCode) : undefined;
    if (existingRoom) {
      cancelEmptyRoomCleanup(existingRoom.roomCode);
      return existingRoom;
    }
  }

  const roomCode = makeCode();
  const room = new GameRoom(roomCode);
  rooms.set(roomCode, room);
  if (requestId) hostRequestRooms.set(requestId, roomCode);
  return room;
}

const server = createServer(handleHttp);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url ?? "/ws", `http://${req.headers.host ?? "localhost"}`);
  const isHost = url.searchParams.get("host") === "1";
  const requestId = url.searchParams.get("requestId")?.trim() ?? "";
  const requestedCode = url.searchParams.get("roomCode")?.trim() ?? "";
  const name = url.searchParams.get("name") ?? "Player";

  const room = isHost ? getOrCreateHostRoom(requestId) : rooms.get(requestedCode);

  if (!room) {
    ws.send(JSON.stringify({ type: "error", data: "Room code not found" }));
    ws.close();
    return;
  }

  cancelEmptyRoomCleanup(room.roomCode);
  const client: ClientSocket = { sessionId: randomUUID(), ws };

  ws.send(
    JSON.stringify({
      type: "welcome",
      data: { sessionId: client.sessionId, roomCode: room.roomCode },
    }),
  );

  room.join(client, { name });

  ws.on("message", (buffer) => {
    try {
      const msg = JSON.parse(buffer.toString());
      room.receive(client, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", data: "Invalid message" }));
    }
  });

  ws.on("close", () => {
    room.leave(client.sessionId);
    if (room.isEmpty()) scheduleEmptyRoomCleanup(room);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Pessi's Pens server listening on 0.0.0.0:${port}`);
  console.log(`Status endpoint: http://localhost:${port}/api/status`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log("WebSocket path: /ws");
  console.log("Local network clients should use http://<this-computer-ip>:5173 and ws://<this-computer-ip>:2567/ws");
});
