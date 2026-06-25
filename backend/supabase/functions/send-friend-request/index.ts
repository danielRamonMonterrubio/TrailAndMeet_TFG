import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function notify(userIds: string[], titulo: string, cuerpo: string, tipo: string, data?: Record<string, string>) {
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ userIds, titulo, cuerpo, tipo, data }),
  }).catch(err => console.error('Error notificando:', err))
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

    const { receptorId } = await req.json()
    if (!receptorId) return json({ error: 'receptorId requerido' }, 400)
    if (receptorId === user.id) return json({ error: 'No puedes enviarte una solicitud a ti mismo' }, 400)

    const { data: existing } = await supabase
      .from('amistad')
      .select('id, solicitante_id, receptor_id, estado')
      .or(`and(solicitante_id.eq.${user.id},receptor_id.eq.${receptorId}),and(solicitante_id.eq.${receptorId},receptor_id.eq.${user.id})`)
      .maybeSingle()

    if (existing) {
      if (existing.estado === 'accepted')
        return json({ error: 'Ya sois amigos' }, 409)

      if (existing.solicitante_id === user.id && existing.estado === 'pending')
        return json({ error: 'Ya enviaste una solicitud a este usuario' }, 409)

      if (existing.receptor_id === user.id && existing.estado === 'pending')
        return json({ error: 'Este usuario ya te envió una solicitud. Revisa tus solicitudes pendientes.' }, 409)

      if (existing.solicitante_id === user.id && existing.estado === 'rejected') {
        await supabase
          .from('amistad')
          .update({ estado: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        const { data: me } = await supabase.from('usuario').select('nombreUsuario').eq('id', user.id).single()
        notify([receptorId], '¡Nueva solicitud de amistad!', `${me?.nombreUsuario ?? 'Alguien'} quiere ser tu amigo/a`, 'friend_request_received', { solicitanteId: user.id })
        return json({ ok: true })
      }
      // Caso restante: (otro→yo, rejected) — el otro me rechazó antes, yo ahora le envío → INSERT
    }

    const { error: insertError } = await supabase
      .from('amistad')
      .insert({ solicitante_id: user.id, receptor_id: receptorId, estado: 'pending' })

    if (insertError) return json({ error: insertError.message }, 500)

    const { data: me } = await supabase.from('usuario').select('nombreUsuario').eq('id', user.id).single()
    notify([receptorId], '¡Nueva solicitud de amistad!', `${me?.nombreUsuario ?? 'Alguien'} quiere ser tu amigo/a`, 'friend_request_received', { solicitanteId: user.id })

    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
