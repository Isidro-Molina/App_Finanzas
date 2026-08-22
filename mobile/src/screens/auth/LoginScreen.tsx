import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import apiClient from '../../api/client';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Replace these with your actual Google OAuth Client IDs from Google Cloud Console
// https://console.cloud.google.com/ → APIs & Services → Credentials
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export const LoginScreen = () => {
  const { login, register, loginWithToken, biometricEnabled, loginWithBiometric, isBiometricAvailable } = useAuth();
  const { colors } = useTheme();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBioButton, setShowBioButton] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  console.log('redirectUri:', redirectUri);

  useEffect(() => {
    checkBioAvailability();
  }, [biometricEnabled]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) handleGoogleToken(id_token);
    }
  }, [response]);

  async function checkBioAvailability() {
    if (!biometricEnabled) {
      setShowBioButton(false);
      return;
    }
    const available = await isBiometricAvailable();
    setShowBioButton(available && biometricEnabled);
  }

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.post('/auth/google', { idToken });
      const { accessToken, user: userData } = res.data;
      await loginWithToken(accessToken, userData);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al autenticar con Google.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password || (isRegisterMode && !name)) {
      setErrorMsg('Por favor completá todos los campos');
      return;
    }
    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar la solicitud. Verificá tus datos o conexión.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    try {
      const success = await loginWithBiometric();
      if (!success) setErrorMsg('Autenticación biométrica fallida. Usá tu contraseña.');
    } catch {
      setErrorMsg('Error en autenticación biométrica.');
    } finally {
      setBioLoading(false);
    }
  };

  const inputStyle = {
    width: '100%' as const,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  };

  const labelStyle = {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  };

  const googleEnabled = !!GOOGLE_WEB_CLIENT_ID;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 }}>
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 28, color: '#fff' }}>F</Text>
          </LinearGradient>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 32, color: colors.textPrimary, marginBottom: 6 }}>Finova</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>Tu dinero, organizado.</Text>
        </View>

        {/* Error */}
        {!!errorMsg && (
          <View style={{ backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E11D48', textAlign: 'center' }}>{errorMsg}</Text>
          </View>
        )}

        {/* Google Sign-In — show only in login mode and when configured */}
        {!isRegisterMode && googleEnabled && (
          <TouchableOpacity onPress={() => promptAsync()} disabled={!request || googleLoading} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, marginBottom: 16 }}>
            {googleLoading ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <>
                {/* Google "G" logo */}
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#EA4335' }}>G</Text>
                </View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary }}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Separator */}
        {!isRegisterMode && googleEnabled && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>o con email</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
        )}

        {/* Form */}
        <View style={{ gap: 14 }}>
          {isRegisterMode && (
            <View>
              <Text style={labelStyle}>Nombre Completo</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Ej: Ana Rodríguez" placeholderTextColor={colors.textMuted} style={inputStyle} autoCapitalize="words" />
            </View>
          )}
          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="tu@email.com" placeholderTextColor={colors.textMuted} style={inputStyle} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View>
            <Text style={labelStyle}>Contraseña</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.textMuted} style={inputStyle} secureTextEntry />
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8} style={{ marginTop: 8, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>{isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}</Text>}
          </TouchableOpacity>

          {/* Biometric */}
          {!isRegisterMode && showBioButton && (
            <TouchableOpacity onPress={handleBiometricLogin} disabled={bioLoading} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.brandLight, borderWidth: 1.5, borderColor: colors.brand, borderRadius: 14, paddingVertical: 14 }}>
              {bioLoading ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <>
                  <Fingerprint size={20} color={colors.brand} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.brand }}>Entrar con Face ID / Huella</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Mode switch */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>{isRegisterMode ? '¿Ya tenés una cuenta? ' : '¿No tenés cuenta? '}</Text>
            <TouchableOpacity
              onPress={() => {
                setErrorMsg('');
                setIsRegisterMode(!isRegisterMode);
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.brand }}>{isRegisterMode ? 'Iniciar Sesión' : 'Crear cuenta'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
