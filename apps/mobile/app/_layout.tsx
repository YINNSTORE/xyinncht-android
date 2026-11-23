import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { RealtimeProvider } from '../src/realtime/RealtimeContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { GlassSurface } from '../src/ui/GlassSurface';
import { ThemedBackground } from '../src/ui/ThemedBackground';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider>
          <Shell />
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { ready, user, banned } = useAuth();
  const { theme, fontFamily } = useTheme();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    if (banned) {
      if (group !== 'banned') router.replace('/banned');
    } else if (!user) {
      if (group !== 'auth') router.replace('/auth/welcome');
    } else if (!user.profile_completed) {
      if (segments[1] !== 'profile') router.replace('/auth/profile');
    } else if (!group || group === 'auth' || group === 'banned') {
      router.replace('/tabs');
    }
  }, [ready, user, banned, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  return (
    <ThemedBackground>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.glass ? 'transparent' : theme.colors.surface },
          headerBackground: theme.glass ? () => <GlassSurface rounded={false} style={{ flex: 1 }} /> : undefined,
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontFamily: fontFamily('bold'), color: theme.colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen name="banned" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="group/new" options={{ title: 'Grup baru' }} />
        <Stack.Screen name="contact/[id]" options={{ title: 'Info kontak' }} />
        <Stack.Screen name="settings/theme" options={{ title: 'Tema & Font' }} />
      </Stack>
    </ThemedBackground>
  );
}
