import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, CardBg } from '@/constants/theme';
import { useAuthStore, getRoleDisplayName } from '@/stores/auth.store';
import { useNetworkStore } from '@/stores/network.store';
import { useSyncStore } from '@/stores/sync.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useMyJadwal } from '@/hooks/useJadwal';
import { useRouter, useFocusEffect } from 'expo-router';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityStatus = 'synced' | 'syncing' | 'pending';

interface Activity {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  status: ActivityStatus;
}

// ─── Data ────────────────────────────────────────────────────────────────────

// Fallback mock for when API data hasn't loaded yet
const EMPTY_ACTIVITIES: Activity[] = [];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ActivityStatus }) {
  const isSuccess = status === 'synced';
  const isSyncing = status === 'syncing';

  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (isSyncing) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [isSyncing]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={[styles.statusBadge, isSyncing && pulseStyle]}>
      <MaterialCommunityIcons
        name={isSuccess ? 'cloud-check' : isSyncing ? 'cloud-sync' : 'clock-outline'}
        size={18}
        color={isSuccess ? Colors.statusSuccess : Colors.statusWarning}
      />
      <Text
        style={[
          styles.statusText,
          isSuccess ? styles.statusTextSuccess : styles.statusTextWarning,
        ]}
      >
        {isSuccess ? 'Synced' : isSyncing ? 'Syncing' : 'Pending'}
      </Text>
    </Animated.View>
  );
}

