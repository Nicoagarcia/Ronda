import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { useMyProfile } from '@/features/profile/hooks';
import { accessState } from '@/features/profile/onboarding';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

// "Portero": decide qué parte de la app puede ver el usuario (docs/05-plan-tecnico.md, 6.1).
function Gate() {
  const { session, initializing } = useAuth();
  const profile = useMyProfile();
  const state = initializing ? 'loading' : accessState(!!session, profile.data);

  useEffect(() => {
    if (state !== 'loading' || profile.isError) SplashScreen.hideAsync();
  }, [state, profile.isError]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state === 'signed-out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={state === 'suspended'}>
        <Stack.Screen name="suspended" />
      </Stack.Protected>
      <Stack.Protected guard={state === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={state === 'active'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="group" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="report" />
        <Stack.Screen name="user/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
