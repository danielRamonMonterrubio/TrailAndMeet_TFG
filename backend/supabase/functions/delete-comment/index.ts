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
    const { commentId } = await req.json()

    if (!commentId) {
      return new Response(JSON.stringify({ error: 'commentId es requerido' }), { status: 400, headers: corsHeaders })
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

    // Obtener comentario con foroId a través de publicacion
    const { data: comentario } = await supabase
      .from('comentario')
      .select(`
        id, usuarioId,
        publicacion:publicacionId ( foroId )
      `)
      .eq('id', commentId)
      .maybeSingle()

    if (!comentario) {
      return new Response(JSON.stringify({ error: 'Comentario no encontrado' }), { status: 404, headers: corsHeaders })
    }

    const foroId = comentario.publicacion?.foroId

    const { data: foro } = await supabase
      .from('foro')
      .select('creadoPor')
      .eq('id', foroId)
      .maybeSingle()

    const isOwner = comentario.usuarioId === user.id
    const isModerador = foro?.creadoPor === user.id

    if (!isOwner && !isModerador) {
      return new Response(
        JSON.stringify({ error: 'Sin permisos para eliminar este comentario' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { error: deleteError } = await supabase
      .from('comentario')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error eliminando comentario:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en delete-comment:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
