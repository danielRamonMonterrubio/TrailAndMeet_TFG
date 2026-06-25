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

    const { data: foro, error: foroError } = await supabase
      .from('foro')
      .select('id, codigo, titulo, descripcion, tipo, portada_url, categorias, creadoPor, created_at')
      .eq('id', foroId)
      .maybeSingle()

    if (foroError || !foro) {
      return new Response(JSON.stringify({ error: 'Foro no encontrado' }), { status: 404, headers: corsHeaders })
    }

    const [miembroRes, countRes] = await Promise.all([
      supabase.from('foro_miembro').select('foroId').eq('foroId', foroId).eq('usuarioId', user.id).maybeSingle(),
      supabase.from('foro_miembro').select('*', { count: 'exact', head: true }).eq('foroId', foroId),
    ])

    let portadaUrl: string | null = null
    if (foro.portada_url) {
      const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(foro.portada_url, 3600)
      portadaUrl = signed?.signedUrl ?? null
    }

    return new Response(
      JSON.stringify({
        foro: {
          ...foro,
          portada_url: portadaUrl,
          memberCount: countRes.count ?? 0,
          isMember: !!miembroRes.data,
          isModerador: foro.creadoPor === user.id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-forum-detail:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
