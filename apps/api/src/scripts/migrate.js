import { readFile } from 'node:fs/promises';
import { loadConfig } from '../config.js';
import { createDb } from '../db.js';

const cfg = loadConfig();
const db = createDb(cfg.DATABASE_URL);
try {
  const exists = await db.query(`select to_regclass('public.users') as t`);
  if (!exists.rows[0].t) {
    const sql = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
    await db.query(sql);
    console.log('Skema dasar dibuat.');
  } else {
    console.log('Skema dasar sudah ada.');
  }

  await db.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const migrationName = '002_guest_login.sql';
  const applied = await db.query('select 1 from schema_migrations where name = $1', [migrationName]);
  if (!applied.rowCount) {
    const sql = await readFile(new URL('../../db/migrations/002_guest_login.sql', import.meta.url), 'utf8');
    await db.query(sql);
    await db.query('insert into schema_migrations (name) values ($1)', [migrationName]);
    console.log('Migrasi login beta diterapkan.');
  } else {
    console.log('Migrasi login beta sudah diterapkan.');
  }
} finally {
  await db.close();
}
