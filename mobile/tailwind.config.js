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
      // ── Paleta de colores personalizada para App Finanzas (Figma Re-Design) ──
      colors: {
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',  // Finova Primary
          700: '#1D4ED8',  // Finova Darker
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          DEFAULT: '#F8FAFC',  // Fondo claro principal (Light Mode)
          card:    '#ffffff',  // Tarjetas blancas
          border:  '#E2E8F0',  // Bordes sutiles
        },
        income:  '#059669',  // Verde para ingresos (Emerald 600)
        expense: '#EF4444',  // Rojo para gastos (Red 500)
        warning: '#F59E0B',  // Ámbar para alertas
      },
      // ── Tipografía ───────────────────────────────────────────────────
      fontFamily: {
        sans:   ['Inter_400Regular', 'System'],
        medium: ['Inter_500Medium', 'System'],
        semi:   ['Inter_600SemiBold', 'System'],
        bold:   ['Inter_700Bold', 'System'],
        display:      ['Outfit_400Regular', 'System'],
        displayBold:  ['Outfit_700Bold', 'System'],
        displayBlack: ['Outfit_800ExtraBold', 'System'],
      },
      // ── Border radius ─────────────────────────────────────────────────
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
