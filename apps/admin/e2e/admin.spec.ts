// Jalankan: cd apps/admin && npm i -D @playwright/test otplib && npx playwright install chromium
// Prasyarat: API (NODE_ENV=test, database uji) dan admin berjalan; env di bawah terisi.
//   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_TOTP_SECRET (dari `npm run create-admin`)
import { test, expect } from '@playwright/test';
import { authenticator } from 'otplib';

const email = process.env.E2E_ADMIN_EMAIL!;
const password = process.env.E2E_ADMIN_PASSWORD!;
const secret = process.env.E2E_ADMIN_TOTP_SECRET!;
const base = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';

async function login(page: import('@playwright/test').Page, totp = authenticator.generate(secret)) {
  await page.goto(base + '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel(/Kode 2FA/).fill(totp);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

test('halaman terlindungi mengarahkan ke login', async ({ page }) => {
  await page.goto(base + '/users');
  await expect(page).toHaveURL(/\/login/);
});

test('login gagal dengan kode 2FA salah', async ({ page }) => {
  await login(page, '000000');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('alur: tambah user, beri centang biru, blokir, buka blokir', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();

  const phone = `08129${Date.now().toString().slice(-7)}`;
  await page.goto(base + '/users/new');
  await page.getByLabel('Nomor HP').fill(phone);
  await page.getByLabel('Nama').fill('Pengguna E2E');
  await page.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByRole('heading', { name: /Pengguna E2E/ })).toBeVisible();

  await page.getByRole('button', { name: 'Beri centang biru' }).click();
  await expect(page.getByRole('heading', { name: /terverifikasi/ })).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByLabel(/Alasan/).fill('uji otomatis');
  await page.getByRole('button', { name: 'Blokir', exact: true }).click();
  await expect(page.getByText('Diblokir').first()).toBeVisible();

  await page.getByRole('button', { name: 'Buka blokir' }).click();
  await expect(page.getByText('Aktif').first()).toBeVisible();
});

test('nomor di daftar pengguna disamarkan', async ({ page }) => {
  await login(page);
  await page.goto(base + '/users');
  const firstPhone = page.locator('tbody tr td:nth-child(2)').first();
  await expect(firstPhone).toContainText('****');
});
