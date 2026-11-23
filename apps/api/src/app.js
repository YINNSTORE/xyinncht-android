import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createHub } from './hub.js';
import { createPush } from './push.js';
import { createOtp } from './services/otp.js';
import { errorHandler, HttpError } from './lib/http.js';
import { verifyAccess, verifyAdmin } from './lib/tokens.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import uploadRoutes from './routes/uploads.js';
import adminRoutes from './routes/admin.js';
import { registerWs } from './ws.js';

// Bangun aplikasi. Dependensi bisa diganti saat uji (otp, push, hub).
export async function buildApp({ cfg, db, hub = createHub(), otp, push, logger = false }) {
  const app = Fastify({ logger, trustProxy: cfg.TRUST_PROXY, bodyLimit: 1_000_000 });
  await app.register(cors, { origin: cfg.CORS_ORIGIN ? cfg.CORS_ORIGIN.split(',').map((s) => s.trim()) : false });
  await app.register(rateLimit, { global: true, max: 120, timeWindow: '1 minute' });
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  app.decorate('cfg', cfg);
  app.decorate('db', db);
  app.decorate('hub', hub);
  app.decorate('otp', otp ?? createOtp({ cfg, db, log: app.log }));
  app.decorate('push', push ?? createPush({ cfg, db, log: app.log }));
  app.setErrorHandler(errorHandler);

  // Pengguna harus aktif pada setiap request. Ban berlaku seketika.
  app.decorate('requireUser', async (req) => {
    const h = req.headers.authorization ?? '';
    if (!h.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized', 'Perlu masuk');
    let id;
    try {
      id = await verifyAccess(cfg, h.slice(7));
    } catch {
      throw new HttpError(401, 'unauthorized', 'Sesi tidak valid');
    }
    const { rows } = await db.query('select * from users where id = $1', [id]);
    const user = rows[0];
    if (!user) throw new HttpError(401, 'unauthorized', 'Akun tidak ditemukan');
    if (user.status === 'banned') throw new HttpError(403, 'banned', user.ban_reason ?? 'Akun diblokir');
    req.user = user;
  });

  app.decorate('requireAdmin', (role) => async (req) => {
    const h = req.headers.authorization ?? '';
    if (!h.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized', 'Perlu masuk');
    let admin;
    try {
      admin = await verifyAdmin(cfg, h.slice(7));
    } catch {
      throw new HttpError(401, 'unauthorized', 'Sesi admin tidak valid');
    }
    const { rows } = await db.query('select id, email, role from admins where id = $1', [admin.id]);
    if (!rows[0]) throw new HttpError(401, 'unauthorized', 'Admin tidak ditemukan');
    if (role === 'superadmin' && rows[0].role !== 'superadmin') throw new HttpError(403, 'forbidden', 'Hanya superadmin');
    req.admin = rows[0];
  });

  app.get('/health', { config: { rateLimit: false } }, async () => {
    await db.query('select 1');
    return { ok: true };
  });

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(userRoutes);
  await app.register(conversationRoutes);
  await app.register(uploadRoutes);
  await app.register(adminRoutes);
  registerWs(app);
  return app;
}
