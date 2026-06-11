import React, { useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useMyJadwal } from '@/hooks/useJadwal';
import type { JadwalSamplingData } from '@/services/jadwal.service';
import LocationMapView, { type MapMarker, type LocationMapViewRef } from '@/components/LocationMapView';

// ─── Types ───────────────────────────────────────────────────────────────────

type JadwalStatus = 'dijadwalkan' | 'berlangsung' | 'selesai' | 'terlewat';

interface MapJadwalItem {
  id: string;
  latitude: number;
  longitude: number;
  lokasi: string;
  namaPemohon: string;
  jenisSampel: string;
  status: JadwalStatus;
  tanggalSampling: string;
  namaInstansi?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  JadwalStatus,
  { label: string; color: string; markerColor: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  dijadwalkan: {
    label: 'Dijadwalkan',
    color: Colors.statusInfo,
    markerColor: '#2563EB',
    icon: 'clock-outline',
  },
  berlangsung: {
    label: 'Berlangsung',
    color: Colors.statusWarning,
    markerColor: '#F59E0B',
    icon: 'progress-clock',
  },
  selesai: {
    label: 'Selesai',
    color: Colors.statusSuccess,
    markerColor: '#16A34A',
    icon: 'check-circle-outline',
  },
  terlewat: {
    label: 'Terlewat',
    color: '#DC2626',
    markerColor: '#DC2626',
    icon: 'calendar-remove-outline',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
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


function normalizeStatus(raw: string): JadwalStatus {
  const map: Record<string, JadwalStatus> = {
    dijadwalkan: 'dijadwalkan',
    berlangsung: 'berlangsung',
    selesai: 'selesai',
    terlewat: 'terlewat',
    scheduled: 'dijadwalkan',
    in_progress: 'berlangsung',
    completed: 'selesai',
  };
  return map[raw] || 'dijadwalkan';
}

function mapApiToMapItem(data: JadwalSamplingData): MapJadwalItem | null {
  // Try jadwal coordinates first, then fallback to first sample's coordinates
  let lat = data.latitude ? Number(data.latitude) : null;
  let lng = data.longitude ? Number(data.longitude) : null;

  // Fallback: use coordinates from the first sample if jadwal has none
  if ((!lat || !lng) && data.samples && Array.isArray(data.samples)) {
    for (const sample of data.samples as any[]) {
      if (sample.latitude && sample.longitude) {
        lat = Number(sample.latitude);
        lng = Number(sample.longitude);
        break;
      }
    }
  }

  // Skip items without any coordinates
  if (!lat || !lng) return null;

  const dateObj = parseDateRobust(data.tanggal_sampling);

  const dateStr = dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    id: data.id,
    latitude: lat,
    longitude: lng,
    lokasi: data.lokasi || 'Lokasi tidak diketahui',
    namaPemohon: data.permohonan?.nama_pemohon || data.lokasi || 'Pemohon',
    jenisSampel: (data.permohonan?.jenis_sample as string) || 'Sampel',
    status: normalizeStatus(data.status),
    tanggalSampling: dateStr,
    namaInstansi: (data.permohonan?.nama_instansi || data.permohonan?.instansi) as string | undefined,
  };
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MapViewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<LocationMapViewRef>(null);

  const { data: jadwalResponse, isLoading } = useMyJadwal();
  const apiData = jadwalResponse?.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter items that have valid coordinates
  const mapItems = useMemo(() => {
    return apiData
      .map(mapApiToMapItem)
      .filter((item): item is MapJadwalItem => item !== null);
  }, [apiData]);

  // Convert to LocationMapView markers format
  const mapMarkers: MapMarker[] = useMemo(() => {
    return mapItems.map((item) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.namaPemohon,
      description: `${item.jenisSampel} • ${item.tanggalSampling}`,
      color: STATUS_CONFIG[item.status].markerColor,
    }));
  }, [mapItems]);

  // Summary counts
  const counts = useMemo(() => {
    const c = { total: mapItems.length, berlangsung: 0, dijadwalkan: 0, selesai: 0, terlewat: 0 };
    mapItems.forEach((item) => {
      c[item.status]++;
    });
    return c;
  }, [mapItems]);

  // Fit map to markers
  const fitToAllMarkers = useCallback(() => {
    if (mapItems.length === 0 || !mapRef.current) return;
    const coords = mapItems.map((m) => ({
      latitude: m.latitude,
      longitude: m.longitude,
    }));
    mapRef.current.fitBounds(coords);
  }, [mapItems]);

