import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextProps & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  muted?: boolean;
};

export function T({ size = 'md', weight = 'regular', color, muted, style, ...rest }: Props) {
  const { theme, fontFamily, tokens } = useTheme();
  const px = (tokens.scales.fontSize as Record<string, number>)[size] * theme.fontScale;
  return (
    <Text
      {...rest}
      style={[
        { fontSize: px, lineHeight: px * tokens.scales.lineHeight, color: color ?? (muted ? theme.colors.textMuted : theme.colors.text), fontFamily: fontFamily(weight) },
        weight !== 'regular' && !fontFamily(weight) ? { fontWeight: weight === 'bold' ? '700' : '500' } : null,
        style,
      ]}
    />
  );
}
