import test from 'node:test';
import assert from 'node:assert/strict';
import { maskPhone, normalizePhone } from '../../src/lib/phone.js';

test('normalizePhone: format Indonesia lokal, kode negara, dan spasi', () => {
  assert.equal(normalizePhone('0812-3456-7890'), '+6281234567890');
  assert.equal(normalizePhone('+62 812 3456 7890'), '+6281234567890');
  assert.equal(normalizePhone('6281234567890'), '+6281234567890');
  assert.equal(normalizePhone('006281234567890'), '+6281234567890');
  assert.equal(normalizePhone('(0812) 3456 7890'), '+6281234567890');
});

test('normalizePhone: nomor negara lain dengan +', () => {
  assert.equal(normalizePhone('+1 415 555 2671'), '+14155552671');
  assert.equal(normalizePhone('0812345678', '44'), '+44812345678');
});

test('normalizePhone: menolak input tidak valid', () => {
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone('+0123456789'), null);
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('+6281234567890123456'), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone(81234567890), null);
  assert.equal(normalizePhone('0812-ABCD-7890'), null);
});

test('maskPhone menyamarkan bagian tengah', () => {
  assert.equal(maskPhone('+6281234567890'), '+6281****890');
  assert.equal(maskPhone('123'), '****');
  assert.equal(maskPhone(undefined), '****');
});
