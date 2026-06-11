import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/services/dashboard.service';

/**
 * Fetch dashboard summary statistics.
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
