import { XMLParser } from 'fast-xml-parser';

export interface GpxStartPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
}

export interface GpxRoute {
  startPoint: GpxStartPoint;
  totalPoints: number;
  centerPoint?: GpxStartPoint;
}

/**
 * Decodifica Base64 a string
 * Compatible con React Native y navegadores
 */
const decodeBase64 = (base64: string): string => {
  try {
    // Intentar usar atob si está disponible (navegadores y React Native)
    if (typeof atob !== 'undefined') {
      return atob(base64);
    }
    // Fallback para Node.js/otros ambientes
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    throw new Error('No hay forma de decodificar base64 en este ambiente');
  } catch (error) {
    throw new Error(`Error decodificando base64: ${error instanceof Error ? error.message : 'desconocido'}`);
  }
};

/**
 * Parseador de archivos GPX
 * Extrae información de rutas desde archivos GPX en formato XML
 */
export const gpxParserService = {
  /**
   * Extrae el punto de inicio (primer trackpoint) de un archivo GPX
   * @param gpxBase64 - Contenido del archivo GPX codificado en base64
   * @returns Objeto con coordenadas del primer punto
   * @throws Error si el archivo no es válido o no contiene trackpoints
   */
  extractStartPoint(gpxBase64: string): GpxStartPoint {
    try {
      // Decodificar base64 a string
      const gpxString = decodeBase64(gpxBase64);

      // Parsear XML
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const gpxData = parser.parse(gpxString);

      // Navegar hasta los trackpoints
      const trackpoints = this._extractTrackpoints(gpxData);

      if (!trackpoints || trackpoints.length === 0) {
        throw new Error('No se encontraron puntos de ruta (trackpoints) en el archivo GPX');
      }

      // Obtener el primer punto
      const firstPoint = trackpoints[0];

      return {
        latitude: parseFloat(firstPoint['@_lat']),
        longitude: parseFloat(firstPoint['@_lon']),
        elevation: firstPoint.ele ? parseFloat(firstPoint.ele) : undefined,
        timestamp: firstPoint.time || undefined,
      };
    } catch (error) {
      throw new Error(
        `Error al parsear archivo GPX: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  },

  /**
   * Extrae toda la información de ruta de un archivo GPX
   * @param gpxBase64 - Contenido del archivo GPX codificado en base64
   * @returns Objeto con información de la ruta
   */
  extractRouteInfo(gpxBase64: string): GpxRoute {
    try {
      const gpxString = decodeBase64(gpxBase64);

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const gpxData = parser.parse(gpxString);
      const trackpoints = this._extractTrackpoints(gpxData);

      if (!trackpoints || trackpoints.length === 0) {
        throw new Error('No se encontraron puntos de ruta en el archivo GPX');
      }

      const startPoint: GpxStartPoint = {
        latitude: parseFloat(trackpoints[0]['@_lat']),
        longitude: parseFloat(trackpoints[0]['@_lon']),
        elevation: trackpoints[0].ele ? parseFloat(trackpoints[0].ele) : undefined,
        timestamp: trackpoints[0].time || undefined,
      };

      // Calcular punto central (aproximado)
      let sumLat = 0;
      let sumLon = 0;

      trackpoints.forEach((point: any) => {
        sumLat += parseFloat(point['@_lat']);
        sumLon += parseFloat(point['@_lon']);
      });

      const centerPoint: GpxStartPoint = {
        latitude: sumLat / trackpoints.length,
        longitude: sumLon / trackpoints.length,
      };

      return {
        startPoint,
        totalPoints: trackpoints.length,
        centerPoint,
      };
    } catch (error) {
      throw new Error(
        `Error al parsear ruta GPX: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  },

  /**
   * Extrae los waypoints de un archivo GPX (puntos de interés, no trackpoints)
   * @param gpxBase64 - Contenido del archivo GPX codificado en base64
   * @returns Array de waypoints
   */
  extractWaypoints(gpxBase64: string): GpxStartPoint[] {
    try {
      const gpxString = decodeBase64(gpxBase64);

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const gpxData = parser.parse(gpxString);

      // Buscar waypoints (etiqueta <wpt>)
      let waypoints = gpxData?.gpx?.wpt;

      if (!waypoints) {
        return [];
      }

      // Convertir a array si es un único punto
      if (!Array.isArray(waypoints)) {
        waypoints = [waypoints];
      }

      return waypoints.map((wpt: any) => ({
        latitude: parseFloat(wpt['@_lat']),
        longitude: parseFloat(wpt['@_lon']),
        elevation: wpt.ele ? parseFloat(wpt.ele) : undefined,
        timestamp: wpt.time || undefined,
      }));
    } catch (error) {
      throw new Error(
        `Error al extraer waypoints: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  },

  /**
   * Método privado para extraer trackpoints del árbol XML parseado
   */
  _extractTrackpoints(gpxData: any): any[] {
    // Intentar diferentes estructuras de GPX
    // Estructura 1: gpx > trk > trkseg > trkpt
    const tracks = gpxData?.gpx?.trk;

    if (!tracks) {
      return [];
    }

    const trackArray = Array.isArray(tracks) ? tracks : [tracks];

    let allTrackpoints: any[] = [];

    // Iterar sobre todas las tracks
    trackArray.forEach((track: any) => {
      const segments = track.trkseg;

      if (!segments) return;

      const segmentArray = Array.isArray(segments) ? segments : [segments];

      // Iterar sobre todos los segmentos
      segmentArray.forEach((segment: any) => {
        let trackpoints = segment.trkpt;

        if (!trackpoints) return;

        // Convertir a array si es un único punto
        if (!Array.isArray(trackpoints)) {
          trackpoints = [trackpoints];
        }

        allTrackpoints = allTrackpoints.concat(trackpoints);
      });
    });

    return allTrackpoints;
  },
};

export default gpxParserService;
