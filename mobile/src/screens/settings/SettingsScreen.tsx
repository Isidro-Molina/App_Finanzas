import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onToggle}
    style={{
      width: 46,
      height: 26,
      borderRadius: 99,
      backgroundColor: on ? '#2563EB' : '#CBD5E1',
      justifyContent: 'center',
    }}
  >
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        position: 'absolute',
        left: on ? 23 : 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      }}
    />
  </TouchableOpacity>
);

const SectionTitle = ({ label }: { label: string }) => (
  <Text
    style={{
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 4,
    }}
  >
    {label}
  </Text>
);

const Row = ({
  icon,
  label,
  right,
  danger,
  border = true,
  onPress,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  danger?: boolean;
  border?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderBottomWidth: border ? 1 : 0,
      borderBottomColor: '#F1F5F9',
    }}
  >
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: danger ? '#FEF2F2' : '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 17 }}>{icon}</Text>
    </View>
    <Text
      style={{
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: danger ? '#EF4444' : '#0F172A',
        flex: 1,
      }}
    >
      {label}
    </Text>
    {right ?? <Text style={{ color: '#CBD5E1', fontSize: 18 }}>›</Text>}
  </TouchableOpacity>
);

export const SettingsScreen = () => {
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('ARS');
  const [budget, setBudget] = useState('5800');

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#0F172A' }}>
            Ajustes
          </Text>
        </View>

        {/* Cuenta */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Cuenta" />
          <View style={{ backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <Row icon="👤" label="Editar perfil" />
            <Row icon="🔐" label="Cambiar contraseña" />
            <Row icon="📧" label="Email vinculado" right={<Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }}>{user?.email || 'usuario@finova.app'}</Text>} border={false} />
          </View>
        </View>

        {/* Presupuesto */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Presupuesto Mensual" />
          <View style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 17 }}>💰</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0F172A', flex: 1 }}>Límite mensual</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748B' }}>$</Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  style={{ width: 64, fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#0F172A', textAlign: 'right', padding: 0 }}
                />
              </View>
            </View>
            
            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>Moneda</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['ARS', 'USD', 'EUR'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: currency === c ? '#2563EB' : '#E2E8F0',
                      backgroundColor: currency === c ? '#EFF6FF' : '#fff',
                    }}
                  >
                    <Text style={{ fontFamily: currency === c ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 13, color: currency === c ? '#2563EB' : '#64748B' }}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Preferencias */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Preferencias" />
          <View style={{ backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <Row icon="🔔" label="Notificaciones" right={<Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />} />
            <Row icon="🔒" label="Face ID / Huella" right={<Toggle on={biometrics} onToggle={() => setBiometrics(!biometrics)} />} />
            <Row icon="🌙" label="Modo oscuro" border={false} right={<Toggle on={darkMode} onToggle={() => setDarkMode(!darkMode)} />} />
          </View>
        </View>

        {/* Categorías */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Categorías" />
          <View style={{ backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <Row icon="🏷️" label="Gestionar categorías" />
            <Row icon="📊" label="Exportar datos (CSV)" border={false} />
          </View>
        </View>

        {/* Soporte */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Soporte" />
          <View style={{ backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <Row icon="❓" label="Centro de ayuda" />
            <Row icon="⭐" label="Calificar la app" />
            <Row icon="📄" label="Términos y privacidad" border={false} />
          </View>
        </View>

        {/* Danger */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
            <Row icon="🚪" label="Cerrar sesión" danger border={false} onPress={logout} />
          </View>
        </View>

        <Text style={{ textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, color: '#CBD5E1', marginBottom: 16 }}>
          Finova v1.0.0 · Hecho con ❤️ en Argentina
        </Text>
      </ScrollView>
    </View>
  );
};
