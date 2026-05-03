import type { CsvParseResult } from './csvParser'

export function parseAmount(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null
  let clean = raw
    .replace(/[€$£DA]/g, '')
    .replace(/ /g, '') // espace insécable
    .replace(/\s/g, '')
    .trim()
  if (!clean) return null
  // Format français : 1.200,50 → 1200.50
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(clean)) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  }
  // Format anglais : 1,200.50 → 1200.50
  else if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(clean)) {
    clean = clean.replace(/,/g, '')
  }
  // Simple virgule décimale : 1200,50
  else {
    clean = clean.replace(',', '.')
  }
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

export function parseDate(raw: string): Date | null {
  if (!raw) return null
  const s = raw.trim()
  const fr = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (fr) {
    const year = fr[3].length === 2 ? 2000 + parseInt(fr[3]) : parseInt(fr[3])
    return new Date(year, parseInt(fr[2]) - 1, parseInt(fr[1]))
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function aggregateTransactions(
  entries: { amount: number; date: Date | null }[]
): CsvParseResult {
  let totalIncome  = 0
  let totalCharges = 0
  const dates: Date[] = []

  for (const { amount, date } of entries) {
    if (amount > 0) totalIncome  += amount
    else            totalCharges += Math.abs(amount)
    if (date) dates.push(date)
  }

  let monthsCovered = 1
  let dateFrom: string | null = null
  let dateTo:   string | null = null

  if (dates.length >= 2) {
    const minD = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())))
    const diffMs = maxD.getTime() - minD.getTime()
    monthsCovered = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)))
    dateFrom = minD.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    dateTo   = maxD.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  return {
    monthlyIncome:  Math.round(totalIncome  / monthsCovered),
    monthlyCharges: Math.round(totalCharges / monthsCovered),
    totalIncome:    Math.round(totalIncome),
    totalCharges:   Math.round(totalCharges),
    monthsCovered,
    transactionCount: entries.length,
    dateFrom,
    dateTo,
  }
}
