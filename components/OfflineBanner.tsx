import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useNetworkStore } from '@/stores/network.store';

interface OfflineBannerProps {
  visible?: boolean;
}

/**
 * Shows an offline banner when the device is not connected to the internet.
 * Reads real connectivity from the network store.
 */
export function OfflineBanner({ visible }: OfflineBannerProps) {
  const isOnline = useNetworkStore((s) => s.isOnline);

  // If explicitly hidden, or if online, don't show
  if (visible === false || isOnline) return null;

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="wifi-off" size={14} color={Colors.statusWarning} />
      <Text style={styles.text}>Mode Offline Aktif</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.statusWarning,
    letterSpacing: 0.3,
  },
});
