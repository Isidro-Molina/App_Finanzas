import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import apiClient from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  enableBiometric: (email: string, password: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  isBiometricAvailable: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const TOKEN_KEY = 'app_finanzas_token';
const USER_KEY = 'app_finanzas_user';
const BIOMETRIC_EMAIL_KEY = 'app_finanzas_bio_email';
const BIOMETRIC_PASS_KEY = 'app_finanzas_bio_pass';
const BIOMETRIC_ENABLED_KEY = 'app_finanzas_bio_enabled';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      const bioEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setBiometricEnabled(bioEnabled === 'true');
    } catch (error) {
      console.error('Error restaurando sesión:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSession(accessToken: string, userData: User) {
    setToken(accessToken);
    setUser(userData);
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
  }

  async function login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, user: userData } = response.data;
    await saveSession(accessToken, userData);
  }

  async function register(name: string, email: string, password: string) {
    const response = await apiClient.post('/auth/register', { name, email, password });
    const { accessToken, user: userData } = response.data;
    await saveSession(accessToken, userData);
  }

  async function logout() {
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    // Don't clear biometric credentials on logout — user stays enrolled
  }

  async function refreshProfile() {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.data));
    } catch (e) {
      console.error('Error al refrescar perfil:', e);
    }
  }

  /** Check if device supports biometric auth */
  async function isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  /** Store credentials encrypted → enable biometric login */
  async function enableBiometric(email: string, password: string) {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_PASS_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    setBiometricEnabled(true);
  }

  /** Clear stored biometric credentials */
  async function disableBiometric() {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_PASS_KEY);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    setBiometricEnabled(false);
  }

  /** Authenticate with biometrics, then auto-login using stored credentials */
  async function loginWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verificá tu identidad',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!result.success) return false;

      const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(BIOMETRIC_PASS_KEY);

      if (!email || !password) return false;

      await login(email, password);
      return true;
    } catch (e) {
      console.error('Biometric login failed:', e);
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        biometricEnabled,
        login,
        register,
        logout,
        refreshProfile,
        enableBiometric,
        disableBiometric,
        loginWithBiometric,
        isBiometricAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
