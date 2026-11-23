import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image } from 'react-native';
import { api, freshAccessToken, WS_URL } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Conv, Msg, uuidv4 } from '../lib/conv';
import {
  addLocal, applyAck, applyDeleted, applyDelivered, applyFailed, applyIncoming, applyRead, applyRetry, lastSeq, mergeServer,
} from '../lib/messageStore';
import { registerPush } from '../push';

type Status = 'offline' | 'connecting' | 'online';
type OutboxItem = { conversation_id: string; client_id: string; type: 'text' | 'image'; body?: string; media_url?: string; reply_to?: string };

type Ctx = {
  status: Status;
  conversations: Conv[];
  messages: Record<string, Msg[]>;
  typing: Record<string, boolean>;
  refreshConversations: () => Promise<void>;
  loadMessages: (cid: string) => Promise<void>;
  loadOlder: (cid: string) => Promise<void>;
  sendText: (cid: string, body: string, replyTo?: string | null) => void;
  sendImage: (cid: string, uri: string) => Promise<void>;
  retry: (cid: string, clientId: string) => void;
  markRead: (cid: string) => void;
  sendTyping: (cid: string) => void;
  setActive: (cid: string | null) => void;
  openDirect: (userId: string) => Promise<string>;
  createGroup: (title: string, memberIds: string[]) => Promise<string>;
  deleteMessage: (cid: string, id: string) => Promise<void>;
  leaveGroup: (cid: string) => Promise<void>;
};

const RtCtx = createContext<Ctx>(null as unknown as Ctx);
export const useRealtime = () => useContext(RtCtx);

