import type { RawTransaction } from './pdfParser'

export type TxCategory = 'fixed' | 'subscription' | 'income' | 'variable'

export interface CategorizedTransaction {
  tx: RawTransaction
  category: TxCategory
  subcategory: string
}

export interface BudgetAdvice {
  income: number
  fixedCharges: number
  subscriptionTotal: number
  hiddenExpenses: number
  realCapacity: number
  monthlyDebt: number
  subscriptionRatio: number
  subscriptionAlert: boolean
  capacityAlert: boolean
  categorized: CategorizedTransaction[]
  suggestions: string[]
  monthsSaved: number
}

const FIXED_PATTERNS: [RegExp, string][] = [
  [/loyer|rent|bail|habitation/i, 'Loyer'],
  [/edf|engie|gaz|electricit|eau\s/i, 'Énergie'],
  [/sfr|orange|bouygues|free|numérique|internet|mobile/i, 'Télécom'],
  [/assurance|maaf|axa|allianz|groupama/i, 'Assurance'],
  [/impot|taxe foncière|taxe d'habitation/i, 'Impôts'],
  [/prlv sepa.*crédit|credit agricole|bnp|lcl|société générale|caisse d'épargne/i, 'Crédit bancaire'],
  [/mensualit|remboursement.*prêt|prêt immo/i, 'Remboursement prêt'],
]

const SUBSCRIPTION_PATTERNS: [RegExp, string][] = [
  [/netflix|spotify|deezer|disney|prime\s*video|canal\+|hulu/i, 'Streaming'],
  [/apple|icloud|itunes/i, 'Apple'],
  [/google\s*(one|play|workspace)/i, 'Google'],
  [/microsoft|xbox|office\s*365/i, 'Microsoft'],
  [/netlify|ionos|ovh|hostinger|siteground|o2switch/i, 'Hébergement web'],
  [/amazon\s*(prime|web)/i, 'Amazon'],
  [/adobe|figma|notion|slack|zoom/i, 'Logiciel SaaS'],
  [/gym|sport|fitness|neoness|basic.fit/i, 'Sport'],
  [/presse|magazine|journal|lemonde|lefigaro/i, 'Presse'],
  [/assurance.*mensuel|mutuelle/i, 'Mutuelle/Assurance'],
]


function categorize(tx: RawTransaction): CategorizedTransaction {
  if (tx.amount > 0) {
    return { tx, category: 'income', subcategory: 'Entrée' }
  }

  for (const [re, label] of SUBSCRIPTION_PATTERNS) {
    if (re.test(tx.label)) return { tx, category: 'subscription', subcategory: label }
  }

  for (const [re, label] of FIXED_PATTERNS) {
    if (re.test(tx.label)) return { tx, category: 'fixed', subcategory: label }
  }

  return { tx, category: 'variable', subcategory: 'Dépense variable' }
}

export function categorizeTransactions(txs: RawTransaction[]): CategorizedTransaction[] {
  return txs.map(categorize)
}

export function analyzeBudget(
  income: number,
  fixedCharges: number,
  totalDebt: number,
  monthlyDebt: number,
  txs: RawTransaction[],
  hiddenExpenses: number = 0,
): BudgetAdvice {
  const categorized = categorizeTransactions(txs)

  const subTotal = categorized
    .filter(c => c.category === 'subscription')
    .reduce((sum, c) => sum + Math.abs(c.tx.amount), 0)

  const realCapacity = Math.max(0, income - fixedCharges - subTotal - hiddenExpenses)
  const subscriptionRatio = income > 0 ? subTotal / income : 0
  const subscriptionAlert = subscriptionRatio > 0.10
  const capacityAlert = monthlyDebt > 0 && realCapacity < monthlyDebt

  const suggestions: string[] = []

  if (subscriptionAlert) {
    const excess = Math.round(subTotal - income * 0.10)
    suggestions.push(
      `Vos abonnements représentent ${Math.round(subscriptionRatio * 100)}% de vos revenus (${Math.round(subTotal)}€). Réduire de ${excess}€ libérerait ce montant chaque mois.`
    )
  }

  if (capacityAlert) {
    const deficit = Math.round(monthlyDebt - realCapacity)
    suggestions.push(
      `Votre capacité réelle (${Math.round(realCapacity)}€) est inférieure à votre mensualité dette (${Math.round(monthlyDebt)}€). Il manque ${deficit}€/mois.`
    )
  }

  // Calculate months saved if subscriptions cut to 10%
  let monthsSaved = 0
  if (subscriptionAlert && totalDebt > 0 && realCapacity > 0) {
    const excessSubs = subTotal - income * 0.10
    const extraPayment = Math.max(0, excessSubs)
    if (extraPayment > 0) {
      const currentMonths = totalDebt / Math.max(1, realCapacity)
      const improvedCapacity = realCapacity + extraPayment
      const improvedMonths = totalDebt / improvedCapacity
      monthsSaved = Math.max(0, Math.round(currentMonths - improvedMonths))
    }
  }

  if (income > 0 && income < 1000) {
    suggestions.push(`Revenus modestes (${Math.round(income)}€). Priorisez les dettes à taux élevé pour minimiser le coût total.`)
  }

  if (suggestions.length === 0 && realCapacity > monthlyDebt && monthlyDebt > 0) {
    suggestions.push(`Votre situation est saine. Vous pouvez rembourser vos dettes avec votre budget actuel.`)
  }

  return {
    income,
    fixedCharges,
    subscriptionTotal: subTotal,
    hiddenExpenses,
    realCapacity,
    monthlyDebt,
    subscriptionRatio,
    subscriptionAlert,
    capacityAlert,
    categorized,
    suggestions,
    monthsSaved,
  }
}
