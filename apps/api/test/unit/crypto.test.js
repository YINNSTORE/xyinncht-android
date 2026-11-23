import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptText, encryptText, hmacOtp, randomOtp, randomToken, safeEqualHex, sha256 } from '../../src/lib/crypto.js';

const KEY = 'a'.repeat(64);

test('encryptText/decryptText bolak-balik dan IV acak', () => {
  const a = encryptText(KEY, 'rahasia-totp');
  const b = encryptText(KEY, 'rahasia-totp');
  assert.notEqual(a, b);
  assert.equal(decryptText(KEY, a), 'rahasia-totp');
});

test('decryptText gagal jika kunci salah atau data diubah', () => {
  const packed = encryptText(KEY, 'x');
  assert.throws(() => decryptText('b'.repeat(64), packed));
  const parts = packed.split('.');
  const tampered = Buffer.from(parts[2], 'base64');
  tampered[0] ^= 1;
  assert.throws(() => decryptText(KEY, [parts[0], parts[1], tampered.toString('base64')].join('.')));
});

test('hmacOtp deterministik, terikat nomor dan kode', () => {
  const h = hmacOtp('s', '+6281', '123456');
  assert.equal(h, hmacOtp('s', '+6281', '123456'));
  assert.notEqual(h, hmacOtp('s', '+6282', '123456'));
  assert.notEqual(h, hmacOtp('s', '+6281', '123457'));
  assert.ok(safeEqualHex(h, hmacOtp('s', '+6281', '123456')));
  assert.ok(!safeEqualHex(h, hmacOtp('s', '+6281', '000000')));
  assert.ok(!safeEqualHex(h, 'abcd'));
});

test('randomOtp 6 digit, randomToken unik, sha256 benar', () => {
  for (let i = 0; i < 200; i++) assert.match(randomOtp(), /^\d{6}$/);
  assert.notEqual(randomToken(), randomToken());
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
