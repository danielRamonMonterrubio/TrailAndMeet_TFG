import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { foroId, password } = await req.json()

    if (!foroId) {
      return new Response(JSON.stringify({ error: 'foroId es requerido' }), { status: 400, headers: corsHeaders })
    }

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

    const { data: foro } = await supabase
      .from('foro')
      .select('id, tipo, password_hash')
      .eq('id', foroId)
      .maybeSingle()

    if (!foro) {
      return new Response(JSON.stringify({ error: 'Foro no encontrado' }), { status: 404, headers: corsHeaders })
    }

    const { data: existente } = await supabase
      .from('foro_miembro')
      .select('foroId')
      .eq('foroId', foroId)
      .eq('usuarioId', user.id)
      .maybeSingle()

    if (existente) {
      return new Response(JSON.stringify({ error: 'Ya eres miembro de este foro' }), { status: 409, headers: corsHeaders })
    }

    if (foro.tipo === 'privado') {
      if (!password) {
        return new Response(JSON.stringify({ error: 'Contraseña requerida para foros privados' }), { status: 400, headers: corsHeaders })
      }
      const isValid = bcrypt.compareSync(password, foro.password_hash)
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 403, headers: corsHeaders })
      }
    }

    const { error: insertError } = await supabase
      .from('foro_miembro')
      .insert({ foroId, usuarioId: user.id })

    if (insertError) {
      console.error('Error uniéndose al foro:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en join-forum:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
