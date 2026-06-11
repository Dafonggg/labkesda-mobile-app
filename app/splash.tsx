import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { LogoFull } from '@/components/logo-labkesda';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';
import { getMeApi } from '@/services/auth.service';
import { mapApiUser } from '@/stores/auth.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const FADE_OUT_DURATION = 600;

// Animated version of the logo
const AnimatedView = Animated.View;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Dynamic bottom positions for Android edge-to-edge
  const buttonBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, 16) + 60
    : 100;
  const versionBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, 16) + 20
    : 50;

  // ─── Shared values ────────────────────────────────────────────────────
  // Logo entrance
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-10);

  // Ring / aura pulses
  const ring1Scale = useSharedValue(0.8);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0);

  // Title text
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);

  // Subtitle text
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);

  // Get Started button
  const buttonOpacity = useSharedValue(0);
  const buttonY = useSharedValue(30);
  const buttonScale = useSharedValue(0.9);

  // Overall fade-out
  const screenOpacity = useSharedValue(1);

  // ─── Auth check ────────────────────────────────────────────────────────
  const { loadSession, setUser, isAuthenticated } = useAuthStore();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateAfterSplash = useCallback(async () => {
    try {
      const hasSession = await loadSession();
      if (hasSession) {
        // Validate token with server
        try {
          const meResponse = await getMeApi();
          const user = mapApiUser(meResponse.data);
          setUser(user);
          router.replace('/(tabs)');
          return;
        } catch {
          // Token expired/invalid — go to login
        }
      }
    } catch {
      // No session — go to login
    }
    router.replace('/login');
  }, [loadSession, setUser, router]);

  const handleGetStarted = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    screenOpacity.value = withTiming(0, {
      duration: FADE_OUT_DURATION,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(navigateAfterSplash)();
      }
    });
  }, [isNavigating, navigateAfterSplash, screenOpacity]);

  useEffect(() => {
    // ── Phase 1: Logo entrance (0–600ms) ───────────────────────────────
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, {
      damping: 8,
      stiffness: 120,
      mass: 0.8,
    });
    logoRotate.value = withSpring(0, {
      damping: 10,
      stiffness: 100,
    });

    // ── Phase 2: Ring pulses (300ms+) ──────────────────────────────────
    ring1Opacity.value = withDelay(300,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );
    ring1Scale.value = withDelay(300,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 1500, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );

    ring2Opacity.value = withDelay(800,
      withRepeat(
        withSequence(
          withTiming(0.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );
    ring2Scale.value = withDelay(800,
      withRepeat(
        withSequence(
          withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 1800, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );

    // ── Phase 3: Title (600ms+) ─────────────────────────────────────────
    titleOpacity.value = withDelay(600,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    titleY.value = withDelay(600,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );

    // ── Phase 4: Subtitle (900ms+) ──────────────────────────────────────
    subtitleOpacity.value = withDelay(900,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    subtitleY.value = withDelay(900,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );

    // ── Phase 5: Get Started button appearance (1200ms+) ────────────────
    buttonOpacity.value = withDelay(1200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    buttonY.value = withDelay(1200,
      withSpring(0, { damping: 12, stiffness: 100 }),
    );
    buttonScale.value = withDelay(1200,
      withSpring(1, { damping: 10, stiffness: 120 }),
    );
  }, []);

  // ─── Animated styles ──────────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonY.value },
      { scale: buttonScale.value },
    ],
  }));

  return (
    <AnimatedView style={[styles.container, screenStyle]}>
      {/* Background gradient layers */}
      <View style={styles.bgGradientTop} />
      <View style={styles.bgGradientBottom} />

      {/* Decorative corner accents */}
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerBottomRight} />

      {/* Pulsing glow behind logo card */}
      <AnimatedView style={[styles.glowRing, ring1Style]} />
      <AnimatedView style={[styles.glowRing, styles.glowRingOuter, ring2Style]} />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Logo in rounded rectangle card — like reference image */}
        <AnimatedView style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoCard}>
            <LogoFull width={260} />
          </View>
        </AnimatedView>

        {/* Subtitle */}
      </View>

      {/* Get Started button */}
      <AnimatedView style={[styles.buttonWrapper, buttonStyle, { bottom: buttonBottom }]}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.85}
          disabled={isNavigating}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <View style={styles.arrowCircle}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </AnimatedView>

      {/* Bottom version text */}
      <Animated.Text style={[styles.versionText, subtitleStyle, { bottom: versionBottom }]}>
        Labkesda Purwakarta v1.0.0
      </Animated.Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // ── Background layers ────────────────────────────────────────────────
  bgGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(11, 134, 88, 0.4)',
  } as any,
  bgGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 80, 50, 0.3)',
  } as any,

  // ── Corner accents ───────────────────────────────────────────────────
  cornerTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(144, 247, 192, 0.12)',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(115, 218, 165, 0.10)',
  },

  // ── Pulsing glow (rounded rectangle) ──────────────────────────────
  glowRing: {
    position: 'absolute',
    width: 300,
    height: 100,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glowRingOuter: {
    width: 340,
    height: 130,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // ── Center content ───────────────────────────────────────────────────
  centerContent: {
    alignItems: 'center',
    gap: 24,
    zIndex: 10,
  },

  // ── Logo card (rounded rectangle like reference) ─────────────────────
  logoContainer: {
    marginBottom: 8,
  },
  logoCard: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Get Started button ───────────────────────────────────────────────
  buttonWrapper: {
    position: 'absolute',
    // bottom is set dynamically in component
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 220,
  },
  getStartedText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -1,
  },

  // ── Version text ─────────────────────────────────────────────────────
  versionText: {
    position: 'absolute',
    // bottom is set dynamically in component
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
});
