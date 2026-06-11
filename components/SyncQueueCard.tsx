import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

export type QueueStatus = 'ready' | 'draft' | 'conflict';

interface SyncQueueCardProps {
  companyName: string;
  sampleType: string;
  timestamp: string;
  status: QueueStatus;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<
  QueueStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  }
> = {
  ready: {
    label: 'Siap Kirim',
    bg: 'rgba(22, 163, 74, 0.1)',
    text: Colors.statusSuccess,
    border: `rgba(22, 163, 74, 0.2)`,
  },
  draft: {
    label: 'Draft',
    bg: Colors.surfaceContainerHighest,
    text: Colors.onSurfaceVariant,
    border: 'transparent',
  },
  conflict: {
    label: 'Conflict',
    bg: 'rgba(220, 38, 38, 0.1)',
    text: Colors.statusDanger,
    border: `rgba(220, 38, 38, 0.2)`,
    icon: 'alert',
  },
};

export function SyncQueueCard({
  companyName,
  sampleType,
  timestamp,
  status,
  onPress,
}: SyncQueueCardProps) {
  const config = STATUS_CONFIG[status];
  const isConflict = status === 'conflict';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isConflict && styles.cardConflict,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Top row: name + badge */}
      <View style={styles.topRow}>
        <View style={styles.textCol}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.sampleType}>{sampleType}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border, borderWidth: config.border !== 'transparent' ? 1 : 0 }]}>
          {config.icon ? (
            <MaterialCommunityIcons name={config.icon} size={12} color={config.text} />
          ) : null}
          <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
        </View>
      </View>

      {/* Bottom row: timestamp */}
      <View style={styles.bottomRow}>
        <MaterialCommunityIcons
          name={status === 'draft' ? 'file-document-edit-outline' : 'clock-outline'}
          size={16}
          color={Colors.onSurfaceVariant}
        />
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(189, 202, 191, 0.5)',
  },
  cardConflict: {
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.statusDanger,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  sampleType: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
});
