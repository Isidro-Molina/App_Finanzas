import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { AddGroupExpenseScreen } from './AddGroupExpenseScreen';
import {
  ArrowLeft,
  Plus,
  UserPlus,
  Receipt,
  Scale,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react-native';

interface Member {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface GroupDetail {
  id: string;
  name: string;
  isSettled: boolean;
  members: Member[];
  createdBy: {
    name: string;
  };
}

interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  paidBy: {
    id: string;
    name: string;
  };
}

interface DebtTransaction {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

interface BalanceData {
  isSettled: boolean;
  balances: Array<{
    userId: string;
    name: string;
    net: number;
  }>;
  transactions: DebtTransaction[];
}

export const GroupDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCE'>('EXPENSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchData = async () => {
    try {
      const [groupRes, expRes, balRes] = await Promise.all([
        apiClient.get(`/groups/${groupId}`),
        apiClient.get(`/groups/${groupId}/expenses`),
        apiClient.get(`/groups/${groupId}/balance`),
      ]);

      setGroup(groupRes.data);
      setExpenses(expRes.data);
      setBalance(balRes.data);
    } catch (e) {
      console.error('Error al cargar grupo:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [groupId]),
  );

  const handleInviteMember = async () => {
    if (!memberEmail || !memberEmail.includes('@')) {
      Alert.alert('Email inválido', 'Ingresá un correo electrónico válido');
      return;
    }

    setInviting(true);
    try {
      await apiClient.post(`/groups/${groupId}/members`, { email: memberEmail.trim() });
      Alert.alert('¡Éxito!', 'Miembro agregado al grupo');
      setMemberEmail('');
      setIsAddMemberOpen(false);
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al invitar al miembro';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setInviting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface-900 justify-center items-center">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-900 pt-12">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-surface-800 border border-slate-700 items-center justify-center"
        >
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View className="items-center flex-1 mx-3">
          <Text className="text-xl font-bold text-slate-100 numberOfLines={1}">
            {group?.name}
          </Text>
          <Text className="text-xs text-slate-400">
            {group?.members.length} integrantes
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddMemberOpen(true)}
          className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/40 items-center justify-center"
        >
          <UserPlus size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Tabs Selector */}
      <View className="flex-row px-5 mb-4">
        <View className="flex-row flex-1 bg-surface-800 p-1.5 rounded-2xl border border-slate-700">
          <TouchableOpacity
            onPress={() => setActiveTab('EXPENSES')}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
              activeTab === 'EXPENSES' ? 'bg-brand-500' : ''
            }`}
          >
            <Receipt
              size={16}
              color={activeTab === 'EXPENSES' ? '#0f172a' : '#94a3b8'}
            />
            <Text
              className={`text-xs font-bold ml-2 ${
                activeTab === 'EXPENSES' ? 'text-slate-950' : 'text-slate-400'
              }`}
            >
              Gastos ({expenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('BALANCE')}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
              activeTab === 'BALANCE' ? 'bg-brand-500' : ''
            }`}
          >
            <Scale
              size={16}
              color={activeTab === 'BALANCE' ? '#0f172a' : '#94a3b8'}
            />
            <Text
              className={`text-xs font-bold ml-2 ${
                activeTab === 'BALANCE' ? 'text-slate-950' : 'text-slate-400'
              }`}
            >
              Saldos & Deudas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#38bdf8"
          />
        }
      >
        {activeTab === 'EXPENSES' ? (
          /* TAB DE GASTOS */
          <View className="mb-24">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Historial de Tickets
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddGroupExpense', { groupId })}
                className="bg-brand-500 px-3.5 py-2 rounded-full flex-row items-center shadow-lg shadow-brand-500/20"
              >
                <Plus size={16} color="#0f172a" />
                <Text className="text-slate-950 font-bold text-xs ml-1">
                  Cargar Gasto
                </Text>
              </TouchableOpacity>
            </View>

            {expenses.length === 0 ? (
              <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-8 items-center justify-center my-4">
                <Receipt size={36} color="#64748b" />
                <Text className="text-slate-300 font-semibold text-base mt-3">
                  No hay gastos cargados
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Hacé clic en "+ Cargar Gasto" para agregar la primera compra del grupo.
                </Text>
              </View>
            ) : (
              expenses.map((exp) => (
                <View
                  key={exp.id}
                  className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-base font-bold text-slate-100 flex-1 mr-2">
                      {exp.description}
                    </Text>
                    <Text className="text-lg font-bold text-brand-400">
                      ${Number(exp.amount).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400">
                    Pagó <Text className="text-slate-200 font-medium">{exp.paidBy.name}</Text> •{' '}
                    {new Date(exp.date).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          /* TAB DE SALDOS & ALGORITMO */
          <View className="mb-24">
            {/* Estado de Saldado */}
            {balance?.isSettled ? (
              <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 items-center justify-center mb-5">
                <CheckCircle2 size={40} color="#10b981" />
                <Text className="text-emerald-400 font-bold text-lg mt-2">
                  ¡El grupo está completamente saldado!
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Nadie le debe nada a nadie en este momento.
                </Text>
              </View>
            ) : (
              /* Lista de transferencias mínimas sugeridas */
              <View className="mb-6">
                <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Transferencias sugeridas para saldar
                </Text>
                {balance?.transactions.map((tx, idx) => (
                  <View
                    key={idx}
                    className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-4 mb-3 flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-bold text-rose-400">
                          {tx.from.name}
                        </Text>
                        <ArrowRight size={14} color="#94a3b8" className="mx-2" />
                        <Text className="text-sm font-bold text-emerald-400">
                          {tx.to.name}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-400 mt-1">
                        Le debe transferir
                      </Text>
                    </View>
                    <Text className="text-lg font-extrabold text-amber-400">
                      ${tx.amount.toLocaleString('es-AR')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Balances Individuales */}
            <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5">
              <View className="flex-row items-center mb-3">
                <Users size={16} color="#38bdf8" />
                <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-2">
                  Saldos individuales
                </Text>
              </View>

              {balance?.balances.map((b) => {
                const isPositive = b.net > 0;
                const isZero = b.net === 0;

                return (
                  <View
                    key={b.userId}
                    className="flex-row justify-between items-center py-2.5 border-b border-slate-700/30"
                  >
                    <Text className="text-sm font-medium text-slate-200">{b.name}</Text>
                    <Text
                      className={`text-sm font-bold ${
                        isZero
                          ? 'text-slate-400'
                          : isPositive
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isZero
                        ? 'Saldado'
                        : isPositive
                        ? `Le deben +$${b.net.toLocaleString('es-AR')}`
                        : `Debe -$${Math.abs(b.net).toLocaleString('es-AR')}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal para Invitar Miembro */}
      <Modal
        visible={isAddMemberOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddMemberOpen(false)}
      >
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-surface-800 border border-slate-700 rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-100 mb-1">
              Invitar al grupo
            </Text>
            <Text className="text-xs text-slate-400 mb-4">
              Ingresá el correo electrónico con el que se registró la persona.
            </Text>

            <TextInput
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="amigo@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ color: '#f8fafc', backgroundColor: '#0f172a' }}
              className="border border-slate-700 rounded-2xl px-4 py-3.5 text-base mb-6 font-medium"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsAddMemberOpen(false)}
                className="flex-1 py-3 bg-surface-900 border border-slate-700 rounded-xl items-center"
              >
                <Text className="text-slate-300 font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleInviteMember}
                disabled={inviting}
                className="flex-1 py-3 bg-brand-500 rounded-xl items-center"
              >
                {inviting ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text className="text-slate-950 font-bold">Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
