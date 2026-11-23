# Membuat APK lewat GitHub Actions

Tidak perlu memasang apa pun di komputer. Semua dijalankan di server GitHub (gratis untuk repositori publik, dan ada kuota gratis untuk privat).

1. Buat repositori baru di GitHub (boleh privat).
2. Unggah **isi** `xyinncht-repo.zip` ke root repositori (folder `.github`, `apps`, `docs` harus berada di paling atas, bukan di dalam subfolder). Cara termudah: ekstrak zip, lalu `git init && git add . && git commit -m init && git push` ke repositori itu. Pastikan folder `.github` ikut ter-push.
3. Buka tab **Actions** > **Build APK dan tes** > **Run workflow**. Isi `api_url`:
   - `https://...` : URL API Anda yang sudah dideploy (disarankan; lihat `docs/DEPLOY.md`).
   - `http://10.0.2.2:3000` : hanya untuk emulator Android di komputer yang menjalankan API.
   Aplikasi di HP tidak bisa memakai `localhost`; API harus bisa dijangkau dari HP.
4. Tunggu sekitar 10 sampai 20 menit. Hasilnya:
   - Job **tests**: hasil tes unit dan 20 tes integrasi (Postgres sungguhan). Hijau = lulus.
   - Job **apk**: bagian **Artifacts** di halaman run berisi `xyinncht-apk`. Unduh, ekstrak, pasang `app-release.apk` di HP (aktifkan "pasang dari sumber tidak dikenal").
5. Jika ada langkah merah, buka lognya dan kirim potongan galatnya ke saya.

## Catatan

- APK ditandatangani kunci debug bawaan Expo. Cukup untuk uji coba dan berbagi, **tidak** untuk Play Store (itu butuh kunci rilis dan `eas build --profile production`).
- Push notification tidak aktif sampai Anda menambah kredensial FCM (opsional).
- Build pertama belum pernah dijalankan; kode mobile baru lolos pemeriksaan sintaks, belum cek tipe dan belum dicoba di perangkat. Kemungkinan ada galat kecil akibat perbedaan versi paket (lihat daftar di `apps/mobile/SETUP.md`). Langkah cek tipe sengaja tidak memblokir build agar APK tetap terbentuk bila hanya ada peringatan tipe.
