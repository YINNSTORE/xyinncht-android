import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setSession, Tokens } from '../api/client';

export type Me = {
  id: string; phone: string; display_name: string; username: string | null; about: string; avatar_url: string | null;
  is_verified: boolean; status: string; profile_completed: boolean; show_last_seen: boolean; show_read_receipts: boolean;
};
type Banned = { message?: string } | null;
type Ctx = {
  ready: boolean; user: Me | null; banned: Banned;
  signIn: (t: Tokens, u: Me) => Promise<void>;
  signOut: () => Promise<void>;
  setBanned: (message?: string) => void;
  refreshUser: () => Promise<void>;
  updateUser: (u: Me) => void;
};

const TOKENS_KEY = 'xc_tokens';
const USER_KEY = 'xc_user';
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);
  const [banned, setBannedState] = useState<Banned>(null);

  const clear = useCallback(async () => {
    setSession(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKENS_KEY).catch(() => {});
    await AsyncStorage.removeItem(USER_KEY).catch(() => {});
  }, []);

  const onSession = useCallback(
    async (e: { tokens: Tokens | null; reason?: string; message?: string }) => {
      if (e.tokens) await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(e.tokens)).catch(() => {});
      else {
        if (e.reason === 'banned') setBannedState({ message: e.message });
        await clear();
      }
    },
    [clear],
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(TOKENS_KEY);
        if (raw) {
          setSession(JSON.parse(raw), onSession);
          const cached = await AsyncStorage.getItem(USER_KEY);
          if (cached) setUser(JSON.parse(cached));
          try {
            const { user: fresh } = await api<{ user: Me }>('/me');
            setUser(fresh);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
          } catch {
            /* offline: pakai cache */
          }
        } else {
          setSession(null, onSession);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [onSession]);

  const updateUser = useCallback((u: Me) => {
    setUser(u);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready, user, banned,
      signIn: async (t, u) => {
        setBannedState(null);
        setSession(t, onSession);
        await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(t));
        updateUser(u);
      },
      signOut: async () => {
        await api('/auth/logout', { body: {} }).catch(() => {});
        await clear();
      },
      setBanned: (message) => {
        setBannedState({ message });
        clear();
      },
      refreshUser: async () => {
        const { user: fresh } = await api<{ user: Me }>('/me');
        updateUser(fresh);
      },
      updateUser,
    }),
    [ready, user, banned, onSession, clear, updateUser],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
