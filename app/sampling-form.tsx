import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SamplingStepper } from '@/components/SamplingStepper';
import { insertDraftSampling } from '@/database/repositories/draft.repository';
import { insertOfflineFile } from '@/database/repositories/file.repository';
import { useSyncStore } from '@/stores/sync.store';
import { useNetworkStore } from '@/stores/network.store';
import { useSyncSampling, uploadPhotosSequentially } from '@/hooks/useSampling';
import { uuidv4 } from '@/utils/uuid';
import LocationMapView from '@/components/LocationMapView';

// ─── Types ───────────────────────────────────────────────────────────────────

type Cuaca = 'cerah' | 'berawan' | 'hujan' | 'mendung';
type KondisiSample = 'baik' | 'rusak' | 'tidak_sesuai';

interface PhotoItem {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepNavigator({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  canGoNext,
}: {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canGoNext: boolean;
}) {
  const isLast = currentStep === totalSteps;
  return (
    <View style={navStyles.container}>
      {currentStep > 1 ? (
        <TouchableOpacity style={navStyles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
          <Text style={navStyles.backText}>Kembali</Text>
        </TouchableOpacity>
      ) : (
        <View style={navStyles.placeholder} />
      )}

      {isLast ? (
        <TouchableOpacity
          style={[navStyles.nextBtn, (!canGoNext || isSubmitting) && navStyles.btnDisabled]}
          onPress={onSubmit}
          activeOpacity={0.8}
          disabled={!canGoNext || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <MaterialCommunityIcons name="cloud-upload" size={20} color={Colors.onPrimary} />
          )}
          <Text style={navStyles.nextText}>{isSubmitting ? 'Mengirim...' : 'Submit'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[navStyles.nextBtn, !canGoNext && navStyles.btnDisabled]}
          onPress={onNext}
          activeOpacity={0.8}
          disabled={!canGoNext}
        >
          <Text style={navStyles.nextText}>Lanjut</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(189,202,191,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
    gap: 12,
  },
  placeholder: { flex: 1 },
  backBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  nextBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  nextText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
  btnDisabled: { opacity: 0.45 },
});

// ─── Accuracy helper ──────────────────────────────────────────────────────────

function AccuracyBadge({ accuracy }: { accuracy: number | null }) {
  if (!accuracy) return null;
  const isGood = accuracy < 10;
  const isFair = accuracy < 30;
  const color = isGood ? Colors.statusSuccess : isFair ? Colors.statusWarning : Colors.statusDanger;
  const label = isGood ? 'Akurasi Tinggi' : isFair ? 'Akurasi Sedang' : 'Akurasi Rendah';
  const icon: any = isGood ? 'signal-cellular-3' : isFair ? 'signal-cellular-2' : 'signal-cellular-1';
  return (
    <View style={[accStyles.badge, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[accStyles.text, { color }]}>{label} ({accuracy.toFixed(0)}m)</Text>
    </View>
  );
}

const accStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  text: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});

// ─── Option Button ────────────────────────────────────────────────────────────

function OptionButton<T extends string>({
  options,
  value,
  onChange,
  colorMap,
}: {
  options: { label: string; value: T; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  colorMap?: Partial<Record<T, string>>;
}) {
  return (
    <View style={optStyles.row}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        const color = colorMap?.[opt.value] ?? Colors.primary;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[optStyles.btn, isActive && { backgroundColor: color, borderColor: color }]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            {opt.icon && (
              <MaterialCommunityIcons
                name={opt.icon as any}
                size={14}
                color={isActive ? Colors.onPrimary : Colors.onSurfaceVariant}
              />
            )}
            <Text style={[optStyles.text, isActive && optStyles.textActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const optStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: 'transparent',
  },
  text: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.onSurfaceVariant },
  textActive: { color: Colors.onPrimary },
});

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  badge,
  children,
}: {
  icon: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={cardStyles.titleRow}>
          <View style={cardStyles.iconBox}>
            <MaterialCommunityIcons name={icon as any} size={16} color={Colors.primary} />
          </View>
          <Text style={cardStyles.title}>{title}</Text>
        </View>
        {badge}
      </View>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(189,202,191,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
    paddingBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,106,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
});



function getSampleTypeConfig(jenis: string) {
  const lower = jenis.toLowerCase();
  
  if (lower.includes('limbah')) {
    return {
      units: ['L', 'mL'],
      defaultUnit: 'L',
      placeholderDetail: 'Contoh: limbah cair',
      defaultJumlah: '2'
    };
  }
  if (lower.includes('air')) {
    return {
      units: ['L', 'mL'],
      defaultUnit: 'L',
      placeholderDetail: 'Contoh: air sumur',
      defaultJumlah: '1'
    };
  }
  if (lower.includes('tanah')) {
    return {
      units: ['g', 'kg'],
      defaultUnit: 'g',
      placeholderDetail: 'Contoh: tanah',
      defaultJumlah: '500'
    };
  }
  if (lower.includes('udara')) {
    return {
      units: ['m³', 'L/min'],
      defaultUnit: 'm³',
      placeholderDetail: 'Contoh: udara ambien',
      defaultJumlah: '1.5'
    };
  }
  if (lower.includes('makanan') || lower.includes('minuman')) {
    return {
      units: ['g', 'mL', 'Unit/Pcs'],
      defaultUnit: 'g',
      placeholderDetail: 'Contoh: makanan',
      defaultJumlah: '250'
    };
  }
  if (lower.includes('swab')) {
    return {
      units: ['swab', 'Sample Area'],
      defaultUnit: 'swab',
      placeholderDetail: 'Contoh: meja produksi',
      defaultJumlah: '1'
    };
  }

  // Fallback
  return {
    units: ['Wadah', 'Pcs'],
    defaultUnit: 'Wadah',
    placeholderDetail: 'Contoh: sampel',
    defaultJumlah: '1'
  };
}

const METODE_PENGAMBILAN_OPTIONS: Record<string, string[]> = {
  air: [
    'Grab Sampling',
    'Composite Sampling',
    'Integrated Sampling',
    'Depth Sampling'
  ],
  air_limbah: [
    'Grab Sampling',
    'Time Composite Sampling',
    'Flow Composite Sampling',
    'Automatic Sampling'
  ],
  makanan_minuman: [
    'Random Sampling',
    'Aseptik Sampling',
    'Composite Food Sampling',
    'Retail Sampling'
  ],
  udara: [
    'Passive Sampling',
    'Active Sampling',
    'High Volume Air Sampling',
    'Personal Air Sampling',
    'Stack Sampling (cerobong)'
  ],
  tanah: [
    'Random Sampling',
    'Grid Sampling',
    'Stratified Sampling',
    'Composite Soil Sampling',
    'Core Sampling'
  ],
  swab: [
    'Swab Surface Method',
    'Contact Plate Method',
    'Rinse Method',
    'Air Swab Sampling'
  ],
  default: [
    'Grab Sampling',
    'Composite Sampling'
  ]
};

function getMetodeOptions(jenis: string): string[] {
  const lower = jenis.toLowerCase();
  if (lower.includes('limbah')) {
    return METODE_PENGAMBILAN_OPTIONS.air_limbah;
  }
  if (lower.includes('air')) {
    return METODE_PENGAMBILAN_OPTIONS.air;
  }
  if (lower.includes('tanah')) {
    return METODE_PENGAMBILAN_OPTIONS.tanah;
  }
  if (lower.includes('udara')) {
    return METODE_PENGAMBILAN_OPTIONS.udara;
  }
  if (lower.includes('makanan') || lower.includes('minuman')) {
    return METODE_PENGAMBILAN_OPTIONS.makanan_minuman;
  }
  if (lower.includes('swab') || lower.includes('usap')) {
    return METODE_PENGAMBILAN_OPTIONS.swab;
  }
  return METODE_PENGAMBILAN_OPTIONS.default;
}

function MultipleChipSelector({
  options,
  selectedValues,
  onChange,
}: {
  options: string[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <View style={chipStyles.container}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              chipStyles.chip,
              isSelected && chipStyles.chipSelected,
            ]}
            onPress={() => toggleOption(opt)}
            activeOpacity={0.7}
          >
            {isSelected && (
              <MaterialCommunityIcons
                name="check"
                size={14}
                color={Colors.onPrimary}
                style={chipStyles.icon}
              />
            )}
            <Text
              style={[
                chipStyles.text,
                isSelected && chipStyles.textSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
  },
  textSelected: {
    color: Colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────


const TOTAL_STEPS = 4;

export default function SamplingFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jadwalId: string;
    namaPemohon: string;
    jenisSampel: string;
    lokasi: string;
    namaInstansi?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const jadwalId = params.jadwalId ?? '';
  const namaPemohon = params.namaPemohon ?? 'Tidak diketahui';
  const jenisSampel = params.jenisSampel ?? 'Air Bersih';
  const lokasiDefault = params.lokasi ?? '';
  const namaInstansi = params.namaInstansi ?? '';

  // ── Step ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── Step 1: Location ──────────────────────────────────────────────
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lokasiPengambilan, setLokasiPengambilan] = useState(lokasiDefault);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const adminMarkers = React.useMemo(() => {
    const list = [];
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude);
      const lng = parseFloat(params.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        list.push({
          id: 'admin-target',
          latitude: lat,
          longitude: lng,
          title: 'Target Lokasi (Admin)',
          description: lokasiDefault,
          color: '#DC2626',
        });
      }
    }
    return list;
  }, [params.latitude, params.longitude, lokasiDefault]);

  // ── Step 2: Parameters & Conditions ───────────────────────────────
  const [suhu, setSuhu] = useState('');
  const [kondisiLingkungan, setKondisiLingkungan] = useState('');
  const [cuaca, setCuaca] = useState<Cuaca>('cerah');
  const [kondisiSample, setKondisiSample] = useState<KondisiSample>('baik');
  
  const sampleConfig = getSampleTypeConfig(jenisSampel);
  const [jumlahSample, setJumlahSample] = useState(sampleConfig.defaultJumlah);
  const [jumlahSampleUnit, setJumlahSampleUnit] = useState(sampleConfig.defaultUnit);
  const [jumlahSampleDetail, setJumlahSampleDetail] = useState('');

  // ── Step 3: Documentation ─────────────────────────────────────────
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [catatan, setCatatan] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    uploaded: number;
    total: number;
  } | null>(null);

