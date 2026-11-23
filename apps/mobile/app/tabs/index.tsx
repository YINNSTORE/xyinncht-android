import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { ChatListItem } from '../../src/chat/ChatListItem';
import { useRealtime } from '../../src/realtime/RealtimeContext';
import { useTheme } from '../../src/theme/ThemeProvider';
import { T } from '../../src/ui/T';

export default function ChatList() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, status, typing, refreshConversations } = useRealtime();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  if (!user) return null;
  const h = theme.listRowHeight;

  return (
    <View style={{ flex: 1 }}>
      {status !== 'online' ? (
        <View style={{ backgroundColor: theme.colors.surfaceAlt, paddingVertical: 6, alignItems: 'center' }}>
          <T size="xs" muted>{status === 'connecting' ? 'Menyambungkan…' : 'Tidak terhubung, mencoba lagi…'}</T>
        </View>
      ) : null}
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.accent}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshConversations();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => <ChatListItem conv={item} myId={user.id} typing={typing[item.id]} onPress={() => router.push(`/chat/${item.id}`)} />}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
            <T weight="bold">Belum ada percakapan</T>
            <T muted style={{ textAlign: 'center' }}>Buka tab Cari untuk menemukan teman lewat nomor HP atau username.</T>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 96 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buat grup baru"
        onPress={() => router.push('/group/new')}
        style={{ position: 'absolute', right: 16, bottom: 88, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="people" size={24} color={theme.colors.onAccent} />
      </Pressable>
    </View>
  );
}
