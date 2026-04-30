import { supabase } from './supabaseClient';
import Config from 'react-native-config';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

export interface ExcursionDetail {
  id: string;
  title: string;
  difficulty: string;
  type: string;
  date: string;
  time: string;
  fechaInicio: Date;
  meetingPoint: string;
  meetingLat: number;
  meetingLng: number;
  organizerName: string;
  organizerId: string;
  capacity: number;
  availableSpots: number;
  acceptedCount: number;
  pendingCount: number;
  isOrganizer: boolean;
  isJoined: boolean;
  myParticipationStatus: 'pending' | 'accepted' | null;
  attendanceConfirmed: boolean;
  imageUrl?: string;
  gpxPath: string;
  distanciaTotal: number;
  elevacionMaxima: number;
  elevacionMinima: number;
  desnivelPositivo: number;
  status: string;
}

export const excursionDetailService = {
  async getExcursionDetail(excursionId: string): Promise<ExcursionDetail> {
    try {
      console.log('📖 getExcursionDetail START:', excursionId);
      const numericId = parseInt(excursionId, 10);

      // Obtener token con reintento si es necesario
      let token: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          token = session.access_token;
          break;
        }
        // Si no hay sesión en el primer intento, esperar un poco y reintentar
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
      
      // Si aún no hay token, usar ANON_KEY
      token = token || ANON_KEY;
      
      console.log('🔑 Token type:', token === ANON_KEY ? 'ANON' : 'AUTH');

      const response = await fetch(`${API_URL}/functions/v1/get-excursion-detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ excursionId: numericId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const excursionData = await response.json();

      console.log('📦 Raw excursionData from backend:', {
        isOrganizer: excursionData.isOrganizer,
        creadoPor: excursionData.creadoPor,
        userId: excursionData.userId,
        id: excursionData.id,
      });

      const fecha = new Date(excursionData.fechaInicio);
      const dateStr = fecha.toISOString().split('T')[0];
      const timeStr = fecha.toTimeString().split(' ')[0].substring(0, 5);

      const result: ExcursionDetail = {
        id: String(excursionData.id),
        title: excursionData.titulo,
        difficulty: excursionData.dificultad,
        type: excursionData.tipoExcursion,
        date: dateStr,
        time: timeStr,
        fechaInicio: fecha,
        meetingPoint: excursionData.puntoEncuentro,
        meetingLat: excursionData.meetingLat,
        meetingLng: excursionData.meetingLng,
        organizerName: excursionData.organizador_nombre || 'Desconocido',
        organizerId: excursionData.creadoPor ?? '',
        capacity: excursionData.capacidad,
        availableSpots: excursionData.availableSpots ?? 0,
        acceptedCount: excursionData.acceptedCount ?? 0,
        pendingCount: excursionData.pendingCount ?? 0,
        isOrganizer: !!excursionData.isOrganizer,
        isJoined: !!excursionData.isJoined,
        myParticipationStatus: excursionData.myParticipationStatus ?? null,
        attendanceConfirmed: !!excursionData.attendanceConfirmed,
        imageUrl: excursionData.imagenURL,
        gpxPath: excursionData.GPXPath,
        distanciaTotal: excursionData.distancia_total || 0,
        elevacionMaxima: excursionData.elevacion_maxima || 0,
        elevacionMinima: excursionData.elevacion_minima || 0,
        desnivelPositivo: excursionData.desnivel_positivo || 0,
        status: excursionData.status,
      };

      console.log('✅ Excursion detail processed:', {
        id: result.id,
        isOrganizer: result.isOrganizer,
        title: result.title,
      });

      console.log('✅ getExcursionDetail COMPLETE');
      return result;
    } catch (error) {
      console.error('❌ Error en getExcursionDetail:', error);
      throw error;
    }
  },

  async downloadGpxFile(gpxPath: string): Promise<string> {
    try {
      console.log('📖 downloadGpxFile START:', gpxPath);

      // Usar URL pública directa (sin Edge Function pesada)
      console.log('🔑 Obteniendo sesión...');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Sin sesión');
      }

      // Generar URL pública del archivo
      console.log('🌐 Generando URL pública...');
      const { data: publicUrl } = supabase.storage
        .from('gpx-files')
        .getPublicUrl(gpxPath);

      if (!publicUrl?.publicUrl) {
        throw new Error('No public URL');
      }

      console.log('✅ URL pública obtenida');

      // Descargar GPX
      console.log('📥 Descargando...');
      const downloadRes = await fetch(publicUrl.publicUrl);
      console.log('📨 Status:', downloadRes.status);

      if (!downloadRes.ok) {
        throw new Error(`Download failed: ${downloadRes.status}`);
      }

      const gpxText = await downloadRes.text();
      console.log('✅ Descargado, longitud:', gpxText.length);

      if (!gpxText) {
        throw new Error('Empty GPX');
      }

      console.log('✅ downloadGpxFile COMPLETE');
      return gpxText;
    } catch (error) {
      console.error('❌ Error descargando GPX:', error);
      throw error;
    }
  },
};

export default excursionDetailService;
