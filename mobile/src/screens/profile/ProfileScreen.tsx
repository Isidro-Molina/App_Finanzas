import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Spinner } from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { Trophy, BarChart2, Users } from 'lucide-react-native';
import { formatCurrency } from '../../utils/currency';

const formatCompactExpense = (val: number): string => {
  if (!val || val <= 0) return '—';
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `$${m >= 10 ? Math.round(m) : m.toFixed(1).replace('.', ',')}M`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return `$${k >= 10 ? Math.round(k) : k.toFixed(1).replace('.', ',')}k`;
  }
  return `$${Math.round(val)}`;
};

interface MonthlySeriesItem {
  key: string;
  month: string;
  fullMonthName: string;
  monthNum: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseCount: number;
  isCurrent: boolean;
}

const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FULL_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const ProfileScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [groupCount, setGroupCount] = useState(0);
  const [monthlySeries, setMonthlySeries] = useState<MonthlySeriesItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const monthRequests: Array<{
        key: string;
        monthName: string;
        fullMonthName: string;
        m: number;
        y: number;
        isCurrent: boolean;
      }> = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthRequests.push({
          key: `${y}-${String(m).padStart(2, '0')}`,
          monthName: SHORT_MONTHS[m - 1],
          fullMonthName: FULL_MONTHS[m - 1],
          m,
          y,
          isCurrent: i === 0,
        });
      }

      const [groupsRes, currentTxRes, ...summariesData] = await Promise.all([
        apiClient.get('/groups'),
        apiClient.get(`/transactions?month=${currentMonth}&year=${currentYear}`).catch(() => ({ data: [] })),
        ...monthRequests.map((req) =>
          apiClient
            .get(`/transactions/summary?month=${req.m}&year=${req.y}`)
            .then((res) => ({
              key: req.key,
              month: req.monthName,
              fullMonthName: req.fullMonthName,
              monthNum: req.m,
              year: req.y,
              totalIncome: res.data?.totalIncome ?? 0,
              totalExpense: res.data?.totalExpense ?? 0,
              balance: res.data?.balance ?? 0,
              expenseCount: typeof res.data?.expenseCount === 'number' ? res.data.expenseCount : -1,
              isCurrent: req.isCurrent,
            }))
            .catch(() => ({
              key: req.key,
              month: req.monthName,
              fullMonthName: req.fullMonthName,
              monthNum: req.m,
              year: req.y,
              totalIncome: 0,
              totalExpense: 0,
              balance: 0,
              expenseCount: 0,
              isCurrent: req.isCurrent,
            })),
        ),
      ]);

      const fallbackCurrentExpenseCount = Array.isArray(currentTxRes.data)
        ? currentTxRes.data.filter((t: any) => t.type === 'EXPENSE').length
        : 0;

      const normalizedSeries = summariesData.map((item) => ({
        ...item,
        expenseCount:
          item.expenseCount >= 0
            ? item.expenseCount
            : item.isCurrent
              ? fallbackCurrentExpenseCount
              : 0,
      }));

      setGroupCount(Array.isArray(groupsRes.data) ? groupsRes.data.length : 0);
      setMonthlySeries(normalizedSeries);
      setSelectedIndex((prev) => (prev >= 0 && prev < normalizedSeries.length ? prev : normalizedSeries.length - 1));
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const selectedMonth = monthlySeries[selectedIndex] ?? monthlySeries[monthlySeries.length - 1] ?? null;
  const currentMonthItem = monthlySeries.find((m) => m.isCurrent) ?? selectedMonth;
  const closedMonths = monthlySeries.filter((m) => !m.isCurrent);
  const closedSavedMonths = closedMonths.filter((m) => m.balance > 0 && m.totalIncome > 0);

  // El ahorro de un mes solo se considera efectivo cuando el mes ya terminó
  const selectedMonthSaved =
    selectedMonth && !selectedMonth.isCurrent
      ? Math.max(0, selectedMonth.balance)
      : 0;

  const currentTxCount = currentMonthItem?.expenseCount ?? 0;
  const selectedTxCount = selectedMonth?.expenseCount ?? 0;

  const BADGES = [
    {
      Icon: Trophy,
      label: 'Ahorrador',
      desc:
        selectedMonth && !selectedMonth.isCurrent
          ? selectedMonthSaved > 0
            ? `Cerraste ${selectedMonth.fullMonthName.toLowerCase()} con saldo positivo`
            : `Sin ahorro al cierre de ${selectedMonth.fullMonthName.toLowerCase()}`
          : closedSavedMonths.length > 0
            ? `Cerraste ${closedSavedMonths.length} mes(es) con saldo positivo`
            : 'Se calcula al finalizar el mes en curso',
      unlocked:
        selectedMonth && !selectedMonth.isCurrent
          ? selectedMonthSaved > 0
          : closedSavedMonths.length > 0,
      color: '#F59E0B',
    },
    {
      Icon: BarChart2,
      label: 'Constante',
      desc:
        currentTxCount >= 5
          ? `${currentTxCount} gastos registrados este mes`
          : `${currentTxCount}/5 gastos para desbloquear`,
      unlocked: currentTxCount >= 5,
      color: '#2563EB',
    },
    {
      Icon: Users,
      label: 'Comunidad',
      desc: groupCount >= 1 ? `Participás en ${groupCount} grupo(s)` : 'Unite o creá tu primer grupo',
      unlocked: groupCount >= 1,
      color: '#059669',
    },
  ];

  const maxVal = Math.max(...monthlySeries.map((m) => m.totalExpense), 1);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.brand} />
        }
      >

        {/* Hero */}
        <LinearGradient
          colors={['#1D4ED8', '#2563EB', '#7C3AED']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, alignItems: 'center' }}
        >
          <LinearGradient
            colors={['#7C3AED', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 14 }}
          >
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 32, color: '#fff' }}>
              {(user?.name?.trim()?.[0] ?? '?').toUpperCase()}
            </Text>
          </LinearGradient>

          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 22, color: '#fff', marginBottom: 4 }}>
            {user?.name || 'Usuario'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
            {user?.email}
          </Text>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, marginTop: 20, width: '100%' }}>
            {[
              { label: 'Grupos', value: String(groupCount) },
              {
                label: selectedMonth && !selectedMonth.isCurrent ? `Gastos (${selectedMonth.month})` : 'Gastos',
                value: String(selectedTxCount),
              },
              {
                label: selectedMonth && !selectedMonth.isCurrent ? `Ahorrado (${selectedMonth.month})` : 'Ahorrado',
                value:
                  selectedMonth && !selectedMonth.isCurrent
                    ? selectedMonthSaved > 0
                      ? formatCurrency(selectedMonthSaved)
                      : '$0,00'
                    : 'En curso',
              },
            ].map((s, i) => (
              <View key={s.label} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 17, color: '#fff', marginBottom: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                  {s.value}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Monthly spending bar chart */}
        {monthlySeries.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary }}>
                  Historial de Gastos
                </Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.brand }}>
                  {selectedMonth
                    ? `${selectedMonth.fullMonthName} ${selectedMonth.year}${selectedMonth.isCurrent ? ' · En curso' : ''}`
                    : 'Últimos 6 meses'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                {monthlySeries.map((m, idx) => {
                  const isSelected = idx === selectedIndex;
                  const hasExpense = m.totalExpense > 0;
                  const ratio = hasExpense && maxVal > 0 ? m.totalExpense / maxVal : 0;
                  const fillHeight = hasExpense ? Math.max(16, Math.round(Math.pow(ratio, 0.55) * 88)) : 0;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setSelectedIndex(idx)}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={{
                          fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                          fontSize: 10,
                          color: isSelected
                            ? colors.brand
                            : hasExpense
                              ? colors.textSecondary
                              : colors.textMuted,
                          marginBottom: 6,
                        }}
                      >
                        {formatCompactExpense(m.totalExpense)}
                      </Text>

                      <View
                        style={{
                          width: '100%',
                          alignSelf: 'stretch',
                          height: 88,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          justifyContent: 'flex-end',
                          overflow: 'hidden',
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected
                            ? colors.brand
                            : isDark
                              ? '#33415560'
                              : '#E2E8F0',
                          marginBottom: 6,
                        }}
                      >
                        {hasExpense && (
                          <View
                            style={{
                              width: '100%',
                              height: fillHeight,
                              backgroundColor: isSelected
                                ? colors.brand
                                : isDark
                                  ? '#3B82F6'
                                  : '#60A5FA',
                              borderTopLeftRadius: 6,
                              borderTopRightRadius: 6,
                            }}
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                          fontSize: 11,
                          color: isSelected ? colors.brand : colors.textMuted,
                        }}
                      >
                        {m.month}
                      </Text>
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          marginTop: 3,
                          backgroundColor: isSelected ? colors.brand : 'transparent',
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* Month totals summary for selected month */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                    Ingresos
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.income }}>
                    {formatCurrency(selectedMonth?.totalIncome ?? 0)}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                    Gastos
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.expense }}>
                    {formatCurrency(selectedMonth?.totalExpense ?? 0)}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                    Balance
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: (selectedMonth?.balance ?? 0) >= 0 ? colors.income : colors.expense }}>
                    {(selectedMonth?.balance ?? 0) < 0
                      ? `-${formatCurrency(Math.abs(selectedMonth?.balance ?? 0))}`
                      : formatCurrency(selectedMonth?.balance ?? 0)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Achievements / Logros */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 12 }}>
            Logros
          </Text>
          <View style={{ gap: 8 }}>
            {BADGES.map((b) => (
              <View
                key={b.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bgCard,
                  borderRadius: 14,
                  padding: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                  gap: 12,
                  opacity: b.unlocked ? 1 : 0.7,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${b.color}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <b.Icon size={22} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>{b.label}</Text>
                    {b.unlocked && (
                      <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#10B981' }}>Completado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
};
