import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// En emulador Android '10.0.2.2', en iOS simulator 'localhost'.
// Para dispositivo físico, reemplazar con la IP local de tu PC (ej: 'http://192.168.1.50:3000/api/v1')
const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api/v1',
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

export const API_URL = DEFAULT_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar automáticamente el JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@app_finanzas_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error al leer token de AsyncStorage', e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
