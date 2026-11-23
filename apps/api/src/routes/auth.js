import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';
import { normalizePhone } from '../lib/phone.js';
import { issueTokens, rotateRefresh, revokeAll } from '../lib/tokens.js';
import { selfUser } from '../lib/serialize.js';

export default async function authRoutes(app) {
  const { db, cfg } = app;
  const limit = (max) => ({ config: { rateLimit: { max, timeWindow: '1 minute' } } });

  app.post('/auth/otp/request', limit(10), async (req, reply) => {
    const { phone: raw } = parse(z.object({ phone: z.string().min(6).max(25) }), req.body);
    const phone = normalizePhone(raw);
    if (!phone) throw new HttpError(400, 'invalid_phone', 'Nomor HP tidak valid');
    const banned = await db.query(`select ban_reason from users where phone = $1 and status = 'banned'`, [phone]);
    if (banned.rowCount) throw new HttpError(403, 'banned', banned.rows[0].ban_reason ?? 'Akun diblokir');
    const r = await app.otp.request(phone, req.ip);
    if (!r.ok) {
      if (r.reason === 'rate_limited') throw new HttpError(429, 'rate_limited', 'Terlalu sering meminta kode, coba lagi nanti');
      throw new HttpError(502, 'sms_failed', 'Gagal mengirim SMS');
    }
    return reply.send({ ok: true });
  });

  app.post('/auth/otp/verify', limit(10), async (req, reply) => {
    const body = parse(
      z.object({ phone: z.string().min(6).max(25), code: z.string().regex(/^\d{6}$/), device_name: z.string().max(80).optional() }),
      req.body,
    );
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, 'invalid_phone', 'Nomor HP tidak valid');
    if (!(await app.otp.verify(phone, body.code))) throw new HttpError(401, 'invalid_code', 'Kode salah atau kedaluwarsa');
    await db.query(`insert into users (phone, display_name) values ($1, 'Pengguna') on conflict (phone) do nothing`, [phone]);
    const user = (await db.query('select * from users where phone = $1', [phone])).rows[0];
    if (user.status === 'banned') throw new HttpError(403, 'banned', user.ban_reason ?? 'Akun diblokir');
    const tokens = await issueTokens(cfg, db, user.id, body.device_name ?? null);
    return reply.send({ tokens, user: selfUser(user), needs_profile: !user.profile_completed });
  });

  app.post('/auth/refresh', limit(30), async (req, reply) => {
    const { refresh_token } = parse(z.object({ refresh_token: z.string().min(20).max(200) }), req.body);
    const r = await rotateRefresh(cfg, db, refresh_token);
    if (!r) throw new HttpError(401, 'invalid_refresh', 'Sesi berakhir, silakan masuk lagi');
    const user = (await db.query('select * from users where id = $1', [r.userId])).rows[0];
    if (!user || user.status === 'banned') {
      await revokeAll(db, r.userId);
      throw new HttpError(403, 'banned', user?.ban_reason ?? 'Akun diblokir');
    }
    return reply.send({ tokens: r.tokens });
  });

  app.post('/auth/logout', { preHandler: app.requireUser }, async (req, reply) => {
    const { refresh_token } = parse(z.object({ refresh_token: z.string().max(200).optional() }), req.body ?? {});
    if (refresh_token) {
      const { sha256 } = await import('../lib/crypto.js');
      await db.query('update refresh_tokens set revoked_at = now() where token_hash = $1 and user_id = $2', [
        sha256(refresh_token),
        req.user.id,
      ]);
    }
    return reply.send({ ok: true });
  });
}
