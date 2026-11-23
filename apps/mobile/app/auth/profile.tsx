import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { Me, useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/ui/Button';
import { Input } from '../../src/ui/Input';
import { T } from '../../src/ui/T';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.display_name && user.display_name !== 'Pengguna' ? user.display_name : '');
  const [about, setAbout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ user: Me }>('/me', { method: 'PATCH', body: { display_name: name.trim(), about: about.trim() } });
      updateUser(r.user);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <T size="xl" weight="bold">Profil Anda</T>
        <T muted>Nama ini terlihat oleh teman Anda.</T>
        <Input label="Nama" value={name} onChangeText={setName} maxLength={60} autoFocus error={error} />
        <Input label="Tentang (opsional)" value={about} onChangeText={setAbout} maxLength={140} />
        <Button title="Selesai" loading={loading} disabled={!name.trim()} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}
