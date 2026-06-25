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
    const foroId = url.searchParams.get('foroId')

    if (!foroId) {
      return new Response(JSON.stringify({ error: 'foroId es requerido' }), { status: 400, headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requerido' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')

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

    const { data: { user }, error: userError } = await authClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), { status: 401, headers: corsHeaders })
    }

    // Verificar que el foro existe
    const { data: foro } = await supabase
      .from('foro')
      .select('id, tipo, creadoPor')
      .eq('id', foroId)
      .maybeSingle()

    if (!foro) {
      return new Response(JSON.stringify({ error: 'Foro no encontrado' }), { status: 404, headers: corsHeaders })
    }

    // Foros privados: solo miembros pueden ver la lista
    if (foro.tipo === 'privado') {
      const { data: miembro } = await supabase
        .from('foro_miembro')
        .select('foroId')
        .eq('foroId', foroId)
        .eq('usuarioId', user.id)
        .maybeSingle()

      if (!miembro) {
        return new Response(
          JSON.stringify({ error: 'Debes ser miembro para ver la lista de miembros' }),
          { status: 403, headers: corsHeaders }
        )
      }
    }

    const { data: miembros, error: miembrosError } = await supabase
      .from('foro_miembro')
      .select(`
        usuarioId,
        fechaUnion,
        usuario:usuarioId ( nombreUsuario )
      `)
      .eq('foroId', foroId)
      .order('fechaUnion', { ascending: true })

    if (miembrosError) {
      console.error('Error obteniendo miembros:', miembrosError)
      return new Response(JSON.stringify({ error: miembrosError.message }), { status: 500, headers: corsHeaders })
    }

    const resultado = (miembros ?? []).map((m: any) => ({
      usuarioId: m.usuarioId,
      nombreUsuario: m.usuario?.nombreUsuario ?? 'Usuario',
      fechaUnion: m.fechaUnion,
      esModerador: m.usuarioId === foro.creadoPor,
    }))

    return new Response(
      JSON.stringify({ members: resultado, isModerador: foro.creadoPor === user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-forum-members:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
