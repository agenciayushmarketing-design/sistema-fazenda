import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

/** Botão principal do rodapé = último botão habilitado da faixa de ações (justify-end) */
function botaoPrincipal(caixa: HTMLElement): HTMLButtonElement | null {
  const rodapes = caixa.querySelectorAll<HTMLElement>('.justify-end')
  const rodape = rodapes[rodapes.length - 1]
  if (!rodape) return null
  const botoes = [...rodape.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled)
  return botoes[botoes.length - 1] ?? null
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const caixaRef = React.useRef<HTMLDivElement>(null)
  // onClose costuma vir como função nova a cada render — guardado em ref para o efeito
  // rodar só ao abrir/fechar (senão o foco voltaria ao 1º campo a cada tecla digitada)
  const onCloseRef = React.useRef(onClose)
  onCloseRef.current = onClose

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    // a página de trás não rola enquanto o formulário está aberto (celular)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // no computador o cursor já vai para o primeiro campo; no celular não (abriria o teclado)
    if (window.matchMedia('(pointer: fine)').matches) {
      requestAnimationFrame(() => {
        const campo = caixaRef.current?.querySelector<HTMLElement>(
          'input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([disabled]), select:not([disabled]), textarea',
        )
        campo?.focus()
      })
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full max-w-lg rounded-lg border bg-card shadow-lg', className)}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Enter num campo de texto/número = botão principal (Salvar, Registrar…)
          const alvo = e.target as HTMLElement
          if (e.key !== 'Enter' || alvo.tagName !== 'INPUT') return
          const tipo = (alvo as HTMLInputElement).type
          if (tipo === 'checkbox' || tipo === 'file' || tipo === 'radio') return
          const botao = caixaRef.current ? botaoPrincipal(caixaRef.current) : null
          if (botao) {
            e.preventDefault()
            botao.click()
          }
        }}
      >
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary touch:p-2" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  )
}
