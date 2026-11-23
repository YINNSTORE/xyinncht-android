import React from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPPORT_EMAIL } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/ui/Button';
import { GlassSurface } from '../src/ui/GlassSurface';
import { T } from '../src/ui/T';

export default function Banned() {
  const { banned, signOut } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <GlassSurface style={{ padding: 20, gap: 12 }}>
        <T size="xl" weight="bold">Akun diblokir</T>
        <T>Akun Anda tidak dapat digunakan karena melanggar ketentuan layanan.</T>
        {banned?.message ? <T muted>Alasan: {banned.message}</T> : null}
        <View style={{ gap: 8, marginTop: 8 }}>
          {SUPPORT_EMAIL ? <Button variant="secondary" title="Hubungi dukungan" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} /> : null}
          <Button title="Kembali" onPress={signOut} />
        </View>
      </GlassSurface>
    </SafeAreaView>
  );
}
