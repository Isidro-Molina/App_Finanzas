import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { SpendingChart } from '../../components/SpendingChart';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Info, X, User, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface SummaryData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Array<{
    name: string;
    icon: string | null;
    total: number;
    type: string;
  }>;
}

interface Transaction {
  id: string;
  amount: string;
  description: string | null;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: {
    name: string;
    icon: string | null; // used to store color hex
  };
}

interface Budget {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  pctUsed: number;
}

// Map category icon field (which may hold a color) or use a default palette
function getCategoryColor(icon: string | null, index: number): string {
  const palette = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2', '#DC2626', '#65A30D'];
  if (icon && icon.startsWith('#')) return icon;
  return palette[index % palette.length];
}

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tooltipTx, setTooltipTx] = useState<Transaction | null>(null);

  // Month navigation
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const goToPrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();
    if (isCurrentMonth) return; // can't go forward beyond today
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };
  const isCurrentMonth = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

  const fetchData = async () => {
    try {
      const [summaryRes, txRes, budgetRes] = await Promise.all([
        apiClient.get(`/transactions/summary?month=${currentMonth}&year=${currentYear}`),
        apiClient.get(`/transactions?month=${currentMonth}&year=${currentYear}`),
        apiClient.get(`/budgets?month=${currentMonth}&year=${currentYear}`),
      ]);
      setSummary(summaryRes.data);
      setTransactions(txRes.data);
      setBudgets(budgetRes.data);
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [currentMonth, currentYear]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalBudget = budgets.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalSpent = summary?.totalExpense ?? 0;
  const remainingBudget = totalBudget > 0 ? totalBudget - totalSpent : summary?.balance ?? 0;
  let pct = totalBudget > 0 ? Math.round((remainingBudget / totalBudget) * 100) : 0;
  if (pct < 0) pct = 0;

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, marginTop: 12 }}>
          Cargando tus finanzas...
        </Text>
      </View>
    );
  }

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('es-AR', { month: 'long' });
  const yearStr = currentYear;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* Top bar with month navigation */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            {/* Month navigator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <TouchableOpacity onPress={goToPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronLeft size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.brand }}>
                {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {yearStr}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronRight size={16} color={isCurrentMonth ? colors.borderSubtle : colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary }}>
              Mis Finanzas
            </Text>
          </View>
          <LinearGradient
            colors={['#2563EB', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <User size={18} color="#fff" />
          </LinearGradient>
        </View>

        {/* Budget card */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <LinearGradient
            colors={['#1D4ED8', '#2563EB', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 24,
              paddingBottom: 20,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.32,
              shadowRadius: 32,
              elevation: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Presupuesto Restante
            </Text>
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 42, color: '#fff', marginBottom: 16, letterSpacing: -0.5 }}>
              ${remainingBudget.toLocaleString('es-AR')}
            </Text>
            <View style={{ height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, borderRadius: 99, backgroundColor: '#fff' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                Gastado: ${totalSpent.toLocaleString('es-AR')}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                Total: ${totalBudget.toLocaleString('es-AR')}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Donut chart */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <SpendingChart categories={summary?.byCategory ?? []} totalExpense={summary?.totalExpense ?? 0} />
        </View>

        {/* Expenses header — solo label, sin botón de texto */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary }}>
            Últimos Gastos
          </Text>
        </View>

        {/* Expenses list */}
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {transactions.length === 0 ? (
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>
                Aún no hay transacciones este mes.
              </Text>
            </View>
          ) : (
            transactions.map((tx, index) => {
              const isIncome = tx.type === 'INCOME';
              const catColor = getCategoryColor(tx.category?.icon, index);
              const hasDescription = Boolean(tx.description && tx.description.trim());

              return (
                <View
                  key={tx.id}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Color dot instead of emoji */}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: `${catColor}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: catColor }} />
                  </View>

                  <View style={{ flex: 1 }}>
                    {/* Category tag */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <View style={{ backgroundColor: `${catColor}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: catColor }}>
                          {tx.category?.name || 'Sin categoría'}
                        </Text>
                      </View>
                      {hasDescription && (
                        <TouchableOpacity onPress={() => setTooltipTx(tx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Info size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary, marginBottom: 1 }}>
                      {tx.description || tx.category?.name || 'Transacción'}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                      {new Date(tx.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>

                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: isIncome ? colors.income : colors.expense }}>
                    {isIncome ? '+' : '-'}${Math.abs(Number(tx.amount)).toLocaleString('es-AR')}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB — único botón de agregar */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AddTransaction')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.brand,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {/* Tooltip modal para descripción */}
      <Modal visible={!!tooltipTx} transparent animationType="fade" onRequestClose={() => setTooltipTx(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
          onPress={() => setTooltipTx(null)}
        >
          <Pressable
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 20,
              padding: 24,
              width: '100%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.textPrimary, flex: 1, marginRight: 12 }}>
                {tooltipTx?.category?.name || 'Detalle'}
              </Text>
              <TouchableOpacity onPress={() => setTooltipTx(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
              {tooltipTx?.description}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 12 }}>
              {tooltipTx ? new Date(tooltipTx.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};


