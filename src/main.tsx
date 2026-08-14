import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Rebanho from '@/pages/Rebanho'
import FichaAnimal from '@/pages/FichaAnimal'
import Cria from '@/pages/Cria'
import Recria from '@/pages/Recria'
import Reproducao from '@/pages/Reproducao'
import Estoque from '@/pages/Estoque'
import Compras from '@/pages/Compras'
import './index.css'

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
      { path: '/estoque', element: <Estoque /> },
      { path: '/compras', element: <Compras /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