// Color schemes for each Quick Action card
const QUICK_ACTION_COLORS = {
  emerald: {
    bg: '#006a44',
    bgLight: '#0b8658',
    shadow: '#006a44',
    orbColor: 'rgba(255,255,255,0.12)',
    iconBg: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ocean: {
    bg: '#2563EB',
    bgLight: '#3b82f6',
    shadow: '#2563EB',
    orbColor: 'rgba(255,255,255,0.10)',
    iconBg: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  amber: {
    bg: '#E88D00',
    bgLight: '#F59E0B',
    shadow: '#E88D00',
    orbColor: 'rgba(255,255,255,0.12)',
    iconBg: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  violet: {
    bg: '#7C3AED',
    bgLight: '#8B5CF6',
    shadow: '#7C3AED',
    orbColor: 'rgba(255,255,255,0.10)',
    iconBg: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
} as const;

type QuickActionColorScheme = keyof typeof QUICK_ACTION_COLORS;

function QuickActionCard({
  iconName,
  label,
  colorScheme = 'emerald',
  badge,
  onPress,
}: {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  colorScheme?: QuickActionColorScheme;
  badge?: boolean;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withTiming(0.93, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const scheme = QUICK_ACTION_COLORS[colorScheme];

  return (
    <Animated.View style={[styles.quickCardOuter, animStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.quickCard,
          {
            backgroundColor: scheme.bg,
            borderColor: scheme.borderColor,
            shadowColor: scheme.shadow,
          },
        ]}
      >
        {/* Decorative orb */}
        <View
          style={[
            styles.quickCardOrb,
            { backgroundColor: scheme.orbColor },
          ]}
        />
        {/* Secondary orb */}
        <View
          style={[
            styles.quickCardOrbSmall,
            { backgroundColor: scheme.orbColor },
          ]}
        />
        {badge && (
          <View style={styles.badgeDot}>
            <View style={styles.badgeDotInner} />
          </View>
        )}
        <View style={[styles.quickIconBox, { backgroundColor: scheme.iconBg }]}>
          <MaterialCommunityIcons name={iconName} size={26} color="#fff" />
        </View>
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function parseDateRobust(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Try standard parsing first
  let dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj;
  }
  
  // Replace space between date and time with 'T' (e.g., "2026-06-03 14:00:00" -> "2026-06-03T14:00:00")
  const isoStr = dateStr.replace(' ', 'T');
  dateObj = new Date(isoStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj;
  }

  // Handle case where timezone is missing and we want to assume WIB (+07:00)
  dateObj = new Date(isoStr + '+07:00');
  if (!isNaN(dateObj.getTime())) {
    return dateObj;
  }
  
  // Manual regex parsing for "YYYY-MM-DD HH:mm:ss"
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+|T)(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  
  // Manual regex parsing for "YYYY-MM-DD"
  const simpleMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (simpleMatch) {
    const [, year, month, day] = simpleMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  
  return new Date();
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Real data from stores and API
  const user = useAuthStore((s) => s.user);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const pendingSync = useSyncStore((s) => s.pendingCount);
  const { data: dashboardResponse, isLoading: dashLoading, refetch: refetchDashboard } = useDashboardSummary();
  const { data: jadwalResponse, isLoading: jadwalLoading, refetch: refetchJadwal } = useMyJadwal();

  // Notification store
  const newJadwalCount = useNotificationStore((s) => s.newJadwalCount);
  const seenJadwalIds = useNotificationStore((s) => s.seenJadwalIds);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const calculateNewCount = useNotificationStore((s) => s.calculateNewCount);
  const markAllSeen = useNotificationStore((s) => s.markAllSeen);
  const hydrated = useNotificationStore((s) => s.hydrated);

  // Notification panel visibility
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Bell shake animation
  const bellShake = useSharedValue(0);

  const bellAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellShake.value}deg` }],
  }));

  // Hydrate notification store on mount
  useEffect(() => {
    hydrateNotifications();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchDashboard(), refetchJadwal()]);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDashboard, refetchJadwal]);

  useFocusEffect(
    useCallback(() => {
      refetchDashboard();
      refetchJadwal();
    }, [refetchDashboard, refetchJadwal])
  );

  const summary = dashboardResponse?.data;
  const jadwalList = jadwalResponse?.data ?? [];

  // Recalculate notification count when jadwal data or hydration changes
  useEffect(() => {
    if (hydrated && jadwalList.length > 0) {
      const allIds = jadwalList.map((j) => j.id);
      calculateNewCount(allIds);
    }
  }, [jadwalList, hydrated]);

  // Shake bell when new notifications appear
  useEffect(() => {
    if (newJadwalCount > 0) {
      bellShake.value = withSequence(
        withTiming(15, { duration: 80 }),
        withTiming(-12, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withSpring(0, { damping: 8, stiffness: 200 }),
      );
    }
  }, [newJadwalCount]);

  // Filter new (unseen) jadwal for notification panel
  const newJadwalList = React.useMemo(() => {
    if (!hydrated) return [];
    return jadwalList.filter((j) => !seenJadwalIds.includes(j.id));
  }, [jadwalList, seenJadwalIds, hydrated]);

  const handleNotificationPress = useCallback(() => {
    setShowNotifPanel(true);
  }, []);

  const handleCloseNotifPanel = useCallback(() => {
    // Mark all as seen when closing
    const allIds = jadwalList.map((j) => j.id);
    markAllSeen(allIds);
    setShowNotifPanel(false);
  }, [jadwalList, markAllSeen]);

  const handleNotifItemPress = useCallback((jadwalId: string) => {
    const allIds = jadwalList.map((j) => j.id);
    markAllSeen(allIds);
    setShowNotifPanel(false);
    router.push('/(tabs)/jadwal');
  }, [jadwalList, markAllSeen, router]);

  const isCompletedJadwal = (status: string) => {
    return status === 'completed' || status === 'selesai';
  };

  const isBerlangsungJadwal = (status: string) => {
    return status === 'in_progress' || status === 'berlangsung';
  };

  const sortedJadwalList = React.useMemo(() => {
    return [...jadwalList].sort((a, b) => {
      return parseDateRobust(b.tanggal_sampling).getTime() - parseDateRobust(a.tanggal_sampling).getTime();
    });
  }, [jadwalList]);

  // Map jadwal to activity items
  const activities: Activity[] = sortedJadwalList.slice(0, 5).map((j) => ({
    id: j.id,
    title: j.permohonan?.nama_pemohon || j.lokasi || 'Sampling',
    subtitle: `${j.permohonan?.jenis_sampel || j.permohonan?.jenis_sample || 'Sampel'} \u2022 ${parseDateRobust(j.tanggal_sampling).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    icon: 'water-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
    status: (isCompletedJadwal(j.status) ? 'synced' : isBerlangsungJadwal(j.status) ? 'syncing' : 'pending') as ActivityStatus,
  }));

  const totalTasks = jadwalList.length || (summary?.total_pengujian ?? 0);
  const completedTasks = jadwalList.filter((j) => isCompletedJadwal(j.status)).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleMapView = () => {
    router.push('/map-view');
  };

  return (
    <View style={styles.safeArea}>
      {/* ── Top App Bar ─────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        {/* User info */}
        <View style={styles.topBarLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.avatarName}>{user?.name || 'User'}</Text>
            <Text style={styles.avatarRole}>{user ? getRoleDisplayName(user.role) : 'Petugas Lapangan'}</Text>
          </View>
        </View>

        {/* Right side: notification bell + online status */}
        <View style={styles.topBarRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={handleNotificationPress}
            activeOpacity={0.7}
          >
            <Animated.View style={bellAnimStyle}>
              <Ionicons
                name={newJadwalCount > 0 ? 'notifications' : 'notifications-outline'}
                size={22}
                color={newJadwalCount > 0 ? Colors.primary : Colors.onSurfaceVariant}
              />
            </Animated.View>
            {newJadwalCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {newJadwalCount > 9 ? '9+' : newJadwalCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Online status */}
          <View style={[styles.onlineBadge, !isOnline && { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: 'rgba(220, 38, 38, 0.2)' }]}>
            <View style={[styles.onlineDot, !isOnline && { backgroundColor: Colors.statusDanger }]} />
            <Text style={[styles.onlineText, !isOnline && { color: Colors.statusDanger }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable Content ──────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Hero: Daily Progress ──── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.heroCard}>
            {/* Decorative orb */}
            <View style={styles.heroOrb} />

            <View style={styles.heroTop}>
              {/* Left: stats */}
              <View>
                <Text style={styles.heroLabel}>DAILY PROGRESS</Text>
                <View style={styles.heroCountRow}>
                  <Text style={styles.heroCount}>{totalTasks}</Text>
                  <Text style={styles.heroCountSub}>Tasks</Text>
                </View>
                <Text style={styles.heroDetail}>
                  <Text style={styles.heroDot}>● </Text>
                  {completedTasks} completed • {totalTasks - completedTasks} pending
                </Text>
              </View>

              {/* Right: icon box */}
              <View style={styles.heroBioBox}>
                <MaterialCommunityIcons name="dna" size={28} color={Colors.onPrimary} />
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.heroProgressSection}>
              <View style={styles.heroProgressHeader}>
                <Text style={styles.heroProgressLabel}>Progress</Text>
                <Text style={styles.heroProgressLabel}>{progressPercent}%</Text>
              </View>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Quick Actions ────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              {user?.subRole !== 'anggota' && (
                <QuickActionCard
                  iconName="test-tube"
                  label="Start Sampling"
                  colorScheme="emerald"
                  onPress={() => router.push('/sampling-form')}
                />
              )}
              <QuickActionCard
                iconName="calendar-month-outline"
                label="View Schedule"
                colorScheme="ocean"
                onPress={() => {
                  // Find the first scheduled sampling date to highlight, or default to today's date
                  const nextJadwal = jadwalList.find((j) => !isCompletedJadwal(j.status));
                  const localToday = new Date();
                  const tYear = localToday.getFullYear();
                  const tMonth = String(localToday.getMonth() + 1).padStart(2, '0');
                  const tDay = String(localToday.getDate()).padStart(2, '0');
                  let targetDate = `${tYear}-${tMonth}-${tDay}`;
                  if (nextJadwal) {
                    const dateObj = new Date(nextJadwal.tanggal_sampling);
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    targetDate = `${year}-${month}-${day}`;
                  }
                  router.push({
                    pathname: '/(tabs)/jadwal',
                    params: { date: targetDate },
                  });
                }}
              />
              <QuickActionCard
                iconName="sync"
                label="Sync Data"
                colorScheme="amber"
                badge={pendingSync > 0}
                onPress={() => router.push('/(tabs)/sinkronisasi')}
              />
              <QuickActionCard
                iconName="map-marker-radius-outline"
                label="Map View"
                colorScheme="violet"
                onPress={handleMapView}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Recent Activity ──────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {activities.length === 0 && !jadwalLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={32} color={Colors.outlineVariant} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.onSurfaceVariant, marginTop: 8 }}>Belum ada jadwal sampling</Text>
                </View>
              ) : (
                activities.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.activityCard,
                      item.status === 'syncing' && styles.activityCardWarning,
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIconBox,
                        item.status === 'syncing'
                          ? styles.activityIconBoxWarning
                          : styles.activityIconBoxSuccess,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={22}
                        color={item.status === 'syncing' ? Colors.statusWarning : Colors.statusSuccess}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>
                ))
              )}
            </View>
          </View>
        </Animated.View>

        {/* Bottom padding for FAB + nav bar */}
        <View style={{ height: Platform.OS === 'android' ? 180 : 160 }} />
      </ScrollView>

      

      {/* ── Notification Panel Modal ── */}
      <Modal
        visible={showNotifPanel}
        transparent
        animationType="fade"
        onRequestClose={handleCloseNotifPanel}
      >
        <Pressable style={styles.notifOverlay} onPress={handleCloseNotifPanel}>
          <View />
        </Pressable>
        <View style={[styles.notifPanel, { top: insets.top + 52 }]}>
          {/* Header */}
          <View style={styles.notifHeader}>
            <View style={styles.notifHeaderLeft}>
              <Ionicons name="notifications" size={18} color={Colors.primary} />
              <Text style={styles.notifHeaderTitle}>Jadwal Baru</Text>
            </View>
            {newJadwalList.length > 0 && (
              <View style={styles.notifCountBadge}>
                <Text style={styles.notifCountText}>{newJadwalList.length}</Text>
              </View>
            )}
          </View>

          {/* List */}
          <ScrollView
            style={styles.notifList}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {newJadwalList.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="checkmark-circle" size={36} color={Colors.statusSuccess} />
                <Text style={styles.notifEmptyText}>Tidak ada jadwal baru</Text>
                <Text style={styles.notifEmptySubtext}>Semua jadwal sudah dilihat</Text>
              </View>
            ) : (
              newJadwalList.map((jadwal, index) => {
                const isLast = index === newJadwalList.length - 1;
                const tanggal = parseDateRobust(jadwal.tanggal_sampling);
                const hari = tanggal.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                const jam = jadwal.jam_sampling || tanggal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                return (
                  <TouchableOpacity
                    key={jadwal.id}
                    style={[styles.notifItem, !isLast && styles.notifItemBorder]}
                    activeOpacity={0.7}
                    onPress={() => handleNotifItemPress(jadwal.id)}
                  >
                    <View style={styles.notifItemIcon}>
                      <Ionicons name="calendar" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.notifItemContent}>
                      <Text style={styles.notifItemTitle} numberOfLines={1}>
                        {jadwal.permohonan?.nama_pemohon || jadwal.lokasi || 'Jadwal Sampling'}
                      </Text>
                      <Text style={styles.notifItemSubtitle} numberOfLines={1}>
                        {jadwal.lokasi || jadwal.permohonan?.alamat || '-'}
                      </Text>
                      <View style={styles.notifItemMeta}>
                        <Ionicons name="time-outline" size={11} color={Colors.onSurfaceVariant} />
                        <Text style={styles.notifItemMetaText}>{hari} • {jam}</Text>
                      </View>
                    </View>
                    <View style={styles.notifNewDot} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity
            style={styles.notifFooter}
            activeOpacity={0.7}
            onPress={() => {
              handleCloseNotifPanel();
              router.push('/(tabs)/jadwal');
            }}
          >
            <Text style={styles.notifFooterText}>Lihat Semua Jadwal</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },

  // ── Top Bar ──
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  avatarRole: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.statusSuccess,
  },
  onlineText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.statusSuccess,
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.statusDanger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  bellBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    lineHeight: 12,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(160, 244, 197, 0.9)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  heroCount: {
    fontSize: 56,
    fontFamily: 'Poppins_700Bold',
    color: Colors.onPrimary,
    lineHeight: 64,
    letterSpacing: -2,
  },
  heroCountSub: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
  heroDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
  },
  heroDot: {
    color: Colors.tertiaryFixed,
  },
  heroBioBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.xl,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroProgressSection: {
    marginTop: 24,
    zIndex: 1,
  },
  heroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroProgressLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroProgressTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryFixed,
    shadowColor: 'rgba(255,255,255,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  // ── Section ──
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },

  // ── Quick Actions ──
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCardOuter: {
    width: '47%',
  },
  quickCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    minHeight: 110,
    overflow: 'hidden',
  },
  quickCardOrb: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  quickCardOrbSmall: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  quickIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    zIndex: 1,
  },
  badgeDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusWarning,
  },

  // ── Activity ──
  activityList: {
    gap: 8,
  },
  activityCard: {
    backgroundColor: CardBg.glass45,
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  activityCardWarning: {
    backgroundColor: Platform.OS === 'android' ? '#FFF7E9' : 'rgba(245, 158, 11, 0.05)',
    borderColor: Platform.OS === 'android' ? '#FDEAC8' : 'rgba(245, 158, 11, 0.2)',
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconBoxSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  activityIconBoxWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  activitySubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextSuccess: {
    color: Colors.statusSuccess,
  },
  statusTextWarning: {
    color: Colors.statusWarning,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 112 : 104,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 22,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  fabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Notification Panel ──
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  notifPanel: {
    position: 'absolute',
    right: 16,
    width: Platform.OS === 'android' ? '90%' as any : 320,
    maxWidth: 320,
    maxHeight: 420,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: 'rgba(0, 106, 68, 0.04)',
  },
  notifHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  notifCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.statusDanger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notifCountText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  notifList: {
    maxHeight: 300,
  },
  notifEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  notifEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  notifEmptySubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  notifItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  notifItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 106, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemContent: {
    flex: 1,
    gap: 2,
  },
  notifItemTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  notifItemSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  notifItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  notifItemMetaText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
  },
  notifNewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  notifFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: 'rgba(0, 106, 68, 0.03)',
  },
  notifFooterText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
