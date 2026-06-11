import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import LocationMapView from '@/components/LocationMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, CardBg } from '@/constants/theme';
import { useMyJadwal } from '@/hooks/useJadwal';
import { upsertJadwalFromApi } from '@/database/repositories/jadwal.repository';
import type { JadwalSamplingData } from '@/services/jadwal.service';

// ─── Types ───────────────────────────────────────────────────────────────────

type JadwalStatus = 'dijadwalkan' | 'berlangsung' | 'selesai' | 'terlewat';
type SampleType = 'Air Limbah' | 'Air Bersih' | 'Klinis' | 'Usap Alat' | 'Udara';
type FilterType = 'calendar' | 'today' | 'week' | 'all';
type StatusFilter = 'all' | 'selesai' | 'berlangsung' | 'dijadwalkan' | 'terlewat';

interface JadwalItem {
  id: string;
  location: string;
  address: string;
  date: string;
  dateIso: string;
  time: string;
  sampleType: SampleType;
  status: JadwalStatus;
  // Extra context for sampling form navigation
  namaPemohon?: string;
  namaInstansi?: string;
  jenisSampelRaw?: string;
  lokasiRaw?: string;
  latitude?: number | null;
  longitude?: number | null;
  petugasName?: string;
  anggota1Name?: string;
  anggota2Name?: string;
  nomorPermohonan?: string;
  catatan?: string | null;
}


// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_FILTERS: { key: FilterType; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'all', label: 'Semua' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Semua', icon: 'view-list-outline' },
  { key: 'berlangsung', label: 'Berlangsung', icon: 'progress-clock' },
  { key: 'dijadwalkan', label: 'Dijadwalkan', icon: 'calendar-clock-outline' },
  { key: 'terlewat', label: 'Terlewat', icon: 'calendar-remove-outline' },
  { key: 'selesai', label: 'Selesai', icon: 'check-circle-outline' },
];

const STATUS_CONFIG: Record<JadwalStatus, { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  dijadwalkan: {
    label: 'Dijadwalkan',
    color: Colors.statusInfo,
    bg: 'rgba(37, 99, 235, 0.1)',
    icon: 'clock-outline',
  },
  berlangsung: {
    label: 'Berlangsung',
    color: Colors.statusWarning,
    bg: 'rgba(245, 158, 11, 0.1)',
    icon: 'progress-clock',
  },
  selesai: {
    label: 'Selesai',
    color: Colors.statusSuccess,
    bg: 'rgba(22, 163, 74, 0.1)',
    icon: 'check-circle-outline',
  },
  terlewat: {
    label: 'Terlewat',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.1)',
    icon: 'calendar-remove-outline',
  },
};

const SAMPLE_ICON: Record<SampleType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'Air Limbah': 'water-outline',
  'Air Bersih': 'water-check',
  Klinis: 'microscope',
  'Usap Alat': 'silverware-fork-knife',
  Udara: 'weather-windy',
};

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

function getLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusChip({
  label,
  icon,
  isActive,
  onPress,
  activeColor,
  activeBg,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
  activeColor?: string;
  activeBg?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statusChip,
        isActive && {
          backgroundColor: activeBg || Colors.primary,
          borderColor: activeColor || Colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={13}
        color={isActive ? (activeColor || Colors.onPrimary) : Colors.onSurfaceVariant}
      />
      <Text
        style={[
          styles.statusChipText,
          isActive && { color: activeColor || Colors.onPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function JadwalCard({ item, index, onPress }: { item: JadwalItem; index: number; onPress: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userSubRole = user?.subRole;

  const config = STATUS_CONFIG[item.status];
  const sampleIcon = SAMPLE_ICON[item.sampleType];
  const isSelesai = item.status === 'selesai';
  const isBerlangsung = item.status === 'berlangsung';
  const isTerlewat = item.status === 'terlewat';

  const handleMulai = () => {
    router.push({
      pathname: '/sampling-form',
      params: {
        jadwalId: item.id,
        namaPemohon: item.namaPemohon ?? item.location,
        jenisSampel: item.jenisSampelRaw ?? item.sampleType,
        lokasi: item.lokasiRaw ?? item.address,
        namaInstansi: item.namaInstansi ?? '',
        latitude: item.latitude?.toString(),
        longitude: item.longitude?.toString(),
      },
    });
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 80).duration(400)}>
      <TouchableOpacity
        style={[styles.card, (isSelesai || isTerlewat) && styles.cardCompleted]}
        activeOpacity={0.85}
        onPress={onPress}
      >
        {/* Header: icon + location */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: config.bg }]}>
            <MaterialCommunityIcons name={sampleIcon} size={22} color={config.color} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardLocation, (isSelesai || isTerlewat) && styles.textMuted]}>
              {item.location}
            </Text>
            <Text style={styles.cardAddress}>{item.address}</Text>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.cardInfoRow}>
          <View style={styles.cardInfoItem}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.cardInfoText}>{item.date}</Text>
          </View>
          <View style={styles.cardInfoItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.cardInfoText}>{item.time}</Text>
          </View>
        </View>

        {/* Bottom row: badge + button */}
        <View style={styles.cardBottom}>
          <View style={styles.cardBadges}>
            {/* Sample type badge */}
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>{item.sampleType}</Text>
            </View>
            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <MaterialCommunityIcons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusBadgeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
          {!isSelesai && !isTerlewat && userSubRole !== 'anggota' ? (
            <TouchableOpacity
              style={[
                styles.startButton,
                isBerlangsung && styles.startButtonContinue,
              ]}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                handleMulai();
              }}
            >
              <MaterialCommunityIcons
                name={isBerlangsung ? 'play-pause' : 'play-circle-outline'}
                size={16}
                color={Colors.onPrimary}
              />
              <Text style={styles.startButtonText}>
                {isBerlangsung ? 'Lanjutkan' : 'Mulai'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} style={{ opacity: 0.4, marginRight: 4 }} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Custom Calendar Component ───────────────────────────────────────────────

function CalendarComponent({
  jadwalDates,
  selectedDate,
  onSelectDate,
}: {
  jadwalDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const initialMonth = useMemo(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  }, [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  // Sync calendar sheet when selectedDate changes from outside (e.g. Quick Actions navigation)
  React.useEffect(() => {
    if (selectedDate) {
      const target = new Date(selectedDate);
      if (target.getMonth() !== currentMonth.getMonth() || target.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(target);
      }
    }
  }, [selectedDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = useMemo(() => {
    return currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); 
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month days filler
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        key: `prev-${prevMonthTotalDays - i}`,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      days.push({
        date: currDate,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    // Next month days filler
    const totalCells = days.length <= 35 ? 35 : 42;
    const nextMonthDaysNeeded = totalCells - days.length;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <View style={styles.calendarCard}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdayRow}>
        {dayNames.map((name) => (
          <Text key={name} style={styles.weekdayText}>{name}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {daysInMonth.map((dayItem) => {
          const dateString = getLocalDateIso(dayItem.date);
          const isSelected = dateString === selectedDate;
          const hasJadwal = jadwalDates.includes(dateString);
          const isToday = getLocalDateIso() === dateString;

          return (
            <TouchableOpacity
              key={dayItem.key}
              style={[
                styles.dayCell,
                !dayItem.isCurrentMonth && styles.dayCellOutside,
                isSelected && styles.dayCellSelected,
              ]}
              onPress={() => onSelectDate(dateString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  !dayItem.isCurrentMonth && styles.dayTextOutside,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {dayItem.date.getDate()}
              </Text>
              
              <View style={styles.dotsRow}>
                {hasJadwal && (
                  <View
                    style={[
                      styles.dotJadwal,
                      isSelected && styles.dotJadwalSelected,
                    ]}
                  />
                )}
                {isToday && !isSelected && (
                  <View style={styles.dotToday} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Helper: Normalize jenis_sample dari DB ke SampleType enum ──────────────

function normalizeSampleType(raw?: string): SampleType {
  if (!raw) return 'Air Bersih';
  const map: Record<string, SampleType> = {
    'Air':          'Air Bersih',
    'air':          'Air Bersih',
    'Air Bersih':   'Air Bersih',
    'Air Limbah':   'Air Limbah',
    'air limbah':   'Air Limbah',
    'air bersih':   'Air Bersih',
    'Klinis':       'Klinis',
    'klinis':       'Klinis',
    'Usap Alat':    'Usap Alat',
    'usap alat':    'Usap Alat',
    'Udara':        'Udara',
    'udara':        'Udara',
  };
  return map[raw] ?? 'Air Bersih';
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

function mapApiToJadwalItem(data: JadwalSamplingData): JadwalItem {
  const dateObj = parseDateRobust(data.tanggal_sampling);

  const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  // Get YYYY-MM-DD in local time
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateIso = `${year}-${month}-${day}`;

  const statusMap: Record<string, JadwalStatus> = {
    dijadwalkan: 'dijadwalkan',
    berlangsung: 'berlangsung',
    selesai: 'selesai',
    terlewat: 'terlewat',
    scheduled: 'dijadwalkan',
    in_progress: 'berlangsung',
    completed: 'selesai',
  };

  const jenisSampel = data.permohonan?.jenis_sample as string | undefined;

  return {
    id: data.id,
    location: data.permohonan?.nama_pemohon || data.lokasi || 'Lokasi',
    address: data.lokasi || '',
    date: dateStr,
    dateIso: dateIso,
    time: timeStr,
    sampleType: normalizeSampleType(jenisSampel),
    status: statusMap[data.status] || 'dijadwalkan',
    // Extra fields for sampling-form navigation and details visualizer
    namaPemohon: data.permohonan?.nama_pemohon,
    namaInstansi: (data.permohonan?.nama_instansi || data.permohonan?.instansi) as string | undefined,
    jenisSampelRaw: jenisSampel,
    lokasiRaw: data.lokasi ?? '',
    latitude: data.latitude ?? (data.permohonan?.latitude as number | undefined) ?? null,
    longitude: data.longitude ?? (data.permohonan?.longitude as number | undefined) ?? null,
    petugasName: data.petugas_lapangan?.name ?? data.petugas?.name ?? '-',
    anggota1Name: data.anggota_1?.name ?? '-',
    anggota2Name: data.anggota_2?.name ?? '-',
    nomorPermohonan: data.permohonan?.nomor_permohonan as string | undefined,
    catatan: data.catatan,
  };
}

export default function JadwalScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const params = useLocalSearchParams<{ date?: string }>();
  const todayIso = getLocalDateIso();
  const initialDate = params.date || todayIso;

  const [activeFilter, setActiveFilter] = useState<FilterType>(params.date ? 'calendar' : 'today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Switch to calendar filter and select the date when navigated with params.date
  React.useEffect(() => {
    if (params.date) {
      setSelectedDate(params.date);
      setActiveFilter('calendar');
    }
  }, [params.date]);

  const insets = useSafeAreaInsets();
  const { data: jadwalResponse, isLoading, refetch } = useMyJadwal();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const apiData = jadwalResponse?.data ?? [];

  // Cache API data to SQLite for offline use
  React.useEffect(() => {
    if (apiData.length > 0) {
      upsertJadwalFromApi(apiData).catch(() => {});
    }
  }, [apiData]);

  const sortedApiData = useMemo(() => {
    return [...apiData].sort((a, b) => {
      const timeA = parseDateRobust(a.tanggal_sampling).getTime();
      const timeB = parseDateRobust(b.tanggal_sampling).getTime();
      return timeB - timeA;
    });
  }, [apiData]);

  const jadwalItems: JadwalItem[] = sortedApiData.map(mapApiToJadwalItem);

  const scheduledDates = useMemo(() => {
    return jadwalItems.map((item) => item.dateIso);
  }, [jadwalItems]);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    return new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  const isDateInCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  };

  const filteredData = jadwalItems.filter((item) => {
    // Date filter
    let passDate = true;
    if (activeFilter === 'calendar') {
      passDate = item.dateIso === selectedDate;
    } else if (activeFilter === 'today') {
      passDate = item.dateIso === todayIso || item.status === 'berlangsung';
    } else if (activeFilter === 'week') {
      passDate = isDateInCurrentWeek(item.dateIso);
    }

    // Status filter
    let passStatus = true;
    if (statusFilter === 'selesai') {
      passStatus = item.status === 'selesai';
    } else if (statusFilter === 'berlangsung') {
      passStatus = item.status === 'berlangsung';
    } else if (statusFilter === 'dijadwalkan') {
      passStatus = item.status === 'dijadwalkan';
    } else if (statusFilter === 'terlewat') {
      passStatus = item.status === 'terlewat';
    }

    return passDate && passStatus;
  });

  const todayCount = jadwalItems.filter((d) => d.dateIso === todayIso || d.status === 'berlangsung').length;

  return (
    <View style={styles.safeArea}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.topBarTitle}>Jadwal Sampling</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
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
        {/* Summary card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryOrb} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>JADWAL HARI INI</Text>
              <View style={styles.summaryCountRow}>
                <Text style={styles.summaryCount}>{todayCount}</Text>
                <Text style={styles.summaryCountSub}>Sampling</Text>
              </View>
              <Text style={styles.summaryDate}>
                <Text style={styles.summaryDot}>● </Text>
                {formattedToday}
              </Text>
            </View>
            <View style={styles.summaryIconBox}>
              <MaterialCommunityIcons name="calendar-month" size={28} color={Colors.onPrimary} />
            </View>
          </View>
        </Animated.View>

        {/* Date filter – segmented buttons */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.segmentedContainer}>
            {DATE_FILTERS.map((f, idx) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.segmentBtn,
                  idx === 0 && styles.segmentBtnFirst,
                  idx === DATE_FILTERS.length - 1 && styles.segmentBtnLast,
                  activeFilter === f.key && styles.segmentBtnActive,
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    activeFilter === f.key && styles.segmentBtnTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Status filter chips */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusChipRow}
          >
            {STATUS_FILTERS.map((s) => (
              <StatusChip
                key={s.key}
                label={s.label}
                icon={s.icon}
                isActive={statusFilter === s.key}
                onPress={() => setStatusFilter(s.key)}
                activeColor={
                  s.key === 'selesai'
                    ? Colors.statusSuccess
                    : s.key === 'berlangsung'
                    ? Colors.statusWarning
                    : s.key === 'dijadwalkan'
                    ? Colors.statusInfo
                    : s.key === 'terlewat'
                    ? '#DC2626'
                    : Colors.onPrimary
                }
                activeBg={
                  s.key === 'selesai'
                    ? 'rgba(22, 163, 74, 0.12)'
                    : s.key === 'berlangsung'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : s.key === 'dijadwalkan'
                    ? 'rgba(37, 99, 235, 0.10)'
                    : s.key === 'terlewat'
                    ? 'rgba(220, 38, 38, 0.10)'
                    : Colors.primary
                }
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Calendar Grid View (rendered when calendar filter is active) */}
        {activeFilter === 'calendar' && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <CalendarComponent
              jadwalDates={scheduledDates}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />
          </Animated.View>
        )}

        {/* Date header indicator */}
        <Text style={styles.dateHeaderTitle}>
          {activeFilter === 'calendar'
            ? `Jadwal pada ${formattedSelectedDate}`
            : activeFilter === 'today'
            ? `Jadwal Hari Ini`
            : activeFilter === 'week'
            ? `Jadwal Minggu Ini`
            : `Semua Jadwal Sampling`}
        </Text>

        {/* Schedule list */}
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={48}
              color={Colors.outlineVariant}
            />
            <Text style={styles.emptyTitle}>Tidak ada jadwal</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'calendar'
                ? `Tidak ada pengambilan sampel pada tanggal ini`
                : `Belum ada jadwal sampling untuk filter ini`}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredData.map((item, index) => (
              <JadwalCard
                key={item.id}
                item={item}
                index={index}
                onPress={() => {
                  setSelectedJadwal(item);
                  setShowDetailModal(true);
                }}
              />
            ))}
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: Platform.OS === 'android' ? 160 : 140 }} />
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={modalStyles.overlay}>
          <Pressable style={modalStyles.dismissArea} onPress={() => setShowDetailModal(false)} />
          <View style={modalStyles.sheet}>
            {/* Header */}
            <View style={modalStyles.header}>
              <View style={modalStyles.headerLeft}>
                <Text style={modalStyles.headerTitle}>Detail Kunjungan Sampling</Text>
                <Text style={modalStyles.headerSubtitle}>ID: {selectedJadwal?.id.substring(0, 8)}</Text>
              </View>
              <TouchableOpacity
                style={modalStyles.closeBtn}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Scrollable details */}
            <ScrollView style={modalStyles.scrollBody} contentContainerStyle={modalStyles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Map View */}
              {selectedJadwal && (selectedJadwal.latitude !== null || selectedJadwal.longitude !== null) && (
                <View style={modalStyles.mapContainer}>
                  <Text style={modalStyles.sectionTitle}>Peta Lokasi</Text>
                  <LocationMapView
                    latitude={selectedJadwal.latitude ?? null}
                    longitude={selectedJadwal.longitude ?? null}
                    height={170}
                  />
                </View>
              )}

              {/* Detail Permohonan Card */}
              <View style={modalStyles.infoCard}>
                <Text style={modalStyles.sectionTitle}>Detail Permohonan</Text>
                
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Nomor Permohonan</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.nomorPermohonan ?? '-'}</Text>
                </View>

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Nama Pemohon</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.namaPemohon ?? '-'}</Text>
                </View>

                {selectedJadwal?.namaInstansi && (
                  <View style={modalStyles.infoRow}>
                    <Text style={modalStyles.infoLabel}>Nama Instansi</Text>
                    <Text style={modalStyles.infoValue}>{selectedJadwal?.namaInstansi}</Text>
                  </View>
                )}

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Jenis Sampel</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.jenisSampelRaw ?? '-'}</Text>
                </View>

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Alamat Sampling</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.address ?? '-'}</Text>
                </View>
              </View>

              {/* Tim Sampling Card */}
              <View style={modalStyles.infoCard}>
                <Text style={modalStyles.sectionTitle}>Tim Sampling</Text>

                <View style={modalStyles.teamMemberRow}>
                  <View style={modalStyles.teamBadgeKetua}>
                    <Text style={modalStyles.teamBadgeText}>Ketua</Text>
                  </View>
                  <Text style={modalStyles.teamMemberName}>{selectedJadwal?.petugasName}</Text>
                </View>

                <View style={modalStyles.teamMemberRow}>
                  <View style={modalStyles.teamBadgeAnggota}>
                    <Text style={modalStyles.teamBadgeText}>Anggota 1</Text>
                  </View>
                  <Text style={modalStyles.teamMemberName}>{selectedJadwal?.anggota1Name}</Text>
                </View>

                <View style={modalStyles.teamMemberRow}>
                  <View style={modalStyles.teamBadgeAnggota}>
                    <Text style={modalStyles.teamBadgeText}>Anggota 2</Text>
                  </View>
                  <Text style={modalStyles.teamMemberName}>{selectedJadwal?.anggota2Name}</Text>
                </View>
              </View>

              {/* Schedule Info */}
              <View style={modalStyles.infoCard}>
                <Text style={modalStyles.sectionTitle}>Jadwal & Status</Text>

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Tanggal</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.date}</Text>
                </View>

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Waktu Estimasi</Text>
                  <Text style={modalStyles.infoValue}>{selectedJadwal?.time}</Text>
                </View>

                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Status</Text>
                  <Text style={[modalStyles.infoValue, { textTransform: 'capitalize', fontWeight: 'bold' }]}>
                    {selectedJadwal?.status}
                  </Text>
                </View>

                {selectedJadwal?.catatan && (
                  <View style={modalStyles.infoRow}>
                    <Text style={modalStyles.infoLabel}>Catatan</Text>
                    <Text style={modalStyles.infoValue}>{selectedJadwal?.catatan}</Text>
                  </View>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Action Button (only for Ketua and active status) */}
            {selectedJadwal && selectedJadwal.status !== 'selesai' && selectedJadwal.status !== 'terlewat' && user?.subRole !== 'anggota' && (
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  style={modalStyles.actionButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowDetailModal(false);
                    router.push({
                      pathname: '/sampling-form',
                      params: {
                        jadwalId: selectedJadwal.id,
                        namaPemohon: selectedJadwal.namaPemohon ?? selectedJadwal.location,
                        jenisSampel: selectedJadwal.jenisSampelRaw ?? selectedJadwal.sampleType,
                        lokasi: selectedJadwal.lokasiRaw ?? selectedJadwal.address,
                        namaInstansi: selectedJadwal.namaInstansi ?? '',
                        latitude: selectedJadwal.latitude?.toString(),
                        longitude: selectedJadwal.longitude?.toString(),
                      },
                    });
                  }}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={20} color={Colors.onPrimary} />
                  <Text style={modalStyles.actionButtonText}>
                    {selectedJadwal.status === 'berlangsung' ? 'Lanjutkan Pengambilan Sampel' : 'Mulai Pengambilan Sampel'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  filterButton: {
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

  // ── Summary ──
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryContent: {
    flex: 1,
    zIndex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(160, 244, 197, 0.9)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  summaryCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: Colors.onPrimary,
    lineHeight: 56,
    letterSpacing: -2,
  },
  summaryCountSub: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
  summaryDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  summaryDot: {
    color: Colors.tertiaryFixed,
  },
  summaryIconBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.xl,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },

  // ── Segmented filter buttons ──
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: CardBg.glass55,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.07)',
  },
  segmentBtnFirst: {
    borderTopLeftRadius: Radius.lg - 1,
    borderBottomLeftRadius: Radius.lg - 1,
  },
  segmentBtnLast: {
    borderRightWidth: 0,
    borderTopRightRadius: Radius.lg - 1,
    borderBottomRightRadius: Radius.lg - 1,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
  },
  segmentBtnTextActive: {
    color: Colors.onPrimary,
  },

  // ── Status chips ──
  statusChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: CardBg.glass60,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
  },

  // ── Cards ──
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: CardBg.glass72,
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardLocation: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  cardAddress: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  textMuted: {
    color: Colors.onSurfaceVariant,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 16,
    paddingLeft: 56,
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardInfoText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  sampleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  sampleBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSecondaryContainer,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  startButtonContinue: {
    backgroundColor: Colors.statusWarning,
  },
  startButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // ── Calendar Styles ──
  calendarCard: {
    backgroundColor: CardBg.glass72,
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 106, 68, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    minHeight: Platform.OS === 'android' ? 36 : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    position: 'relative',
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  dayTextOutside: {
    color: Colors.onSurfaceVariant,
  },
  dayTextSelected: {
    color: Colors.onPrimary,
    fontFamily: 'Inter_700Bold',
  },
  dayTextToday: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 3,
  },
  dotJadwal: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.statusSuccess,
  },
  dotJadwalSelected: {
    backgroundColor: Colors.onPrimary,
  },
  dotToday: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  dateHeaderTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    marginTop: 8,
    marginBottom: 4,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.creamBg,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '85%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  mapContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(189,202,191,0.2)',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(189,202,191,0.2)',
    gap: 10,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    paddingBottom: 8,
    gap: 2,
  },
  infoLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  teamBadgeKetua: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.md,
    width: 76,
    alignItems: 'center',
  },
  teamBadgeAnggota: {
    backgroundColor: Colors.statusInfo,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.md,
    width: 76,
    alignItems: 'center',
  },
  teamBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.onPrimary,
  },
  teamMemberName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
  },
  actionButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
});
