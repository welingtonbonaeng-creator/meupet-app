import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInMonths, differenceInYears, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function petAge(birthDate: string): string {
  const birth = parseISO(birthDate)
  const years  = differenceInYears(new Date(), birth)
  const months = differenceInMonths(new Date(), birth) % 12
  if (years === 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  if (months === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years}a ${months}m`
}

export function weightStatus(current: number, ideal: number): {
  label: string; color: string; icon: string
} {
  const ratio = current / ideal
  if (ratio < 0.85) return { label: 'Abaixo do peso', color: 'text-blue-600',   icon: '📉' }
  if (ratio > 1.15) return { label: 'Acima do peso',  color: 'text-orange-500', icon: '📈' }
  return               { label: 'Peso ideal',       color: 'text-green-600',  icon: '✅' }
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function speciesEmoji(species: string): string {
  return species === 'dog' ? '🐶' : species === 'cat' ? '🐱' : '🐾'
}
