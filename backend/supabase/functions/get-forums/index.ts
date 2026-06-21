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
    const search = url.searchParams.get('search') ?? undefined
    const categoria = url.searchParams.get('categoria') ?? undefined
    const offsetParam = url.searchParams.get('offset')
    const offset = offsetParam ? parseInt(offsetParam, 10) || 0 : 0
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) || 20 : 20

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requerido' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const excludeJoined = url.searchParams.get('excludeJoined') === 'true'

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

    // Obtener los foros del usuario para excluirlos si se solicita
    let misForoIdsExcluir: number[] = []
    if (excludeJoined) {
      const { data: membresia } = await supabase
        .from('foro_miembro')
        .select('foroId')
        .eq('usuarioId', user.id)
      misForoIdsExcluir = (membresia ?? []).map((m: any) => m.foroId)
    }

    // Búsqueda por código exacto (#XXXXXX): muestra cualquier foro incluyendo privados
    const isCodeSearch = search && /^#?[A-Z0-9]{6}$/i.test(search.trim())

    let query = supabase
      .from('foro')
      .select('id, codigo, titulo, descripcion, tipo, portada_url, categorias, creadoPor, created_at', { count: 'exact' })

    if (isCodeSearch) {
      query = query.eq('codigo', search.trim().replace('#', '').toUpperCase())
    } else {
      query = query.eq('tipo', 'publico')
      if (misForoIdsExcluir.length > 0) {
        query = query.not('id', 'in', `(${misForoIdsExcluir.join(',')})`)
      }
      if (search?.trim()) {
        query = query.ilike('titulo', `%${search.trim()}%`)
      }
      if (categoria?.trim()) {
        query = query.contains('categorias', [categoria.trim()])
      }
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    }

    const { data: foros, error, count } = await query

    if (error) {
      console.error('Error listando foros:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    const foroIds = (foros ?? []).map((f: any) => f.id)

    // Conteo de miembros + membresía propia (solo si no excluimos ya los unidos)
    const miembrosQueries: Promise<any>[] = [
      foroIds.length > 0
        ? supabase.from('foro_miembro').select('foroId').in('foroId', foroIds)
        : Promise.resolve({ data: [] }),
    ]
    if (!excludeJoined && foroIds.length > 0) {
      miembrosQueries.push(
        supabase.from('foro_miembro').select('foroId').eq('usuarioId', user.id).in('foroId', foroIds)
      )
    }

    const [allMiembrosRes, membresiaRes] = await Promise.all(miembrosQueries)

    const memberCountMap: Record<number, number> = {}
    ;(allMiembrosRes.data ?? []).forEach((m: any) => {
      memberCountMap[m.foroId] = (memberCountMap[m.foroId] ?? 0) + 1
    })
    const misForoIds = new Set((membresiaRes?.data ?? []).map((m: any) => m.foroId))

    // Generar URLs firmadas para portadas
    const forosConUrl = await Promise.all(
      (foros ?? []).map(async (foro: any) => {
        let portadaUrl: string | null = null
        if (foro.portada_url) {
          const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(foro.portada_url, 3600)
          portadaUrl = signed?.signedUrl ?? null
        }
        return {
          ...foro,
          portada_url: portadaUrl,
          memberCount: memberCountMap[foro.id] ?? 0,
          isMember: excludeJoined ? false : misForoIds.has(foro.id),
        }
      })
    )

    return new Response(
      JSON.stringify({ foros: forosConUrl, total: count ?? forosConUrl.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-forums:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
