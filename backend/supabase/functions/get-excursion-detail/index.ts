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
    const url = new URL(req.url)
    const excursionId = url.searchParams.get('excursionId')

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

    // Obtener creadoPor de la tabla excursion (puede no estar en el RPC)
    const { data: excursionRow, error: excError } = await supabase
      .from('excursion')
      .select('id, creadoPor')
      .eq('id', numericId)
      .single()

    if (excError) {
      console.warn('⚠️ Error obteniendo creadoPor:', excError.message)
    }

    const creadoPor = excursionRow?.creadoPor ?? detail.creadoPor
    console.log('📌 creadoPor from DB:', creadoPor)

    // Resolver usuario actual (opcional)
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      if (userError) {
        console.warn('⚠️ Error obteniendo usuario:', userError.message)
      }
      if (user) {
        userId = user.id
        console.log('✅ Usuario autenticado:', userId)
      } else {
        console.warn('⚠️ No se pudo obtener usuario del token')
      }
    } else {
      console.warn('⚠️ No hay Authorization header')
    }

    const isOrganizerValue = userId && creadoPor === userId
    console.log('🔍 isOrganizer check:', { userId, createdBy: creadoPor, isOrganizer: isOrganizerValue })

    // Contar participantes aceptados (los pending no ocupan plaza visible)
    const { count: acceptedCount, error: countError } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', numericId)
      .eq('status', 'accepted')

    if (countError) {
      console.error('Error contando participantes:', countError)
      return new Response(
        JSON.stringify({ error: countError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Contar solicitudes pendientes (solo útil para el organizador)
    const { count: pendingCount } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', numericId)
      .eq('status', 'pending')

    let myParticipationStatus: 'pending' | 'accepted' | null = null
    let attendanceConfirmed = false

    if (userId) {
      const { data: existing } = await supabase
        .from('participacion')
        .select('status, attendance_confirmed_at')
        .eq('excursionId', numericId)
        .eq('usuarioId', userId)
        .maybeSingle()

      if (existing) {
        myParticipationStatus = existing.status as 'pending' | 'accepted'
        attendanceConfirmed = !!existing.attendance_confirmed_at
      }
    }

    const enriched = {
      ...detail,
      creadoPor,
      acceptedCount: acceptedCount ?? 0,
      pendingCount: pendingCount ?? 0,
      availableSpots: Math.max(0, (detail.capacidad ?? 0) - (acceptedCount ?? 0)),
      isOrganizer: isOrganizerValue,
      myParticipationStatus,
      attendanceConfirmed,
      isJoined: myParticipationStatus === 'accepted',
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
