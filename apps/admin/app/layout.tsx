import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import './globals.css';
import { logout } from './actions';

export const metadata: Metadata = { title: 'XyinnCht Admin', robots: { index: false, follow: false } };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = !!(await cookies()).get('xc_admin');
  return (
    <html lang="id">
      <body>
        {authed ? (
          <header className="top">
            <span className="brand">XyinnCht Admin</span>
            <Link href="/">Ringkasan</Link>
            <Link href="/users">Pengguna</Link>
            <Link href="/users/new">Tambah pengguna</Link>
            <Link href="/audit">Log audit</Link>
            <form action={logout}><button type="submit">Keluar</button></form>
          </header>
        ) : null}
        <main>{children}</main>
      </body>
    </html>
  );
}
