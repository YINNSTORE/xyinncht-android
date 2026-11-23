// Normalisasi nomor HP ke E.164. Mengembalikan null jika tidak valid.
export function normalizePhone(input, defaultCountry = '62') {
  if (typeof input !== 'string') return null;
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) {
    // sudah memakai kode negara
  } else if (s.startsWith('0')) {
    s = '+' + defaultCountry + s.slice(1);
  } else if (/^\d+$/.test(s)) {
    s = '+' + s;
  } else {
    return null;
  }
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

// Samarkan nomor untuk tampilan daftar admin: +6281****678
export function maskPhone(phone) {
  if (typeof phone !== 'string' || phone.length < 8) return '****';
  return phone.slice(0, 5) + '****' + phone.slice(-3);
}
