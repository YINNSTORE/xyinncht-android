import test from 'node:test';
import assert from 'node:assert/strict';
import { messageStatus } from '../src/lib/messageStatus.js';

test('status: antre, gagal, terkirim, sampai, dibaca', () => {
  assert.equal(messageStatus({ state: 'queued' }), 'sending');
  assert.equal(messageStatus({ state: 'failed' }), 'failed');
  assert.equal(messageStatus({ receipts: null }), 'sent');
  assert.equal(messageStatus({ receipts: { total: 1, delivered: 0, read: 0 } }), 'sent');
  assert.equal(messageStatus({ receipts: { total: 1, delivered: 1, read: 0 } }), 'delivered');
  assert.equal(messageStatus({ receipts: { total: 1, delivered: 1, read: 1 } }), 'read');
});

test('status grup: menunggu semua anggota', () => {
  assert.equal(messageStatus({ receipts: { total: 3, delivered: 2, read: 0 } }), 'sent');
  assert.equal(messageStatus({ receipts: { total: 3, delivered: 3, read: 1 } }), 'delivered');
  assert.equal(messageStatus({ receipts: { total: 3, delivered: 3, read: 3 } }), 'read');
});
