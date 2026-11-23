import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Switch, View } from 'react-native';
import { api, ApiError, PRIVACY_URL } from '../../src/api/client';
import { Me, useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Avatar } from '../../src/ui/Avatar';
import { Button } from '../../src/ui/Button';
import { GlassSurface } from '../../src/ui/GlassSurface';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';
import { VerifiedBadge } from '../../src/ui/VerifiedBadge';

export default function MeScreen() {
  const router = useRouter();
  const { user, updateUser, signOut } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState(user?.display_name ?? '');
  const [about, setAbout] = useState(user?.about ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  const patch = async (body: Record<string, unknown>, okText?: string) => {
    setMsg(null);
    try {
      const r = await api<{ user: Me }>('/me', { method: 'PATCH', body });
      updateUser(r.user);
      if (okText) setMsg(okText);
    } catch (e) {
      setMsg((e as ApiError).message);
    }
  };

  const save = async () => {
    setLoading(true);
    await patch({ display_name: name.trim(), about: about.trim(), username: username.trim() ? username.trim().toLowerCase() : null }, 'Tersimpan');
    setLoading(false);
  };

  const remove = () =>
    Alert.alert('Hapus akun?', 'Semua data Anda dihapus permanen dan tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/me', { method: 'DELETE' });
            await signOut();
          } catch (e) {
            setMsg((e as ApiError).message);
          }
        },
      },
    ]);

  const Row = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <T>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} thumbColor="#FFFFFF" accessibilityLabel={label} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar id={user.id} name={user.display_name} uri={user.avatar_url} size={72} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T size="lg" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{user.display_name}</T>
            {user.is_verified ? <VerifiedBadge size={18} /> : null}
          </View>
          <T size="sm" muted>{user.phone}</T>
        </View>
      </View>

      <GlassSurface style={{ padding: 16, gap: 12 }}>
        <Input label="Nama" value={name} onChangeText={setName} maxLength={60} />
        <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={24} placeholder="huruf kecil, angka, _" />
        <Input label="Tentang" value={about} onChangeText={setAbout} maxLength={140} />
        {msg ? <T size="sm" muted>{msg}</T> : null}
        <Button title="Simpan" loading={loading} disabled={!name.trim()} onPress={save} />
      </GlassSurface>

      <GlassSurface style={{ padding: 16 }}>
        <Row label="Tampilkan terakhir dilihat" value={user.show_last_seen} onChange={(v) => patch({ show_last_seen: v })} />
        <Row label="Kirim centang dibaca" value={user.show_read_receipts} onChange={(v) => patch({ show_read_receipts: v })} />
      </GlassSurface>

      <Button variant="secondary" title="Tema & Font" onPress={() => router.push('/settings/theme')} />
      {PRIVACY_URL ? <Button variant="ghost" title="Kebijakan Privasi" onPress={() => Linking.openURL(PRIVACY_URL)} /> : null}
      <Button variant="secondary" title="Keluar" onPress={signOut} />
      <Button variant="danger" title="Hapus akun" onPress={remove} />
    </ScrollView>
  );
}
