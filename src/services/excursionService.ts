import { supabase } from "./supabaseClient";
import { Excursion, ExcursionDifficulty, ExcursionType } from "../models/Excursion";
import { mapExcursion } from "./mappers/excursionMapper";
import Config from 'react-native-config';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

async function getAuthToken(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (attempt < 2) await new Promise<void>(resolve => setTimeout(() => resolve(), 100 * (attempt + 1)));
  }
  return ANON_KEY ?? '';
}

async function getFunction(
  name: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  const token = await getAuthToken();
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, String(v)]);
  const qs = new URLSearchParams(entries).toString();
  const url = `${API_URL}/functions/v1/${name}${qs ? '?' + qs : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export interface ExcursionListItem {
  id: string;
  title: string;
  difficulty: ExcursionDifficulty;
  type: ExcursionType;
  date: string;
  time: string;
  meetingPoint: string;
  organizerName: string;
  availableSpots: number;
  imageUrl?: string;
}

function mapToListItem(raw: any): ExcursionListItem {
  const dt = new Date(raw.fechaInicio);
  return {
    id: String(raw.id),
    title: raw.titulo,
    difficulty: raw.dificultad as ExcursionDifficulty,
    type: raw.tipoExcursion as ExcursionType,
    date: dt.toISOString().split('T')[0],
    time: dt.toTimeString().slice(0, 5),
    meetingPoint: raw.puntoEncuentro,
    organizerName: raw.organizerName ?? 'Desconocido',
    availableSpots: raw.availableSpots ?? 0,
    imageUrl: raw.imagenURL ?? undefined,
  };
}

class ExcursionService {
  async getAvailableExcursions(): Promise<Excursion[]> {
    const { data, error } = await supabase.rpc("get_all_excursions");
    console.log("Raw data from RPC:", JSON.stringify(data, null, 2));
    if (error) {
      console.error(error);
      return [];
    }
    if (!data) return [];
    const mapped = (data as any).map(mapExcursion);
    console.log("Mapped excursions:", JSON.stringify(mapped, null, 2));
    return mapped;
  }

  async getFilteredExcursions(params: {
    difficulty?: ExcursionDifficulty;
    type?: ExcursionType;
    offset?: number;
  }): Promise<{ excursions: ExcursionListItem[]; total: number; hasMore: boolean }> {
    const data = await getFunction('get-filtered-excursions', {
      difficulty: params.difficulty,
      type: params.type,
      offset: params.offset ?? 0,
    });
    return {
      excursions: (data.excursions ?? []).map(mapToListItem),
      total: data.total ?? 0,
      hasMore: data.hasMore ?? false,
    };
  }
}

export const excursionService = new ExcursionService();
