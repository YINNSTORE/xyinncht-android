export const publicUser = (u) => ({
  id: u.id,
  display_name: u.display_name,
  username: u.username,
  about: u.about,
  avatar_url: u.avatar_url,
  is_verified: u.is_verified,
});

export const selfUser = (u) => ({
  ...publicUser(u),
  phone: u.phone ?? '',
  status: u.status,
  profile_completed: u.profile_completed,
  show_last_seen: u.show_last_seen,
  show_read_receipts: u.show_read_receipts,
  ban_reason: u.status === 'banned' ? u.ban_reason : null,
});

export const messageDto = (m) => ({
  id: m.id,
  conversation_id: m.conversation_id,
  seq: Number(m.seq),
  sender_id: m.sender_id,
  client_id: m.client_id,
  type: m.type,
  body: m.deleted_at ? null : m.body,
  media_url: m.deleted_at ? null : m.media_url,
  reply_to: m.reply_to,
  created_at: m.created_at,
  deleted_at: m.deleted_at ?? null,
});
