import React from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface CategorySummary {
  name: string;
  icon: string | null;
  total: number;
  type: string;
}

interface SpendingChartProps {
  categories: CategorySummary[];
  totalExpense: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#2563EB',
  Transporte: '#7C3AED',
  Entretenimiento: '#DB2777',
  Salud: '#059669',
  Hogar: '#D97706',
  Otro: '#64748B',
};

const DEFAULT_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#64748B'];

export const SpendingChart: React.FC<SpendingChartProps> = ({ categories, totalExpense }) => {
  const expensesOnly = categories.filter((c) => c.type === 'EXPENSE' && c.total > 0).sort((a, b) => b.total - a.total);

  if (expensesOnly.length === 0 || totalExpense <= 0) {
    return (
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
      }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94A3B8' }}>
          No hay gastos registrados en este período
        </Text>
      </View>
    );
  }

  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  let cumulativeAngle = -Math.PI / 2;

  const arcs = expensesOnly.map((cat, i) => {
    const percentage = cat.total / totalExpense;
    // Add small gap by reducing angle slightly if there's more than one category
    const angle = percentage * 2 * Math.PI - (expensesOnly.length > 1 ? 0.04 : 0);
    
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;

    cumulativeAngle += (percentage * 2 * Math.PI); // increment by true amount for next arc

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    ].join(' ');

    const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

    return {
      pathData,
      color,
      category: cat,
    };
  });

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 2,
    }}>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#0F172A', marginBottom: 2 }}>
        Gastos por Categoría
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
        Este mes
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* SVG Donut Chart */}
        <View style={{ width: size, height: size, position: 'relative' }}>
          <Svg width={size} height={size}>
            <G>
              {arcs.map((arc, idx) => (
                <Path
                  key={idx}
                  d={arc.pathData}
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="butt"
                />
              ))}
            </G>
          </Svg>
        </View>

        {/* Legend */}
        <View style={{ flex: 1, gap: 7 }}>
          {expensesOnly.slice(0, 5).map((cat, i) => {
            const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <View key={cat.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#475569' }} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#0F172A' }}>
                  ${cat.total.toLocaleString('es-AR')}
                </Text>
              </View>
            );
          })}
          {expensesOnly.length > 5 && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              + {expensesOnly.length - 5} categorías más
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
