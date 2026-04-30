import { supabase } from './supabaseClient';
import Config from 'react-native-config';
import { Excursion } from '../models/Excursion';
import { mapExcursion } from './mappers/excursionMapper';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

async function getAuthToken(): Promise<string> {
  // Reintento para asegurar que la sesión esté disponible
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('🔑 Auth token obtenido');
      return session.access_token;
    }
    // Esperar un poco antes de reintentar
    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  // Si no hay token autenticado, usar ANON_KEY
  console.warn('⚠️ No hay sesión autenticada, usando ANON_KEY');
  return ANON_KEY ?? '';
}

async function callFunction(name: string, body: object): Promise<any> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export const excursionInteractionService = {
  async requestJoinExcursion(excursionId: string): Promise<void> {
    const numericId = parseInt(excursionId, 10);
    await callFunction('request-join-excursion', { excursionId: numericId });
  },

  async cancelJoinRequest(excursionId: string): Promise<void> {
    const numericId = parseInt(excursionId, 10);
    await callFunction('cancel-join-request', { excursionId: numericId });
  },

  async leaveExcursion(excursionId: string): Promise<void> {
    const numericId = parseInt(excursionId, 10);
    await callFunction('leave-excursion', { excursionId: numericId });
  },

  async confirmAttendance(excursionId: string): Promise<void> {
    const numericId = parseInt(excursionId, 10);
    await callFunction('confirm-attendance', { excursionId: numericId });
  },

  async getMyExcursions(tipo: 'organizadas' | 'unidas' | 'todas' = 'todas'): Promise<Excursion[]> {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/functions/v1/get-my-excursions?tipo=${tipo}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return (data as any[]).map(mapExcursion);
  },
};
