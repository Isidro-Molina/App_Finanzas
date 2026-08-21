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
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export const AddGroupExpenseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params || {};
  const { colors, isDark } = useTheme();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const formattedDate = selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = selectedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

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
        date: selectedDate.toISOString(),
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

        {/* Date + Time */}
        <View style={cardStyle}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Fecha y Hora
          </Text>

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
                  const merged = new Date(selectedDate);
                  merged.setHours(time.getHours(), time.getMinutes());
                  setSelectedDate(merged);
                }
              }}
            />
          )}
        </View>

        {/* Submit */}
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
