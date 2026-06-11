import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const SEEN_JADWAL_KEY = 'labkesda_seen_jadwal_ids';

interface NotificationState {
  /** IDs of jadwal that have already been seen by the user */
  seenJadwalIds: string[];
  /** Number of new (unseen) jadwal */
  newJadwalCount: number;
  /** Whether the store has been hydrated from storage */
  hydrated: boolean;

  /** Load seen IDs from SecureStore */
  hydrate: () => Promise<void>;
  /** Calculate unseen count based on current jadwal list */
  calculateNewCount: (allJadwalIds: string[]) => void;
  /** Mark all current jadwal as seen (clear badge) */
  markAllSeen: (allJadwalIds: string[]) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  seenJadwalIds: [],
  newJadwalCount: 0,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(SEEN_JADWAL_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        set({ seenJadwalIds: ids, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  calculateNewCount: (allJadwalIds: string[]) => {
    const { seenJadwalIds, hydrated } = get();
    if (!hydrated) return;
    const newCount = allJadwalIds.filter((id) => !seenJadwalIds.includes(id)).length;
    set({ newJadwalCount: newCount });
  },

  markAllSeen: async (allJadwalIds: string[]) => {
    // Merge with existing, keep last 200 to prevent unbounded growth
    const { seenJadwalIds } = get();
    const merged = [...new Set([...seenJadwalIds, ...allJadwalIds])].slice(-200);
    set({ seenJadwalIds: merged, newJadwalCount: 0 });
    try {
      await SecureStore.setItemAsync(SEEN_JADWAL_KEY, JSON.stringify(merged));
    } catch {
      // silent fail
    }
  },
}));
