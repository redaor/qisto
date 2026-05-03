import { useNavigate } from 'react-router-dom'
import type { PersonGroup, Currency } from '@/types'
import { formatCurrency, getInitials } from '@/lib/formatters'
import { DebtCard } from './DebtCard'

interface Props {
  group: PersonGroup
  currency: Currency
}

export function PersonGroupCard({ group, currency }: Props) {
  const navigate = useNavigate()
  void navigate

  const netColor = group.net >= 0 ? 'text-emerald-600' : 'text-red-500'
  const netLabel = group.net >= 0 ? 'vous doit' : 'vous devez'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          {getInitials(group.contact_name)}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{group.contact_name}</p>
          <p className="text-xs text-gray-400">
            <span className={netColor}>{formatCurrency(Math.abs(group.net), currency)}</span>
            {' '}{netLabel}
          </p>
        </div>
        <p className="text-xs text-gray-400">{group.debts.length} dette{group.debts.length > 1 ? 's' : ''}</p>
      </div>
      <div className="p-3 space-y-2">
        {group.debts.map(d => (
          <DebtCard key={d.id} debt={d} currency={currency} compact />
        ))}
      </div>
    </div>
  )
}
