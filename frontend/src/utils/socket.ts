import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

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
  return socketInstance;
}


