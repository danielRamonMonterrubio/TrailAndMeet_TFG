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
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile, error: profileError } = await supabase
      .from('usuario')
      .select('id, nombreUsuario, nombre, apellido, fechaNacimiento, mostrarEdad, telefono, fotoUrl, especialidades, materialDisponible, descripcion')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // IDs de participaciones aceptadas con asistencia confirmada
    const { data: partAsistidas } = await supabase
      .from('participacion')
      .select('excursionId')
      .eq('usuarioId', userId)
      .eq('status', 'accepted')
      .not('attendance_confirmed_at', 'is', null)

    const asistIdsRaw = (partAsistidas ?? []).map((r: any) => r.excursionId)

    let excursionesAsistidas: any[] = []
    if (asistIdsRaw.length > 0) {
      const { data } = await supabase
        .from('excursion')
        .select('id, titulo, dificultad, tipoExcursion, fechaInicio, imagenURL')
        .in('id', asistIdsRaw)
        .eq('status', 'finished')
        .order('fechaInicio', { ascending: false })
      excursionesAsistidas = data ?? []
    }

    // IDs de participaciones aceptadas en excursiones activas
    const { data: partActivas } = await supabase
      .from('participacion')
      .select('excursionId')
      .eq('usuarioId', userId)
      .eq('status', 'accepted')

    const activasIds = (partActivas ?? []).map((r: any) => r.excursionId)

    let excursionesActivas: any[] = []
    if (activasIds.length > 0) {
      const { data } = await supabase
        .from('excursion')
        .select('id, titulo, dificultad, tipoExcursion, fechaInicio, imagenURL')
        .in('id', activasIds)
        .eq('status', 'published')
        .order('fechaInicio', { ascending: true })
      excursionesActivas = data ?? []
    }

    // Valoraciones recibidas (anónimas: solo medias y total)
    const { data: valoracionesData } = await supabase
      .from('valoracion')
      .select('puntualidad, seguridad, trato, preparacion')
      .eq('evaluado_id', userId)

    let valoraciones = null
    if (valoracionesData && valoracionesData.length > 0) {
      const total = valoracionesData.length
      const avg = (campo: 'puntualidad' | 'seguridad' | 'trato' | 'preparacion') =>
        Math.round((valoracionesData.reduce((s: number, v: any) => s + v[campo], 0) / total) * 10) / 10
      const p = avg('puntualidad')
      const s = avg('seguridad')
      const t = avg('trato')
      const pr = avg('preparacion')
      valoraciones = {
        total,
        puntualidad: p,
        seguridad: s,
        trato: t,
        preparacion: pr,
        mediaGlobal: Math.round(((p + s + t + pr) / 4) * 10) / 10,
      }
    }

    return new Response(
      JSON.stringify({ profile, excursionesAsistidas, excursionesActivas, valoraciones }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-user-profile:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
