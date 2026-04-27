import { supabase } from './supabaseClient';
import Config from 'react-native-config';
import { Excursion } from '../models/Excursion';
import { mapExcursion } from './mappers/excursionMapper';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

export interface JoinResponse {
  success: boolean;
  message: string;
}

export interface LeaveResponse {
  success: boolean;
  message: string;
}

export const excursionInteractionService = {
  async joinExcursion(excursionId: string): Promise<JoinResponse> {
    try {
      console.log('🚀 joinExcursion START:', excursionId);
      const numericId = parseInt(excursionId, 10);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? ANON_KEY;

      const response = await fetch(`${API_URL}/functions/v1/join-excursion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ excursionId: numericId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ joinExcursion COMPLETE');
      return {
        success: true,
        message: data.message || 'Te has unido a la excursión',
      };
    } catch (error) {
      console.error('❌ Error en joinExcursion:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw error;
    }
  },

  async leaveExcursion(excursionId: string): Promise<LeaveResponse> {
    try {
      console.log('🚀 leaveExcursion START:', excursionId);
      const numericId = parseInt(excursionId, 10);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? ANON_KEY;

      const response = await fetch(`${API_URL}/functions/v1/leave-excursion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ excursionId: numericId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ leaveExcursion COMPLETE');
      return {
        success: true,
        message: data.message || 'Has abandonado la excursión',
      };
    } catch (error) {
      console.error('❌ Error en leaveExcursion:', error);
      throw error;
    }
  },

  async getMyExcursions(tipo: 'organizadas' | 'unidas' | 'todas' = 'todas'): Promise<Excursion[]> {
    try {
      console.log('🚀 getMyExcursions START:', tipo);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? ANON_KEY;

      const response = await fetch(`${API_URL}/functions/v1/get-my-excursions?tipo=${tipo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ getMyExcursions COMPLETE:', data.length, 'excursiones');

      // data es un array de excursiones, mapear cada una
      const mapped = (data as any[]).map(mapExcursion);
      return mapped;
    } catch (error) {
      console.error('❌ Error en getMyExcursions:', error);
      throw error;
    }
  },
};
