import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AppDialog, DialogButtonVariant } from '../components/dialog/AppDialog';
import { Toast } from '../components/dialog/Toast';

export interface AlertOptions {
  title: string;
  message?: string;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  confirmText?: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface ToastOptions {
  icon?: React.ReactNode;
  durationMs?: number;
}

interface DialogContextValue {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, options?: ToastOptions) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface ActiveDialogState {
  title: string;
  message?: string;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  primaryText: string;
  primaryVariant: DialogButtonVariant;
  secondaryText?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ActiveDialogState | null>(null);
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    icon?: React.ReactNode;
  }>({ visible: false, message: '' });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        title: options.title,
        message: options.message,
        content: options.content,
        icon: options.icon,
        iconBgColor: options.iconBgColor,
        primaryText: options.confirmText || 'Entendido',
        primaryVariant: 'primary',
        onPrimary: () => {
          setDialog(null);
          resolve();
        },
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        title: options.title,
        message: options.message,
        content: options.content,
        icon: options.icon,
        iconBgColor: options.iconBgColor,
        primaryText: options.confirmText || 'Confirmar',
        primaryVariant: options.destructive ? 'danger' : 'primary',
        secondaryText: options.cancelText || 'Cancelar',
        onPrimary: () => {
          setDialog(null);
          resolve(true);
        },
        onSecondary: () => {
          setDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastState({ visible: true, message, icon: options?.icon });
    toastTimerRef.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, visible: false }));
    }, options?.durationMs ?? 2200);
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, toast }}>
      {children}
      {dialog ? (
        <AppDialog
          visible
          title={dialog.title}
          message={dialog.message}
          content={dialog.content}
          icon={dialog.icon}
          iconBgColor={dialog.iconBgColor}
          primaryText={dialog.primaryText}
          primaryVariant={dialog.primaryVariant}
          onPrimary={dialog.onPrimary}
          secondaryText={dialog.secondaryText}
          onSecondary={dialog.onSecondary}
          onClose={dialog.onSecondary || dialog.onPrimary}
        />
      ) : null}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        icon={toastState.icon}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog debe usarse dentro de un DialogProvider');
  }
  return ctx;
};
