# Listing toko (Google Play) dan syarat rilis

Aplikasi ini proyek hobi; Anda bisa membagikan APK langsung (`eas build --profile preview`) tanpa Play Store. Bila ingin ke Play Store, siapkan yang berikut dan cek persyaratan terbaru di Play Console (persyaratan dan kebijakan sering berubah).

## Teks

**Nama:** XyinnCht

**Deskripsi singkat (maks 80 karakter):** Chat ringan dengan tema yang bisa Anda atur sendiri.

**Deskripsi lengkap:**
XyinnCht adalah aplikasi pesan ringan dan cepat.
- Daftar dengan nomor HP
- Chat pribadi dan grup, kirim foto, balas pesan
- Status terkirim, sampai, dan dibaca (bisa dimatikan)
- Tema bawaan: Terang, Gelap, AMOLED, Samudra, Senja, dan Liquid Glass
- Buat tema sendiri: warna, bentuk gelembung, font, dan efek kaca
- Akun terverifikasi bertanda centang biru

Catatan: pesan tidak dienkripsi ujung ke ujung. Baca Kebijakan Privasi.

## Yang harus siap

- URL Kebijakan Privasi publik (dari `docs/PRIVACY.md`) dan cara meminta penghapusan akun (ada di aplikasi; Play meminta juga tautan web).
- Formulir Data Safety: kumpulkan nomor telepon, nama, pesan, foto, ID perangkat/token push; data dikirim ke server; dapat dihapus pengguna.
- Peringkat konten (kuesioner): aplikasi komunikasi dengan konten buatan pengguna; sediakan cara melaporkan/memblokir (blokir ada; fitur lapor belum ada, pertimbangkan menambahkannya).
- Ikon 512x512, banner fitur 1024x500, minimal 2 tangkapan layar.
- Build AAB: `eas build -p android --profile production`.
- Akun pengembang baru bisa dikenai syarat uji tertutup sebelum produksi; cek di Play Console.
