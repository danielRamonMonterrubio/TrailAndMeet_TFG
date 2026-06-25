import Config from 'react-native-config';
import { supabase } from './supabaseClient';
import { launchImageLibrary } from 'react-native-image-picker';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;
const BUCKET_NAME = 'profile-images';

async function getAuthToken(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (attempt < 2) await new Promise<void>(resolve => setTimeout(() => resolve(), 100 * (attempt + 1)));
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
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export interface Especialidad {
  tipo: string;
  nivel: string;
}

export interface Valoraciones {
  total: number;
  mediaGlobal: number;
  puntualidad: number;
  seguridad: number;
  trato: number;
  preparacion: number;
}

export interface UserProfile {
  id: string;
  nombreUsuario: string;
  nombre: string | null;
  apellido: string | null;
  fechaNacimiento: string | null;
  mostrarEdad: boolean;
  telefono: string | null;
  fotoUrl: string | null;
  especialidades: Especialidad[];
  materialDisponible: string | null;
  descripcion: string | null;
}

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento + 'T12:00:00');
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export interface ExcursionResumen {
  id: number;
  titulo: string;
  dificultad: string;
  tipoExcursion: string;
  fechaInicio: string;
  imagenURL: string | null;
}

export interface UserProfileData {
  profile: UserProfile;
  excursionesAsistidas: ExcursionResumen[];
  excursionesActivas: ExcursionResumen[];
  valoraciones: Valoraciones | null;
}

export interface UpdateProfileData {
  nombreUsuario?: string;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string | null;
  mostrarEdad?: boolean;
  telefono?: string;
  fotoUrl?: string | null;
  especialidades?: Especialidad[];
  materialDisponible?: string;
  descripcion?: string;
}

export interface UserSearchResult {
  id: string;
  nombreUsuario: string;
  nombre: string | null;
  apellido: string | null;
  fotoUrl: string | null;
  especialidades: Especialidad[];
}

export const profileService = {
  async getUserProfile(userId: string): Promise<UserProfileData> {
    return getFunction('get-user-profile', { userId });
  },

  async getOwnProfile(): Promise<UserProfileData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    return getFunction('get-user-profile', { userId: user.id }) as Promise<UserProfileData>;
  },

  async updateProfile(updateData: UpdateProfileData): Promise<void> {
    await callFunction('update-profile', updateData);
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const data = await getFunction('search-users', { query });
    return data.users as UserSearchResult[];
  },

  async pickAndUploadPhoto(): Promise<string | null> {
    return new Promise(resolve => {
      launchImageLibrary(
        { mediaType: 'photo', includeBase64: true, quality: 0.7 },
        async response => {
          if (response.didCancel || !response.assets?.[0]) {
            resolve(null);
            return;
          }
          const asset = response.assets[0];
          if (!asset.base64) {
            resolve(null);
            return;
          }
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { resolve(null); return; }

            const storagePath = `${user.id}/avatar.jpg`;
            const contentType = asset.type ?? 'image/jpeg';

            const binaryString = atob(asset.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const { error } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(storagePath, bytes, { contentType, upsert: true });

            if (error) {
              console.error('Error subiendo foto de perfil:', error);
              resolve(null);
              return;
            }

            const { data: { publicUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(storagePath);

            // Timestamp para cache-busting al sobreescribir el mismo path
            resolve(`${publicUrl}?t=${Date.now()}`);
          } catch (err) {
            console.error('Error en pickAndUploadPhoto:', err);
            resolve(null);
          }
        }
      );
    });
  },

  async deletePhoto(userId: string): Promise<void> {
    const storagePath = `${userId}/avatar.jpg`;
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
  },
};
