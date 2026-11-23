# XyinnCht

Aplikasi chat Android full stack (proyek hobi/belajar): aplikasi Expo, API Node + WebSocket, Postgres, dan panel admin web.

```
apps/api      API REST + WebSocket (Fastify, Postgres)         JavaScript ESM
apps/admin    Panel admin (Next.js 15)                          TypeScript
apps/mobile   Aplikasi Android (Expo / React Native)            TypeScript
docs/         Rencana uji, laporan uji, paritas fitur, privasi, ketentuan, listing, deploy
```

## Mulai cepat (lokal)

Prasyarat: Node 22+, Docker, akun Twilio hanya untuk produksi (lokal memakai OTP dev).

```bash
npm install                                   # dari root (api + admin)
docker compose up -d                          # Postgres: xyinncht dan xyinncht_test
cp apps/api/.env.example apps/api/.env        # isi rahasia (lihat catatan di file)
npm run migrate -w apps/api
npm run create-admin -w apps/api -- admin@contoh.com "password-min-12-karakter" superadmin
#  -> scan URL otpauth dengan Google Authenticator/Authy, simpan kuncinya
npm run api:dev                               # http://localhost:3000
cp apps/admin/.env.example apps/admin/.env.local
npm run admin:dev                             # http://localhost:3001
```

Mode OTP dev (`OTP_PROVIDER=dev`, `OTP_DEV_CODE=123456`) hanya jalan di non-produksi; konfigurasi menolak mode ini saat `NODE_ENV=production`.

Aplikasi Android: lihat `apps/mobile/SETUP.md`.

## Tes

```bash
npm run test:unit                              # logika murni: telepon, kripto, tema, status pesan
cp apps/api/.env.test.example apps/api/.env.test
npm run test:integration                       # butuh Postgres (database xyinncht_test)
# E2E panel admin: lihat apps/admin/e2e/admin.spec.ts
```

Status uji saat ini ada di `docs/TEST_REPORT.md`.

## Keamanan singkat

- Ban berlaku seketika: API memeriksa status pada setiap request, WebSocket diputus, refresh token dicabut.
- Admin terpisah dari pengguna: email + password argon2id + 2FA TOTP, kunci 15 menit setelah 5 gagal, semua aksi masuk `audit_log`.
- Panel admin tidak punya jalur membaca isi pesan (ada tesnya). Namun pesan disimpan tanpa enkripsi ujung ke ujung di database; operator database bisa membacanya. Tulis ini di Kebijakan Privasi (sudah ada di drafnya).
- OTP dibatasi 3 per 10 menit per nomor dan 10 per jam per IP; kode benar-salah dibatasi 5 percobaan.
- Rahasia hanya lewat variabel lingkungan. Jangan commit `.env`.
