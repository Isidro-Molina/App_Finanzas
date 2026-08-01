import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export const ProfileScreen = () => {
  const { user } = useAuth();

  const MONTHLY = [
    { month: 'Feb', value: 3200, color: '#BFDBFE' },
    { month: 'Mar', value: 4100, color: '#BFDBFE' },
    { month: 'Abr', value: 2900, color: '#BFDBFE' },
    { month: 'May', value: 5100, color: '#BFDBFE' },
    { month: 'Jun', value: 3800, color: '#BFDBFE' },
    { month: 'Jul', value: 1300, color: '#2563EB' },
  ];
  const maxVal = Math.max(...MONTHLY.map((m) => m.value));

  const BADGES = [
    { icon: '🏆', label: 'Ahorrador', desc: '3 meses seguidos bajo presupuesto' },
    { icon: '📊', label: 'Analítico', desc: '30 días registrando gastos' },
    { icon: '🤝', label: 'Social', desc: '5 grupos creados' },
  ];

  const SAVINGS = [
    { label: 'Vacaciones 🏖️', current: 12000, goal: 30000, color: '#2563EB' },
    { label: 'Notebook 💻', current: 45000, goal: 60000, color: '#059669' },
  ];

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Hero Section */}
        <LinearGradient
          colors={['#1D4ED8', '#2563EB', '#7C3AED']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, alignItems: 'center' }}
        >
          <View style={{ marginBottom: 16, position: 'relative' }}>
            <LinearGradient
              colors={['#7C3AED', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ fontSize: 34 }}>👩‍💼</Text>
            </LinearGradient>
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 10 }}>✏️</Text>
            </View>
          </View>
          
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 22, color: '#fff', marginBottom: 4 }}>
            {user?.name || 'Ana M. Rodríguez'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
            {user?.email || 'ana.rodriguez@finova.app'}
          </Text>

          {/* Stats row */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 16,
            marginTop: 20,
            width: '100%',
          }}>
            {[
              { label: 'Grupos', value: '3' },
              { label: 'Gastos', value: '47' },
              { label: 'Ahorrado', value: '$2.4k' },
            ].map((s, i) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 18, color: '#fff', marginBottom: 2 }}>{s.value}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Monthly spend bar chart */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A' }}>
                Historial de Gastos
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748B' }}>Últimos 6 meses</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 }}>
              {MONTHLY.map((m) => {
                const height = (m.value / maxVal) * 84;
                return (
                  <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: '100%', height, backgroundColor: m.color, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, marginBottom: 6 }} />
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#94A3B8' }}>{m.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Savings goal */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A' }}>
                Meta de Ahorro
              </Text>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#2563EB' }}>Julio</Text>
            </View>
            
            {SAVINGS.map((g, i) => {
              const pct = Math.round((g.current / g.goal) * 100);
              return (
                <View key={g.label} style={{ marginBottom: i === SAVINGS.length - 1 ? 0 : 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#0F172A' }}>{g.label}</Text>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 13, color: g.color }}>{pct}%</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%`, borderRadius: 4, backgroundColor: g.color }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>
                      ${g.current.toLocaleString('es-AR')}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>
                      ${g.goal.toLocaleString('es-AR')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Badges */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A', marginBottom: 12 }}>
            Logros
          </Text>
          <View style={{ gap: 8 }}>
            {BADGES.map((b) => (
              <View key={b.label} style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}>
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#0F172A', marginBottom: 2 }}>{b.label}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
};
