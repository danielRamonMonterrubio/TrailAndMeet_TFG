import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

function notify(userIds: string[], titulo: string, cuerpo: string, tipo: string, data?: Record<string, string>) {
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ userIds, titulo, cuerpo, tipo, data }),
  }).catch(err => console.error('Error notificando:', err))
}

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
      { auth: { autoRefreshToken: false, persistSession: false } }
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
      .select('id, creadoPor, capacidad, status, titulo')
      .eq('id', excursionId)
      .single()

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (excursion.status !== 'published') {
      return new Response(
        JSON.stringify({ error: 'La excursión ya no acepta nuevas solicitudes' }),
        { status: 409, headers: corsHeaders }
      )
    }

    if (excursion.creadoPor === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes solicitar unirte a tu propia excursión' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { count: acceptedCount, error: countError } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')

    if (countError) {
      return new Response(
        JSON.stringify({ error: 'Error comprobando plazas' }),
        { status: 500, headers: corsHeaders }
      )
    }

    if ((acceptedCount ?? 0) >= excursion.capacidad) {
      return new Response(
        JSON.stringify({ error: 'No quedan plazas disponibles' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const { error: insertError } = await supabase
      .from('participacion')
      .insert({ excursionId: excursion.id, usuarioId: user.id, status: 'pending' })

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Ya tienes una solicitud o estás unido a esta excursión' }),
          { status: 409, headers: corsHeaders }
        )
      }
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Obtener nombre del solicitante
    const { data: solicitante } = await supabase
      .from('usuario')
      .select('nombreUsuario')
      .eq('id', user.id)
      .maybeSingle()

    const nombre = solicitante?.nombreUsuario ?? 'Alguien'
    notify([excursion.creadoPor], 'Nueva solicitud', `${nombre} quiere unirse a "${excursion.titulo}"`, 'join_request', { excursionId: String(excursionId) })

    return new Response(
      JSON.stringify({ success: true, status: 'pending' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en request-join-excursion:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
