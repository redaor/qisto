import Papa from 'papaparse'
import { parseAmount, parseDate, aggregateTransactions } from './parseUtils'

export interface CsvParseResult {
  monthlyIncome: number
  monthlyCharges: number
  totalIncome: number
  totalCharges: number
  monthsCovered: number
  transactionCount: number
  dateFrom: string | null
  dateTo: string | null
}

export interface CsvParseError {
  message: string
}

const DATE_KEYS   = ['date', 'date opération', 'dateoperation', 'date_operation', 'datevaleur', 'date valeur', 'date_valeur', 'operation date']
const AMOUNT_KEYS = ['montant', 'amount', 'debit', 'crédit', 'credit', 'valeur', 'somme', 'transaction']

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/[^a-zàâéèêëîïôùûç ]/g, '').trim()
}

function findColumn(headers: string[], keywords: string[]): string | null {
  for (const h of headers) {
    const norm = normalizeKey(h)
    if (keywords.some(k => norm.includes(k))) return h
  }
  return null
}

export function parseBankCsv(file: File): Promise<CsvParseResult | CsvParseError> {
  return new Promise(resolve => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const rows = results.data as Record<string, string>[]
          if (!rows.length) { resolve({ message: 'Le fichier est vide ou illisible.' }); return }

          const headers   = Object.keys(rows[0])
          const dateCol   = findColumn(headers, DATE_KEYS)
          const amountCol = findColumn(headers, AMOUNT_KEYS)
          const debitCol  = findColumn(headers, ['debit', 'débit', 'dépense', 'depense', 'sortie'])
          const creditCol = findColumn(headers, ['credit', 'crédit', 'entrée', 'entree', 'revenu'])

          if (!amountCol && !(debitCol && creditCol)) {
            resolve({ message: `Aucune colonne de montant reconnue. Colonnes trouvées : ${headers.join(', ')}` })
            return
          }

          const entries: { amount: number; date: Date | null }[] = []

          for (const row of rows) {
            const date = dateCol ? parseDate(row[dateCol] ?? '') : null

            if (debitCol && creditCol) {
              const debit  = parseAmount(row[debitCol]  ?? '')
              const credit = parseAmount(row[creditCol] ?? '')
              if (credit !== null && credit > 0) entries.push({ amount:  credit, date })
              if (debit  !== null && debit  > 0) entries.push({ amount: -debit,  date })
            } else {
              const amount = parseAmount(row[amountCol!] ?? '')
              if (amount !== null) entries.push({ amount, date })
            }
          }

          if (!entries.length) { resolve({ message: 'Aucune transaction valide trouvée dans le fichier.' }); return }

          resolve(aggregateTransactions(entries))
        } catch {
          resolve({ message: 'Erreur inattendue lors de la lecture du fichier.' })
        }
      },
      error(err) {
        resolve({ message: `Impossible de lire le fichier : ${err.message}` })
      },
    })
  })
}

export function isCsvError(r: CsvParseResult | CsvParseError): r is CsvParseError {
  return 'message' in r
}
