import { supabase } from './supabaseClient';

export interface CreateExcursionPayload {
  gpxBase64: string;
  p_titulo: string;
  p_dificultad: string;
  p_fecha_inicio: string;
  p_capacidad: number;
  p_tipo_excursion: string;
  p_punto_encuentro: string;
  p_imagen_url: string | null;
  p_gpx_path: string;
  p_status: string;
}

export interface ExcursionResponse {
  success: boolean;
  data: any;
  routeInfo?: {
    startPoint: {
      lat: number;
      lng: number;
      elevation: number | null;
    };
    totalDistance: number;
    maxElevation: number | null;
    minElevation: number | null;
    elevationGain: number;
    totalPoints: number;
  };
}

/**
 * Servicio para crear una excursión con parsing de GPX en Supabase
 * La Edge Function se encarga de:
 * - Parsear el archivo GPX
 * - Extraer coordenadas de inicio
 * - Calcular datos de la ruta (distancia, elevación, etc.)
 * - Validar y crear la excursión
 */
export const excursionCreationService = {
  /**
   * Crea una excursión llamando a la Edge Function parse-and-create-excursion
   * @param payload - Datos de la excursión incluyendo GPX en base64
   * @returns Respuesta con datos de la excursión y información de la ruta
   */
  async createExcursionWithGpx(payload: CreateExcursionPayload): Promise<ExcursionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-responder', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Error al crear la excursión');
      }

      return data as ExcursionResponse;
    } catch (error) {
      throw new Error(
        `Error creando excursión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  },
};

export default excursionCreationService;
