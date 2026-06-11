import { apiClient } from './axios';

export interface SyncSamplingItem {
  sync_id: string;
  jadwal_sampling_id: string;
  jenis_sample: string;
  kondisi_sample?: string;
  metode_pengambilan?: string;
  suhu?: string;
  cuaca?: string;
  latitude: number;
  longitude: number;
  lokasi_pengambilan: string;
  waktu_pengambilan: string;
  catatan?: string;
  jumlah_sample?: number;
  jumlah_sample_unit?: string;
  jumlah_sample_detail?: string;
}

export interface SyncSamplingPayload {
  samples: SyncSamplingItem[];
}

export interface SyncSamplingResponse {
  success: boolean;
  message: string;
  data: {
    synced: number;
    failed: number;
    errors?: Array<{ sync_id: string; message: string }>;
    sample_ids?: Record<string, string>; // sync_id => sample_id
  };
}

export interface UploadImageResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    path: string;
  };
}

/**
 * Sync sampling data from mobile to server (batch upload).
 * Endpoint: POST /mobile/sync-sampling
 */
export const syncSampling = async (
  payload: SyncSamplingPayload,
): Promise<SyncSamplingResponse> => {
  const response = await apiClient.post('/mobile/sync-sampling', payload);
  return response.data;
};

/**
 * Upload a sample image file.
 * Endpoint: POST /mobile/upload-sample-image
 */
export const uploadSampleImage = async (formData: FormData): Promise<UploadImageResponse> => {
  const response = await apiClient.post('/mobile/upload-sample-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // Longer timeout for file uploads
  });
  return response.data;
};
