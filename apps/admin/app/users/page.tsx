import Link from 'next/link';
import { must } from '../../lib/api';

type U = { id: string; phone: string; display_name: string; username: string | null; status: string; is_verified: boolean; created_at: string; created_by_admin: boolean };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const limit = 25;
  const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
  if (sp.q) qs.set('q', sp.q);
  if (sp.status === 'active' || sp.status === 'banned') qs.set('status', sp.status);
  const { total, users } = await must<{ total: number; users: U[] }>(`/admin/users?${qs}`);
  const pages = Math.max(1, Math.ceil(total / limit));
  const link = (p: number) => `/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`;
  return (
    <>
      <h1>Pengguna ({total})</h1>
      <form className="row" method="get">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Cari nama, username, nomor" aria-label="Cari" />
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status">
          <option value="">Semua status</option><option value="active">Aktif</option><option value="banned">Diblokir</option>
        </select>
        <button className="primary">Cari</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Nomor</th><th>Status</th><th>Centang</th><th>Dibuat</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><Link href={`/users/${u.id}`}>{u.display_name}</Link>{u.username ? <span className="note"> @{u.username}</span> : null}</td>
                <td>{u.phone}</td>
                <td><span className={`badge ${u.status}`}>{u.status === 'banned' ? 'Diblokir' : 'Aktif'}</span></td>
                <td>{u.is_verified ? 'Ya' : '-'}</td>
                <td>{new Date(u.created_at).toLocaleString('id-ID')}{u.created_by_admin ? ' (admin)' : ''}</td>
              </tr>
            ))}
            {users.length === 0 ? <tr><td colSpan={5}>Tidak ada data.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        {page > 1 ? <Link className="btn" href={link(page - 1)}>Sebelumnya</Link> : null}
        <span className="note">Halaman {page} dari {pages}</span>
        {page < pages ? <Link className="btn" href={link(page + 1)}>Berikutnya</Link> : null}
      </div>
    </>
  );
}
