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
    const { foroId, titulo, contenido, imagen_url } = await req.json()

    if (!foroId || !titulo?.trim() || !contenido?.trim()) {
      return new Response(
        JSON.stringify({ error: 'foroId, titulo y contenido son requeridos' }),
        { status: 400, headers: corsHeaders }
      )
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

    const { data: miembro } = await supabase
      .from('foro_miembro')
      .select('foroId')
      .eq('foroId', foroId)
      .eq('usuarioId', user.id)
      .maybeSingle()

    if (!miembro) {
      return new Response(JSON.stringify({ error: 'Debes unirte al foro para publicar' }), { status: 403, headers: corsHeaders })
    }

    const { data: publicacion, error: insertError } = await supabase
      .from('publicacion')
      .insert({
        foroId,
        usuarioId: user.id,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        imagen_url: imagen_url ?? null,
      })
      .select('id, foroId, usuarioId, titulo, contenido, imagen_url, createdAt')
      .single()

    if (insertError) {
      console.error('Error creando publicación:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ success: true, publicacion }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en create-post:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
