import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { contrast, parseHex } from '../../src/theme/themeCore';
import { GlassSetting, useTheme } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/ui/Button';
import { GlassSurface } from '../../src/ui/GlassSurface';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';

const SWATCHES = ['#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0E7490', '#0284C7', '#2563EB', '#0F172A', '#F8FAFC'];
const COLOR_ROLES: [string, string][] = [
  ['accent', 'Aksen'], ['bg', 'Latar'], ['surface', 'Permukaan'], ['text', 'Teks'], ['bubbleOut', 'Gelembung keluar'], ['bubbleIn', 'Gelembung masuk'],
];
const FONT_SAMPLE = 'Halo, ini contoh tulisan 123';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T weight="bold" size="lg">{title}</T>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt, borderWidth: 1, borderColor: active ? theme.colors.accent : theme.colors.border }}
    >
      <T size="sm" weight="medium" color={active ? theme.colors.onAccent : theme.colors.text}>{label}</T>
    </Pressable>
  );
}

function Stepper({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  const { theme } = useTheme();
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
  const Btn = ({ t, d }: { t: string; d: number }) => (
    <Pressable onPress={() => onChange(clamp(value + d))} accessibilityLabel={`${label} ${t === '+' ? 'tambah' : 'kurangi'}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      <T weight="bold">{t}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Btn t="−" d={-step} />
        <T weight="medium" style={{ minWidth: 48, textAlign: 'center' }}>{fmt ? fmt(value) : value}</T>
        <Btn t="+" d={step} />
      </View>
    </View>
  );
}

export default function ThemeSettings() {
  const t = useTheme();
  const { theme, tokens, themeId, custom, useCustom, glassSetting, warnings } = t;
  const c = theme.colors;
  const [draft, setDraft] = useState<Record<string, any>>(custom ?? { base: themeId, overrides: {} });
  const [hex, setHex] = useState<Record<string, string>>({});
  const [openRole, setOpenRole] = useState<string | null>(null);

  useEffect(() => {
    t.loadAllFonts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (next: Record<string, any>) => {
    setDraft(next);
    t.setCustom(next);
    t.setUseCustom(true);
  };
  const setOverride = (role: string, value: string) => save({ ...draft, base: draft.base ?? themeId, overrides: { ...(draft.overrides ?? {}), [role]: value } });
  const themeEntries = Object.entries(tokens.themes) as [string, any][];
  const isGlass = !!tokens.themes[(useCustom ? draft.base : themeId) as keyof typeof tokens.themes] && !!(tokens.themes as any)[useCustom ? draft.base : themeId].glass;
  const fontEntries = Object.entries(tokens.fonts).filter(([k]) => k !== 'loading') as [string, any][];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 48 }}>
      <Section title="Tema bawaan">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {themeEntries.map(([id, th]) => {
            const active = !useCustom && themeId === id;
            const tc = th.colors;
            const glass = th.glass;
            return (
              <Pressable key={id} onPress={() => { t.setUseCustom(false); t.setThemeId(id); }} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={th.name}
                style={{ width: '47%', borderRadius: 16, borderWidth: active ? 3 : 1, borderColor: active ? c.accent : c.border, overflow: 'hidden' }}>
                <View style={{ height: 84, padding: 8, gap: 6, backgroundColor: glass ? glass.wallpaper[1] : tc.bg }}>
                  <View style={{ alignSelf: 'flex-start', width: '60%', height: 22, borderRadius: 10, backgroundColor: glass ? 'rgba(255,255,255,0.3)' : tc.bubbleIn === 'glass' ? tc.surface : tc.bubbleIn, borderWidth: 1, borderColor: tc.border === '#FFFFFF59' ? 'rgba(255,255,255,0.35)' : tc.border }} />
                  <View style={{ alignSelf: 'flex-end', width: '55%', height: 22, borderRadius: 10, backgroundColor: tc.bubbleOut }} />
                </View>
                <View style={{ padding: 8, backgroundColor: c.surface }}>
                  <T size="sm" weight="medium">{th.name}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Font">
        {fontEntries.map(([id, f]) => (
          <Pressable key={id} onPress={() => save({ ...draft, base: draft.base ?? themeId, font: id })} accessibilityRole="button"
            style={{ padding: 12, borderRadius: 14, borderWidth: (useCustom ? draft.font : theme.fontId) === id || theme.fontId === id ? 2 : 1, borderColor: theme.fontId === id ? c.accent : c.border, backgroundColor: c.surface }}>
            <T size="sm" muted>{f.name}</T>
            <T size="lg">{FONT_SAMPLE}</T>
          </Pressable>
        ))}
        <Stepper label="Ukuran teks" value={theme.fontScale} min={0.85} max={1.3} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => save({ ...draft, base: draft.base ?? themeId, fontScale: v })} />
      </Section>

      <Section title="Tema saya">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T>Pakai kustomisasi</T>
          <Switch value={useCustom} onValueChange={(v) => { if (v) save({ ...draft, base: draft.base ?? themeId }); else t.setUseCustom(false); }} trackColor={{ true: c.accent, false: c.border }} thumbColor="#FFFFFF" />
        </View>
        {useCustom ? (
          <>
            <T size="sm" muted>Tema dasar</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {themeEntries.map(([id, th]) => <Chip key={id} label={th.name} active={(draft.base ?? themeId) === id} onPress={() => save({ ...draft, base: id, overrides: {} })} />)}
            </View>

            {COLOR_ROLES.map(([role, label]) => (
              <GlassSurface key={role} style={{ padding: 12, gap: 10 }}>
                <Pressable onPress={() => setOpenRole(openRole === role ? null : role)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }} accessibilityRole="button">
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c[role], borderWidth: 1, borderColor: c.border }} />
                  <T style={{ flex: 1 }}>{label}</T>
                  <T size="sm" muted>{c[role]}</T>
                </Pressable>
                {openRole === role ? (
                  <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {SWATCHES.map((s) => (
                        <Pressable key={s} onPress={() => setOverride(role, s)} accessibilityLabel={`Pilih warna ${s}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: s, borderWidth: 2, borderColor: c.border }} />
                      ))}
                    </View>
                    <Input value={hex[role] ?? ''} onChangeText={(v) => { setHex({ ...hex, [role]: v }); if (parseHex(v) && /^#[0-9a-f]{6}$/i.test(v)) setOverride(role, v); }} placeholder="#RRGGBB" autoCapitalize="characters" maxLength={7} />
                  </>
                ) : null}
              </GlassSurface>
            ))}

            <Stepper label="Sudut membulat" value={draft.radius ?? tokens.scales.radius.md} min={0} max={28} step={2} onChange={(v) => save({ ...draft, base: draft.base ?? themeId, radius: v })} />
            <T size="sm" muted>Bentuk gelembung</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['rounded', 'Bulat'], ['tail', 'Berekor'], ['flat', 'Datar']].map(([v, l]) => <Chip key={v} label={l} active={(draft.bubbleShape ?? 'rounded') === v} onPress={() => save({ ...draft, base: draft.base ?? themeId, bubbleShape: v })} />)}
            </View>
            <T size="sm" muted>Kepadatan</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['compact', 'Rapat'], ['normal', 'Normal'], ['cozy', 'Longgar']].map(([v, l]) => <Chip key={v} label={l} active={(draft.density ?? 'normal') === v} onPress={() => save({ ...draft, base: draft.base ?? themeId, density: v })} />)}
            </View>
            <T size="sm" muted>Wallpaper</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip label="Polos" active={draft.wallpaper?.type !== 'gradient'} onPress={() => save({ ...draft, base: draft.base ?? themeId, wallpaper: { type: 'solid' } })} />
              {[['#1B2A5E', '#5B2C91'], ['#0B5C73', '#16A34A'], ['#7C2D12', '#DB2777'], ['#DCE8FF', '#F3DCFF']].map(([a, b]) => (
                <Chip key={a + b} label={`${a} → ${b}`} active={draft.wallpaper?.stops?.[0] === a} onPress={() => save({ ...draft, base: draft.base ?? themeId, wallpaper: { type: 'gradient', stops: [a, b] } })} />
              ))}
            </View>
          </>
        ) : null}
      </Section>

      {isGlass ? (
        <Section title="Efek kaca">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['otomatis', 'hidup', 'mati'] as GlassSetting[]).map((g) => <Chip key={g} label={g[0].toUpperCase() + g.slice(1)} active={glassSetting === g} onPress={() => t.setGlassSetting(g)} />)}
          </View>
          <T size="sm" muted>"Mati" memakai panel transparan tanpa blur, lebih hemat baterai di perangkat lemah.</T>
          {useCustom ? (
            <>
              <Stepper label="Kekuatan blur" value={draft.glass?.blur ?? 24} min={0} max={40} step={4} onChange={(v) => save({ ...draft, base: draft.base ?? themeId, glass: { ...(draft.glass ?? {}), blur: v } })} />
              <Stepper label="Kepekatan panel" value={draft.glass?.opacity ?? 0.14} min={0.05} max={0.8} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => save({ ...draft, base: draft.base ?? themeId, glass: { ...(draft.glass ?? {}), opacity: v } })} />
            </>
          ) : null}
        </Section>
      ) : null}

      {warnings.length ? (
        <GlassSurface style={{ padding: 12, gap: 4 }}>
          <T weight="bold">Warna disesuaikan otomatis</T>
          {warnings.map((w) => (
            <T key={w.role} size="sm" muted>
              {w.role}: kontras {w.ratio_before}:1 diperbaiki menjadi {w.ratio_after}:1 agar tetap terbaca.
            </T>
          ))}
        </GlassSurface>
      ) : null}

      <View style={{ gap: 8 }}>
        <T size="sm" muted>Pratinjau kontras teks utama: {contrast(c.text, c.bg).toFixed(1)}:1</T>
        <Button variant="secondary" title="Reset ke tema dasar" onPress={() => { t.reset(); setDraft({ base: themeId, overrides: {} }); setHex({}); }} />
      </View>
    </ScrollView>
  );
}
