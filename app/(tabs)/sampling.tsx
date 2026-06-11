import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, CardBg } from '@/constants/theme';
import { getAllDrafts, type DraftSamplingRecord } from '@/database/repositories/draft.repository';
import { useMyJadwal } from '@/hooks/useJadwal';
import { useSyncStore } from '@/stores/sync.store';
import { useAuthStore } from '@/stores/auth.store';
import type { JadwalSamplingData } from '@/services/jadwal.service';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftStatus = 'draft' | 'ready';

interface DraftItem {
  id: string;
  customer: string;
  sampleType: string;
  date: string;
  status: DraftStatus;
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

export default function SamplingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const { syncStatus } = useSyncStore();
  const { data: jadwalResponse, refetch: refetchJadwal } = useMyJadwal();

  // Active sampling from jadwal with status 'berlangsung'
  const activeSampling = jadwalResponse?.data?.find((j) => j.status === 'berlangsung' || j.status === 'in_progress');

  // Upcoming jadwal (dijadwalkan / scheduled) sorted by nearest date
  const upcomingJadwal = useMemo(() => {
    const data = jadwalResponse?.data ?? [];
    return data
      .filter((j) => j.status === 'dijadwalkan' || j.status === 'scheduled')
      .sort((a, b) => {
        const timeA = parseDateRobust(a.tanggal_sampling).getTime();
        const timeB = parseDateRobust(b.tanggal_sampling).getTime();
        return timeA - timeB; // ascending: nearest first
      });
  }, [jadwalResponse]);

