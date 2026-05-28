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

    const { data: post, error: postError } = await supabase
      .from('publicacion')
      .select(`
        id, foroId, titulo, contenido, imagen_url, createdAt,
        usuario:usuarioId ( id, nombreUsuario ),
        foro:foroId ( tipo, creadoPor )
      `)
      .eq('id', postId)
      .maybeSingle()

    if (postError || !post) {
      return new Response(JSON.stringify({ error: 'Publicación no encontrada' }), { status: 404, headers: corsHeaders })
    }

    // Foros privados: solo miembros pueden leer
    if (post.foro?.tipo === 'privado') {
      const { data: miembro } = await supabase
        .from('foro_miembro')
        .select('foroId')
        .eq('foroId', post.foroId)
        .eq('usuarioId', user.id)
        .maybeSingle()

      if (!miembro) {
        return new Response(
          JSON.stringify({ error: 'Debes ser miembro del foro para ver esta publicación' }),
          { status: 403, headers: corsHeaders }
        )
      }
    }

    // Obtener comentarios en orden cronológico
    const { data: comentarios, error: comentError } = await supabase
      .from('comentario')
      .select(`
        id, publicacionId, contenido, createdAt,
        usuario:usuarioId ( id, nombreUsuario )
      `)
      .eq('publicacionId', postId)
      .order('id', { ascending: true })

    if (comentError) {
      console.error('Error obteniendo comentarios:', comentError)
    }

    // Generar URL firmada para imagen del post
    let imagenUrl: string | null = null
    if (post.imagen_url) {
      const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(post.imagen_url, 3600)
      imagenUrl = signed?.signedUrl ?? null
    }

    const isModerador = post.foro?.creadoPor === user.id

    return new Response(
      JSON.stringify({
        post: {
          ...post,
          imagen_url: imagenUrl,
          isOwner: post.usuario?.id === user.id,
          isModerador,
        },
        comentarios: (comentarios ?? []).map((c: any) => ({
          ...c,
          isOwner: c.usuario?.id === user.id,
          isModerador,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-post-detail:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
