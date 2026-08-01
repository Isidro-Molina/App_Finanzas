/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: apunta a todos los archivos que usarán clases de Tailwind
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ── Paleta de colores personalizada para App Finanzas ──────────────
      colors: {
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",  // Primary
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        surface: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
          DEFAULT: "#0f172a",  // Fondo oscuro principal
          card:    "#1e293b",  // Tarjeta / panel
          elevated:"#334155",  // Elemento elevado
          border:  "#475569",  // Bordes
        },
        income:  "#22c55e",  // Verde para ingresos
        expense: "#f43f5e",  // Rojo/rosa para gastos
        warning: "#f59e0b",  // Ámbar para alertas
      },
      // ── Tipografía ───────────────────────────────────────────────────
      fontFamily: {
        sans:  ["Inter_400Regular", "System"],
        medium:["Inter_500Medium", "System"],
        semi:  ["Inter_600SemiBold", "System"],
        bold:  ["Inter_700Bold", "System"],
      },
      // ── Border radius ─────────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
