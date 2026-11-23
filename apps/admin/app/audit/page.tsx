import { adminFetch } from '../../lib/api';

type E = { id: number; action: string; details: Record<string, unknown>; created_at: string; admin_email: string | null; target_user_id: string | null; target_name: string | null };
const LABEL: Record<string, string> = {
  'admin.login': 'Admin masuk', 'admin.create': 'Admin dibuat', 'user.create': 'Pengguna ditambah', 'user.ban': 'Pengguna diblokir',
  'user.unban': 'Blokir dibuka', 'user.verify': 'Centang biru diberi', 'user.unverify': 'Centang biru dicabut',
};

export default async function Audit() {
  const r = await adminFetch<{ entries: E[] }>('/admin/audit?limit=100');
  if (!r.ok) return (<><h1>Log audit</h1><p className="err">{r.status === 403 ? 'Hanya superadmin yang dapat melihat log audit.' : r.message}</p></>);
  return (
    <>
      <h1>Log audit</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Target</th><th>Rincian</th></tr></thead>
          <tbody>
            {r.data.entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.created_at).toLocaleString('id-ID')}</td>
                <td>{e.admin_email ?? '-'}</td>
                <td>{LABEL[e.action] ?? e.action}</td>
                <td>{e.target_name ?? '-'}</td>
                <td>{Object.keys(e.details ?? {}).length ? JSON.stringify(e.details) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
