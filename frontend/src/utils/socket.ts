import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;
let flushListenerAttached = false;
const pendingTapRounds: string[] = [];
const tapMetrics = {
  emitted: 0,
  queued: 0,
  flushed: 0,
  acked: 0,
  accepted: 0, // ack.ok === true
  rejected: 0, // ack.ok === false
};

export function getSocket(token: string | null | undefined): Socket | null {
  if (!token) return null;
  const env = (import.meta as any).env || {};
  const envUrl = env.VITE_WS_URL as string | undefined;
  const isDev = Boolean(env.DEV);

  // In production default to relative URL; in dev fallback to backend localhost
  let baseUrl = envUrl ?? (isDev ? 'http://localhost:3000/game' : '/game');

  // If running in production and envUrl mistakenly points to localhost, prefer relative
  if (!isDev && baseUrl.includes('localhost')) {
    baseUrl = '/game';
  }

  // Ensure namespace '/game' is present
  if (!baseUrl.endsWith('/game')) {
    const urlObj = (() => {
      try { return new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : undefined); } catch { return null as any; }
    })();
    if (urlObj) {
      if (!urlObj.pathname.endsWith('/game')) {
        urlObj.pathname = (urlObj.pathname.replace(/\/$/, '')) + '/game';
      }
      baseUrl = urlObj.toString();
    } else {
      baseUrl = baseUrl.replace(/\/$/, '') + '/game';
    }
  }

  if (socketInstance && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    try {
      socketInstance.close();
    } catch {}
    socketInstance = null;
  }

  socketInstance = io(baseUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    query: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
  currentToken = token;

  // Один раз навешиваем обработчик для сброса очереди тапов после подключения
  if (!flushListenerAttached && socketInstance) {
    flushListenerAttached = true;
    socketInstance.on('connect', () => {
      // Быстро выгружаем накопленные тапы, сохраняя порядок
      while (pendingTapRounds.length) {
        const rid = pendingTapRounds.shift();
        if (!rid) break;
        try {
          socketInstance!.emit('tap', { roundId: rid }, (ack: { ok: boolean; error?: string }) => {
            if (ack?.ok) tapMetrics.accepted += 1;
            else tapMetrics.rejected += 1;
          });
          tapMetrics.flushed += 1;
        } catch {}
      }
    });
    // Учитываем подтверждения сервером: любое tap:result трактуем как ack одной отправки
    socketInstance.on('tap:result', () => {
      tapMetrics.acked += 1;
    });
  }
  return socketInstance;
}


export function emitTapNonBlocking(roundId: string, token: string | null | undefined): void {
  const s = getSocket(token);
  if (!s) return;
  if (s.connected) {
    try {
      s.emit('tap', { roundId }, (ack: { ok: boolean; error?: string }) => {
        if (ack?.ok) tapMetrics.accepted += 1;
        else tapMetrics.rejected += 1;
      });
      tapMetrics.emitted += 1;
    } catch {
      pendingTapRounds.push(roundId);
      tapMetrics.queued += 1;
    }
  } else {
    pendingTapRounds.push(roundId);
    tapMetrics.queued += 1;
    try { s.connect(); } catch {}
  }
}

export function getTapMetrics() {
  return { ...tapMetrics, pending: pendingTapRounds.length };
}

export function resetTapMetrics() {
  tapMetrics.emitted = 0;
  tapMetrics.queued = 0;
  tapMetrics.flushed = 0;
  tapMetrics.acked = 0;
  tapMetrics.accepted = 0;
  tapMetrics.rejected = 0;
}


