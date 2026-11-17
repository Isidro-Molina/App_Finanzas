import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DialogProvider, useDialog } from '../../../context/DialogContext';

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      bgCard: '#FFFFFF',
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

jest.mock('../../Spinner', () => ({
  Spinner: () => null,
}));

const TestHarness: React.FC<{ onResult: (val: boolean) => void }> = ({ onResult }) => {
  const { showConfirm, toast } = useDialog();

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          void showConfirm({
            title: 'Confirmar accion',
            message: 'Esta accion es de prueba',
            confirmText: 'Aceptar',
            cancelText: 'Volver',
          }).then(onResult);
        }}
      >
        <Text>Abrir confirmacion</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => toast('Guardado con exito', { durationMs: 50 })}>
        <Text>Mostrar toast</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('DialogProvider & AppDialog', () => {
  it('showConfirm resuelve true al presionar confirmar y false al presionar cancelar', async () => {
    const onResult = jest.fn();

    await render(
      <DialogProvider>
        <TestHarness onResult={onResult} />
      </DialogProvider>,
    );

    // 1. Confirmar -> true
    await fireEvent.press(screen.getByText('Abrir confirmacion'));
    expect(screen.getByText('Confirmar accion')).toBeTruthy();

    await fireEvent.press(screen.getByText('Aceptar'));
    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(true);
      expect(screen.queryByText('Confirmar accion')).toBeNull();
    });

    // 2. Cancelar -> false
    await fireEvent.press(screen.getByText('Abrir confirmacion'));
    expect(screen.getByText('Confirmar accion')).toBeTruthy();

    await fireEvent.press(screen.getByText('Volver'));
    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByText('Confirmar accion')).toBeNull();
    });
  });

  it('toast muestra el mensaje en pantalla y se oculta automaticamente', async () => {
    await render(
      <DialogProvider>
        <TestHarness onResult={jest.fn()} />
      </DialogProvider>,
    );

    await fireEvent.press(screen.getByText('Mostrar toast'));
    expect(screen.getByText('Guardado con exito')).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByText('Guardado con exito')).toBeNull();
    });
  });
});
