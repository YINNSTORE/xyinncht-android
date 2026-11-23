// Butuh `npm install` (zod).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../../src/config.js';

const base = {
  DATABASE_URL: 'postgres://x',
  JWT_SECRET: 'a'.repeat(40),
  ADMIN_JWT_SECRET: 'b'.repeat(40),
  TOTP_ENC_KEY: 'c'.repeat(64),
  OTP_HMAC_SECRET: 'secretsecret',
};

test('konfigurasi minimal valid', () => {
  const c = loadConfig({ ...base });
  assert.equal(c.OTP_PROVIDER, 'dev');
  assert.equal(c.PUSH_PREVIEW, false);
});

test('produksi menolak OTP dev', () => {
  assert.throws(() => loadConfig({ ...base, NODE_ENV: 'production' }), /OTP_PROVIDER=dev/);
});

test('twilio wajib lengkap', () => {
  assert.throws(() => loadConfig({ ...base, OTP_PROVIDER: 'twilio' }), /Twilio/);
});

test('rahasia JWT user dan admin harus berbeda', () => {
  assert.throws(() => loadConfig({ ...base, ADMIN_JWT_SECRET: base.JWT_SECRET }), /berbeda/);
});

test('kunci TOTP harus 64 hex', () => {
  assert.throws(() => loadConfig({ ...base, TOTP_ENC_KEY: 'zz' }), /64/);
});
