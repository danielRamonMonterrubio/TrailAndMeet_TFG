import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONE_HOUR_MS = 60 * 60 * 1000
const TWO_HOURS_MS = 2 * ONE_HOUR_MS

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

    // Cargar excursión para validar ventana temporal
    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, fechaInicio, status')
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
        JSON.stringify({ error: 'La excursión no admite confirmaciones' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const startMs = new Date(excursion.fechaInicio).getTime()
    const nowMs = Date.now()

    if (nowMs < startMs - ONE_HOUR_MS) {
      return new Response(
        JSON.stringify({ error: 'Aún no puedes confirmar asistencia (la ventana abre 1h antes del inicio)' }),
        { status: 409, headers: corsHeaders }
      )
    }

    if (nowMs > startMs + TWO_HOURS_MS) {
      return new Response(
        JSON.stringify({ error: 'La ventana para confirmar asistencia ha expirado' }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Validar que el usuario está aceptado
    const { data: participacion, error: partError } = await supabase
      .from('participacion')
      .select('excursionId, usuarioId, status, attendance_confirmed_at')
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)
      .maybeSingle()

    if (partError) {
      console.error('Error consultando participación:', partError)
      return new Response(
        JSON.stringify({ error: partError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!participacion || participacion.status !== 'accepted') {
      return new Response(
        JSON.stringify({ error: 'No estás aceptado en esta excursión' }),
        { status: 403, headers: corsHeaders }
      )
    }

    if (participacion.attendance_confirmed_at) {
      return new Response(
        JSON.stringify({ error: 'Ya has confirmado tu asistencia' }),
        { status: 409, headers: corsHeaders }
      )
    }

    const { error: updateError } = await supabase
      .from('participacion')
      .update({ attendance_confirmed_at: new Date().toISOString() })
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)

    if (updateError) {
      console.error('Error confirmando asistencia:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en confirm-attendance:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
