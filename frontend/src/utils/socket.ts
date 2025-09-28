import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string | null | undefined): Socket | null {
  if (!token) return null;
  const envUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  const defaultUrl = typeof window !== 'undefined' && window.location?.port === '5173'
    ? 'http://localhost:3000/game'
    : '/game';
  let baseUrl = envUrl ?? defaultUrl;

  if (!baseUrl.endsWith('/game')) {
    const urlObj = (() => {
      try { return new URL(baseUrl, window.location.origin); } catch { return null as any; }
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


