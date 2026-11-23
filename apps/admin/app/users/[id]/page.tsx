import { must } from '../../../lib/api';
import { simpleAction } from '../../actions';
import BanForm from './BanForm';

type U = {
  id: string; phone: string; display_name: string; username: string | null; about: string; status: string; ban_reason: string | null;
  banned_at: string | null; is_verified: boolean; verified_at: string | null; verified_by_email: string | null; created_by_admin: boolean;
  created_at: string; last_seen_at: string | null; messages_sent: number; conversations: number;
};

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: u } = await must<{ user: U }>(`/admin/users/${id}`);
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID') : '-');
  return (
    <>
      <h1>{u.display_name} {u.is_verified ? '✔ terverifikasi' : ''}</h1>
      <dl>
        <dt>Nomor HP</dt><dd>{u.phone}</dd>
        <dt>Username</dt><dd>{u.username ? '@' + u.username : '-'}</dd>
        <dt>Tentang</dt><dd>{u.about || '-'}</dd>
        <dt>Status</dt><dd><span className={`badge ${u.status}`}>{u.status === 'banned' ? 'Diblokir' : 'Aktif'}</span></dd>
        {u.status === 'banned' ? (<><dt>Alasan ban</dt><dd>{u.ban_reason}</dd><dt>Diblokir pada</dt><dd>{fmt(u.banned_at)}</dd></>) : null}
        <dt>Centang biru</dt><dd>{u.is_verified ? `Ya, oleh ${u.verified_by_email ?? '-'} (${fmt(u.verified_at)})` : 'Tidak'}</dd>
        <dt>Dibuat</dt><dd>{fmt(u.created_at)}{u.created_by_admin ? ' oleh admin' : ''}</dd>
        <dt>Terakhir dilihat</dt><dd>{fmt(u.last_seen_at)}</dd>
        <dt>Pesan terkirim</dt><dd>{u.messages_sent}</dd>
        <dt>Percakapan</dt><dd>{u.conversations}</dd>
      </dl>
      <p className="note">Isi pesan tidak ditampilkan; hanya jumlahnya.</p>
      <div className="row">
        <form action={simpleAction.bind(null, u.id, u.is_verified ? 'unverify' : 'verify')}>
          <button>{u.is_verified ? 'Cabut centang biru' : 'Beri centang biru'}</button>
        </form>
        {u.status === 'banned' ? (
          <form action={simpleAction.bind(null, u.id, 'unban')}><button className="primary">Buka blokir</button></form>
        ) : null}
      </div>
      {u.status !== 'banned' ? <BanForm id={u.id} /> : null}
    </>
  );
}
