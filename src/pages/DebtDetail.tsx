import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { PaymentModal } from '@/components/debt/PaymentModal'
import { PaymentHistory } from '@/components/debt/PaymentHistory'
import { DebtProgressBar } from '@/components/debt/DebtProgressBar'
import { Badge } from '@/components/ui/Badge'
import { UrgencyBadge } from '@/components/debt/UrgencyBadge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, getInitials } from '@/lib/formatters'

export function DebtDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { debts, payments, deleteDebt, fetchPayments, profile, createSharedLink } = useDebtStore()
  const [showPayment, setShowPayment] = useState(false)
  const [shareUrl, setShareUrl]       = useState<string | null>(null)
  const [sharing, setSharing]         = useState(false)

  const currency = profile?.currency ?? 'EUR'
  const debt = debts.find(d => d.id === id)
  const debtPayments = id ? (payments[id] ?? []) : []

  useEffect(() => {
    if (id) fetchPayments(id)
  }, [id])

  if (!debt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-400 mb-3">Dette introuvable</p>
        <Button variant="outline" onClick={() => navigate('/debts')}>Retour</Button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm('Archiver cette dette ?')) return
    await deleteDebt(debt.id)
    navigate('/debts')
  }

  const handleShare = async () => {
    setSharing(true)
    const link = await createSharedLink(debt.id)
    setSharing(false)
    if (link) {
      const url = `${window.location.origin}/shared/${link.token}`
      setShareUrl(url)
      if (navigator.share) {
        navigator.share({ title: `Dette – ${debt.contact_name}`, url })
      } else {
        navigator.clipboard?.writeText(url)
      }
    }
  }

  const paid = debt.total_amount - debt.remaining_amount

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1">Détail de la dette</h1>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="p-2 hover:bg-gray-100 text-gray-400 hover:text-emerald-500 rounded-xl transition-colors"
          title="Partager"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
        </button>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      {shareUrl && (
        <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <p className="text-xs text-emerald-700 flex-1 truncate">{shareUrl}</p>
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="text-xs text-emerald-600 font-medium whitespace-nowrap"
          >
            Copier
          </button>
        </div>
      )}

      <div className={`rounded-3xl p-5 text-white ${debt.type === 'owed_to_me' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {getInitials(debt.contact_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{debt.contact_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge type={debt.type} />
              {debt.due_date && <UrgencyBadge dueDate={debt.due_date} />}
            </div>
          </div>
        </div>

        <p className="text-white/70 text-sm mb-1">Montant restant</p>
        <p className="text-4xl font-bold">{formatCurrency(debt.remaining_amount, currency)}</p>

        <div className="mt-4 bg-white/10 rounded-2xl p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-white/60 text-xs">Total initial</p>
            <p className="font-semibold">{formatCurrency(debt.total_amount, currency)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Déjà remboursé</p>
            <p className="font-semibold">{formatCurrency(paid, currency)}</p>
          </div>
          {debt.interest_rate > 0 && (
            <div>
              <p className="text-white/60 text-xs">Taux APR</p>
              <p className="font-semibold">{debt.interest_rate}%</p>
            </div>
          )}
          {debt.min_payment > 0 && (
            <div>
              <p className="text-white/60 text-xs">Paiement min.</p>
              <p className="font-semibold">{formatCurrency(debt.min_payment, currency)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <DebtProgressBar total={debt.total_amount} remaining={debt.remaining_amount} />
        {debt.due_date && (
          <p className="text-xs text-gray-400 mt-3">Échéance : {formatDate(debt.due_date)}</p>
        )}
        {debt.description && (
          <p className="text-sm text-gray-500 mt-2">{debt.description}</p>
        )}
      </div>

      {debt.remaining_amount > 0 && (
        <Button className="w-full" onClick={() => setShowPayment(true)}>
          Enregistrer un paiement
        </Button>
      )}

      {debt.remaining_amount === 0 && (
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="font-semibold text-emerald-700">Dette entièrement remboursée !</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">
          Historique des paiements
          {debtPayments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({debtPayments.length} versement{debtPayments.length > 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <PaymentHistory payments={debtPayments} currency={currency} />
      </div>

      {showPayment && (
        <PaymentModal
          debtId={debt.id}
          remaining={debt.remaining_amount}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