  // Load drafts from SQLite
  const loadDrafts = useCallback(async () => {
    try {
      const records = await getAllDrafts();
      const mapped: DraftItem[] = records.map((d: DraftSamplingRecord) => ({
        id: d.id,
        customer: d.lokasi_pengambilan || 'Draft',
        sampleType: d.jenis_sample || 'Sampel',
        date: parseDateRobust(d.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: (d.sync_status === 'pending' ? 'ready' : 'draft') as DraftStatus,
      }));
      setDrafts(mapped);
    } catch {
      setDrafts([]);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDrafts(),
        refetchJadwal(),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [loadDrafts, refetchJadwal]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts, syncStatus]);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
      refetchJadwal();
    }, [loadDrafts, refetchJadwal])
  );

  return (
    <View style={styles.safeArea}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.topBarTitle}>Form Sampling</Text>
        <TouchableOpacity style={styles.historyButton}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

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
        {/* Active sampling (in-progress) — only shown when there IS an active sampling */}
        {activeSampling && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={styles.activeCard}>
              <View style={styles.activeOrb} />
              <View style={styles.activeHeader}>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>Sedang Berlangsung</Text>
                </View>
              </View>
              <View style={styles.activeBody}>
                <Text style={styles.activeCustomer}>
                  {activeSampling.permohonan?.nama_pemohon || activeSampling.lokasi || 'Sampling'}
                </Text>
                <Text style={styles.activeDetail}>
                  {`${activeSampling.permohonan?.jenis_sampel || activeSampling.permohonan?.jenis_sample || 'Sampel'} \u2022 ${parseDateRobust(activeSampling.tanggal_sampling).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                </Text>
              </View>
              <View style={styles.activeProgress}>
                <View style={styles.activeProgressHeader}>
                  <Text style={styles.activeProgressLabel}>Sampling berlangsung</Text>
                </View>
                <View style={styles.activeProgressTrack}>
                  <View style={[styles.activeProgressFill, { width: '50%' }]} />
                </View>
              </View>
              {user?.subRole !== 'anggota' && (
                <TouchableOpacity
                  style={styles.continueButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/sampling-form',
                      params: {
                        jadwalId: activeSampling.id,
                        namaPemohon: activeSampling.permohonan?.nama_pemohon || activeSampling.lokasi || '',
                        jenisSampel: (activeSampling.permohonan?.jenis_sampel || activeSampling.permohonan?.jenis_sample || 'Air Bersih') as string,
                        lokasi: activeSampling.lokasi || '',
                        namaInstansi: (activeSampling.permohonan?.nama_instansi || activeSampling.permohonan?.instansi || '') as string,
                        latitude: activeSampling.latitude?.toString() ?? activeSampling.permohonan?.latitude?.toString(),
                        longitude: activeSampling.longitude?.toString() ?? activeSampling.permohonan?.longitude?.toString(),
                      },
                    });
                  }}
                >
                  <MaterialCommunityIcons name="play" size={18} color={Colors.onPrimary} />
                  <Text style={styles.continueButtonText}>Lanjutkan</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Jadwal Mendatang ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Jadwal Mendatang</Text>
              {upcomingJadwal.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{upcomingJadwal.length}</Text>
                </View>
              )}
            </View>

            {upcomingJadwal.length === 0 ? (
              <View style={styles.upcomingEmpty}>
                <View style={styles.upcomingEmptyIcon}>
                  <MaterialCommunityIcons name="calendar-clock" size={40} color={Colors.outlineVariant} />
                </View>
                <Text style={styles.upcomingEmptyTitle}>Tidak ada jadwal mendatang</Text>
                <Text style={styles.upcomingEmptySubtitle}>
                  Jadwal sampling akan muncul setelah admin menjadwalkan permohonan
                </Text>
              </View>
            ) : (
              <View style={styles.upcomingList}>
                {upcomingJadwal.map((jadwal, index) => {
                  const dateObj = parseDateRobust(jadwal.tanggal_sampling);
                  const dateStr = dateObj.toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeStr = jadwal.jam_sampling || dateObj.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const jenisSampel = (jadwal.permohonan?.jenis_sampel || jadwal.permohonan?.jenis_sample || 'Sampel') as string;
                  const namaPemohon = jadwal.permohonan?.nama_pemohon || jadwal.lokasi || 'Pemohon';
                  const lokasi = jadwal.lokasi || jadwal.permohonan?.alamat || '-';

                  return (
                    <Animated.View
                      key={jadwal.id}
                      entering={FadeInDown.delay(250 + index * 80).duration(400)}
                    >
                      <TouchableOpacity
                        style={styles.upcomingCard}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (user?.subRole !== 'anggota') {
                            router.push({
                              pathname: '/sampling-form',
                              params: {
                                jadwalId: jadwal.id,
                                namaPemohon,
                                jenisSampel,
                                lokasi,
                                namaInstansi: (jadwal.permohonan?.nama_instansi || jadwal.permohonan?.instansi || '') as string,
                                latitude: jadwal.latitude?.toString() ?? jadwal.permohonan?.latitude?.toString(),
                                longitude: jadwal.longitude?.toString() ?? jadwal.permohonan?.longitude?.toString(),
                              },
                            });
                          }
                        }}
                      >
                        {/* Left color accent */}
                        <View style={styles.upcomingAccent} />

                        <View style={styles.upcomingContent}>
                          {/* Header: pemohon + jenis */}
                          <View style={styles.upcomingHeader}>
                            <Text style={styles.upcomingName} numberOfLines={1}>
                              {namaPemohon}
                            </Text>
                            <View style={styles.upcomingSampleBadge}>
                              <Text style={styles.upcomingSampleText}>{jenisSampel}</Text>
                            </View>
                          </View>

                          {/* Location */}
                          <View style={styles.upcomingInfoRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.onSurfaceVariant} />
                            <Text style={styles.upcomingInfoText} numberOfLines={1}>{lokasi}</Text>
                          </View>

                          {/* Date & time */}
                          <View style={styles.upcomingInfoRow}>
                            <MaterialCommunityIcons name="calendar-outline" size={14} color={Colors.onSurfaceVariant} />
                            <Text style={styles.upcomingInfoText}>{dateStr}</Text>
                            <View style={styles.upcomingInfoDot} />
                            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.onSurfaceVariant} />
                            <Text style={styles.upcomingInfoText}>{timeStr} WIB</Text>
                          </View>

                          {/* Bottom: status + action */}
                          <View style={styles.upcomingBottom}>
                            <View style={styles.upcomingStatusBadge}>
                              <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.statusInfo} />
                              <Text style={styles.upcomingStatusText}>Dijadwalkan</Text>
                            </View>
                            {user?.subRole !== 'anggota' && (
                              <TouchableOpacity
                                style={styles.upcomingStartBtn}
                                activeOpacity={0.8}
                                onPress={() => {
                                  router.push({
                                    pathname: '/sampling-form',
                                    params: {
                                      jadwalId: jadwal.id,
                                      namaPemohon,
                                      jenisSampel,
                                      lokasi,
                                      namaInstansi: (jadwal.permohonan?.nama_instansi || jadwal.permohonan?.instansi || '') as string,
                                      latitude: jadwal.latitude?.toString() ?? jadwal.permohonan?.latitude?.toString(),
                                      longitude: jadwal.longitude?.toString() ?? jadwal.permohonan?.longitude?.toString(),
                                    },
                                  });
                                }}
                              >
                                <MaterialCommunityIcons name="play-circle-outline" size={16} color={Colors.onPrimary} />
                                <Text style={styles.upcomingStartText}>Mulai</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Drafts section */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Draft Tersimpan</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{drafts.length}</Text>
              </View>
            </View>

            <View style={styles.draftList}>
              {drafts.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialCommunityIcons name="file-document-outline" size={32} color={Colors.outlineVariant} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.onSurfaceVariant, marginTop: 8 }}>Belum ada draft sampling</Text>
                </View>
              ) : (
                drafts.map((draft, index) => (
                  <Animated.View
                    key={draft.id}
                    entering={FadeInDown.delay(350 + index * 80).duration(400)}
                  >
                    <TouchableOpacity
                      style={styles.draftCard}
                      activeOpacity={0.7}
                      onPress={() => router.push('/sampling-form')}
                    >
                      <View style={[
                        styles.draftIconBox,
                        { backgroundColor: draft.status === 'ready' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)' },
                      ]}>
                        <MaterialCommunityIcons
                          name={draft.status === 'ready' ? 'check-circle-outline' : 'file-document-edit-outline'}
                          size={22}
                          color={draft.status === 'ready' ? Colors.statusSuccess : Colors.statusWarning}
                        />
                      </View>
                      <View style={styles.draftInfo}>
                        <Text style={styles.draftCustomer}>{draft.customer}</Text>
                        <Text style={styles.draftDetail}>
                          {draft.sampleType} • {draft.date}
                        </Text>
                      </View>
                      <View style={[
                        styles.draftStatusBadge,
                        {
                          backgroundColor: draft.status === 'ready'
                            ? 'rgba(22, 163, 74, 0.1)'
                            : Colors.surfaceContainerHighest,
                        },
                      ]}>
                        <Text style={[
                          styles.draftStatusText,
                          {
                            color: draft.status === 'ready'
                              ? Colors.statusSuccess
                              : Colors.onSurfaceVariant,
                          },
                        ]}>
                          {draft.status === 'ready' ? 'Siap' : 'Draft'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              )}
            </View>
          </View>
        </Animated.View>

        {/* Quick tips card */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={18} color={Colors.statusWarning} />
              <Text style={styles.tipsTitle}>Tips Sampling</Text>
            </View>
            <Text style={styles.tipsText}>
              Pastikan GPS aktif dan foto lokasi diambil sebelum memulai sampling. Data akan tersimpan otomatis secara offline.
            </Text>
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
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 106, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // ── Active Card ──
  activeCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    overflow: 'hidden',
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  activeHeader: {
    zIndex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiaryFixed,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  activeBody: {
    zIndex: 1,
    gap: 2,
  },
  activeCustomer: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onPrimary,
  },
  activeDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
  },
  activeProgress: {
    zIndex: 1,
    gap: 6,
  },
  activeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeProgressLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  activeProgressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryFixed,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
  continueButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Upcoming Jadwal ──
  upcomingList: {
    gap: 10,
  },
  upcomingEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: CardBg.glass72,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  upcomingEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  upcomingEmptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  upcomingEmptySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  upcomingCard: {
    backgroundColor: CardBg.glass72,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  upcomingAccent: {
    width: 4,
    backgroundColor: Colors.statusInfo,
  },
  upcomingContent: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  upcomingName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  upcomingSampleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  upcomingSampleText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSecondaryContainer,
  },
  upcomingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingInfoText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  upcomingInfoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.onSurfaceVariant,
    marginHorizontal: 4,
  },
  upcomingBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  upcomingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  upcomingStatusText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.statusInfo,
  },
  upcomingStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  upcomingStartText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Section ──
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Drafts ──
  draftList: {
    gap: 8,
  },
  draftCard: {
    backgroundColor: CardBg.glass60,
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  draftIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftInfo: {
    flex: 1,
    gap: 2,
  },
  draftCustomer: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  draftDetail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  draftStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  draftStatusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },

  // ── Tips ──
  tipsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipsTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.statusWarning,
  },
  tipsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
