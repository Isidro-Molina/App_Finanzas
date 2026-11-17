import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
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
  Trash2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { HelpCenterModal, TermsPrivacyModal } from '../../components/settings/SupportSheets';
import { ExportCsvModal } from '../../components/settings/ExportCsvModal';

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
  const { showAlert } = useDialog();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);

  const handleToggleBiometric = async () => {
    if (biometricEnabled) {
      await disableBiometric();
      await showAlert({
        title: 'Biometría desactivada',
        message: 'El acceso biométrico fue desactivado.',
        icon: <Fingerprint size={22} color={colors.brand} />,
      });
    } else {
      const available = await isBiometricAvailable();
      if (!available) {
        await showAlert({
          title: 'No disponible',
          message: 'Tu dispositivo no soporta o no tiene configurada la autenticación biométrica (Face ID / Huella).',
          icon: <Fingerprint size={22} color={colors.brand} />,
        });
        return;
      }
      const success = await enableBiometric();
      if (success) {
        await showAlert({
          title: 'Acceso biométrico activo',
          message: 'El inicio de sesión biométrico fue activado correctamente.',
          icon: <Fingerprint size={22} color="#059669" />,
          iconBgColor: '#ECFDF5',
        });
      }
    }
  };

  const handleDeleteAccount = () => {
    navigation.navigate('DeleteAccount');
  };

  const handleExportCsv = () => {
    setExportVisible(true);
  };

  const handleHelpCenter = () => {
    setHelpVisible(true);
  };

  const handleRateApp = async () => {
    try {
      const canReview = await StoreReview.hasAction();
      if (canReview) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // Fallback a link de App Store si esta disponible
    }

    const appStoreId = Constants.expoConfig?.extra?.appStoreId as string | undefined;
    if (appStoreId) {
      const url = `itms-apps://apps.apple.com/app/id${appStoreId}?action=write-review`;
      await Linking.openURL(url).catch(() => {});
      return;
    }

    await showAlert({
      title: 'Calificar Finova',
      message: '¡Gracias por usar Finova! La calificación directa en el App Store va a estar disponible después del lanzamiento.',
      icon: <Star size={22} color="#F59E0B" />,
      iconBgColor: '#FEF3C7',
    });
  };

  const handleTerms = () => {
    setTermsVisible(true);
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
              label="Email"
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
          <SectionTitle label="Categorías y Datos" />
          <View style={cardStyle}>
            <Row icon={Tag} label="Gestionar categorías" onPress={() => navigation.navigate('ManageCategories')} />
            <Row
              icon={BarChart2}
              label="Exportar datos (CSV)"
              border={false}
              onPress={handleExportCsv}
            />
          </View>
        </View>

        {/* Soporte */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <SectionTitle label="Soporte" />
          <View style={cardStyle}>
            <Row icon={HelpCircle} label="Centro de ayuda" onPress={handleHelpCenter} />
            <Row icon={Star} label="Calificar la app" onPress={handleRateApp} />
            <Row icon={FileText} label="Términos y privacidad" border={false} onPress={handleTerms} />
          </View>
        </View>

        {/* Sesión */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <View style={cardStyle}>
            <Row icon={LogOut} label="Cerrar sesión" border={false} onPress={logout} />
          </View>
        </View>

        {/* Zona de peligro */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <SectionTitle label="Zona de peligro" />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 10, paddingHorizontal: 4 }}>
            Esta acción elimina tu cuenta y todos tus datos personales de forma permanente.
          </Text>
          <View style={cardStyle}>
            <Row
              icon={Trash2}
              label="Eliminar cuenta"
              danger
              border={false}
              onPress={handleDeleteAccount}
            />
          </View>
        </View>

        <Text style={{ textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 16 }}>
          Finova v1.0.0
        </Text>
      </ScrollView>

      <HelpCenterModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
      <TermsPrivacyModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
      <ExportCsvModal visible={exportVisible} onClose={() => setExportVisible(false)} />
    </View>
  );
};
