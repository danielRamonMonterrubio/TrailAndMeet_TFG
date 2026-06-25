import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('⚡ download-gpx Edge Function iniciada')
    
    const { gpxPath } = await req.json()
    console.log('Payload:', { gpxPath })

    if (!gpxPath) {
      console.log('No gpxPath')
      return new Response(
        JSON.stringify({ error: 'gpxPath requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('gpxPath válido:', gpxPath)

    // Crear cliente Supabase CON SERVICE_ROLE_KEY (sin restricciones RLS)
    console.log('🔑 Creando cliente...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    console.log('Cliente OK')

    // Descargar directamente el archivo
    console.log('Descargando GPX...')
    const { data, error: downloadError } = await supabase.storage
      .from('gpx-files')
      .download(gpxPath)

    console.log('📨 Download response:', { hasData: !!data, error: downloadError?.message })

    if (downloadError) {
      console.error(' Error download:', downloadError)
      return new Response(
        JSON.stringify({ error: `Download error: ${downloadError.message}` }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!data) {
      console.log(' No data')
      return new Response(
        JSON.stringify({ error: 'No file data' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Convertir Blob a string
    console.log('📖 Converting blob to text...')
    const gpxText = await data.text()
    console.log('✅ Convertido, longitud:', gpxText.length)

    // Retornar contenido directamente
    const response = {
      success: true,
      gpxContent: gpxText,
    }
    
    console.log('📤 Enviando respuesta')
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    )
  } catch (error) {
    console.error('Error en download-gpx:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error no identificado',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}
