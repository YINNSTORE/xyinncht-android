import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; message: string };

export async function adminFetch<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const token = (await cookies()).get('xc_admin')?.value;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, error: 'network', message: 'API tidak dapat dijangkau' };
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/login?expired=1');
  if (!res.ok) return { ok: false, status: res.status, error: json.error ?? 'error', message: json.message ?? 'Terjadi kesalahan' };
  return { ok: true, data: json as T };
}

export async function must<T = any>(path: string): Promise<T> {
  const r = await adminFetch<T>(path);
  if (!r.ok) throw new Error(r.message);
  return r.data;
}
