import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Tipo = 'organizadas' | 'unidas' | 'todas'

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tipoParam = (url.searchParams.get('tipo') ?? 'todas').toLowerCase()
    const tipo: Tipo =
      tipoParam === 'organizadas' || tipoParam === 'unidas' ? tipoParam : 'todas'

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data: { user }, error: userError } = await authClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Cargar todas las excursiones con el shape estándar (incluye organizerName)
    const { data: allExcursions, error: rpcError } = await supabase.rpc('get_all_excursions')

    if (rpcError) {
      console.error('Error en RPC get_all_excursions:', rpcError)
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const list = (allExcursions ?? []) as any[]

    // Solo participaciones accepted (pending no implica ser miembro)
    const { data: misParticipaciones, error: misPartError } = await supabase
      .from('participacion')
      .select('excursionId')
      .eq('usuarioId', user.id)
      .eq('status', 'accepted')

    if (misPartError) {
      console.error('Error cargando mis participaciones:', misPartError)
      return new Response(
        JSON.stringify({ error: misPartError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const joinedIds = new Set<number>((misParticipaciones ?? []).map(p => p.excursionId))

    // Filtrar según tipo
    const filtered = list.filter(e => {
      const isOrganizer = e.creadoPor === user.id
      const isJoined = joinedIds.has(e.id)
      if (tipo === 'organizadas') return isOrganizer
      if (tipo === 'unidas') return isJoined
      return isOrganizer || isJoined
    })

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Contar solo aceptados para calcular plazas disponibles
    const ids = filtered.map(e => e.id)
    const { data: participaciones, error: partError } = await supabase
      .from('participacion')
      .select('excursionId')
      .in('excursionId', ids)
      .eq('status', 'accepted')

    if (partError) {
      console.error('Error cargando participaciones:', partError)
      return new Response(
        JSON.stringify({ error: partError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const countByExcursion = new Map<number, number>()
    for (const p of participaciones ?? []) {
      countByExcursion.set(p.excursionId, (countByExcursion.get(p.excursionId) ?? 0) + 1)
    }

    const enriched = filtered.map(e => ({
      ...e,
      availableSpots: Math.max(0, (e.capacidad ?? 0) - (countByExcursion.get(e.id) ?? 0)),
      isOrganizer: e.creadoPor === user.id,
      isJoined: joinedIds.has(e.id),
    }))

    return new Response(
      JSON.stringify(enriched),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-my-excursions:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error no identificado',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
