import { useRef, useState } from 'react'
import { parseBankCsv, isCsvError } from '@/lib/csvParser'
import { parseBankPdf } from '@/lib/pdfParser'
import type { CsvParseResult } from '@/lib/csvParser'
import type { RawTransaction } from '@/lib/pdfParser'
import { formatCurrency } from '@/lib/formatters'
import type { Currency } from '@/types'

interface Props {
  currency: Currency
  onApply: (income: number, charges: number, rawTransactions: RawTransaction[]) => void
}

type State = 'idle' | 'parsing' | 'result' | 'edit' | 'error'

function getFileType(file: File): 'csv' | 'pdf' | null {
  if (file.name.endsWith('.csv') || file.type === 'text/csv') return 'csv'
  if (file.name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  return null
}

// ─── Sous-composant : édition manuelle des montants ──────────────────────────
function ManualEditor({
  income,
  charges,
  onConfirm,
  onCancel,
}: {
  income: number
  charges: number
  onConfirm: (income: number, charges: number) => void
  onCancel: () => void
}) {
  const [inc, setInc] = useState(String(income))
  const [chg, setChg] = useState(String(charges))

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 flex items-center gap-2">
        <span className="text-white text-base">✏️</span>
        <div>
          <p className="text-white font-semibold text-sm">Correction manuelle</p>
          <p className="text-white/80 text-xs">Ajustez si les valeurs semblent incorrectes</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Revenus mensuels (€)</label>
          <input
            type="number"
            value={inc}
            onChange={e => setInc(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-700 focus:outline-none focus:border-emerald-400"
            min={0}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Charges mensuelles (€)</label>
          <input
            type="number"
            value={chg}
            onChange={e => setChg(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 focus:outline-none focus:border-red-300"
            min={0}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(parseFloat(inc) || 0, parseFloat(chg) || 0)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function CsvImport({ currency, onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [state, setState]             = useState<State>('idle')
  const [dragging, setDragging]       = useState(false)
  const [result, setResult]           = useState<CsvParseResult | null>(null)
  const [rawTxs, setRawTxs]           = useState<RawTransaction[]>([])
  const [errMsg, setErrMsg]           = useState('')
  const [applied, setApplied]         = useState(false)
  const [fileType, setFileType]       = useState<'csv' | 'pdf' | null>(null)
  const [showTxList, setShowTxList]   = useState(false)

  const processFile = async (file: File) => {
    const type = getFileType(file)
    if (!type) {
      setState('error')
      setErrMsg('Format non supporté. Veuillez importer un fichier .csv ou .pdf.')
      return
    }
    setFileType(type)
    setState('parsing')
    setResult(null)
    setRawTxs([])
    setApplied(false)
    setShowTxList(false)

    if (type === 'pdf') {
      const parsed = await parseBankPdf(file)
      if (isCsvError(parsed)) {
        setState('error')
        setErrMsg(parsed.message)
      } else {
        setResult(parsed)
        setRawTxs('rawTransactions' in parsed ? parsed.rawTransactions : [])
        setState('result')
      }
    } else {
      const parsed = await parseBankCsv(file)
      if (isCsvError(parsed)) {
        setState('error')
        setErrMsg(parsed.message)
      } else {
        setResult(parsed)
        setState('result')
      }
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleApply = (inc?: number, chg?: number) => {
    if (!result) return
    onApply(inc ?? result.monthlyIncome, chg ?? result.monthlyCharges, rawTxs)
    setApplied(true)
    setState('result')
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    setRawTxs([])
    setErrMsg('')
    setApplied(false)
    setFileType(null)
    setShowTxList(false)
  }

  // ── Zone de drop ──
  if (state === 'idle' || state === 'error') {
    return (
      <div className="space-y-2">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl
            border-2 border-dashed cursor-pointer transition-all
            ${dragging
              ? 'border-emerald-400 bg-emerald-50'
              : state === 'error'
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
        >
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${state === 'error' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>CSV</span>
            <span className={`text-xs ${state === 'error' ? 'text-red-300' : 'text-gray-300'}`}>ou</span>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${state === 'error' ? 'bg-red-100 text-red-500' : 'bg-red-50 text-red-400'}`}>PDF</span>
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium ${state === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {dragging ? 'Déposez le fichier ici' : 'Importer mes relevés bancaires'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Glisser-déposer ou cliquer · CSV ou PDF</p>
          </div>
        </div>

        {state === 'error' && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2">
            <span className="text-red-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-red-600 flex-1">{errMsg}</p>
            <button onClick={reset} className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap">Réessayer</button>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" onChange={handleFile} />
      </div>
    )
  }

  // ── Chargement ──
  if (state === 'parsing') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 bg-gray-50 rounded-2xl">
        <svg className="animate-spin w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm text-gray-500">{fileType === 'pdf' ? 'Lecture du PDF…' : 'Analyse du CSV…'}</p>
        {fileType === 'pdf' && <p className="text-xs text-gray-400">Peut prendre quelques secondes</p>}
      </div>
    )
  }

  // ── Édition manuelle ──
  if (state === 'edit' && result) {
    return (
      <ManualEditor
        income={result.monthlyIncome}
        charges={result.monthlyCharges}
        onConfirm={(inc, chg) => handleApply(inc, chg)}
        onCancel={() => setState('result')}
      />
    )
  }

  // ── Résultat ──
  if (state === 'result' && result) {
    return (
      <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-base">📊</span>
            <div>
              <p className="text-white font-semibold text-sm">Analyse terminée</p>
              <p className="text-white/70 text-xs">{fileType === 'pdf' ? 'Relevé PDF' : 'Fichier CSV'}</p>
            </div>
          </div>
          <button onClick={reset} className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            ✕ Nouveau
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Période & nb transactions */}
          <p className="text-xs text-gray-400 text-center">
            {result.dateFrom && result.dateTo && (
              <>
                <span className="font-medium text-gray-600">{result.dateFrom}</span>
                {result.dateFrom !== result.dateTo && <> → <span className="font-medium text-gray-600">{result.dateTo}</span></>}
                {' · '}
                <span className="font-medium text-gray-600">{result.monthsCovered} mois</span>
                {' · '}
              </>
            )}
            <span className="font-medium text-gray-600">{result.transactionCount} transactions</span>
          </p>

          {/* Revenus / Charges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wide font-semibold mb-1">Revenus /mois</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(result.monthlyIncome, currency)}</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">Total : {formatCurrency(result.totalIncome, currency)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-red-500 uppercase tracking-wide font-semibold mb-1">Charges /mois</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(result.monthlyCharges, currency)}</p>
              <p className="text-[10px] text-red-400 mt-0.5">Total : {formatCurrency(result.totalCharges, currency)}</p>
            </div>
          </div>

          {/* Disponible */}
          {result.monthlyIncome > 0 && (
            <div className={`rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${
              result.monthlyIncome - result.monthlyCharges > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-orange-50 text-orange-700'
            }`}>
              <span>{result.monthlyIncome - result.monthlyCharges > 0 ? '✅' : '⚠️'}</span>
              <span>
                Disponible estimé :{' '}
                <strong>{formatCurrency(result.monthlyIncome - result.monthlyCharges, currency)}</strong> /mois
              </span>
            </div>
          )}

          {/* Transactions détectées (PDF) — liste dépliable */}
          {fileType === 'pdf' && rawTxs.length > 0 && (
            <div>
              <button
                onClick={() => setShowTxList(v => !v)}
                className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 py-1"
              >
                <span className="font-medium">Voir les {rawTxs.length} transactions détectées</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showTxList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {showTxList && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {rawTxs.slice(0, 50).map((tx, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className="text-gray-400 w-20 flex-shrink-0">
                        {tx.date.toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-gray-600 flex-1 truncate px-2">{tx.label || '—'}</span>
                      <span className={`font-semibold flex-shrink-0 ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                      </span>
                    </div>
                  ))}
                  {rawTxs.length > 50 && (
                    <p className="text-xs text-gray-400 text-center py-2">+ {rawTxs.length - 50} autres…</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Boutons action */}
          {applied ? (
            <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 rounded-xl">
              <span className="text-emerald-600 font-bold">✓</span>
              <p className="text-sm font-medium text-emerald-700">Profil mis à jour !</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => handleApply()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm
                           hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                Mettre à jour mon profil
              </button>
              <button
                onClick={() => setState('edit')}
                className="w-full py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-medium
                           border border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
              >
                ✏️ Les valeurs semblent incorrectes ? Corriger manuellement
              </button>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            🔒 Analyse 100% locale — aucun fichier envoyé sur nos serveurs
          </p>
        </div>
      </div>
    )
  }

  return null
}
