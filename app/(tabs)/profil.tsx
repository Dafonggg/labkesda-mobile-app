import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuthStore, getRoleDisplayName } from '@/stores/auth.store';
import { useLogout } from '@/hooks/useAuth';

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  return (
    <View style={styles.safeArea}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.topBarTitle}>Labkesda</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.profileCard}>
            <View style={styles.profileGradient} />

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={40} color={Colors.primary} />
              </View>
            </View>

            {/* Name + role */}
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color={Colors.primaryContainer}
              />
              <Text style={styles.roleBadgeText}>{user ? getRoleDisplayName(user.role) : 'Petugas Lapangan'}</Text>
            </View>

            {/* NIP + Email + Phone */}
            <View style={styles.profileDetails}>
              {user?.nip ? (
                <View style={styles.nipBadge}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={12} color={Colors.primary} />
                  <Text style={styles.nipText}>NIP: {user.nip}</Text>
                </View>
              ) : (
                <View style={styles.nipBadge}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={12} color={Colors.outline} />
                  <Text style={[styles.nipText, { color: Colors.outline }]}>NIP: Belum diisi</Text>
                </View>
              )}
              <Text style={styles.profileDetailText}>{user?.email || ''}</Text>
              {user?.phone ? (
                <Text style={styles.profileDetailText}>{user.phone}</Text>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* ── Logout ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: Platform.OS === 'android' ? 160 : 140 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  topBar: {
    minHeight: 52,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    fontSize: FontSize.headlineSm,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerLow,
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: 'rgba(11, 134, 88, 0.08)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileName: {
    fontSize: FontSize.headlineMd,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primaryContainer,
  },
  profileDetails: {
    alignItems: 'center',
    gap: 4,
  },
  nipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11, 134, 88, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 4,
  },
  nipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  profileDetailText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },

  // ── Logout ──
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.error,
  },
});
