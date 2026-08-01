import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Check, PlusCircle } from 'lucide-react-native';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: 'INCOME' | 'EXPENSE';
}

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      setCategories(res.data);
      const firstMatching = res.data.find((c: Category) => c.type === 'EXPENSE');
      if (firstMatching) setSelectedCategoryId(firstMatching.id);
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setFetchingCategories(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a cero');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor seleccioná una categoría');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/transactions', {
        amount: Number(amount).toFixed(2),
        type,
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar la transacción';
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
        <Text className="text-xl font-bold text-slate-100">Nueva Transacción</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Type Selector (Gasto / Ingreso) */}
        <View className="flex-row bg-surface-800 p-1.5 rounded-2xl border border-slate-700 mb-6">
          <TouchableOpacity
            onPress={() => {
              setType('EXPENSE');
              const first = categories.find((c) => c.type === 'EXPENSE');
              if (first) setSelectedCategoryId(first.id);
            }}
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
            onPress={() => {
              setType('INCOME');
              const first = categories.find((c) => c.type === 'INCOME');
              if (first) setSelectedCategoryId(first.id);
            }}
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

        {/* Amount Input */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-6">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Monto ($)
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
        </View>

        {/* Category Picker */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Seleccioná Categoría
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddCategory')}>
              <Text className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                + Nueva
              </Text>
            </TouchableOpacity>
          </View>
          {fetchingCategories ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className={`flex-row items-center px-4 py-3 rounded-2xl border ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500'
                        : 'bg-surface-800 border-slate-700/70'
                    }`}
                  >
                    <Text className="text-base mr-2">{cat.icon || '📦'}</Text>
                    <Text
                      className={`text-sm font-medium ${
                        isSelected ? 'text-brand-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {cat.name}
                    </Text>
                    {isSelected && (
                      <Check size={16} color="#38bdf8" className="ml-2" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Description Input */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-8">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Descripción (Opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Compras del supermercado"
            placeholderTextColor="#94a3b8"
            style={{ color: '#f8fafc', backgroundColor: 'transparent' }}
            className="text-base py-1"
          />
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
                Guardar Transacción
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
