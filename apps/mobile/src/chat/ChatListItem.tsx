import React from 'react';
import { Pressable, View } from 'react-native';
import { Conv, convTitle, otherMember, previewOf, timeLabel } from '../lib/conv';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../ui/Avatar';
import { T } from '../ui/T';
import { VerifiedBadge } from '../ui/VerifiedBadge';

export function ChatListItem({ conv, myId, onPress, typing }: { conv: Conv; myId: string; onPress: () => void; typing?: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const other = otherMember(conv, myId);
  const title = convTitle(conv, myId);
  const unread = conv.unread > 0;
  const when = conv.last_message?.created_at;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${unread ? `, ${conv.unread} pesan belum dibaca` : ''}`}
      style={({ pressed }) => ({ height: theme.listRowHeight, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1 })}
    >
      <Avatar id={other?.id ?? conv.id} name={title} uri={other?.avatar_url ?? conv.avatar_url} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T weight={unread ? 'bold' : 'medium'} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</T>
          {other?.is_verified ? <VerifiedBadge size={15} /> : null}
          <View style={{ flex: 1 }} />
          <T size="xs" muted>{timeLabel(when)}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size="sm" muted={!typing} color={typing ? c.accent : undefined} numberOfLines={1} style={{ flex: 1 }}>
            {typing ? 'mengetik…' : previewOf(conv.last_message, myId)}
          </T>
          {unread ? (
            <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <T size="xs" weight="bold" color={c.onAccent}>{conv.unread > 99 ? '99+' : conv.unread}</T>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
