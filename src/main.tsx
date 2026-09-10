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

const Dashboard = pagina(() => import('@/pages/Dashboard'))
const Rebanho = pagina(() => import('@/pages/Rebanho'))
const FichaAnimal = pagina(() => import('@/pages/FichaAnimal'))
const Cria = pagina(() => import('@/pages/Cria'))
const Recria = pagina(() => import('@/pages/Recria'))
const Reproducao = pagina(() => import('@/pages/Reproducao'))
const Sanitario = pagina(() => import('@/pages/Sanitario'))
const Estoque = pagina(() => import('@/pages/Estoque'))
const Compras = pagina(() => import('@/pages/Compras'))
const Financeiro = pagina(() => import('@/pages/Financeiro'))
const Maquinas = pagina(() => import('@/pages/Maquinas'))
const OrdensServico = pagina(() => import('@/pages/OrdensServico'))
const Leite = pagina(() => import('@/pages/Leite'))
const Relatorios = pagina(() => import('@/pages/Relatorios'))

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
      { path: '/estoque', element: <Estoque /> },
      { path: '/compras', element: <Compras /> },
      { path: '/financeiro', element: <Financeiro /> },
      { path: '/maquinas', element: <Maquinas /> },
      { path: '/os', element: <OrdensServico /> },
      { path: '/relatorios', element: <Relatorios /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
