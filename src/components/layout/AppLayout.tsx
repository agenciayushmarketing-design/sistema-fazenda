import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Beef,
  Baby,
  TrendingUp,
  HeartPulse,
  Package,
  ShoppingCart,
  RotateCcw,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { fmtDate, hojeISO } from '@/lib/format'
import { Toaster, toast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rebanho', label: 'Rebanho', icon: Beef },
  { to: '/cria', label: 'Cria', icon: Baby },
  { to: '/recria', label: 'Recria', icon: TrendingUp },
  { to: '/reproducao', label: 'Reprodução', icon: HeartPulse },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
]

export function AppLayout() {
  const fazenda = useStore((s) => s.fazenda)
  const resetDemo = useStore((s) => s.resetDemo)
  const animais = useStore((s) => s.animais)
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [resetOpen, setResetOpen] = useState(false)

  const buscarBrinco = () => {
    const q = busca.trim().toLowerCase()
    if (!q) return
    const ativo = animais.filter((a) => a.status === 'ativo')
    const animal =
      ativo.find((a) => a.brinco.toLowerCase() === q) ??
      ativo.find((a) => a.brinco.toLowerCase().startsWith(q))
    if (animal) {
      setBusca('')
      navigate(`/rebanho/${animal.id}`)
    } else {
      toast(`Nenhum animal ativo com brinco "${busca.trim()}".`, 'error')
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-52 flex-col border-r bg-white">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-bold leading-tight">{fazenda.nome}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {fazenda.areaHa} ha · Nelore · ciclo completo
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2 text-[10px] text-muted-foreground px-3 py-2">
          Demonstração — dados fictícios gerados localmente. Nada sai do navegador.
        </div>
      </aside>

      <div className="ml-52 flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-11 items-center justify-between gap-3 border-b bg-white/95 px-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="whitespace-nowrap text-xs text-muted-foreground">
              Safra 2025/26 · {fmtDate(hojeISO())}
            </div>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                buscarBrinco()
              }}
            >
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar brinco (Enter)…"
                aria-label="Buscar animal por brinco"
                className="h-7 w-48 rounded-md border border-input bg-white pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </form>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar dados da demo
          </button>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo()
          toast('Dados da demonstração restaurados.')
        }}
        title="Restaurar dados da demo"
        confirmLabel="Restaurar"
        tone="destructive"
      >
        Todas as alterações feitas localmente serão descartadas e o conjunto de dados original será
        gerado novamente com datas relativas a hoje.
      </ConfirmDialog>

      <Toaster />
    </div>
  )
}
