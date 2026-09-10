import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  Wallet,
  Tractor,
  ClipboardList,
  Milk,
  Menu,
  Stethoscope,
  FileText,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { PERFIL_INFO } from '@/data/seed'
import type { PerfilDemo } from '@/data/types'
import { fmtDate, hojeISO } from '@/lib/format'
import { Toaster, toast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select } from '@/components/ui/select'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rebanho', label: 'Rebanho', icon: Beef },
  { to: '/cria', label: 'Cria', icon: Baby },
  { to: '/recria', label: 'Recria', icon: TrendingUp },
  { to: '/reproducao', label: 'Reprodução', icon: HeartPulse },
  { to: '/sanitario', label: 'Sanitário', icon: Stethoscope },
  { to: '/leite', label: 'Leite', icon: Milk },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/maquinas', label: 'Máquinas', icon: Tractor },
  { to: '/os', label: 'Ordens de serviço', icon: ClipboardList },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
]

/** Conteúdo da sidebar — usado no painel fixo (desktop) e no drawer (mobile) */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const fazenda = useStore((s) => s.fazenda)
  const perfil = useStore((s) => s.perfil)
  const [perfilPendente, setPerfilPendente] = useState<PerfilDemo | null>(null)
  const setPerfil = useStore((s) => s.setPerfil)
  const navigate = useNavigate()

  const info = PERFIL_INFO[perfil]
  const navVisivel = NAV.filter((n) => info.modulos.includes(n.to))

  return (
    <>
      <div className="border-b px-4 py-3">
        <div className="text-sm font-bold leading-tight">{fazenda.nome}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {fazenda.areaHa} ha · {info.descricao}
        </div>
      </div>
      <div className="border-b px-3 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Perfil da demonstração
        </div>
        <Select
          value={perfil}
          onChange={(e) => {
            const novo = e.target.value as PerfilDemo
            if (novo !== perfil) setPerfilPendente(novo)
          }}
          className="h-7 text-xs"
          aria-label="Perfil da demonstração"
        >
          {(Object.keys(PERFIL_INFO) as PerfilDemo[]).map((p) => (
            <option key={p} value={p}>{PERFIL_INFO[p].nome}</option>
          ))}
        </Select>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navVisivel.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors lg:py-1.5',
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
      <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
        Demonstração — dados fictícios gerados localmente. Nada sai do navegador.
      </div>

      <ConfirmDialog
        open={perfilPendente !== null}
        onClose={() => setPerfilPendente(null)}
        onConfirm={() => {
          if (!perfilPendente) return
          setPerfil(perfilPendente)
          navigate('/')
          onNavigate?.()
          toast(`Perfil "${PERFIL_INFO[perfilPendente].nome}" carregado.`)
        }}
        title="Trocar perfil da demonstração"
        confirmLabel="Trocar perfil"
      >
        Carregar o perfil <strong>{perfilPendente ? PERFIL_INFO[perfilPendente].nome : ''}</strong>?
        As alterações feitas no perfil atual serão descartadas e um novo conjunto de dados será gerado.
      </ConfirmDialog>
    </>
  )
}

export function AppLayout() {
  const animais = useStore((s) => s.animais)
  const resetDemo = useStore((s) => s.resetDemo)
  const navigate = useNavigate()
  const location = useLocation()
  const [busca, setBusca] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // fecha o drawer ao trocar de rota (links, busca, alertas…)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
      {/* Sidebar fixa — só desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-52 flex-col border-r bg-white lg:flex print:hidden">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r bg-white shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ml-52 print:ml-0">
        <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b bg-white/95 px-3 backdrop-blur lg:px-4 print:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="rounded-md border p-1.5 text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">
            Safra 2025/26 · {fmtDate(hojeISO())}
          </div>
          <form
            className="relative min-w-0 flex-1 sm:max-w-56 sm:flex-none"
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
              placeholder="Buscar brinco…"
              aria-label="Buscar animal por brinco"
              className="h-7 w-full rounded-md border border-input bg-white pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </form>
          <button
            onClick={() => setResetOpen(true)}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Restaurar dados da demo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Restaurar dados da demo</span>
          </button>
        </header>
        <main className="min-w-0 flex-1 p-3 lg:p-4 print:p-0">
          <Suspense
            fallback={
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Carregando…
              </div>
            }
          >
            <Outlet />
          </Suspense>
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
        Todas as alterações feitas localmente serão descartadas e o conjunto de dados do perfil atual
        será gerado novamente com datas relativas a hoje.
      </ConfirmDialog>

      <Toaster />
    </div>
  )
}
