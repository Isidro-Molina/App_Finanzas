import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Category {
  id: string;
  name: string;
  icon: string | null; // stores color hex
  type: 'INCOME' | 'EXPENSE';
}

function getCategoryColor(icon: string | null, index: number): string {
  const palette = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2', '#DC2626', '#65A30D'];
  if (icon && icon.startsWith('#')) return icon;
  return palette[index % palette.length];
}

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  const formattedDate = selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = selectedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

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
        date: selectedDate.toISOString(),
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar la transacción';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: colors.bgCard,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
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
          Nueva Transacción
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Type Selector */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', backgroundColor: colors.bgCard, padding: 6, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <TouchableOpacity
            onPress={() => { setType('EXPENSE'); setSelectedCategoryId(null); }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'EXPENSE' ? '#EFF6FF' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'EXPENSE' ? '#2563EB' : colors.textMuted }}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setType('INCOME'); setSelectedCategoryId(null); }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'INCOME' ? '#ECFDF5' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'INCOME' ? '#059669' : colors.textMuted }}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={{ ...cardStyle, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Monto
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 26, color: colors.textMuted, marginRight: 4 }}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              style={{
                fontFamily: 'Outfit_800ExtraBold',
                fontSize: 56,
                color: colors.textPrimary,
                letterSpacing: -1,
                minWidth: 100,
                textAlign: 'center',
                padding: 0,
              }}
            />
          </View>
        </View>

        {/* Category grid — tags with color */}
        <View style={{ ...cardStyle, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.textPrimary }}>
              Categoría
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddCategory')}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.brand }}>
                + Nueva
              </Text>
            </TouchableOpacity>
          </View>

          {fetchingCategories ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
          ) : filteredCategories.length === 0 ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
              No hay categorías. Creá una nueva con el botón de arriba.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {filteredCategories.map((cat, idx) => {
                const catColor = getCategoryColor(cat.icon, idx);
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: isSelected ? catColor : `${catColor}30`,
                      backgroundColor: isSelected ? `${catColor}18` : colors.bgInput,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColor }} />
                    <Text style={{ fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 13, color: isSelected ? catColor : colors.textSecondary }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Date + Time pickers */}
        <View style={{ ...cardStyle, padding: 18 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Fecha y Hora
          </Text>

          {/* Two buttons side by side */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Date button */}
            <TouchableOpacity
              onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgInput, borderWidth: 1.5, borderColor: showDatePicker ? colors.brand : colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}
            >
              <Calendar size={16} color={colors.brand} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                {formattedDate}
              </Text>
            </TouchableOpacity>

            {/* Time button */}
            <TouchableOpacity
              onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgInput, borderWidth: 1.5, borderColor: showTimePicker ? colors.brand : colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}
            >
              <Clock size={16} color={colors.brand} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
                {formattedTime}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  // Preserve time when changing date
                  const merged = new Date(date);
                  merged.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                  setSelectedDate(merged);
                }
              }}
            />
          )}

          {/* Time picker */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(event, time) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (time) {
                  // Preserve date when changing time
                  const merged = new Date(selectedDate);
                  merged.setHours(time.getHours(), time.getMinutes());
                  setSelectedDate(merged);
                }
              }}
            />
          )}
        </View>

        {/* Notes */}
        <View style={{ ...cardStyle, padding: 18 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Almuerzo con el equipo"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={{ width: '100%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgInput, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textPrimary, textAlignVertical: 'top' }}
          />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{ width: '100%', backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
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
