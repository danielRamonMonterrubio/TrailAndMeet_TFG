import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  console.log('Handler invocado, método:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('Petición OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    console.log('Email recibido:', email)

    if (!email) {
      console.log('Email vacío')
      return new Response(
        JSON.stringify({ error: 'Email requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Creando cliente Supabase...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Llamando RPC check_email_exists...')
    const { data, error } = await supabase.rpc('check_email_exists', {
      email_input: email,
    })

    console.log('RPC respondió. Error:', error, 'Data:', data)

    if (error) {
      console.error('Error en RPC:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Éxito, existe:', data)
    return new Response(
      JSON.stringify({ exists: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en catch:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)