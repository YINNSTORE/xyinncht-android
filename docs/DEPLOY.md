# Deploy XyinnCht

Prasyarat: semua tes lulus dan M01-M22 selesai (lihat `TEST_PLAN.md` dan `TEST_REPORT.md`). Jangan deploy bila ada bug S1/S2 terbuka.

## Pemeriksaan sebelum deploy

- [ ] `npm run test:unit` lulus; `npm run test:integration` lulus; E2E admin lulus; M01-M22 lulus.
- [ ] `.env` produksi: `NODE_ENV=production`, `OTP_PROVIDER=twilio`, rahasia acak berbeda untuk `JWT_SECRET` dan `ADMIN_JWT_SECRET`, `TOTP_ENC_KEY` 64 hex baru, `OTP_DEV_CODE` kosong, `TRUST_PROXY=true` di belakang proxy.
- [ ] Tidak ada rahasia di repositori (`git log -p | grep -i secret`).
- [ ] `CORS_ORIGIN` hanya URL panel admin.
- [ ] Panel admin dilindungi (HTTPS wajib; pertimbangkan batasi IP).
- [ ] Kebijakan Privasi dan Ketentuan sudah dihosting; URL-nya dipasang di `app.json`.
- [ ] Cadangan database terjadwal (Neon/Supabase menyediakannya).

## 1. Database

Buat Postgres terkelola (mis. Neon). Ambil `DATABASE_URL`. Jalankan migrasi sekali:
`DATABASE_URL=... npm run migrate -w apps/api`

## 2. API (contoh Fly.io; Render/Railway serupa)

```bash
fly launch --no-deploy --copy-config      # memakai fly.toml di root
fly secrets set DATABASE_URL=... JWT_SECRET=... ADMIN_JWT_SECRET=... TOTP_ENC_KEY=... OTP_HMAC_SECRET=... \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_VERIFY_SID=... \
  S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_PUBLIC_BASE_URL=... \
  CORS_ORIGIN=https://admin.contoh.com
fly deploy
fly ssh console -C "node src/scripts/create-admin.js admin@contoh.com 'password-kuat-12+' superadmin"
```
Tetap satu instance (hub WebSocket per proses; lihat K5). Cek `https://<app>.fly.dev/health`.

## 3. Penyimpanan gambar

Bucket S3-kompatibel (mis. Cloudflare R2). Atur CORS bucket agar mengizinkan `PUT` dari aplikasi (header `content-type`). Domain publik bucket = `S3_PUBLIC_BASE_URL`.

## 4. Panel admin (Vercel)

Impor `apps/admin`, set `API_URL=https://<api>`. Hanya server Next yang memanggil API; token admin ada di cookie httpOnly.

## 5. Aplikasi Android

1. `app.json`: `extra.apiUrl` = URL API produksi (https), `supportEmail`, `privacyUrl`, `termsUrl`, `android.package`.
2. `eas init` (mengisi `extra.eas.projectId`), unggah kredensial FCM di EAS.
3. APK uji coba: `eas build -p android --profile preview`. Play Store: profil `production` (AAB).

## 6. Pascadeploy (smoke test)

Daftar dengan nomor asli, kirim pesan antar dua HP, tutup aplikasi dan cek push, ban lalu unban dari panel, cek log audit, hapus akun uji.
