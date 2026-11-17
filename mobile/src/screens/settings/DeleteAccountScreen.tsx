import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, AlertTriangle, ShieldAlert, Trash2, Lock } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { Spinner } from '../../components/Spinner';

interface DeletionBlocker {
  groupId: string;
  groupName: string;
  net: number;
  message: string;
}

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout, disableBiometric, biometricEnabled, isBiometricAvailable } = useAuth();
  const { colors, isDark } = useTheme();
  const { showAlert } = useDialog();

  const [checking, setChecking] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [blockers, setBlockers] = useState<DeletionBlocker[]>([]);

  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCheck = async () => {
      try {
        const res = await apiClient.get('/users/me/deletion-check');
        if (!active) return;
        setCanDelete(Boolean(res.data?.canDelete));
        setHasPassword(Boolean(res.data?.hasPassword));
        setBlockers(Array.isArray(res.data?.blockers) ? res.data.blockers : []);
      } catch (e: any) {
        if (!active) return;
        const msg = e.response?.data?.message || 'No se pudo verificar el estado de tu cuenta';
        await showAlert({ title: 'Error', message: Array.isArray(msg) ? msg[0] : msg });
      } finally {
        if (active) setChecking(false);
      }
    };
    loadCheck();
    return () => {
      active = false;
    };
  }, [showAlert]);

  const formReady =
    canDelete &&
    confirmation.trim() === 'ELIMINAR' &&
    (!hasPassword || password.length > 0);

  useEffect(() => {
    if (!formReady) {
      setCountdown(3);
      return;
    }
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formReady, countdown]);

  const buttonEnabled = formReady && countdown === 0 && !deleting;

  const handleConfirmDelete = async () => {
    if (!buttonEnabled) return;

    if (!hasPassword) {
      const bioAvailable = biometricEnabled || (await isBiometricAvailable());
      if (bioAvailable) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirmá tu identidad para eliminar tu cuenta',
          cancelLabel: 'Cancelar',
        });
        if (!auth.success) {
          return;
        }
      }
    }

    setDeleting(true);
    try {
      await apiClient.delete('/users/me', {
        data: {
          confirmation: 'ELIMINAR',
          ...(hasPassword ? { password } : {}),
        },
      });
      await disableBiometric();
      await logout();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'No se pudo eliminar la cuenta';
      await showAlert({
        title: 'No se pudo eliminar',
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={deleting}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#EF4444' }}>
          Eliminar cuenta
        </Text>
      </View>

      {checking ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 16 }}
        >
          {/* Qué se borra */}
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} color="#EF4444" />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.textPrimary, flex: 1 }}>
                Esta acción es permanente
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 10 }}>
              Al eliminar tu cuenta se borrarán de forma irreversible:
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
                • Todos tus ingresos y gastos personales
              </Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
                • Tus límites por categoría y categorías propias
              </Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
                • Tus notificaciones y preferencias de acceso
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 10 }}>
              El historial de gastos compartidos en grupos con otros miembros activos se conservará para no alterar sus cuentas.
            </Text>
          </View>

          {/* Bloqueadores si existen */}
          {blockers.length > 0 ? (
            <View
              style={{
                backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: '#EF4444',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} color="#EF4444" />
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#EF4444' }}>
                  Tenés saldos pendientes en grupos
                </Text>
              </View>
              {blockers.map((b) => (
                <Text
                  key={b.groupId}
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: isDark ? '#FECACA' : '#991B1B' }}
                >
                  • {b.message}
                </Text>
              ))}
            </View>
          ) : (
            <>
              {/* Confirmación escrita */}
              <View
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 18,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 12,
                }}
              >
                <View>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 6 }}>
                    Escribí ELIMINAR para confirmar
                  </Text>
                  <TextInput
                    value={confirmation}
                    onChangeText={setConfirmation}
                    placeholder="ELIMINAR"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!deleting}
                    style={{
                      backgroundColor: colors.bgInput,
                      borderWidth: 1.5,
                      borderColor: confirmation.trim() === 'ELIMINAR' ? '#EF4444' : colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 15,
                      color: colors.textPrimary,
                    }}
                  />
                </View>

                {hasPassword ? (
                  <View>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 6 }}>
                      Contraseña actual
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.bgInput,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        gap: 8,
                      }}
                    >
                      <Lock size={16} color={colors.textMuted} />
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Ingresá tu contraseña"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        editable={!deleting}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          fontFamily: 'Inter_400Regular',
                          fontSize: 15,
                          color: colors.textPrimary,
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                    Tu cuenta usa inicio de sesión con Google. Se validará tu identidad antes de completar la baja.
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleConfirmDelete}
                disabled={!buttonEnabled}
                accessibilityState={{ disabled: !buttonEnabled }}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 14,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: buttonEnabled ? 1 : 0.45,
                }}
              >
                {deleting ? (
                  <Spinner size={18} color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={18} color="#FFFFFF" />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                      {formReady && countdown > 0
                        ? `Eliminar cuenta (${countdown})`
                        : 'Eliminar cuenta permanentemente'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};