  // ── Step 4: Chain of Custody ──────────────────────────────────────
  const [kodeSample, setKodeSample] = useState('');
  const [metodePengambilan, setMetodePengambilan] = useState('');
  const [selectedMetode, setSelectedMetode] = useState<string[]>([]);
  const [customMetode, setCustomMetode] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // ── Network/sync ──────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { incrementPending } = useSyncStore();
  const syncMutation = useSyncSampling();

  // ─────────────────────────────────────────────────────────────────
  // GPS auto-fetch on mount
  // ─────────────────────────────────────────────────────────────────
  const fetchGps = useCallback(async () => {
    setIsGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin GPS Ditolak',
          'Aktifkan izin lokasi untuk mendapatkan koordinat GPS.',
        );
        setIsGpsLoading(false);
        return;
      }
      
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        loc = await Location.getLastKnownPositionAsync();
      }
      
      if (loc) {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setAccuracy(loc.coords.accuracy);
      } else {
        throw new Error("Lokasi tidak tersedia");
      }
    } catch {
      Alert.alert('GPS Error', 'Gagal mendapatkan lokasi. Coba lagi.');
    }
    setIsGpsLoading(false);
  }, []);

  useEffect(() => {
    fetchGps();
  }, [fetchGps]);

  const openGoogleMaps = useCallback(() => {
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude);
      const lng = parseFloat(params.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url).catch((err) => {
          Alert.alert('Error', 'Gagal membuka Google Maps.');
        });
        return;
      }
    }
    Alert.alert('Info', 'Admin belum menetapkan koordinat target untuk lokasi sampling ini.');
  }, [params.latitude, params.longitude]);

  // Auto-generate unique sample code on mount
  useEffect(() => {
    if (!kodeSample) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      setKodeSample(`SPL-${dateStr}-${randomDigits}`);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Camera / Image picker
  // ─────────────────────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Maksimal 5 Foto', 'Hapus foto terlebih dahulu untuk menambah yang baru.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Kamera', 'Aktifkan izin kamera untuk mengambil foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        {
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        },
      ]);
    }
  };

  const handlePickFromGallery = async () => {
    if (photos.length >= 5) {
      Alert.alert('Maksimal 5 Foto', 'Hapus foto terlebih dahulu.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Galeri', 'Aktifkan izin galeri untuk memilih foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map((a: ImagePicker.ImagePickerAsset) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
        fileName: a.fileName ?? `photo_${Date.now()}.jpg`,
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────────────────────────────
  // Validation per step
  // ─────────────────────────────────────────────────────────────────
  const canGoNext = (() => {
    if (currentStep === 1) return !!lokasiPengambilan.trim();
    if (currentStep === 2) return true; // all optional
    if (currentStep === 3) return true; // photos optional but recommended
    if (currentStep === 4) return confirmed;
    return false;
  })();

  // ─────────────────────────────────────────────────────────────────
  // Build payload
  // ─────────────────────────────────────────────────────────────────
  const buildSamplingData = () => {
    const syncId = uuidv4();
    const parsedJumlah = parseFloat(jumlahSample) || parseFloat(sampleConfig.defaultJumlah) || 1;

    // Build field params to store in JSON catatan
    const fieldParams: Record<string, string | number | null> = {
      kode_sample: kodeSample || null,
      catatan_petugas: catatan || null,
      jumlah_sample: parsedJumlah,
      jumlah_sample_unit: jumlahSampleUnit,
      jumlah_sample_detail: jumlahSampleDetail || null,
      kondisi_lingkungan: kondisiLingkungan || null,
    };

    return {
      sync_id: syncId,
      jadwal_sampling_id: jadwalId,
      jenis_sample: jenisSampel,
      kondisi_sample: kondisiSample,
      metode_pengambilan: metodePengambilan || undefined,
      suhu: suhu || undefined,
      cuaca: cuaca,
      latitude: coords?.lat ?? 0,
      longitude: coords?.lng ?? 0,
      lokasi_pengambilan: lokasiPengambilan,
      waktu_pengambilan: new Date().toISOString(),
      catatan: JSON.stringify(fieldParams),
      jumlah_sample: parsedJumlah,
      jumlah_sample_unit: jumlahSampleUnit,
      jumlah_sample_detail: jumlahSampleDetail || undefined,
    };
  };

  // ─────────────────────────────────────────────────────────────────
  // Save offline
  // ─────────────────────────────────────────────────────────────────
  const handleSaveOffline = async () => {
    if (!lokasiPengambilan.trim()) {
      Alert.alert('Error', 'Lokasi pengambilan wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = buildSamplingData();
      const draftId = await insertDraftSampling({
        jadwal_sampling_id: data.jadwal_sampling_id,
        jenis_sample: data.jenis_sample,
        kondisi_sample: data.kondisi_sample,
        metode_pengambilan: data.metode_pengambilan,
        suhu: data.suhu ?? '',
        cuaca: data.cuaca,
        latitude: data.latitude,
        longitude: data.longitude,
        lokasi_pengambilan: data.lokasi_pengambilan,
        waktu_pengambilan: data.waktu_pengambilan,
        catatan: data.catatan,
        foto_count: photos.length,
      });

      // Save photo refs
      for (const photo of photos) {
        await insertOfflineFile(draftId, photo.uri, photo.mimeType ?? 'image/jpeg');
      }

      incrementPending();
      Alert.alert(
        'Tersimpan Offline',
        `Data sampling beserta ${photos.length} foto tersimpan dan akan dikirim saat online.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Gagal menyimpan data offline.');
    }
    setIsSubmitting(false);
  };

  // ─────────────────────────────────────────────────────────────────
  // Sync now
  // ─────────────────────────────────────────────────────────────────
  const handleSyncNow = async () => {
    if (!lokasiPengambilan.trim()) {
      Alert.alert('Error', 'Lokasi pengambilan wajib diisi.');
      return;
    }
    if (!jadwalId) {
      Alert.alert('Error', 'ID jadwal tidak ditemukan. Kembali dan pilih jadwal terlebih dahulu.');
      return;
    }
    if (!isOnline) {
      Alert.alert('Offline', 'Tidak ada koneksi internet. Data akan disimpan offline.');
      handleSaveOffline();
      return;
    }

    setIsSubmitting(true);
    const data = buildSamplingData();

    syncMutation.mutate(
      { samples: [data] },
      {
        onSuccess: async (response) => {
          // Get sample_id from response for photo upload
          const sampleId = response.data.sample_ids?.[data.sync_id];

          // Upload photos if we have a sample_id
          if (sampleId && photos.length > 0) {
            setUploadProgress({ uploaded: 0, total: photos.length });
            await uploadPhotosSequentially({
              sampleId,
              photos,
              onProgress: (uploaded, total) => setUploadProgress({ uploaded, total }),
              onPhotoError: (index, error) => {
                console.warn(`Foto ${index + 1} gagal: ${error}`);
              },
            });
            setUploadProgress(null);
          }

          setIsSubmitting(false);
          Alert.alert(
            'Berhasil! ✅',
            `Data sampling berhasil dikirim${photos.length > 0 && sampleId ? ` beserta ${photos.length} foto.` : '.'}`,
            [{ text: 'OK', onPress: () => router.back() }],
          );
        },
        onError: (error: any) => {
          setIsSubmitting(false);
          const msg =
            error?.response?.data?.message ?? 'Gagal mengirim data. Disimpan offline.';
          Alert.alert('Gagal Kirim', msg, [
            { text: 'Simpan Offline', onPress: handleSaveOffline },
            { text: 'Batal', style: 'cancel' },
          ]);
        },
      },
    );
  };

  // Map is now rendered inline via LocationMapView component

  // ─────────────────────────────────────────────────────────────────
  // Render steps
  // ─────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <Animated.View entering={FadeInRight.duration(350)} style={{ gap: 16 }}>
      {/* Jadwal Info Banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" size={16} color={Colors.statusInfo} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.infoBannerTitle}>{namaPemohon}</Text>
          {namaInstansi ? <Text style={styles.infoBannerSub}>{namaInstansi}</Text> : null}
          <Text style={styles.infoBannerSub}>Jenis: {jenisSampel}</Text>
        </View>
      </View>

      <SectionCard
        icon="crosshairs-gps"
        title="Koordinat GPS"
        badge={<AccuracyBadge accuracy={accuracy} />}
      >
        {/* GPS Coordinates */}
        <View style={styles.coordsBox}>
          {isGpsLoading ? (
            <View style={styles.gpsLoadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.gpsLoadingText}>Mendapatkan lokasi GPS...</Text>
            </View>
          ) : coords ? (
            <View style={styles.coordsRow}>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>{coords.lat.toFixed(6)}°</Text>
              </View>
              <View style={styles.coordDivider} />
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>{coords.lng.toFixed(6)}°</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noGpsText}>Koordinat belum tersedia</Text>
          )}

          <View style={styles.gpsActionsRow}>
            <TouchableOpacity style={styles.refreshGpsBtn} onPress={fetchGps} disabled={isGpsLoading}>
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={isGpsLoading ? Colors.gray400 : Colors.primary}
              />
              <Text style={[styles.refreshGpsText, isGpsLoading && { color: Colors.gray400 }]}>
                Perbarui GPS
              </Text>
            </TouchableOpacity>

            <View style={styles.btnDivider} />

            <TouchableOpacity
              style={styles.googleMapsBtn}
              onPress={openGoogleMaps}
              disabled={!(params.latitude && params.longitude)}
            >
              <MaterialCommunityIcons
                name="google-maps"
                size={16}
                color={(params.latitude && params.longitude) ? Colors.primary : Colors.gray400}
              />
              <Text style={[styles.googleMapsText, !(params.latitude && params.longitude) && { color: Colors.gray400 }]}>
                Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interactive Map Preview */}
        <LocationMapView
          latitude={coords?.lat ?? null}
          longitude={coords?.lng ?? null}
          onChange={(lat, lng) => {
            setCoords({ lat, lng });
            setAccuracy(null); // Manual pick, no GPS accuracy
          }}
          height={180}
          showsUserLocation
          markers={adminMarkers}
        />
      </SectionCard>

      <SectionCard icon="map-marker-outline" title="Lokasi Pengambilan">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Nama/Keterangan Lokasi <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Outlet IPAL 1, Sumur Bor A, ..."
            placeholderTextColor={Colors.gray400}
            value={lokasiPengambilan}
            onChangeText={setLokasiPengambilan}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Alamat / Nama Klien</Text>
          <View style={styles.readOnlyField}>
            <MaterialCommunityIcons name="account-outline" size={16} color={Colors.outline} />
            <Text style={styles.readOnlyText}>{namaPemohon}</Text>
          </View>
        </View>
      </SectionCard>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInRight.duration(350)} style={{ gap: 16 }}>
      <SectionCard icon="weather-partly-cloudy" title="Kondisi Lapangan">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cuaca</Text>
          <OptionButton
            options={[
              { label: 'Cerah', value: 'cerah' as Cuaca, icon: 'weather-sunny' },
              { label: 'Berawan', value: 'berawan' as Cuaca, icon: 'weather-cloudy' },
              { label: 'Mendung', value: 'mendung' as Cuaca, icon: 'weather-cloudy' },
              { label: 'Hujan', value: 'hujan' as Cuaca, icon: 'weather-rainy' },
            ]}
            value={cuaca}
            onChange={setCuaca}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Suhu Lapangan (°C)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 28.5"
            placeholderTextColor={Colors.gray400}
            value={suhu}
            onChangeText={setSuhu}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Kondisi Lingkungan</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Bersih, berdebu, dekat saluran pembuangan, dll."
            placeholderTextColor={Colors.gray400}
            value={kondisiLingkungan}
            onChangeText={setKondisiLingkungan}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Kondisi Sampel/Wadah</Text>
          <OptionButton
            options={[
              { label: 'Baik', value: 'baik' as KondisiSample, icon: 'check-circle-outline' },
              { label: 'Rusak', value: 'rusak' as KondisiSample, icon: 'alert-outline' },
              { label: 'Tidak Sesuai', value: 'tidak_sesuai' as KondisiSample, icon: 'close-circle-outline' },
            ]}
            value={kondisiSample}
            onChange={setKondisiSample}
            colorMap={{
              baik: Colors.statusSuccess,
              rusak: Colors.statusWarning,
              tidak_sesuai: Colors.statusDanger,
            }}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Volume / Jumlah Sampel</Text>
          <View style={styles.jumlahInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={jumlahSample}
              onChangeText={setJumlahSample}
              keyboardType="decimal-pad"
              placeholder={sampleConfig.defaultJumlah}
              placeholderTextColor={Colors.gray400}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Satuan Volume</Text>
          <OptionButton
            options={sampleConfig.units.map((u) => ({ label: u, value: u }))}
            value={jumlahSampleUnit}
            onChange={setJumlahSampleUnit}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Keterangan Sampel</Text>
          <TextInput
            style={styles.input}
            placeholder={sampleConfig.placeholderDetail}
            placeholderTextColor={Colors.gray400}
            value={jumlahSampleDetail}
            onChangeText={setJumlahSampleDetail}
          />
        </View>
      </SectionCard>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInRight.duration(350)} style={{ gap: 16 }}>
      <SectionCard
        icon="camera"
        title="Dokumentasi Foto"
        badge={
          <Text style={styles.photoBadgeText}>
            {photos.length}/5
          </Text>
        }
      >
        {/* Action buttons */}
        <View style={styles.photoActions}>
          <TouchableOpacity
            style={[styles.photoActionBtn, styles.photoActionPrimary]}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="camera-plus" size={20} color={Colors.onPrimary} />
            <Text style={styles.photoActionPrimaryText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.photoActionBtn, styles.photoActionSecondary]}
            onPress={handlePickFromGallery}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="image-multiple" size={20} color={Colors.primary} />
            <Text style={styles.photoActionSecondaryText}>Galeri</Text>
          </TouchableOpacity>
        </View>

        {/* Photo grid */}
        {photos.length > 0 ? (
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoThumb}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumbImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => handleDeletePhoto(index)}
                >
                  <MaterialCommunityIcons name="close" size={11} color={Colors.onPrimary} />
                </TouchableOpacity>
                <View style={styles.photoIndexBadge}>
                  <Text style={styles.photoIndexText}>{index + 1}</Text>
                </View>
              </View>
            ))}
            {/* Empty slots */}
            {Array(Math.max(0, 3 - photos.length)).fill(null).map((_, i) => (
              <View key={`empty-${i}`} style={styles.photoThumbEmpty}>
                <MaterialCommunityIcons name="image-plus" size={22} color={Colors.outlineVariant} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.photoEmptyState}>
            <MaterialCommunityIcons name="camera-outline" size={40} color={Colors.outlineVariant} />
            <Text style={styles.photoEmptyTitle}>Belum ada foto</Text>
            <Text style={styles.photoEmptySubtitle}>
              Tambahkan foto lokasi, kondisi sampel, dan lingkungan sekitar
            </Text>
          </View>
        )}

        {/* Photo upload progress */}
        {uploadProgress && (
          <View style={styles.uploadProgress}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadProgressText}>
              Upload foto {uploadProgress.uploaded}/{uploadProgress.total}...
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard icon="note-text-outline" title="Catatan Petugas">
        <TextInput
          style={styles.textArea}
          placeholder="Catatan kondisi lokasi, anomali, atau informasi tambahan..."
          placeholderTextColor={Colors.gray400}
          value={catatan}
          onChangeText={setCatatan}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </SectionCard>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View entering={FadeInRight.duration(350)} style={{ gap: 16 }}>
      <SectionCard icon="file-document-outline" title="Informasi Sampel">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Nama Klien / Pemohon</Text>
          <View style={styles.readOnlyField}>
            <MaterialCommunityIcons name="account-tie" size={16} color={Colors.outline} />
            <Text style={styles.readOnlyText}>{namaPemohon}</Text>
          </View>
        </View>

        {namaInstansi ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Instansi</Text>
            <View style={styles.readOnlyField}>
              <MaterialCommunityIcons name="office-building" size={16} color={Colors.outline} />
              <Text style={styles.readOnlyText}>{namaInstansi}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Jenis Sampel</Text>
          <View style={styles.readOnlyField}>
            <MaterialCommunityIcons name="flask" size={16} color={Colors.outline} />
            <Text style={styles.readOnlyText}>{jenisSampel}</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Waktu Pengambilan</Text>
          <View style={styles.readOnlyField}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.outline} />
            <Text style={styles.readOnlyText}>
              {new Date().toLocaleString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard icon="barcode" title="Identifikasi Sampel">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Kode / ID Sampel</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: ARL-2026-001 atau scan barcode"
            placeholderTextColor={Colors.gray400}
            value={kodeSample}
            onChangeText={setKodeSample}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Metode Pengambilan</Text>
          <MultipleChipSelector
            options={getMetodeOptions(jenisSampel)}
            selectedValues={selectedMetode}
            onChange={(newVal) => {
              setSelectedMetode(newVal);
              const customPart = customMetode.trim();
              if (customPart) {
                setMetodePengambilan([...newVal, customPart].join(', '));
              } else {
                setMetodePengambilan(newVal.join(', '));
              }
            }}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Metode Lainnya (Opsional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ketik metode lainnya jika tidak ada di pilihan..."
            placeholderTextColor={Colors.gray400}
            value={customMetode}
            onChangeText={(txt) => {
              setCustomMetode(txt);
              const chipsPart = selectedMetode;
              if (txt.trim()) {
                setMetodePengambilan([...chipsPart, txt.trim()].join(', '));
              } else {
                setMetodePengambilan(chipsPart.join(', '));
              }
            }}
          />
        </View>
      </SectionCard>

      <SectionCard icon="handshake" title="Konfirmasi Serah Terima">
        {/* Summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel} numberOfLines={2}>{lokasiPengambilan || '—'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="camera" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel}>{photos.length} foto</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="crosshairs-gps" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel}>
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'GPS tidak tersedia'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="thermometer" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel}>
              Suhu: {suhu ? `${suhu}°C` : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="leaf" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Lingk: {kondisiLingkungan || '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="package-variant-closed" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel}>{kondisiSample.replace('_', ' ')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="scale" size={16} color={Colors.primary} />
            <Text style={styles.summaryLabel}>
              Volume: {jumlahSample} {jumlahSampleUnit} {jumlahSampleDetail ? `(${jumlahSampleDetail})` : ''}
            </Text>
          </View>
        </View>

        {/* Confirm checkbox */}
        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setConfirmed((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxActive]}>
            {confirmed && (
              <MaterialCommunityIcons name="check" size={14} color={Colors.onPrimary} />
            )}
          </View>
          <Text style={styles.confirmText}>
            Saya menyatakan bahwa data dan sampel yang diambil telah sesuai dengan SOP laboratorium
            dan siap dikirim ke laboratorium.
          </Text>
        </TouchableOpacity>

        {/* Offline save button */}
        <TouchableOpacity
          style={[styles.saveOfflineBtn, isSubmitting && { opacity: 0.5 }]}
          onPress={handleSaveOffline}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="content-save-outline" size={18} color={Colors.primary} />
          <Text style={styles.saveOfflineText}>Simpan Draft Offline</Text>
        </TouchableOpacity>
      </SectionCard>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner />

      <ScreenHeader
        title="Input Data Sampling"
        rightElement={
          <View style={styles.jadwalBadge}>
            <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.primary} />
            <Text style={styles.jadwalBadgeText} numberOfLines={1}>
              {jenisSampel}
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <SamplingStepper currentStep={currentStep} />
          </Animated.View>

          {/* Step Content */}
          {renderCurrentStep()}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom navigator */}
      <StepNavigator
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={() => setCurrentStep((s) => Math.max(1, s - 1))}
        onNext={() => setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))}
        onSubmit={handleSyncNow}
        isSubmitting={isSubmitting}
        canGoNext={canGoNext}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
  scrollView: { flex: 1, backgroundColor: Colors.creamBg },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // ── Info banner ──
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.12)',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  infoBannerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },

  // ── GPS ──
  coordsBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 10,
  },
  gpsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  gpsLoadingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordItem: { flex: 1, alignItems: 'center', gap: 2 },
  coordDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.outlineVariant,
    marginHorizontal: 12,
  },
  coordLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
  },
  noGpsText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 4,
  },
  gpsActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingTop: 8,
    marginTop: 4,
  },
  refreshGpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  refreshGpsText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  btnDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.outlineVariant,
  },
  googleMapsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  googleMapsText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },

  // Map styles are now in LocationMapView component

  // ── Fields ──
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.onSurface },
  required: { color: Colors.statusDanger },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
  },
  readOnlyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurface,
    flex: 1,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurface,
  },
  textArea: {
    minHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurface,
  },
  divider: { height: 1, backgroundColor: Colors.surfaceVariant },
  optionalBadge: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  paramCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,106,68,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  paramCountText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },

  // ── Photos ──
  photoBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoActionPrimary: {
    backgroundColor: Colors.primary,
  },
  photoActionPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
  photoActionSecondary: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  photoActionSecondaryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImage: { width: '100%', height: '100%' },
  photoDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.statusDanger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndexText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  photoThumbEmpty: {
    width: 100,
    height: 100,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  photoEmptyState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  photoEmptyTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  photoEmptySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,106,68,0.06)',
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
  },
  uploadProgressText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },

  // ── Chain of custody ──
  jadwalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,106,68,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    maxWidth: 140,
  },
  jadwalBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  summaryGrid: {
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
    flex: 1,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(0,106,68,0.05)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,106,68,0.12)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurface,
    flex: 1,
    lineHeight: 20,
  },
  saveOfflineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  saveOfflineText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  jumlahInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jumlahUnitPill: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: Radius.lg,
    justifyContent: 'center',
  },
  jumlahUnitText: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
