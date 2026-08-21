import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { ArrowLeft, User, Mail, Check } from 'lucide-react-native';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);

  const hasChanges = name.trim() !== (user?.name ?? '');

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Nombre inválido', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch('/users/me', { name: name.trim() });
      await refreshProfile();
      Alert.alert('¡Listo!', 'Tu perfil fue actualizado.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al actualizar el perfil.';
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
          Editar Perfil
        </Text>
        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{ backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' }}>Guardar</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 32, color: '#fff' }}>
              {name ? name[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>
            El avatar se genera automáticamente con tu inicial.
          </Text>
        </View>

        {/* Name field */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <User size={16} color={colors.brand} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nombre
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre completo"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: name !== (user?.name ?? '') ? colors.brand : colors.border, paddingVertical: 8 }}
          />
        </View>

        {/* Email (read-only) */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Mail size={16} color={colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textMuted, paddingVertical: 8 }}>
            {user?.email}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            El email no se puede cambiar por el momento.
          </Text>
        </View>

        {/* Save button (also at bottom) */}
        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
            style={{ backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Check size={18} color="#fff" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>Guardar Cambios</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};
