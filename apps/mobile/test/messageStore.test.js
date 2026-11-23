import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLocal, applyAck, applyDeleted, applyDelivered, applyFailed, applyIncoming, applyRead, applyRetry,
  lastSeq, mergeServer, pending,
} from '../src/lib/messageStore.js';
import { messageStatus } from '../src/lib/messageStatus.js';

const ME = 'me';
const OTHER = 'other';
const local = (cid, body = 'hai') => ({ client_id: cid, sender_id: ME, type: 'text', body, created_at: '2026-01-01T00:00:00Z', receipts: { total: 1, delivered: 0, read: 0 } });

test('alur kirim: antre, ack, terkirim, sampai, dibaca', () => {
  let l = addLocal([], local('c1'));
  assert.equal(messageStatus(l[0]), 'sending');
  assert.deepEqual(pending(l).map((m) => m.client_id), ['c1']);
  l = applyAck(l, { client_id: 'c1', id: 'm1', seq: 1, created_at: '2026-01-01T00:00:01Z' });
  assert.equal(messageStatus(l[0]), 'sent');
  assert.equal(pending(l).length, 0);
  l = applyDelivered(l, 'm1', OTHER);
  assert.equal(messageStatus(l[0]), 'delivered');
  l = applyRead(l, ME, OTHER, 1);
  assert.equal(messageStatus(l[0]), 'read');
});

test('addLocal tidak menggandakan client_id yang sama', () => {
  const l = addLocal(addLocal([], local('c1')), local('c1'));
  assert.equal(l.length, 1);
});

test('event receipt ganda tidak menghitung dua kali', () => {
  let l = addLocal([], { ...local('c1'), receipts: { total: 2, delivered: 0, read: 0 } });
  l = applyAck(l, { client_id: 'c1', id: 'm1', seq: 1, created_at: 'x' });
  l = applyDelivered(applyDelivered(l, 'm1', 'u1'), 'm1', 'u1');
  assert.equal(l[0].receipts.delivered, 1);
  l = applyDelivered(l, 'm1', 'u2');
  assert.equal(messageStatus(l[0]), 'delivered');
});

test('read hanya berlaku sampai seq yang dibaca dan hanya pesan sendiri', () => {
  let l = [];
  for (let i = 1; i <= 3; i++) {
    l = mergeServer(l, [{ id: 'm' + i, client_id: 'c' + i, seq: i, sender_id: ME, type: 'text', body: 'x', created_at: 't' + i, receipts: { total: 1, delivered: 1, read: 0 } }]);
  }
  l = mergeServer(l, [{ id: 'z', client_id: 'cz', seq: 4, sender_id: OTHER, type: 'text', body: 'dari lawan', created_at: 't4' }]);
  l = applyRead(l, ME, OTHER, 2);
  assert.deepEqual(l.map((m) => m.receipts?.read ?? 0), [1, 1, 0, 0]);
});

test('mergeServer: server menang, pesan antre lokal dipertahankan, urut seq', () => {
  let l = addLocal([], local('c9', 'belum terkirim'));
  l = mergeServer(l, [
    { id: 'b', client_id: 'cb', seq: 2, sender_id: OTHER, type: 'text', body: '2', created_at: 't2' },
    { id: 'a', client_id: 'ca', seq: 1, sender_id: OTHER, type: 'text', body: '1', created_at: 't1' },
  ]);
  assert.deepEqual(l.map((m) => m.client_id), ['ca', 'cb', 'c9']);
  assert.equal(l[2].state, 'queued');
  assert.equal(lastSeq(l), 2);
});

test('applyIncoming: tidak menggandakan pesan yang sudah ada', () => {
  const msg = { id: 'm1', client_id: 'c1', seq: 1, sender_id: OTHER, type: 'text', body: 'hi', created_at: 't' };
  let l = applyIncoming([], msg);
  l = applyIncoming(l, msg);
  assert.equal(l.length, 1);
});

test('gagal dan coba lagi', () => {
  let l = addLocal([], local('c1'));
  l = applyFailed(l, 'c1');
  assert.equal(messageStatus(l[0]), 'failed');
  l = applyRetry(l, 'c1');
  assert.equal(messageStatus(l[0]), 'sending');
});

test('hapus pesan mengosongkan isi', () => {
  let l = mergeServer([], [{ id: 'm1', client_id: 'c1', seq: 1, sender_id: ME, type: 'text', body: 'rahasia', created_at: 't' }]);
  l = applyDeleted(l, 'm1');
  assert.equal(l[0].body, null);
  assert.ok(l[0].deleted_at);
});
