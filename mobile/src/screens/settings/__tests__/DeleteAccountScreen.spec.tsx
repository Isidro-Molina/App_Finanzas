import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { DeleteAccountScreen } from '../DeleteAccountScreen';
import apiClient from '../../../api/client';

jest.mock('../../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    disableBiometric: jest.fn(),
    biometricEnabled: false,
    isBiometricAvailable: jest.fn().mockResolvedValue(false),
  }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      bg: '#F8FAFC',
      bgCard: '#FFFFFF',
      bgInput: '#F8FAFC',
      brand: '#2563EB',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
    },
  }),
}));

jest.mock('../../../context/DialogContext', () => ({
  useDialog: () => ({
    showAlert: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  AlertTriangle: () => null,
  ShieldAlert: () => null,
  Trash2: () => null,
  Lock: () => null,
}));

jest.mock('../../../components/Spinner', () => ({
  Spinner: () => null,
}));

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mantiene el boton deshabilitado sin ELIMINAR exacto y lo habilita tras cuenta regresiva de 3s', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { canDelete: true, hasPassword: true, blockers: [] },
    });
    (apiClient.delete as jest.Mock).mockResolvedValue({ data: { message: 'ok' } });

    await render(<DeleteAccountScreen />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ELIMINAR')).toBeTruthy();
    });

    const deleteBtn = screen.getByText('Eliminar cuenta permanentemente');
    expect(deleteBtn).toBeTruthy();
    await fireEvent.press(deleteBtn);
    expect(apiClient.delete).not.toHaveBeenCalled();

    // Escribir ELIMINAR y contraseña
    await fireEvent.changeText(screen.getByPlaceholderText('ELIMINAR'), 'ELIMINAR');
    await fireEvent.changeText(screen.getByPlaceholderText('Ingresá tu contraseña'), 'secreto123');

    // Inicia cuenta regresiva en 3
    expect(screen.getByText('Eliminar cuenta (3)')).toBeTruthy();

    // Avanzar 3 segundos
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Eliminar cuenta permanentemente')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Eliminar cuenta permanentemente'));
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/users/me', {
        data: { confirmation: 'ELIMINAR', password: 'secreto123' },
      });
    });
  });

  it('muestra bloqueadores si hay deudas en grupos', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        canDelete: false,
        hasPassword: true,
        blockers: [
          {
            groupId: 'g-1',
            groupName: 'Viaje',
            net: -1500,
            message: 'Tenés una deuda pendiente de $1.500 en el grupo "Viaje".',
          },
        ],
      },
    });

    await render(<DeleteAccountScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tenés saldos pendientes en grupos')).toBeTruthy();
      expect(screen.queryByPlaceholderText('ELIMINAR')).toBeNull();
    });
  });
});
