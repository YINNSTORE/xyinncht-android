# Paritas fitur (replica-diff, versi manual)

Dihitung dari `replica/features.csv` terhadap kode. Skrip diff otomatis tidak bisa dijalankan di sini, dan layar aslinya tidak dibandingkan piksel demi piksel (aplikasi ini memang sengaja punya tampilan sendiri). "Ada" berarti kode ada; belum berarti sudah lulus uji (lihat `TEST_REPORT.md`).

| fitur | status | lokasi |
| --- | --- | --- |
| Daftar HP + OTP SMS | ada | `routes/auth.js`, `services/otp.js`, `app/auth/*` |
| Rate limit OTP | ada | `services/otp.js` |
| Profil awal (nama) | ada; foto profil belum | `app/auth/profile.tsx` |
| Sesi (access + refresh, rotasi) | ada | `lib/tokens.js`, `src/api/client.ts` |
| Chat 1-1 real-time | ada | `ws.js`, `services/messages.js`, `app/chat/[id].tsx` |
| Kirim gambar | ada (butuh R2, tidak antre offline) | `routes/uploads.js`, `RealtimeContext.tsx` |
| Status terkirim/sampai/dibaca | ada | `services/messages.js`, `lib/messageStatus.js` |
| Indikator mengetik | ada | `ws.js`, `RealtimeContext.tsx` |
| Balas pesan | ada | `MessageBubble.tsx`, `app/chat/[id].tsx` |
| Hapus pesan | ada | `routes/conversations.js` |
| Antrean offline | ada untuk teks | `RealtimeContext.tsx`, `lib/messageStore.js` |
| Daftar chat + badge | ada | `app/tabs/index.tsx` |
| Cari pengguna | ada | `routes/users.js`, `app/tabs/search.tsx` |
| Info kontak + blokir | ada | `app/contact/[id].tsx` |
| Grup: buat dan chat | ada | `routes/conversations.js`, `app/group/new.tsx` |
| Grup: kelola anggota | API ada, layar belum | `routes/conversations.js` |
| Notifikasi push | ada (butuh EAS + FCM) | `push.js`, `src/push.ts` |
| Pengaturan privasi | ada | `app/tabs/me.tsx` |
| Tema terang/gelap + 7 tema + kustom + font | ada | `src/theme/*`, `app/settings/theme.tsx` |
| Centang biru | ada | `VerifiedBadge.tsx`, `routes/admin.js` |
| Layar akun diblokir | ada | `app/banned.tsx` |
| Admin: login 2FA | ada | `routes/admin.js`, `apps/admin` |
| Admin: daftar/cari, ban/unban, tambah user, centang | ada | `routes/admin.js`, `apps/admin/app/users` |
| Admin: dashboard, log audit | ada | `apps/admin/app` |
| Hapus akun | ada | `routes/me.js`, `app/tabs/me.tsx` |
| S&K dan Privasi | draf ada, perlu dihosting | `docs/PRIVACY.md`, `docs/TERMS.md` |

**Skor: 26 dari 29 fitur target punya implementasi penuh (90%); 3 sebagian** (foto profil, layar kelola grup, S&K/Privasi yang masih draf dan belum dihosting). 4 dari 33 baris di `features.csv` sengaja dilewati: enkripsi ujung ke ujung, panggilan, Status/Channels, dan interoperabilitas.

Kesenjangan tersisa: K1, K3, K4 di `TEST_REPORT.md`.
