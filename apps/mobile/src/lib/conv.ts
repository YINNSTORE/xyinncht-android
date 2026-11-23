export type Member = { id: string; display_name: string; username: string | null; avatar_url: string | null; is_verified: boolean; role: string; last_seen_at: string | null };
export type LastMessage = { id: string; seq: number; sender_id: string; type: string; body: string | null; created_at: string; deleted_at: string | null } | null;
export type Conv = {
  id: string; type: 'direct' | 'group'; title: string | null; avatar_url: string | null; role: string; last_read_seq: number;
  last_message: LastMessage; unread: number; members: Member[];
};
export type Msg = {
  id?: string; client_id: string; conversation_id: string; seq?: number; sender_id: string; type: 'text' | 'image';
  body: string | null; media_url: string | null; reply_to: string | null; created_at: string; deleted_at?: string | null;
  state?: 'queued' | 'failed'; receipts?: { total: number; delivered: number; read: number } | null;
};

export const otherMember = (c: Conv, myId: string) => (c.type === 'direct' ? c.members.find((m) => m.id !== myId) ?? null : null);
export const convTitle = (c: Conv, myId: string) => (c.type === 'group' ? c.title ?? 'Grup' : otherMember(c, myId)?.display_name ?? 'Pengguna');

export function previewOf(m: LastMessage, myId: string): string {
  if (!m) return 'Belum ada pesan';
  if (m.deleted_at) return 'Pesan dihapus';
  const who = m.sender_id === myId ? 'Anda: ' : '';
  return who + (m.type === 'image' ? 'Foto' : m.body ?? '');
}

export function timeLabel(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function uuidv4(): string {
  const b = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}
