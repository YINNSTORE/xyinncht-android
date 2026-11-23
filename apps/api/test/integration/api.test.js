// Butuh Postgres (docker compose up -d) dan apps/api/.env.test. Jalankan: npm run test:integration -w apps/api
import test, { beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { bearer, cfg, freshDb, loginUser, makeApp } from './helpers.js';
import { createAdmin } from '../../src/services/admin.js';
import { markDelivered, markRead, sendMessage } from '../../src/services/messages.js';

let db, app, hub;
beforeEach(async () => {
  assert.equal(cfg.NODE_ENV, 'test', 'Jangan jalankan tes di database non-test');
  db = await freshDb();
  ({ app, hub } = await makeApp(db));
});
afterEach(async () => {
  await app.close();
  await db.close();
});
after(() => {});

const PHONE_A = '+6281200000001';
const PHONE_B = '+6281200000002';
const PHONE_C = '+6281200000003';

async function twoUsers() {
  const a = await loginUser(app, PHONE_A);
  const b = await loginUser(app, PHONE_B);
  const conv = await app.inject({
    method: 'POST',
    url: '/conversations',
    headers: bearer(a.tokens.access_token),
    payload: { type: 'direct', user_id: b.user.id },
  });
  assert.equal(conv.statusCode, 200);
  return { a, b, cid: conv.json().id };
}

const text = (cid, body = 'halo') => ({ client_id: randomUUID(), conversation_id: cid, type: 'text', body });

// ---------- Akun dan OTP ----------
test('OTP: daftar baru, profil, dan login ulang memakai akun yang sama', async () => {
  const first = await loginUser(app, '0812 0000 0001');
  assert.equal(first.user.phone, PHONE_A);
  assert.equal(first.needs_profile, true);
  const patch = await app.inject({ method: 'PATCH', url: '/me', headers: bearer(first.tokens.access_token), payload: { display_name: 'Budi' } });
  assert.equal(patch.json().user.profile_completed, true);
  const again = await loginUser(app, PHONE_A);
  assert.equal(again.user.id, first.user.id);
  assert.equal(again.needs_profile, false);
});

test('OTP: kode salah ditolak dan dibatasi percobaannya', async () => {
  await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: PHONE_A } });
  for (let i = 0; i < 5; i++) {
    const r = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phone: PHONE_A, code: '000000' } });
    assert.equal(r.statusCode, 401);
  }
  const good = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phone: PHONE_A, code: cfg.OTP_DEV_CODE } });
  assert.equal(good.statusCode, 401, 'setelah 5 percobaan salah, kode benar pun ditolak');
});

test('OTP: permintaan dibatasi 3 per 10 menit per nomor', async () => {
  const codes = [];
  for (let i = 0; i < 4; i++) {
    codes.push((await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: PHONE_A } })).statusCode);
  }
  assert.deepEqual(codes, [200, 200, 200, 429]);
});

test('OTP: nomor tidak valid ditolak', async () => {
  const r = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: 'abcdef' } });
  assert.equal(r.statusCode, 400);
});

test('Refresh: rotasi, dan memakai token lama mencabut semua sesi', async () => {
  const { tokens } = await loginUser(app, PHONE_A);
  const r1 = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
  assert.equal(r1.statusCode, 200);
  const fresh = r1.json().tokens;
  const reuse = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
  assert.equal(reuse.statusCode, 401);
  const afterTheft = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: fresh.refresh_token } });
  assert.equal(afterTheft.statusCode, 401, 'token baru juga harus dicabut');
});

test('Endpoint terlindungi menolak tanpa token', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/me' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/conversations' })).statusCode, 401);
});

// ---------- Pesan ----------
test('Pesan: nomor urut naik, dan client_id yang sama tidak membuat duplikat', async () => {
  const { a, cid } = await twoUsers();
  const m1 = text(cid, 'satu');
  const r1 = await sendMessage(db, a.user.id, m1);
  const r1b = await sendMessage(db, a.user.id, m1);
  const r2 = await sendMessage(db, a.user.id, text(cid, 'dua'));
  assert.equal(Number(r1.row.seq), 1);
  assert.equal(r1b.dup, true);
  assert.equal(r1b.row.id, r1.row.id);
  assert.equal(Number(r2.row.seq), 2);
  const count = await db.query('select count(*)::int c from messages');
  assert.equal(count.rows[0].c, 2);
});

test('Pesan: pengiriman paralel tidak menghasilkan seq ganda', async () => {
  const { a, cid } = await twoUsers();
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => sendMessage(db, a.user.id, text(cid, 'p' + i))));
  const seqs = results.map((r) => Number(r.row.seq)).sort((x, y) => x - y);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('Pesan: bukan anggota ditolak', async () => {
  const { cid } = await twoUsers();
  const c = await loginUser(app, PHONE_C);
  await assert.rejects(sendMessage(db, c.user.id, text(cid)), /Bukan anggota/);
});

