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

    const { data: membresías, error: memError } = await supabase
      .from('foro_miembro')
      .select(`
        fechaUnion,
        foro:foroId (
          id, codigo, titulo, descripcion, tipo, portada_url, categorias, creadoPor, created_at
        )
      `)
      .eq('usuarioId', user.id)
      .order('fechaUnion', { ascending: false })

    if (memError) {
      console.error('Error obteniendo mis foros:', memError)
      return new Response(JSON.stringify({ error: memError.message }), { status: 500, headers: corsHeaders })
    }

    const foroIds = (membresías ?? []).map((m: any) => m.foro?.id).filter(Boolean)

    const { data: allMiembros } = foroIds.length > 0
      ? await supabase.from('foro_miembro').select('foroId').in('foroId', foroIds)
      : { data: [] }

    const memberCountMap: Record<number, number> = {}
    ;(allMiembros ?? []).forEach((m: any) => {
      memberCountMap[m.foroId] = (memberCountMap[m.foroId] ?? 0) + 1
    })

    const foros = await Promise.all(
      (membresías ?? []).map(async (m: any) => {
        const foro = m.foro
        if (!foro) return null

        let portadaUrl: string | null = null
        if (foro.portada_url) {
          const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(foro.portada_url, 3600)
          portadaUrl = signed?.signedUrl ?? null
        }

        return {
          ...foro,
          portada_url: portadaUrl,
          memberCount: memberCountMap[foro.id] ?? 0,
          isModerador: foro.creadoPor === user.id,
          fechaUnion: m.fechaUnion,
        }
      })
    )

    return new Response(
      JSON.stringify({ foros: foros.filter(Boolean) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-my-forums:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
