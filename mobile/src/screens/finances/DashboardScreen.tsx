import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { SpendingChart } from '../../components/SpendingChart';
import { LinearGradient } from 'expo-linear-gradient';

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
    icon: string | null;
  };
}

interface Budget {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  pctUsed: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#2563EB',
  Transporte: '#7C3AED',
  Entretenimiento: '#DB2777',
  Salud: '#059669',
  Hogar: '#D97706',
  Otro: '#64748B',
};

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [summaryRes, txRes, budgetRes] = await Promise.all([
        apiClient.get(`/transactions/summary?month=${month}&year=${year}`),
        apiClient.get(`/transactions?month=${month}&year=${year}`),
        apiClient.get(`/budgets?month=${month}&year=${year}`),
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
    }, []),
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
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94A3B8', marginTop: 12 }}>
          Cargando tus finanzas...
        </Text>
      </View>
    );
  }

  const monthName = new Date().toLocaleString('es-AR', { month: 'long' });
  const yearStr = new Date().getFullYear();

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* Top bar */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748B', marginBottom: 2 }}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {yearStr}
            </Text>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#0F172A' }}>
              Mis Finanzas
            </Text>
          </View>
          <LinearGradient
            colors={['#2563EB', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>👤</Text>
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
          <SpendingChart
            categories={summary?.byCategory ?? []}
            totalExpense={summary?.totalExpense ?? 0}
          />
        </View>

        {/* Expenses header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A' }}>
            Últimos Gastos
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction')}
            style={{ backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#2563EB' }}>
              + Agregar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expenses list */}
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {transactions.map((tx) => {
            const isIncome = tx.type === 'INCOME';
            const catName = tx.category?.name || 'Otro';
            const catColor = CATEGORY_COLORS[catName] || '#64748B';

            return (
              <View
                key={tx.id}
                style={{
                  backgroundColor: '#fff',
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
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: `${catColor}18`, // 18 hex is around 10% opacity
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{tx.category?.icon || '📦'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0F172A', marginBottom: 2 }}>
                    {tx.description || catName}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }}>
                    {new Date(tx.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: isIncome ? '#059669' : '#EF4444' }}>
                  {isIncome ? '+' : '-'}${Math.abs(Number(tx.amount)).toLocaleString('es-AR')}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AddTransaction')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#2563EB',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
};
