import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { useRealtime } from '../../src/realtime/RealtimeContext';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Avatar } from '../../src/ui/Avatar';
import { Button } from '../../src/ui/Button';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';

type U = { id: string; display_name: string; username: string | null; avatar_url: string | null };

export default function NewGroup() {
  const router = useRouter();
  const { createGroup } = useRealtime();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<U[]>([]);
  const [picked, setPicked] = useState<U[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setError(null);
    try {
      setFound((await api<{ users: U[] }>(`/users/search?q=${encodeURIComponent(q.trim())}`)).users);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };
  const toggle = (u: U) => setPicked((p) => (p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]));

  const create = async () => {
    setLoading(true);
    try {
      const id = await createGroup(title.trim(), picked.map((u) => u.id));
      router.replace(`/chat/${id}`);
    } catch (e) {
      setError((e as ApiError).message);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Input label="Nama grup" value={title} onChangeText={setTitle} maxLength={60} />
      <Input label="Cari anggota" value={q} onChangeText={setQ} placeholder="Nomor HP lengkap atau @username" autoCapitalize="none" onSubmitEditing={search} returnKeyType="search" error={error} />
      <Button variant="secondary" title="Cari" disabled={q.trim().length < 3} onPress={search} />
      {picked.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {picked.map((u) => (
            <Pressable key={u.id} onPress={() => toggle(u)} accessibilityLabel={`Hapus ${u.display_name}`} style={{ backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <T size="sm" color={theme.colors.onAccent}>{u.display_name} ✕</T>
            </Pressable>
          ))}
        </View>
      ) : null}
      {found.map((u) => (
        <Pressable key={u.id} onPress={() => toggle(u)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <Avatar id={u.id} name={u.display_name} uri={u.avatar_url} size={40} />
          <T style={{ flex: 1 }}>{u.display_name}</T>
          <T color={theme.colors.accent}>{picked.some((x) => x.id === u.id) ? 'Dipilih' : 'Pilih'}</T>
        </Pressable>
      ))}
      <Button title="Buat grup" loading={loading} disabled={!title.trim() || picked.length === 0} onPress={create} />
    </ScrollView>
  );
}
