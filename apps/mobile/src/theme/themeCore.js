// Logika tema murni (tanpa React Native) agar bisa diuji dengan `node --test`.

export const BUBBLE_SHAPES = ['rounded', 'tail', 'flat'];
export const DENSITIES = { compact: 56, normal: 68, cozy: 80 };
const OVERRIDE_KEYS = ['accent', 'bg', 'surface', 'text', 'bubbleOut', 'bubbleIn'];

export function parseHex(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const h = m[1];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: m[2] ? parseInt(m[2], 16) / 255 : 1,
  };
}

export const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

export function luminance({ r, g, b }) {
  const ch = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrast(hexA, hexB) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return 1;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Pilih putih atau gelap, mana yang kontrasnya lebih tinggi terhadap latar.
export function pickOn(bgHex, light = '#FFFFFF', dark = '#14161F') {
  return contrast(light, bgHex) >= contrast(dark, bgHex) ? light : dark;
}

// Tempel warna (r,g,b,a) di atas latar solid (r,g,b).
export function blend(fg, bg) {
  return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
}

export function parseRgba(str) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(String(str));
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const isHex6 = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Gabungkan token + tema kustom menjadi tema konkret.
 * @param tokens isi tokens.json
 * @param themeId id tema bawaan
 * @param custom { base?, overrides?, radius?, bubbleShape?, glass?, wallpaper?, font?, fontScale?, density? } | null
 * @param opts { glassSetting: 'otomatis'|'hidup'|'mati', lowPower: boolean }
 * @returns { theme, warnings }  warnings = perbaikan kontras otomatis
 */
export function resolveTheme(tokens, themeId, custom = null, opts = {}) {
  const baseId = custom?.base && tokens.themes[custom.base] ? custom.base : tokens.themes[themeId] ? themeId : 'terang';
  const base = tokens.themes[baseId];
  const colors = { ...base.colors };
  const warnings = [];

  if (custom?.overrides) {
    for (const k of OVERRIDE_KEYS) {
      if (isHex6(custom.overrides[k])) colors[k] = custom.overrides[k].toUpperCase();
    }
  }

  // Kaca
  let glass = null;
  let wallpaper = null;
  let panelSolids = null;
  if (base.glass) {
    const g = base.glass;
    const opacity = clamp(Number(custom?.glass?.opacity ?? parseRgba(g.panelFill).a), 0.05, 0.8);
    const fill = `rgba(255,255,255,${opacity})`;
    const stops = (g.wallpaper || []).map(parseHex).filter(Boolean);
    wallpaper = g.wallpaper;
    panelSolids = stops.map((s) => toHex(blend({ ...parseRgba(fill) }, s)));
    const wantBlur = custom?.glass?.enabled !== false && opts.glassSetting !== 'mati' && !opts.lowPower;
    glass = {
      useBlur: wantBlur,
      blur: clamp(Number(custom?.glass?.blur ?? g.blur), 0, 40),
      panelFill: fill,
      panelBorder: g.panelBorder,
      highlight: g.highlight,
    };
    const mid = panelSolids[Math.floor(panelSolids.length / 2)] ?? colors.bg;
    for (const k of ['surface', 'surfaceAlt', 'bubbleIn']) if (colors[k] === 'glass') colors[k] = mid;
  }

  if (custom?.wallpaper?.type === 'gradient') {
    const stops = (custom.wallpaper.stops || []).filter(isHex6).slice(0, 3);
    if (stops.length >= 2) wallpaper = stops;
  } else if (custom?.wallpaper?.type === 'solid') {
    wallpaper = null;
  }

  // Pagar kontras: perbaiki teks otomatis jika di bawah 4,5:1
  const fix = (role, bgList, min = 4.5) => {
    const bgs = Array.isArray(bgList) ? bgList : [bgList];
    const worst = (fg) => Math.min(...bgs.map((b) => contrast(fg, b)));
    const before = worst(colors[role]);
    if (before >= min) return;
    const ref = bgs.reduce((a, b) => (luminance(parseHex(a)) < luminance(parseHex(b)) ? a : b));
    const light = bgs.reduce((a, b) => (luminance(parseHex(a)) > luminance(parseHex(b)) ? a : b));
    const candidates = ['#FFFFFF', '#14161F', pickOn(ref), pickOn(light)];
    const best = candidates.map((c) => [c, worst(c)]).sort((x, y) => y[1] - x[1])[0];
    warnings.push({ role, from: colors[role], to: best[0], ratio_before: +before.toFixed(2), ratio_after: +best[1].toFixed(2) });
    colors[role] = best[0];
  };
  const solidBg = panelSolids ? [colors.bg, ...(wallpaper ? wallpaper.filter(isHex6) : []), ...panelSolids] : [colors.bg, colors.surface];
  fix('text', solidBg);
  fix('onAccent', colors.accent);
  fix('onBubbleOut', colors.bubbleOut);
  fix('timeOut', colors.bubbleOut);
  if (!panelSolids) fix('onBubbleIn', colors.bubbleIn);
  fix('textMuted', panelSolids ? solidBg : [colors.bg, colors.surface, colors.bubbleIn]);

  // Bentuk dan ukuran
  const R = clamp(Math.round(Number(custom?.radius ?? tokens.scales.radius.md)), 0, 28);
  const radius = { ...tokens.scales.radius, sm: Math.round(R * 0.6), md: R, lg: Math.round(R * 1.4), xl: Math.round(R * 2) };
  const density = DENSITIES[custom?.density] ? custom.density : 'normal';
  const theme = {
    id: baseId,
    name: base.name,
    mode: base.mode,
    colors,
    radius,
    bubbleShape: BUBBLE_SHAPES.includes(custom?.bubbleShape) ? custom.bubbleShape : 'rounded',
    fontId: tokens.fonts[custom?.font] && custom.font !== 'loading' ? custom.font : 'sistem',
    fontScale: clamp(Number(custom?.fontScale ?? 1), 0.85, 1.3),
    density,
    listRowHeight: DENSITIES[density],
    glass,
    wallpaper,
  };
  return { theme, warnings };
}
