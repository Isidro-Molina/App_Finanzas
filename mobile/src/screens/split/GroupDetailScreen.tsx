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
  Image,
} from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/client';
import {
  ArrowLeft,
  UserPlus,
  Receipt,
  Scale,
  ArrowRight,
  CheckCircle2,
  Users,
  Plus,
  X,
  Pencil,
  LogOut,
  Crown,
  Trash2,
  Send,
  Camera,
  ImagePlus,
  Check,
  Clock,
  Eye,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface Member {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: { id: string; name: string; email: string };
}

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  isSettled: boolean;
  members: Member[];
  createdBy: { id?: string; name: string; email?: string };
}

interface SplitItem {
  id: string;
  userId: string;
  amountOwed: string;
  isPaid: boolean;
  user: { id: string; name: string; email?: string };
}

interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  paidById?: string;
  paidBy: { id: string; name: string };
  splits?: SplitItem[];
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
  const { groupId, refreshTimestamp } = route.params || {};
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCE'>('EXPENSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal invitar / sugerir miembro
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Modal editar grupo (solo Admin)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);

  // Modal detalle de gasto
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [togglingSplitId, setTogglingSplitId] = useState<string | null>(null);

  // Modal administrar miembros (solo Admin)
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Array<{ userId: string; user: { name: string; email: string } }>>([]);

  const currentMember = group?.members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  const fetchData = async (showLoadingOverlay = false) => {
    if (showLoadingOverlay) setIsUpdating(true);
    try {
      const [groupRes, expRes, balRes] = await Promise.all([
        apiClient.get(`/groups/${groupId}`),
        apiClient.get(`/groups/${groupId}/expenses`),
        apiClient.get(`/groups/${groupId}/balance`),
      ]);
      setGroup(groupRes.data);
      setExpenses(expRes.data);
      setBalance(balRes.data);

      // Si el modal de detalle de gasto está abierto, actualizarlo con la info nueva
      if (selectedExpense) {
        const updatedExp = (expRes.data as Expense[]).find((e) => e.id === selectedExpense.id);
        if (updatedExp) setSelectedExpense(updatedExp);
      }
    } catch (e) {
      console.error('Error al cargar grupo:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsUpdating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [groupId, refreshTimestamp]),
  );

  const handleOpenEdit = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDesc(group.description || '');
    setEditIcon(group.icon || null);
    setIsEditGroupOpen(true);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Requerimos acceso a tus fotos para elegir una foto del grupo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setEditIcon(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      console.error('Error al seleccionar imagen:', e);
      Alert.alert('Error', 'No se pudo cargar la imagen seleccionada.');
    }
  };

  const handleSaveGroup = async () => {
    if (!editName.trim()) {
      Alert.alert('Nombre requerido', 'El grupo debe tener un nombre.');
      return;
    }
    setSavingGroup(true);
    try {
      await apiClient.patch(`/groups/${groupId}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        icon: editIcon || null,
      });
      setIsEditGroupOpen(false);
      fetchData(true);
      Alert.alert('Éxito', 'Grupo actualizado correctamente');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al actualizar grupo';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleInviteOrSuggest = async () => {
    if (!memberEmail || !memberEmail.includes('@')) {
      Alert.alert('Email inválido', 'Ingresá un correo electrónico válido');
      return;
    }
    setInviting(true);
    try {
      if (isAdmin) {
        await apiClient.post(`/groups/${groupId}/members`, { email: memberEmail.trim() });
        Alert.alert('Invitación enviada', 'El usuario formará parte del grupo cuando acepte la invitación.');
      } else {
        await apiClient.post(`/groups/${groupId}/suggest-member`, { email: memberEmail.trim() });
        Alert.alert('Sugerencia enviada', 'Le notificamos al administrador para que invite a esta persona.');
      }
      setMemberEmail('');
      setIsAddMemberOpen(false);
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al procesar la solicitud';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (targetUserId: string, targetName: string) => {
    Alert.alert(
      'Remover miembro',
      `¿Seguro que querés remover a ${targetName} del grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/groups/${groupId}/members/${targetUserId}`);
              Alert.alert('Éxito', `${targetName} fue removido del grupo.`);
              fetchData();
            } catch (e: any) {
              const msg = e.response?.data?.message || 'No se puede remover al miembro en este momento.';
              Alert.alert('No se pudo remover', Array.isArray(msg) ? msg[0] : msg);
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Abandonar grupo',
      '¿Estás seguro de que querés salir de este grupo? Recordá que si tenés gastos o deudas pendientes no podrás salir hasta saldarlas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abandonar',
          style: 'destructive',
          onPress: async () => {
            setLeavingGroup(true);
            try {
              await apiClient.post(`/groups/${groupId}/leave`);
              Alert.alert('Grupo abandonado', 'Has salido del grupo correctamente.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (e: any) {
              const msg =
                e.response?.data?.message ||
                'No podés abandonar el grupo en este momento. Verificá tu saldo pendiente.';
              Alert.alert('No se pudo abandonar', Array.isArray(msg) ? msg[0] : msg);
            } finally {
              setLeavingGroup(false);
            }
          },
        },
      ],
    );
  };

  const handleToggleSplit = async (splitId: string) => {
    if (!selectedExpense) return;
    setTogglingSplitId(splitId);
    try {
      const res = await apiClient.patch(
        `/groups/${groupId}/expenses/${selectedExpense.id}/splits/${splitId}/toggle-paid`,
      );
      // Actualizar estado del split en el modal y la lista
      setSelectedExpense((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          splits: prev.splits?.map((s) => (s.id === splitId ? { ...s, isPaid: res.data.isPaid } : s)),
        };
      });
      // Sincronizar balances y gastos en segundo plano
      fetchData(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'No se pudo actualizar el estado del pago';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setTogglingSplitId(null);
    }
  };

  const loadInvites = async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get(`/groups/${groupId}/invitations`);
      setPendingInvites(res.data);
    } catch (e) {
      console.error('Error al cargar invitaciones:', e);
    }
  };

  const apiError = (e: any, fallback: string) => {
    const msg = e.response?.data?.message || fallback;
    return Array.isArray(msg) ? msg[0] : msg;
  };

  const handleToggleRole = (targetId: string, name: string, isTargetAdmin: boolean) => {
    Alert.alert(
      isTargetAdmin ? 'Quitar administrador' : 'Hacer administrador',
      isTargetAdmin
        ? `¿Quitarle el rol de administrador a ${name}?`
        : `¿Dar rol de administrador a ${name}? Podrá gestionar el grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await apiClient.patch(`/groups/${groupId}/members/${targetId}/role`, {
                role: isTargetAdmin ? 'MEMBER' : 'ADMIN',
              });
              fetchData();
            } catch (e: any) {
              Alert.alert('No se pudo cambiar el rol', apiError(e, 'Error al cambiar el rol'));
            }
          },
        },
      ],
    );
  };

  const handleCancelInvite = (targetId: string, name: string) => {
    Alert.alert('Cancelar invitación', `¿Cancelar la invitación a ${name}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar invitación',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/groups/${groupId}/invitations/${targetId}`);
            setPendingInvites((prev) => prev.filter((i) => i.userId !== targetId));
          } catch (e: any) {
            Alert.alert('Error', apiError(e, 'No se pudo cancelar la invitación'));
          }
        },
      },
    ]);
  };

  const handleDeleteExpense = () => {
    if (!selectedExpense) return;
    const expenseId = selectedExpense.id;
    Alert.alert('Eliminar gasto', '¿Seguro que querés eliminar este gasto? Se recalcularán los saldos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/groups/${groupId}/expenses/${expenseId}`);
            setSelectedExpense(null);
            fetchData(true);
          } catch (e: any) {
            Alert.alert('Error', apiError(e, 'No se pudo eliminar el gasto'));
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Eliminar grupo',
      'Se eliminará el grupo con todos sus gastos para todos los integrantes. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/groups/${groupId}`);
              setIsManageMembersOpen(false);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('No se pudo eliminar', apiError(e, 'Error al eliminar el grupo'));
            }
          },
        },
      ],
    );
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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 10 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {group?.icon ? (
            <Image
              source={{ uri: group.icon }}
              style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.brand}30` }}>
              <Users size={18} color={colors.brand} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.textPrimary }} numberOfLines={1}>
              {group?.name}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>
              {group?.members.length} integrantes {isAdmin && '· Admin'}
            </Text>
          </View>
        </View>

        {/* Botón Editar Grupo (Solo Admin) */}
        {isAdmin && (
          <TouchableOpacity
            onPress={handleOpenEdit}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Pencil size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Botón Invitar (Admin) o Sugerir (Miembro) */}
        <TouchableOpacity
          onPress={() => setIsAddMemberOpen(true)}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandLight, borderWidth: 1, borderColor: `${colors.brand}30`, alignItems: 'center', justifyContent: 'center' }}
        >
          {isAdmin ? <UserPlus size={18} color={colors.brand} /> : <Send size={16} color={colors.brand} />}
        </TouchableOpacity>

        {/* Botón Detalles del grupo (visible para todos) */}
        <TouchableOpacity
          onPress={() => { setIsManageMembersOpen(true); loadInvites(); }}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Eye size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Botón Agregar gasto (ancho completo) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddGroupExpense', { groupId })}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.brand, shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 }}
        >
          <Plus size={18} color="#fff" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Agregar gasto</Text>
        </TouchableOpacity>
      </View>

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={colors.brand} />}
      >
        {/* Indicador de actualización cuando se sincronizan gastos */}
        {isUpdating && (
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: `${colors.brand}30`, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary }}>
              Actualizando gastos del grupo...
            </Text>
          </View>
        )}

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
              expenses.map((exp) => {
                const isMe = exp.paidBy.id === user?.id;
                return (
                  <TouchableOpacity
                    key={exp.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedExpense(exp)}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                        {isMe ? (
                          <Text style={{ fontFamily: 'Inter_700Bold', color: colors.brand }}>Pagaste vos</Text>
                        ) : (
                          <>
                            Pagó{' '}
                            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>{exp.paidBy.name}</Text>
                          </>
                        )}
                        {' · '}
                        {new Date(exp.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.brand }}>
                        Ver detalle →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
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

      {/* Modal Invitar / Sugerir Miembro (X arriba + Botón de acción único abajo) */}
      <Modal visible={isAddMemberOpen} transparent animationType="fade" onRequestClose={() => setIsAddMemberOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setIsAddMemberOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>
                {isAdmin ? 'Invitar al grupo' : 'Sugerir miembro'}
              </Text>
              <TouchableOpacity onPress={() => setIsAddMemberOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              {isAdmin
                ? 'Ingresá el email de la persona para invitarla directamente.'
                : 'Ingresá el email y le avisaremos al administrador del grupo para que lo sume.'}
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
            <TouchableOpacity onPress={handleInviteOrSuggest} disabled={inviting} style={{ width: '100%', paddingVertical: 14, backgroundColor: colors.brand, borderRadius: 14, alignItems: 'center' }}>
              {inviting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 15 }}>
                  {isAdmin ? 'Invitar integrante' : 'Enviar sugerencia'}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Editar Grupo (X arriba + Botón de acción único abajo + Foto de Galería) */}
      <Modal visible={isEditGroupOpen} transparent animationType="fade" onRequestClose={() => setIsEditGroupOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setIsEditGroupOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>Editar grupo</Text>
              <TouchableOpacity onPress={() => setIsEditGroupOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Selector de foto desde el celular */}
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.bgInput, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 }}
              >
                {editIcon ? (
                  <Image source={{ uri: editIcon }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={26} color={colors.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={handlePickImage} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ImagePlus size={14} color={colors.brand} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.brand }}>
                    {editIcon ? 'Cambiar foto' : 'Subir foto del celular'}
                  </Text>
                </TouchableOpacity>
                {editIcon && (
                  <TouchableOpacity onPress={() => setEditIcon(null)}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#EF4444' }}>
                      Quitar foto
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Nombre (Obligatorio) */}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
              Nombre del grupo *
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Ej: Salidas Fin de Semana"
              placeholderTextColor={colors.textMuted}
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.textPrimary, backgroundColor: colors.bgInput, marginBottom: 14 }}
            />

            {/* Descripción (Opcional) */}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
              Descripción (Opcional)
            </Text>
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Ej: Gastos compartidos de las salidas"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textPrimary, backgroundColor: colors.bgInput, marginBottom: 20, height: 70, textAlignVertical: 'top' }}
            />

            <TouchableOpacity onPress={handleSaveGroup} disabled={savingGroup} style={{ width: '100%', paddingVertical: 14, backgroundColor: colors.brand, borderRadius: 14, alignItems: 'center' }}>
              {savingGroup ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 15 }}>Guardar cambios</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Detalle de Gasto (X arriba + Desglose de Participantes + Marcar Pagado) */}
      <Modal visible={!!selectedExpense} transparent animationType="fade" onRequestClose={() => setSelectedExpense(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setSelectedExpense(null)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 22, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }} onPress={() => {}}>
            {selectedExpense && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.brand, marginBottom: 4 }}>
                      Gasto cargado por {selectedExpense.paidBy.id === user?.id ? 'vos' : selectedExpense.paidBy.name}
                    </Text>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>
                      {selectedExpense.description}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {new Date(selectedExpense.date).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedExpense(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Tarjeta de resumen de pago */}
                <View style={{ backgroundColor: colors.bgInput, borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Monto total</Text>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.brand }}>
                      ${Number(selectedExpense.amount).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Pagado por</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>
                      {selectedExpense.paidBy.id === user?.id ? 'Vos' : selectedExpense.paidBy.name}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}>
                  División entre participantes ({selectedExpense.splits?.length || 0})
                </Text>

                {/* Lista de splits con estado y botón de marcar pagado */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260, marginBottom: 16 }}>
                  {selectedExpense.splits?.map((split) => {
                    const isSplitMe = split.userId === user?.id;
                    // La parte del pagador nace saldada y no se toca.
                    // Solo el deudor ("ya pagué") o quien cargó el gasto ("me pagaron") pueden cambiarla.
                    const isSplitPayer = split.userId === selectedExpense.paidBy.id;
                    const canToggle =
                      !isSplitPayer && (isSplitMe || selectedExpense.paidBy.id === user?.id);

                    return (
                      <View
                        key={split.id}
                        style={{
                          backgroundColor: colors.bgCard,
                          borderWidth: 1,
                          borderColor: colors.borderSubtle,
                          borderRadius: 14,
                          padding: 12,
                          marginBottom: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>
                              {split.user.name} {isSplitMe && '(Tú)'}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                            Le corresponde: ${Number(split.amountOwed).toLocaleString('es-AR')}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {/* Badge de estado */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 8,
                              backgroundColor: split.isPaid ? '#ECFDF5' : '#FEF3C7',
                            }}
                          >
                            {split.isPaid ? <Check size={12} color="#059669" /> : <Clock size={12} color="#D97706" />}
                            <Text
                              style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 11,
                                color: split.isPaid ? '#059669' : '#D97706',
                              }}
                            >
                              {split.isPaid ? 'Pagado' : 'Pendiente'}
                            </Text>
                          </View>

                          {/* Botón para alternar si tiene permisos */}
                          {canToggle && (
                            <TouchableOpacity
                              onPress={() => handleToggleSplit(split.id)}
                              disabled={togglingSplitId === split.id}
                              style={{ paddingVertical: 2, paddingHorizontal: 4 }}
                            >
                              {togglingSplitId === split.id ? (
                                <ActivityIndicator size="small" color={colors.brand} />
                              ) : (
                                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.brand }}>
                                  {split.isPaid ? 'Marcar pendiente' : 'Marcar pagado'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {selectedExpense.paidBy.id === user?.id && (
                  <TouchableOpacity
                    onPress={handleDeleteExpense}
                    style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: isDark ? '#EF444415' : '#FEF2F2', borderWidth: 1.5, borderColor: '#EF444430' }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#EF4444' }}>Eliminar gasto</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Administrar Miembros (X arriba como botón de cierre) */}
      <Modal visible={isManageMembersOpen} transparent animationType="fade" onRequestClose={() => setIsManageMembersOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setIsManageMembersOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>Detalles del grupo</Text>
              <TouchableOpacity onPress={() => setIsManageMembersOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Foto, nombre y descripción */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                {group?.icon ? (
                  <Image source={{ uri: group.icon }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Users size={38} color={colors.brand} />
                  </View>
                )}
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>{group?.name}</Text>
                {group?.description ? (
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                    {group.description}
                  </Text>
                ) : null}
              </View>

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                Integrantes ({group?.members.length ?? 0})
              </Text>
              {group?.members.map((m, idx) => {
                const isMemberAdmin = m.role === 'ADMIN';
                const isMe = m.userId === user?.id;
                return (
                  <View
                    key={m.userId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: idx < group.members.length - 1 ? 1 : 0,
                      borderBottomColor: colors.borderSubtle,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' }}>
                          {m.user.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>
                            {m.user.name} {isMe && '(Tú)'}
                          </Text>
                          {isMemberAdmin && <Crown size={13} color="#F59E0B" />}
                        </View>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                          {m.user.email}
                        </Text>
                      </View>
                    </View>

                    {/* Promover / degradar admin y expulsar (solo admin, no uno mismo) */}
                    {isAdmin && !isMe && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleToggleRole(m.userId, m.user.name, isMemberAdmin)}
                          style={{ padding: 8, backgroundColor: isDark ? '#F59E0B20' : '#FFFBEB', borderRadius: 8 }}
                        >
                          <Crown size={15} color="#F59E0B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(m.userId, m.user.name)}
                          style={{ padding: 8, backgroundColor: isDark ? '#EF444420' : '#FEF2F2', borderRadius: 8 }}
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Invitaciones pendientes (solo admin) */}
              {isAdmin && pendingInvites.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                    Invitaciones pendientes ({pendingInvites.length})
                  </Text>
                  {pendingInvites.map((inv) => (
                    <View key={inv.userId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>{inv.user.name}</Text>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>{inv.user.email}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleCancelInvite(inv.userId, inv.user.name)}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#EF4444' }}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Eliminar grupo (solo admin) */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={handleDeleteGroup}
                  style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444' }}
                >
                  <Trash2 size={16} color="#fff" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>Eliminar grupo</Text>
                </TouchableOpacity>
              )}

              {/* Abandonar grupo */}
              <TouchableOpacity
                onPress={handleLeaveGroup}
                disabled={leavingGroup}
                style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EF444430', backgroundColor: isDark ? '#EF444415' : '#FEF2F2' }}
              >
                {leavingGroup ? (
                  <ActivityIndicator color="#EF4444" />
                ) : (
                  <>
                    <LogOut size={16} color="#EF4444" />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#EF4444' }}>Abandonar grupo</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
