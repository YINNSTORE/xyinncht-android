import { SignJWT, jwtVerify } from 'jose';
import { randomToken, sha256 } from './crypto.js';

const key = (s) => new TextEncoder().encode(s);

export const signAccess = (cfg, userId) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience('user')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key(cfg.JWT_SECRET));

export async function verifyAccess(cfg, token) {
  const { payload } = await jwtVerify(token, key(cfg.JWT_SECRET), { audience: 'user', algorithms: ['HS256'] });
  return payload.sub;
}

export const signAdmin = (cfg, adminId, role) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setAudience('admin')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key(cfg.ADMIN_JWT_SECRET));

export async function verifyAdmin(cfg, token) {
  const { payload } = await jwtVerify(token, key(cfg.ADMIN_JWT_SECRET), { audience: 'admin', algorithms: ['HS256'] });
  return { id: payload.sub, role: payload.role };
}

const REFRESH_DAYS = 30;

export async function issueTokens(cfg, db, userId, deviceName = null) {
  const access = await signAccess(cfg, userId);
  const refresh = randomToken(48);
  await db.query(
    `insert into refresh_tokens (user_id, token_hash, device_name, expires_at)
     values ($1, $2, $3, now() + ($4 || ' days')::interval)`,
    [userId, sha256(refresh), deviceName, String(REFRESH_DAYS)],
  );
  return { access_token: access, refresh_token: refresh, expires_in: 900 };
}

// Rotasi refresh token. Token yang sudah dipakai lalu dipakai lagi dianggap dicuri: semua sesi dicabut.
export async function rotateRefresh(cfg, db, refreshToken, deviceName = null) {
  const hash = sha256(refreshToken);
  const { rows } = await db.query('select id, user_id, revoked_at, expires_at from refresh_tokens where token_hash = $1', [hash]);
  const row = rows[0];
  if (!row) return null;
  if (row.revoked_at) {
    await db.query('update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null', [row.user_id]);
    return null;
  }
  if (new Date(row.expires_at) < new Date()) return null;
  await db.query('update refresh_tokens set revoked_at = now() where id = $1', [row.id]);
  const tokens = await issueTokens(cfg, db, row.user_id, deviceName);
  return { userId: row.user_id, tokens };
}

export const revokeAll = (db, userId) =>
  db.query('update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null', [userId]);
