import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { Trophy, BarChart2, Users, TrendingUp, Check } from 'lucide-react-native';
import { formatCurrency } from '../../utils/currency';

interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const ProfileScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [monthlySeries, setMonthlySeries] = useState<Array<{ month: string; value: number; isCurrent: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Preparar las consultas de los últimos 6 meses
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthRequests = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthRequests.push({ monthName: monthNames[m - 1], m, y, isCurrent: i === 0 });
      }

      // Ejecutar todas las llamadas en paralelo
      const [summaryRes, groupsRes, txRes, ...monthsData] = await Promise.all([
        apiClient.get(`/transactions/summary?month=${month}&year=${year}`),
        apiClient.get('/groups'),
        apiClient.get(`/transactions?month=${month}&year=${year}`),
        ...monthRequests.map((req) =>
          apiClient
            .get(`/transactions/summary?month=${req.m}&year=${req.y}`)
            .then((res) => ({ month: req.monthName, value: res.data.totalExpense ?? 0, isCurrent: req.isCurrent }))
            .catch(() => ({ month: req.monthName, value: 0, isCurrent: req.isCurrent }))
        ),
      ]);

      setSummary(summaryRes.data);
      setGroupCount(groupsRes.data.length);
      setTxCount(txRes.data.length);
      setMonthlySeries(monthsData);
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // "Saved this month" = income - expenses (money that wasn't spent)
  const savedThisMonth = summary ? Math.max(0, summary.totalIncome - summary.totalExpense) : 0;

  const BADGES = [
    {
      Icon: Trophy,
      label: 'Ahorrador',
      desc: savedThisMonth > 0 ? 'Tenés saldo positivo este mes' : 'Aún sin ahorro este mes',
      unlocked: savedThisMonth > 0,
      color: '#F59E0B',
    },
    {
      Icon: BarChart2,
      label: 'Constante',
      desc: txCount >= 5 ? `${txCount} gastos registrados este mes` : `${txCount}/5 gastos para desbloquear`,
      unlocked: txCount >= 5,
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

  const maxVal = Math.max(...monthlySeries.map((m) => m.value), 1);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
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
              {user?.name ? user.name[0].toUpperCase() : '?'}
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
              { label: 'Gastos', value: String(txCount) },
              { label: 'Ahorrado', value: savedThisMonth > 0 ? formatCurrency(savedThisMonth) : '$0,00' },
            ].map((s, i) => (
              <View key={s.label} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 18, color: '#fff', marginBottom: 2 }}>{s.value}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* "Ahorrado" explanation card */}
        {savedThisMonth > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ backgroundColor: '#ECFDF5', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#065F46', marginBottom: 2 }}>
                  ¡Buen mes! Ahorraste {formatCurrency(savedThisMonth)}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#059669' }}>
                  Plata que ingresaste y no gastaste este mes.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly spending bar chart */}
        {monthlySeries.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary }}>
                  Historial de Gastos
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                  Últimos 6 meses
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 }}>
                {monthlySeries.map((m) => {
                  const height = maxVal > 0 ? Math.max(4, (m.value / maxVal) * 84) : 4;
                  return (
                    <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: '100%', height, backgroundColor: m.isCurrent ? colors.brand : (isDark ? '#334155' : '#BFDBFE'), borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, marginBottom: 6 }} />
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: m.isCurrent ? colors.brand : colors.textMuted }}>{m.month}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Month totals summary */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Ingresos</Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.income }}>{formatCurrency(summary?.totalIncome ?? 0)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Gastos</Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.expense }}>{formatCurrency(summary?.totalExpense ?? 0)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Balance</Text>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: (summary?.balance ?? 0) >= 0 ? colors.income : colors.expense }}>{formatCurrency(Math.abs(summary?.balance ?? 0))}</Text>
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
