// Status tampilan sebuah pesan keluar: sending | sent | delivered | read | failed
export function messageStatus(msg) {
  if (msg.state === 'failed') return 'failed';
  if (msg.state === 'queued') return 'sending';
  const r = msg.receipts;
  if (!r || !r.total) return 'sent';
  if (r.read >= r.total) return 'read';
  if (r.delivered >= r.total) return 'delivered';
  return 'sent';
}
