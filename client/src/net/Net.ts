import type { PublicState } from "../types";

// Published backend URL. Keep a safe built-in default so an itch.io build never
// accidentally tries to use the itch.io page hostname as the multiplayer server.
const DEFAULT_RENDER_SERVER_URL = "https://pessis-pens-server.onrender.com";
const PUBLISHED_CONNECTION_WINDOW_MS = 100_000;
const LOCAL_CONNECTION_WINDOW_MS = 12_000;
const ATTEMPT_TIMEOUT_MS = 14_000;
const RETRY_DELAY_MS = 2_500;

export type ConnectionProgress = {
  elapsedSeconds: number;
  attempt: number;
  progress: number;
  message: string;
};

type ProgressHandler = (progress: ConnectionProgress) => void;
type StateHandler = (state: PublicState) => void;

function configuredRenderServerUrl(): string {
  const envUrl = import.meta.env.VITE_RENDER_SERVER_URL || import.meta.env.VITE_WS_SERVER_URL;
  const raw = String(envUrl || DEFAULT_RENDER_SERVER_URL).trim();
  return raw.replace(/\/$/, "");
}

function isPrivateLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("10.")) return true;

  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const secondOctet = Number(match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function isPublishedConnection(): boolean {
  const host = window.location.hostname;
  return !(host === "localhost" || host === "127.0.0.1" || isPrivateLanHost(host));
}

function websocketUrl(): string {
  const host = window.location.hostname;
  const protocol = window.location.protocol;

  if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:2567/ws";
  if (isPrivateLanHost(host)) return `ws://${host}:2567/ws`;

  if (protocol === "https:") return `${configuredRenderServerUrl().replace(/^http/, "ws")}/ws`;
  return `ws://${host}:2567/ws`;
}

function makeRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Connection failed");
  if (/room code not found/i.test(message)) return "Room code not found. Check the five-digit code and try again.";
  if (/name/i.test(message) && /taken|duplicate/i.test(message)) return message;
  return message;
}

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

  async host(name: string, onProgress?: ProgressHandler) {
    await this.connectWithRetries({ host: "1", name, requestId: makeRequestId() }, "host", onProgress);
  }

  async joinByCode(name: string, roomCode: string, onProgress?: ProgressHandler) {
    await this.connectWithRetries({ roomCode: roomCode.trim(), name }, "join", onProgress);
  }

  isUsingPublishedServer(): boolean {
    return isPublishedConnection();
  }

  publishedServerHost(): string {
    try {
      return new URL(configuredRenderServerUrl()).host;
    } catch {
      return "pessis-pens-server.onrender.com";
    }
  }

  send(type: string, data?: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  leave() {
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    this.state = null;
    this.sessionId = "";
  }

  private async connectWithRetries(
    params: Record<string, string>,
    action: "host" | "join",
    onProgress?: ProgressHandler,
  ): Promise<void> {
    this.leave();

    const published = isPublishedConnection();
    const startedAt = Date.now();
    const totalWindow = published ? PUBLISHED_CONNECTION_WINDOW_MS : LOCAL_CONNECTION_WINDOW_MS;
    let attempt = 0;
    let lastError: unknown = new Error("Connection failed");

    while (Date.now() - startedAt < totalWindow) {
      attempt += 1;
      const elapsed = Date.now() - startedAt;
      const remaining = totalWindow - elapsed;
      const elapsedSeconds = Math.floor(elapsed / 1000);

      onProgress?.({
        elapsedSeconds,
        attempt,
        progress: Math.min(0.96, elapsed / totalWindow),
        message: this.progressMessage(action, attempt, elapsedSeconds),
      });

      // This is deliberately best-effort. Some school browser extensions block
      // background fetches, so failure here must never prevent the real WebSocket.
      if (published && (attempt === 1 || attempt % 4 === 0)) {
        void this.pokePublishedServer(attempt);
      }

      try {
        await this.connectOnce(params, Math.min(ATTEMPT_TIMEOUT_MS, Math.max(2_000, remaining)));
        onProgress?.({
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          attempt,
          progress: 1,
          message: "Classroom connected. Loading the player screen...",
        });
        return;
      } catch (error) {
        lastError = error;
        const text = friendlyError(error);

        // These are real server responses, not a sleeping-server symptom.
        if (/room code not found/i.test(text) || /full|duplicate|already taken/i.test(text)) {
          throw new Error(text);
        }

        this.closeCurrentSocket();
        if (!published) throw new Error(text);
      }

      const afterAttempt = Date.now() - startedAt;
      if (afterAttempt >= totalWindow) break;
      await wait(Math.min(RETRY_DELAY_MS, totalWindow - afterAttempt));
    }

    this.closeCurrentSocket();
    const lastMessage = friendlyError(lastError);
    throw new Error(
      `Could not ${action === "host" ? "create" : "join"} the classroom after waiting up to 100 seconds. ` +
      `The last connection attempt reported: ${lastMessage}`,
    );
  }

  private connectOnce(params: Record<string, string>, timeoutMs: number): Promise<void> {
    this.closeCurrentSocket();
    const qs = new URLSearchParams(params);
    const ws = new WebSocket(`${websocketUrl()}?${qs.toString()}`);
    this.socket = ws;

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        callback();
      };

      const timeout = window.setTimeout(() => {
        finish(() => {
          try { ws.close(); } catch { /* ignored */ }
          reject(new Error("The secure classroom connection did not finish opening yet"));
        });
      }, timeoutMs);

      ws.onmessage = (event) => {
        let msg: { type?: string; data?: any };
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (msg.type === "welcome") {
          this.sessionId = String(msg.data?.sessionId ?? "");
          return;
        }

        if (msg.type === "state") {
          this.emit(msg.data as PublicState);
          finish(resolve);
          return;
        }

        if (msg.type === "error") {
          finish(() => reject(new Error(String(msg.data ?? "Server rejected the connection"))));
        }
      };

      ws.onerror = () => {
        finish(() => reject(new Error("Secure WebSocket connection failed")));
      };

      ws.onclose = () => {
        finish(() => reject(new Error("Connection closed before the classroom finished loading")));
      };
    });
  }

  private async pokePublishedServer(attempt: number): Promise<void> {
    const path = attempt % 2 === 0 ? "/" : "/api/status";
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7_000);
    try {
      await fetch(`${configuredRenderServerUrl()}${path}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      // Optional wake request only. The WebSocket retry loop remains authoritative.
    } finally {
      window.clearTimeout(timer);
    }
  }

  private progressMessage(action: "host" | "join", attempt: number, elapsedSeconds: number): string {
    const actionText = action === "host" ? "creating your classroom" : "joining the classroom";
    if (elapsedSeconds < 12) return `Contacting the classroom server and ${actionText}...`;
    if (elapsedSeconds < 60) return `The free server is waking up. Retrying safely (attempt ${attempt})...`;
    if (elapsedSeconds < 85) return `The server is taking longer than usual, but this is still within the normal free-server wait...`;
    return `Final classroom connection checks are running (attempt ${attempt})...`;
  }

  private closeCurrentSocket() {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState < WebSocket.CLOSING) {
      try { socket.close(); } catch { /* ignored */ }
    }
  }

  private emit(state: PublicState) {
    this.state = state;
    for (const handler of this.handlers) handler(state);
  }
}

export const Net = new NetService();
