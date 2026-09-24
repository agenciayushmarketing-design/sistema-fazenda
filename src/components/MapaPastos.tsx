import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Warehouse, Trees } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { FormRow } from '@/components/shared'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ativos, uaPorPasto } from '@/lib/metrics'
import { fmtNum, fmtNum1, fmtNum2 } from '@/lib/format'
import type { Lote } from '@/data/types'

/**
 * Mapa esquemático: cada pasto é um bloco proporcional à área, pintado pela ocupação.
 * Mostra os lotes e cabeças de cada pasto e permite o rodízio (mover lote de pasto).
 */
export function MapaPastos() {
  const state = useStore()
  const [mover, setMover] = useState<Lote | null>(null)
  const ocupacao = uaPorPasto(state)
  const vivos = ativos(state.animais)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ocupacao.map(({ pasto, ua }) => {
          const pct = pasto.capacidadeUA > 0 ? ua / pasto.capacidadeUA : 0
          const lotes = state.lotes.filter((l) => l.pastoId === pasto.id)
          const cabecas = vivos.filter((a) => lotes.some((l) => l.id === a.loteId)).length
          const nivel = pct > 1 ? 'acima' : pct > 0.85 ? 'cheio' : pct < 0.3 ? 'folga' : 'ok'
          const Icone = pasto.tipo === 'confinamento' ? Warehouse : Trees
          return (
            <div
              key={pasto.id}
              style={{ flexGrow: pasto.areaHa, flexBasis: `${Math.max(200, pasto.areaHa * 1.4)}px` }}
              className={cn(
                'min-h-[150px] rounded-lg border-2 p-3',
                nivel === 'acima' && 'border-red-300 bg-red-50/70',
                nivel === 'cheio' && 'border-amber-300 bg-amber-50/70',
                nivel === 'ok' && 'border-green-300 bg-green-50/60',
                nivel === 'folga' && 'border-dashed border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-semibold leading-tight">{pasto.nome}</span>
                </div>
                <span className="tnum whitespace-nowrap text-[11px] text-muted-foreground">{fmtNum(pasto.areaHa)} ha</span>
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="tnum">
                    {fmtNum1(ua)} / {fmtNum(pasto.capacidadeUA)} UA
                  </span>
                  <span
                    className={cn(
                      'tnum font-semibold',
                      nivel === 'acima' ? 'text-red-700' : nivel === 'cheio' ? 'text-amber-700' : 'text-green-800',
                    )}
                  >
                    {Math.round(pct * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      nivel === 'acima' ? 'bg-red-500' : nivel === 'cheio' ? 'bg-amber-500' : 'bg-green-600',
                    )}
                    style={{ width: `${Math.min(100, pct * 100)}%` }}
                  />
                </div>
                <div className="tnum mt-1 text-[11px] text-muted-foreground">
                  {fmtNum(cabecas)} cab · {fmtNum2(pasto.areaHa > 0 ? ua / pasto.areaHa : 0)} UA/ha
                </div>
              </div>

              <ul className="mt-2 space-y-1">
                {lotes.length === 0 && <li className="text-[11px] italic text-muted-foreground">Pasto vazio — em descanso</li>}
                {lotes.map((l) => {
                  const n = vivos.filter((a) => a.loteId === l.id).length
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-1 rounded bg-white/70 px-1.5 py-1 text-[11px]">
                      <Link to={`/rebanho?lote=${l.id}`} className="min-w-0 truncate font-medium text-primary hover:underline">
                        {l.nome}
                      </Link>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="tnum text-muted-foreground">{fmtNum(n)} cab</span>
                        <button
                          onClick={() => setMover(l)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          aria-label={`Mover ${l.nome} de pasto`}
                          title="Rodízio: mover lote para outro pasto"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-green-300 bg-green-50" /> até 85% da capacidade</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-amber-300 bg-amber-50" /> 85–100%</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-red-300 bg-red-50" /> acima da capacidade</span>
        <span>· tamanho do bloco proporcional à área · ícone ⇄ faz o rodízio</span>
      </div>

      <MoverLoteDialog lote={mover} onClose={() => setMover(null)} />
    </div>
  )
}

function MoverLoteDialog({ lote, onClose }: { lote: Lote | null; onClose: () => void }) {
  const state = useStore()
  const moverLotePasto = useStore((s) => s.moverLotePasto)
  const [destino, setDestino] = useState('')
  const opcoes = state.pastos.filter((p) => p.id !== lote?.pastoId)
  const valor = opcoes.some((p) => p.id === destino) ? destino : opcoes[0]?.id ?? ''
  const ocupacao = uaPorPasto(state)
  const cab = lote ? ativos(state.animais).filter((a) => a.loteId === lote.id) : []
  const uaLote = cab.reduce((s, a) => s + a.pesoAtual, 0) / 450
  const dest = ocupacao.find((o) => o.pasto.id === valor)
  const depois = dest ? (dest.ua + uaLote) / dest.pasto.capacidadeUA : 0

  return (
    <Dialog open={lote !== null} onClose={onClose} title={`Rodízio — ${lote?.nome ?? ''}`}>
      <FormRow label="Levar para o pasto">
        <Select value={valor} onChange={(e) => setDestino(e.target.value)}>
          {opcoes.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </Select>
      </FormRow>
      {dest && (
        <p className={cn('tnum mt-2 text-xs', depois > 1 ? 'text-red-700' : 'text-muted-foreground')}>
          {fmtNum(cab.length)} cabeças ({fmtNum1(uaLote)} UA) → {dest.pasto.nome} ficará com{' '}
          {fmtNum1(depois * 100)}% da capacidade{depois > 1 ? ' — acima do suporte do pasto!' : ''}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        O lote inteiro muda de pasto e a transferência fica registrada no livro de movimentação.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!lote || !valor) return
            moverLotePasto(lote.id, valor)
            toast(`${lote.nome} foi para ${state.pastos.find((p) => p.id === valor)?.nome}.`)
            onClose()
          }}
        >
          Mover lote
        </Button>
      </div>
    </Dialog>
  )
}
