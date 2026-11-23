import React from 'react';
import { Image, View } from 'react-native';
import { T } from './T';

function hue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ id, name, uri, size = 48 }: { id: string; name: string; uri?: string | null; size?: number }) {
  if (uri) return <Image accessibilityLabel={name} source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <View
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue(id)}, 45%, 32%)`, alignItems: 'center', justifyContent: 'center' }}
    >
      <T weight="bold" color="#FFFFFF" style={{ fontSize: size * 0.38 }}>{initials}</T>
    </View>
  );
}
