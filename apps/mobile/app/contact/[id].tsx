import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { useRealtime } from '../../src/realtime/RealtimeContext';
import { Avatar } from '../../src/ui/Avatar';
import { Button } from '../../src/ui/Button';
import { GlassSurface } from '../../src/ui/GlassSurface';
import { T } from '../../src/ui/T';
import { VerifiedBadge } from '../../src/ui/VerifiedBadge';

type U = { id: string; display_name: string; username: string | null; about: string; avatar_url: string | null; is_verified: boolean };

export default function Contact() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openDirect } = useRealtime();
  const [u, setU] = useState<U | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ user: U | null; blocked?: boolean }>(`/users/${id}`).then((r) => {
      setU(r.user);
      setBlocked(!!r.blocked);
    }).catch((e) => setMsg((e as ApiError).message));
  }, [id]);

  const toggleBlock = async () => {
    try {
      if (blocked) await api(`/blocks/${id}`, { method: 'DELETE' });
      else await api('/blocks', { body: { user_id: id } });
      setBlocked(!blocked);
    } catch (e) {
      setMsg((e as ApiError).message);
    }
  };

  if (!u) return <View style={{ padding: 24 }}><T muted>{msg ?? 'Memuat…'}</T></View>;
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <GlassSurface style={{ padding: 20, alignItems: 'center', gap: 8 }}>
        <Avatar id={u.id} name={u.display_name} uri={u.avatar_url} size={96} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T size="xl" weight="bold">{u.display_name}</T>
          {u.is_verified ? <VerifiedBadge size={20} /> : null}
        </View>
        {u.username ? <T muted>@{u.username}</T> : null}
        {u.about ? <T style={{ textAlign: 'center' }}>{u.about}</T> : null}
      </GlassSurface>
      {msg ? <T color="#C62828">{msg}</T> : null}
      <Button title="Kirim pesan" disabled={blocked} onPress={async () => router.replace(`/chat/${await openDirect(u.id)}`)} />
      <Button variant={blocked ? 'secondary' : 'danger'} title={blocked ? 'Buka blokir' : 'Blokir pengguna'} onPress={toggleBlock} />
    </View>
  );
}
