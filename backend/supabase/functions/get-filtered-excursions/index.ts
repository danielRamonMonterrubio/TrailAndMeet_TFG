import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { difficulty, type } = await req.json()

    console.log('get-filtered-excursions - difficulty:', difficulty, 'type:', type)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Llamar RPC con filtros
    const { data: excursions, error } = await supabase.rpc('get_filtered_excursions', {
      p_difficulty: difficulty || null,
      p_type: type || null,
    })

    if (error) {
      console.error('Error en RPC:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    const list = (excursions ?? []) as any[]

    if (list.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolver usuario actual (opcional)
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    // Cargar participaciones de las excursiones devueltas
    const ids = list.map(e => e.id)
    const { data: participaciones, error: partError } = await supabase
      .from('participacion')
      .select('excursionId, usuarioId')
      .in('excursionId', ids)

    if (partError) {
      console.error('Error cargando participaciones:', partError)
      return new Response(
        JSON.stringify({ error: partError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const countByExcursion = new Map<number, number>()
    const joinedByCurrentUser = new Set<number>()

    for (const p of participaciones ?? []) {
      countByExcursion.set(p.excursionId, (countByExcursion.get(p.excursionId) ?? 0) + 1)
      if (userId && p.usuarioId === userId) joinedByCurrentUser.add(p.excursionId)
    }

    const enriched = list.map(e => ({
      ...e,
      availableSpots: Math.max(0, (e.capacidad ?? 0) - (countByExcursion.get(e.id) ?? 0)),
      isOrganizer: userId ? e.creadoPor === userId : false,
      isJoined: userId ? joinedByCurrentUser.has(e.id) : false,
    }))

    return new Response(
      JSON.stringify(enriched),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-filtered-excursions:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
