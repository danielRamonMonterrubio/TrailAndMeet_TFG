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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('participacion')
      .select('usuarioId, fechaUnion, attendance_confirmed_at, usuario:usuarioId(id, nombreUsuario)')
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')
      .order('fechaUnion', { ascending: true })

    if (error) {
      console.error('Error listando participantes:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    const participants = (data ?? []).map((row: any) => ({
      usuarioId: row.usuarioId,
      nombreUsuario: row.usuario?.nombreUsuario ?? null,
      fechaUnion: row.fechaUnion,
      attendanceConfirmed: !!row.attendance_confirmed_at,
      attendanceConfirmedAt: row.attendance_confirmed_at,
    }))

    return new Response(
      JSON.stringify({ participants }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en get-excursion-participants:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
