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

const PALETTE = [
  '#38bdf8', // sky-400
  '#f43f5e', // rose-500
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
];

export const SpendingChart: React.FC<SpendingChartProps> = ({ categories, totalExpense }) => {
  // Filtrar solo gastos para el gráfico de "dónde se va tu plata"
  const expensesOnly = categories.filter((c) => c.type === 'EXPENSE' && c.total > 0);

  if (expensesOnly.length === 0 || totalExpense <= 0) {
    return (
      <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-6 items-center justify-center my-4">
        <Text className="text-slate-400 text-sm text-center">
          No hay gastos registrados en este período
        </Text>
      </View>
    );
  }

  // Generar arcos SVG para el gráfico de dona
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = -Math.PI / 2;

  const arcs = expensesOnly.map((cat, i) => {
    const percentage = cat.total / totalExpense;
    const angle = percentage * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;

    cumulativeAngle += angle;

    // Calcular coordenadas del arco
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    ].join(' ');

    return {
      pathData,
      color: PALETTE[i % PALETTE.length],
      percentage: (percentage * 100).toFixed(1),
      category: cat,
    };
  });

  return (
    <View className="bg-surface-800/80 border border-slate-700/50 rounded-3xl p-5 my-4 shadow-xl">
      <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        ¿Dónde se va tu plata?
      </Text>

      <View className="flex-row items-center justify-around">
        {/* SVG Donut Chart */}
        <View className="items-center justify-center relative">
          <Svg width={size} height={size}>
            <G>
              {arcs.map((arc, idx) => (
                <Path
                  key={idx}
                  d={arc.pathData}
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </G>
          </Svg>
          <View className="absolute items-center justify-center">
            <Text className="text-xs text-slate-400">Gastos</Text>
            <Text className="text-base font-bold text-rose-400">
              ${totalExpense.toLocaleString('es-AR')}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View className="flex-1 ml-4 justify-center">
          {expensesOnly.slice(0, 5).map((cat, i) => (
            <View key={cat.name} className="flex-row items-center my-1">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <Text className="text-xs text-slate-300 flex-1 numberOfLines={1}">
                {cat.icon ? `${cat.icon} ` : ''}
                {cat.name}
              </Text>
              <Text className="text-xs font-semibold text-slate-200 ml-1">
                ${cat.total.toLocaleString('es-AR')}
              </Text>
            </View>
          ))}
          {expensesOnly.length > 5 && (
            <Text className="text-xs text-slate-500 mt-1">
              + {expensesOnly.length - 5} categorías más
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
