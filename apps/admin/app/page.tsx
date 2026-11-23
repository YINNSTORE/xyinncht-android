import { must } from '../lib/api';

const LABELS: [string, string][] = [
  ['users_total', 'Total pengguna'], ['users_active', 'Aktif'], ['users_banned', 'Diblokir'], ['users_verified', 'Terverifikasi'],
  ['users_new_24h', 'Baru 24 jam'], ['conversations_total', 'Percakapan'], ['messages_24h', 'Pesan 24 jam'],
];

export default async function Dashboard() {
  const { stats } = await must<{ stats: Record<string, number> }>('/admin/stats');
  return (
    <>
      <h1>Ringkasan</h1>
      <div className="cards">
        {LABELS.map(([k, l]) => (
          <div className="card" key={k}><div className="n">{stats[k]}</div><div className="l">{l}</div></div>
        ))}
      </div>
      <p className="note">Hanya angka agregat. Isi pesan pribadi tidak dapat dilihat dari panel ini.</p>
    </>
  );
}
