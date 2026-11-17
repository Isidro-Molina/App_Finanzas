import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BudgetsSection } from '../BudgetsSection';
import apiClient from '../../api/client';

jest.mock('../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      bgCard: '#FFFFFF',
      bgInput: '#F8FAFC',
      bgSubtle: '#F1F5F9',
      brand: '#2563EB',
      brandLight: '#EFF6FF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
    },
  }),
}));

jest.mock('../../context/DialogContext', () => ({
  useDialog: () => ({
    showAlert: jest.fn().mockResolvedValue(undefined),
    showConfirm: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('lucide-react-native', () => ({
  Plus: () => null,
  Trash2: () => null,
  X: () => null,
}));

jest.mock('../Spinner', () => ({
  Spinner: () => null,
}));

describe('BudgetsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [{ id: 'cat-1', name: 'Comida', type: 'EXPENSE' }],
    });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'b-1' } });
  });

  it('mantiene el modal abierto y el boton deshabilitado hasta que onChanged termina de resolver', async () => {
    let resolveRefresh!: () => void;
    const onChanged = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    await render(
      <BudgetsSection budgets={[]} month={11} year={2026} onChanged={onChanged} />,
    );

    // Abrir modal
    await fireEvent.press(screen.getByText('Definir límite'));

    await waitFor(() => {
      expect(screen.getByText('Comida')).toBeTruthy();
    });

    // Seleccionar categoria e ingresar monto con separador de miles
    await fireEvent.press(screen.getByText('Comida'));
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: 50.000'), '50000');
    expect(screen.getByDisplayValue('50.000')).toBeTruthy();

    // Guardar (no hacemos await porque onChanged queda pendiente intencionalmente)
    void fireEvent.press(screen.getByText('Guardar límite'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/budgets', {
        categoryId: 'cat-1',
        amount: '50000.00',
        month: 11,
        year: 2026,
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    // Mientras onChanged no resolvio, el modal sigue abierto y muestra el estado de carga
    expect(screen.getByText('Guardando límite...')).toBeTruthy();
    expect(screen.getByText('Límite de gasto por categoría')).toBeTruthy();

    // Resolver onChanged -> el modal se cierra
    await act(async () => {
      resolveRefresh();
    });

    await waitFor(() => {
      expect(screen.queryByText('Límite de gasto por categoría')).toBeNull();
    });
  });
});
