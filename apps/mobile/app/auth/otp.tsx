import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { Me, useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/ui/Button';
import { T } from '../../src/ui/T';

export default function Otp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn, setBanned } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
  const ref = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ tokens: any; user: Me }>('/auth/otp/verify', { body: { phone, code: value, device_name: 'Android' }, auth: false });
      await signIn(r.tokens, r.user);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'banned') setBanned(err.message);
      else setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 6);
    setCode(d);
    if (d.length === 6) verify(d);
  };

  const resend = async () => {
    try {
      await api('/auth/otp/request', { body: { phone }, auth: false });
      setWait(60);
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
      <T size="xl" weight="bold">Masukkan kode</T>
      <T muted>Kode dikirim ke {phone}.</T>
      <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Kolom kode verifikasi" style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={{ width: 44, height: 54, borderRadius: theme.radius.md, borderWidth: code.length === i ? 2 : 1, borderColor: error ? c.danger : code.length === i ? c.accent : c.borderInput, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <T size="xl" weight="bold">{code[i] ?? ''}</T>
          </View>
        ))}
        <TextInput ref={ref} autoFocus value={code} onChangeText={onChange} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%' }} />
      </Pressable>
      {error ? <T color={c.danger} style={{ textAlign: 'center' }}>{error}</T> : null}
      <Button variant="ghost" title={wait > 0 ? `Kirim ulang dalam ${wait} dtk` : 'Kirim ulang kode'} disabled={wait > 0} onPress={resend} loading={loading} />
    </SafeAreaView>
  );
}
