import { useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  detail,
  tone,
  hint,
}: {
  label: string
  value: string
  detail?: string
  tone?: 'good' | 'warning' | 'critical'
  /** explicação em linguagem simples — mouse: passar por cima; toque: tocar no card */
  hint?: string
}) {
  const [aberta, setAberta] = useState(false)
  return (
    <Card
      title={hint}
      className={hint ? 'cursor-help' : undefined}
      onClick={hint ? () => setAberta((a) => !a) : undefined}
      role={hint ? 'button' : undefined}
      aria-expanded={hint ? aberta : undefined}
    >
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          {hint && <HelpCircle className="mt-px h-3 w-3 shrink-0 text-muted-foreground/60 touch:h-4 touch:w-4" />}
        </div>
        <div
          className={cn(
            'tnum mt-1 text-xl font-bold leading-none',
            tone === 'good' && 'text-green-700',
            tone === 'warning' && 'text-amber-700',
            tone === 'critical' && 'text-red-700',
          )}
        >
          {value}
        </div>
        {detail && <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>}
        {hint && aberta && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 px-2 py-1.5 text-[11px] leading-snug text-blue-950">
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}
