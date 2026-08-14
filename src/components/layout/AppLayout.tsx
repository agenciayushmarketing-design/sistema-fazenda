import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Beef,
  Baby,
  TrendingUp,
  HeartPulse,
  Package,
  ShoppingCart,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { fmtDate, hojeISO } from '@/lib/format'

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
        <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b bg-white/95 px-4 backdrop-blur">
          <div className="text-xs text-muted-foreground">
            Safra 2025/26 · {fmtDate(hojeISO())}
          </div>
          <button
            onClick={() => {
              if (confirm('Restaurar todos os dados da demonstração? As alterações locais serão perdidas.')) {
                resetDemo()
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar dados da demo
          </button>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
