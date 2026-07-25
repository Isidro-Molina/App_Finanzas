// Importar global.css es obligatorio para que NativeWind v4 procese
// las clases de Tailwind a lo largo de toda la app.
import "./global.css";

import { StatusBar } from "expo-status-bar";
import { Text, View, TouchableOpacity } from "react-native";

/**
 * App.tsx — Pantalla de bienvenida temporal.
 * Sirve como smoke-test de NativeWind:
 * si se ven los colores y estilos correctamente, la integración funciona.
 *
 * ⚠️  Este componente será reemplazado por el sistema de navegación
 *     (Expo Router / React Navigation) cuando se definan las pantallas.
 */
export default function App() {
  return (
    <View className="flex-1 bg-[#0f172a] items-center justify-center px-6">
      <StatusBar style="light" />

      {/* Logo / icono placeholder */}
      <View className="w-20 h-20 rounded-3xl bg-sky-500 items-center justify-center mb-8 shadow-lg">
        <Text className="text-white text-4xl">💸</Text>
      </View>

      {/* Título */}
      <Text className="text-white text-4xl font-bold tracking-tight text-center">
        App Finanzas
      </Text>
      <Text className="text-slate-400 text-base text-center mt-3 leading-relaxed">
        Control de gastos personales{"\n"}y división de gastos en grupo
      </Text>

      {/* Indicadores MVP */}
      <View className="flex-row gap-3 mt-10">
        <View className="bg-[#1e293b] rounded-2xl px-4 py-2 border border-slate-700">
          <Text className="text-green-400 text-sm font-medium">💰 Finanzas</Text>
        </View>
        <View className="bg-[#1e293b] rounded-2xl px-4 py-2 border border-slate-700">
          <Text className="text-sky-400 text-sm font-medium">🤝 Splitwise</Text>
        </View>
      </View>

      {/* CTA placeholder */}
      <TouchableOpacity
        className="mt-12 bg-sky-500 rounded-2xl px-10 py-4 active:opacity-80"
        activeOpacity={0.8}
      >
        <Text className="text-white text-base font-semibold">
          Comenzar →
        </Text>
      </TouchableOpacity>

      {/* Badge de estado NativeWind */}
      <View className="absolute bottom-12 flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-green-400" />
        <Text className="text-slate-500 text-xs">
          NativeWind v4 · Tailwind CSS v3
        </Text>
      </View>
    </View>
  );
}
