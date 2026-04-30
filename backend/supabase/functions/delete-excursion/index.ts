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
    const body = await req.json()
    const { excursionId } = body
    console.log('🗑️ delete-excursion llamado con body:', JSON.stringify(body))

    if (!excursionId) {
      console.log('❌ excursionId faltante')
      return new Response(
        JSON.stringify({ error: 'excursionId requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Authorization header presente:', !!authHeader)
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // authClient valida el token del usuario
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // supabase con SERVICE_ROLE_KEY sin Authorization — bypassa RLS para operar
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: userError } = await authClient.auth.getUser(token)
    console.log('👤 Usuario obtenido:', user?.id, '| Error auth:', userError?.message)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: excursion, error: excursionError } = await supabase
      .from('excursion')
      .select('id, creadoPor, GPXPath')
      .eq('id', excursionId)
      .single()

    console.log('🏔️ Excursión encontrada:', JSON.stringify(excursion), '| Error:', excursionError?.message)

    if (excursionError || !excursion) {
      return new Response(
        JSON.stringify({ error: 'Excursión no encontrada' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('🔍 Comparando creadoPor:', excursion.creadoPor, 'con userId:', user.id, '| Coincide:', excursion.creadoPor === user.id)

    if (excursion.creadoPor !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Solo el organizador puede eliminar la excursión' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Borrar GPX de Storage si existe (no bloqueante: log error y continuar)
    if (excursion.GPXPath) {
      // Soporta tanto path relativo como URL pública completa
      let storagePath = excursion.GPXPath
      if (storagePath.startsWith('http')) {
        const marker = '/gpx-files/'
        const idx = storagePath.indexOf(marker)
        storagePath = idx !== -1 ? storagePath.substring(idx + marker.length) : storagePath
      }
      console.log('🗺️ Borrando GPX de Storage - raw:', excursion.GPXPath, '| path usado:', storagePath)
      const { data: removeData, error: storageError } = await supabase.storage
        .from('gpx-files')
        .remove([storagePath])
      console.log('🗺️ Storage delete resultado - data:', JSON.stringify(removeData), '| error:', storageError?.message ?? 'OK')
    }

    // Borrar excursión (cascada se encarga de participacion)
    console.log('💥 Ejecutando DELETE en excursion id:', excursionId, 'tipo:', typeof excursionId)
    const { error: deleteError, count } = await supabase
      .from('excursion')
      .delete({ count: 'exact' })
      .eq('id', excursionId)

    console.log('💥 DELETE resultado - filas afectadas:', count, '| error:', deleteError?.message ?? 'ninguno')

    if (deleteError) {
      console.error('Error borrando excursión:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: corsHeaders }
      )
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
