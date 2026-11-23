import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { encryptText } from '../lib/crypto.js';

export async function createAdmin({ db, cfg, email, password, role = 'moderator' }) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Password minimal 12 karakter');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const secret = authenticator.generateSecret();
  const r = await db.query(
    `insert into admins (email, password_hash, totp_secret_enc, role) values (lower($1), $2, $3, $4) returning id`,
    [email, hash, encryptText(cfg.TOTP_ENC_KEY, secret), role],
  );
  return { id: r.rows[0].id, secret, otpauth: authenticator.keyuri(email, 'XyinnCht Admin', secret) };
}

export const audit = (db, { adminId, action, targetUserId = null, details = {}, ip = null }) =>
  db.query('insert into audit_log (admin_id, action, target_user_id, details, ip) values ($1, $2, $3, $4, $5)', [
    adminId,
    action,
    targetUserId,
    JSON.stringify(details),
    ip,
  ]);
