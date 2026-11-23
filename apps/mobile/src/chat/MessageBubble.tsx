import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Msg } from '../lib/conv';
import { timeLabel } from '../lib/conv';
import { messageStatus } from '../lib/messageStatus';
import { useTheme } from '../theme/ThemeProvider';
import { T } from '../ui/T';
import { Ticks } from '../ui/Ticks';

type Props = {
  msg: Msg;
  mine: boolean;
  quoted?: Msg | null;
  senderName?: string | null;
  onLongPress?: () => void;
  onRetry?: () => void;
};

export function MessageBubble({ msg, mine, quoted, senderName, onLongPress, onRetry }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const R = theme.radius.md;
  const small = Math.max(2, Math.round(R / 4));
  const shape = theme.bubbleShape;
  const radius =
    shape === 'flat'
      ? { borderRadius: theme.radius.sm }
      : shape === 'tail'
        ? { borderRadius: R, ...(mine ? { borderBottomRightRadius: small } : { borderBottomLeftRadius: small }) }
        : { borderRadius: R };
  const bg = mine ? c.bubbleOut : c.bubbleIn;
  const fg = mine ? c.onBubbleOut : c.onBubbleIn;
  const timeColor = mine ? c.timeOut : c.textMuted;
  const deleted = !!msg.deleted_at;
  const status = mine ? messageStatus(msg) : null;
  const tight = theme.density === 'compact' ? 2 : theme.density === 'cozy' ? 8 : 4;

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', paddingHorizontal: 12, paddingVertical: tight }}>
      <Pressable
        onLongPress={onLongPress}
        onPress={msg.state === 'failed' ? onRetry : undefined}
        accessibilityHint={msg.state === 'failed' ? 'Ketuk untuk mengirim ulang' : undefined}
        style={[{ maxWidth: '78%', backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: mine ? 0 : theme.glass ? 1 : 1, borderColor: c.border }, radius]}
      >
        {senderName && !mine ? <T size="xs" weight="bold" color={c.accent}>{senderName}</T> : null}
        {quoted ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: mine ? c.timeOut : c.accent, paddingLeft: 8, marginBottom: 6, opacity: 0.9 }}>
            <T size="xs" color={fg} numberOfLines={2}>{quoted.deleted_at ? 'Pesan dihapus' : quoted.type === 'image' ? 'Foto' : quoted.body ?? ''}</T>
          </View>
        ) : null}
        {deleted ? (
          <T size="sm" color={fg} style={{ fontStyle: 'italic' }}>Pesan dihapus</T>
        ) : msg.type === 'image' && msg.media_url ? (
          <Image source={{ uri: msg.media_url }} style={{ width: 220, height: 165, borderRadius: Math.max(4, R - 4), marginBottom: msg.body ? 6 : 0 }} accessibilityLabel="Foto" />
        ) : null}
        {!deleted && msg.body ? <T color={fg}>{msg.body}</T> : null}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 }}>
          {msg.state === 'failed' ? <T size="xs" color={timeColor}>Gagal, ketuk untuk coba lagi</T> : <T size="xs" color={timeColor}>{timeLabel(msg.created_at)}</T>}
          {status ? <Ticks status={status} size={14} /> : null}
        </View>
      </Pressable>
    </View>
  );
}
