import type { CsvParseResult, CsvParseError } from './csvParser'
import { parseDate, aggregateTransactions } from './parseUtils'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export interface RawTransaction {
  date: Date
  label: string
  amount: number
}

// ─── Lignes à ignorer ────────────────────────────────────────────────────────
const IGNORE_RE = /solde|total|à nouveau|a nouveau|montant net|montant frais|sous.?total|report|bic|iban|rcs|tva|orias|service client|adresse|médiateur|mediateur|mod\.|extrait|bourso|garantie|réclamation|silence|approbation|période|montant da|taeg|guichet|banque|devise|n° de rib/i

// ─── Détecte si une chaîne est un montant pur (ex: "16,97" "526,27" "500,00") ─
const PURE_AMOUNT_RE = /^\d{1,3}(?:[. ]\d{3})*(?:,\d{2})?$/

// ─── Détecte une date DD/MM/YYYY en début de ligne ───────────────────────────

// ─── Parse un montant pur format français (sans signe) ───────────────────────
function parsePureAmount(s: string): number | null {
  const clean = s.replace(/[. ]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

// ─── Détecte si une ligne contient uniquement des infos de conversion devise ──
const CONVERSION_RE = /\d+[,.]?\d*\s+USD\s*\/|1 euro\s*=/i

// ─── Détecte une ligne de référence bancaire (pas une transaction) ────────────
const REF_LINE_RE = /^(rèf|ref|rum|num|rèf\s*--|rèf\s*:|\d{6,}[a-z]|[a-z]{2,}\d{4,})/i

// ─── Extraction spécifique format Boursorama ─────────────────────────────────
// Structure :
//   DD/MM/YYYY  LIBELLÉ  DD/MM/YYYY  [montant_débit]  [montant_crédit]
// ou sur plusieurs fragments PDF :
//   ligne 1 : "DD/MM/YYYY LIBELLÉ DD/MM/YYYY"
//   ligne 2 : "16,97"   (= débit, pas de crédit)
//   ligne 3 : "526,27"  (= crédit, pas de débit)
//
// On détecte les crédits vs débits via la colonne X des fragments PDF.

interface PdfFragment {
  x: number
  y: number
  text: string
  page: number
}

function extractBoursorama(fragments: PdfFragment[]): RawTransaction[] {
  // Trier par page → y décroissant → x croissant
  const sorted = [...fragments].sort((a, b) =>
    a.page !== b.page ? a.page - b.page :
    b.y !== a.y ? b.y - a.y : a.x - b.x
  )

  // Regrouper par (page, y arrondi à 2px)
  const rows = new Map<string, PdfFragment[]>()
  for (const f of sorted) {
    const key = `${f.page}_${Math.round(f.y / 2) * 2}`
    if (!rows.has(key)) rows.set(key, [])
    rows.get(key)!.push(f)
  }

  // Détecter la position X approximative des colonnes Débit/Crédit
  // En analysant toutes les lignes qui contiennent un montant pur
  // Boursorama : Débit ≈ x 390-430, Crédit ≈ x 460-510 (valeurs en pts PDF)
  // On détecte dynamiquement en cherchant les montants purs sur des lignes avec date
  let debitXZone  = 390  // valeur par défaut
  let creditXZone = 470  // valeur par défaut

  // Première passe : calibration des colonnes
  const rowList = [...rows.values()].sort((a, b) =>
    a[0].page !== b[0].page ? a[0].page - b[0].page : b[0].y - a[0].y
  )

  // Collecter tous les X de fragments contenant un montant pur
  const amountXPositions: number[] = []
  for (const row of rowList) {
    for (const f of row) {
      if (PURE_AMOUNT_RE.test(f.text.trim())) {
        amountXPositions.push(f.x)
      }
    }
  }
  if (amountXPositions.length >= 2) {
    const uniqueX = [...new Set(amountXPositions)].sort((a, b) => a - b)
    if (uniqueX.length >= 2) {
      // Les deux clusters X les plus fréquents = colonnes débit et crédit
      debitXZone  = uniqueX[Math.floor(uniqueX.length * 0.4)]
      creditXZone = uniqueX[Math.floor(uniqueX.length * 0.8)]
    }
  }

  const transactions: RawTransaction[] = []

  // Deuxième passe : extraction
  // Une transaction Boursorama ressemble à :
  //   [date] [libellé] [date valeur]   sur une ligne
  //   [montant]                        sur la ligne suivante (dans colonne débit OU crédit)
  let pendingTx: { date: Date; label: string } | null = null

  for (const row of rowList) {
    const lineText = row.map(f => f.text).join(' ').replace(/\s+/g, ' ').trim()

    if (!lineText || IGNORE_RE.test(lineText) || CONVERSION_RE.test(lineText) || REF_LINE_RE.test(lineText)) {
      pendingTx = null
      continue
    }

    // Chercher une date en début de ligne
    const dateMatch = lineText.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)/)
    if (dateMatch) {
      const date = parseDate(dateMatch[1])
      if (!date) { pendingTx = null; continue }

      // Nettoyer le libellé : enlever la date de valeur en fin (DD/MM/YYYY)
      let label = dateMatch[2].replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/, '').trim()

      // Cas où le montant est sur la MÊME ligne (rare mais possible)
      // Chercher un montant pur à la fin du libellé
      const inlineAmountMatch = label.match(/\s+(\d{1,3}(?:[. ]\d{3})*(?:,\d{2})?)$/)
      if (inlineAmountMatch) {
        const amount = parsePureAmount(inlineAmountMatch[1])
        if (amount !== null && amount > 0) {
          label = label.slice(0, label.length - inlineAmountMatch[0].length).trim()
          // Détecter débit/crédit via position X du fragment montant
          const amountFrag = row.find(f => f.text.trim() === inlineAmountMatch[1].trim())
          const isCredit = amountFrag ? amountFrag.x >= (debitXZone + creditXZone) / 2 : false
          transactions.push({ date, label, amount: isCredit ? amount : -amount })
          pendingTx = null
          continue
        }
      }

      pendingTx = { date, label }
      continue
    }

    // Ligne suivante : est-ce un montant pur ?
    if (pendingTx) {
      const singleFragment = row.length === 1 && PURE_AMOUNT_RE.test(row[0].text.trim())
      const allPureAmounts = row.every(f => PURE_AMOUNT_RE.test(f.text.trim()))

      if (singleFragment || allPureAmounts) {
        // Déterminer débit ou crédit par position X
        const amountFrag = row[0]
        const amount = parsePureAmount(amountFrag.text.trim())
        if (amount !== null && amount > 0) {
          const midX   = (debitXZone + creditXZone) / 2
          const isCredit = amountFrag.x >= midX
          transactions.push({
            date:   pendingTx.date,
            label:  pendingTx.label,
            amount: isCredit ? amount : -amount,
          })
        }
        pendingTx = null
        continue
      }

      // Deux colonnes sur la même ligne (débit et crédit séparés)
      if (row.length === 2) {
        const left  = parsePureAmount(row[0].text.trim())
        const right = parsePureAmount(row[1].text.trim())
        if (left !== null && right === null) {
          transactions.push({ date: pendingTx.date, label: pendingTx.label, amount: -left })
          pendingTx = null
          continue
        }
        if (right !== null && left === null) {
          transactions.push({ date: pendingTx.date, label: pendingTx.label, amount: right })
          pendingTx = null
          continue
        }
      }

      // Ligne de continuation du libellé (référence, etc.) — ne pas reset pendingTx
      // si la ligne ressemble à une ref bancaire ou conversion
    }
  }

  return transactions
}

