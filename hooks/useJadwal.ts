import { useQuery } from '@tanstack/react-query';
import { getMyJadwal } from '@/services/jadwal.service';

/**
 * Fetch jadwal sampling for the current petugas lapangan.
 */
export function useMyJadwal() {
  return useQuery({
    queryKey: ['mobile', 'jadwal'],
    queryFn: getMyJadwal,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
