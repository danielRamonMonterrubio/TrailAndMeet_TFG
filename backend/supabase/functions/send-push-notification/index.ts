import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlStr(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL') ?? ''
  const privateKeyRaw = (Deno.env.get('FCM_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = base64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64urlStr(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const signingInput = `${header}.${payload}`

  const pemBody = privateKeyRaw
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  )

  const signature = base64url(new Uint8Array(signatureBuffer))
  const jwt = `${signingInput}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    console.error('Error obteniendo access token:', JSON.stringify(tokenData))
    throw new Error('No se pudo obtener access token de Google')
  }
  return tokenData.access_token
}

async function sendFCMv1(token: string, titulo: string, cuerpo: string, data?: Record<string, string>) {
  const projectId = Deno.env.get('FCM_PROJECT_ID') ?? ''
  try {
    const accessToken = await getAccessToken()
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: titulo, body: cuerpo },
          data: data ?? {},
          android: { priority: 'high' },
        },
      }),
    })
    const resText = await res.text()
    console.log('FCM v1 status:', res.status, 'body:', resText)
  } catch (err) {
    console.error('Error enviando FCM:', err)
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userIds, titulo, cuerpo, tipo, data } = await req.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !titulo || !cuerpo || !tipo) {
      return new Response(JSON.stringify({ error: 'userIds, titulo, cuerpo y tipo son requeridos' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Insertar notificaciones en tabla
    const rows = userIds.map((userId: string) => ({ userId, titulo, cuerpo, tipo, data: data ?? {} }))
    const { error: insertError } = await supabase.from('notificacion').insert(rows)
    if (insertError) console.error('Error insertando notificaciones:', insertError)

    // Obtener tokens FCM y enviar
    const { data: tokens } = await supabase.from('push_token').select('token').in('userId', userIds)
    if (tokens && tokens.length > 0) {
      await Promise.all(tokens.map(({ token }: { token: string }) => sendFCMv1(token, titulo, cuerpo, data)))
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Error en send-push-notification:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error no identificado' }), { status: 500, headers: corsHeaders })
  }
}

Deno.serve(handler)
