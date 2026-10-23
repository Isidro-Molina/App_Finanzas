import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Users, Receipt, BellOff, CheckCheck } from 'lucide-react-native';
import apiClient from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'GROUP_INVITE' | 'GROUP_EXPENSE';
  relatedId: string | null;
  createdAt: string;
  /** Solo en GROUP_INVITE: estado actual de la invitación */
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

interface Props {
  /** Avisa al navegador cuántas notificaciones sin leer hay (para el badge del tab) */
  onUnreadChange?: (count: number) => void;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-AR');
};

export const NotificationsScreen = ({ onUnreadChange }: Props) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<AppNotification[]>('/notifications');
      setItems(res.data);
      onUnreadChange?.(res.data.filter((n) => !n.isRead).length);
    } catch (e) {
      console.error('Error cargando notificaciones', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadChange]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onUnreadChange?.(0);
    } catch (e) {
      console.error('Error marcando como leídas', e);
    }
  };

  const respondInvite = async (n: AppNotification, action: 'accept' | 'reject') => {
    if (!n.relatedId) return;
    setRespondingId(n.id);
    try {
      await apiClient.post(`/groups/${n.relatedId}/invitations/${action}`);
      await load();
      if (action === 'accept') {
        navigation.navigate('Grupos', {
          screen: 'GroupDetail',
          params: { groupId: n.relatedId },
        });
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'No se pudo responder la invitación';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
      load();
    } finally {
      setRespondingId(null);
    }
  };

  const handlePress = async (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      onUnreadChange?.(Math.max(0, unreadCount - 1));
      apiClient.patch(`/notifications/${n.id}/read`).catch((e) => console.error(e));
    }
    // Invitación pendiente o rechazada propia: no hay grupo al que entrar todavía (a menos que sea sugerencia de miembro)
    const isSuggestion = n.title.toLowerCase().includes('sugerencia');
    if (n.type === 'GROUP_INVITE' && n.inviteStatus === 'PENDING' && !isSuggestion) return;
    if (n.relatedId) {
      navigation.navigate('Grupos', {
        screen: 'GroupDetail',
        params: { groupId: n.relatedId, refreshTimestamp: Date.now() },
      });
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const Icon = item.type === 'GROUP_INVITE' ? Users : Receipt;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
        style={{
          flexDirection: 'row',
          gap: 12,
          padding: 14,
          marginBottom: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: item.isRead ? colors.border : colors.brand,
          backgroundColor: item.isRead ? colors.bgCard : colors.brandLight,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.textPrimary }}>{item.title}</Text>
            {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 8 }} />}
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 }}>{item.message}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{timeAgo(item.createdAt)}</Text>

          {item.type === 'GROUP_INVITE' && item.inviteStatus === 'PENDING' && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {respondingId === item.id ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => respondInvite(item, 'accept')}
                    activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => respondInvite(item, 'reject')}
                    activeOpacity={0.8}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted }}>Rechazar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {item.type === 'GROUP_INVITE' && item.inviteStatus === 'ACCEPTED' && (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#059669', marginTop: 8 }}>Ya sos parte del grupo · Tocar para abrir</Text>
          )}
          {item.type === 'GROUP_INVITE' && item.inviteStatus === 'DECLINED' && (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textMuted, marginTop: 8 }}>Invitación rechazada o cancelada</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 28, color: colors.textPrimary }}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckCheck size={16} color={colors.brand} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.brand }}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 }}>
              <BellOff size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textMuted }}>No tenés notificaciones</Text>
            </View>
          }
        />
      )}
    </View>
  );
};
