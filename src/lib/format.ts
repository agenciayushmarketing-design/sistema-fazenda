// Formatação pt-BR centralizada

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtNum = (n: number) => nf0.format(n)
export const fmtNum1 = (n: number) => nf1.format(n)
export const fmtNum2 = (n: number) => nf2.format(n)
export const fmtBRL = (n: number) => brl.format(n)
export const fmtKg = (n: number) => `${nf0.format(n)} kg`
export const fmtKg1 = (n: number) => `${nf1.format(n)} kg`
export const fmtArroba = (n: number) => `${nf1.format(n)} @`
export const fmtPct = (n: number) => `${nf1.format(n)}%`
export const fmtGMD = (n: number) => `${nf2.format(n)} kg/dia`

export function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function fmtDateShort(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function fmtMesAno(iso: string): string {
  const [y, m] = iso.split('-')
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`
}

export function idadeMeses(nascimento: string, ref?: string): number {
  const n = new Date(nascimento + 'T12:00:00')
  const r = ref ? new Date(ref + 'T12:00:00') : new Date()
  return Math.floor((r.getTime() - n.getTime()) / (30.44 * 86400000))
}

export function fmtIdade(nascimento: string): string {
  const meses = idadeMeses(nascimento)
  if (meses < 12) return `${meses} m`
  const anos = Math.floor(meses / 12)
  const rest = meses % 12
  return rest > 0 ? `${anos}a ${rest}m` : `${anos}a`
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}
