import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'No autenticado' }, 401)

    const { data: requests, error } = await supabase
      .from('amistad')
      .select('id, solicitante_id, created_at')
      .eq('receptor_id', user.id)
      .eq('estado', 'pending')
      .order('created_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    if (!requests || requests.length === 0) return json({ requests: [] })

    const solicitanteIds = requests.map(r => r.solicitante_id)

    const { data: profiles } = await supabase
      .from('usuario')
      .select('id, nombreUsuario, nombre, apellido, fotoUrl')
      .in('id', solicitanteIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const result = requests.map(r => {
      const profile = profileMap.get(r.solicitante_id)
      return {
        amistadId: r.id,
        userId: r.solicitante_id,
        nombreUsuario: profile?.nombreUsuario ?? null,
        nombre: profile?.nombre ?? null,
        apellido: profile?.apellido ?? null,
        fotoUrl: profile?.fotoUrl ?? null,
        createdAt: r.created_at,
      }
    })

    return json({ requests: result })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
