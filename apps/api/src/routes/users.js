import { z } from 'zod';
import { parse } from '../lib/http.js';
import { normalizePhone } from '../lib/phone.js';
import { publicUser } from '../lib/serialize.js';

export default async function userRoutes(app) {
  const { db } = app;
  const pre = { preHandler: app.requireUser };

  // Pencarian: nomor HP lengkap (persis) atau username (awalan, min 3 huruf). Nomor tidak dikembalikan.
  app.get('/users/search', { ...pre, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const { q } = parse(z.object({ q: z.string().trim().min(3).max(40) }), req.query);
    const phone = /^[+\d][\d\s().-]{5,}$/.test(q) ? normalizePhone(q) : null;
    const { rows } = phone
      ? await db.query(`select * from users where phone = $1 and status = 'active' and id <> $2`, [phone, req.user.id])
      : await db.query(
          `select * from users where username like $1 and status = 'active' and id <> $2 order by username limit 20`,
          [q.toLowerCase().replace(/[%_\\]/g, '') + '%', req.user.id],
        );
    const blockedBy = new Set(
      (await db.query('select blocker_id from blocks where blocked_id = $1', [req.user.id])).rows.map((r) => r.blocker_id),
    );
    return { users: rows.filter((r) => !blockedBy.has(r.id)).map(publicUser) };
  });

  app.get('/users/:id', pre, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { rows } = await db.query(`select * from users where id = $1 and status = 'active'`, [id]);
    if (!rows[0]) return { user: null };
    const blocked = await db.query('select 1 from blocks where blocker_id = $1 and blocked_id = $2', [req.user.id, id]);
    return { user: publicUser(rows[0]), blocked: blocked.rowCount > 0 };
  });

  app.get('/blocks', pre, async (req) => {
    const { rows } = await db.query(
      'select u.* from blocks b join users u on u.id = b.blocked_id where b.blocker_id = $1 order by b.created_at desc',
      [req.user.id],
    );
    return { users: rows.map(publicUser) };
  });

  app.post('/blocks', pre, async (req) => {
    const { user_id } = parse(z.object({ user_id: z.string().uuid() }), req.body);
    if (user_id !== req.user.id) {
      await db.query('insert into blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing', [req.user.id, user_id]);
    }
    return { ok: true };
  });

  app.delete('/blocks/:id', pre, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    await db.query('delete from blocks where blocker_id = $1 and blocked_id = $2', [req.user.id, id]);
    return { ok: true };
  });
}
