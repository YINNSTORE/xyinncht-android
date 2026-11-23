import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildApp } from './app.js';

const cfg = loadConfig();
const db = createDb(cfg.DATABASE_URL);
const app = await buildApp({ cfg, db, logger: { level: cfg.NODE_ENV === 'production' ? 'info' : 'debug' } });

const shutdown = async () => {
  await app.close();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: cfg.PORT, host: '0.0.0.0' });
