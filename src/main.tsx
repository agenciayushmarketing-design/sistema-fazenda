import React, { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import './index.css'

// páginas carregadas sob demanda (code-splitting) — o Suspense vive no AppLayout
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Rebanho = lazy(() => import('@/pages/Rebanho'))
const FichaAnimal = lazy(() => import('@/pages/FichaAnimal'))
const Cria = lazy(() => import('@/pages/Cria'))
const Recria = lazy(() => import('@/pages/Recria'))
const Reproducao = lazy(() => import('@/pages/Reproducao'))
const Sanitario = lazy(() => import('@/pages/Sanitario'))
const Estoque = lazy(() => import('@/pages/Estoque'))
const Compras = lazy(() => import('@/pages/Compras'))
const Financeiro = lazy(() => import('@/pages/Financeiro'))
const Maquinas = lazy(() => import('@/pages/Maquinas'))
const OrdensServico = lazy(() => import('@/pages/OrdensServico'))
const Leite = lazy(() => import('@/pages/Leite'))
const Relatorios = lazy(() => import('@/pages/Relatorios'))

const router = createHashRouter([
  {
    element: <AppLayout />,
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
