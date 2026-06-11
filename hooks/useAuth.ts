import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { loginApi, logoutApi, getMeApi } from '@/services/auth.service';
import { useAuthStore, mapApiUser } from '@/stores/auth.store';
import type { LoginPayload } from '@/services/auth.service';

/**
 * Login mutation — calls API, saves session, navigates to tabs.
 */
export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  return useMutation({
    mutationFn: ({ rememberMe, ...payload }: LoginPayload & { rememberMe?: boolean }) => loginApi(payload),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async (response) => {
      const user = mapApiUser(response.data.user);
      await setAuth(user, response.data.token, response.data.refresh_token);
      setLoading(false);
      router.replace('/(tabs)');
    },
    onError: () => {
      setLoading(false);
    },
  });
}

/**
 * Logout mutation — calls API, clears session, navigates to login.
 */
export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => logoutApi(),
    onSettled: async () => {
      // Always clear session, even if API call fails (e.g. already expired)
      await logout();
      router.replace('/login');
    },
  });
}

/**
 * Validate current session by calling /auth/me.
 */
export function useValidateSession() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: () => getMeApi(),
    onSuccess: (response) => {
      const user = mapApiUser(response.data);
      setUser(user);
    },
  });
}
