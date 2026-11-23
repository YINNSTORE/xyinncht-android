import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';
import { messageDto, publicUser } from '../lib/serialize.js';

export default async function conversationRoutes(app) {
  const { db, hub } = app;
  const pre = { preHandler: app.requireUser };
  const uuid = z.string().uuid();

  async function assertMember(cid, uid, client = db) {
    const r = await client.query(
      'select role from conversation_members where conversation_id = $1 and user_id = $2 and left_at is null',
      [cid, uid],
    );
    if (!r.rowCount) throw new HttpError(403, 'forbidden', 'Bukan anggota percakapan');
    return r.rows[0];
  }

  app.get('/conversations', pre, async (req) => {
    const uid = req.user.id;
    const { rows } = await db.query(
      `select c.id, c.type, c.title, c.avatar_url, cm.role, cm.last_read_seq,
        (select row_to_json(m) from (
           select id, seq, sender_id, type, case when deleted_at is null then body end as body, created_at, deleted_at
           from messages where conversation_id = c.id order by seq desc limit 1) m) as last_message,
        (select count(*)::int from messages mm
          where mm.conversation_id = c.id and mm.seq > cm.last_read_seq and mm.sender_id <> $1 and mm.deleted_at is null) as unread
       from conversation_members cm join conversations c on c.id = cm.conversation_id
       where cm.user_id = $1 and cm.left_at is null
       order by coalesce((select max(created_at) from messages where conversation_id = c.id), c.created_at) desc`,
      [uid],
    );
    const ids = rows.map((r) => r.id);
    const members = ids.length
      ? (
          await db.query(
            `select cm.conversation_id, u.*, cm.role as member_role
             from conversation_members cm join users u on u.id = cm.user_id
             where cm.conversation_id = any($1::uuid[]) and cm.left_at is null`,
            [ids],
          )
        ).rows
      : [];
    const byConv = new Map();
    for (const m of members) {
      if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
      byConv.get(m.conversation_id).push({
        ...publicUser(m),
        role: m.member_role,
        last_seen_at: m.show_last_seen ? m.last_seen_at : null,
      });
    }
    return { conversations: rows.map((r) => ({ ...r, members: byConv.get(r.id) ?? [] })) };
  });

  app.post('/conversations', pre, async (req, reply) => {
    const uid = req.user.id;
    const b = parse(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('direct'), user_id: uuid }),
        z.object({ type: z.literal('group'), title: z.string().trim().min(1).max(60), member_ids: z.array(uuid).min(1).max(255) }),
      ]),
      req.body,
    );
    if (b.type === 'direct') {
      if (b.user_id === uid) throw new HttpError(400, 'self', 'Tidak bisa chat dengan diri sendiri');
      const other = await db.query(`select status from users where id = $1`, [b.user_id]);
      if (other.rows[0]?.status !== 'active') throw new HttpError(404, 'not_found', 'Pengguna tidak ditemukan');
      const blocked = await db.query(
        `select 1 from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)`,
        [uid, b.user_id],
      );
      if (blocked.rowCount) throw new HttpError(403, 'blocked', 'Tidak bisa memulai chat dengan pengguna ini');
      const key = [uid, b.user_id].sort().join(':');
      const id = await db.tx(async (c) => {
        const ins = await c.query(
          `insert into conversations (type, direct_key, created_by) values ('direct', $1, $2)
           on conflict (direct_key) do nothing returning id`,
          [key, uid],
        );
        if (ins.rowCount) {
          await c.query('insert into conversation_members (conversation_id, user_id) select $1, unnest($2::uuid[])', [
            ins.rows[0].id,
            [uid, b.user_id],
          ]);
          return ins.rows[0].id;
        }
        const ex = await c.query('select id from conversations where direct_key = $1', [key]);
        // pastikan kedua anggota aktif lagi bila sebelumnya keluar
        await c.query('update conversation_members set left_at = null where conversation_id = $1 and user_id = $2', [ex.rows[0].id, uid]);
        return ex.rows[0].id;
      });
      return reply.send({ id });
    }
    const memberIds = [...new Set(b.member_ids.filter((m) => m !== uid))];
    if (!memberIds.length) throw new HttpError(400, 'members', 'Pilih minimal satu anggota');
    const valid = await db.query(`select id from users where id = any($1::uuid[]) and status = 'active'`, [memberIds]);
    const id = await db.tx(async (c) => {
      const conv = await c.query(`insert into conversations (type, title, created_by) values ('group', $1, $2) returning id`, [b.title, uid]);
      const cid = conv.rows[0].id;
      await c.query(`insert into conversation_members (conversation_id, user_id, role) values ($1, $2, 'admin')`, [cid, uid]);
      await c.query('insert into conversation_members (conversation_id, user_id) select $1, unnest($2::uuid[])', [
        cid,
        valid.rows.map((r) => r.id),
      ]);
      return cid;
    });
    return reply.send({ id });
  });

  app.get('/conversations/:id/messages', pre, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const q = parse(
      z.object({
        before_seq: z.coerce.number().int().optional(),
        after_seq: z.coerce.number().int().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(40),
      }),
      req.query,
    );
    await assertMember(id, req.user.id);
    const forward = q.after_seq !== undefined;
    const { rows } = await db.query(
      `select m.*, case when m.sender_id = $2 then (
           select json_build_object('total', count(*)::int, 'delivered', count(r.delivered_at)::int, 'read', count(r.read_at)::int)
           from message_receipts r where r.message_id = m.id) end as receipts
       from messages m
       where m.conversation_id = $1
         and ($3::bigint is null or m.seq < $3)
         and ($4::bigint is null or m.seq > $4)
       order by m.seq ${forward ? 'asc' : 'desc'} limit $5`,
      [id, req.user.id, q.before_seq ?? null, q.after_seq ?? null, q.limit],
    );
    const list = rows.map((r) => ({ ...messageDto(r), receipts: r.receipts ?? null }));
    return { messages: forward ? list : list.reverse() };
  });

  app.delete('/messages/:id', pre, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const r = await db.query(
      `update messages set deleted_at = now(), body = null, media_url = null
       where id = $1 and sender_id = $2 and deleted_at is null returning id, conversation_id`,
      [id, req.user.id],
    );
    if (!r.rowCount) throw new HttpError(404, 'not_found', 'Pesan tidak ditemukan');
    const members = await db.query('select user_id from conversation_members where conversation_id = $1 and left_at is null', [
      r.rows[0].conversation_id,
    ]);
    for (const m of members.rows) hub.send(m.user_id, { t: 'message.deleted', id, conversation_id: r.rows[0].conversation_id });
    return { ok: true };
  });

  app.post('/conversations/:id/members', pre, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    const { user_ids } = parse(z.object({ user_ids: z.array(uuid).min(1).max(50) }), req.body);
    const me = await assertMember(id, req.user.id);
    const conv = await db.query('select type from conversations where id = $1', [id]);
    if (conv.rows[0]?.type !== 'group') throw new HttpError(400, 'not_group', 'Hanya untuk grup');
    if (me.role !== 'admin') throw new HttpError(403, 'forbidden', 'Hanya admin grup');
    await db.query(
      `insert into conversation_members (conversation_id, user_id)
       select $1, u.id from users u where u.id = any($2::uuid[]) and u.status = 'active'
       on conflict (conversation_id, user_id) do update set left_at = null`,
      [id, user_ids],
    );
    return { ok: true };
  });

  app.post('/conversations/:id/leave', pre, async (req) => {
    const { id } = parse(z.object({ id: uuid }), req.params);
    await assertMember(id, req.user.id);
    await db.query('update conversation_members set left_at = now() where conversation_id = $1 and user_id = $2', [id, req.user.id]);
    return { ok: true };
  });
}