const FATAL = ['validation', 'blocked', 'recipient_unavailable', 'forbidden', 'banned', 'not_found', 'bad_reply'];
const imageSize = (uri: string) => new Promise<{ w: number; h: number }>((res, rej) => Image.getSize(uri, (w, h) => res({ w, h }), rej));

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, setBanned, signOut } = useAuth();
  const [status, setStatus] = useState<Status>('offline');
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const statusRef = useRef<Status>('offline');
  const userRef = useRef(user);
  const activeRef = useRef<string | null>(null);
  const outboxRef = useRef<OutboxItem[]>([]);
  const convsRef = useRef<Conv[]>([]);
  const messagesRef = useRef<Record<string, Msg[]>>({});
  const readSentRef = useRef<Record<string, number>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingSentAt = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  userRef.current = user;
  messagesRef.current = messages;
  convsRef.current = conversations;

  const setSt = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
  };
  const outboxKey = (uid: string) => `xc_outbox_${uid}`;
  const convsKey = (uid: string) => `xc_convs_${uid}`;
  const persistOutbox = () => {
    if (userRef.current) AsyncStorage.setItem(outboxKey(userRef.current.id), JSON.stringify(outboxRef.current)).catch(() => {});
  };
  const patch = (cid: string, fn: (l: Msg[]) => Msg[]) => setMessages((p) => ({ ...p, [cid]: fn(p[cid] ?? []) }));
  const wsSend = (obj: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  };

  const refreshConversations = useCallback(async () => {
    const me = userRef.current;
    if (!me) return;
    try {
      const { conversations: list } = await api<{ conversations: Conv[] }>('/conversations');
      setConversations(list);
      AsyncStorage.setItem(convsKey(me.id), JSON.stringify(list)).catch(() => {});
    } catch {
      /* offline: tampilkan cache */
    }
  }, []);
  const refreshSoon = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshConversations, 300);
  };

  const loadMessages = useCallback(async (cid: string) => {
    const me = userRef.current;
    if (!me) return;
    const have = (messagesRef.current[cid] ?? []).filter((m) => !m.state);
    const after = lastSeq(have);
    try {
      const { messages: srv } = await api<{ messages: Msg[] }>(`/conversations/${cid}/messages${after > 0 ? `?after_seq=${after}&limit=100` : '?limit=50'}`);
      patch(cid, (l) => mergeServer(l, srv));
      const incoming = srv.filter((m) => m.sender_id !== me.id && m.id).map((m) => m.id as string);
      if (incoming.length) wsSend({ t: 'message.delivered', ids: incoming.slice(-200) });
    } catch {
      /* offline */
    }
  }, []);

  const loadOlder = useCallback(async (cid: string) => {
    const list = messagesRef.current[cid] ?? [];
    const first = list.find((m) => m.seq !== undefined)?.seq;
    if (!first || first <= 1) return;
    try {
      const { messages: srv } = await api<{ messages: Msg[] }>(`/conversations/${cid}/messages?before_seq=${first}&limit=50`);
      patch(cid, (l) => mergeServer(l, srv));
    } catch {
      /* abaikan */
    }
  }, []);

  const markRead = useCallback((cid: string) => {
    const me = userRef.current;
    if (!me) return;
    const upTo = (messagesRef.current[cid] ?? []).filter((m) => m.sender_id !== me.id && m.seq !== undefined).reduce((mx, m) => Math.max(mx, m.seq as number), 0);
    setConversations((cs) => cs.map((c) => (c.id === cid && c.unread ? { ...c, unread: 0 } : c)));
    if (upTo > (readSentRef.current[cid] ?? 0) && statusRef.current === 'online') {
      readSentRef.current[cid] = upTo;
      wsSend({ t: 'message.read', conversation_id: cid, up_to_seq: upTo });
    }
  }, []);

  const trySend = (item: OutboxItem) => {
    if (statusRef.current === 'online') wsSend({ t: 'message.send', ...item });
  };
  const flushOutbox = () => outboxRef.current.forEach(trySend);

  const findCid = (clientId: string) => Object.keys(messagesRef.current).find((k) => messagesRef.current[k].some((m) => m.client_id === clientId));

  const handle = useCallback(
    (e: any) => {
      const me = userRef.current;
      if (!me) return;
      switch (e.t) {
        case 'auth.ok':
          attemptRef.current = 0;
          setSt('online');
          flushOutbox();
          refreshConversations();
          if (activeRef.current) {
            loadMessages(activeRef.current).then(() => markRead(activeRef.current as string));
          }
          break;
        case 'message.ack':
          outboxRef.current = outboxRef.current.filter((o) => o.client_id !== e.client_id);
          persistOutbox();
          patch(e.conversation_id, (l) => applyAck(l, e));
          refreshSoon();
          break;
        case 'message.new': {
          const m = e.message as Msg;
          patch(m.conversation_id, (l) => applyIncoming(l, m));
          if (m.id) wsSend({ t: 'message.delivered', ids: [m.id] });
          if (activeRef.current === m.conversation_id) setTimeout(() => markRead(m.conversation_id), 50);
          refreshSoon();
          break;
        }
        case 'receipt.delivered':
          patch(e.conversation_id, (l) => applyDelivered(l, e.message_id, e.user_id));
          break;
        case 'receipt.read':
          patch(e.conversation_id, (l) => applyRead(l, me.id, e.user_id, e.up_to_seq));
          break;
        case 'message.deleted':
          patch(e.conversation_id, (l) => applyDeleted(l, e.id));
          refreshSoon();
          break;
        case 'typing': {
          const cid = e.conversation_id as string;
          setTyping((t) => ({ ...t, [cid]: true }));
          if (typingTimers.current[cid]) clearTimeout(typingTimers.current[cid]);
          typingTimers.current[cid] = setTimeout(() => setTyping((t) => ({ ...t, [cid]: false })), 3000);
          break;
        }
        case 'account.banned':
          setBanned(e.reason);
          break;
        case 'account.deleted':
          signOut();
          break;
        case 'error':
          if (e.client_id && FATAL.includes(e.code)) {
            const cid = findCid(e.client_id);
            outboxRef.current = outboxRef.current.filter((o) => o.client_id !== e.client_id);
            persistOutbox();
            if (cid) patch(cid, (l) => applyFailed(l, e.client_id));
          }
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const connect = useCallback(async () => {
    if (!userRef.current || wsRef.current) return;
    setSt('connecting');
    const token = await freshAccessToken();
    if (!token || !userRef.current) {
      setSt('offline');
      schedule();
      return;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token }));
    ws.onmessage = (ev) => {
      try {
        handle(JSON.parse(String(ev.data)));
      } catch {
        /* abaikan */
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setSt('offline');
      schedule();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function schedule() {
    if (!userRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = Math.min(30000, 1000 * 2 ** attemptRef.current++);
    timerRef.current = setTimeout(connect, delay);
  }

  // Mulai/berhenti sesuai login
  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setSt('offline');
      setConversations([]);
      setMessages({});
      outboxRef.current = [];
      return;
    }
    let cancelled = false;
    (async () => {
      const [c, o] = await Promise.all([AsyncStorage.getItem(convsKey(user.id)), AsyncStorage.getItem(outboxKey(user.id))]);
      if (cancelled) return;
      if (c) setConversations(JSON.parse(c));
      if (o) {
        outboxRef.current = JSON.parse(o);
        for (const it of outboxRef.current) {
          const local: Msg = {
            client_id: it.client_id, conversation_id: it.conversation_id, sender_id: user.id, type: it.type, body: it.body ?? null,
            media_url: it.media_url ?? null, reply_to: it.reply_to ?? null, created_at: new Date().toISOString(), receipts: { total: 1, delivered: 0, read: 0 },
          };
          patch(it.conversation_id, (l) => addLocal(l, local));
        }
      }
      connect();
      registerPush();
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && userRef.current) {
        if (!wsRef.current) {
          attemptRef.current = 0;
          connect();
        }
        refreshConversations();
      }
    });
    const nsub = Notifications.addNotificationResponseReceivedListener((r) => {
      const cid = (r.notification.request.content.data as any)?.conversation_id;
      if (cid) router.push(`/chat/${cid}`);
    });
    return () => {
      cancelled = true;
      sub.remove();
      nsub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const enqueue = (item: OutboxItem) => {
    const me = userRef.current as NonNullable<typeof user>;
    const conv = convsRef.current.find((c) => c.id === item.conversation_id);
    const others = Math.max(1, (conv?.members.length ?? 2) - 1);
    const local: Msg = {
      client_id: item.client_id, conversation_id: item.conversation_id, sender_id: me.id, type: item.type, body: item.body ?? null,
      media_url: item.media_url ?? null, reply_to: item.reply_to ?? null, created_at: new Date().toISOString(),
      receipts: { total: others, delivered: 0, read: 0 },
    };
    patch(item.conversation_id, (l) => addLocal(l, local));
    outboxRef.current = [...outboxRef.current, item];
    persistOutbox();
    trySend(item);
  };

  const value = useMemo<Ctx>(
    () => ({
      status, conversations, messages, typing,
      refreshConversations, loadMessages, loadOlder, markRead,
      sendText: (cid, body, replyTo) => {
        const text = body.trim();
        if (!text) return;
        enqueue({ conversation_id: cid, client_id: uuidv4(), type: 'text', body: text, reply_to: replyTo ?? undefined });
      },
      sendImage: async (cid, uri) => {
        if (statusRef.current !== 'online') throw new Error('Perlu koneksi untuk mengirim foto');
        const { w } = await imageSize(uri);
        const out = await ImageManipulator.manipulateAsync(uri, w > 1280 ? [{ resize: { width: 1280 } }] : [], {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        const blob = await (await fetch(out.uri)).blob();
        const up = await api<{ upload_url: string; public_url: string; headers: Record<string, string> }>('/uploads/image', {
          body: { content_type: 'image/jpeg', size: blob.size },
        });
        const put = await fetch(up.upload_url, { method: 'PUT', headers: up.headers, body: blob });
        if (!put.ok) throw new Error('Unggah foto gagal');
        enqueue({ conversation_id: cid, client_id: uuidv4(), type: 'image', media_url: up.public_url });
      },
      retry: (cid, clientId) => {
        const item = outboxRef.current.find((o) => o.client_id === clientId);
        patch(cid, (l) => applyRetry(l, clientId));
        if (item) trySend(item);
      },
      sendTyping: (cid) => {
        const now = Date.now();
        if (now - typingSentAt.current < 2500) return;
        typingSentAt.current = now;
        wsSend({ t: 'typing', conversation_id: cid });
      },
      setActive: (cid) => {
        activeRef.current = cid;
      },
      openDirect: async (userId) => {
        const { id } = await api<{ id: string }>('/conversations', { body: { type: 'direct', user_id: userId } });
        await refreshConversations();
        return id;
      },
      createGroup: async (title, memberIds) => {
        const { id } = await api<{ id: string }>('/conversations', { body: { type: 'group', title, member_ids: memberIds } });
        await refreshConversations();
        return id;
      },
      deleteMessage: async (cid, id) => {
        await api(`/messages/${id}`, { method: 'DELETE' });
        patch(cid, (l) => applyDeleted(l, id));
        refreshSoon();
      },
      leaveGroup: async (cid) => {
        await api(`/conversations/${cid}/leave`, { method: 'POST', body: {} });
        await refreshConversations();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, conversations, messages, typing],
  );

  return <RtCtx.Provider value={value}>{children}</RtCtx.Provider>;
}
