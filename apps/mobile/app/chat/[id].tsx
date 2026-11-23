import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';
import { MessageBubble } from '../../src/chat/MessageBubble';
import { Msg, convTitle, otherMember } from '../../src/lib/conv';
import { useRealtime } from '../../src/realtime/RealtimeContext';
import { useTheme } from '../../src/theme/ThemeProvider';
import { GlassSurface } from '../../src/ui/GlassSurface';
import { T } from '../../src/ui/T';
import { VerifiedBadge } from '../../src/ui/VerifiedBadge';

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const rt = useRealtime();
  const { theme, fontFamily, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Msg | null>(null);

  const list = rt.messages[id] ?? [];
  const conv = rt.conversations.find((x) => x.id === id);
  const data = useMemo(() => [...list].reverse(), [list]);
  const byId = useMemo(() => new Map(list.filter((m) => m.id).map((m) => [m.id as string, m])), [list]);

  useEffect(() => {
    rt.setActive(id);
    rt.loadMessages(id).then(() => rt.markRead(id));
    return () => rt.setActive(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    rt.markRead(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  if (!user) return null;
  const other = conv ? otherMember(conv, user.id) : null;
  const title = conv ? convTitle(conv, user.id) : 'Chat';
  const names = new Map((conv?.members ?? []).map((m) => [m.id, m.display_name]));

  const send = () => {
    rt.sendText(id, text, replyTo?.id ?? null);
    setText('');
    setReplyTo(null);
  };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled || !r.assets[0]) return;
    try {
      await rt.sendImage(id, r.assets[0].uri);
    } catch (e) {
      Alert.alert('Gagal mengirim foto', (e as Error).message);
    }
  };

  const actions = (m: Msg) => {
    if (m.deleted_at || !m.id) return;
    const opts: any[] = [{ text: 'Balas', onPress: () => setReplyTo(m) }];
    if (m.sender_id === user.id) opts.push({ text: 'Hapus untuk semua', style: 'destructive', onPress: () => rt.deleteMessage(id, m.id as string) });
    opts.push({ text: 'Batal', style: 'cancel' });
    Alert.alert('Pesan', undefined, opts);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable onPress={() => other && router.push(`/contact/${other.id}`)} style={{ gap: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T weight="bold">{title}</T>
                {other?.is_verified ? <VerifiedBadge size={15} /> : null}
              </View>
              <T size="xs" muted>{rt.typing[id] ? 'mengetik…' : rt.status === 'online' ? '' : 'menunggu koneksi'}</T>
            </Pressable>
          ),
        }}
      />
      <FlatList
        inverted
        data={data}
        keyExtractor={(m) => m.client_id}
        onEndReached={() => rt.loadOlder(id)}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            mine={item.sender_id === user.id}
            quoted={item.reply_to ? byId.get(item.reply_to) ?? null : null}
            senderName={conv?.type === 'group' ? names.get(item.sender_id) : null}
            onLongPress={() => actions(item)}
            onRetry={() => rt.retry(id, item.client_id)}
          />
        )}
        ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }], padding: 32 }}><T muted style={{ textAlign: 'center' }}>Belum ada pesan. Kirim yang pertama.</T></View>}
      />
      {replyTo ? (
        <GlassSurface rounded={false} style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size="sm" muted numberOfLines={1} style={{ flex: 1 }}>Membalas: {replyTo.type === 'image' ? 'Foto' : replyTo.body}</T>
          <Pressable onPress={() => setReplyTo(null)} accessibilityLabel="Batalkan balasan" hitSlop={12}>
            <Ionicons name="close" size={20} color={c.textMuted} />
          </Pressable>
        </GlassSurface>
      ) : null}
      <GlassSurface rounded={false} style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 + insets.bottom, flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: tokens.scales.layout.inputBarHeight }}>
        <Pressable onPress={pickImage} accessibilityLabel="Kirim foto" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="image-outline" size={24} color={c.accent} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (v) rt.sendTyping(id);
          }}
          placeholder="Tulis pesan"
          placeholderTextColor={c.textMuted}
          multiline
          accessibilityLabel="Tulis pesan"
          style={{ flex: 1, maxHeight: 120, minHeight: 44, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: c.borderInput, backgroundColor: c.surface, color: c.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: tokens.scales.fontSize.md * theme.fontScale, fontFamily: fontFamily('regular') }}
        />
        <Pressable
          onPress={send}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Kirim"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}
        >
          <Ionicons name="send" size={20} color={c.onAccent} />
        </Pressable>
      </GlassSurface>
    </KeyboardAvoidingView>
  );
}
