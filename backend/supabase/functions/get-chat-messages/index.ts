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
    const { excursionId, cursor, limit = 50 } = await req.json()

    if (!excursionId) {
      return new Response(
        JSON.stringify({ error: 'excursionId es requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: userError } = await authClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verificar que es participante aceptado
    const { data: participacion } = await supabase
      .from('participacion')
      .select('status')
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!participacion) {
      return new Response(
        JSON.stringify({ error: 'Solo los participantes aceptados pueden ver el chat' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const pageLimit = Math.min(typeof limit === 'number' ? limit : 50, 100)

    // Paginación por cursor: cargamos mensajes anteriores al cursor (id < cursor)
    // Ordenamos DESC para coger los más recientes, con cursor opcionalmente
    let query = supabase
      .from('mensaje')
      .select(`
        id,
        excursionId,
        usuarioId,
        contenido,
        createdAt,
        usuario (
          id,
          nombreUsuario
        )
      `)
      .eq('excursionId', excursionId)
      .order('id', { ascending: false })
      .limit(pageLimit + 1)

    if (cursor !== undefined && cursor !== null) {
      query = query.lt('id', cursor)
    }

    const { data: messages, error: msgError } = await query

    if (msgError) {
      console.error('Error obteniendo mensajes:', msgError)
      return new Response(
        JSON.stringify({ error: msgError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const hasMore = (messages?.length ?? 0) > pageLimit
    const result = hasMore ? messages!.slice(0, pageLimit) : (messages ?? [])
    // Invertir para mostrar en orden ascendente (más antiguo primero)
    result.reverse()

    return new Response(
      JSON.stringify({ messages: result, hasMore }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-chat-messages:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
