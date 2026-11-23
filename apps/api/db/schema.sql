-- XyinnCht: skema PostgreSQL (migrasi pertama)
-- Waktu selalu timestamptz (UTC). Akses data lewat API; tidak ada akses langsung dari klien.

create extension if not exists pgcrypto;

-- ===== Pengguna =====
create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique check (phone ~ '^\\+[1-9][0-9]{6,14}$'),   -- E.164; NULL untuk akun beta tanpa nomor HP
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  about text not null default '' check (char_length(about) <= 140),
  avatar_url text,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid,
  status text not null default 'active' check (status in ('active','banned')),
  banned_at timestamptz,
  ban_reason text,
  created_by_admin boolean not null default false,
  profile_completed boolean not null default false,
  last_seen_at timestamptz,
  show_last_seen boolean not null default true,
  show_read_receipts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on users (status);
create index on users (created_at);

-- OTP lokal (kalau tidak memakai penyedia yang menyimpan kode sendiri). Kode disimpan sebagai hash.
create table otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  ip inet,
  created_at timestamptz not null default now()
);
create index on otp_requests (phone, created_at desc);
create index on otp_requests (ip, created_at desc);

create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  device_name text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on refresh_tokens (user_id);

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  push_token text not null unique,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index on devices (user_id);

create table blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ===== Percakapan =====
create table conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct','group')),
  direct_key text unique,
  title text,
  avatar_url text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((type = 'direct' and direct_key is not null) or (type = 'group' and direct_key is null))
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  last_read_seq bigint not null default 0,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);
create index on conversation_members (user_id);

-- ===== Pesan =====
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  seq bigint not null,
  sender_id uuid not null references users(id) on delete cascade,
  client_id uuid not null,
  type text not null default 'text' check (type in ('text','image')),
  body text check (char_length(body) <= 4000),
  media_url text,
  reply_to uuid references messages(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (conversation_id, seq),
  unique (sender_id, client_id)
);
create index on messages (conversation_id, seq desc);

create table message_receipts (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);
create index on message_receipts (user_id, read_at);

-- ===== Admin (terpisah dari pengguna) =====
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  totp_secret_enc text not null,
  role text not null default 'moderator' check (role in ('moderator','superadmin')),
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table users
  add constraint users_verified_by_fk foreign key (verified_by) references admins(id) on delete set null;

create table audit_log (
  id bigserial primary key,
  admin_id uuid references admins(id) on delete set null,
  action text not null check (action in
    ('admin.login','user.create','user.ban','user.unban','user.verify','user.unverify','admin.create')),
  target_user_id uuid references users(id) on delete set null,
  details jsonb not null default '{}',
  ip inet,
  created_at timestamptz not null default now()
);
create index on audit_log (created_at desc);
create index on audit_log (target_user_id);
