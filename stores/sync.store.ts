import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

interface SyncState {
  pendingCount: number;
  lastSyncTime: string | null;
  syncStatus: SyncStatus;
  syncProgress: number;

  setPendingCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: (by?: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncProgress: (progress: number) => void;
  markSynced: () => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  pendingCount: 0,
  lastSyncTime: null,
  syncStatus: 'idle',
  syncProgress: 0,

  setPendingCount: (count) => set({ pendingCount: count }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: (by = 1) =>
    set((s) => ({ pendingCount: Math.max(0, s.pendingCount - by) })),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  markSynced: () =>
    set({
      syncStatus: 'success',
      lastSyncTime: new Date().toISOString(),
    }),
}));
