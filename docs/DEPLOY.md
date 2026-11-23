# Deploy XyinnCht ke Serv00

Panduan ini menjalankan API Fastify + WebSocket melalui Node.js Passenger dan PostgreSQL Serv00.

## 1. Siapkan domain dan database

1. Di DevilWEB, buat PostgreSQL database dan catat nama database serta password-nya.
2. Catat nomor server akun (misalnya s0 atau s1). Host database mengikuti nomor server: s0 = pgsql0.serv00.com, s1 = pgsql1.serv00.com, s2 = pgsql2.serv00.com.
3. Di DevilWEB -> WWW websites, tambahkan domain/subdomain dengan tipe Node.js dan pilih Node.js 22.
4. Aktifkan SSL/Let's Encrypt untuk domain API.

## 2. Tempatkan source code

Folder aplikasi Node.js Serv00 harus bernama `public_nodejs` dan file startup `app.js` harus berada tepat di folder tersebut.

Jika folder `public_nodejs` masih kosong:
```sh
cd ~/domains/DOMAIN_KAMU/public_nodejs
git clone https://github.com/YINNSTORE/xyinncht-android.git .
rm -f public/index.html
```

Ganti `DOMAIN_KAMU` dengan domain yang dipilih di DevilWEB. Jangan jalankan clone ke folder yang sudah berisi source penting.

## 3. Instal dependency API

```sh
cd ~/domains/DOMAIN_KAMU/public_nodejs/apps/api
export C=clang
export CXX=clang++
npm install --omit=dev --workspaces=false
```

Jika dependency native `argon2` gagal dikompilasi, periksa log instalasi dan compiler yang tersedia di akun Serv00. Jangan menghapus dependency atau melewati error instalasi.

## 4. Buat konfigurasi rahasia

Salin contoh konfigurasi Serv00:
```sh
cd ~/domains/DOMAIN_KAMU/public_nodejs/apps/api
cp .env.serv00.example .env
```

Edit `apps/api/.env` melalui editor DevilWEB. Jangan pernah mengunggah file `.env` ke GitHub atau membagikan isinya.

Isi `DATABASE_URL` dengan nama database dan password yang benar. Host database mengikuti nomor server akun, misalnya `pgsql0.serv00.com` untuk s0. Jika password mengandung karakter khusus seperti `@`, `#`, `/` atau `:`, lakukan URL-encode pada bagian password di `DATABASE_URL`.

Buat empat rahasia berbeda di terminal Serv00:
```sh
node -e "const c=require('crypto'); for(let i=0;i<4;i++) console.log(c.randomBytes(32).toString('hex'))"
```
Gunakan nilai berbeda untuk `JWT_SECRET`, `ADMIN_JWT_SECRET`, `TOTP_ENC_KEY`, dan `OTP_HMAC_SECRET`. `TOTP_ENC_KEY` harus tepat 64 karakter hex.

`GUEST_ACCESS_CODE` harus panjang dan acak, minimal 16 karakter. Bagikan hanya kepada peserta uji. Login beta tanpa nomor HP bukan autentikasi untuk aplikasi publik; matikan dengan `GUEST_LOGIN_ENABLED=false` setelah masa uji coba.

## 5. Jalankan migrasi database

```sh
cd ~/domains/DOMAIN_KAMU/public_nodejs/apps/api
npm run migrate
```

Perintah ini membuat skema awal bila database masih kosong, lalu menerapkan migrasi login beta secara idempoten.

## 6. Jalankan melalui Passenger

File `app.js` di root repository adalah entry point CommonJS untuk Passenger dan akan memuat `apps/api/.env` sebelum menjalankan API ES module. Restart aplikasi melalui DevilWEB -> WWW websites -> Restart, atau:
```sh
devil www restart DOMAIN_KAMU
```

Periksa `https://DOMAIN_KAMU/health`. Respons sehat harus berupa JSON `{"ok":true}`. Log error Passenger berada di `~/domains/DOMAIN_KAMU/logs/error.log`. Atur jumlah proses Passenger menjadi satu agar koneksi WebSocket dan hub online berada pada proses yang sama: `devil www options DOMAIN_KAMU processes 1`.

Serv00 Passenger mendukung WebSocket. Aplikasi Android akan memakai endpoint `wss://DOMAIN_KAMU/ws` setelah URL API di konfigurasi build Android diarahkan ke domain HTTPS tersebut.

## 7. Hubungkan aplikasi Android

Setelah domain API aktif dan endpoint `/health` berhasil:
1. Ubah `apps/mobile/app.json` pada `expo.extra.apiUrl` menjadi `https://DOMAIN_KAMU`.
2. Jalankan build APK sekali saja.
3. Instal APK baru di dua perangkat.
4. Masuk di kedua perangkat menggunakan kode beta yang sama, tetapi nama dan username berbeda.
5. Cari username perangkat lain lalu uji chat realtime.

Jangan build APK sebelum API dan domain HTTPS lolos tes. Mengubah backend saja tidak mengubah APK lama karena alamat API disimpan saat proses build.

## 8. Catatan fitur sementara

- Login SMS dinonaktifkan dengan `OTP_PROVIDER=disabled`. Integrasi Twilio tetap tersedia untuk diaktifkan nanti dengan kredensial Verify yang valid.
- Login beta memakai kode akses server, nama, dan username; akun beta tidak memiliki nomor HP.
- Chat teks, riwayat pesan, tanda terkirim/terbaca, dan WebSocket realtime memakai backend PostgreSQL.
- Upload gambar memerlukan bucket S3-compatible; tanpa konfigurasi S3, fokuskan tes pada chat teks.
- Push notification memerlukan konfigurasi push/FCM tambahan. Aplikasi tetap dapat menerima pesan realtime ketika koneksi WebSocket aktif.

Untuk tipe website Node.js Passenger, jangan menjalankan server melalui proses background/PM2.
