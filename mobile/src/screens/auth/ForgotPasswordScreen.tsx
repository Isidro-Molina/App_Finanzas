import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg('Ingresá tu email');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: trimmed });
      navigation.navigate('ResetPassword', { email: trimmed });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo enviar el código. Verificá tu conexión.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          <ArrowLeft size={20} color={colors.textMuted} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textMuted }}>Volver</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <KeyRound size={28} color="#fff" />
          </LinearGradient>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 26, color: colors.textPrimary, marginBottom: 8 }}>¿Olvidaste tu contraseña?</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Ingresá tu email y te enviaremos un código de 6 dígitos para crear una nueva.
          </Text>
        </View>

        {!!errorMsg && (
          <View style={{ backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E11D48', textAlign: 'center' }}>{errorMsg}</Text>
          </View>
        )}

        <View style={{ gap: 14 }}>
          <View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ width: '100%', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgInput, fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.textPrimary }}
            />
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8} style={{ marginTop: 8, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>Enviar código</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() })} style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.brand }}>Ya tengo un código</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
