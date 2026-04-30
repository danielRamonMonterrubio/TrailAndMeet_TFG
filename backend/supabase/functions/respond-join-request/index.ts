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
    const { excursionId, applicantId, action } = await req.json()

    if (!excursionId || !applicantId || !action) {
      return new Response(
        JSON.stringify({ error: 'excursionId, applicantId y action son requeridos' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (action !== 'accept' && action !== 'reject') {
      return new Response(
        JSON.stringify({ error: 'action debe ser "accept" o "reject"' }),
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

    // Cargar excursión y validar que el usuario es el organizador
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
        JSON.stringify({ error: 'Solo el organizador puede responder solicitudes' }),
        { status: 403, headers: corsHeaders }
      )
    }

    if (excursion.status !== 'published') {
      return new Response(
        JSON.stringify({ error: 'La excursión ya no admite cambios en participantes' }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Verificar que existe la solicitud pendiente
    const { data: solicitud, error: solicitudError } = await supabase
      .from('participacion')
      .select('excursionId, usuarioId, status')
      .eq('excursionId', excursionId)
      .eq('usuarioId', applicantId)
      .eq('status', 'pending')
      .maybeSingle()

    if (solicitudError) {
      console.error('Error consultando solicitud:', solicitudError)
      return new Response(
        JSON.stringify({ error: solicitudError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!solicitud) {
      return new Response(
        JSON.stringify({ error: 'Solicitud pendiente no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (action === 'reject') {
      const { error: deleteError } = await supabase
        .from('participacion')
        .delete()
        .eq('excursionId', excursionId)
        .eq('usuarioId', applicantId)
        .eq('status', 'pending')

      if (deleteError) {
        console.error('Error rechazando solicitud:', deleteError)
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, action: 'rejected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // action === 'accept': comprobar plazas
    const { count: acceptedCount, error: countError } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')

    if (countError) {
      console.error('Error contando aceptados:', countError)
      return new Response(
        JSON.stringify({ error: 'Error comprobando plazas' }),
        { status: 500, headers: corsHeaders }
      )
    }

    if ((acceptedCount ?? 0) >= excursion.capacidad) {
      return new Response(
        JSON.stringify({ error: 'No quedan plazas disponibles, no se puede aceptar más solicitudes' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const { error: updateError } = await supabase
      .from('participacion')
      .update({
        status: 'accepted',
        fechaUnion: new Date().toISOString(),
      })
      .eq('excursionId', excursionId)
      .eq('usuarioId', applicantId)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Error aceptando solicitud:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true, action: 'accepted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en respond-join-request:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
