import jsPDF from 'jspdf'
import type { Debt, UserProfile } from '@/types'
import { formatCurrency, formatDate, getDaysUntilDue } from './formatters'
import { calcTotals } from './calculations'

export function exportDebtsPDF(debts: Debt[], profile: UserProfile | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const currency = profile?.currency ?? 'EUR'
  const totals = calcTotals(debts)
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('QISTO', 14, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Résumé des dettes — ${today}`, 14, 24)

  doc.setTextColor(55, 65, 81)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text("Vue d'ensemble", 14, 40)

  const summaryData = [
    ['On me doit',       formatCurrency(totals.owedToMe, currency)],
    ['Je dois',          formatCurrency(totals.iOwe, currency)],
    ['Solde net',        formatCurrency(Math.abs(totals.net), currency)],
    ['Nombre de dettes', `${debts.length} active(s)`],
  ]

  let y = 46
  summaryData.forEach(([label, value]) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(label, 14, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text(value, 80, y)
    y += 7
  })

  doc.setDrawColor(229, 231, 235)
  doc.line(14, y + 2, 196, y + 2)
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 65, 81)
  doc.text('Détail des dettes', 14, y)
  y += 8

  const activeDebts = debts.filter(d => d.status === 'active')

  activeDebts.forEach((debt, index) => {
    if (y > 260) { doc.addPage(); y = 20 }

    const isOwe = debt.type === 'i_owe'
    const progress = Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)

    doc.setFillColor(index % 2 === 0 ? 249 : 243, 250, 251)
    doc.roundedRect(14, y - 4, 182, 28, 3, 3, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text(debt.contact_name, 20, y + 4)

    doc.setFontSize(8)
    doc.setTextColor(isOwe ? 220 : 5, isOwe ? 38 : 150, isOwe ? 38 : 105)
    doc.text(isOwe ? 'Je dois' : 'On me doit', 20, y + 11)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isOwe ? 239 : 16, isOwe ? 68 : 185, isOwe ? 68 : 129)
    doc.text(formatCurrency(debt.remaining_amount, currency), 140, y + 5, { align: 'right' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(`Total : ${formatCurrency(debt.total_amount, currency)}`, 140, y + 12, { align: 'right' })

    doc.setFillColor(229, 231, 235)
    doc.roundedRect(20, y + 16, 100, 3, 1.5, 1.5, 'F')
    if (progress > 0) {
      doc.setFillColor(16, 185, 129)
      doc.roundedRect(20, y + 16, Math.max(1, progress), 3, 1.5, 1.5, 'F')
    }
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`${progress}% remboursé`, 125, y + 19)

    if (debt.due_date) {
      const days = getDaysUntilDue(debt.due_date)
      if (days <= 30) {
        const urgentText = days < 0
          ? `En retard (${formatDate(debt.due_date)})`
          : `Échéance dans ${days}j`
        doc.setFontSize(8)
        doc.setTextColor(days < 0 ? 220 : 180, days < 0 ? 38 : 140, 38)
        doc.text(urgentText, 148, y + 19)
      }
    }

    y += 34
  })

  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text('Généré par Qisto — app de gestion de dettes personnelles', 105, 290, { align: 'center' })

  doc.save(`qisto-resume-${new Date().toISOString().split('T')[0]}.pdf`)
}
