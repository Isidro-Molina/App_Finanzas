import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Calendar, Clock, Trash2, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCategories } from '../../context/CategoriesContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatCurrency } from '../../utils/currency';
import { Spinner } from '../../components/Spinner';
import { awaitDashboardRefresh } from '../../utils/syncEvents';
import { getCategoryColor } from '../../utils/categoryColors';
import {
  formatAmountInput,
  parseAmountInput,
  formatNumberToAmountInput,
} from '../../utils/amountInput';
import {
  RATE_OPTIONS,
  RateOptionCode,
  ExchangeRateItem,
  fetchExchangeRates,
  getRateMeta,
  formatForeignAmount,
} from '../../utils/exchangeRates';

interface Category {
  id: string;
  name: string;
  icon: string | null; // stores color hex
  type: 'INCOME' | 'EXPENSE';
  isHidden?: boolean;
}

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const transaction = route.params?.transaction;
  const isEditing = Boolean(transaction?.id);

  const initialRateCode: RateOptionCode =
    transaction?.rateType && RATE_OPTIONS.some((r) => r.code === transaction.rateType)
      ? (transaction.rateType as RateOptionCode)
      : transaction?.currency === 'EUR'
        ? 'EUR'
        : transaction?.currency === 'USD'
          ? 'TARJETA'
          : 'ARS';

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(
    transaction?.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  );
  const [rateOption, setRateOption] = useState<RateOptionCode>(initialRateCode);
  const [inputInArs, setInputInArs] = useState<boolean>(false);
  const [ratesMap, setRatesMap] = useState<Record<string, ExchangeRateItem>>({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [customRate, setCustomRate] = useState(
    transaction?.exchangeRate ? formatNumberToAmountInput(Number(transaction.exchangeRate)) : ''
  );
  const [amount, setAmount] = useState(
    transaction?.originalAmount && initialRateCode !== 'ARS'
      ? formatNumberToAmountInput(Math.abs(Number(transaction.originalAmount)))
      : transaction?.amount
        ? formatNumberToAmountInput(Math.abs(Number(transaction.amount)))
        : ''
  );
  const [description, setDescription] = useState(transaction?.description || '');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (transaction?.date) return new Date(transaction.date);
    const now = new Date();
    const initMonth = route.params?.initialMonth;
    const initYear = route.params?.initialYear;
    if (
      typeof initMonth === 'number' &&
      typeof initYear === 'number' &&
      (initMonth !== now.getMonth() + 1 || initYear !== now.getFullYear())
    ) {
      const maxDayInMonth = new Date(initYear, initMonth, 0).getDate();
      const safeDay = Math.min(now.getDate(), maxDayInMonth);
      return new Date(initYear, initMonth - 1, safeDay, now.getHours(), now.getMinutes());
    }
    return now;
  });
  const [maxPickerDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const { categories, loading: fetchingCategories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    transaction?.categoryId || transaction?.category?.id || null
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formattedDate = selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = selectedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const loadRates = async (selectedCode: RateOptionCode = rateOption) => {
    setLoadingRates(true);
    try {
      const map = await fetchExchangeRates();
      setRatesMap(map);
      if (selectedCode !== 'ARS' && map[selectedCode]?.sell && !customRate) {
        setCustomRate(formatNumberToAmountInput(map[selectedCode].sell));
      }
    } finally {
      setLoadingRates(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRates(rateOption);
    }, [])
  );

  React.useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      const firstMatching = categories.find((c) => c.type === type && !c.isHidden);
      if (firstMatching) {
        setSelectedCategoryId(firstMatching.id);
      }
    }
  }, [categories, selectedCategoryId, type]);

  const handleSelectRateOption = (code: RateOptionCode) => {
    setRateOption(code);
    if (code === 'ARS') {
      setCustomRate('');
      setInputInArs(false);
      return;
    }
    const liveRate = ratesMap[code]?.sell;
    if (liveRate) {
      setCustomRate(formatNumberToAmountInput(liveRate));
    } else {
      loadRates(code).then(() => {});
    }
  };

  const activeRateMeta = getRateMeta(rateOption);
  const parsedInputAmount = parseAmountInput(amount);
  const parsedExchangeRate = parseAmountInput(customRate);
  const convertedArsAmount =
    rateOption === 'ARS'
      ? parsedInputAmount
      : inputInArs
        ? parsedInputAmount
        : +(parsedInputAmount * parsedExchangeRate).toFixed(2);
  const convertedForeignAmount =
    rateOption === 'ARS'
      ? 0
      : inputInArs
        ? parsedExchangeRate > 0
          ? +(parsedInputAmount / parsedExchangeRate).toFixed(2)
          : 0
        : parsedInputAmount;

  const filteredCategories = categories.filter(
    (c) => c.type === type && (!c.isHidden || (isEditing && c.id === selectedCategoryId)),
  );

  const handleDelete = () => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro de que querés eliminar esta transacción? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiClient.delete(`/transactions/${transaction.id}`);
              await awaitDashboardRefresh();
              navigation.goBack();
            } catch (e: any) {
              const msg = e.response?.data?.message || 'Error al eliminar la transacción';
              Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const parsedAmount = parseAmountInput(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a cero');
      return;
    }
    if (rateOption !== 'ARS' && (isNaN(parsedExchangeRate) || parsedExchangeRate <= 0)) {
      Alert.alert('Cotización inválida', 'Por favor ingresá una cotización válida mayor a cero');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor seleccioná una categoría');
      return;
    }

    const finalArsAmount =
      rateOption === 'ARS'
        ? parsedAmount
        : inputInArs
          ? parsedAmount
          : +(parsedAmount * parsedExchangeRate).toFixed(2);
    const finalForeignAmount =
      rateOption === 'ARS'
        ? null
        : inputInArs
          ? (parsedAmount / parsedExchangeRate).toFixed(2)
          : parsedAmount.toFixed(2);

    setLoading(true);
    try {
      const payload = {
        amount: finalArsAmount.toFixed(2),
        currency: activeRateMeta.currency,
        originalAmount: finalForeignAmount,
        exchangeRate: rateOption === 'ARS' ? null : parsedExchangeRate.toFixed(2),
        rateType: rateOption === 'ARS' ? null : rateOption,
        type,
        categoryId: selectedCategoryId,
        description: description.trim() ? description.trim() : isEditing ? null : undefined,
        date: selectedDate.toISOString(),
      };

      if (isEditing) {
        await apiClient.patch(`/transactions/${transaction.id}`, payload);
      } else {
        await apiClient.post('/transactions', payload);
      }
      await awaitDashboardRefresh();
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </Text>
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center' }}
          >
            {deleting ? (
              <Spinner size={18} color="#DC2626" />
            ) : (
              <Trash2 size={18} color="#DC2626" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Type Selector */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', backgroundColor: colors.bgCard, padding: 6, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <TouchableOpacity
            onPress={() => {
              setType('EXPENSE');
              const firstExpense = categories.find((c) => c.type === 'EXPENSE');
              setSelectedCategoryId(firstExpense?.id ?? null);
            }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'EXPENSE' ? '#EFF6FF' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'EXPENSE' ? '#2563EB' : colors.textMuted }}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setType('INCOME');
              const firstIncome = categories.find((c) => c.type === 'INCOME');
              setSelectedCategoryId(firstIncome?.id ?? null);
            }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: type === 'INCOME' ? '#ECFDF5' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: type === 'INCOME' ? '#059669' : colors.textMuted }}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount + Currency / Exchange Rate Card */}
        <View style={{ ...cardStyle, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.textPrimary }}>
              Monto
            </Text>
            {rateOption !== 'ARS' && (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.bgInput,
                  borderRadius: 8,
                  padding: 2,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <TouchableOpacity
                  onPress={() => setInputInArs(false)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: !inputInArs ? colors.brand : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 11,
                      color: !inputInArs ? '#fff' : colors.textMuted,
                    }}
                  >
                    En {activeRateMeta.currency}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setInputInArs(true)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: inputInArs ? colors.brand : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 11,
                      color: inputInArs ? '#fff' : colors.textMuted,
                    }}
                  >
                    En ARS
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Structured Amount Input Box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.bgInput,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                backgroundColor: colors.brandLight,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                marginRight: 12,
                borderWidth: 1,
                borderColor: `${colors.brand}25`,
              }}
            >
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.brand }}>
                {rateOption === 'ARS' || inputInArs ? 'ARS $' : activeRateMeta.symbol}
              </Text>
            </View>
            <TextInput
              value={amount}
              onChangeText={(text) => setAmount(formatAmountInput(text))}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              style={{
                flex: 1,
                fontFamily: 'Outfit_700Bold',
                fontVariant: ['tabular-nums'],
                fontSize: 28,
                color: colors.textPrimary,
                textAlign: 'right',
                padding: 0,
              }}
            />
          </View>

          {/* Currency / Rate Type Tags (wrapped grid matching Categories) */}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Cotización
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RATE_OPTIONS.map((opt) => {
              const isSelected = rateOption === opt.code;
              const liveQuote = opt.code !== 'ARS' ? ratesMap[opt.code]?.sell : null;
              return (
                <TouchableOpacity
                  key={opt.code}
                  onPress={() => handleSelectRateOption(opt.code)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.brand : colors.border,
                    backgroundColor: isSelected ? colors.brandLight : colors.bgInput,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      fontSize: 12,
                      color: isSelected ? colors.brand : colors.textSecondary,
                    }}
                  >
                    {opt.shortLabel}
                  </Text>
                  {liveQuote ? (
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 11,
                        color: isSelected ? colors.brand : colors.textMuted,
                      }}
                    >
                      ${Math.round(liveQuote).toLocaleString('es-AR')}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Exchange Rate & Bidirectional Conversion Box when non-ARS is selected */}
          {rateOption !== 'ARS' && (
            <View
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.bgInput,
                borderWidth: 1,
                borderColor: `${colors.brand}30`,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary }}>
                    TC {activeRateMeta.shortLabel}:
                  </Text>
                  <TouchableOpacity
                    onPress={() => loadRates(rateOption)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <RefreshCw size={13} color={colors.brand} />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.bgCard,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textMuted, marginRight: 2 }}>
                    $
                  </Text>
                  <TextInput
                    value={customRate}
                    onChangeText={(text) => setCustomRate(formatAmountInput(text))}
                    keyboardType="decimal-pad"
                    placeholder={loadingRates ? '...' : '0'}
                    placeholderTextColor={colors.textMuted}
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontVariant: ['tabular-nums'],
                      fontSize: 13,
                      color: colors.textPrimary,
                      minWidth: 56,
                      textAlign: 'right',
                      padding: 0,
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderSubtle,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted }}>
                  {inputInArs
                    ? `Equivalente en ${activeRateMeta.currency}`
                    : 'Equivalente en Pesos (ARS)'}
                </Text>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.brand }}>
                  {inputInArs
                    ? formatForeignAmount(convertedForeignAmount, activeRateMeta.currency)
                    : formatCurrency(convertedArsAmount)}
                </Text>
              </View>
            </View>
          )}
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
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Spinner size={24} color={colors.brand} />
            </View>
          ) : filteredCategories.length === 0 ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
              No hay categorías. Creá una nueva con el botón de arriba.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {filteredCategories.map((cat) => {
                const catColor = getCategoryColor(cat.icon, cat.name);
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
              maximumDate={maxPickerDate}
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
            style={{ width: '100%', backgroundColor: colors.brand, opacity: loading ? 0.85 : 1, borderRadius: 14, paddingVertical: 17, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
          >
            {loading ? (
              <>
                <Spinner size={18} color="#fff" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
                  {isEditing ? 'Actualizando...' : 'Guardando gasto...'}
                </Text>
              </>
            ) : (
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
                {isEditing ? 'Actualizar Transacción' : 'Guardar Transacción'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};
