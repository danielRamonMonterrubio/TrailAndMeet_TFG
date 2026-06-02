import Config from 'react-native-config';
import { supabase } from './supabaseClient';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

async function getAuthToken(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
  }
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

export interface ParticipanteValorable {
  usuarioId: string;
  nombreUsuario: string;
  nombre: string | null;
  apellido: string | null;
  fotoUrl: string | null;
  esOrganizador: boolean;
  yaValorado: boolean;
}

export interface RatingValues {
  puntualidad: number;
  seguridad: number;
  trato: number;
  preparacion: number;
}

export const ratingService = {
  async getExcursionRatings(excursionId: string): Promise<ParticipanteValorable[]> {
    const data = await callFunction('get-excursion-ratings', { excursionId });
    return data.participants as ParticipanteValorable[];
  },

  async rateParticipant(
    excursionId: string,
    evaluadoId: string,
    ratings: RatingValues
  ): Promise<void> {
    await callFunction('rate-participant', {
      excursionId,
      evaluadoId,
      ...ratings,
    });
  },
};
