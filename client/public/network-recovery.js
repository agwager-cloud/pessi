(() => {
  "use strict";

  if (window.__PESSI_NETWORK_RECOVERY_INSTALLED__) return;
  window.__PESSI_NETWORK_RECOVERY_INSTALLED__ = true;

  const NativeWebSocket = window.WebSocket;
  if (typeof NativeWebSocket !== "function") return;

  const nativeDateNow = Date.now.bind(Date);
  let serverClockOffsetMs = 0;
  let hasServerClock = false;

  // Pessi's timed scenes compare server timestamps against Date.now(). School
  // devices can be several seconds apart, so keep every browser on the same
  // server clock without changing Phaser's animation clock (performance.now()).
  try {
    Date.now = () => nativeDateNow() + serverClockOffsetMs;
  } catch {
    // Extremely locked-down browsers can make Date.now read-only. The game still
    // works; it simply falls back to the device clock on that browser.
  }

  function syncServerClock(serverNow) {
    if (!Number.isFinite(Number(serverNow))) return;
    const sample = Number(serverNow) - nativeDateNow();
    if (!hasServerClock) {
      serverClockOffsetMs = sample;
      hasServerClock = true;
      return;
    }
    serverClockOffsetMs = serverClockOffsetMs * 0.7 + sample * 0.3;
  }

  const MAX_RECOVERY_MS = 45_000;
  const MAX_QUEUE = 80;
  const TOKEN_KEY = "pessiStablePlayerToken";

  function makeToken() {
    try {
      const existing = window.sessionStorage.getItem(TOKEN_KEY);
      if (existing) return existing;
    } catch {
      // Locked-down school browsers may disable session storage.
    }

    const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${nativeDateNow()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

    try {
      window.sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // The in-memory token still works for this page session.
    }
    return token;
  }

  const stablePlayerToken = makeToken();

  function withPlayerToken(rawUrl) {
    try {
      const url = new URL(String(rawUrl), window.location.href);
      if (!url.searchParams.has("playerToken")) {
        url.searchParams.set("playerToken", stablePlayerToken);
      }
      return url.toString();
    } catch {
      const separator = String(rawUrl).includes("?") ? "&" : "?";
      return `${rawUrl}${separator}playerToken=${encodeURIComponent(stablePlayerToken)}`;
    }
  }

  class RecoveringWebSocket {
    static CONNECTING = NativeWebSocket.CONNECTING;
    static OPEN = NativeWebSocket.OPEN;
    static CLOSING = NativeWebSocket.CLOSING;
    static CLOSED = NativeWebSocket.CLOSED;

    constructor(url, protocols) {
      this.url = withPlayerToken(url);
      this.protocol = "";
      this.extensions = "";
      this.binaryType = "blob";
      this.bufferedAmount = 0;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;

      this._protocols = protocols;
      this._native = null;
      this._listeners = new Map();
      this._manualClose = false;
      this._everOpened = false;
      this._recovering = false;
      this._recoveryStartedAt = 0;
      this._recoveryAttempt = 0;
      this._retryTimer = 0;
      this._queue = [];
      this._sessionId = "";
      this._lastReadyPenaltyId = "";
      this._lastReadySentAt = 0;
      this._currentPenaltyId = "";

      this._connect();
    }

    get readyState() {
      if (this._manualClose) return NativeWebSocket.CLOSED;
      // Once a classroom has opened, report OPEN during a short recovery window.
      // The game's existing Net.send() will then call send(), allowing this wrapper
      // to queue a host's Start Final / Start Next Round click until reconnection.
      if (this._everOpened && this._recovering) return NativeWebSocket.OPEN;
      return this._native ? this._native.readyState : NativeWebSocket.CONNECTING;
    }

    send(data) {
      if (this._manualClose) throw new DOMException("WebSocket is already closed", "InvalidStateError");
      const protectedData = this._attachPenaltyId(data);
      const socket = this._native;
      if (socket && socket.readyState === NativeWebSocket.OPEN) {
        socket.send(protectedData);
        return;
      }
      if (this._everOpened && this._recovering) {
        if (this._queue.length >= MAX_QUEUE) this._queue.shift();
        this._queue.push(protectedData);
        return;
      }
      throw new DOMException("WebSocket is not open", "InvalidStateError");
    }

    _attachPenaltyId(raw) {
      if (!this._currentPenaltyId || typeof raw !== "string") return raw;
      let message;
      try { message = JSON.parse(raw); } catch { return raw; }
      if (!message || (message.type !== "shoot" && message.type !== "goaliePick")) return raw;

      if (message.type === "goaliePick" && typeof message.data === "string") {
        message.data = { zone: message.data, penaltyId: this._currentPenaltyId };
      } else {
        const original = message.data && typeof message.data === "object" ? message.data : {};
        message.data = { ...original, penaltyId: original.penaltyId || this._currentPenaltyId };
      }
      return JSON.stringify(message);
    }

    close(code, reason) {
      this._manualClose = true;
      this._recovering = false;
      this._queue.length = 0;
      if (this._retryTimer) window.clearTimeout(this._retryTimer);
      this._retryTimer = 0;
      const socket = this._native;
      if (socket && socket.readyState < NativeWebSocket.CLOSING) {
        try { socket.close(code, reason); } catch { /* ignored */ }
      }
    }

    addEventListener(type, listener) {
      if (!listener) return;
      const listeners = this._listeners.get(type) || new Set();
      listeners.add(listener);
      this._listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
      this._listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event) {
      this._dispatch(event.type, event);
      return true;
    }

    _dispatch(type, event) {
      const propertyHandler = this[`on${type}`];
      if (typeof propertyHandler === "function") {
        try { propertyHandler.call(this, event); } catch (error) { window.setTimeout(() => { throw error; }, 0); }
      }
      const listeners = this._listeners.get(type);
      if (!listeners) return;
      for (const listener of [...listeners]) {
        try {
          if (typeof listener === "function") listener.call(this, event);
          else listener.handleEvent?.(event);
        } catch (error) {
          window.setTimeout(() => { throw error; }, 0);
        }
      }
    }

    _connect() {
      if (this._manualClose) return;
      let socket;
      try {
        socket = this._protocols === undefined
          ? new NativeWebSocket(this.url)
          : new NativeWebSocket(this.url, this._protocols);
      } catch (error) {
        this._handleConnectionFailure(error);
        return;
      }

      this._native = socket;
      socket.binaryType = this.binaryType;

      socket.onopen = (event) => {
        if (this._manualClose || this._native !== socket) return;
        this._everOpened = true;
        this._recovering = false;
        this._recoveryAttempt = 0;
        this.protocol = socket.protocol;
        this.extensions = socket.extensions;
        try { socket.binaryType = this.binaryType; } catch { /* ignored */ }
        this._flushQueue();
        this._dispatch("open", event);
      };

      socket.onmessage = (event) => {
        if (this._manualClose || this._native !== socket) return;
        this._observeGameMessage(event.data, socket);
        this._dispatch("message", event);
      };

      socket.onerror = (event) => {
        if (this._manualClose || this._native !== socket) return;
        this._dispatch("error", event);
      };

      socket.onclose = (event) => {
        if (this._native !== socket) return;
        if (this._manualClose) {
          this._dispatch("close", event);
          return;
        }

        if (!this._everOpened) {
          // Initial Render wake-up retries are already managed by the game's Net
          // class, so preserve its original close behaviour before first connect.
          this._dispatch("close", event);
          return;
        }

        this._beginRecovery();
      };
    }

    _beginRecovery() {
      if (this._manualClose) return;
      if (!this._recovering) {
        this._recovering = true;
        this._recoveryStartedAt = nativeDateNow();
        this._recoveryAttempt = 0;
        console.warn("[Pessi network] Classroom connection interrupted. Reconnecting automatically...");
      }
      this._scheduleRetry();
    }

    _scheduleRetry() {
      if (this._manualClose || this._retryTimer) return;
      const elapsed = nativeDateNow() - this._recoveryStartedAt;
      if (elapsed >= MAX_RECOVERY_MS) {
        this._recovering = false;
        this._queue.length = 0;
        const event = new CloseEvent("close", {
          code: 1006,
          reason: "Automatic classroom reconnection timed out",
          wasClean: false,
        });
        this._dispatch("close", event);
        return;
      }

      this._recoveryAttempt += 1;
      const delay = Math.min(4_000, 700 + this._recoveryAttempt * 450);
      this._retryTimer = window.setTimeout(() => {
        this._retryTimer = 0;
        if (!this._manualClose) this._connect();
      }, delay);
    }

    _handleConnectionFailure(error) {
      if (!this._everOpened) {
        this._dispatch("error", new Event("error"));
        this._dispatch("close", new CloseEvent("close", { code: 1006, reason: String(error), wasClean: false }));
        return;
      }
      this._beginRecovery();
    }

    _flushQueue() {
      const socket = this._native;
      if (!socket || socket.readyState !== NativeWebSocket.OPEN) return;
      const queued = this._queue.splice(0);
      for (const data of queued) {
        try { socket.send(data); } catch { this._queue.unshift(data); break; }
      }
    }

    _observeGameMessage(raw, socket) {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (message?.type === "welcome") {
        this._sessionId = String(message.data?.sessionId ?? "");
        return;
      }

      if (message?.type !== "state") return;
      const state = message.data;
      syncServerClock(state?.serverNow);

      const penalty = state?.activePenalty;
      this._currentPenaltyId = penalty?.id ? String(penalty.id) : "";
      if (!penalty?.awaitingReady || !penalty?.id || !this._sessionId) return;
      if (penalty.kickerId !== this._sessionId && penalty.goalieId !== this._sessionId) return;

      const now = nativeDateNow();
      if (this._lastReadyPenaltyId === penalty.id && now - this._lastReadySentAt < 700) return;
      this._lastReadyPenaltyId = penalty.id;
      this._lastReadySentAt = now;

      if (socket.readyState === NativeWebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "penaltyReady", data: { penaltyId: penalty.id } }));
        } catch {
          // The normal retry wrapper will send another ready signal on the next
          // state update if the socket closes at this exact moment.
        }
      }
    }
  }

  Object.defineProperty(RecoveringWebSocket.prototype, Symbol.toStringTag, {
    configurable: true,
    value: "WebSocket",
  });

  window.WebSocket = RecoveringWebSocket;
})();
