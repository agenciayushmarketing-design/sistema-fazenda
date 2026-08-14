import { useEffect, useMemo, useState } from 'react'

export type SortAccessor<T> = (item: T) => string | number

export interface SortState {
  key: string
  dir: 1 | -1
}

/** Ordenação por coluna: clique alterna asc/desc. */
export function useTableSort<T>(
  items: T[],
  accessors: Record<string, SortAccessor<T>>,
  initial?: SortState,
) {
  const [sort, setSort] = useState<SortState | null>(initial ?? null)

  const toggle = (key: string) => {
    setSort((s) => (s && s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }))
  }

  const sorted = useMemo(() => {
    if (!sort || !accessors[sort.key]) return items
    const acc = accessors[sort.key]
    return [...items].sort((a, b) => {
      const va = acc(a)
      const vb = acc(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR')
      return cmp * sort.dir
    })
  }, [items, sort, accessors])

  return { sorted, sort, toggle }
}

/** Paginação simples com clamp automático quando a lista encolhe (filtros). */
export function usePagination<T>(items: T[], pageSize = 50) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > pages - 1) setPage(0)
  }, [pages, page])

  const safePage = Math.min(page, pages - 1)
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [items, safePage, pageSize],
  )

  return {
    pageItems,
    page: safePage,
    pages,
    setPage,
    total: items.length,
    from: items.length === 0 ? 0 : safePage * pageSize + 1,
    to: Math.min(items.length, (safePage + 1) * pageSize),
  }
}
