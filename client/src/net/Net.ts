import type { PublicState } from "../types";

// Published backend URL.
// For your first Render deploy, use a service slug like:
//   https://pessis-pens-server.onrender.com
// If Render gives you a different URL, build the client with:
//   npm run build -w client -- --mode production
// after creating client/.env.production with:
//   VITE_RENDER_SERVER_URL=https://your-render-service.onrender.com
const DEFAULT_RENDER_SERVER_URL = "https://pessis-pens-server.onrender.com";

function configuredRenderServerUrl(): string {
  const envUrl = import.meta.env.VITE_RENDER_SERVER_URL || import.meta.env.VITE_WS_SERVER_URL;
  const raw = String(envUrl || DEFAULT_RENDER_SERVER_URL).trim();
  return raw.replace(/\/$/, "");
}

function isPrivateLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("10.")) return true;

  // Private 172.16.0.0 to 172.31.255.255 range.
  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const secondOctet = Number(match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function websocketUrl(): string {
  const host = window.location.hostname;
  const protocol = window.location.protocol;

  // Local classroom testing:
  // - On the host computer, http://localhost:5173 connects to localhost:2567.
  // - On iPad/phone, http://192.168.x.x:5173 connects back to the host computer IP,
  //   not the device's own localhost.
  if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:2567/ws";
  if (isPrivateLanHost(host)) return `ws://${host}:2567/ws`;

  // Published itch.io pages are HTTPS, so browsers require secure WebSockets.
  // The Render URL starts as https://... and becomes wss://.../ws here.
  if (protocol === "https:") return `${configuredRenderServerUrl().replace(/^http/, "ws")}/ws`;

  // Fallback for unusual non-HTTPS test hosts.
  return `ws://${host}:2567/ws`;
}

type StateHandler = (state: PublicState) => void;

class NetService {
  socket: WebSocket | null = null;
  state: PublicState | null = null;
  sessionId = "";
  private handlers = new Set<StateHandler>();

  onState(handler: StateHandler): () => void {
    this.handlers.add(handler);
    if (this.state) handler(this.state);
    return () => this.handlers.delete(handler);
  }

  async host(name: string, characterIndex: number) {
    await this.connect({ host: "1", name, characterIndex: String(characterIndex) });
  }

  async joinByCode(name: string, roomCode: string, characterIndex: number) {
    await this.connect({ roomCode: roomCode.trim(), name, characterIndex: String(characterIndex) });
  }

  send(type: string, data?: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  leave() {
    this.socket?.close();
    this.socket = null;
    this.state = null;
    this.sessionId = "";
  }

  private connect(params: Record<string, string>): Promise<void> {
    this.leave();
    const qs = new URLSearchParams(params);
    const ws = new WebSocket(`${websocketUrl()}?${qs.toString()}`);
    this.socket = ws;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Connection timed out"));
          ws.close();
        }
      }, 8000);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "welcome") {
          this.sessionId = msg.data.sessionId;
          return;
        }
        if (msg.type === "state") {
          this.emit(msg.data);
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            resolve();
          }
          return;
        }
        if (msg.type === "error") {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            reject(new Error(String(msg.data)));
          }
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        }
      };

      ws.onclose = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(new Error("Connection closed"));
        }
      };
    });
  }

  private emit(state: PublicState) {
    this.state = state;
    for (const handler of this.handlers) handler(state);
  }
}

export const Net = new NetService();
