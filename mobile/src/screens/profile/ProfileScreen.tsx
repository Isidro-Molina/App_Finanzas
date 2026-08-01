import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Mail, Calendar, LogOut } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recientemente';

  return (
    <View className="flex-1 bg-surface-900 px-5 pt-12">
      <View className="mb-6">
        <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mi Perfil
        </Text>
        <Text className="text-2xl font-bold text-slate-100">Usuario</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Card Header */}
        <View className="bg-surface-800/90 border border-slate-700/60 rounded-3xl p-6 items-center mb-6 shadow-xl">
          <View className="w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-brand-400">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-slate-100">{user?.name}</Text>
          <Text className="text-sm text-slate-400 mt-0.5">{user?.email}</Text>
        </View>

        {/* Details Card */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-8">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Información de la Cuenta
          </Text>

          <View className="flex-row items-center py-3 border-b border-slate-700/30">
            <UserIcon size={18} color="#94a3b8" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-slate-400">Nombre Completo</Text>
              <Text className="text-sm font-semibold text-slate-200">{user?.name}</Text>
            </View>
          </View>

          <View className="flex-row items-center py-3 border-b border-slate-700/30">
            <Mail size={18} color="#94a3b8" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-slate-400">Correo Electrónico</Text>
              <Text className="text-sm font-semibold text-slate-200">{user?.email}</Text>
            </View>
          </View>

          <View className="flex-row items-center py-3">
            <Calendar size={18} color="#94a3b8" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-slate-400">Miembro Desde</Text>
              <Text className="text-sm font-semibold text-slate-200">{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-rose-500/10 border border-rose-500/30 py-4 rounded-2xl flex-row justify-center items-center mb-24"
        >
          <LogOut size={18} color="#f43f5e" />
          <Text className="text-rose-400 font-bold text-base ml-2">
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
