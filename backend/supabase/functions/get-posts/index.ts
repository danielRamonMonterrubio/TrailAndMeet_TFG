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
    const { foroId, cursor, limit = 20 } = await req.json()

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

    const { data: foro } = await supabase
      .from('foro')
      .select('tipo')
      .eq('id', foroId)
      .maybeSingle()

    if (!foro) {
      return new Response(JSON.stringify({ error: 'Foro no encontrado' }), { status: 404, headers: corsHeaders })
    }

    // Foros privados: solo miembros pueden leer
    if (foro.tipo === 'privado') {
      const { data: miembro } = await supabase
        .from('foro_miembro')
        .select('foroId')
        .eq('foroId', foroId)
        .eq('usuarioId', user.id)
        .maybeSingle()

      if (!miembro) {
        return new Response(
          JSON.stringify({ error: 'Debes unirte al foro para ver sus publicaciones' }),
          { status: 403, headers: corsHeaders }
        )
      }
    }

    let query = supabase
      .from('publicacion')
      .select(`
        id, foroId, titulo, contenido, imagen_url, createdAt,
        usuario:usuarioId ( id, nombreUsuario )
      `)
      .eq('foroId', foroId)
      .order('id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('id', cursor)
    }

    const { data: posts, error: postsError } = await query

    if (postsError) {
      console.error('Error obteniendo publicaciones:', postsError)
      return new Response(JSON.stringify({ error: postsError.message }), { status: 500, headers: corsHeaders })
    }

    const hasMore = (posts?.length ?? 0) > limit
    const postsSlice = hasMore ? posts!.slice(0, limit) : (posts ?? [])

    // Contar comentarios por publicación
    const postIds = postsSlice.map((p: any) => p.id)
    const { data: comentariosCount } = postIds.length > 0
      ? await supabase.from('comentario').select('publicacionId').in('publicacionId', postIds)
      : { data: [] }

    const comentCountMap: Record<number, number> = {}
    ;(comentariosCount ?? []).forEach((c: any) => {
      comentCountMap[c.publicacionId] = (comentCountMap[c.publicacionId] ?? 0) + 1
    })

    // Generar URLs firmadas para imágenes de publicaciones
    const postsConUrl = await Promise.all(
      postsSlice.map(async (post: any) => {
        let imagenUrl: string | null = null
        if (post.imagen_url) {
          const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(post.imagen_url, 3600)
          imagenUrl = signed?.signedUrl ?? null
        }
        return {
          ...post,
          imagen_url: imagenUrl,
          commentCount: comentCountMap[post.id] ?? 0,
          isOwner: post.usuario?.id === user.id,
        }
      })
    )

    return new Response(
      JSON.stringify({ posts: postsConUrl, hasMore }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-posts:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
