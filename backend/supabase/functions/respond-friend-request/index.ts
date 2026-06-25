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

    const { amistadId, accion } = await req.json()
    if (!amistadId || !accion) return json({ error: 'amistadId y accion requeridos' }, 400)
    if (!['accepted', 'rejected'].includes(accion)) return json({ error: 'accion debe ser accepted o rejected' }, 400)

    const { data: amistad, error: fetchError } = await supabase
      .from('amistad')
      .select('id, solicitante_id, receptor_id, estado')
      .eq('id', amistadId)
      .single()

    if (fetchError || !amistad) return json({ error: 'Solicitud no encontrada' }, 404)
    if (amistad.receptor_id !== user.id) return json({ error: 'No tienes permiso para responder esta solicitud' }, 403)
    if (amistad.estado !== 'pending') return json({ error: 'Esta solicitud ya fue respondida' }, 409)

    await supabase
      .from('amistad')
      .update({ estado: accion, updated_at: new Date().toISOString() })
      .eq('id', amistadId)

    if (accion === 'accepted') {
      const { data: receptor } = await supabase.from('usuario').select('nombreUsuario').eq('id', user.id).single()
      notify(
        [amistad.solicitante_id],
        '¡Solicitud de amistad aceptada!',
        `${receptor?.nombreUsuario ?? 'Alguien'} aceptó tu solicitud de amistad`,
        'friend_request_accepted',
        { receptorId: user.id }
      )
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
