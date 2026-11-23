import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_URL, TERMS_URL } from '../../src/api/client';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/ui/Button';
import { T } from '../../src/ui/T';

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <T size="xxl" weight="bold" color={theme.colors.accent}>XyinnCht</T>
        <T size="lg">Chat ringan, cepat, dan bisa Anda atur tampilannya.</T>
      </View>
      <View style={{ gap: 12 }}>
        <T size="sm" muted>
          Dengan melanjutkan, Anda menyetujui{' '}
          <T size="sm" color={theme.colors.accent} onPress={() => TERMS_URL && Linking.openURL(TERMS_URL)}>Ketentuan Layanan</T> dan{' '}
          <T size="sm" color={theme.colors.accent} onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL)}>Kebijakan Privasi</T>.
        </T>
        <Button size="lg" title="Mulai beta tanpa nomor HP" onPress={() => router.push('/auth/guest')} />
      </View>
    </SafeAreaView>
  );
}
