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
    const { publicacionId, contenido } = await req.json()

    if (!publicacionId || !contenido?.trim()) {
      return new Response(
        JSON.stringify({ error: 'publicacionId y contenido son requeridos' }),
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

    const { data: post } = await supabase
      .from('publicacion')
      .select('foroId')
      .eq('id', publicacionId)
      .maybeSingle()

    if (!post) {
      return new Response(JSON.stringify({ error: 'Publicación no encontrada' }), { status: 404, headers: corsHeaders })
    }

    const { data: miembro } = await supabase
      .from('foro_miembro')
      .select('foroId')
      .eq('foroId', post.foroId)
      .eq('usuarioId', user.id)
      .maybeSingle()

    if (!miembro) {
      return new Response(JSON.stringify({ error: 'Debes ser miembro del foro para comentar' }), { status: 403, headers: corsHeaders })
    }

    const { data: comentario, error: insertError } = await supabase
      .from('comentario')
      .insert({
        publicacionId,
        usuarioId: user.id,
        contenido: contenido.trim(),
      })
      .select('id, publicacionId, usuarioId, contenido, createdAt')
      .single()

    if (insertError) {
      console.error('Error creando comentario:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ success: true, comentario }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en create-comment:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
