// Enfermaria: quem está em tratamento ou carência, altas, óbitos e mortalidade acumulada
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { enfermariaAberta, resumoConfinamento, statusEnfermaria } from '@/lib/confinamento'
import { nomeMembro } from '@/lib/metrics'
import { CONFINAMENTO, addDays, diffDays } from '@/data/seed'
import { fmtBRL, fmtDate, fmtNum, fmtPct, hojeISO } from '@/lib/format'
import { EntradaEnfermariaDialog } from './dialogs'
import type { Enfermaria } from '@/data/types'

const STATUS = { tratamento: 'Em tratamento', carencia: 'Em carência', liberado: 'Carência cumprida' } as const

export function EnfermariaTab() {
  const state = useStore()
  const saida = useStore((s) => s.saidaEnfermaria)
  const hoje = hojeISO()
  const resumo = resumoConfinamento(state)
  const abertos = enfermariaAberta(state).sort((a, b) => a.entrada.localeCompare(b.entrada))
  const fechados = state.enfermaria.filter((e) => e.saida).sort((a, b) => b.saida!.localeCompare(a.saida!))
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [confirmar, setConfirmar] = useState<{ e: Enfermaria; destino: 'alta' | 'obito' } | null>(null)
  const loteNome = (id: string) => state.lotes.find((l) => l.id === id)?.nome ?? id
  const pct = resumo.cab > 0 ? (abertos.length / resumo.cab) * 100 : 0
  const custoTotal = state.enfermaria.reduce((s, e) => s + e.custo, 0)
  const obitos = state.enfermaria.filter((e) => e.destino === 'obito').length
  const porDiagnostico = [...abertos, ...fechados].reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.diagnostico]: (acc[e.diagnostico] ?? 0) + 1 }), {})

  const executar = () => {
    if (!confirmar) return
    const r = saida(confirmar.e.id, confirmar.destino)
    if (!r.ok) {
      toast(r.erro ?? 'Não foi possível registrar.', 'error')
      return
    }
    toast(confirmar.destino === 'alta' ? `${confirmar.e.brinco} teve alta e voltou para ${loteNome(confirmar.e.loteId)}.` : `Óbito de ${confirmar.e.brinco} registrado — baixa no lote e no livro.`)
    setConfirmar(null)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] text-muted-foreground">Entrada com diagnóstico e tratamento, carência que trava o abate, alta para o lote ou óbito que atualiza o lote.</div>
        <Button onClick={() => setEntradaOpen(true)}><Plus className="h-3.5 w-3.5" /> Entrada na enfermaria</Button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Na enfermaria" value={fmtNum(abertos.length)} detail={`${fmtPct(pct)} do cocho · limite ${CONFINAMENTO.enfermariaMaxPct}%`} tone={pct > CONFINAMENTO.enfermariaMaxPct ? 'critical' : 'good'} />
        <StatCard label="Carência cumprida" value={fmtNum(abertos.filter((e) => statusEnfermaria(e, hoje) === 'liberado').length)} detail="prontos para voltar ao lote" tone={abertos.some((e) => statusEnfermaria(e, hoje) === 'liberado') ? 'warning' : undefined} />
        <StatCard label="Mortalidade acumulada" value={fmtPct(resumo.mortalidadePct)} detail={`${obitos} óbito(s) na enfermaria`} tone={resumo.mortalidadePct > 1 ? 'warning' : 'good'} />
        <StatCard label="Custo sanitário" value={fmtBRL(custoTotal)} detail={`${state.enfermaria.length} atendimentos · ${Object.entries(porDiagnostico).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d, n]) => `${d} ${n}`).join(' · ')}`} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-[13px] font-semibold">Animais na enfermaria ({abertos.length})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brinco</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Tratamento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Libera em</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Por</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {abertos.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Enfermaria vazia.</TableCell></TableRow>}
            {abertos.map((e) => {
              const st = statusEnfermaria(e, hoje)
              const libera = addDays(e.fimTratamento, e.carenciaDias)
              return (
                <TableRow key={e.id}>
                  <TableCell><Link to={`/rebanho/${e.animalId}`} className="font-medium hover:underline">{e.brinco}</Link></TableCell>
                  <TableCell>{loteNome(e.loteId)}</TableCell>
                  <TableCell className="tnum">{fmtDate(e.entrada)} <span className="text-muted-foreground">({diffDays(e.entrada, hoje)} d)</span></TableCell>
                  <TableCell>{e.diagnostico}</TableCell>
                  <TableCell className="text-muted-foreground">{e.tratamento}</TableCell>
                  <TableCell><Badge variant={st === 'liberado' ? 'good' : st === 'carencia' ? 'warning' : 'critical'}>{STATUS[st]}</Badge></TableCell>
                  <TableCell className="tnum">{e.carenciaDias > 0 ? fmtDate(libera) : 'sem carência'}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(e.custo)}</TableCell>
                  <TableCell className="text-muted-foreground">{nomeMembro(state, e.responsavelId)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setConfirmar({ e, destino: 'alta' })}>Alta</Button>
                      <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setConfirmar({ e, destino: 'obito' })}>Óbito</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-[13px] font-semibold">Histórico — altas e óbitos ({fechados.length})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brinco</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Desfecho</TableHead>
              <TableHead className="text-right">Custo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fechados.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.brinco}</TableCell>
                <TableCell>{loteNome(e.loteId)}</TableCell>
                <TableCell className="tnum">{fmtDate(e.entrada)}</TableCell>
                <TableCell className="tnum">{fmtDate(e.saida)}</TableCell>
                <TableCell>{e.diagnostico}</TableCell>
                <TableCell><Badge variant={e.destino === 'alta' ? 'good' : 'critical'}>{e.destino === 'alta' ? 'Alta' : 'Óbito'}</Badge></TableCell>
                <TableCell className="tnum text-right">{fmtBRL(e.custo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EntradaEnfermariaDialog open={entradaOpen} onClose={() => setEntradaOpen(false)} />
      <Dialog open={Boolean(confirmar)} onClose={() => setConfirmar(null)} title={confirmar?.destino === 'alta' ? 'Dar alta' : 'Registrar óbito'}>
        {confirmar && (
          <p className="text-sm">
            {confirmar.destino === 'alta'
              ? <>Devolver <strong>{confirmar.e.brinco}</strong> ao lote {loteNome(confirmar.e.loteId)}?{statusEnfermaria(confirmar.e, hoje) !== 'liberado' ? ' A carência ainda não terminou — o animal volta ao lote, mas segue travado para abate até o prazo.' : ''}</>
              : <>Registrar o óbito de <strong>{confirmar.e.brinco}</strong> ({confirmar.e.diagnostico})? O animal sai do lote, entra no livro como morte e a mortalidade do lote é atualizada.</>}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variant={confirmar?.destino === 'obito' ? 'destructive' : 'default'} onClick={executar}>{confirmar?.destino === 'alta' ? 'Confirmar alta' : 'Confirmar óbito'}</Button>
        </div>
      </Dialog>
    </div>
  )
}
