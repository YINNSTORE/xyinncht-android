import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { FONT_SETS, Weight } from './fonts';
import { resolveTheme } from './themeCore';
import tokens from './tokens.json';

export type Theme = ReturnType<typeof resolveTheme>['theme'];
export type CustomTheme = Record<string, any> | null;
export type GlassSetting = 'otomatis' | 'hidup' | 'mati';

type Ctx = {
  theme: Theme;
  warnings: ReturnType<typeof resolveTheme>['warnings'];
  themeId: string;
  custom: CustomTheme;
  useCustom: boolean;
  glassSetting: GlassSetting;
  setThemeId: (id: string) => void;
  setCustom: (c: CustomTheme) => void;
  setUseCustom: (v: boolean) => void;
  setGlassSetting: (g: GlassSetting) => void;
  fontFamily: (w?: Weight) => string | undefined;
  loadAllFonts: () => Promise<void>;
  reset: () => void;
  tokens: typeof tokens;
};

const KEY = 'xc_theme_v1';
const ThemeCtx = createContext<Ctx>(null as unknown as Ctx);
export const useTheme = () => useContext(ThemeCtx);

const loadedFonts = new Set<string>();
async function ensureFont(id: string) {
  const set = FONT_SETS[id];
  if (!set || loadedFonts.has(id)) return;
  await Font.loadAsync(set.files);
  loadedFonts.add(id);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [loaded, setLoaded] = useState(false);
  const [themeId, setThemeIdState] = useState<string>(system === 'dark' ? 'gelap' : 'terang');
  const [custom, setCustomState] = useState<CustomTheme>(null);
  const [useCustom, setUseCustomState] = useState(false);
  const [glassSetting, setGlassSettingState] = useState<GlassSetting>('otomatis');
  const [fontReady, setFontReady] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.themeId) setThemeIdState(s.themeId);
        if (s.custom) setCustomState(s.custom);
        if (typeof s.useCustom === 'boolean') setUseCustomState(s.useCustom);
        if (s.glassSetting) setGlassSettingState(s.glassSetting);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ themeId, custom, useCustom, glassSetting })).catch(() => {});
  }, [loaded, themeId, custom, useCustom, glassSetting]);

  const { theme, warnings } = useMemo(
    () => resolveTheme(tokens as any, themeId, useCustom ? custom : null, { glassSetting }),
    [themeId, custom, useCustom, glassSetting],
  );

  useEffect(() => {
    ensureFont(theme.fontId).then(() => setFontReady((n) => n + 1)).catch(() => {});
  }, [theme.fontId]);

  const fontFamily = useCallback(
    (w: Weight = 'regular') => {
      const set = FONT_SETS[theme.fontId];
      return set && loadedFonts.has(theme.fontId) ? set.names[w] : undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.fontId, fontReady],
  );

  const value: Ctx = {
    theme, warnings, themeId, custom, useCustom, glassSetting, tokens,
    setThemeId: setThemeIdState,
    setCustom: setCustomState,
    setUseCustom: setUseCustomState,
    setGlassSetting: setGlassSettingState,
    fontFamily,
    loadAllFonts: async () => {
      await Promise.all(Object.keys(FONT_SETS).map(ensureFont));
      setFontReady((n) => n + 1);
    },
    reset: () => {
      setCustomState(null);
      setUseCustomState(false);
      setGlassSettingState('otomatis');
    },
  };
  if (!loaded) return null;
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
