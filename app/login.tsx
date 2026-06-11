import React, { useState, useRef, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LogoFull } from '@/components/logo-labkesda';
import { Colors, Radius, Spacing, CardBg } from '@/constants/theme';
import { useLogin } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [usernameActive, setUsernameActive] = useState(false);
  const [passwordActive, setPasswordActive] = useState(false);
  const [showForgotAlert, setShowForgotAlert] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const loginMutation = useLogin();
  const isLoading = useAuthStore((s) => s.isLoading);

  // Button press animation
  const buttonScale = useSharedValue(1);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    const checkRememberedEmail = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('labkesda_remembered_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.warn('Failed to load remembered email:', err);
      }
    };
    checkRememberedEmail();
  }, []);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Silakan masukkan email dan password.');
      return;
    }

    buttonScale.value = withSequence(
      withTiming(0.97, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
    );

    loginMutation.mutate(
      { email: email.trim(), password, rememberMe },
      {
        onSuccess: async () => {
          try {
            if (rememberMe) {
              await SecureStore.setItemAsync('labkesda_remembered_email', email.trim());
            } else {
              await SecureStore.deleteItemAsync('labkesda_remembered_email');
            }
          } catch (err) {
            console.warn('Failed to update remembered email:', err);
          }
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            'Login gagal. Periksa email dan password Anda.';
          Alert.alert('Login Gagal', message);
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Decorative gradient orbs */}
      <View style={styles.orbTopLeft} pointerEvents="none" />
      <View style={styles.orbBottomRight} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Glass card */}
          <View style={styles.card}>
            {/* Header – Logo */}
            <View style={styles.header}>
              <View style={styles.logoCard}>
                <LogoFull width={200} />
              </View>
            </View>

            {/* Welcome text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeGreeting}>Selamat Datang di</Text>
              <Text style={styles.welcomeBrand}>SIA Labkesda</Text>
              <Text style={styles.welcomeTagline}>Sistem Informasi Analitik</Text>
              <Text style={styles.welcomeSubtitle}>Masukkan email dan password untuk melanjutkan</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <Pressable
                  style={[
                    styles.inputWrapper,
                    usernameActive && styles.inputWrapperActive,
                  ]}
                  onPress={() => emailRef.current?.focus()}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={usernameActive ? Colors.primary : Colors.gray400}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.textInput}
                    placeholder="Enter your email or NIP"
                    placeholderTextColor={Colors.gray400}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setUsernameActive(true)}
                    onBlur={() => setUsernameActive(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </Pressable>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <Pressable
                  style={[
                    styles.inputWrapper,
                    passwordActive && styles.inputWrapperActive,
                  ]}
                  onPress={() => passwordRef.current?.focus()}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={passwordActive ? Colors.primary : Colors.gray400}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.textInput, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.gray400}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordActive(true)}
                    onBlur={() => setPasswordActive(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    accessibilityLabel="Toggle password visibility"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.gray400}
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* Remember me + Forgot password */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.rememberMeRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />}
                  </View>
                  <Text style={styles.rememberMeText}>Simpan Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowForgotAlert(true)}>
                  <Text style={styles.forgotPassword}>Lupa Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <Animated.View style={buttonAnimStyle}>
                <TouchableOpacity
                  style={[styles.signInButton, isLoading && styles.signInButtonLoading]}
                  onPress={handleLogin}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  <Text style={styles.signInText}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Text>
                  {!isLoading && <Ionicons name="log-in-outline" size={20} color={Colors.onPrimary} />}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>AKSES AMAN</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.helpLink}>
                <Ionicons name="help-circle-outline" size={18} color={Colors.onSurfaceVariant} />
                <Text style={styles.helpText}>Butuh & Dukungan </Text>
              </TouchableOpacity>
              <Text style={styles.version}>SIA Labkesda v1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Alert Modal */}
      <Modal
        visible={showForgotAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotAlert(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowForgotAlert(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="lock-closed-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Lupa Kata Sandi?</Text>
            <Text style={styles.modalDescription}>
              Untuk menjaga keamanan akun Anda, pemulihan atau reset kata sandi dilakukan secara terpusat. Silakan hubungi Administrator SIA Labkesda.
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowForgotAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Saya Mengerti</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  flex: {
    flex: 1,
  },
  // Decorative orbs
  orbTopLeft: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '60%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(144, 247, 192, 0.3)',
  } as any,
  orbBottomRight: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '60%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(239, 226, 191, 0.3)',
  } as any,
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  // Glass card
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: CardBg.glass82,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: Spacing.lg,
    gap: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  // Header
  header: {
    alignItems: 'center',
    gap: 6,
  },
  logoCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: 'rgba(209, 213, 219, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  appTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(0, 106, 68, 0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    gap: 2,
  },
  welcomeGreeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  welcomeBrand: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  welcomeTagline: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.outlineVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  // Form
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  inputWrapperActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurface,
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  // Form actions row
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberMeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  forgotPassword: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  // Sign In button
  signInButton: {
    marginTop: 8,
    height: 54,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  signInButtonLoading: {
    backgroundColor: Colors.primaryContainer,
    shadowOpacity: 0.1,
  },
  signInText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(209, 213, 219, 0.6)',
  },
  dividerText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gray400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Footer
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  version: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.gray400,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.creamBg,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 106, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 68, 0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButton: {
    width: '100%',
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
});
