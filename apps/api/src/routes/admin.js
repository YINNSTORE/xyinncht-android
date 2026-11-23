import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';
import { decryptText } from '../lib/crypto.js';
import { maskPhone, normalizePhone } from '../lib/phone.js';
import { revokeAll, signAdmin } from '../lib/tokens.js';
import { audit, createAdmin } from '../services/admin.js';

export default async function adminRoutes(app) {
  const { db, cfg, hub } = app;
  const mod = { preHandler: app.requireAdmin() };
  const sup = { preHandler: app.requireAdmin('superadmin') };
  const uuid = z.string().uuid();

  app.post('/admin/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
    const b = parse(z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200), totp: z.string().regex(/^\d{6}$/) }), req.body);
    const { rows } = await db.query('select * from admins where email = lower($1)', [b.email]);
    const admin = rows[0];
    const fail = () => new HttpError(401, 'invalid_credentials', 'Email, password, atau kode 2FA salah');
    if (!admin) throw fail();
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      throw new HttpError(423, 'locked', 'Akun terkunci sementara, coba lagi nanti');
    }
    let ok = false;
    try {
      ok = (await argon2.verify(admin.password_hash, b.password)) && authenticator.check(b.totp, decryptText(cfg.TOTP_ENC_KEY, admin.totp_secret_enc));
    } catch {
      ok = false;
    }
    if (!ok) {
      await db.query(
        `update admins set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end
         where id = $1`,
        [admin.id],
      );
      throw fail();
    }
    await db.query('update admins set failed_logins = 0, locked_until = null where id = $1', [admin.id]);
    await audit(db, { adminId: admin.id, action: 'admin.login', ip: req.ip });
    return { token: await signAdmin(cfg, admin.id, admin.role), role: admin.role, email: admin.email };
  });

  app.get('/admin/stats', mod, async () => {
    const r = await db.query(`
      select
        (select count(*)::int from users) as users_total,
        (select count(*)::int from users where status = 'active') as users_active,
        (select count(*)::int from users where status = 'banned') as users_banned,
        (select count(*)::int from users where is_verified) as users_verified,
        (select count(*)::int from users where created_at > now() - interval '24 hours') as users_new_24h,
        (select count(*)::int from conversations) as conversations_total,
        (select count(*)::int from messages where created_at > now() - interval '24 hours') as messages_24h`);
    return { stats: r.rows[0] };
  });

  app.get('/admin/users', mod, async (req) => {
    const q = parse(
      z.object({
        q: z.string().trim().max(60).optional(),
        status: z.enum(['active', 'banned']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query,
    );
    const where = [];
    const vals = [];
    if (q.status) {
      vals.push(q.status);
      where.push(`status = $${vals.length}`);
    }
    if (q.q) {
      const like = '%' + q.q.replace(/[%_\\]/g, '') + '%';
      vals.push(like);
      where.push(`(display_name ilike $${vals.length} or username ilike $${vals.length} or phone like $${vals.length})`);
    }
    const w = where.length ? 'where ' + where.join(' and ') : '';
    const total = (await db.query(`select count(*)::int as c from users ${w}`, vals)).rows[0].c;
    vals.push(q.limit, q.offset);
    const { rows } = await db.query(
      `select id, phone, display_name, username, status, is_verified, created_by_admin, created_at, last_seen_at
       from users ${w} order by created_at desc limit $${vals.length - 1} offset $${vals.length}`,
      vals,
    );
    return { total, users: rows.map((u) => ({ ...u, phone: maskPhone(u.phone) })) };
  });

  app.get('/admin/users/:id', mod, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const { rows } = await db.query(
      `select u.id, u.phone, u.display_name, u.username, u.about, u.status, u.ban_reason, u.banned_at,
              u.is_verified, u.verified_at, a.email as verified_by_email, u.created_by_admin, u.created_at, u.last_seen_at,
              (select count(*)::int from messages where sender_id = u.id) as messages_sent,
              (select count(*)::int from conversation_members where user_id = u.id and left_at is null) as conversations
       from users u left join admins a on a.id = u.verified_by where u.id = $1`,
      [id],
    );
    if (!rows[0]) throw new HttpError(404, 'not_found', 'Pengguna tidak ditemukan');
    return { user: rows[0] };
  });

  app.post('/admin/users', mod, async (req, reply) => {
    const b = parse(
      z.object({ phone: z.string().min(6).max(25), display_name: z.string().trim().min(1).max(60), verified: z.boolean().optional() }),
      req.body,
    );
    const phone = normalizePhone(b.phone);
    if (!phone) throw new HttpError(400, 'invalid_phone', 'Nomor HP tidak valid');
    try {
      const r = await db.query(
        `insert into users (phone, display_name, created_by_admin, profile_completed, is_verified, verified_at, verified_by)
         values ($1, $2, true, true, $3, case when $3 then now() end, case when $3 then $4::uuid end) returning id`,
        [phone, b.display_name, !!b.verified, req.admin.id],
      );
      await audit(db, { adminId: req.admin.id, action: 'user.create', targetUserId: r.rows[0].id, details: { verified: !!b.verified }, ip: req.ip });
      return reply.status(201).send({ id: r.rows[0].id });
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'phone_exists', 'Nomor sudah terdaftar');
      throw err;
    }
  });

  app.post('/admin/users/:id/ban', mod, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(200) }), req.body);
    const r = await db.query(
      `update users set status = 'banned', banned_at = now(), ban_reason = $2, updated_at = now() where id = $1 returning id`,
      [id, reason],
    );
    if (!r.rowCount) throw new HttpError(404, 'not_found', 'Pengguna tidak ditemukan');
    await revokeAll(db, id);
    hub.disconnectUser(id, { t: 'account.banned', reason });
    await audit(db, { adminId: req.admin.id, action: 'user.ban', targetUserId: id, details: { reason }, ip: req.ip });
    return { ok: true };
  });

  app.post('/admin/users/:id/unban', mod, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const r = await db.query(
      `update users set status = 'active', banned_at = null, ban_reason = null, updated_at = now() where id = $1 returning id`,
      [id],
    );
    if (!r.rowCount) throw new HttpError(404, 'not_found', 'Pengguna tidak ditemukan');
    await audit(db, { adminId: req.admin.id, action: 'user.unban', targetUserId: id, ip: req.ip });
    return { ok: true };
  });

  for (const [path, on] of [['verify', true], ['unverify', false]]) {
    app.post(`/admin/users/:id/${path}`, mod, async (req) => {
      const { id } = parse(z.object({ id: uuid }), req.params);
      const r = await db.query(
        `update users set is_verified = $2, verified_at = case when $2 then now() end,
           verified_by = case when $2 then $3::uuid end, updated_at = now() where id = $1 returning id`,
        [id, on, req.admin.id],
      );
      if (!r.rowCount) throw new HttpError(404, 'not_found', 'Pengguna tidak ditemukan');
      await audit(db, { adminId: req.admin.id, action: on ? 'user.verify' : 'user.unverify', targetUserId: id, ip: req.ip });
      return { ok: true };
    });
  }

  app.get('/admin/audit', sup, async (req) => {
    const q = parse(z.object({ limit: z.coerce.number().int().min(1).max(200).default(50), offset: z.coerce.number().int().min(0).default(0) }), req.query);
    const { rows } = await db.query(
      `select l.id, l.action, l.details, l.created_at, a.email as admin_email, l.target_user_id, u.display_name as target_name
       from audit_log l left join admins a on a.id = l.admin_id left join users u on u.id = l.target_user_id
       order by l.created_at desc limit $1 offset $2`,
      [q.limit, q.offset],
    );
    return { entries: rows };
  });

  app.post('/admin/admins', sup, async (req, reply) => {
    const b = parse(z.object({ email: z.string().email(), password: z.string().min(12).max(200), role: z.enum(['moderator', 'superadmin']).default('moderator') }), req.body);
    try {
      const r = await createAdmin({ db, cfg, ...b });
      await audit(db, { adminId: req.admin.id, action: 'admin.create', details: { email: b.email, role: b.role }, ip: req.ip });
      return reply.status(201).send({ id: r.id, otpauth: r.otpauth, secret: r.secret });
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'email_exists', 'Email sudah terdaftar');
      throw err;
    }
  });
}
