import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  connectionType: string | null;

  setOnline: (isOnline: boolean) => void;
  setConnectionType: (type: string | null) => void;
}

export const useNetworkStore = create<NetworkState>()((set) => ({
  isOnline: true, // Assume online initially
  connectionType: null,

  setOnline: (isOnline) => set({ isOnline }),
  setConnectionType: (type) => set({ connectionType: type }),
}));
