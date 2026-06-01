import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

function notify(userIds: string[], titulo: string, cuerpo: string, tipo: string, data?: Record<string, string>) {
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ userIds, titulo, cuerpo, tipo, data }),
  }).catch(err => console.error('Error notificando:', err))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { excursionId } = body
    console.log('🗑️ delete-excursion llamado con body:', JSON.stringify(body))

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

    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, creadoPor, GPXPath, titulo')
      .eq('id', excursionId)
      .single()

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (excursion.creadoPor !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Solo el organizador puede eliminar la excursión' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Obtener participantes aceptados antes de borrar (para notificarles)
    const { data: participantes } = await supabase
      .from('participacion')
      .select('usuarioId')
      .eq('excursionId', excursionId)
      .eq('status', 'accepted')
      .neq('usuarioId', user.id)

    if (excursion.GPXPath) {
      let storagePath = excursion.GPXPath
      if (storagePath.startsWith('http')) {
        const marker = '/gpx-files/'
        const idx = storagePath.indexOf(marker)
        storagePath = idx !== -1 ? storagePath.substring(idx + marker.length) : storagePath
      }
      await supabase.storage.from('gpx-files').remove([storagePath])
    }

    const { error: deleteError, count } = await supabase
      .from('excursion')
      .delete({ count: 'exact' })
      .eq('id', excursionId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (participantes && participantes.length > 0) {
      const ids = participantes.map((p: { usuarioId: string }) => p.usuarioId)
      notify(ids, 'Excursión cancelada', `La excursión "${excursion.titulo}" ha sido cancelada`, 'excursion_deleted', {})
    }

    return new Response(
      JSON.stringify({ success: true, deletedCount: count }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en delete-excursion:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
