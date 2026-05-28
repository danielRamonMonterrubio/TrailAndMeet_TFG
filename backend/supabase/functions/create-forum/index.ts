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
    const { titulo, descripcion, tipo, categorias, password, portada_url } = await req.json()

    if (!titulo?.trim() || !descripcion?.trim() || !tipo) {
      return new Response(
        JSON.stringify({ error: 'titulo, descripcion y tipo son requeridos' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!['publico', 'privado'].includes(tipo)) {
      return new Response(
        JSON.stringify({ error: 'tipo debe ser publico o privado' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (tipo === 'privado' && (!password || !password.trim())) {
      return new Response(
        JSON.stringify({ error: 'Los foros privados requieren contraseña' }),
        { status: 400, headers: corsHeaders }
      )
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

    let password_hash: string | null = null
    if (tipo === 'privado' && password) {
      password_hash = bcrypt.hashSync(password.trim(), 10)
    }

    const { data: foro, error: insertError } = await supabase
      .from('foro')
      .insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        password_hash,
        portada_url: portada_url ?? null,
        categorias: Array.isArray(categorias) ? categorias : [],
        creadoPor: user.id,
      })
      .select('id, codigo, titulo, descripcion, tipo, portada_url, categorias, creadoPor, created_at')
      .single()

    if (insertError) {
      console.error('Error creando foro:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders })
    }

    await supabase.from('foro_miembro').insert({ foroId: foro.id, usuarioId: user.id })

    let portadaSignedUrl: string | null = null
    if (foro.portada_url) {
      const { data: signed } = await supabase.storage.from('forum-images').createSignedUrl(foro.portada_url, 3600)
      portadaSignedUrl = signed?.signedUrl ?? null
    }

    return new Response(
      JSON.stringify({ success: true, foro: { ...foro, portada_url: portadaSignedUrl } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en create-forum:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
