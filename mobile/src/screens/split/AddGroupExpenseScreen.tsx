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
import { ArrowLeft, PlusCircle } from 'lucide-react-native';

export const AddGroupExpenseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params || {};

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

  return (
    <View className="flex-1 bg-surface-900 px-6 pt-12">
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-surface-800 border border-slate-700 items-center justify-center"
        >
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-100">Gasto del Grupo</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-6">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            ¿Qué se pagó?
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Asado carnicería, Nafta, Hotel"
            placeholderTextColor="#94a3b8"
            style={{ color: '#f8fafc', backgroundColor: 'transparent' }}
            className="text-lg py-1 font-medium"
          />
        </View>

        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-8">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Monto Total Pagado ($)
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            style={{ color: '#f8fafc', backgroundColor: 'transparent' }}
            className="text-4xl font-bold py-2"
          />
          <Text className="text-xs text-slate-400 mt-2">
            El monto se dividirá equitativamente entre todos los miembros del grupo.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-brand-500 py-4 rounded-2xl flex-row justify-center items-center mb-12 shadow-lg shadow-brand-500/30"
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <>
              <PlusCircle size={20} color="#0f172a" />
              <Text className="text-slate-950 font-bold text-base ml-2">
                Cargar Gasto
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
