import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { ScreenHeader } from '@/components/ScreenHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConflictSeverity = 'critical' | 'minor';

interface ConflictField {
  id: string;
  fieldName: string;
  severity: ConflictSeverity;
  deviceValue: string;
  deviceModified: string;
  serverValue: string;
  serverModified: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CONFLICTS: ConflictField[] = [
  {
    id: '1',
    fieldName: 'Temperature',
    severity: 'critical',
    deviceValue: '24.5 °C',
    deviceModified: 'Today, 10:15 AM',
    serverValue: '25.1 °C',
    serverModified: 'Today, 10:20 AM',
  },
  {
    id: '2',
    fieldName: 'Sampling Date',
    severity: 'critical',
    deviceValue: '15 Nov 2023',
    deviceModified: 'Yesterday',
    serverValue: '16 Nov 2023',
    serverModified: 'Today, 08:00 AM',
  },
  {
    id: '3',
    fieldName: 'Location Notes',
    severity: 'minor',
    deviceValue: 'Titik sampling dekat pintu air timur.',
    deviceModified: '',
    serverValue: 'Titik sampling dekat pintu air timur (banyak lumut).',
    serverModified: '',
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConflictCard({
  field,
  index,
}: {
  field: ConflictField;
  index: number;
}) {
  const isCritical = field.severity === 'critical';
  const borderColor = isCritical
    ? 'rgba(220, 38, 38, 0.3)'
    : 'rgba(245, 158, 11, 0.3)';
  const iconName = isCritical ? 'alert-circle' : 'alert';
  const iconColor = isCritical ? Colors.statusDanger : Colors.statusWarning;
  const headerText = isCritical
    ? `Conflicting Field: ${field.fieldName}`
    : `Minor Conflict: ${field.fieldName}`;

  return (
    <Animated.View entering={FadeInDown.delay(300 + index * 100).duration(500)}>
      <View style={[styles.conflictCard, { borderColor }]}>
        {/* Field header */}
        <View style={styles.conflictHeader}>
          <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
          <Text style={[styles.conflictHeaderText, { color: iconColor }]}>
            {headerText}
          </Text>
        </View>

        {/* Comparison boxes */}
        <View style={styles.comparisonRow}>
          {/* Device */}
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonLabel}>
              <Text style={styles.comparisonLabelText}>DEVICE (YOURS)</Text>
              <MaterialCommunityIcons
                name="cellphone"
                size={16}
                color={Colors.outlineVariant}
              />
            </View>
            <Text style={[
              styles.comparisonValue,
              field.severity === 'minor' && styles.comparisonValueSmall,
            ]}>
              {field.deviceValue}
            </Text>
            {field.deviceModified ? (
              <Text style={styles.comparisonDate}>
                Modified: {field.deviceModified}
              </Text>
            ) : null}
          </View>

          {/* Server */}
          <View style={[styles.comparisonBox, styles.comparisonBoxServer]}>
            {/* Server Latest badge */}
            <View style={styles.serverBadge}>
              <Text style={styles.serverBadgeText}>Server Latest</Text>
            </View>
            <View style={styles.comparisonLabel}>
              <Text style={[styles.comparisonLabelText, styles.comparisonLabelServer]}>
                SERVER
              </Text>
              <MaterialCommunityIcons
                name="cloud-sync"
                size={16}
                color={Colors.statusInfo}
              />
            </View>
            <Text style={[
              styles.comparisonValue,
              field.severity === 'minor' && styles.comparisonValueSmall,
            ]}>
              {field.serverValue}
            </Text>
            {field.serverModified ? (
              <Text style={styles.comparisonDate}>
                Modified: {field.serverModified}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ConflictResolutionScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <ScreenHeader
        title="Conflict Resolution"
        rightElement={
          <View style={styles.syncPausedBadge}>
            <Text style={styles.syncPausedText}>Sync Paused</Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info section */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.infoSection}>
            <Text style={styles.sampleId}>Sample ID: SPL-2023-11-045</Text>
            <Text style={styles.infoText}>
              A conflict was detected during sync. The server contains a newer
              version of this record modified by{' '}
              <Text style={styles.infoTextBold}>Dr. Andi</Text>. Please review
              the differences below and choose an action.
            </Text>
          </View>
        </Animated.View>

        {/* Conflict cards */}
        {CONFLICTS.map((field, index) => (
          <ConflictCard key={field.id} field={field} index={index} />
        ))}

        {/* Resolution action panel */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <View style={styles.actionPanel}>
            <Text style={styles.actionTitle}>Resolution Action</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.keepDeviceButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="cellphone" size={18} color={Colors.onSurface} />
                <Text style={styles.keepDeviceText}>Keep Device Data</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.overwriteButton} activeOpacity={0.8}>
                <MaterialCommunityIcons name="cloud-download" size={18} color={Colors.onPrimary} />
                <Text style={styles.overwriteText}>Overwrite with Server</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.editManuallyLink}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.primary} />
              <Text style={styles.editManuallyText}>Edit Manually</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  // ── Header extras ──
  syncPausedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  syncPausedText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.statusWarning,
  },

  // ── Info ──
  infoSection: {
    gap: 8,
    marginBottom: 4,
  },
  sampleId: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  infoTextBold: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },

  // ── Conflict Card ──
  conflictCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  conflictHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  comparisonRow: {
    gap: 10,
  },
  comparisonBox: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  comparisonBoxServer: {
    borderColor: 'rgba(37, 99, 235, 0.25)',
    position: 'relative',
  },
  comparisonLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  comparisonLabelText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  comparisonLabelServer: {
    color: Colors.statusInfo,
  },
  comparisonValue: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  comparisonValueSmall: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  comparisonDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.outline,
    marginTop: 2,
  },
  serverBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    backgroundColor: Colors.statusInfo,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  serverBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
    letterSpacing: 0.3,
  },

  // ── Action Panel ──
  actionPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginTop: 8,
  },
  actionTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  actionButtons: {
    gap: 10,
  },
  keepDeviceButton: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  keepDeviceText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  overwriteButton: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  overwriteText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
  editManuallyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  editManuallyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
