import React, { useEffect, useRef, useCallback } from 'react';
import * as Network from 'expo-network';
import { AppState, type AppStateStatus } from 'react-native';
import { useNetworkStore } from '@/stores/network.store';
import { useSyncStore } from '@/stores/sync.store';
import { executeSyncPipeline } from '@/database/sync/sync-manager';
import { getPendingDraftCount } from '@/database/repositories/draft.repository';

/**
 * Monitors network connectivity and triggers auto-sync when reconnecting.
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { setOnline, setConnectionType, isOnline } = useNetworkStore();
  const { setPendingCount, syncStatus } = useSyncStore();
  const wasOffline = useRef(false);

  // Check network status
  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setOnline(online);
      setConnectionType(state.type?.toString() ?? null);

      // Auto-sync when coming back online
      if (online && wasOffline.current && syncStatus === 'idle') {
        wasOffline.current = false;
        // Small delay to ensure connection is stable
        setTimeout(() => {
          executeSyncPipeline().catch(() => {});
        }, 2000);
      }

      if (!online) {
        wasOffline.current = true;
      }
    } catch {
      // Network check failed, assume offline
      setOnline(false);
    }
  }, [setOnline, setConnectionType, syncStatus]);

  // Check network on mount
  useEffect(() => {
    checkNetwork();

    // Refresh pending count on mount
    getPendingDraftCount()
      .then((count) => setPendingCount(count))
      .catch(() => {});
  }, []);

  // Re-check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkNetwork();
        }
      },
    );

    return () => subscription.remove();
  }, [checkNetwork]);

  // Poll network every 30 seconds (lightweight)
  useEffect(() => {
    const interval = setInterval(checkNetwork, 30000);
    return () => clearInterval(interval);
  }, [checkNetwork]);

  return <>{children}</>;
}
