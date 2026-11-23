import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { Me, useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/ui/Button';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';

export default function GuestLogin() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await api<{ tokens: any; user: Me }>('/auth/guest', {
        body: {
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          access_code: accessCode,
          device_name: 'Android',
        },
        auth: false,
      });
      await signIn(result.tokens, result.user);
      router.replace('/tabs');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const validUsername = /^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase());

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, gap: 14, justifyContent: 'center' }}>
        <T size="xl" weight="bold">Masuk beta XyinnCht</T>
        <T muted>Mode uji coba sementara. Nomor HP belum diperlukan. Gunakan kode akses beta dari pemilik server.</T>
        <Input label="Nama tampilan" value={displayName} onChangeText={setDisplayName} maxLength={60} autoFocus />
        <Input label="Username (3–24 karakter)" value={username} onChangeText={setUsername} maxLength={24} />
        <Input label="Kode akses beta" value={accessCode} onChangeText={setAccessCode} maxLength={128} />
        {error ? <T color="danger">{error}</T> : null}
        <View>
          <Button title="Masuk & mulai chat" loading={loading} disabled={!displayName.trim() || !validUsername || accessCode.length < 16} onPress={submit} />
        </View>
        <Button variant="ghost" title="Kembali" onPress={() => router.back()} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
