'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack" style={{ margin: '64px auto' }}>
      <h1>Masuk admin</h1>
      <label>Email<br /><input name="email" type="email" required autoComplete="username" style={{ width: '100%' }} /></label>
      <label>Password<br /><input name="password" type="password" required autoComplete="current-password" style={{ width: '100%' }} /></label>
      <label>Kode 2FA (6 digit)<br /><input name="totp" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" style={{ width: '100%' }} /></label>
      {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
      <button className="primary" disabled={pending}>{pending ? 'Memeriksa…' : 'Masuk'}</button>
      <p className="note">Akses ini dicatat. Panel hanya menampilkan data akun, bukan isi pesan.</p>
    </form>
  );
}