test('Pesan: diblokir tidak bisa mengirim, dan blokir menyembunyikan dari pencarian', async () => {
  const { a, b, cid } = await twoUsers();
  await app.inject({ method: 'POST', url: '/blocks', headers: bearer(b.tokens.access_token), payload: { user_id: a.user.id } });
  await assert.rejects(sendMessage(db, a.user.id, text(cid)), /tidak bisa mengirim/i);
  await app.inject({ method: 'PATCH', url: '/me', headers: bearer(b.tokens.access_token), payload: { username: 'budi_b' } });
  const found = await app.inject({ method: 'GET', url: '/users/search?q=budi_b', headers: bearer(a.tokens.access_token) });
  assert.equal(found.json().users.length, 0);
});

test('Receipt: terkirim lalu dibaca, dan respek pengaturan centang baca', async () => {
  const { a, b, cid } = await twoUsers();
  const sent = await sendMessage(db, a.user.id, text(cid));
  const del = await markDelivered(db, b.user.id, [sent.row.id]);
  assert.equal(del.length, 1);
  const read = await markRead(db, b.user.id, cid, 1);
  assert.deepEqual(read.notify, [a.user.id]);
  const hist = await app.inject({ method: 'GET', url: `/conversations/${cid}/messages`, headers: bearer(a.tokens.access_token) });
  assert.deepEqual(hist.json().messages[0].receipts, { total: 1, delivered: 1, read: 1 });

  await app.inject({ method: 'PATCH', url: '/me', headers: bearer(b.tokens.access_token), payload: { show_read_receipts: false } });
  const second = await sendMessage(db, a.user.id, text(cid, 'lagi'));
  void second;
  const quiet = await markRead(db, b.user.id, cid, 2);
  assert.deepEqual(quiet.notify, []);
});

test('Riwayat: hanya anggota yang bisa membaca, urut naik', async () => {
  const { a, cid } = await twoUsers();
  for (let i = 0; i < 3; i++) await sendMessage(db, a.user.id, text(cid, 'm' + i));
  const ok = await app.inject({ method: 'GET', url: `/conversations/${cid}/messages`, headers: bearer(a.tokens.access_token) });
  assert.deepEqual(ok.json().messages.map((m) => m.seq), [1, 2, 3]);
  const c = await loginUser(app, PHONE_C);
  const no = await app.inject({ method: 'GET', url: `/conversations/${cid}/messages`, headers: bearer(c.tokens.access_token) });
  assert.equal(no.statusCode, 403);
});

// ---------- Admin ----------
async function adminLogin(role = 'superadmin', email = 'admin@contoh.com') {
  const created = await createAdmin({ db, cfg, email, password: 'password-aman-123', role });
  const res = await app.inject({
    method: 'POST',
    url: '/admin/login',
    payload: { email, password: 'password-aman-123', totp: authenticator.generate(created.secret) },
  });
  assert.equal(res.statusCode, 200, res.body);
  return { token: res.json().token, secret: created.secret, id: created.id };
}

test('Admin: login butuh 2FA, salah 5 kali mengunci akun', async () => {
  const created = await createAdmin({ db, cfg, email: 'a@contoh.com', password: 'password-aman-123' });
  const bad = await app.inject({ method: 'POST', url: '/admin/login', payload: { email: 'a@contoh.com', password: 'password-aman-123', totp: '000000' } });
  assert.equal(bad.statusCode, 401);
  for (let i = 0; i < 4; i++) {
    await app.inject({ method: 'POST', url: '/admin/login', payload: { email: 'a@contoh.com', password: 'salah-salah', totp: '000000' } });
  }
  const locked = await app.inject({
    method: 'POST',
    url: '/admin/login',
    payload: { email: 'a@contoh.com', password: 'password-aman-123', totp: authenticator.generate(created.secret) },
  });
  assert.equal(locked.statusCode, 423);
});

test('Admin: token pengguna tidak bisa dipakai di endpoint admin, dan sebaliknya', async () => {
  const user = await loginUser(app, PHONE_A);
  const admin = await adminLogin();
  assert.equal((await app.inject({ method: 'GET', url: '/admin/stats', headers: bearer(user.tokens.access_token) })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/me', headers: bearer(admin.token) })).statusCode, 401);
});

test('Admin: ban memutus sesi, menolak login, dan tercatat di log audit', async () => {
  const user = await loginUser(app, PHONE_A);
  const admin = await adminLogin();
  const ban = await app.inject({
    method: 'POST',
    url: `/admin/users/${user.user.id}/ban`,
    headers: bearer(admin.token),
    payload: { reason: 'spam berulang' },
  });
  assert.equal(ban.statusCode, 200);
  assert.equal(hub.calls.disconnected.length, 1, 'koneksi WebSocket harus diputus');
  assert.equal(hub.calls.disconnected[0][1].t, 'account.banned');
  const me = await app.inject({ method: 'GET', url: '/me', headers: bearer(user.tokens.access_token) });
  assert.equal(me.statusCode, 403);
  const refresh = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: user.tokens.refresh_token } });
  assert.ok([401, 403].includes(refresh.statusCode));
  const otp = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: PHONE_A } });
  assert.equal(otp.statusCode, 403);
  const log = await db.query(`select action, details from audit_log where action = 'user.ban'`);
  assert.equal(log.rowCount, 1);
  assert.equal(log.rows[0].details.reason, 'spam berulang');
  const unban = await app.inject({ method: 'POST', url: `/admin/users/${user.user.id}/unban`, headers: bearer(admin.token) });
  assert.equal(unban.statusCode, 200);
  assert.equal((await loginUser(app, PHONE_A)).user.id, user.user.id);
});

