import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const difficulty = url.searchParams.get('difficulty')
    const type = url.searchParams.get('type')
    const offsetParam = url.searchParams.get('offset')
    const offset = offsetParam ? parseInt(offsetParam, 10) || 0 : 0
    const limit = 10

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Authorization requerido' }, 401)

    const token = authHeader.replace('Bearer ', '')

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    )
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'No autenticado' }, 401)

    let query = supabase
      .from('excursion')
      .select(`
        id, titulo, dificultad, tipoExcursion, fechaInicio, capacidad,
        puntoEncuentro, imagenURL, creadoPor,
        organizador:creadoPor ( nombreUsuario )
      `, { count: 'exact' })
      .eq('status', 'published')
      .neq('creadoPor', user.id)

    if (difficulty) query = query.eq('dificultad', difficulty)
    if (type) query = query.eq('tipoExcursion', type)

    query = query
      .order('fechaInicio', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: excursions, error, count } = await query

    if (error) {
      console.error('Error en get-filtered-excursions:', error)
      return json({ error: error.message }, 500)
    }

    const list = excursions ?? []

    if (list.length === 0) {
      return json({ excursions: [], total: count ?? 0, hasMore: false })
    }

    // Contar participantes aceptados por excursión para calcular plazas libres
    const ids = list.map((e: any) => e.id)
    const { data: participaciones } = await supabase
      .from('participacion')
      .select('excursionId')
      .in('excursionId', ids)
      .eq('status', 'accepted')

    const countByExcursion = new Map<number, number>()
    for (const p of participaciones ?? []) {
      countByExcursion.set(p.excursionId, (countByExcursion.get(p.excursionId) ?? 0) + 1)
    }

    const enriched = list.map((e: any) => ({
      id: e.id,
      titulo: e.titulo,
      dificultad: e.dificultad,
      tipoExcursion: e.tipoExcursion,
      fechaInicio: e.fechaInicio,
      capacidad: e.capacidad,
      puntoEncuentro: e.puntoEncuentro,
      imagenURL: e.imagenURL,
      creadoPor: e.creadoPor,
      organizerName: (e.organizador as any)?.nombreUsuario ?? 'Desconocido',
      availableSpots: Math.max(0, (e.capacidad ?? 0) - (countByExcursion.get(e.id) ?? 0)),
    }))

    const total = count ?? 0
    return json({ excursions: enriched, total, hasMore: offset + limit < total })
  } catch (error) {
    console.error('Error in get-filtered-excursions:', error)
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 500)
  }
}

Deno.serve(handler)
