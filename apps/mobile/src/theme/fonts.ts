// Font dibundel per bobot (impor subpath agar hanya bobot yang dipakai ikut dalam APK).
// Periksa nama ekspor sesudah `npx expo install @expo-google-fonts/...`.
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_700Bold } from '@expo-google-fonts/lora/700Bold';

export type Weight = 'regular' | 'medium' | 'bold';
type Set = { names: Record<Weight, string>; files: Record<string, any> };

export const FONT_SETS: Record<string, Set | null> = {
  sistem: null,
  manrope: {
    names: { regular: 'Manrope_400Regular', medium: 'Manrope_500Medium', bold: 'Manrope_700Bold' },
    files: { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold },
  },
  'plus-jakarta-sans': {
    names: { regular: 'PlusJakartaSans_400Regular', medium: 'PlusJakartaSans_500Medium', bold: 'PlusJakartaSans_700Bold' },
    files: { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold },
  },
  nunito: {
    names: { regular: 'Nunito_400Regular', medium: 'Nunito_600SemiBold', bold: 'Nunito_700Bold' },
    files: { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold },
  },
  'ibm-plex-sans': {
    names: { regular: 'IBMPlexSans_400Regular', medium: 'IBMPlexSans_500Medium', bold: 'IBMPlexSans_700Bold' },
    files: { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_700Bold },
  },
  lora: {
    names: { regular: 'Lora_400Regular', medium: 'Lora_500Medium', bold: 'Lora_700Bold' },
    files: { Lora_400Regular, Lora_500Medium, Lora_700Bold },
  },
};
