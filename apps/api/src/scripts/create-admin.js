// Pakai: npm run create-admin -w apps/api -- email@contoh.com "password-min-12-karakter" [superadmin]
import { loadConfig } from '../config.js';
import { createDb } from '../db.js';
import { createAdmin } from '../services/admin.js';

const [email, password, role = 'superadmin'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Pakai: create-admin <email> <password> [moderator|superadmin]');
  process.exit(1);
}
const cfg = loadConfig();
const db = createDb(cfg.DATABASE_URL);
try {
  const r = await createAdmin({ db, cfg, email, password, role });
  console.log('Admin dibuat:', email, `(${role})`);
  console.log('Tambahkan ke aplikasi autentikator (Google Authenticator/Authy) lewat URL ini atau kunci manual:');
  console.log(r.otpauth);
  console.log('Kunci manual:', r.secret);
  console.log('Simpan kunci ini sekarang; tidak akan ditampilkan lagi.');
} finally {
  await db.close();
}
