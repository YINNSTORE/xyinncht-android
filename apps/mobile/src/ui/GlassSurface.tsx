import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Permukaan untuk bilah, modal, dan kartu. Tema kaca: blur + panelFill + tepi + sorot.
// Tema biasa: warna surface dengan garis tepi. Efek blur dimatikan saat glass.useBlur=false.
export function GlassSurface({ style, children, rounded = true }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; rounded?: boolean }) {
  const { theme } = useTheme();
  const g = theme.glass;
  const radius = rounded ? theme.radius.lg : 0;
  if (!g) {
    return (
      <View style={[{ backgroundColor: theme.colors.surface, borderRadius: radius, borderWidth: 1, borderColor: theme.colors.border }, style]}>
        {children}
      </View>
    );
  }
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: g.panelBorder }, style]}>
      {g.useBlur ? (
        // @ts-expect-error experimentalBlurMethod hanya ada di versi expo-blur tertentu; hapus baris ini bila tidak error
        <BlurView intensity={Math.min(100, g.blur * 2.5)} tint={theme.mode === 'dark' ? 'dark' : 'light'} experimentalBlurMethod="dimezisBlurView" style={{ position: 'absolute', inset: 0 }} />
      ) : null}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: g.panelFill }} />
      <LinearGradient
        pointerEvents="none"
        colors={[g.highlight, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={{ position: 'absolute', inset: 0, opacity: 0.5 }}
      />
      {children}
    </View>
  );
}
