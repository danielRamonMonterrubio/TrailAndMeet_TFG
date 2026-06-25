import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Campos editables. fechaInicio, GPXPath, meetingLat, meetingLng quedan EXCLUIDOS por requisito de producto.
const EDITABLE_FIELDS = [
  'titulo',
  'capacidad',
  'dificultad',
  'tipoExcursion',
  'puntoEncuentro',
  'imagenURL',
] as const

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { excursionId, ...rest } = body

    if (!excursionId) {
      return new Response(
        JSON.stringify({ error: 'excursionId requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Cliente para validar usuario (con token del usuario)
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Cliente para UPDATE (con SERVICE_ROLE_KEY, bypassa RLS)
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

    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, creadoPor, capacidad, status')
      .eq('id', excursionId)
      .single()

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (excursion.creadoPor !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Solo el organizador puede editar la excursión' }),
        { status: 403, headers: corsHeaders }
      )
    }

    if (excursion.status !== 'published') {
      return new Response(
        JSON.stringify({ error: 'No se puede editar una excursión finalizada o cancelada' }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Filtrar a solo campos editables
    const updates: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in rest && rest[field] !== undefined) {
        updates[field] = rest[field]
      }
    }

    console.log('📝 UPDATE REQUEST:', { excursionId, receivedFields: Object.keys(rest), filteredUpdates: Object.keys(updates), updateValues: updates })

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay campos editables en la petición' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Si baja la capacidad por debajo de aceptados actuales, rechazar
    if (typeof updates.capacidad === 'number') {
      const { count: acceptedCount, error: countError } = await supabase
        .from('participacion')
        .select('*', { count: 'exact', head: true })
        .eq('excursionId', excursionId)
        .eq('status', 'accepted')

      if (countError) {
        console.error('Error contando aceptados:', countError)
        return new Response(
          JSON.stringify({ error: 'Error comprobando capacidad' }),
          { status: 500, headers: corsHeaders }
        )
      }

      if ((acceptedCount ?? 0) > (updates.capacidad as number)) {
        return new Response(
          JSON.stringify({ error: `No puedes reducir la capacidad por debajo de los ${acceptedCount} participantes ya aceptados` }),
          { status: 409, headers: corsHeaders }
        )
      }
    }

    const { data: updatedData, error: updateError, count } = await supabase
      .from('excursion')
      .update(updates)
      .eq('id', excursionId)
      .select()

    if (updateError) {
      console.error('Error actualizando excursión:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Excursión actualizada:', { excursionId, rowsUpdated: updatedData?.length ?? 0, updatedData })

    return new Response(
      JSON.stringify({ success: true, updated: Object.keys(updates) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en update-excursion:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
