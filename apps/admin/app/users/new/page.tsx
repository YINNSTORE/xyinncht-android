'use client';
import { useActionState } from 'react';
import { createUser } from '../../actions';

export default function NewUser() {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="stack">
      <h1>Tambah pengguna</h1>
      <p className="note">Akun dibuat tanpa OTP. Pengguna tetap masuk memakai kode SMS pada nomor ini.</p>
      <label>Nomor HP<br /><input name="phone" required placeholder="0812… atau +62…" style={{ width: '100%' }} /></label>
      <label>Nama<br /><input name="display_name" required maxLength={60} style={{ width: '100%' }} /></label>
      <label><input name="verified" type="checkbox" style={{ minHeight: 0, marginRight: 8 }} />Beri centang biru</label>
      {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
      <button className="primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Tambah'}</button>
    </form>
  );
}
