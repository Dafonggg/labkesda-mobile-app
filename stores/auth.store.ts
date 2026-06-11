import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ApiUser } from '@/services/auth.service';

// Role codes matching the backend
export type RoleCode =
  | 'admin'
  | 'petugas_lab'
  | 'qc'
  | 'analis'
  | 'kepala_uptd'
  | 'petugas_lapangan';

export const ROLE_DISPLAY_NAMES: Record<RoleCode, string> = {
  admin: 'Admin',
  petugas_lab: 'Petugas Lab',
  qc: 'Quality Control',
  analis: 'Analis',
  kepala_uptd: 'Kepala UPTD',
  petugas_lapangan: 'Petugas Lapangan',
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nip: string | null;
  role: RoleCode;
  roleName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  subRole?: 'ketua' | 'anggota' | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionChecked: boolean;

  /** Save full auth session to store + Secure Store */
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => Promise<void>;
  /** Load saved session from Secure Store (called on app startup) */
  loadSession: () => Promise<boolean>;
  /** Clear session entirely */
  logout: () => Promise<void>;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
}

/**
 * Map backend API user shape → store User shape.
 */
export const mapApiUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  phone: apiUser.phone,
  nip: apiUser.nip,
  role: apiUser.role as RoleCode,
  roleName: apiUser.role_name || ROLE_DISPLAY_NAMES[apiUser.role as RoleCode] || apiUser.role,
  isActive: apiUser.is_active,
  lastLoginAt: apiUser.last_login_at,
  subRole: apiUser.sub_role,
});

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isSessionChecked: false,

  setAuth: async (user, token, refreshToken) => {
    // Persist to Secure Store
    await SecureStore.setItemAsync('labkesda_token', token);
    await SecureStore.setItemAsync('labkesda_refresh_token', refreshToken);
    await SecureStore.setItemAsync('labkesda_user', JSON.stringify(user));

    set({
      user,
      token,
      refreshToken,
      isAuthenticated: true,
      isSessionChecked: true,
    });
  },

  setUser: (user) => {
    set({ user });
    // Also update Secure Store in background
    SecureStore.setItemAsync('labkesda_user', JSON.stringify(user)).catch(() => {});
  },

  setToken: async (token) => {
    await SecureStore.setItemAsync('labkesda_token', token);
    set({ token });
  },

  loadSession: async () => {
    try {
      const [token, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync('labkesda_token'),
        SecureStore.getItemAsync('labkesda_refresh_token'),
        SecureStore.getItemAsync('labkesda_user'),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isSessionChecked: true,
        });
        return true;
      }
    } catch {
      // Failed to load — treat as no session
    }

    set({ isSessionChecked: true });
    return false;
  },

  logout: async () => {
    // Clear Secure Store
    await Promise.all([
      SecureStore.deleteItemAsync('labkesda_token'),
      SecureStore.deleteItemAsync('labkesda_refresh_token'),
      SecureStore.deleteItemAsync('labkesda_user'),
    ]).catch(() => {});

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

export const getRoleDisplayName = (code: RoleCode | string): string =>
  ROLE_DISPLAY_NAMES[code as RoleCode] || code;
