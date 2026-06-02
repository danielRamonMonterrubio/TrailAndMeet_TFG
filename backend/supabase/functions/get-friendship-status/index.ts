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

    const { otherUserId } = await req.json()
    if (!otherUserId) return json({ error: 'otherUserId requerido' }, 400)

    const { data: amistad } = await supabase
      .from('amistad')
      .select('id, solicitante_id, receptor_id, estado')
      .or(`and(solicitante_id.eq.${user.id},receptor_id.eq.${otherUserId}),and(solicitante_id.eq.${otherUserId},receptor_id.eq.${user.id})`)
      .maybeSingle()

    if (!amistad || amistad.estado === 'rejected') return json({ status: 'none' })

    if (amistad.estado === 'accepted') return json({ status: 'accepted', amistadId: amistad.id })

    if (amistad.solicitante_id === user.id) return json({ status: 'pending_sent', amistadId: amistad.id })

    return json({ status: 'pending_received', amistadId: amistad.id })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
