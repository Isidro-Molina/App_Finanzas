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
  Pressable,
} from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, UserPlus, Receipt, Scale, ArrowRight, CheckCircle2, Users, Plus, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface Member {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface GroupDetail {
  id: string;
  name: string;
  isSettled: boolean;
  members: Member[];
  createdBy: { name: string };
}

interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  paidBy: { id: string; name: string };
}

interface DebtTransaction {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

interface BalanceData {
  isSettled: boolean;
  balances: Array<{ userId: string; name: string; net: number }>;
  transactions: DebtTransaction[];
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const GroupDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId } = route.params;
  const { colors, isDark } = useTheme();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCE'>('EXPENSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  useFocusEffect(useCallback(() => { fetchData(); }, [groupId]));

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
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const tabActive = { backgroundColor: colors.brand };
  const tabInactive = { backgroundColor: 'transparent' };

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

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }} numberOfLines={1}>
            {group?.name}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
            {group?.members.length} integrantes
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsAddMemberOpen(true)}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandLight, borderWidth: 1, borderColor: `${colors.brand}30`, alignItems: 'center', justifyContent: 'center' }}
        >
          <UserPlus size={18} color={colors.brand} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('AddGroupExpense', { groupId })}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Members avatars */}
      {group && group.members.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 8, elevation: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {group.members.slice(0, 5).map((m, i) => (
                <View
                  key={m.userId}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], borderWidth: 2, borderColor: colors.bgCard, marginLeft: i > 0 ? -8 : 0, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' }}>
                    {m.user.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, flex: 1 }}>
              {group.members.map((m) => m.user.name.split(' ')[0]).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, padding: 5, borderRadius: 14, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 4, elevation: 1 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('EXPENSES')}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, ...(activeTab === 'EXPENSES' ? tabActive : tabInactive) }}
          >
            <Receipt size={15} color={activeTab === 'EXPENSES' ? '#fff' : colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: activeTab === 'EXPENSES' ? '#fff' : colors.textMuted }}>
              Gastos ({expenses.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('BALANCE')}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, ...(activeTab === 'BALANCE' ? tabActive : tabInactive) }}
          >
            <Scale size={15} color={activeTab === 'BALANCE' ? '#fff' : colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: activeTab === 'BALANCE' ? '#fff' : colors.textMuted }}>
              Saldos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.brand} />}
      >
        {activeTab === 'EXPENSES' ? (
          <View style={{ gap: 8 }}>
            {expenses.length === 0 ? (
              <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 8, elevation: 1 }}>
                <Receipt size={32} color={colors.textMuted} />
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginTop: 12, marginBottom: 4 }}>
                  Sin gastos aún
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  Tocá el "+" para cargar el primer gasto del grupo.
                </Text>
              </View>
            ) : (
              expenses.map((exp) => (
                <View
                  key={exp.id}
                  style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 3, elevation: 1 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: 12 }}>
                      {exp.description}
                    </Text>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.brand }}>
                      ${Number(exp.amount).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                    Pagó{' '}
                    <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>{exp.paidBy.name}</Text>
                    {' · '}
                    {new Date(exp.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Settled status */}
            {balance?.isSettled ? (
              <View style={{ backgroundColor: '#ECFDF5', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                <CheckCircle2 size={36} color="#059669" />
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#059669', marginTop: 8, marginBottom: 4 }}>
                  ¡Grupo completamente saldado!
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#065F46', textAlign: 'center' }}>
                  Nadie le debe nada a nadie en este momento.
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Transferencias sugeridas
                </Text>
                {balance?.transactions.map((tx, idx) => (
                  <View
                    key={idx}
                    style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 3, elevation: 1 }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.expense }}>{tx.from.name}</Text>
                        <ArrowRight size={14} color={colors.textMuted} />
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.income }}>{tx.to.name}</Text>
                      </View>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Le debe transferir</Text>
                    </View>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>
                      ${tx.amount.toLocaleString('es-AR')}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Individual balances */}
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 8, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={15} color={colors.brand} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Saldos individuales
                </Text>
              </View>
              {balance?.balances.map((b, i) => {
                const isPositive = b.net > 0;
                const isZero = b.net === 0;
                return (
                  <View key={b.userId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < (balance.balances.length - 1) ? 1 : 0, borderBottomColor: colors.borderSubtle }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary }}>{b.name}</Text>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: isZero ? colors.textMuted : isPositive ? colors.income : colors.expense }}>
                      {isZero ? 'Saldado' : isPositive ? `Le deben +$${b.net.toLocaleString('es-AR')}` : `Debe -$${Math.abs(b.net).toLocaleString('es-AR')}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={isAddMemberOpen} transparent animationType="fade" onRequestClose={() => setIsAddMemberOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setIsAddMemberOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>Invitar al grupo</Text>
              <TouchableOpacity onPress={() => setIsAddMemberOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              Ingresá el email con el que se registró.
            </Text>
            <TextInput
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="amigo@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.textPrimary, backgroundColor: colors.bgInput, marginBottom: 20 }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setIsAddMemberOpen(false)} style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.bgSubtle, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleInviteMember} disabled={inviting} style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center' }}>
                {inviting ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Agregar</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
