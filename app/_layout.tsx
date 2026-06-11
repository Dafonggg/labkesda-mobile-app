import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import '../global.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { initializeDatabase } from '@/database/index';

// Tahan splash screen native sampai font selesai dimuat
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Layar awal sebelum auth check
  initialRouteName: 'splash',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Initialize SQLite database on mount
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.warn('Failed to initialize database:', err);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Tunggu font selesai
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryProvider>
      <NetworkProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* ── Entry point — redirects to splash ──────────── */}
          <Stack.Screen name="index" options={{ animation: 'none' }} />

          {/* ── Auth flow ─────────────────────────────────── */}
          <Stack.Screen name="splash" options={{ animation: 'none', gestureEnabled: false }} />
          <Stack.Screen name="login"  options={{ animation: 'fade', gestureEnabled: false }} />

          {/* ── Main app (tabs) ───────────────────────────── */}
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />

          {/* ── Stack screens ────────────────────────────── */}
          <Stack.Screen name="sampling-form" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="conflict-resolution" options={{ animation: 'slide_from_right' }} />

          {/* ── Sembunyikan route sisa template Expo ─────── */}
          <Stack.Screen name="modal"   options={{ presentation: 'modal', headerShown: true, title: 'Info' }} />
        </Stack>

        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </NetworkProvider>
    </QueryProvider>
  );
}
