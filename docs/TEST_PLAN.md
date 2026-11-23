# Rencana uji XyinnCht

Prinsip: tidak ada tahap yang dilewati. Lapisan uji dan siapa yang menjalankan:

| lapisan | cakupan | berkas | dijalankan |
| --- | --- | --- | --- |
| Unit (logika murni) | telepon, kripto, tema, kontras, status dan penyimpanan pesan | `apps/api/test/unit`, `apps/mobile/test` | otomatis, `npm run test:unit` |
| Integrasi API + Postgres | OTP, sesi, pesan, receipt, blokir, admin, ban, audit | `apps/api/test/integration/api.test.js` | Anda (butuh Docker) |
| E2E panel admin | login 2FA, tambah user, centang biru, ban/unban, nomor disamarkan | `apps/admin/e2e/admin.spec.ts` | Anda (Playwright) |
| Manual perangkat Android | alur F01-F07, offline, push, tema | daftar periksa di bawah | Anda (HP fisik) |

## Daftar periksa manual (isi hasilnya)

Tandai: LULUS / GAGAL + catatan. Bug diberi tingkat: S1 (alur utama rusak, kehilangan data, celah keamanan), S2 (fitur penting rusak), S3 (kecil), S4 (kosmetik). Tidak boleh dirilis dengan S1 atau S2 terbuka.

| id | langkah | hasil yang diharapkan | hasil |
| --- | --- | --- | --- |
| M01 | Daftar nomor baru, OTP benar | masuk, diminta nama, lalu daftar chat | |
| M02 | OTP salah 5 kali | ditolak; kode benar sesudahnya juga ditolak sampai minta kode baru | |
| M03 | Minta OTP 4 kali dalam 10 menit | permintaan ke-4 ditolak (terlalu sering) | |
| M04 | Nomor format 0812..., +62812..., 62812... | semua jadi akun yang sama | |
| M05 | Kirim pesan 1-1 ke akun kedua | tampil real-time; centang terkirim, sampai, lalu dibaca | |
| M06 | Matikan data di pengirim, kirim 3 pesan, nyalakan lagi | 3 pesan terkirim sekali saja, urut, tanpa duplikat | |
| M07 | Tutup aplikasi penerima, kirim pesan | notifikasi "Pesan baru" muncul; ketuk membuka chat | |
| M08 | Penerima mematikan "Kirim centang dibaca" | pengirim tidak melihat centang dibaca | |
| M09 | Balas pesan; hapus pesan sendiri | kutipan tampil; hapus untuk semua jadi "Pesan dihapus" di kedua sisi | |
| M10 | Kirim foto (butuh R2 terkonfigurasi) | foto terkompres tampil di kedua sisi | |
| M11 | Buat grup 3 orang, kirim pesan | semua menerima; centang dibaca menunggu semua anggota | |
| M12 | Blokir pengguna | tidak bisa saling kirim; hilang dari pencarian pemblokir | |
| M13 | Admin memblokir pengguna yang sedang online | aplikasi langsung ke layar "Akun diblokir" dengan alasan | |
| M14 | Pengguna yang diblokir mencoba masuk lagi | ditolak dengan pesan diblokir | |
| M15 | Admin beri centang biru | lencana tampil di daftar chat, chat, info kontak, profil | |
| M16 | Admin tambah user manual lalu user itu login OTP | akun masuk dengan nama dari admin | |
| M17 | Ganti tema: 7 tema bawaan | seluruh layar terbaca; tidak ada teks hilang | |
| M18 | Tema kaca dengan efek Hidup lalu Mati | blur tampil / tidak; tidak ada crash; tetap terbaca | |
| M19 | Tema saya: ubah aksen jadi kuning terang | teks tombol otomatis gelap; muncul keterangan penyesuaian | |
| M20 | Ganti font ke 5 pilihan, ukuran teks 130% | tata letak tidak pecah | |
| M21 | Hapus akun | semua data hilang; nomor bisa daftar ulang | |
| M22 | HP lemah/hemat daya | aplikasi tetap lancar saat scroll 500 pesan | |

## Gerbang rilis

Rilis hanya jika: semua tes unit, integrasi, dan E2E lulus; M01-M22 lulus; tidak ada bug S1/S2 terbuka. Hasil dicatat di `TEST_REPORT.md`.
