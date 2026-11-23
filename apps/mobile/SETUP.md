# Menjalankan aplikasi Android XyinnCht

Versi paket Expo harus cocok satu sama lain, jadi pasang lewat `npx expo install` (bukan menyalin versi dari sini).

```bash
cd apps/mobile
npm install
npx expo install expo expo-router react react-native react-native-screens react-native-safe-area-context \
  expo-status-bar expo-constants expo-secure-store expo-blur expo-linear-gradient expo-font \
  expo-image-picker expo-image-manipulator expo-notifications expo-device \
  @react-native-async-storage/async-storage react-native-svg @expo/vector-icons \
  @expo-google-fonts/manrope @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/nunito \
  @expo-google-fonts/ibm-plex-sans @expo-google-fonts/lora
npm install -D typescript @types/react
```

1. Edit `app.json` -> `extra.apiUrl`: alamat API Anda. Emulator Android: `http://10.0.2.2:3000`. HP fisik: IP komputer di jaringan yang sama, atau URL produksi (https).
2. Uji logika murni: `npm test` (21 tes).
3. Cek tipe: `npm run typecheck`. Perbaiki bila ada selisih versi (lihat daftar di bawah).
4. Jalankan: `npx expo start`, buka di emulator atau Expo Go. Catatan: notifikasi push tidak berfungsi di Expo Go; gunakan development build.
5. Build APK uji coba: `npm i -g eas-cli && eas login && eas build:configure && eas build -p android --profile preview`.

## Hal yang perlu dicek karena versi Expo berubah

- `GlassSurface.tsx`: prop `experimentalBlurMethod` pada expo-blur. Bila tipe menolak, hapus komentar `@ts-expect-error` atau prop-nya; bila blur Android tidak tampil, pilih pengaturan efek kaca "Mati".
- `RealtimeContext.tsx`: `ImageManipulator.manipulateAsync` bisa ditandai usang di SDK baru; pindahkan ke API terbarunya.
- `fonts.ts`: nama ekspor `@expo-google-fonts/*` (mis. `Manrope_400Regular`) dan jalur subpath `/400Regular`.
- `push.ts`: bentuk `handleNotification` mengikuti versi expo-notifications.
- Push butuh `extra.eas.projectId` (dari `eas init`) dan kredensial FCM di EAS.
