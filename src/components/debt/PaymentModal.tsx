import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useDebtStore } from '@/store/useDebtStore'
import { formatCurrency } from '@/lib/formatters'

interface PaymentModalProps {
  debtId: string
  remaining: number
  onClose: () => void
}

export function PaymentModal({ debtId, remaining, onClose }: PaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const { recordPayment, loading } = useDebtStore()

  const handleSubmit = async () => {
    const value = parseFloat(amount)
    if (!value || value <= 0 || value > remaining) return
    await recordPayment(debtId, value, note)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">Record a payment</h2>
        <p className="text-sm text-gray-500">Remaining: {formatCurrency(remaining)}</p>

        <Input
          label="Amount"
          type="number"
          prefix="€"
          placeholder="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          max={remaining}
          min={0.01}
          step={0.01}
        />
        <Input
          label="Note (optional)"
          placeholder="e.g. First installment"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={loading}
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={handleSubmit}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}
