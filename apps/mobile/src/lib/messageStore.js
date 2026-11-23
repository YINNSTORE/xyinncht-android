// Fungsi murni untuk daftar pesan satu percakapan (urut naik). Tidak mengubah argumen.
// Pesan: { id?, client_id, seq?, sender_id, type, body, media_url, reply_to, created_at, deleted_at?, state?, receipts? }
// state: 'queued' | 'failed' | undefined (sudah di server)

const bySeq = (a, b) => {
  const as = a.seq ?? Infinity;
  const bs = b.seq ?? Infinity;
  if (as !== bs) return as - bs;
  return String(a.created_at).localeCompare(String(b.created_at));
};
const sorted = (list) => [...list].sort(bySeq);
const same = (a, b) => (a.id && b.id && a.id === b.id) || (a.client_id && b.client_id && a.client_id === b.client_id);

export function addLocal(list, msg) {
  if (list.some((m) => same(m, msg))) return list;
  return sorted([...list, { ...msg, state: 'queued' }]);
}

// Gabungkan hasil REST (urut apa saja). Nilai server menang; pesan lokal yang belum terkirim tetap ada.
export function mergeServer(list, incoming) {
  let out = [...list];
  for (const inc of incoming) {
    const i = out.findIndex((m) => same(m, inc));
    if (i === -1) out.push({ ...inc, state: undefined });
    else out[i] = { ...out[i], ...inc, state: undefined, receipts: inc.receipts ?? out[i].receipts };
  }
  return sorted(out);
}

export function applyAck(list, ack) {
  return sorted(
    list.map((m) =>
      m.client_id === ack.client_id
        ? { ...m, id: ack.id, seq: ack.seq, created_at: ack.created_at, state: undefined }
        : m,
    ),
  );
}

export function applyFailed(list, clientId) {
  return list.map((m) => (m.client_id === clientId && m.state === 'queued' ? { ...m, state: 'failed' } : m));
}

export function applyRetry(list, clientId) {
  return list.map((m) => (m.client_id === clientId && m.state === 'failed' ? { ...m, state: 'queued' } : m));
}

export function applyIncoming(list, message) {
  const i = list.findIndex((m) => same(m, message));
  if (i !== -1) return list;
  return sorted([...list, { ...message, state: undefined }]);
}

const bump = (r, key, uid, seenKey) => {
  const receipts = { total: r?.total ?? 1, delivered: r?.delivered ?? 0, read: r?.read ?? 0, [seenKey]: [...(r?.[seenKey] ?? [])] };
  if (receipts[seenKey].includes(uid)) return r;
  receipts[seenKey].push(uid);
  receipts[key] = Math.min(receipts.total, receipts[key] + 1);
  if (key === 'read') receipts.delivered = Math.max(receipts.delivered, receipts.read);
  return { ...r, ...receipts };
};

export function applyDelivered(list, messageId, userId) {
  return list.map((m) => (m.id === messageId ? { ...m, receipts: bump(m.receipts, 'delivered', userId, '_d') } : m));
}

export function applyRead(list, myId, userId, upToSeq) {
  return list.map((m) =>
    m.sender_id === myId && m.seq !== undefined && m.seq <= upToSeq ? { ...m, receipts: bump(m.receipts, 'read', userId, '_r') } : m,
  );
}

export function applyDeleted(list, id) {
  return list.map((m) => (m.id === id ? { ...m, body: null, media_url: null, deleted_at: m.deleted_at ?? new Date().toISOString() } : m));
}

export const lastSeq = (list) => list.reduce((mx, m) => (m.seq !== undefined && m.seq > mx ? m.seq : mx), 0);
export const pending = (list) => list.filter((m) => m.state === 'queued');
