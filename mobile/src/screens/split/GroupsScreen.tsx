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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { Users, Plus, X } from 'lucide-react-native';

interface Group {
  id: string;
  name: string;
  isSettled: boolean;
  createdAt: string;
  members: Array<{
    user: {
      name: string;
    };
  }>;
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const AvatarStack = ({ members, borderColor }: { members: Array<any>; borderColor: string }) => {
  const visible = members.slice(0, 4);
  const extra = members.length - 4;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <View
          key={i}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            borderWidth: 1.5,
            borderColor,
            marginLeft: i > 0 ? -6 : 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 8, color: '#fff' }}>
            {m.user.name[0].toUpperCase()}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#CBD5E1',
            borderWidth: 1.5,
            borderColor,
            marginLeft: -6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#475569' }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
};

export const GroupsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await apiClient.get('/groups');
      setGroups(res.data);
    } catch (e) {
      console.error('Error al cargar grupos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, []),
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresá un nombre para el grupo');
      return;
    }

    setCreating(true);
    try {
      const res = await apiClient.post('/groups', { name: newGroupName.trim() });
      setNewGroupName('');
      setIsCreateModalOpen(false);
      fetchGroups();
      navigation.navigate('GroupDetail', { groupId: res.data.id });
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al crear el grupo';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setCreating(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const cardShadow = {
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 16,
    elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGroups(); }}
            tintColor={colors.brand}
          />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary }}>
            Grupos
          </Text>
          <TouchableOpacity
            onPress={() => setIsCreateModalOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.brand,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary pill */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{
            backgroundColor: colors.brandLight,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: `${colors.brand}20`,
          }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 2 }}>
                Grupos activos
              </Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.brand }}>
                {groups.length}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 2 }}>
                Participantes totales
              </Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
                {[...new Set(groups.flatMap(g => g.members.map(m => m.user.name)))].length}
              </Text>
            </View>
          </View>
        </View>

        {/* Group cards */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {groups.length === 0 ? (
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, padding: 32, alignItems: 'center', ...cardShadow }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Users size={26} color={colors.brand} />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.textPrimary, marginBottom: 6 }}>
                Aún no tenés grupos
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Tocá el "+" para armar un grupo con amigos y empezar a dividir gastos.
              </Text>
            </View>
          ) : (
            groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 18,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  ...cardShadow,
                }}
              >
                {/* Icon */}
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: colors.brandLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Users size={22} color={colors.brand} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 5 }}>
                    {g.name}
                  </Text>
                  <AvatarStack members={g.members} borderColor={colors.bgCard} />
                </View>

                {/* Settled badge */}
                {g.isSettled && (
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#059669' }}>Saldado</Text>
                  </View>
                )}

                {/* Member count */}
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                  {g.members.length} {g.members.length === 1 ? 'miembro' : 'miembros'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={isCreateModalOpen} transparent animationType="fade" onRequestClose={() => setIsCreateModalOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => setIsCreateModalOpen(false)}
        >
          <Pressable
            style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary }}>
                Crear Nuevo Grupo
              </Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              Ej: Viaje a Bariloche, Asado del finde...
            </Text>

            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Nombre del grupo"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                fontFamily: 'Inter_500Medium',
                color: colors.textPrimary,
                marginBottom: 24,
                backgroundColor: colors.bgInput,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.bgSubtle, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creating}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center' }}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Crear</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
