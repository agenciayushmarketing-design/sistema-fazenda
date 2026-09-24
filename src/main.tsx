import React, { lazy, type ComponentType } from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErroPagina } from '@/components/ErroPagina'
import './index.css'

const CHAVE_RELOAD = 'fazenda-demo-chunk-reload'

/**
 * Carregamento sob demanda com recuperação: se um pedaço do código não carregar
 * (versão antiga em cache após um deploy), recarrega a página UMA vez para buscar
 * a versão nova. Se ainda assim falhar, deixa o erro chegar à tela de erro.
 */
function pagina(importar: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    try {
      const modulo = await importar()
      sessionStorage.removeItem(CHAVE_RELOAD)
      return modulo
    } catch (erro) {
      if (!sessionStorage.getItem(CHAVE_RELOAD)) {
        sessionStorage.setItem(CHAVE_RELOAD, '1')
        window.location.reload()
        return new Promise<never>(() => {}) // segura o render enquanto recarrega
      }
      throw erro
    }
  })
}

// importadores centralizados: alimentam as rotas E o pré-download p/ modo offline
const importadores = {
  Dashboard: () => import('@/pages/Dashboard'),
  Rebanho: () => import('@/pages/Rebanho'),
  FichaAnimal: () => import('@/pages/FichaAnimal'),
  Cria: () => import('@/pages/Cria'),
  Recria: () => import('@/pages/Recria'),
  Reproducao: () => import('@/pages/Reproducao'),
  Sanitario: () => import('@/pages/Sanitario'),
  Nutricao: () => import('@/pages/Nutricao'),
  Estoque: () => import('@/pages/Estoque'),
  Compras: () => import('@/pages/Compras'),
  Financeiro: () => import('@/pages/Financeiro'),
  Maquinas: () => import('@/pages/Maquinas'),
  OrdensServico: () => import('@/pages/OrdensServico'),
  Leite: () => import('@/pages/Leite'),
  Equipe: () => import('@/pages/Equipe'),
  Relatorios: () => import('@/pages/Relatorios'),
}

const Dashboard = pagina(importadores.Dashboard)
const Rebanho = pagina(importadores.Rebanho)
const FichaAnimal = pagina(importadores.FichaAnimal)
const Cria = pagina(importadores.Cria)
const Recria = pagina(importadores.Recria)
const Reproducao = pagina(importadores.Reproducao)
const Sanitario = pagina(importadores.Sanitario)
const Nutricao = pagina(importadores.Nutricao)
const Estoque = pagina(importadores.Estoque)
const Compras = pagina(importadores.Compras)
const Financeiro = pagina(importadores.Financeiro)
const Maquinas = pagina(importadores.Maquinas)
const OrdensServico = pagina(importadores.OrdensServico)
const Leite = pagina(importadores.Leite)
const Equipe = pagina(importadores.Equipe)
const Relatorios = pagina(importadores.Relatorios)

const router = createHashRouter([
  {
    element: <AppLayout />,
    errorElement: <ErroPagina />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/rebanho', element: <Rebanho /> },
      { path: '/rebanho/:id', element: <FichaAnimal /> },
      { path: '/cria', element: <Cria /> },
      { path: '/recria', element: <Recria /> },
      { path: '/reproducao', element: <Reproducao /> },
      { path: '/leite', element: <Leite /> },
      { path: '/sanitario', element: <Sanitario /> },
      { path: '/nutricao', element: <Nutricao /> },
      { path: '/estoque', element: <Estoque /> },
      { path: '/compras', element: <Compras /> },
      { path: '/financeiro', element: <Financeiro /> },
      { path: '/maquinas', element: <Maquinas /> },
      { path: '/os', element: <OrdensServico /> },
      { path: '/equipe', element: <Equipe /> },
      { path: '/relatorios', element: <Relatorios /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

// app montou: zera o contador do guardião de carga do index.html
try {
  sessionStorage.removeItem('fazenda-demo-boot-retry')
} catch {
  /* sem storage */
}

// PWA: com o service worker, a demo instala no celular e abre sem sinal —
// os dados já vivem no aparelho, então TUDO funciona offline de verdade
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem service worker, a demo segue funcionando online */
    })

    // aquece o modo offline já na PRIMEIRA visita:
    // 1) guarda no cache os arquivos que carregaram antes do SW assumir;
    // 2) pré-baixa todas as telas (também deixa a navegação instantânea).
    navigator.serviceWorker.ready.then(async () => {
      try {
        const cache = await caches.open('fazenda-demo-v1')
        const jaCarregados = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin) && u.includes('/assets/'))
        const extras = ['./manifest.webmanifest', './icons/icone-192.png', './icons/icone-512.png']
        await Promise.allSettled(
          [...new Set(jaCarregados), ...extras].map((u) => cache.add(u)),
        )
      } catch {
        /* sem Cache API, segue online */
      }
      setTimeout(() => {
        Object.values(importadores).forEach((importar) => {
          importar().catch(() => {})
        })
      }, 2500)
    })
  })
}
