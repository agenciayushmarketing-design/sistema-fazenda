import { create } from 'zustand'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastItem {
  id: number
  msg: string
  tone: 'success' | 'error'
}

interface ToastState {
  toasts: ToastItem[]
  push: (msg: string, tone: 'success' | 'error') => void
  remove: (id: number) => void
}

let toastSeq = 0

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (msg, tone) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(msg: string, tone: 'success' | 'error' = 'success') {
  useToastStore.getState().push(msg, tone)
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs shadow-md transition-opacity ${
            t.tone === 'success' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {t.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
          )}
          <span className="leading-snug">{t.msg}</span>
        </button>
      ))}
    </div>
  )
}
