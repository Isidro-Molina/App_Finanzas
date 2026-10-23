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
  loginWithToken: (token: string, user: User) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  isBiometricAvailable: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const TOKEN_KEY = 'app_finanzas_token';
const USER_KEY = 'app_finanzas_user';
const BIOMETRIC_TOKEN_KEY = 'app_finanzas_bio_token';
const BIOMETRIC_USER_KEY = 'app_finanzas_bio_user';
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

    // If biometric is enabled, refresh the stored biometric session
    const bioEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (bioEnabled === 'true') {
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, JSON.stringify(userData));
    }
  }

  async function login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, user: userData } = response.data;
    await saveSession(accessToken, userData);
  }

  /** Used after Google OAuth or any external auth that already has a token */
  async function loginWithToken(accessToken: string, userData: User) {
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
    // User stays enrolled for biometric quick-login if enabled
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

  async function isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  async function enableBiometric(): Promise<boolean> {
    if (!token || !user) return false;

    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá tu identidad para activar el acceso biométrico',
      fallbackLabel: 'Cancelar',
    });

    if (!auth.success) return false;

    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
    await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, JSON.stringify(user));
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    // Clean up any legacy cleartext password keys
    await SecureStore.deleteItemAsync('app_finanzas_bio_pass');
    await SecureStore.deleteItemAsync('app_finanzas_bio_email');
    setBiometricEnabled(true);
    return true;
  }

  async function disableBiometric() {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
    await SecureStore.deleteItemAsync('app_finanzas_bio_pass');
    await SecureStore.deleteItemAsync('app_finanzas_bio_email');
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    setBiometricEnabled(false);
  }

  async function loginWithBiometric(): Promise<boolean> {
    try {
      const bioEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      if (bioEnabled !== 'true') return false;

      const bioToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
      const bioUserStr = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);

      if (!bioToken || !bioUserStr) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verificá tu identidad',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!result.success) return false;

      // Validate token with server to ensure it is still active
      try {
        const verifyRes = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${bioToken}` },
        });
        await saveSession(bioToken, verifyRes.data);
        return true;
      } catch (err) {
        console.warn('Biometric session expired or invalid:', err);
        return false;
      }
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
        loginWithToken,
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
