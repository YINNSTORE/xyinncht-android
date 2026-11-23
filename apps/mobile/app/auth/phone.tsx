import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/ui/Button';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';

export default function Phone() {
  const router = useRouter();
  const { setBanned } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api('/auth/otp/request', { body: { phone }, auth: false });
      router.push({ pathname: '/auth/otp', params: { phone } });
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'banned') setBanned(err.message);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <T size="xl" weight="bold">Masukkan nomor HP</T>
        <T muted>Kami akan mengirim kode 6 digit lewat SMS. Contoh: 0812 3456 7890 atau +62 812 3456 7890.</T>
        <Input label="Nomor HP" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={error} />
        <View>
          <Button title="Kirim kode" loading={loading} disabled={phone.replace(/\D/g, '').length < 6} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
