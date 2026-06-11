import { apiClient } from './axios';

export interface JadwalSamplingData {
  id: string;
  permohonan_id: string;
  petugas_lapangan_id: string;
  anggota_1_id?: string | null;
  anggota_2_id?: string | null;
  tanggal_sampling: string;
  jam_sampling?: string | null;
  lokasi: string;
  latitude?: number;
  longitude?: number;
  status: string;
  catatan: string | null;
  permohonan?: {
    id: string;
    nama_pemohon: string;
    nama_instansi?: string;
    instansi?: string;
    jenis_sample?: string;
    alamat?: string;
    [key: string]: unknown;
  };
  petugas_lapangan?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    [key: string]: unknown;
  } | null;
  petugas?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    [key: string]: unknown;
  } | null;
  anggota_1?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    [key: string]: unknown;
  } | null;
  anggota_2?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    [key: string]: unknown;
  } | null;
  samples?: Array<{
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    [key: string]: unknown;
  }>;
  created_at: string;
  updated_at: string;
}

export interface JadwalListResponse {
  success: boolean;
  message: string;
  data: JadwalSamplingData[];
}

/**
 * Fetch jadwal sampling for current petugas lapangan.
 * Endpoint: GET /mobile/jadwal
 */
export const getMyJadwal = async (): Promise<JadwalListResponse> => {
  const response = await apiClient.get('/mobile/jadwal');
  return response.data;
};
