import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import {
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTheme } from '../../context/ThemeContext';

const HELP_SECTIONS = [
  {
    key: 'finances',
    title: 'Finanzas personales',
    body: 'Registrá tus ingresos y gastos diarios por categoría. Podés navegar entre meses anteriores para revisar tu historial o editar cualquier movimiento tocándolo en la lista.',
  },
  {
    key: 'groups',
    title: 'Grupos y gastos compartidos',
    body: 'Creá grupos con amigos, viajes o pareja. Al cargar un gasto grupal elegís quién pagó y cómo se divide (partes iguales o montos personalizados). Si el gasto es en moneda extranjera, cada miembro puede saldar en ARS o en la moneda original.',
  },
  {
    key: 'rates',
    title: 'Cotizaciones y moneda extranjera',
    body: 'Al cargar un gasto podés elegir Dólar Tarjeta, Blue, MEP, Oficial o Euro. La cotización se actualiza automáticamente y podés ingresar el monto en pesos o en moneda extranjera según te resulte más cómodo.',
  },
  {
    key: 'budgets',
    title: 'Límites por categoría',
    body: 'Definí un tope máximo mensual para cualquier categoría de gasto. Finova te muestra cuánto llevás consumido y cuánto te queda disponible en el mes.',
  },
];

export const HelpCenterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const [openKey, setOpenKey] = useState<string | null>('finances');

  const handleContactSupport = () => {
    Linking.openURL('mailto:soporte@finova.app?subject=Consulta%20Finova').catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 36,
            maxHeight: '85%',
            borderTopWidth: isDark ? 1 : 0,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={20} color={colors.brand} />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 19, color: colors.textPrimary }}>
                Centro de Ayuda
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ gap: 10 }}>
              {HELP_SECTIONS.map((sec) => {
                const isOpen = openKey === sec.key;
                return (
                  <View
                    key={sec.key}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isOpen ? `${colors.brand}50` : colors.border,
                      backgroundColor: colors.bgInput,
                      overflow: 'hidden',
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setOpenKey(isOpen ? null : sec.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 14,
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, flex: 1 }}>
                        {sec.title}
                      </Text>
                      {isOpen ? (
                        <ChevronUp size={18} color={colors.brand} />
                      ) : (
                        <ChevronDown size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                    {isOpen ? (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                          {sec.body}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={handleContactSupport}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.brand,
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Mail size={17} color="#FFFFFF" />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
              Escribir a soporte
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const TermsPrivacyModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const privacyPolicyUrl = Constants.expoConfig?.extra?.privacyPolicyUrl as string | undefined;

  const handleOpenPolicy = async () => {
    if (privacyPolicyUrl) {
      await WebBrowser.openBrowserAsync(privacyPolicyUrl);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 36,
            maxHeight: '85%',
            borderTopWidth: isDark ? 1 : 0,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#059669" />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 19, color: colors.textPrimary }}>
                Términos y Privacidad
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: colors.bgInput, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 4 }}>
                  Protección de tus datos
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                  Tus movimientos, presupuestos y credenciales viajan cifrados mediante HTTPS y se almacenan de forma segura. No vendemos ni compartimos tu información financiera con terceros.
                </Text>
              </View>

              <View style={{ backgroundColor: colors.bgInput, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 4 }}>
                  Grupos compartidos
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                  Solo los miembros activos de un grupo pueden ver los gastos registrados en ese grupo. Tu actividad personal es completamente privada.
                </Text>
              </View>

              <View style={{ backgroundColor: colors.bgInput, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 4 }}>
                  Control total de tu cuenta
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                  Podés exportar tus movimientos en CSV o solicitar la eliminación permanente de tu cuenta en cualquier momento desde Ajustes.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={{ gap: 10 }}>
            {privacyPolicyUrl ? (
              <TouchableOpacity
                onPress={handleOpenPolicy}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.bgSubtle,
                  borderRadius: 14,
                  paddingVertical: 13,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <ExternalLink size={16} color={colors.brand} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.brand }}>
                  Ver política completa
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={{
                backgroundColor: colors.brand,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
