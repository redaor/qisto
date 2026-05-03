import { getDaysUntilDue } from '@/lib/formatters'

interface UrgencyBadgeProps {
  dueDate: string
}

export function UrgencyBadge({ dueDate }: UrgencyBadgeProps) {
  const days = getDaysUntilDue(dueDate)

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        En retard de {Math.abs(days)}j
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
        Dans {days}j
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        Dans {days}j
      </span>
    )
  }
  return null
}
