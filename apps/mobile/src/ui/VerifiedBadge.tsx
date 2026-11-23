import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

// Perisai kecil bergaya XyinnCht (bukan bentuk lencana platform lain).
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="akun terverifikasi" accessible>
      <Path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z" fill={theme.colors.verified} />
      <Path d="M8 12 L11 15 L16.5 8.5" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
