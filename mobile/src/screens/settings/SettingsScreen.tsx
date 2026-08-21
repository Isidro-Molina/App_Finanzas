import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Lock,
  Mail,
  Bell,
  Fingerprint,
  Moon,
  Tag,
  BarChart2,
  HelpCircle,
  Star,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

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

export const SettingsScreen = () => {
  const { user, logout, biometricEnabled, enableBiometric, disableBiometric, isBiometricAvailable } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState(true);

  const [showBioModal, setShowBioModal] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  
  const handleToggleBiometric = async () => {
    if (biometricEnabled) {
      await disableBiometric();
    } else {
      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert('No disponible', 'Tu dispositivo no soporta o no tiene configurada la autenticación biométrica (Face ID / Huella).');
        return;
      }
      setShowBioModal(true);
    }
  };

  const confirmEnableBiometric = async () => {
    if (!bioPassword) {
      Alert.alert('Error', 'Ingresá tu contraseña para habilitar esta función.');
      return;
    }
    setBioLoading(true);
    try {
      // In a real app, you might want to verify the password against the API first,
      // but the AuthContext will just store it for future logins. 
      await enableBiometric(user?.email || '', bioPassword);
      setShowBioModal(false);
      setBioPassword('');
      Alert.alert('¡Listo!', 'El inicio de sesión biométrico fue activado.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo activar la biometría.');
    } finally {
      setBioLoading(false);
    }
  };

  const SectionTitle = ({ label }: { label: string }) => (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 }}>
      {label}
    </Text>
  );

  const Row = ({
    icon: Icon,
    label,
    right,
    danger = false,
    border = true,
    onPress,
  }: {
    icon: any;
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
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: danger ? '#FEF2F2' : colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={danger ? '#EF4444' : colors.brand} />
      </View>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: danger ? '#EF4444' : colors.textPrimary, flex: 1 }}>
        {label}
      </Text>
      {right ?? <ChevronRight size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  const cardStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 16,
    elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary }}>
            Ajustes
          </Text>
        </View>

        {/* Cuenta */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Cuenta" />
          <View style={cardStyle}>
            <Row icon={User} label="Editar perfil" onPress={() => navigation.navigate('EditProfile')} />
            <Row icon={Lock} label="Cambiar contraseña" onPress={() => navigation.navigate('ChangePassword')} />
            <Row
              icon={Mail}
              label="Email vinculado"
              right={<Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>{user?.email || 'usuario@finova.app'}</Text>}
              border={false}
            />
          </View>
        </View>

        {/* Preferencias */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Preferencias" />
          <View style={cardStyle}>
            <Row icon={Bell} label="Notificaciones" right={<Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />} />
            <Row icon={Fingerprint} label="Face ID / Huella" right={<Toggle on={biometricEnabled} onToggle={handleToggleBiometric} />} />
            <Row icon={Moon} label="Modo oscuro" border={false} right={<Toggle on={isDark} onToggle={toggleTheme} />} />
          </View>
        </View>

        {/* Categorías */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Categorías" />
          <View style={cardStyle}>
            <Row icon={Tag} label="Gestionar categorías" onPress={() => navigation.navigate('ManageCategories')} />
            <Row icon={BarChart2} label="Exportar datos (CSV)" border={false} />
          </View>
        </View>

        {/* Soporte */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Soporte" />
          <View style={cardStyle}>
            <Row icon={HelpCircle} label="Centro de ayuda" />
            <Row icon={Star} label="Calificar la app" />
            <Row icon={FileText} label="Términos y privacidad" border={false} />
          </View>
        </View>

        {/* Danger */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={cardStyle}>
            <Row icon={LogOut} label="Cerrar sesión" danger border={false} onPress={logout} />
          </View>
        </View>

        <Text style={{ textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 16 }}>
          Finova v1.0.0 · Hecho con ❤️ en Argentina
        </Text>
      </ScrollView>

      {/* Password prompt for biometric */}
      <Modal visible={showBioModal} transparent animationType="fade" onRequestClose={() => setShowBioModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 8 }}>
              Habilitar Face ID / Huella
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              Por seguridad, ingresá tu contraseña actual para autorizar el inicio de sesión biométrico.
            </Text>
            
            <TextInput
              value={bioPassword}
              onChangeText={setBioPassword}
              placeholder="Tu contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
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
                onPress={() => { setShowBioModal(false); setBioPassword(''); }}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.bgSubtle, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEnableBiometric}
                disabled={bioLoading}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center' }}
              >
                {bioLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Confirmar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
