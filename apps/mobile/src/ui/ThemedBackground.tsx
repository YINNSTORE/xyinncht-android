import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function ThemedBackground({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const w = theme.wallpaper;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {w && w.length >= 2 ? (
        <LinearGradient colors={w as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      ) : null}
      {children}
    </View>
  );
}
