import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortState } from '@/hooks/table'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
    </div>
  ),
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b bg-secondary/60', className)} {...props} />
  ),
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  ),
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b transition-colors hover:bg-secondary/40', className)} {...props} />
  ),
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-7 px-2 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap', className)}
      {...props}
    />
  ),
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-2 py-1 align-middle whitespace-nowrap', className)} {...props} />
  ),
)
TableCell.displayName = 'TableCell'

interface SortableHeadProps {
  label: string
  sortKey: string
  sort: SortState | null
  onToggle: (key: string) => void
  align?: 'left' | 'right'
  className?: string
}

/** Cabeçalho ordenável: clique alterna asc/desc, seta indica direção. */
function SortableHead({ label, sortKey, sort, onToggle, align = 'left', className }: SortableHeadProps) {
  const active = sort?.key === sortKey
  return (
    <TableHead className={className}>
      <button
        onClick={() => onToggle(sortKey)}
        className={cn(
          'inline-flex w-full items-center gap-0.5 uppercase tracking-wide hover:text-foreground',
          align === 'right' && 'justify-end',
          active && 'text-foreground',
        )}
      >
        {label}
        {active && (sort!.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  )
}

interface TablePaginationProps {
  page: number
  pages: number
  setPage: (p: number) => void
  from: number
  to: number
  total: number
}

function TablePagination({ page, pages, setPage, from, to, total }: TablePaginationProps) {
  if (total === 0) return null
  const nf = new Intl.NumberFormat('pt-BR')
  return (
    <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
      <span className="tnum">
        {nf.format(from)}–{nf.format(to)} de {nf.format(total)}
      </span>
      {pages > 1 && (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="Página anterior"
            className="rounded border p-0.5 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="tnum px-1">
            {page + 1}/{pages}
          </span>
          <button
            onClick={() => setPage(Math.min(pages - 1, page + 1))}
            disabled={page === pages - 1}
            aria-label="Próxima página"
            className="rounded border p-0.5 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableHead, TablePagination }
