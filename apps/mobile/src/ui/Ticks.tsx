import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

export type Status = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
const LABEL: Record<Status, string> = { sending: 'mengirim', sent: 'terkirim', delivered: 'sampai', read: 'dibaca', failed: 'gagal' };

export function Ticks({ status, size = 15 }: { status: Status; size?: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const props = { size, accessibilityLabel: LABEL[status] } as const;
  if (status === 'sending') return <Ionicons name="time-outline" color={c.tickOut} {...props} />;
  if (status === 'failed') return <Ionicons name="alert-circle" color={c.danger} {...props} />;
  if (status === 'sent') return <Ionicons name="checkmark" color={c.tickOut} {...props} />;
  if (status === 'delivered') return <Ionicons name="checkmark-done" color={c.tickOut} {...props} />;
  return <Ionicons name="checkmark-done" color={c.tickReadOut} {...props} />;
}
