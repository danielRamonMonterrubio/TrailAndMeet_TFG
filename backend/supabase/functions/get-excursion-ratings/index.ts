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

    const urlObj = new URL(req.url)
    const excursionId = urlObj.searchParams.get('excursionId')
    if (!excursionId) return json({ error: 'excursionId requerido' }, 400)

    // Verificar que la excursión existe y está finalizada
    const { data: excursion, error: excError } = await supabase
      .from('excursion')
      .select('id, status, creadoPor')
      .eq('id', excursionId)
      .single()

    if (excError || !excursion) return json({ error: 'Excursión no encontrada' }, 404)
    if (excursion.status !== 'finished') return json({ error: 'La excursión no está finalizada' }, 409)

    // Participantes aceptados de la excursión (excepto el usuario actual)
    const { data: participaciones, error: partError } = await supabase
      .from('participacion')
      .select('usuarioId, attendance_confirmed_at')
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')
      .neq('usuarioId', user.id)

    if (partError) throw partError

    // Incluir al organizador siempre; al resto solo si confirmaron asistencia
    const valoreables = (participaciones ?? []).filter(p =>
      p.usuarioId === excursion.creadoPor || p.attendance_confirmed_at !== null
    )

    if (valoreables.length === 0) return json({ participants: [] })

    const userIds = valoreables.map(p => p.usuarioId)

    // Datos de usuario
    const { data: usuarios, error: usrError } = await supabase
      .from('usuario')
      .select('id, nombreUsuario, nombre, apellido, fotoUrl')
      .in('id', userIds)

    if (usrError) throw usrError

    // Quiénes ya ha valorado el usuario actual en esta excursión
    const { data: yaValorados, error: yvError } = await supabase
      .from('valoracion')
      .select('evaluado_id')
      .eq('excursion_id', excursionId)
      .eq('evaluador_id', user.id)

    if (yvError) throw yvError

    const yaValoradosSet = new Set((yaValorados ?? []).map(v => v.evaluado_id))
    const userMap = new Map((usuarios ?? []).map(u => [u.id, u]))

    const participants = valoreables.map(p => {
      const u = userMap.get(p.usuarioId)
      return {
        usuarioId: p.usuarioId,
        nombreUsuario: u?.nombreUsuario ?? p.usuarioId,
        nombre: u?.nombre ?? null,
        apellido: u?.apellido ?? null,
        fotoUrl: u?.fotoUrl ?? null,
        esOrganizador: p.usuarioId === excursion.creadoPor,
        yaValorado: yaValoradosSet.has(p.usuarioId),
      }
    })

    return json({ participants })
  } catch (err) {
    console.error('Error en get-excursion-ratings:', err)
    return json({ error: err.message }, 500)
  }
})
