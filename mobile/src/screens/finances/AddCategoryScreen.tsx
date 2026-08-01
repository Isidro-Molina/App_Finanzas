import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const COLOR_OPTIONS = [
  '#2563EB', // Azul
  '#7C3AED', // Violeta
  '#DB2777', // Rosa
  '#059669', // Verde
  '#D97706', // Ámbar
  '#0891B2', // Cyan
  '#DC2626', // Rojo
  '#65A30D', // Lima
  '#9333EA', // Púrpura
  '#0F172A', // Negro
  '#64748B', // Gris
  '#EA580C', // Naranja
];

export const AddCategoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresá un nombre para la categoría');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/categories', {
        name: name.trim(),
        type,
        icon: selectedColor, // guardamos el color hex en el campo icon
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar la categoría';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
          Nueva Categoría
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

        {/* Type selector */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, padding: 6, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <TouchableOpacity
            onPress={() => setType('EXPENSE')}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'EXPENSE' ? '#EFF6FF' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'EXPENSE' ? '#2563EB' : colors.textMuted }}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('INCOME')}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'INCOME' ? '#ECFDF5' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'INCOME' ? '#059669' : colors.textMuted }}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name input */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Nombre
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Suscripciones"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              backgroundColor: colors.bgCard,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontFamily: 'Inter_500Medium',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />
        </View>

        {/* Color picker */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Color del Tag
          </Text>

          {/* Preview */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, backgroundColor: colors.bgCard, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ backgroundColor: `${selectedColor}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: selectedColor }}>
                {name || 'Ejemplo'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>
              Así va a verse el tag
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: selectedColor === color ? 3 : 0,
                  borderColor: '#fff',
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedColor === color ? 0.5 : 0,
                  shadowRadius: 8,
                  elevation: selectedColor === color ? 4 : 0,
                }}
              >
                {selectedColor === color && <Check size={18} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 14,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.brand,
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
              Crear Categoría
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
