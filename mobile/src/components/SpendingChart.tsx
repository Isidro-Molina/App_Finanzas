import React from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

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

const DEFAULT_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2', '#DC2626', '#65A30D'];

/** Returns the color for a category: prefers the hex stored in `icon`, else palette. */
function getCategoryColor(cat: CategorySummary, index: number): string {
  if (cat.icon && cat.icon.startsWith('#')) return cat.icon;
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ categories, totalExpense }) => {
  const { colors, isDark } = useTheme();

  const expensesOnly = categories
    .filter((c) => c.type === 'EXPENSE' && c.total > 0)
    .sort((a, b) => b.total - a.total);

  const cardStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000' as string,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 16,
    elevation: 2,
  };

  if (expensesOnly.length === 0 || totalExpense <= 0) {
    return (
      <View style={cardStyle}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 2 }}>
          Gastos por Categoría
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>
          No hay gastos registrados en este período
        </Text>
      </View>
    );
  }

  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // ─── Special case: single category → render a full circle ─────────────────
  const isSingleCategory = expensesOnly.length === 1;

  let svgContent: React.ReactNode;

  if (isSingleCategory) {
    const color = getCategoryColor(expensesOnly[0], 0);
    svgContent = (
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    );
  } else {
    let cumulativeAngle = -Math.PI / 2;
    const GAP = 0.04; // small gap between arcs in radians

    const arcs = expensesOnly.map((cat, i) => {
      const percentage = cat.total / totalExpense;
      const sweepAngle = percentage * 2 * Math.PI - GAP;

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sweepAngle;

      cumulativeAngle += percentage * 2 * Math.PI;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      ].join(' ');

      return { pathData, color: getCategoryColor(cat, i), category: cat };
    });

    svgContent = arcs.map((arc, idx) => (
      <Path
        key={idx}
        d={arc.pathData}
        stroke={arc.color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
      />
    ));
  }

  return (
    <View style={cardStyle}>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 2 }}>
        Gastos por Categoría
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        Este mes
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* SVG Donut */}
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <G>{svgContent}</G>
          </Svg>
          {/* Center total */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 13, color: colors.textPrimary }} numberOfLines={1}>
              ${Math.round(totalExpense).toLocaleString('es-AR')}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: colors.textMuted }}>
              total
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={{ flex: 1, gap: 8 }}>
          {expensesOnly.slice(0, 5).map((cat, i) => {
            const color = getCategoryColor(cat, i);
            const pct = Math.round((cat.total / totalExpense) * 100);
            return (
              <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, marginRight: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, flexShrink: 0 }} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary }}>
                    {pct}%
                  </Text>
                </View>
              </View>
            );
          })}
          {expensesOnly.length > 5 && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>
              +{expensesOnly.length - 5} más
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
