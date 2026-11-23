import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { T } from './T';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};
const HEIGHT = { sm: 36, md: 44, lg: 52 };

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const bg = variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.onAccent : variant === 'danger' ? pickOnDanger(c) : variant === 'secondary' ? c.text : c.accent;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        { height: HEIGHT[size], minWidth: 44, borderRadius: theme.radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <T weight="medium" color={fg}>{title}</T>}
    </Pressable>
  );
}

// teks di atas tombol danger: pilih putih atau gelap sesuai kecerahan latar
function pickOnDanger(c: Record<string, string>) {
  const hex = c.danger.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#14161F' : '#FFFFFF';
}
