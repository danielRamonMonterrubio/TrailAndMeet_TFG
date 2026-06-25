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
      .select('id, creadoPor, fechaInicio, status, titulo')
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
        JSON.stringify({ error: 'No puedes abandonar una excursión finalizada o cancelada' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const ONE_HOUR_MS = 60 * 60 * 1000
    const startMs = new Date(excursion.fechaInicio).getTime()
    if (Date.now() > startMs - ONE_HOUR_MS) {
      return new Response(
        JSON.stringify({ error: 'Ya no puedes abandonar la excursión (menos de 1h para el inicio)' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const { data: deleted, error: deleteError } = await supabase
      .from('participacion')
      .delete()
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)
      .eq('status', 'accepted')
      .select('excursionId')

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!deleted || deleted.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No estás aceptado en esta excursión' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const { data: saliente } = await supabase
      .from('usuario')
      .select('nombreUsuario')
      .eq('id', user.id)
      .maybeSingle()

    const nombre = saliente?.nombreUsuario ?? 'Un participante'
    notify([excursion.creadoPor], 'Participante se ha ido', `${nombre} ha abandonado "${excursion.titulo}"`, 'left_excursion', { excursionId: String(excursionId) })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en leave-excursion:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