// ─── Fallback générique (non-Boursorama) ─────────────────────────────────────
function extractGeneric(lines: string[]): RawTransaction[] {
  const DATE_AMOUNT_RE = /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\s+(.+?)\s+([+\-]?\d[\d .,]*\d)\s*[€$]?\s*$/

  const transactions: RawTransaction[] = []
  for (const line of lines) {
    if (IGNORE_RE.test(line)) continue
    const m = line.match(DATE_AMOUNT_RE)
    if (!m) continue
    const date = parseDate(m[1])
    if (!date) continue
    const amount = parsePureAmount(m[3].replace(/[+ ]/g, ''))
    if (amount === null || amount === 0) continue
    const sign = m[3].trim().startsWith('-') ? -1 : 1
    transactions.push({ date, label: m[2].trim(), amount: sign * amount })
  }
  return transactions
}

// ─── Parseur principal ────────────────────────────────────────────────────────
export async function parseBankPdf(
  file: File
): Promise<(CsvParseResult & { rawTransactions: RawTransaction[] }) | CsvParseError> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const fragments: PdfFragment[] = []
    const lines: string[] = []

    for (let p = 1; p <= pdf.numPages; p++) {
      const page    = await pdf.getPage(p)
      const content = await page.getTextContent()

      const byY = new Map<number, Array<{ x: number; text: string }>>()

      for (const item of content.items) {
        if (!('str' in item)) continue
        const t   = item as { transform: number[]; str: string }
        const txt = t.str.trim()
        if (!txt) continue
        const x = Math.round(t.transform[4])
        const y = Math.round(t.transform[5])

        fragments.push({ x, y, text: txt, page: p })

        if (!byY.has(y)) byY.set(y, [])
        byY.get(y)!.push({ x, text: txt })
      }

      for (const [, frags] of [...byY.entries()].sort((a, b) => b[0] - a[0])) {
        frags.sort((a, b) => a.x - b.x)
        const line = frags.map(f => f.text).join(' ').replace(/\s+/g, ' ').trim()
        if (line) lines.push(line)
      }
    }

    if (!lines.length) {
      return { message: 'Le PDF ne contient pas de texte extractible (PDF scanné ?).' }
    }

    // Détecter format Boursorama
    const isBoursorama = lines.some(l => /bourso(rama|bank)/i.test(l))

    let transactions: RawTransaction[]
    if (isBoursorama) {
      transactions = extractBoursorama(fragments)
    } else {
      transactions = extractGeneric(lines)
    }

    if (!transactions.length) {
      return {
        message: 'Aucune transaction reconnue. Le format de ce relevé n\'est pas supporté — utilisez la correction manuelle.',
      }
    }

    const entries = transactions.map(t => ({ amount: t.amount, date: t.date }))
    const result  = aggregateTransactions(entries)

    return { ...result, rawTransactions: transactions }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { message: `Impossible de lire le PDF : ${msg}` }
  }
}
