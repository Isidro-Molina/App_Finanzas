import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';

export const ResetPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email.trim() || code.length !== 6 || !newPassword || !confirmPassword) {
      setErrorMsg('Completá todos los campos (el código tiene 6 dígitos)');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code,
        newPassword,
      });
      Alert.alert('¡Listo!', 'Tu contraseña fue actualizada. Ya podés iniciar sesión.', [
        { text: 'Ir al login', onPress: () => navigation.popToTop() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo restablecer la contraseña. Verificá tu conexión.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          <ArrowLeft size={20} color={colors.textMuted} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textMuted }}>Volver</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ShieldCheck size={28} color="#fff" />
          </LinearGradient>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 26, color: colors.textPrimary, marginBottom: 8 }}>Nueva contraseña</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Ingresá el código que te enviamos por email y elegí tu nueva contraseña.
          </Text>
        </View>

        {!!errorMsg && (
          <View style={{ backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E11D48', textAlign: 'center' }}>{errorMsg}</Text>
          </View>
        )}

        <View style={{ gap: 14 }}>
          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="tu@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={inputStyle} />
          </View>
          <View>
            <Text style={labelStyle}>Código de 6 dígitos</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'Outfit_700Bold' }}
            />
          </View>
          <View>
            <Text style={labelStyle}>Nueva contraseña</Text>
            <View>
              <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} autoCapitalize="none" style={{ ...inputStyle, paddingRight: 52 }} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
                {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>
          <View>
            <Text style={labelStyle}>Confirmar contraseña</Text>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repetí la contraseña" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} autoCapitalize="none" style={inputStyle} />
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8} style={{ marginTop: 8, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>Restablecer contraseña</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
