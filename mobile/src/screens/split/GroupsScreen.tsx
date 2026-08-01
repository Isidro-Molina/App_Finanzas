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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { Users } from 'lucide-react-native';

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

const AvatarStack = ({ members }: { members: Array<any> }) => {
  const displayMembers = members.slice(0, 3);
  const extra = members.length - 3;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {displayMembers.map((m, i) => (
        <View
          key={i}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            borderWidth: 2,
            borderColor: '#fff',
            marginLeft: i > 0 ? -8 : 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#fff' }}>
            {m.user.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#E2E8F0',
            borderWidth: 2,
            borderColor: '#fff',
            marginLeft: -8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#64748B' }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
};

export const GroupsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

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
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Calculate some dummy balances for Figma visual parity (assuming API doesn't return full balances yet)
  const netBalance = 0; 
  
  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchGroups();
            }}
            tintColor="#2563EB"
          />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#0F172A' }}>
            Grupos
          </Text>
          <TouchableOpacity
            onPress={() => setIsCreateModalOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#2563EB',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, lineHeight: 24, marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Summary pill */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{
            backgroundColor: '#EFF6FF',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748B', marginBottom: 2 }}>Balance neto</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: netBalance >= 0 ? '#059669' : '#EF4444' }}>
                {netBalance >= 0 ? '+' : '-'}${Math.abs(netBalance).toLocaleString('es-AR')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748B', marginBottom: 2 }}>Grupos activos</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#0F172A' }}>
                {groups.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Group cards */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {groups.length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#0F172A', marginBottom: 4 }}>
                Aún no tenés grupos
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                Tocá el "+" para armar un grupo con amigos.
              </Text>
            </View>
          ) : (
            groups.map((g) => {
              // Dummy logic for Figma visual parity (randomly owes or owed)
              const owes = g.id.length % 2 === 0;
              const dummyBalance = 450 * (g.id.length % 3 + 1);

              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 18,
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 16,
                    elevation: 2,
                  }}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Users size={22} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A', marginBottom: 6 }}>
                      {g.name}
                    </Text>
                    <AvatarStack members={g.members} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: owes ? '#EF4444' : '#059669', marginBottom: 2 }}>
                      {owes ? '-' : '+'}${dummyBalance.toLocaleString('es-AR')}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: owes ? '#EF4444' : '#059669' }}>
                      {owes ? 'Debes' : 'Te deben'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        {/* Recent activity */}
        {groups.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A', marginBottom: 12 }}>
              Actividad Reciente
            </Text>
            
            <View style={{ backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' }}>BP</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold' }}>Bruno P.</Text> pagó en Asado
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }}>Hoy</Text>
                </View>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#059669' }}>+$600</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, paddingTop: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' }}>VO</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold' }}>Vos</Text> pagaste en Viaje
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }}>Ayer</Text>
                </View>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#EF4444' }}>-$450</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={isCreateModalOpen} transparent animationType="fade" onRequestClose={() => setIsCreateModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#0F172A', marginBottom: 4 }}>Crear Nuevo Grupo</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748B', marginBottom: 20 }}>Ej: Viaje a Bariloche, Asado...</Text>

            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Nombre del grupo"
              placeholderTextColor="#94A3B8"
              autoFocus
              style={{
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                fontFamily: 'Inter_500Medium',
                color: '#0F172A',
                marginBottom: 24,
                backgroundColor: '#F8FAFC',
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#64748B' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creating}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center' }}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