  // Navigate to selected marker
  const handleFocusMarker = useCallback(
    (item: MapJadwalItem) => {
      setSelectedId(item.id);
      mapRef.current?.flyTo(item.latitude, item.longitude, 16);
    },
    [],
  );

  // Start sampling for a jadwal
  const handleStartSampling = useCallback(
    (item: MapJadwalItem) => {
      router.push({
        pathname: '/sampling-form',
        params: {
          jadwalId: item.id,
          namaPemohon: item.namaPemohon,
          jenisSampel: item.jenisSampel,
          lokasi: item.lokasi,
          namaInstansi: item.namaInstansi ?? '',
          latitude: item.latitude?.toString(),
          longitude: item.longitude?.toString(),
        },
      });
    },
    [router],
  );

  // Handle marker press from map
  const handleMarkerPress = useCallback(
    (marker: MapMarker) => {
      setSelectedId(marker.id);
    },
    [],
  );

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  return (
    <View style={styles.safeArea}>
      {/* ── Floating Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Peta Lokasi Sampling</Text>
        <TouchableOpacity style={styles.fitButton} onPress={fitToAllMarkers}>
          <MaterialCommunityIcons name="fit-to-screen-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Full-Screen Map (explicit height) ── */}
      <View style={styles.mapContainer}>
        <LocationMapView
          ref={mapRef}
          latitude={null}
          longitude={null}
          height={screenHeight}
          markers={mapMarkers}
          onMarkerCalloutPress={handleMarkerPress}
          fitToMarkers
          showsUserLocation
          borderless
        />
      </View>

      {/* No-location overlay */}
      {!isLoading && mapItems.length === 0 && (
        <View style={styles.emptyOverlay}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={40} color={Colors.outlineVariant} />
          <Text style={styles.emptyTitle}>Tidak ada lokasi</Text>
          <Text style={styles.emptySubtitle}>
            Belum ada jadwal sampling yang memiliki koordinat GPS
          </Text>
        </View>
      )}


      {/* ── Floating Legend ── */}
      <View style={[styles.legendContainer, { top: insets.top + 62 }]}>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = counts[key as JadwalStatus] || 0;
          if (count === 0) return null;
          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config.markerColor }]} />
              <Text style={styles.legendText}>
                {config.label} ({count})
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Bottom Sheet: Location list ── */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          Lokasi Jadwal ({mapItems.length})
        </Text>

        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
        >
          {mapItems.length === 0 && !isLoading ? (
            <Text style={styles.sheetEmptyText}>
              Tidak ada jadwal dengan koordinat GPS
            </Text>
          ) : (
            mapItems.map((item) => {
              const config = STATUS_CONFIG[item.status];
              const isSelected = selectedId === item.id;
              const isActionable = item.status !== 'selesai' && item.status !== 'terlewat';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sheetCard,
                    isSelected && styles.sheetCardSelected,
                  ]}
                  onPress={() => handleFocusMarker(item)}
                  activeOpacity={0.75}
                >
                  {/* Status indicator dot */}
                  <View style={[styles.sheetCardDot, { backgroundColor: config.markerColor }]} />

                  <View style={styles.sheetCardContent}>
                    <Text style={styles.sheetCardTitle} numberOfLines={1}>
                      {item.namaPemohon}
                    </Text>
                    <Text style={styles.sheetCardSub} numberOfLines={1}>
                      {item.jenisSampel} • {item.tanggalSampling}
                    </Text>
                  </View>

                  {isActionable ? (
                    <TouchableOpacity
                      style={styles.sheetStartBtn}
                      onPress={() => handleStartSampling(item)}
                    >
                      <MaterialCommunityIcons
                        name="play-circle-outline"
                        size={14}
                        color={Colors.onPrimary}
                      />
                      <Text style={styles.sheetStartText}>Mulai</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.sheetBadge, { backgroundColor: config.color + '18' }]}>
                      <MaterialCommunityIcons name={config.icon} size={12} color={config.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Map (fills entire screen) ──
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },

  // ── Floating Top Bar ──
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 106, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 106, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Floating Legend ──
  legendContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },

  // ── Empty ──
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,252,245,0.85)',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // ── Floating Bottom Sheet ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    gap: 8,
    paddingBottom: 8,
  },
  sheetEmptyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // ── Sheet Card ──
  sheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.lg,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  sheetCardSelected: {
    backgroundColor: 'rgba(0, 106, 68, 0.06)',
    borderColor: Colors.primary + '30',
  },
  sheetCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sheetCardContent: {
    flex: 1,
    gap: 2,
  },
  sheetCardTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  sheetCardSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  sheetStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  sheetStartText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
  sheetBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
