import { z } from 'zod';
import { verifyAccess } from './lib/tokens.js';
import { messageDto } from './lib/serialize.js';
import { markDelivered, markRead, sendMessage } from './services/messages.js';
import { HttpError } from './lib/http.js';

const uuid = z.string().uuid();
const sendSchema = z
  .object({
    client_id: uuid,
    conversation_id: uuid,
    type: z.enum(['text', 'image']),
    body: z.string().max(4000).optional(),
    media_url: z.string().url().max(1000).optional(),
    reply_to: uuid.optional(),
  })
  .superRefine((m, ctx) => {
    if (m.type === 'text' && !(m.body && m.body.trim())) ctx.addIssue({ code: 'custom', message: 'body wajib untuk teks' });
    if (m.type === 'image' && !m.media_url) ctx.addIssue({ code: 'custom', message: 'media_url wajib untuk gambar' });
  });

export function registerWs(app) {
  const { db, hub, cfg } = app;

  const heartbeat = setInterval(() => {
    for (const ws of hub.allSockets()) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* abaikan */
      }
    }
  }, 30_000);
  heartbeat.unref?.();
  app.addHook('onClose', async () => clearInterval(heartbeat));

  app.get('/ws', { websocket: true }, (socket) => {
    let userId = null;
    let windowStart = Date.now();
    let count = 0;
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    const send = (obj) => socket.readyState === 1 && socket.send(JSON.stringify(obj));
    const authTimer = setTimeout(() => {
      if (!userId) socket.close(4001, 'auth_timeout');
    }, 5000);

    async function authenticate(token) {
      let id;
      try {
        id = await verifyAccess(cfg, token);
      } catch {
        send({ t: 'error', code: 'unauthorized' });
        return socket.close(4001, 'unauthorized');
      }
      const { rows } = await db.query('select status, ban_reason from users where id = $1', [id]);
      if (!rows[0]) return socket.close(4001, 'unauthorized');
      if (rows[0].status === 'banned') {
        send({ t: 'account.banned', reason: rows[0].ban_reason });
        return socket.close(4003, 'banned');
      }
      userId = id;
      hub.add(userId, socket);
      send({ t: 'auth.ok', user_id: userId });
    }

    async function handle(msg) {
      switch (msg.t) {
        case 'ping':
          return send({ t: 'pong' });
        case 'message.send': {
          const input = sendSchema.parse(msg);
          const { dup, row, recipients } = await sendMessage(db, userId, input);
          send({
            t: 'message.ack',
            client_id: row.client_id,
            id: row.id,
            seq: Number(row.seq),
            conversation_id: row.conversation_id,
            created_at: row.created_at,
          });
          if (dup) return;
          const dto = messageDto(row);
          const offline = [];
          for (const r of recipients) {
            if (!hub.send(r, { t: 'message.new', message: dto })) offline.push(r);
          }
          if (offline.length) {
            const who = await db.query('select display_name from users where id = $1', [userId]);
            app.push.notify(offline, {
              title: who.rows[0]?.display_name ?? 'XyinnCht',
              body: row.type === 'image' ? 'Foto' : String(row.body ?? '').slice(0, 100),
              data: { conversation_id: row.conversation_id },
            });
          }
          return;
        }
        case 'message.delivered': {
          const ids = z.array(uuid).min(1).max(200).parse(msg.ids);
          const rows = await markDelivered(db, userId, ids);
          for (const r of rows) {
            hub.send(r.sender_id, { t: 'receipt.delivered', message_id: r.message_id, conversation_id: r.conversation_id, user_id: userId });
          }
          return;
        }
        case 'message.read': {
          const p = z.object({ conversation_id: uuid, up_to_seq: z.number().int().min(0) }).parse(msg);
          const { notify } = await markRead(db, userId, p.conversation_id, p.up_to_seq);
          for (const sender of notify) {
            hub.send(sender, { t: 'receipt.read', conversation_id: p.conversation_id, user_id: userId, up_to_seq: p.up_to_seq });
          }
          return;
        }
        case 'typing': {
          const p = z.object({ conversation_id: uuid }).parse(msg);
          const { rows } = await db.query(
            `select user_id from conversation_members
             where conversation_id = $1 and user_id <> $2 and left_at is null
               and exists (select 1 from conversation_members m where m.conversation_id = $1 and m.user_id = $2 and m.left_at is null)`,
            [p.conversation_id, userId],
          );
          for (const r of rows) hub.send(r.user_id, { t: 'typing', conversation_id: p.conversation_id, user_id: userId });
          return;
        }
        default:
          throw new HttpError(400, 'unknown_event', 'Event tidak dikenal');
      }
    }

    socket.on('message', async (raw) => {
      const now = Date.now();
      if (now - windowStart > 10_000) {
        windowStart = now;
        count = 0;
      }
      if (++count > 60) return socket.close(4008, 'rate_limited');
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return send({ t: 'error', code: 'bad_json' });
      }
      try {
        if (!userId) {
          if (msg.t === 'auth' && typeof msg.token === 'string') await authenticate(msg.token);
          else send({ t: 'error', code: 'unauthorized' });
          return;
        }
        await handle(msg);
      } catch (err) {
        const code = err instanceof HttpError ? err.code : err?.name === 'ZodError' ? 'validation' : 'internal';
        if (code === 'internal') app.log.error(err);
        send({ t: 'error', code, client_id: msg.client_id });
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      if (!userId) return;
      const left = hub.remove(userId, socket);
      if (left === 0) db.query('update users set last_seen_at = now() where id = $1', [userId]).catch(() => {});
    });
  });
}
