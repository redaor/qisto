interface BadgeProps {
  type: 'owed_to_me' | 'i_owe' | 'paid'
}

const config = {
  owed_to_me: { label: 'Owes me',  classes: 'bg-emerald-100 text-emerald-700' },
  i_owe:      { label: 'I owe',    classes: 'bg-red-100 text-red-700' },
  paid:       { label: 'Paid',     classes: 'bg-gray-100 text-gray-500' },
}

export function Badge({ type }: BadgeProps) {
  const { label, classes } = config[type]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
