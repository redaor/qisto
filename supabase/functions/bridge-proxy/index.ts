import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bridge-action',
}

const BRIDGE_BASE = 'https://api.bridgeapi.io/v2'
const BRIDGE_VERSION = '2021-06-01'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth : vérifier que l'appelant est un user Supabase authentifié ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401)
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client user (pour vérifier le JWT)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    // Client service role (pour lire app_settings)
    const adminClient = createClient(supabaseUrl, serviceKey)

    // ── Lire les credentials Bridge depuis app_settings ──
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('key, value')
      .in('key', ['bridge_client_id', 'bridge_client_secret', 'bridge_redirect_url'])

    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.key] = row.value

    const clientId     = cfg['bridge_client_id']
    const clientSecret = cfg['bridge_client_secret']
    const redirectUrl  = cfg['bridge_redirect_url']

    if (!clientId || !clientSecret) {
      return json({ error: 'bridge_not_configured' }, 500)
    }

    const bridgeHeaders = (accessToken?: string) => ({
      'Content-Type': 'application/json',
      'Client-Id': clientId,
      'Client-Secret': clientSecret,
      'Bridge-Version': BRIDGE_VERSION,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    })

    // ── Router par action ──
    const action = req.headers.get('X-Bridge-Action')
    const body   = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    // ── create-user ──
    if (action === 'create-user') {
      const { email, password } = body
      const res = await fetch(`${BRIDGE_BASE}/users`, {
        method: 'POST',
        headers: bridgeHeaders(),
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return handleBridgeError(res.status, data)
      return json({ uuid: data.uuid, access_token: data.access_token })
    }

    // ── get-token ──
    if (action === 'get-token') {
      const { email, password } = body
      const res = await fetch(`${BRIDGE_BASE}/oauth/token`, {
        method: 'POST',
        headers: bridgeHeaders(),
        body: JSON.stringify({ username: email, password, grant_type: 'password' }),
      })
      const data = await res.json()
      if (!res.ok) return handleBridgeError(res.status, data)
      return json({ access_token: data.access_token })
    }

    // ── get-connect-url ──
    if (action === 'get-connect-url') {
      const { access_token } = body
      const res = await fetch(`${BRIDGE_BASE}/connect/items/add/url`, {
        method: 'POST',
        headers: bridgeHeaders(access_token),
        body: JSON.stringify({ redirect_url: redirectUrl }),
      })
      const data = await res.json()
      if (!res.ok) return handleBridgeError(res.status, data)
      return json({ redirect_url: data.redirect_url })
    }

    // ── get-accounts ──
    if (action === 'get-accounts') {
      const { access_token } = body
      const res = await fetch(`${BRIDGE_BASE}/accounts`, {
        method: 'GET',
        headers: bridgeHeaders(access_token),
      })
      const data = await res.json()
      if (!res.ok) return handleBridgeError(res.status, data)
      const accounts = (data.resources ?? []).map((a: Record<string, unknown>) => ({
        id:            a.id,
        name:          a.name,
        balance:       a.balance,
        currency_code: a.currency_code,
        type:          a.type,
        iban:          a.iban ?? null,
      }))
      return json({ accounts })
    }

    // ── get-transactions ──
    if (action === 'get-transactions') {
      const { access_token, account_id } = body
      const url = `${BRIDGE_BASE}/transactions?account_id=${account_id}&limit=50`
      const res = await fetch(url, {
        method: 'GET',
        headers: bridgeHeaders(access_token),
      })
      const data = await res.json()
      if (!res.ok) return handleBridgeError(res.status, data)
      const transactions = (data.resources ?? []).map((t: Record<string, unknown>) => ({
        id:          t.id,
        amount:      t.amount,
        description: t.description,
        date:        t.date,
      }))
      return json({ transactions })
    }

    return json({ error: 'unknown_action' }, 400)

  } catch (err) {
    console.error('[bridge-proxy] unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function handleBridgeError(status: number, data: unknown) {
  if (status === 401) return json({ error: 'token_expired' }, 401)
  if (status === 429) return json({ error: 'rate_limit' }, 429)
  console.error('[bridge-proxy] Bridge API error:', status, data)
  return json({ error: 'bridge_error' }, 502)
}
