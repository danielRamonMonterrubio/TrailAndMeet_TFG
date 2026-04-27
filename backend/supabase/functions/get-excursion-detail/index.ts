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
    const { excursionId } = await req.json()

    if (!excursionId) {
      return new Response(
        JSON.stringify({ error: 'excursionId requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const numericId = typeof excursionId === 'number' ? excursionId : parseInt(excursionId, 10)

    if (Number.isNaN(numericId)) {
      return new Response(
        JSON.stringify({ error: 'excursionId no es válido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Llamar RPC existente
    const { data: rpcData, error: rpcError } = await supabase.rpc('obtener_detalle_excursion', {
      p_excursion_id: numericId,
    })

    if (rpcError) {
      console.error('Error en RPC obtener_detalle_excursion:', rpcError)
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!rpcData || rpcData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const detail = rpcData[0] as any

    // Resolver usuario actual (opcional)
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    // Contar participantes y comprobar si el usuario actual está unido
    const { count: participantesCount, error: countError } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', numericId)

    if (countError) {
      console.error('Error contando participantes:', countError)
      return new Response(
        JSON.stringify({ error: countError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    let isJoined = false
    if (userId) {
      const { data: existing } = await supabase
        .from('participacion')
        .select('excursionId')
        .eq('excursionId', numericId)
        .eq('usuarioId', userId)
        .maybeSingle()

      isJoined = !!existing
    }

    const enriched = {
      ...detail,
      availableSpots: Math.max(0, (detail.capacidad ?? 0) - (participantesCount ?? 0)),
      isOrganizer: userId ? detail.creadoPor === userId : false,
      isJoined,
    }

    return new Response(
      JSON.stringify(enriched),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-excursion-detail:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
