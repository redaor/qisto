import { supabase } from '@/lib/supabase'
import type { Debt } from '@/types'

// ── Types Bridge ──────────────────────────────────────────────────────────────

export interface BridgeAccount {
  id: number
  name: string
  balance: number
  currency_code: string
  type: string
  iban: string | null
}

export interface BridgeTransaction {
  id: number
  amount: number
  description: string
  date: string
}

export interface SyncSuggestion {
  transaction:  BridgeTransaction
  debt:         Debt
  confidence:   number  // 1.0 exact, 0.9 ±2%
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function invoke<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bridge-proxy', {
    body,
    headers: { 'X-Bridge-Action': action },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

async function getStoredConnection(userId: string) {
  const { data } = await supabase
    .from('bridge_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

async function touchLastSync(userId: string) {
  await supabase
    .from('bridge_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ── Service public ────────────────────────────────────────────────────────────

/**
 * Crée ou récupère un utilisateur Bridge associé au user Supabase.
 * Stocke uuid + access_token dans bridge_connections.
 */
export async function initBridgeUser(userId: string, email: string): Promise<void> {
  const existing = await getStoredConnection(userId)
  if (existing?.bridge_access_token) return   // déjà initialisé

  // Mot de passe Bridge dérivé de l'uuid Supabase (déterministe, jamais affiché)
  const password = `Qisto_${userId.slice(0, 16)}`

  let uuid: string
  let access_token: string

  try {
    // Essayer de créer l'utilisateur Bridge
    const res = await invoke<{ uuid: string; access_token: string }>('create-user', { email, password })
    uuid = res.uuid
    access_token = res.access_token
  } catch {
    // L'utilisateur Bridge existe déjà → récupérer un token
    const res = await invoke<{ access_token: string }>('get-token', { email, password })
    uuid = existing?.bridge_user_uuid ?? ''
    access_token = res.access_token
  }

  await supabase.from('bridge_connections').upsert({
    user_id:             userId,
    bridge_user_uuid:    uuid,
    bridge_access_token: access_token,
    connected_at:        new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

/**
 * Génère l'URL de connexion bancaire Bridge.
 */
export async function getConnectUrl(userId: string): Promise<string> {
  const conn = await getStoredConnection(userId)
  if (!conn?.bridge_access_token) throw new Error('Connexion Bridge non initialisée')

  const res = await invoke<{ redirect_url: string }>('get-connect-url', {
    access_token: conn.bridge_access_token,
  })
  return res.redirect_url
}

/**
 * Récupère la liste des comptes bancaires.
 */
export async function getAccounts(userId: string): Promise<BridgeAccount[]> {
  const conn = await getStoredConnection(userId)
  if (!conn?.bridge_access_token) throw new Error('Connexion Bridge non initialisée')

  const res = await invoke<{ accounts: BridgeAccount[] }>('get-accounts', {
    access_token: conn.bridge_access_token,
  })
  await touchLastSync(userId)
  return res.accounts
}

/**
 * Récupère les 50 dernières transactions d'un compte.
 */
export async function getTransactions(
  userId: string,
  accountId: number
): Promise<BridgeTransaction[]> {
  const conn = await getStoredConnection(userId)
  if (!conn?.bridge_access_token) throw new Error('Connexion Bridge non initialisée')

  const res = await invoke<{ transactions: BridgeTransaction[] }>('get-transactions', {
    access_token: conn.bridge_access_token,
    account_id:   accountId,
  })
  await touchLastSync(userId)
  return res.transactions
}

/**
 * Compare des transactions avec des dettes pour trouver des correspondances.
 * Règle : montant identique à ±2% → suggestion de marquage "payé".
 */
export function matchTransactionsWithDebts(
  transactions: BridgeTransaction[],
  debts: Debt[]
): SyncSuggestion[] {
  const suggestions: SyncSuggestion[] = []
  const activeDebts = debts.filter(d => d.type === 'i_owe' && d.remaining_amount > 0)

  for (const tx of transactions) {
    // On cherche des entrées d'argent (remboursements reçus)
    if (tx.amount <= 0) continue
    const amount = tx.amount

    for (const debt of activeDebts) {
      const target = debt.remaining_amount
      const diff   = Math.abs(amount - target) / target

      if (diff === 0) {
        suggestions.push({ transaction: tx, debt, confidence: 1.0 })
      } else if (diff <= 0.02) {
        suggestions.push({ transaction: tx, debt, confidence: 0.9 })
      }
    }
  }

  // Trier par confiance décroissante
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}
