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
    const { excursionId, contenido } = await req.json()

    if (!excursionId || !contenido || typeof contenido !== 'string' || contenido.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'excursionId y contenido son requeridos' }),
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

    const { data: participacion, error: partError } = await supabase
      .from('participacion')
      .select('status')
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (partError) {
      return new Response(
        JSON.stringify({ error: 'Error verificando participación' }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!participacion) {
      return new Response(
        JSON.stringify({ error: 'Solo los participantes aceptados pueden enviar mensajes' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, status, titulo')
      .eq('id', excursionId)
      .maybeSingle()

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (excursion.status === 'finished') {
      return new Response(
        JSON.stringify({ error: 'No se pueden enviar mensajes a una excursión finalizada' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const { data: mensaje, error: insertError } = await supabase
      .from('mensaje')
      .insert({ excursionId, usuarioId: user.id, contenido: contenido.trim() })
      .select('id, excursionId, usuarioId, contenido, createdAt')
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Notificar al resto de participantes (no al emisor)
    const { data: otrosParticipantes } = await supabase
      .from('participacion')
      .select('usuarioId')
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')
      .neq('usuarioId', user.id)

    if (otrosParticipantes && otrosParticipantes.length > 0) {
      const { data: remitente } = await supabase
        .from('usuario')
        .select('nombreUsuario')
        .eq('id', user.id)
        .maybeSingle()

      const nombre = remitente?.nombreUsuario ?? 'Alguien'
      const preview = contenido.length > 50 ? contenido.substring(0, 50) + '…' : contenido
      const ids = otrosParticipantes.map((p: { usuarioId: string }) => p.usuarioId)
      notify(ids, `${excursion.titulo}`, `${nombre}: ${preview}`, 'new_message', { excursionId: String(excursionId) })
    }

    return new Response(
      JSON.stringify({ success: true, mensaje }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en send-message:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
