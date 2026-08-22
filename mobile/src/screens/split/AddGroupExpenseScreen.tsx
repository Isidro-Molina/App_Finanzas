import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, Calendar, Clock, Users, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Member {
  user: { id: string; name: string; email: string };
  role: string;
}

interface ParticipantSplit {
  userId: string;
  name: string;
  included: boolean;
  amount: string;
}

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
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [splitEqual, setSplitEqual] = useState(true);
  const [participants, setParticipants] = useState<ParticipantSplit[]>([]);

  const formattedDate = selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = selectedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await apiClient.get(`/groups/${groupId}`);
        const members: Member[] = res.data.members || [];
        setParticipants(members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          included: true,
          amount: '',
        })));
      } catch (e) {
        console.error('Error loading members:', e);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [groupId]);

  const includedParticipants = participants.filter((p) => p.included);
  const includedCount = includedParticipants.length;
  const totalParsed = parseFloat(amount) || 0;

  const getEqualShare = (idx: number) => {
    if (includedCount === 0 || totalParsed === 0) return '0.00';
    const base = Math.floor((totalParsed / includedCount) * 100) / 100;
    const remainder = +(totalParsed - base * includedCount).toFixed(2);
    return (idx === 0 ? base + remainder : base).toFixed(2);
  };

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) =>
      prev.map((p) => p.userId === userId ? { ...p, included: !p.included } : p)
    );
  };

  const updateCustomAmount = (userId: string, val: string) => {
    setParticipants((prev) =>
      prev.map((p) => p.userId === userId ? { ...p, amount: val } : p)
    );
  };

  const customSum = includedParticipants.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const customSumOk = !splitEqual ? Math.abs(customSum - totalParsed) <= 0.02 : true;

  const handleSubmit = async () => {
    if (!description.trim()) { Alert.alert('Campo requerido', 'Ingresá una descripción.'); return; }
    if (!amount || isNaN(totalParsed) || totalParsed <= 0) { Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.'); return; }
    if (includedCount === 0) { Alert.alert('Sin participantes', 'Seleccioná al menos un participante.'); return; }
    if (!splitEqual && !customSumOk) {
      Alert.alert('Montos incorrectos', `La suma ($${customSum.toFixed(2)}) debe ser igual al total ($${totalParsed.toFixed(2)}).`);
      return;
    }

    setLoading(true);
    try {
      const includedList = participants.filter((p) => p.included);
      const splits = splitEqual
        ? includedList.map((p, i) => ({ userId: p.userId, amount: getEqualShare(i) }))
        : includedList.map((p) => ({ userId: p.userId, amount: parseFloat(p.amount).toFixed(2) }));

      await apiClient.post(`/groups/${groupId}/expenses`, {
        description: description.trim(),
        amount: totalParsed.toFixed(2),
        date: selectedDate.toISOString(),
        splits,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
          Cargar Gasto
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
            placeholder="Ej: Asado, Nafta, Hotel..."
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
        </View>

        {/* Date + Time */}
        <View style={cardStyle}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Fecha y Hora
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgInput, borderWidth: 1.5, borderColor: showDatePicker ? colors.brand : colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}
            >
              <Calendar size={16} color={colors.brand} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{formattedDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgInput, borderWidth: 1.5, borderColor: showTimePicker ? colors.brand : colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}
            >
              <Clock size={16} color={colors.brand} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>{formattedTime}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()} themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) { const m = new Date(date); m.setHours(selectedDate.getHours(), selectedDate.getMinutes()); setSelectedDate(m); } }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker value={selectedDate} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, time) => { setShowTimePicker(Platform.OS === 'ios'); if (time) { const m = new Date(selectedDate); m.setHours(time.getHours(), time.getMinutes()); setSelectedDate(m); } }}
            />
          )}
        </View>

        {/* Participants */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Users size={16} color={colors.brand} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Participantes ({includedCount})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSplitEqual(!splitEqual)}
              style={{ backgroundColor: splitEqual ? colors.brandLight : colors.bgSubtle, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: splitEqual ? colors.brand : colors.border }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: splitEqual ? colors.brand : colors.textMuted }}>
                {splitEqual ? 'Por igual' : 'Personalizado'}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingMembers ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <View style={{ gap: 12 }}>
              {participants.map((p, i) => {
                const equalShare = splitEqual && p.included ? getEqualShare(includedParticipants.indexOf(p)) : null;
                return (
                  <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleParticipant(p.userId)}
                      style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: p.included ? colors.brand : colors.bgInput, borderWidth: p.included ? 0 : 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {p.included && <Check size={13} color="#fff" />}
                    </TouchableOpacity>

                    {/* Avatar */}
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: p.included ? colors.brand : colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 13, color: p.included ? '#fff' : colors.textMuted }}>
                        {p.name[0].toUpperCase()}
                      </Text>
                    </View>

                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: p.included ? colors.textPrimary : colors.textMuted, flex: 1 }}>
                      {p.name}
                    </Text>

                    {p.included && (
                      splitEqual ? (
                        <View style={{ backgroundColor: colors.bgInput, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.brand }}>
                            ${equalShare}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.bgInput }}>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted }}>$</Text>
                          <TextInput
                            value={p.amount}
                            onChangeText={(v) => updateCustomAmount(p.userId, v)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, minWidth: 52, padding: 0 }}
                          />
                        </View>
                      )
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {!splitEqual && totalParsed > 0 && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Suma distribuida</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: customSumOk ? colors.income : colors.expense }}>
                ${customSum.toFixed(2)} / ${totalParsed.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 4 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>Cargar Gasto</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
