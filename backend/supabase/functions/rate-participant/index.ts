import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    )
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'No autenticado' }, 401)

    const { excursionId, evaluadoId, puntualidad, seguridad, trato, preparacion } = await req.json()

    if (!excursionId || !evaluadoId || puntualidad == null || seguridad == null || trato == null || preparacion == null)
      return json({ error: 'Faltan campos requeridos' }, 400)

    for (const v of [puntualidad, seguridad, trato, preparacion]) {
      if (!Number.isInteger(v) || v < 1 || v > 5)
        return json({ error: 'Las valoraciones deben ser enteros entre 1 y 5' }, 400)
    }

    if (user.id === evaluadoId) return json({ error: 'No puedes valorarte a ti mismo' }, 400)

    // Verificar que la excursión existe y está finalizada
    const { data: excursion, error: excError } = await supabase
      .from('excursion')
      .select('id, status, creadoPor')
      .eq('id', excursionId)
      .single()

    if (excError || !excursion) return json({ error: 'Excursión no encontrada' }, 404)
    if (excursion.status !== 'finished') return json({ error: 'Solo se puede valorar en excursiones finalizadas' }, 409)

    // El evaluador puede valorar si: es el organizador O confirmó asistencia
    const isOrganizer = excursion.creadoPor === user.id
    if (!isOrganizer) {
      const { data: partEvaluador } = await supabase
        .from('participacion')
        .select('attendance_confirmed_at')
        .eq('usuarioId', user.id)
        .eq('excursionId', excursionId)
        .eq('status', 'accepted')
        .maybeSingle()

      if (!partEvaluador?.attendance_confirmed_at)
        return json({ error: 'Debes haber confirmado asistencia para valorar' }, 403)
    }

    // El evaluado puede ser valorado si: es el organizador O confirmó asistencia
    const isEvaluadoOrganizer = excursion.creadoPor === evaluadoId
    if (!isEvaluadoOrganizer) {
      const { data: partEvaluado } = await supabase
        .from('participacion')
        .select('attendance_confirmed_at')
        .eq('usuarioId', evaluadoId)
        .eq('excursionId', excursionId)
        .eq('status', 'accepted')
        .maybeSingle()

      if (!partEvaluado?.attendance_confirmed_at)
        return json({ error: 'El usuario evaluado no confirmó asistencia' }, 409)
    }

    // Insertar (la constraint UNIQUE lanza 23505 si ya existe)
    const { error: insertError } = await supabase
      .from('valoracion')
      .insert({ excursion_id: excursionId, evaluador_id: user.id, evaluado_id: evaluadoId, puntualidad, seguridad, trato, preparacion })

    if (insertError) {
      if (insertError.code === '23505') return json({ error: 'Ya has valorado a este participante en esta excursión' }, 409)
      throw insertError
    }

    return json({ ok: true })
  } catch (err) {
    console.error('Error en rate-participant:', err)
    return json({ error: err.message }, 500)
  }
})
