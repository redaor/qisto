import type { Payment, Currency } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'

interface PaymentHistoryProps {
  payments: Payment[]
  currency: Currency
}

export function PaymentHistory({ payments, currency }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        Aucun paiement enregistré
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {payments.map((payment, index) => (
        <div key={payment.id} className="relative flex gap-4">
          {index < payments.length - 1 && (
            <div className="absolute left-[18px] top-9 bottom-0 w-0.5 bg-gray-100" />
          )}
          <div className="relative z-10 w-9 h-9 mt-1 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 pb-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">
                {formatCurrency(payment.amount, currency)}
              </p>
              <p className="text-xs text-gray-400">{formatDate(payment.paid_at)}</p>
            </div>
            {payment.note && (
              <p className="text-xs text-gray-500 mt-0.5">{payment.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
