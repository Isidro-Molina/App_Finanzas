import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// En emulador Android '10.0.2.2', en iOS simulator 'localhost'.
// Para dispositivo físico, reemplazar con la IP local de tu PC (ej: 'http://192.168.1.50:3000/api/v1')
const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api/v1',
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar automáticamente el JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('app_finanzas_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error al leer token de SecureStore', e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de respuesta: manejo de 401 y reintentos para requests GET
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el servidor responde 401 Unauthorized, limpiar la sesión
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('app_finanzas_token');
        await SecureStore.deleteItemAsync('app_finanzas_user');
      } catch (e) {
        console.error('Error al limpiar credenciales tras 401', e);
      }
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return Promise.reject(error);
    }

    const config = error.config as any;
    if (!config || config.method?.toLowerCase() !== 'get') {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    const isNetworkOrTimeout =
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      !error.response;

    if (isNetworkOrTimeout && config.__retryCount < 2) {
      config.__retryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 800 * config.__retryCount));
      return apiClient(config);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
