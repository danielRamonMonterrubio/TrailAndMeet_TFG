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

    // Todas las participaciones aceptadas del usuario
    const { data: todasPart } = await supabase
      .from('participacion')
      .select('excursionId')
      .eq('usuarioId', userId)
      .eq('status', 'accepted')

    const todosIds = (todasPart ?? []).map((r: any) => r.excursionId)

    const nowMs = Date.now()

    let excursionesAsistidas: any[] = []
    let excursionesActivas: any[] = []

    if (todosIds.length > 0) {
      const { data: todasExcursiones } = await supabase
        .from('excursion')
        .select('id, titulo, dificultad, tipoExcursion, fechaInicio, imagenURL')
        .in('id', todosIds)

      const todas = todasExcursiones ?? []

      excursionesAsistidas = todas
        .filter((e: any) => new Date(e.fechaInicio).getTime() < nowMs)
        .sort((a: any, b: any) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())

      excursionesActivas = todas
        .filter((e: any) => new Date(e.fechaInicio).getTime() >= nowMs)
        .sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
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
