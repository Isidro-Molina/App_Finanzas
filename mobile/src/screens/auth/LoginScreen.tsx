import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint } from 'lucide-react-native';

export const LoginScreen = () => {
  const { login, register, biometricEnabled, loginWithBiometric, isBiometricAvailable } = useAuth();
  const { colors } = useTheme();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBioButton, setShowBioButton] = useState(false);

  useEffect(() => {
    checkBioAvailability();
  }, [biometricEnabled]);

  async function checkBioAvailability() {
    if (!biometricEnabled) { setShowBioButton(false); return; }
    const available = await isBiometricAvailable();
    setShowBioButton(available && biometricEnabled);
  }

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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <LinearGradient
            colors={['#1D4ED8', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 }}
          >
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 28, color: '#fff' }}>F</Text>
          </LinearGradient>

          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 32, color: colors.textPrimary, marginBottom: 6 }}>
            Finova
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>
            Tu dinero, organizado.
          </Text>
        </View>

        {/* Error */}
        {!!errorMsg && (
          <View style={{ backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E11D48', textAlign: 'center' }}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={{ gap: 14 }}>
          {isRegisterMode && (
            <View>
              <Text style={labelStyle}>Nombre Completo</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Ana Rodríguez"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
                autoCapitalize="words"
              />
            </View>
          )}

          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={labelStyle}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
              secureTextEntry
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{ marginTop: 8, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
                  {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </Text>
            }
          </TouchableOpacity>

          {/* Biometric login button — only in login mode and if enrolled */}
          {!isRegisterMode && showBioButton && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={bioLoading}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.brandLight, borderWidth: 1.5, borderColor: colors.brand, borderRadius: 14, paddingVertical: 14 }}
            >
              {bioLoading
                ? <ActivityIndicator color={colors.brand} />
                : <>
                    <Fingerprint size={20} color={colors.brand} />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.brand }}>
                      Entrar con Face ID / Huella
                    </Text>
                  </>
              }
            </TouchableOpacity>
          )}

          {/* Mode switch */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>
              {isRegisterMode ? '¿Ya tenés una cuenta? ' : '¿No tenés cuenta? '}
            </Text>
            <TouchableOpacity onPress={() => { setErrorMsg(''); setIsRegisterMode(!isRegisterMode); }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.brand }}>
                {isRegisterMode ? 'Iniciar Sesión' : 'Crear cuenta'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
