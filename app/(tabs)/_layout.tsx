import React, { useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { Colors, CardBg } from '@/constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

// ─── Tipe ikon per tab ─────────────────────────────────────────────────────
type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  isCenter?: boolean;
};

const TAB_SCREENS: TabConfig[] = [
  { name: 'index',        label: 'Beranda',  icon: 'home-outline',           iconFocused: 'home' },
  { name: 'jadwal',       label: 'Jadwal',   icon: 'calendar-outline',       iconFocused: 'calendar' },
  { name: 'sampling',     label: 'Sampling', icon: 'flask-outline',          iconFocused: 'flask', isCenter: true },
  { name: 'sinkronisasi', label: 'Sinkron',  icon: 'sync-outline',           iconFocused: 'sync' },
  { name: 'profil',       label: 'Profil',   icon: 'person-circle-outline',  iconFocused: 'person-circle' },
];

// ─── Spring configs ────────────────────────────────────────────────────────
const SPRING_SNAPPY = {
  damping: 15,
  stiffness: 200,
  mass: 0.6,
};

const SPRING_BOUNCY = {
  damping: 8,
  stiffness: 150,
  mass: 0.5,
};

// ─── Komponen ikon tab (dengan animasi) ────────────────────────────────────
function TabIcon({
  focused,
  icon,
  iconFocused,
  label,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING_SNAPPY);

    if (focused) {
      // Squish horizontally, stretch vertically, then bouncy spring back
      scaleX.value = withSequence(
        withTiming(1.3, { duration: 110 }),
        withTiming(0.85, { duration: 110 }),
        withSpring(1, SPRING_BOUNCY),
      );
      scaleY.value = withSequence(
        withTiming(0.8, { duration: 110 }),
        withTiming(1.2, { duration: 110 }),
        withSpring(1, SPRING_BOUNCY),
      );
      // Wiggle icon slightly
      iconRotation.value = withSequence(
        withTiming(14, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(-12, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withSpring(0, SPRING_BOUNCY),
      );
    } else {
      scaleX.value = withSpring(1, SPRING_SNAPPY);
      scaleY.value = withSpring(1, SPRING_SNAPPY);
      iconRotation.value = withSpring(0, SPRING_SNAPPY);
    }
  }, [focused]);

  // Animated icon pill background
  const iconWrapStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', Colors.primary],
      ),
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${iconRotation.value}deg` }],
    };
  });

  // Animated shadow (separate for performance)
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.4]),
    elevation: interpolate(progress.value, [0, 1], [0, 8]),
  }));

  // Label animation: fade + slide up + scale with height collapse for inactive state
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [8, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.5, 1]) },
    ],
    height: interpolate(progress.value, [0, 1], [0, 14]),
    marginTop: interpolate(progress.value, [0, 1], [0, 2]),
  }));

  // Active dot indicator beneath the label
  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 0.5, 1], [0, 1.3, 1]) },
    ],
  }));

  const iconColor = focused ? Colors.onPrimary : Colors.onSurfaceVariant;

  return (
    <View style={styles.tabItem}>
      {/* Animated icon pill */}
      <Animated.View style={[styles.iconWrap, iconWrapStyle, shadowStyle]}>
        <Animated.View style={animatedIconStyle}>
          <Ionicons
            name={focused ? iconFocused : icon}
            size={22}
            color={iconColor}
          />
        </Animated.View>
      </Animated.View>

      {/* Animated label */}
      <Animated.Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelActive,
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>

      {/* Active dot indicator */}
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </View>
  );
}

// ─── Center tab icon (raised circular — like reference image) ──────────────
function CenterTabIcon({
  focused,
  icon,
  iconFocused,
  label,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING_SNAPPY);

    if (focused) {
      scaleX.value = withSequence(
        withTiming(1.3, { duration: 120 }),
        withTiming(0.88, { duration: 120 }),
        withSpring(1, SPRING_BOUNCY),
      );
      scaleY.value = withSequence(
        withTiming(0.85, { duration: 120 }),
        withTiming(1.15, { duration: 120 }),
        withSpring(1, SPRING_BOUNCY),
      );
      iconRotation.value = withSequence(
        withTiming(-15, { duration: 100 }),
        withTiming(12, { duration: 100 }),
        withSpring(0, SPRING_BOUNCY),
      );
    } else {
      scaleX.value = withSpring(1, SPRING_SNAPPY);
      scaleY.value = withSpring(1, SPRING_SNAPPY);
      iconRotation.value = withSpring(0, SPRING_SNAPPY);
    }
  }, [focused]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0.25, 0.45]),
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  // Label animation: fade + slide up + scale with height collapse for inactive state
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [8, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.5, 1]) },
    ],
    height: interpolate(progress.value, [0, 1], [0, 14]),
    marginTop: interpolate(progress.value, [0, 1], [0, 2]),
  }));

  // Active dot indicator beneath the label
  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 0.5, 1], [0, 1.3, 1]) },
    ],
  }));

  return (
    <View style={styles.centerTabItem}>
      {/* Raised circular icon wrapper to maintain identical vertical flow */}
      <View style={styles.centerIconContainer}>
        <Animated.View style={[styles.centerCircle, circleStyle]}>
          <View style={styles.centerCircleInner}>
            <Animated.View style={animatedIconStyle}>
              <Ionicons
                name={focused ? iconFocused : icon}
                size={26}
                color={Colors.onPrimary}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* Label */}
      <Animated.Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelActive,
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>

      {/* Active dot indicator */}
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </View>
  );
}

// ─── Layout utama ──────────────────────────────────────────────────────────
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Dynamic tab bar bottom: accounts for system navigation bar (gesture bar / 3-button)
  const tabBarBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, 8) + 8
    : 28;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          { bottom: tabBarBottom },
        ],
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
      }}
    >
      {TAB_SCREENS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused }) =>
              tab.isCenter ? (
                <CenterTabIcon
                  focused={focused}
                  icon={tab.icon}
                  iconFocused={tab.iconFocused}
                  label={tab.label}
                />
              ) : (
                <TabIcon
                  focused={focused}
                  icon={tab.icon}
                  iconFocused={tab.iconFocused}
                  label={tab.label}
                />
              ),
          }}
        />
      ))}

      {/* Sembunyikan route explore bawaan template Expo */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}

// ─── Style ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Floating pill tab bar
  tabBar: {
    position: 'absolute',
    // bottom is set dynamically in TabLayout via insets
    left: Platform.OS === 'android' ? 20 : 48,
    right: Platform.OS === 'android' ? 20 : 48,
    height: 64,
    borderRadius: 32,
    backgroundColor: CardBg.glass98,
    borderTopWidth: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 106, 68, 0.06)',

    // Shadow
    shadowColor: '#1a3a2a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 14,

    // Nudge content down to center within pill
    paddingBottom: 0,
    paddingTop: 8,
  },

  // Each tab item container
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 54,
    paddingHorizontal: 2,
  },

  // Icon pill container
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },

  // Label
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
    textAlign: 'center',
    overflow: 'hidden',
  },

  // Active label
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  // Active dot indicator
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  // ── Center tab (Sampling) — raised circular button ──
  centerTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 54,
    paddingHorizontal: 2,
  },
  centerIconContainer: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerCircle: {
    position: 'absolute',
    bottom: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    // Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  centerCircleInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
