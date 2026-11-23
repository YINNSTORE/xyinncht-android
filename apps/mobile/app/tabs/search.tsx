import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { useRealtime } from '../../src/realtime/RealtimeContext';
import { Avatar } from '../../src/ui/Avatar';
import { Button } from '../../src/ui/Button';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';
import { VerifiedBadge } from '../../src/ui/VerifiedBadge';

type U = { id: string; display_name: string; username: string | null; about: string; avatar_url: string | null; is_verified: boolean };

export default function Search() {
  const router = useRouter();
  const { openDirect } = useRealtime();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ users: U[] }>(`/users/search?q=${encodeURIComponent(q.trim())}`);
      setUsers(r.users);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const open = async (u: U) => {
    try {
      const id = await openDirect(u.id);
      router.push(`/chat/${id}`);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Input value={q} onChangeText={setQ} placeholder="Nomor HP lengkap atau @username" autoCapitalize="none" returnKeyType="search" onSubmitEditing={run} error={error} />
      <Button title="Cari" loading={loading} disabled={q.trim().length < 3} onPress={run} />
      <FlatList
        data={users ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} onLongPress={() => router.push(`/contact/${item.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <Avatar id={item.id} name={item.display_name} uri={item.avatar_url} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T weight="medium">{item.display_name}</T>
                {item.is_verified ? <VerifiedBadge /> : null}
              </View>
              <T size="sm" muted>{item.username ? '@' + item.username : item.about}</T>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={users ? <T muted style={{ textAlign: 'center', marginTop: 24 }}>Tidak ditemukan. Nomor harus ditulis lengkap, username minimal 3 huruf.</T> : null}
      />
    </View>
  );
}
