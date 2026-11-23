import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
export const API_URL: string = extra.apiUrl ?? 'http://10.0.2.2:3000';
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';
export const SUPPORT_EMAIL: string = extra.supportEmail ?? '';
export const PRIVACY_URL: string = extra.privacyUrl ?? '';
export const TERMS_URL: string = extra.termsUrl ?? '';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type Tokens = { access_token: string; refresh_token: string };
type SessionEvent = { tokens: Tokens | null; reason?: 'expired' | 'banned'; message?: string };

let tokens: Tokens | null = null;
let listener: ((e: SessionEvent) => void) | null = null;
let refreshing: Promise<boolean> | null = null;

export function setSession(t: Tokens | null, onChange?: (e: SessionEvent) => void) {
  tokens = t;
  if (onChange) listener = onChange;
}
export const getAccessToken = () => tokens?.access_token ?? null;

function expiresSoon(jwt: string, marginSec = 60): boolean {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 - Date.now() < marginSec * 1000;
  } catch {
    return true;
  }
}

async function doRefresh(): Promise<boolean> {
  if (!tokens) return false;
  try {
    const res = await fetch(API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.tokens) {
      tokens = json.tokens;
      listener?.({ tokens });
      return true;
    }
    if (res.status === 403 && json.error === 'banned') listener?.({ tokens: null, reason: 'banned', message: json.message });
    else if (res.status === 401) listener?.({ tokens: null, reason: 'expired' });
    return false; // gangguan jaringan atau server: jangan keluarkan pengguna
  } catch {
    return false;
  }
}

export function refreshTokens(): Promise<boolean> {
  if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
  return refreshing;
}

// Token akses yang masih segar untuk WebSocket
export async function freshAccessToken(): Promise<string | null> {
  if (!tokens) return null;
  if (expiresSoon(tokens.access_token)) await refreshTokens();
  return tokens?.access_token ?? null;
}

type Opts = { method?: string; body?: unknown; auth?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const call = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch(API_URL + path, {
        method: opts.method ?? (opts.body ? 'POST' : 'GET'),
        headers: {
          ...(opts.body ? { 'content-type': 'application/json' } : {}),
          ...(opts.auth !== false && tokens ? { authorization: `Bearer ${tokens.access_token}` } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
  let res: Response;
  try {
    res = await call();
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      0,
      timedOut ? 'timeout' : 'network',
      timedOut
        ? 'Server tidak merespons selama 15 detik. Periksa URL API dan pastikan server aktif.'
        : 'Tidak dapat terhubung ke server. Periksa koneksi internet dan URL API.',
    );
  }
  if (res.status === 401 && opts.auth !== false && tokens) {
    if (await refreshTokens()) res = await call();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && json.error === 'banned') listener?.({ tokens: null, reason: 'banned', message: json.message });
    throw new ApiError(res.status, json.error ?? 'error', json.message ?? 'Terjadi kesalahan');
  }
  return json as T;
}
