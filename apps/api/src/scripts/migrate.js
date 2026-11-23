import { readFile } from 'node:fs/promises';
import { loadConfig } from '../config.js';
import { createDb } from '../db.js';

const cfg = loadConfig();
const db = createDb(cfg.DATABASE_URL);
try {
  const exists = await db.query(`select to_regclass('public.users') as t`);
  if (exists.rows[0].t) {
    console.log('Skema sudah ada, tidak ada yang diubah.');
  } else {
    const sql = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
    await db.query(sql);
    console.log('Skema dibuat.');
  }
} finally {
  await db.close();
}
