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
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

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

    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const {
      nombreUsuario,
      nombre,
      apellido,
      fechaNacimiento,
      mostrarEdad,
      telefono,
      especialidades,
      materialDisponible,
      descripcion,
    } = body

    const updateData: Record<string, unknown> = {}

    if (nombreUsuario !== undefined) {
      if (nombreUsuario.length < 3 || nombreUsuario.length > 20) {
        return new Response(
          JSON.stringify({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres' }),
          { status: 400, headers: corsHeaders }
        )
      }
      if (!/^[a-zA-Z0-9_]+$/.test(nombreUsuario)) {
        return new Response(
          JSON.stringify({ error: 'Solo letras, números y guiones bajos' }),
          { status: 400, headers: corsHeaders }
        )
      }
      const { data: existing } = await supabase
        .from('usuario')
        .select('id')
        .eq('nombreUsuario', nombreUsuario)
        .neq('id', user.id)
        .maybeSingle()
      if (existing) {
        return new Response(
          JSON.stringify({ error: 'El nombre de usuario ya está en uso' }),
          { status: 409, headers: corsHeaders }
        )
      }
      updateData.nombreUsuario = nombreUsuario
    }

    if (nombre !== undefined) updateData.nombre = nombre || null
    if (apellido !== undefined) updateData.apellido = apellido || null
    if (fechaNacimiento !== undefined) updateData.fechaNacimiento = fechaNacimiento || null
    if (mostrarEdad !== undefined) updateData.mostrarEdad = mostrarEdad
    if (telefono !== undefined) updateData.telefono = telefono || null
    // fotoUrl admite null explícito (eliminar foto)
    if ('fotoUrl' in body) updateData.fotoUrl = body.fotoUrl
    if (especialidades !== undefined) updateData.especialidades = especialidades
    if (materialDisponible !== undefined) updateData.materialDisponible = materialDisponible || null
    if (descripcion !== undefined) updateData.descripcion = descripcion || null

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay campos para actualizar' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const { error: updateError } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en update-profile:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

Deno.serve(handler)
