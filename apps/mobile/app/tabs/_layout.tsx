import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '../../src/theme/ThemeProvider';
import { GlassSurface } from '../../src/ui/GlassSurface';

export default function TabsLayout() {
  const { theme, fontFamily } = useTheme();
  const c = theme.colors;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.glass ? 'transparent' : c.surface },
        headerBackground: theme.glass ? () => <GlassSurface rounded={false} style={{ flex: 1 }} /> : undefined,
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fontFamily('bold'), color: c.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontFamily: fontFamily('medium') },
        tabBarStyle: { backgroundColor: theme.glass ? 'transparent' : c.surface, borderTopColor: c.border, position: theme.glass ? 'absolute' : 'relative' },
        tabBarBackground: theme.glass ? () => <GlassSurface rounded={false} style={{ flex: 1 }} /> : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Cari', tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="me" options={{ title: 'Saya', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
