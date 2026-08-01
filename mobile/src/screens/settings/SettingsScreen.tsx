import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Sliders, Moon, DollarSign, ShieldCheck, Server } from 'lucide-react-native';
import { API_URL } from '../../api/client';

export const SettingsScreen = () => {
  return (
    <View className="flex-1 bg-surface-900 px-5 pt-12">
      <View className="mb-6">
        <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Preferencias
        </Text>
        <Text className="text-2xl font-bold text-slate-100">Ajustes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preferencias Visuales */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-4">
          <View className="flex-row items-center mb-4">
            <Sliders size={18} color="#38bdf8" />
            <Text className="text-sm font-bold text-slate-200 ml-2 uppercase tracking-wider">
              Apariencia & Moneda
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-2.5 border-b border-slate-700/30">
            <View className="flex-row items-center">
              <Moon size={18} color="#94a3b8" />
              <Text className="text-sm text-slate-300 ml-3">Modo Oscuro</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#334155', true: '#38bdf8' }} />
          </View>

          <View className="flex-row justify-between items-center py-2.5">
            <View className="flex-row items-center">
              <DollarSign size={18} color="#94a3b8" />
              <Text className="text-sm text-slate-300 ml-3">Moneda Principal</Text>
            </View>
            <Text className="text-xs font-bold text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/30">
              ARS ($)
            </Text>
          </View>
        </View>

        {/* Info Servidor / API */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-4">
          <View className="flex-row items-center mb-4">
            <Server size={18} color="#38bdf8" />
            <Text className="text-sm font-bold text-slate-200 ml-2 uppercase tracking-wider">
              Conexión API Backend
            </Text>
          </View>

          <View className="py-1">
            <Text className="text-xs text-slate-400 mb-1">Servidor Base URL:</Text>
            <Text className="text-xs font-mono text-slate-300 bg-surface-900 p-2.5 rounded-xl border border-slate-700/60">
              {API_URL}
            </Text>
          </View>
        </View>

        {/* Versión */}
        <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 mb-24 items-center">
          <ShieldCheck size={24} color="#10b981" />
          <Text className="text-sm font-bold text-slate-200 mt-2">Finanzas & Split App</Text>
          <Text className="text-xs text-slate-400 mt-0.5">Versión 1.0.0 (MVP Full-Stack)</Text>
        </View>
      </ScrollView>
    </View>
  );
};
