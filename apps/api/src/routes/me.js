import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';
import { selfUser } from '../lib/serialize.js';

export default async function meRoutes(app) {
  const { db, hub } = app;
  const pre = { preHandler: app.requireUser };

  app.get('/me', pre, async (req) => ({ user: selfUser(req.user) }));

  app.patch('/me', pre, async (req) => {
    const b = parse(
      z.object({
        display_name: z.string().trim().min(1).max(60).optional(),
        about: z.string().max(140).optional(),
        username: z.string().regex(/^[a-z0-9_]{3,24}$/).nullable().optional(),
        avatar_url: z.string().url().max(1000).nullable().optional(),
        show_last_seen: z.boolean().optional(),
        show_read_receipts: z.boolean().optional(),
      }),
      req.body,
    );
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(b)) {
      vals.push(v);
      sets.push(`${k} = $${vals.length}`);
    }
    if (b.display_name) sets.push('profile_completed = true');
    if (!sets.length) return { user: selfUser(req.user) };
    vals.push(req.user.id);
    try {
      const r = await db.query(`update users set ${sets.join(', ')}, updated_at = now() where id = $${vals.length} returning *`, vals);
      return { user: selfUser(r.rows[0]) };
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'username_taken', 'Username sudah dipakai');
      throw err;
    }
  });

  app.post('/devices', pre, async (req) => {
    const { push_token } = parse(z.object({ push_token: z.string().min(10).max(300) }), req.body);
    await db.query(
      `insert into devices (user_id, push_token) values ($1, $2)
       on conflict (push_token) do update set user_id = excluded.user_id, updated_at = now()`,
      [req.user.id, push_token],
    );
    return { ok: true };
  });

  // Hapus akun (wajib untuk Play Store). Semua data pengguna ikut terhapus.
  app.delete('/me', pre, async (req) => {
    hub.disconnectUser(req.user.id, { t: 'account.deleted' });
    await db.query('delete from users where id = $1', [req.user.id]);
    return { ok: true };
  });
}
