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
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export const AddGroupExpenseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params || {};
  const { colors } = useTheme();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Campo requerido', 'Ingresá una descripción (ej: Carnicería, Supermercado)');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/groups/${groupId}/expenses`, {
        description: description.trim(),
        amount: Number(amount).toFixed(2),
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al agregar el gasto al grupo';
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
    shadowOpacity: 0.04,
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
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
          Cargar Gasto del Grupo
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

        {/* Description */}
        <View style={cardStyle}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            ¿Qué se pagó?
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Asado carnicería, Nafta, Hotel"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.textPrimary, paddingVertical: 4 }}
          />
        </View>

        {/* Amount */}
        <View style={{ ...cardStyle, alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Monto Total
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 26, color: colors.textMuted, marginRight: 4 }}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 48, color: colors.textPrimary, letterSpacing: -1, minWidth: 80, textAlign: 'center', padding: 0 }}
            />
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
            Se dividirá equitativamente entre todos los miembros.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
              Cargar Gasto
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
