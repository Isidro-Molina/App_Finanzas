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
import { ArrowLeft, Check, PlusCircle } from 'lucide-react-native';

const ICONS = ['🛒', '🍔', '🚌', '🏠', '💡', '🎮', '🏥', '👕', '📚', '🎁', '💼', '💰'];

export const AddCategoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
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
        icon: selectedIcon,
      });
      // Volver a la pantalla anterior
      navigation.goBack();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar la categoría';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-900 px-6 pt-12">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-surface-800 border border-slate-700 items-center justify-center"
        >
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-100">Nueva Categoría</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View className="flex-row bg-surface-800 p-1.5 rounded-2xl border border-slate-700 mb-6">
          <TouchableOpacity
            onPress={() => setType('EXPENSE')}
            className={`flex-1 py-3 rounded-xl items-center ${
              type === 'EXPENSE' ? 'bg-rose-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-semibold ${
                type === 'EXPENSE' ? 'text-slate-950' : 'text-slate-400'
              }`}
            >
              💸 Gasto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setType('INCOME')}
            className={`flex-1 py-3 rounded-xl items-center ${
              type === 'INCOME' ? 'bg-emerald-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-semibold ${
                type === 'INCOME' ? 'text-slate-950' : 'text-slate-400'
              }`}
            >
              💰 Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name Input */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-6">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Nombre
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Suscripciones"
            placeholderTextColor="#94a3b8"
            style={{ color: '#f8fafc', backgroundColor: 'transparent' }}
            className="text-lg font-medium py-2"
          />
        </View>

        {/* Icon Picker */}
        <View className="mb-8">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Seleccioná un Icono
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {ICONS.map((icon, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedIcon(icon)}
                className={`w-14 h-14 rounded-2xl items-center justify-center border ${
                  selectedIcon === icon
                    ? 'bg-brand-500/20 border-brand-500'
                    : 'bg-surface-800 border-slate-700/70'
                }`}
              >
                <Text className="text-2xl">{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
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
                Crear Categoría
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
