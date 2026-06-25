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
    const { excursionId } = await req.json()

    if (!excursionId) {
      return new Response(
        JSON.stringify({ error: 'excursionId requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validar token del usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // 1. Cargar excursión y validar
    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, creadoPor, capacidad')
      .eq('id', excursionId)
      .single()

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // 2. El organizador no se puede unir a su propia excursión
    if (excursion.creadoPor === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes unirte a una excursión que has creado tú' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // 3. Comprobar plazas disponibles
    const { count: participantesCount, error: countError } = await supabase
      .from('participacion')
      .select('*', { count: 'exact', head: true })
      .eq('excursionId', excursionId)

    if (countError) {
      console.error('Error contando participantes:', countError)
      return new Response(
        JSON.stringify({ error: 'Error comprobando plazas' }),
        { status: 500, headers: corsHeaders }
      )
    }

    if ((participantesCount ?? 0) >= excursion.capacidad) {
      return new Response(
        JSON.stringify({ error: 'No quedan plazas disponibles' }),
        { status: 409, headers: corsHeaders }
      )
    }

    // 4. Insertar participación (la PK compuesta evita duplicados)
    const { error: insertError } = await supabase
      .from('participacion')
      .insert({
        excursionId: excursion.id,
        usuarioId: user.id,
      })

    if (insertError) {
      // 23505 = unique_violation -> ya estaba unido
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Ya estás unido a esta excursión' }),
          { status: 409, headers: corsHeaders }
        )
      }

      console.error('Error insertando participación:', insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        availableSpots: excursion.capacidad - ((participantesCount ?? 0) + 1),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en join-excursion:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error no identificado',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
