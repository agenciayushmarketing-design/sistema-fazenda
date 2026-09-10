import { RotateCcw, RefreshCw } from 'lucide-react'

/**
 * Tela exibida quando qualquer erro derrubaria a aplicação (errorElement do router).
 * Nunca deixar o usuário numa tela branca: sempre oferecer recarregar e restaurar.
 */
export function ErroPagina() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">🐂</div>
        <h1 className="mt-2 text-lg font-bold">Algo saiu do curral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A demonstração encontrou um erro inesperado — normalmente é uma versão antiga guardada
          pelo navegador após uma atualização. Recarregar resolve na maioria dos casos.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar a página
          </button>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('fazenda-santa-helena-demo')
              } catch {
                /* sem storage */
              }
              window.location.reload()
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Restaurar dados da demo
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Restaurar descarta as alterações locais e gera o conjunto de dados original novamente.
        </p>
      </div>
    </div>
  )
}
