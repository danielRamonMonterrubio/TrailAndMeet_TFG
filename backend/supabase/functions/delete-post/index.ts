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
    const { postId } = await req.json()

    if (!postId) {
      return new Response(JSON.stringify({ error: 'postId es requerido' }), { status: 400, headers: corsHeaders })
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
      .select('id, usuarioId, foroId, imagen_url')
      .eq('id', postId)
      .maybeSingle()

    if (!post) {
      return new Response(JSON.stringify({ error: 'Publicación no encontrada' }), { status: 404, headers: corsHeaders })
    }

    const { data: foro } = await supabase
      .from('foro')
      .select('creadoPor')
      .eq('id', post.foroId)
      .maybeSingle()

    const isOwner = post.usuarioId === user.id
    const isModerador = foro?.creadoPor === user.id

    if (!isOwner && !isModerador) {
      return new Response(
        JSON.stringify({ error: 'Sin permisos para eliminar esta publicación' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Borrar imagen de Storage si existe
    if (post.imagen_url) {
      await supabase.storage.from('forum-images').remove([post.imagen_url])
    }

    const { error: deleteError } = await supabase
      .from('publicacion')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('Error eliminando publicación:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en delete-post:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
