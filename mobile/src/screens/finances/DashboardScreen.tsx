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
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

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

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface-900 justify-center items-center">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="text-slate-400 text-sm mt-3">Cargando tus finanzas...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-900">
      <ScrollView
        className="flex-1 px-5 pt-12"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
      >
        {/* Header Superior */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mi Resumen Mensual
            </Text>
            <Text className="text-2xl font-bold text-slate-100">Finanzas</Text>
          </View>
          <View className="flex-row items-center bg-surface-800 border border-slate-700/60 px-3 py-1.5 rounded-full">
            <Calendar size={14} color="#94a3b8" />
            <Text className="text-xs text-slate-300 ml-1.5 font-medium">
              {new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Totalizador Superior - Presupuesto y Balance */}
        <View className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-5 mb-4 shadow-xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {totalBudget > 0 ? 'Presupuesto Disponible' : 'Balance Neto'}
            </Text>
            <Wallet size={18} color="#38bdf8" />
          </View>

          <Text
            className={`text-4xl font-extrabold my-1 ${
              remainingBudget >= 0 ? 'text-slate-100' : 'text-rose-400'
            }`}
          >
            ${remainingBudget.toLocaleString('es-AR')}
          </Text>

          {totalBudget > 0 ? (
            <View className="mt-3">
              <View className="flex-row justify-between text-xs text-slate-400 mb-1.5">
                <Text className="text-xs text-slate-400">
                  Presupuesto: ${totalBudget.toLocaleString('es-AR')}
                </Text>
                <Text className="text-xs text-slate-400">
                  Gastado: ${totalSpent.toLocaleString('es-AR')}
                </Text>
              </View>
              {/* Barra de Progreso del Presupuesto */}
              <View className="h-2.5 bg-surface-900 rounded-full overflow-hidden border border-slate-700/50">
                <View
                  className={`h-full rounded-full ${
                    totalSpent > totalBudget
                      ? 'bg-rose-500'
                      : totalSpent / totalBudget > 0.8
                      ? 'bg-amber-500'
                      : 'bg-brand-500'
                  }`}
                  style={{
                    width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                  }}
                />
              </View>
            </View>
          ) : null}

          {/* Cards resumen Ingresos vs Gastos */}
          <View className="flex-row gap-3 mt-4 pt-4 border-t border-slate-700/40">
            <View className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center mr-2.5">
                <TrendingUp size={16} color="#10b981" />
              </View>
              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-semibold">
                  Ingresos
                </Text>
                <Text className="text-sm font-bold text-emerald-400">
                  +${(summary?.totalIncome ?? 0).toLocaleString('es-AR')}
                </Text>
              </View>
            </View>

            <View className="flex-1 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center mr-2.5">
                <TrendingDown size={16} color="#f43f5e" />
              </View>
              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-semibold">
                  Gastos
                </Text>
                <Text className="text-sm font-bold text-rose-400">
                  -${(summary?.totalExpense ?? 0).toLocaleString('es-AR')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gráfico central de gastos */}
        <SpendingChart
          categories={summary?.byCategory ?? []}
          totalExpense={summary?.totalExpense ?? 0}
        />

        {/* Botón de Agregar Gasto / Ingreso */}
        <View className="flex-row items-center justify-between mt-2 mb-4">
          <Text className="text-lg font-bold text-slate-100">Transacciones</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction')}
            activeOpacity={0.8}
            className="bg-brand-500 px-4 py-2.5 rounded-full flex-row items-center shadow-lg shadow-brand-500/20"
          >
            <Plus size={18} color="#0f172a" />
            <Text className="text-slate-950 font-bold text-xs ml-1.5">
              + Agregar Gasto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabla / Listado de Transacciones */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-4 mb-24">
          {transactions.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <AlertCircle size={32} color="#64748b" />
              <Text className="text-slate-400 text-sm mt-2 text-center">
                Aún no registraste gastos ni ingresos este mes.
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1">
                Toca en "+ Agregar Gasto" para comenzar.
              </Text>
            </View>
          ) : (
            transactions.map((tx, idx) => {
              const isIncome = tx.type === 'INCOME';
              const formattedDate = new Date(tx.date).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <View
                  key={tx.id}
                  className={`flex-row items-center justify-between py-3.5 ${
                    idx < transactions.length - 1 ? 'border-b border-slate-700/40' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-2xl bg-surface-900 border border-slate-700 items-center justify-center mr-3">
                      <Text className="text-base">{tx.category?.icon || '📦'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-200">
                        {tx.description || tx.category?.name}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {tx.category?.name} • {formattedDate}
                      </Text>
                    </View>
                  </View>

                  <Text
                    className={`text-base font-bold ${
                      isIncome ? 'text-emerald-400' : 'text-slate-100'
                    }`}
                  >
                    {isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString('es-AR')}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};
