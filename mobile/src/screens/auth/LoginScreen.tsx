import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

export const LoginScreen = () => {
  const { login, register } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password || (isRegisterMode && !name)) {
      setErrorMsg('Por favor completa todos los campos');
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
      const msg =
        err.response?.data?.message ||
        'Error al procesar la solicitud. Verifica tus datos o conexión.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand / Logo Area */}
        <View className="items-center mb-12">
          <LinearGradient
            colors={['#1D4ED8', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 28 }}>💳</Text>
          </LinearGradient>

          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 32, color: '#0F172A', marginBottom: 6 }}>
            Finova
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#64748B' }}>
            Tu dinero, organizado.
          </Text>
        </View>

        {errorMsg ? (
          <View className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
            <Text className="text-rose-600 text-sm text-center font-medium">
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* Form */}
        <View className="flex-1" style={{ gap: 14 }}>
          {isRegisterMode && (
            <View>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Nombre Completo
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Ana Rodríguez"
                placeholderTextColor="#94a3b8"
                style={{
                  width: '100%',
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  backgroundColor: '#fff',
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                  color: '#0F172A',
                }}
                autoCapitalize="words"
              />
            </View>
          )}

          <View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#94a3b8"
              style={{
                width: '100%',
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                backgroundColor: '#fff',
                fontSize: 16,
                fontFamily: 'Inter_400Regular',
                color: '#0F172A',
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Contraseña
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              style={{
                width: '100%',
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                backgroundColor: '#fff',
                fontSize: 16,
                fontFamily: 'Inter_400Regular',
                color: '#0F172A',
              }}
              secureTextEntry
            />
          </View>

          {!isRegisterMode && (
            <TouchableOpacity style={{ alignItems: 'flex-end', marginTop: -4 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#2563EB' }}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              marginTop: 8,
              backgroundColor: '#2563EB',
              borderRadius: 14,
              paddingVertical: 17,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
                {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#64748B' }}>
              {isRegisterMode ? '¿Ya tenés una cuenta? ' : '¿No tenés cuenta? '}
            </Text>
            <TouchableOpacity onPress={() => { setErrorMsg(''); setIsRegisterMode(!isRegisterMode); }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#2563EB' }}>
                {isRegisterMode ? 'Iniciar Sesión' : 'Crear cuenta'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
