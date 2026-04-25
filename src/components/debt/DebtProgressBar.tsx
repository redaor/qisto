interface DebtProgressBarProps {
  total: number
  remaining: number
}

export function DebtProgressBar({ total, remaining }: DebtProgressBarProps) {
  const progress = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{progress}% paid</span>
        <span>{100 - progress}% left</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
