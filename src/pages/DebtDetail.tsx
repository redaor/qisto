import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { PaymentModal } from '@/components/debt/PaymentModal'
import { DebtProgressBar } from '@/components/debt/DebtProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, getInitials } from '@/lib/formatters'

export function DebtDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { debts, deleteDebt } = useDebtStore()
  const [showPayment, setShowPayment] = useState(false)

  const debt = debts.find(d => d.id === id)

  if (!debt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500">Debt not found</p>
        <Button variant="ghost" onClick={() => navigate('/debts')} className="mt-3">
          Go back
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm('Archive this debt?')) return
    await deleteDebt(debt.id)
    navigate('/debts')
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1">Debt details</h1>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-500 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      {/* Debt card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${debt.type === 'owed_to_me' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {getInitials(debt.contact_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{debt.contact_name}</h2>
            <Badge type={debt.type} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="font-bold text-gray-900">{formatCurrency(debt.total_amount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
            <p className={`font-bold ${debt.type === 'owed_to_me' ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(debt.remaining_amount)}
            </p>
          </div>
        </div>

        <DebtProgressBar total={debt.total_amount} remaining={debt.remaining_amount} />

        {debt.description && (
          <p className="text-sm text-gray-500">{debt.description}</p>
        )}
        {debt.due_date && (
          <p className="text-xs text-gray-400">Due: {formatDate(debt.due_date)}</p>
        )}
      </div>

      {debt.remaining_amount > 0 && (
        <Button className="w-full" onClick={() => setShowPayment(true)}>
          Record a payment
        </Button>
      )}

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
