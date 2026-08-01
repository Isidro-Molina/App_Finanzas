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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
      const firstMatching = res.data.find((c: Category) => c.type === type);
      if (firstMatching && !selectedCategoryId) {
        setSelectedCategoryId(firstMatching.id);
      }
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
        // Backend might not support setting date explicitly unless it's in DTO, 
        // but we'll include it in case it does or for future use.
        // date: date + 'T00:00:00Z', 
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
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#0F172A' }}>
          Agregar Gasto / Ingreso
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Type Selector */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', backgroundColor: '#fff', padding: 6, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <TouchableOpacity
            onPress={() => { setType('EXPENSE'); setSelectedCategoryId(null); }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'EXPENSE' ? '#EFF6FF' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'EXPENSE' ? '#2563EB' : '#94A3B8' }}>💸 Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setType('INCOME'); setSelectedCategoryId(null); }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'INCOME' ? '#ECFDF5' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'INCOME' ? '#059669' : '#94A3B8' }}>💰 Ingreso</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View
          style={{
            backgroundColor: '#fff',
            marginHorizontal: 20,
            marginBottom: 16,
            borderRadius: 20,
            paddingTop: 20,
            paddingBottom: 24,
            paddingHorizontal: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Monto
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 26, color: '#94A3B8', marginRight: 4 }}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              autoFocus
              style={{
                fontFamily: 'Outfit_800ExtraBold',
                fontSize: 56,
                color: '#0F172A',
                letterSpacing: -1,
                minWidth: 100,
                textAlign: 'center',
              }}
            />
          </View>
        </View>

        {/* Category grid */}
        <View
          style={{
            backgroundColor: '#fff',
            marginHorizontal: 20,
            marginBottom: 16,
            borderRadius: 20,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#0F172A' }}>
              Categoría
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddCategory')}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#2563EB' }}>
                + Nueva
              </Text>
            </TouchableOpacity>
          </View>
          
          {fetchingCategories ? (
            <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={{
                      width: '23%',
                      backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#2563EB' : 'transparent',
                      borderRadius: 14,
                      paddingVertical: 10,
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{cat.icon || '📦'}</Text>
                    <Text style={{ fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 10, color: isSelected ? '#2563EB' : '#64748B', textAlign: 'center' }} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {filteredCategories.length === 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', textAlign: 'center', width: '100%', marginTop: 10 }}>
                  No hay categorías. Creá una nueva.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Date & Notes */}
        <View
          style={{
            backgroundColor: '#fff',
            marginHorizontal: 20,
            marginBottom: 24,
            borderRadius: 20,
            padding: 18,
            gap: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
          <View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Fecha
            </Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              style={{
                width: '100%',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
                color: '#0F172A',
              }}
            />
          </View>
          <View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notas (opcional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Almuerzo con el equipo"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              style={{
                width: '100%',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
                color: '#0F172A',
                textAlignVertical: 'top',
              }}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              width: '100%',
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
                Guardar Transacción
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};
