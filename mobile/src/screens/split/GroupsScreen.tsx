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
import { Users, Plus, ChevronRight, CheckCircle, Clock } from 'lucide-react-native';

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

export const GroupsScreen = () => {
  const navigation = useNavigation<any>();

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
      <View className="flex-1 bg-surface-900 justify-center items-center">
        <ActivityIndicator size="large" color="#38bdf8" />
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
            onRefresh={() => {
              setRefreshing(true);
              fetchGroups();
            }}
            tintColor="#38bdf8"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Divisor de Gastos
            </Text>
            <Text className="text-2xl font-bold text-slate-100">Mis Grupos</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsCreateModalOpen(true)}
            activeOpacity={0.8}
            className="bg-brand-500 px-4 py-2.5 rounded-full flex-row items-center shadow-lg shadow-brand-500/20"
          >
            <Plus size={18} color="#0f172a" />
            <Text className="text-slate-950 font-bold text-xs ml-1.5">
              + Nuevo Grupo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Resumen Splitwise */}
        <View className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-5 mb-6 shadow-xl">
          <View className="flex-row items-center mb-2">
            <Users size={18} color="#38bdf8" />
            <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-2">
              Grupos Activos
            </Text>
          </View>
          <Text className="text-3xl font-extrabold text-slate-100 my-1">
            {groups.length} {groups.length === 1 ? 'Grupo' : 'Grupos'}
          </Text>
          <Text className="text-xs text-slate-400 mt-1">
            Organizá viajes, eventos o gastos compartidos con amigos de forma justa.
          </Text>
        </View>

        {/* Lista de Grupos */}
        <View className="mb-24">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Todos tus grupos
          </Text>

          {groups.length === 0 ? (
            <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-8 items-center justify-center my-2">
              <Users size={36} color="#64748b" />
              <Text className="text-slate-300 font-semibold text-base mt-3">
                Aún no tenés grupos
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Toca en "+ Nuevo Grupo" para armar un grupo con amigos.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                activeOpacity={0.7}
                className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-5 mb-3 flex-row items-center justify-between shadow-lg"
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 items-center justify-center mr-3.5">
                    <Users size={22} color="#38bdf8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-100 mb-0.5">
                      {group.name}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {group.members.length} miembros •{' '}
                      {group.members.map((m) => m.user.name.split(' ')[0]).join(', ')}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  {group.isSettled ? (
                    <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex-row items-center mr-2">
                      <CheckCircle size={12} color="#10b981" />
                      <Text className="text-[10px] font-semibold text-emerald-400 ml-1">
                        Saldado
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 flex-row items-center mr-2">
                      <Clock size={12} color="#f59e0b" />
                      <Text className="text-[10px] font-semibold text-amber-400 ml-1">
                        Activo
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={18} color="#64748b" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal para Crear Grupo */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-surface-800 border border-slate-700 rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-100 mb-1">
              Crear Nuevo Grupo
            </Text>
            <Text className="text-xs text-slate-400 mb-4">
              Ejemplos: "Viaje a Mendoza", "Asado del Finde", "Alquiler Dpto"
            </Text>

            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Nombre del grupo"
              placeholderTextColor="#94a3b8"
              style={{ color: '#f8fafc', backgroundColor: '#0f172a' }}
              className="border border-slate-700 rounded-2xl px-4 py-3.5 text-base mb-6 font-medium"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                className="flex-1 py-3 bg-surface-900 border border-slate-700 rounded-xl items-center"
              >
                <Text className="text-slate-300 font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creating}
                className="flex-1 py-3 bg-brand-500 rounded-xl items-center"
              >
                {creating ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text className="text-slate-950 font-bold">Crear Grupo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
