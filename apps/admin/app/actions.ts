'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminFetch, API_URL } from '../lib/api';

export type FormState = { error?: string; ok?: string } | undefined;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  let res: Response;
  try {
    res = await fetch(API_URL + '/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? ''), totp: String(form.get('totp') ?? '') }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'API tidak dapat dijangkau' };
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: json.message ?? 'Login gagal' };
  (await cookies()).set('xc_admin', json.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete('xc_admin');
  redirect('/login');
}

export async function banUser(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/admin/users/${id}/ban`, { body: { reason: String(form.get('reason') ?? '') } });
  if (!r.ok) return { error: r.message };
  revalidatePath(`/users/${id}`);
  return { ok: 'Pengguna diblokir dan sesinya diputus' };
}

export async function simpleAction(id: string, action: 'unban' | 'verify' | 'unverify') {
  const r = await adminFetch(`/admin/users/${id}/${action}`, { method: 'POST', body: {} });
  revalidatePath(`/users/${id}`);
  revalidatePath('/users');
  if (!r.ok) throw new Error(r.message);
}

export async function createUser(_prev: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ id: string }>('/admin/users', {
    body: { phone: String(form.get('phone') ?? ''), display_name: String(form.get('display_name') ?? ''), verified: form.get('verified') === 'on' },
  });
  if (!r.ok) return { error: r.message };
  redirect(`/users/${r.data.id}`);
}
