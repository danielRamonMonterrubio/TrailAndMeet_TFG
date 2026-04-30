import { supabase } from './supabaseClient';
import Config from 'react-native-config';

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

export interface UpdateExcursionParams {
  excursionId: string;
  titulo?: string;
  capacidad?: number;
  dificultad?: string;
  tipoExcursion?: string;
  puntoEncuentro?: string;
  meetingLat?: number;
  meetingLng?: number;
  imagenURL?: string;
}

export const excursionManagementService = {
  async updateExcursion(params: UpdateExcursionParams): Promise<void> {
    const { excursionId, ...fields } = params;
    await callFunction('update-excursion', {
      excursionId: parseInt(excursionId, 10),
      ...fields,
    });
  },

  async deleteExcursion(excursionId: string): Promise<void> {
    await callFunction('delete-excursion', { excursionId: parseInt(excursionId, 10) });
  },

  async finishExcursion(excursionId: string): Promise<void> {
    await callFunction('finish-excursion', { excursionId: parseInt(excursionId, 10) });
  },
};
