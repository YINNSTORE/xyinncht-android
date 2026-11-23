# Laporan uji XyinnCht

Diperbarui: 2026-11-23 (sandbox tanpa jaringan, Node 22).

## Sudah dijalankan dan lulus

| pemeriksaan | hasil |
| --- | --- |
| Tes unit API (telepon, kripto) | 8 dari 8 lulus |
| Tes unit mobile (tema, kontras, status pesan, penyimpanan pesan) | 21 dari 21 lulus |
| Kontras 7 tema bawaan (`design/contrast_check.py`) | 127 pasangan, 0 gagal |
| Sintaks JavaScript API (`node --check`) | 28 berkas lolos |
| Sintaks TypeScript/TSX (compiler TypeScript, tanpa cek tipe) | mobile 33 berkas, admin 11 berkas, 0 galat sintaks |
| Sapu merek pada kode | 0 sisa identitas aplikasi lain (3 kecocokan hanya `import.meta.url`) |

## Belum dijalankan (status: BELUM LULUS)

Alasan: sandbox ini tidak punya jaringan, jadi paket npm, Postgres, dan perangkat Android tidak tersedia.

| pemeriksaan | berkas | catatan |
| --- | --- | --- |
| Tes konfigurasi (zod, 5 tes) | `apps/api/test/unit/config.test.js` | butuh `npm install` |
| Tes integrasi API (20 tes) | `apps/api/test/integration/api.test.js` | butuh Postgres; ditulis tetapi belum pernah dijalankan, mungkin perlu perbaikan kecil |
| E2E panel admin (4 tes) | `apps/admin/e2e/admin.spec.ts` | butuh API + admin berjalan |
| Cek tipe TypeScript penuh | `apps/mobile`, `apps/admin` | butuh paket terpasang |
| Uji manual M01-M22 di Android | `docs/TEST_PLAN.md` | butuh perangkat |
| Build APK | - | `eas build` dari komputer Anda |

## Bug diketahui / keterbatasan (belum diperbaiki)

| id | tingkat | uraian |
| --- | --- | --- |
| K1 | S3 | Foto tidak masuk antrean offline (butuh koneksi untuk mengirim foto). |
| K2 | S3 | Riwayat pesan tidak disimpan lokal selain antrean kirim; daftar chat disimpan, isi chat dimuat ulang dari server. |
| K3 | S3 | Layar info grup (anggota, tambah, keluar) belum ada di aplikasi; API-nya sudah ada. |
| K4 | S3 | Unggah foto profil belum ada (kolom `avatar_url` ada). |
| K5 | S2 (bila dipakai banyak orang) | Hub WebSocket satu proses: ban dan pengiriman real-time tidak menjangkau instance lain. Aman untuk satu instance. |
| K6 | S2 (privasi) | Pesan disimpan tanpa enkripsi ujung ke ujung. Admin panel tidak membacanya, tetapi operator database bisa. |

Hasil uji lain akan ditambahkan di sini setelah Anda menjalankannya.
