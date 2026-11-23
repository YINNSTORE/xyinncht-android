import { HttpError } from '../lib/http.js';

// Kirim pesan secara atomik: kunci percakapan, nomori (seq), cegah duplikat lewat client_id,
// buat receipt untuk penerima. Dipakai oleh WebSocket dan diuji langsung.
export async function sendMessage(db, userId, input) {
  const { conversation_id: cid, client_id: clientId, type, body, media_url: mediaUrl, reply_to: replyTo } = input;
  return db.tx(async (c) => {
    const conv = await c.query('select id, type from conversations where id = $1 for update', [cid]);
    if (!conv.rowCount) throw new HttpError(404, 'not_found', 'Percakapan tidak ditemukan');

    const me = await c.query('select status from users where id = $1', [userId]);
    if (me.rows[0]?.status !== 'active') throw new HttpError(403, 'banned', 'Akun tidak aktif');

    const member = await c.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2 and left_at is null',
      [cid, userId],
    );
    if (!member.rowCount) throw new HttpError(403, 'forbidden', 'Bukan anggota percakapan');

    const dup = await c.query('select * from messages where sender_id = $1 and client_id = $2', [userId, clientId]);
    if (dup.rowCount) return { dup: true, row: dup.rows[0], recipients: [] };

    const others = (
      await c.query(
        'select user_id from conversation_members where conversation_id = $1 and user_id <> $2 and left_at is null',
        [cid, userId],
      )
    ).rows.map((r) => r.user_id);

    if (conv.rows[0].type === 'direct' && others[0]) {
      const blocked = await c.query(
        `select 1 from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)`,
        [userId, others[0]],
      );
      if (blocked.rowCount) throw new HttpError(403, 'blocked', 'Tidak bisa mengirim pesan ke pengguna ini');
      const other = await c.query('select status from users where id = $1', [others[0]]);
      if (other.rows[0]?.status !== 'active') throw new HttpError(403, 'recipient_unavailable', 'Penerima tidak tersedia');
    }

    if (replyTo) {
      const ok = await c.query('select 1 from messages where id = $1 and conversation_id = $2', [replyTo, cid]);
      if (!ok.rowCount) throw new HttpError(400, 'bad_reply', 'Pesan yang dibalas tidak ada di percakapan ini');
    }

    const seq = (await c.query('select coalesce(max(seq), 0) + 1 as seq from messages where conversation_id = $1', [cid]))
      .rows[0].seq;
    const inserted = await c.query(
      `insert into messages (conversation_id, seq, sender_id, client_id, type, body, media_url, reply_to)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [cid, seq, userId, clientId, type, type === 'text' ? body : (body ?? null), mediaUrl ?? null, replyTo ?? null],
    );
    if (others.length) {
      await c.query('insert into message_receipts (message_id, user_id) select $1, unnest($2::uuid[])', [
        inserted.rows[0].id,
        others,
      ]);
    }
    return { dup: false, row: inserted.rows[0], recipients: others };
  });
}

export async function markDelivered(db, userId, ids) {
  const { rows } = await db.query(
    `update message_receipts r set delivered_at = coalesce(r.delivered_at, now())
     from messages m
     where r.message_id = m.id and r.user_id = $1 and r.message_id = any($2::uuid[]) and r.delivered_at is null
     returning m.id as message_id, m.sender_id, m.conversation_id`,
    [userId, ids],
  );
  return rows;
}

// Tandai dibaca sampai seq tertentu. Centang baca hanya dikirim jika pengguna mengizinkan.
export async function markRead(db, userId, conversationId, upToSeq) {
  return db.tx(async (c) => {
    const member = await c.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2 and left_at is null',
      [conversationId, userId],
    );
    if (!member.rowCount) throw new HttpError(403, 'forbidden', 'Bukan anggota percakapan');
    await c.query(
      'update conversation_members set last_read_seq = greatest(last_read_seq, $3) where conversation_id = $1 and user_id = $2',
      [conversationId, userId, upToSeq],
    );
    const pref = await c.query('select show_read_receipts from users where id = $1', [userId]);
    if (!pref.rows[0]?.show_read_receipts) return { notify: [] };
    const { rows } = await c.query(
      `update message_receipts r
         set read_at = coalesce(r.read_at, now()), delivered_at = coalesce(r.delivered_at, now())
       from messages m
       where r.message_id = m.id and m.conversation_id = $1 and m.seq <= $3 and r.user_id = $2 and r.read_at is null
       returning m.sender_id`,
      [conversationId, userId, upToSeq],
    );
    return { notify: [...new Set(rows.map((r) => r.sender_id))] };
  });
}
