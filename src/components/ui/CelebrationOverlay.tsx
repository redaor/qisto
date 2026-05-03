import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useDebtStore } from '@/store/useDebtStore'

export function CelebrationOverlay() {
  const { celebratingDebtId, setCelebrating } = useDebtStore()

  useEffect(() => {
    if (!celebratingDebtId) return

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
    })

    const timer = setTimeout(() => setCelebrating(null), 3500)
    return () => clearTimeout(timer)
  }, [celebratingDebtId])

  if (!celebratingDebtId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setCelebrating(null)}
    >
      <div className="bg-white rounded-3xl p-8 mx-6 text-center shadow-2xl">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dette remboursée !</h2>
        <p className="text-gray-500 text-sm">Félicitations, continuez comme ça !</p>
      </div>
    </div>
  )
}
