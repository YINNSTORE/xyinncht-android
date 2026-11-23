import { Redirect } from 'expo-router';
import React from 'react';

// Gerbang di _layout.tsx yang menentukan tujuan sebenarnya.
export default function Index() {
  return <Redirect href="/tabs" />;
}
