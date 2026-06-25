import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.4.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      gpxBase64,
      p_titulo,
      p_dificultad,
      p_fecha_inicio,
      p_capacidad,
      p_tipo_excursion,
      p_punto_encuentro,
      p_imagen_url,
      p_gpx_path,
      p_status,
    } = await req.json()

    // Validar que tenemos el GPX en base64
    if (!gpxBase64) {
      return new Response(
        JSON.stringify({ error: 'GPX base64 requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Decodificar base64 a string
    const gpxString = atob(gpxBase64)

    // Parsear XML del GPX
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })

    const gpxData = parser.parse(gpxString)

    // Extraer trackpoints
    const trackpoints = extractTrackpoints(gpxData)

    if (!trackpoints || trackpoints.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron puntos en el archivo GPX' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Obtener primer punto
    const firstPoint = trackpoints[0]
    const startLat = parseFloat(firstPoint['@_lat'])
    const startLng = parseFloat(firstPoint['@_lon'])
    const startElevation = firstPoint.ele ? parseFloat(firstPoint.ele) : null

    // Calcular datos de la ruta
    const totalDistance = calculateTotalDistance(trackpoints)
    const maxElevation = calculateMaxElevation(trackpoints)
    const minElevation = calculateMinElevation(trackpoints)
    const elevationGain = calculateElevationGain(trackpoints)

    // Obtener usuario del header de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Crear cliente Supabase CON el token del usuario para que auth.uid() funcione
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verificar que el token sea válido
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Llamar al RPC crear_excursion con los datos validados
    // El RPC capturará automáticamente auth.uid() del token
    const { data, error } = await supabaseUser.rpc('crear_excursion', {
      p_titulo,
      p_dificultad,
      p_fecha_inicio,
      p_capacidad,
      p_tipo_excursion,
      p_punto_encuentro,
      p_imagen_url,
      p_gpx_path,
      p_meeting_lat: startLat,
      p_meeting_lng: startLng,
      p_status,
      p_distancia_total: totalDistance,
      p_elevacion_maxima: maxElevation,
      p_elevacion_minima: minElevation,
      p_desnivel_positivo: elevationGain,
    })

    if (error) {
      console.error('Error en RPC crear_excursion:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Insertar al organizador como participante aceptado
    const excursionId = data
    const now = new Date().toISOString()
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: participacionError } = await supabaseService
      .from('participacion')
      .insert({
        excursionId,
        usuarioId: user.id,
        status: 'accepted',
        fechaSolicitud: now,
        fechaUnion: now,
      })
    if (participacionError) {
      console.error('Error insertando organizador en participacion:', participacionError)
    }

    // Retornar éxito con información de la ruta
    return new Response(
      JSON.stringify({
        success: true,
        data,
        routeInfo: {
          startPoint: { lat: startLat, lng: startLng, elevation: startElevation },
          totalDistance,
          maxElevation,
          minElevation,
          elevationGain,
          totalPoints: trackpoints.length,
        },
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error procesando GPX:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error no identificado',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * Extrae trackpoints del árbol XML parseado
 */
function extractTrackpoints(gpxData: any): any[] {
  const tracks = gpxData?.gpx?.trk
  if (!tracks) return []

  const trackArray = Array.isArray(tracks) ? tracks : [tracks]
  let allTrackpoints: any[] = []

  trackArray.forEach((track: any) => {
    const segments = track.trkseg
    if (!segments) return

    const segmentArray = Array.isArray(segments) ? segments : [segments]

    segmentArray.forEach((segment: any) => {
      let trackpoints = segment.trkpt
      if (!trackpoints) return

      if (!Array.isArray(trackpoints)) {
        trackpoints = [trackpoints]
      }

      allTrackpoints = allTrackpoints.concat(trackpoints)
    })
  })

  return allTrackpoints
}

/**
 * Calcula la distancia total en km usando la fórmula de Haversine
 */
function calculateTotalDistance(trackpoints: any[]): number {
  let totalDistance = 0

  for (let i = 0; i < trackpoints.length - 1; i++) {
    const lat1 = parseFloat(trackpoints[i]['@_lat'])
    const lng1 = parseFloat(trackpoints[i]['@_lon'])
    const lat2 = parseFloat(trackpoints[i + 1]['@_lat'])
    const lng2 = parseFloat(trackpoints[i + 1]['@_lon'])

    totalDistance += haversineDistance(lat1, lng1, lat2, lng2)
  }

  return Math.round(totalDistance * 100) / 100 // Redondear a 2 decimales
}

/**
 * Calcula elevación máxima
 */
function calculateMaxElevation(trackpoints: any[]): number | null {
  const elevations = trackpoints
    .map((p: any) => (p.ele ? parseFloat(p.ele) : null))
    .filter((e: any) => e !== null)

  return elevations.length > 0 ? Math.max(...elevations) : null
}

/**
 * Calcula elevación mínima
 */
function calculateMinElevation(trackpoints: any[]): number | null {
  const elevations = trackpoints
    .map((p: any) => (p.ele ? parseFloat(p.ele) : null))
    .filter((e: any) => e !== null)

  return elevations.length > 0 ? Math.min(...elevations) : null
}

/**
 * Calcula ganancia de elevación positiva
 */
function calculateElevationGain(trackpoints: any[]): number {
  let elevationGain = 0

  for (let i = 0; i < trackpoints.length - 1; i++) {
    const ele1 = trackpoints[i].ele ? parseFloat(trackpoints[i].ele) : null
    const ele2 = trackpoints[i + 1].ele ? parseFloat(trackpoints[i + 1].ele) : null

    if (ele1 !== null && ele2 !== null && ele2 > ele1) {
      elevationGain += ele2 - ele1
    }
  }

  return Math.round(elevationGain * 100) / 100
}

/**
 * Calcula distancia entre dos puntos usando Haversine
 * Retorna distancia en km
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

Deno.serve(handler)
