import type { Currency } from '@/types'

const CURRENCY_CONFIG: Record<Currency, { locale: string; symbol: string }> = {
  EUR: { locale: 'fr-FR', symbol: '€' },
  DZD: { locale: 'fr-DZ', symbol: 'DA' },
  USD: { locale: 'en-US', symbol: '$' },
}

export function formatCurrency(amount: number, currency: Currency = 'EUR'): string {
  const { locale } = CURRENCY_CONFIG[currency]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_CONFIG[currency].symbol
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getDaysUntilDue(dueDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function calcRepaymentDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr)
  const end   = new Date(endStr)
  const totalDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const months = Math.floor(totalDays / 30)
  const days   = totalDays % 30
  if (months === 0 && days === 0) return 'Moins d\'un jour'
  if (months === 0) return `${days} jour${days > 1 ? 's' : ''}`
  if (days === 0)   return `${months} mois`
  return `${months} mois et ${days} jour${days > 1 ? 's' : ''}`
}
