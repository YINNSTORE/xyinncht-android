import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast, parseHex, pickOn, resolveTheme } from '../src/theme/themeCore.js';

const tokens = JSON.parse(readFileSync(new URL('../src/theme/tokens.json', import.meta.url), 'utf8'));

test('contrast: hitam-putih 21, sama 1', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21);
  assert.equal(contrast('#123456', '#123456'), 1);
});

test('parseHex menolak format salah', () => {
  assert.equal(parseHex('red'), null);
  assert.equal(parseHex('#12345'), null);
  assert.deepEqual(parseHex('#FF0000'), { r: 255, g: 0, b: 0, a: 1 });
});

test('pickOn memilih teks yang terbaca', () => {
  assert.equal(pickOn('#FFFFFF'), '#14161F');
  assert.equal(pickOn('#000000'), '#FFFFFF');
});

test('semua 7 tema bawaan jadi tema konkret tanpa perbaikan otomatis', () => {
  for (const id of Object.keys(tokens.themes)) {
    const { theme, warnings } = resolveTheme(tokens, id);
    assert.deepEqual(warnings, [], `tema ${id} tidak boleh perlu perbaikan: ${JSON.stringify(warnings)}`);
    for (const [k, v] of Object.entries(theme.colors)) {
      assert.ok(parseHex(v), `${id}.${k} harus hex konkret, dapat ${v}`);
    }
  }
});

test('tema kaca: blur mengikuti pengaturan, lemah/hemat daya mematikan blur', () => {
  assert.equal(resolveTheme(tokens, 'kaca-gelap').theme.glass.useBlur, true);
  assert.equal(resolveTheme(tokens, 'kaca-gelap', null, { glassSetting: 'mati' }).theme.glass.useBlur, false);
  assert.equal(resolveTheme(tokens, 'kaca-gelap', null, { lowPower: true }).theme.glass.useBlur, false);
  assert.equal(resolveTheme(tokens, 'kaca-gelap', { glass: { enabled: false } }).theme.glass.useBlur, false);
  assert.equal(resolveTheme(tokens, 'terang').theme.glass, null);
});

test('kustom: warna sah diterapkan, warna tidak sah diabaikan', () => {
  const { theme } = resolveTheme(tokens, 'terang', { overrides: { accent: '#ff5500', bg: 'merah' } });
  assert.equal(theme.colors.accent, '#FF5500');
  assert.equal(theme.colors.bg, tokens.themes.terang.colors.bg);
});

test('kustom: teks yang kontrasnya buruk diperbaiki otomatis dan dilaporkan', () => {
  const { theme, warnings } = resolveTheme(tokens, 'terang', { overrides: { bg: '#101010', surface: '#101010' } });
  assert.ok(warnings.some((w) => w.role === 'text'), 'harus ada peringatan untuk teks');
  assert.ok(contrast(theme.colors.text, '#101010') >= 4.5);
});

test('kustom: aksen terang membuat teks tombol berubah gelap', () => {
  const { theme } = resolveTheme(tokens, 'terang', { overrides: { accent: '#FFE066', bubbleOut: '#FFE066' } });
  assert.ok(contrast(theme.colors.onAccent, '#FFE066') >= 4.5);
  assert.ok(contrast(theme.colors.onBubbleOut, '#FFE066') >= 4.5);
});

test('kustom: radius, skala font, kepadatan, dan bentuk dibatasi ke rentang valid', () => {
  const { theme } = resolveTheme(tokens, 'gelap', { radius: 999, fontScale: 5, density: 'cozy', bubbleShape: 'tail', font: 'nunito' });
  assert.equal(theme.radius.md, 28);
  assert.equal(theme.fontScale, 1.3);
  assert.equal(theme.listRowHeight, 80);
  assert.equal(theme.bubbleShape, 'tail');
  assert.equal(theme.fontId, 'nunito');
  const bad = resolveTheme(tokens, 'gelap', { radius: -5, fontScale: 0.1, density: 'x', bubbleShape: 'x', font: 'tidak-ada' }).theme;
  assert.equal(bad.radius.md, 0);
  assert.equal(bad.fontScale, 0.85);
  assert.equal(bad.density, 'normal');
  assert.equal(bad.bubbleShape, 'rounded');
  assert.equal(bad.fontId, 'sistem');
});

test('id tema tidak dikenal jatuh ke Terang', () => {
  assert.equal(resolveTheme(tokens, 'tidak-ada').theme.id, 'terang');
});

test('wallpaper gradient kustom: butuh 2-3 warna sah', () => {
  assert.deepEqual(resolveTheme(tokens, 'gelap', { wallpaper: { type: 'gradient', stops: ['#112233', '#445566'] } }).theme.wallpaper, ['#112233', '#445566']);
  assert.equal(resolveTheme(tokens, 'gelap', { wallpaper: { type: 'gradient', stops: ['#112233'] } }).theme.wallpaper, null);
});
