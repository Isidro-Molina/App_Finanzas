import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { ArrowLeft, Lock, Check } from 'lucide-react-native';

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Campos incompletos', 'Por favor completá todos los campos.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Contraseña corta', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch('/users/me/password', {
        currentPassword,
        newPassword,
      });
      Alert.alert('¡Listo!', 'Tu contraseña fue actualizada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al actualizar la contraseña.';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 16,
    elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary, flex: 1 }}>
          Cambiar Contraseña
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
        
        {/* Helper Text */}
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 24, paddingHorizontal: 4 }}>
          Creá una contraseña nueva y segura. Vas a necesitar tu contraseña actual para confirmar el cambio.
        </Text>

        {/* Current Password */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Lock size={16} color={colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Contraseña Actual
            </Text>
          </View>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: currentPassword ? colors.brand : colors.border, paddingVertical: 8 }}
          />
        </View>

        {/* New Password */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Lock size={16} color={colors.brand} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nueva Contraseña
            </Text>
          </View>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: newPassword ? colors.brand : colors.border, paddingVertical: 8 }}
          />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
            Mínimo 8 caracteres
          </Text>
        </View>

        {/* Confirm New Password */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Check size={16} color={newPassword === confirmPassword && confirmPassword ? colors.income : colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Confirmar Nueva Contraseña
            </Text>
          </View>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: confirmPassword ? (newPassword === confirmPassword ? colors.income : colors.expense) : colors.border, paddingVertical: 8 }}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8, shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Check size={18} color="#fff" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>Actualizar Contraseña</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
