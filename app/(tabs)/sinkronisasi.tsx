import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { SyncQueueCard, QueueStatus } from '@/components/SyncQueueCard';
import { useNetworkStore } from '@/stores/network.store';
import { useSyncStore } from '@/stores/sync.store';
import { executeSyncPipeline } from '@/database/sync/sync-manager';
import { getPendingDrafts } from '@/database/repositories/draft.repository';
import { getLastSyncTime } from '@/database/repositories/sync.repository';
import type { DraftSamplingRecord } from '@/database/repositories/draft.repository';

// ─── Types ───────────────────────────────────────────────────────────────────

type SyncState = 'idle' | 'syncing' | 'success';

interface QueueItem {
  id: string;
  companyName: string;
  sampleType: string;
  timestamp: string;
  status: QueueStatus;
}

// ─── Mock Data (fallback for empty queue) ───────────────────────────────────

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SinkronisasiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Real store data
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { pendingCount, syncStatus, syncProgress, lastSyncTime } = useSyncStore();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Load queue items from SQLite
  const loadQueue = useCallback(async () => {
    try {
      const drafts = await getPendingDrafts();
      const mapped: QueueItem[] = drafts.map((d: DraftSamplingRecord) => ({
        id: d.id,
        companyName: d.lokasi_pengambilan || 'Draft Sampling',
        sampleType: d.jenis_sample || 'Sampel',
        timestamp: new Date(d.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB',
        status: (d.sync_status === 'pending' ? 'ready' : d.sync_status === 'failed' ? 'conflict' : 'draft') as QueueStatus,
      }));
      setQueueItems(mapped);
    } catch {
      setQueueItems([]);
    }
  }, []);

  // Load last sync time
  useEffect(() => {
    getLastSyncTime().then((t) => setLastSync(t)).catch(() => {});
    loadQueue();
  }, [loadQueue, syncStatus]);

  // Auto-sync when coming back online with pending items (WORKFLOW §9: auto-retry)
  const prevOnlineRef = React.useRef(isOnline);
  useEffect(() => {
    const cameOnline = !prevOnlineRef.current && isOnline;
    prevOnlineRef.current = isOnline;
    if (cameOnline && pendingCount > 0 && syncStatus === 'idle') {
      // Slight delay to let network stabilize
      const timer = setTimeout(() => executeSyncPipeline().catch(() => {}), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, syncStatus]);

  // Spinning sync icon animation
  const spinValue = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  const handleSync = useCallback(async () => {
    if (syncStatus !== 'idle' || !isOnline) return;

    // Animate spin
    spinValue.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false,
    );

    try {
      await executeSyncPipeline();
    } catch {
      // Error handled by sync manager
    }

    spinValue.value = 0;
    loadQueue();
  }, [syncStatus, isOnline, loadQueue]);

  const isSyncing = syncStatus === 'syncing';
  const isSuccess = syncStatus === 'success';
  const progress = syncProgress;

  return (
    <View style={styles.safeArea}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View>
          <Text style={styles.topBarTitle}>Sync Data</Text>
          <Text style={styles.topBarSubtitle}>Labkesda</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connectivity + header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Antrean Sinkronisasi</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </Animated.View>

        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={styles.statusCard}>
            <View style={styles.statusTop}>
              <View style={styles.statusIconCircle}>
                <MaterialCommunityIcons
                  name={isSuccess ? 'check-circle' : 'cloud-upload'}
                  size={24}
                  color={isSuccess ? Colors.statusSuccess : Colors.error}
                />
              </View>
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {isSuccess
                    ? 'Sinkronisasi Selesai!'
                    : `${pendingCount} Data Belum Sinkron`}
                </Text>
                <Text style={styles.statusSubtitle}>
                  Terakhir sinkronisasi: {lastSync ? new Date(lastSync).toLocaleString('id-ID') : 'Belum pernah'}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            {isSyncing && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Mengunggah data...</Text>
                  <Text style={styles.progressLabel}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
              </View>
            )}

            {/* Sync button */}
            <TouchableOpacity
              style={[
                styles.syncButton,
                isSyncing && styles.syncButtonDisabled,
                isSuccess && styles.syncButtonSuccess,
                !isOnline && { opacity: 0.5 },
              ]}
              onPress={handleSync}
              activeOpacity={0.8}
              disabled={syncStatus !== 'idle' || !isOnline}
            >
              {isSyncing ? (
                <Animated.View style={spinStyle}>
                  <MaterialCommunityIcons name="sync" size={20} color={Colors.onPrimary} />
                </Animated.View>
              ) : (
                <MaterialCommunityIcons
                  name={isSuccess ? 'check-circle' : 'sync'}
                  size={20}
                  color={Colors.onPrimary}
                />
              )}
              <Text style={styles.syncButtonText}>
                {!isOnline
                  ? 'Offline'
                  : syncStatus === 'idle'
                  ? 'Sinkron Sekarang'
                  : isSyncing
                  ? 'Menyinkronkan...'
                  : 'Selesai'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Queue list */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.queueSection}>
            <Text style={styles.queueSectionTitle}>
              ANTREAN DATA ({queueItems.length})
            </Text>
            <View style={styles.queueList}>
              {queueItems.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialCommunityIcons name="check-circle-outline" size={32} color={Colors.outlineVariant} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.onSurfaceVariant, marginTop: 8 }}>Tidak ada data menunggu sinkronisasi</Text>
                </View>
              ) : (
                queueItems.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(350 + index * 80).duration(400)}
                  >
                    <SyncQueueCard
                      companyName={item.companyName}
                      sampleType={item.sampleType}
                      timestamp={item.timestamp}
                      status={item.status}
                      onPress={
                        item.status === 'conflict'
                          ? () => router.push('/conflict-resolution')
                          : undefined
                      }
                    />
                  </Animated.View>
                ))
              )}
            </View>
          </View>
        </Animated.View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: Platform.OS === 'android' ? 160 : 140 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  topBar: {
    minHeight: 52,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  topBarSubtitle: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },

  // ── Header row ──
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusSuccess,
    shadowColor: Colors.statusSuccess,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },

  // ── Status Card ──
  statusCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(189, 202, 191, 0.3)',
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusText: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    lineHeight: 26,
  },
  statusSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  progressContainer: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  syncButton: {
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonSuccess: {
    backgroundColor: Colors.statusSuccess,
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Queue ──
  queueSection: {
    gap: 10,
  },
  queueSectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  queueList: {
    gap: 8,
  },
});
