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

    const { data: friendships, error } = await supabase
      .from('amistad')
      .select('id, solicitante_id, receptor_id, updated_at')
      .or(`solicitante_id.eq.${user.id},receptor_id.eq.${user.id}`)
      .eq('estado', 'accepted')
      .order('updated_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    if (!friendships || friendships.length === 0) return json({ friends: [] })

    const friendIds = friendships.map(f =>
      f.solicitante_id === user.id ? f.receptor_id : f.solicitante_id
    )

    const { data: profiles } = await supabase
      .from('usuario')
      .select('id, nombreUsuario, nombre, apellido, fotoUrl')
      .in('id', friendIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const friends = friendships.map(f => {
      const friendId = f.solicitante_id === user.id ? f.receptor_id : f.solicitante_id
      const profile = profileMap.get(friendId)
      return {
        amistadId: f.id,
        userId: friendId,
        nombreUsuario: profile?.nombreUsuario ?? null,
        nombre: profile?.nombre ?? null,
        apellido: profile?.apellido ?? null,
        fotoUrl: profile?.fotoUrl ?? null,
        since: f.updated_at,
      }
    })

    return json({ friends })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
