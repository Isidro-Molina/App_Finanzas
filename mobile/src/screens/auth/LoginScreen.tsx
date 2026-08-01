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
import { Wallet, LogIn, UserPlus } from 'lucide-react-native';

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
      className="flex-1 bg-surface-900 justify-center"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="px-6 py-12"
      >
        {/* Brand / Logo Area */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-3xl bg-brand-500/20 border border-brand-500/30 items-center justify-center mb-4">
            <Wallet size={40} color="#38bdf8" />
          </View>
          <Text className="text-3xl font-bold text-slate-100 tracking-tight text-center">
            Finanzas & Split
          </Text>
          <Text className="text-sm text-slate-400 text-center mt-1">
            {isRegisterMode
              ? 'Crea tu cuenta para comenzar'
              : 'Ingresa para gestionar tus gastos y grupos'}
          </Text>
        </View>

        {/* Form Card */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-6 shadow-xl">
          {errorMsg ? (
            <View className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-4">
              <Text className="text-rose-400 text-sm text-center font-medium">
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {isRegisterMode && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nombre Completo
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor="#94a3b8"
                style={{ color: '#f8fafc', backgroundColor: '#0f172a' }}
                className="border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-medium"
                autoCapitalize="words"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#94a3b8"
              style={{ color: '#f8fafc', backgroundColor: '#0f172a' }}
              className="border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-medium"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Contraseña
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              style={{ color: '#f8fafc', backgroundColor: '#0f172a' }}
              className="border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-medium"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            className="bg-brand-500 py-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-brand-500/30"
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <>
                {isRegisterMode ? (
                  <UserPlus size={20} color="#0f172a" className="mr-2" />
                ) : (
                  <LogIn size={20} color="#0f172a" className="mr-2" />
                )}
                <Text className="text-slate-950 font-bold text-base ml-2">
                  {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle Mode */}
        <View className="flex-row justify-center items-center mt-8">
          <Text className="text-slate-400 text-sm">
            {isRegisterMode ? '¿Ya tenés una cuenta?' : '¿No tenés cuenta?'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setErrorMsg('');
              setIsRegisterMode(!isRegisterMode);
            }}
            className="ml-2 py-1 px-2"
          >
            <Text className="text-brand-500 font-semibold text-sm">
              {isRegisterMode ? 'Iniciá Sesión' : 'Registrate gratis'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
