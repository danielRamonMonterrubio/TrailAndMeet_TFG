import { supabase } from './supabaseClient';
import Config from 'react-native-config';

export interface ExcursionDetail {
  id: string;
  title: string;
  difficulty: string;
  type: string;
  date: string;
  time: string;
  meetingPoint: string;
  meetingLat: number;
  meetingLng: number;
  organizerName: string;
  availableSpots: number;
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

      console.log('🔄 Llamando RPC obtener_detalle_excursion...');
      const { data, error } = await supabase.rpc('obtener_detalle_excursion', {
        p_excursion_id: numericId,
      });

      console.log('📨 RPC response:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('❌ Error RPC:', error);
        throw new Error(`Error RPC: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('❌ No data found');
        throw new Error('No se encontró la excursión');
      }

      const excursionData = data[0];
      const fecha = new Date(excursionData.fechaInicio);
      const dateStr = fecha.toISOString().split('T')[0];
      const timeStr = fecha.toTimeString().split(' ')[0].substring(0, 5);

      console.log('✅ RPC data parsed:', { id: excursionData.id, GPXPath: excursionData.GPXPath });

      const result: ExcursionDetail = {
        id: String(excursionData.id),
        title: excursionData.titulo,
        difficulty: excursionData.dificultad,
        type: excursionData.tipoExcursion,
        date: dateStr,
        time: timeStr,
        meetingPoint: excursionData.puntoEncuentro,
        meetingLat: excursionData.meetingLat,
        meetingLng: excursionData.meetingLng,
        organizerName: excursionData.organizador_nombre || 'Desconocido',
        availableSpots: excursionData.capacidad,
        imageUrl: excursionData.imagenURL,
        gpxPath: excursionData.GPXPath,
        distanciaTotal: excursionData.distancia_total || 0,
        elevacionMaxima: excursionData.elevacion_maxima || 0,
        elevacionMinima: excursionData.elevacion_minima || 0,
        desnivelPositivo: excursionData.desnivel_positivo || 0,
        status: excursionData.status,
      };

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
