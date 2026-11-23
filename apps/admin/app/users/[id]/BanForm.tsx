'use client';
import { useActionState } from 'react';
import { banUser } from '../../actions';

export default function BanForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(banUser.bind(null, id), undefined);
  return (
    <form
      action={action}
      className="stack"
      onSubmit={(e) => {
        if (!confirm('Blokir pengguna ini? Sesinya akan langsung diputus.')) e.preventDefault();
      }}
    >
      <h2>Blokir pengguna</h2>
      <label>Alasan (wajib, terlihat oleh pengguna)<br /><textarea name="reason" required minLength={3} maxLength={200} rows={3} style={{ width: '100%' }} /></label>
      {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
      {state?.ok ? <p className="okmsg" role="status">{state.ok}</p> : null}
      <button className="danger" disabled={pending}>{pending ? 'Memproses…' : 'Blokir'}</button>
    </form>
  );
}
