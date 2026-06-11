import { apiClient } from './axios';

export interface DashboardSummary {
  total_permohonan: number;
  total_sampel_masuk: number;
  total_pengujian: number;
  total_laporan: number;
  permohonan_pending: number;
  pengujian_aktif: number;
  qc_pending: number;
  approval_pending: number;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardSummary;
}

/**
 * Get dashboard summary stats.
 * Endpoint: GET /dashboard/summary
 */
export const getDashboardSummary = async (): Promise<DashboardResponse> => {
  const response = await apiClient.get('/dashboard/summary');
  return response.data;
};
