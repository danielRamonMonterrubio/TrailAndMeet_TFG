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

    // Borrar la participación; .select() para saber si existía
    const { data: deleted, error: deleteError } = await supabase
      .from('participacion')
      .delete()
      .eq('excursionId', excursionId)
      .eq('usuarioId', user.id)
      .select('excursionId')

    if (deleteError) {
      console.error('Error borrando participación:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!deleted || deleted.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No estás unido a esta excursión' }),
        { status: 404, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en leave-excursion:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error no identificado',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