test('Admin: ban wajib alasan, dan pengguna yang dibanned tidak bisa menerima pesan', async () => {
  const { b, cid, a } = await twoUsers();
  const admin = await adminLogin();
  const noReason = await app.inject({ method: 'POST', url: `/admin/users/${b.user.id}/ban`, headers: bearer(admin.token), payload: {} });
  assert.equal(noReason.statusCode, 400);
  await app.inject({ method: 'POST', url: `/admin/users/${b.user.id}/ban`, headers: bearer(admin.token), payload: { reason: 'pelanggaran' } });
  await assert.rejects(sendMessage(db, a.user.id, text(cid)), /Penerima tidak tersedia/);
});

test('Admin: beri dan cabut centang biru, tambah user manual, dan duplikat ditolak', async () => {
  const user = await loginUser(app, PHONE_A);
  const admin = await adminLogin();
  const h = bearer(admin.token);
  await app.inject({ method: 'POST', url: `/admin/users/${user.user.id}/verify`, headers: h });
  let me = await app.inject({ method: 'GET', url: '/me', headers: bearer(user.tokens.access_token) });
  assert.equal(me.json().user.is_verified, true);
  await app.inject({ method: 'POST', url: `/admin/users/${user.user.id}/unverify`, headers: h });
  me = await app.inject({ method: 'GET', url: '/me', headers: bearer(user.tokens.access_token) });
  assert.equal(me.json().user.is_verified, false);

  const add = await app.inject({ method: 'POST', url: '/admin/users', headers: h, payload: { phone: '0812 0000 0009', display_name: 'Tamu', verified: true } });
  assert.equal(add.statusCode, 201);
  const dup = await app.inject({ method: 'POST', url: '/admin/users', headers: h, payload: { phone: '+6281200000009', display_name: 'Lagi' } });
  assert.equal(dup.statusCode, 409);
  const actions = (await db.query('select action from audit_log order by id')).rows.map((r) => r.action);
  assert.deepEqual(actions, ['admin.login', 'user.verify', 'user.unverify', 'user.create']);
});

test('Admin: daftar user menyamarkan nomor, dan tidak ada endpoint untuk membaca isi pesan', async () => {
  const { a, cid } = await twoUsers();
  await sendMessage(db, a.user.id, text(cid, 'rahasia'));
  const admin = await adminLogin();
  const list = await app.inject({ method: 'GET', url: '/admin/users', headers: bearer(admin.token) });
  assert.ok(list.json().users.every((u) => u.phone.includes('****')));
  assert.ok(!list.body.includes('rahasia'));
  const detail = await app.inject({ method: 'GET', url: `/admin/users/${a.user.id}`, headers: bearer(admin.token) });
  assert.equal(detail.json().user.messages_sent, 1);
  assert.ok(!detail.body.includes('rahasia'));
  for (const url of ['/admin/messages', `/admin/conversations/${cid}/messages`]) {
    assert.equal((await app.inject({ method: 'GET', url, headers: bearer(admin.token) })).statusCode, 404);
  }
});

test('Admin: moderator tidak bisa membaca audit atau membuat admin', async () => {
  const mod = await adminLogin('moderator', 'mod@contoh.com');
  assert.equal((await app.inject({ method: 'GET', url: '/admin/audit', headers: bearer(mod.token) })).statusCode, 403);
  const create = await app.inject({
    method: 'POST', url: '/admin/admins', headers: bearer(mod.token),
    payload: { email: 'x@contoh.com', password: 'password-aman-123' },
  });
  assert.equal(create.statusCode, 403);
});

test('Hapus akun menghapus data pengguna', async () => {
  const { a } = await twoUsers();
  const r = await app.inject({ method: 'DELETE', url: '/me', headers: bearer(a.tokens.access_token) });
  assert.equal(r.statusCode, 200);
  const left = await db.query('select count(*)::int c from users where id = $1', [a.user.id]);
  assert.equal(left.rows[0].c, 0);
});
