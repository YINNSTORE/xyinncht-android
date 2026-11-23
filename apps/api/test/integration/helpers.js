import { loadConfig } from '../../src/config.js';
import { createDb } from '../../src/db.js';
import { buildApp } from '../../src/app.js';
import { readFile } from 'node:fs/promises';

export const cfg = loadConfig();

export async function freshDb() {
  const db = createDb(cfg.DATABASE_URL);
  const exists = await db.query(`select to_regclass('public.users') as t`);
  if (!exists.rows[0].t) {
    await db.query(await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8'));
  }
  await db.query(
    'truncate users, admins, otp_requests, refresh_tokens, devices, blocks, conversations, conversation_members, messages, message_receipts, audit_log restart identity cascade',
  );
  return db;
}

export function stubHub() {
  const calls = { disconnected: [], sent: [] };
  return {
    calls,
    add() {},
    remove: () => 0,
    isOnline: () => false,
    send: (uid, obj) => (calls.sent.push([uid, obj]), 0),
    disconnectUser: (uid, obj) => calls.disconnected.push([uid, obj]),
    allSockets: () => [],
  };
}

export async function makeApp(db, hub = stubHub()) {
  const push = { notify: async () => {} };
  const app = await buildApp({ cfg, db, hub, push });
  await app.ready();
  return { app, hub };
}

export async function loginUser(app, phone) {
  const a = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone } });
  if (a.statusCode !== 200) throw new Error('otp request gagal: ' + a.body);
  const r = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phone, code: cfg.OTP_DEV_CODE } });
  if (r.statusCode !== 200) throw new Error('otp verify gagal: ' + r.body);
  return r.json();
}

export const bearer = (token) => ({ authorization: `Bearer ${token}` });
