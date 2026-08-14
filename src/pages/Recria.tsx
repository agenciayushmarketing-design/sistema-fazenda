import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Plus, Scale } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { gmdMedioRecria, qtdLoteRecria } from '@/lib/metrics'
import { addDays, diffDays } from '@/data/seed'
import { fmtDate, fmtGMD, fmtKg1, fmtNum, hojeISO } from '@/lib/format'
import { SERIES, GRID, MUTED_INK, axisProps, tooltipStyle } from '@/lib/chart'
import type { LoteRecria } from '@/data/types'

/** GMD dos últimos 3 pesos do lote */
function gmdUltimos3(lote: LoteRecria): number {
  const pes = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  if (pes.length < 2) return lote.gmd
  const ult = pes.slice(-3)
  const dias = diffDays(ult[0].data, ult[ult.length - 1].data)
  return dias > 0 ? (ult[ult.length - 1].peso - ult[0].peso) / dias : lote.gmd
}

function projecaoAlvo(lote: LoteRecria): { data: string; dias: number } | null {
  const pes = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  const atual = pes[pes.length - 1]
  const gmd = gmdUltimos3(lote)
  if (!atual || gmd <= 0) return null
  if (atual.peso >= lote.pesoAlvo) return { data: atual.data, dias: 0 }
  const dias = Math.ceil((lote.pesoAlvo - atual.peso) / gmd)
  return { data: addDays(hojeISO(), dias), dias }
}

export default function Recria() {
  const state = useStore()
  const [pesagemOpen, setPesagemOpen] = useState(false)
  const [loteSel, setLoteSel] = useState(state.lotesRecria[0]?.id ?? '')

  const gmdMedio = gmdMedioRecria(state)
  const ranking = [...state.lotesRecria].sort((a, b) => gmdUltimos3(b) - gmdUltimos3(a))
  // contagem real: animais ativos alocados nos lotes (acompanha desmames/saídas feitos na demo)
  const totalCab = state.lotesRecria.reduce((s, l) => s + qtdLoteRecria(state.animais, l.id), 0)

  const lote = state.lotesRecria.find((l) => l.id === loteSel) ?? state.lotesRecria[0]

  // curva real vs meta do lote selecionado
  const curva = lote
    ? [...lote.pesagens]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((p) => {
          const dias = diffDays(lote.dataEntrada, p.data)
          return {
            dias,
            data: p.data,
            real: p.peso,
            meta: Math.round((lote.pesoEntrada + lote.gmdMeta * dias) * 10) / 10,
          }
        })
    : []

  return (
    <div>
      <PageHeader
        title="Recria"
        subtitle="Lotes, pesagens a cada 28 dias, GMD e projeção de peso-alvo"
        actions={
          <Button onClick={() => setPesagemOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova pesagem de lote
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Cabeças em recria" value={fmtNum(totalCab)} detail={`${state.lotesRecria.length} lotes ativos`} />
        <StatCard label="GMD médio ponderado" value={fmtGMD(gmdMedio)} detail="todos os lotes" />
        <StatCard label="Melhor lote (GMD últ. 3 pesos)" value={ranking[0] ? fmtGMD(gmdUltimos3(ranking[0])) : '—'} detail={ranking[0]?.nome} tone="good" />
        <StatCard label="Peso-alvo" value="330 / 380 kg" detail="fêmea cobertura / macho terminação" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Pasto</TableHead>
              <TableHead className="text-right">Cab.</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead className="text-right">Peso entrada</TableHead>
              <TableHead className="text-right">Peso atual</TableHead>
              <TableHead className="text-right">GMD (últ. 3 pesos)</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead>Projeção peso-alvo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((l, i) => {
              const pasto = state.pastos.find((p) => p.id === l.pastoId)
              const pes = [...l.pesagens].sort((a, b) => a.data.localeCompare(b.data))
              const atual = pes[pes.length - 1]
              const g3 = gmdUltimos3(l)
              const proj = projecaoAlvo(l)
              const acimaMeta = g3 >= l.gmdMeta
              return (
                <TableRow
                  key={l.id}
                  className={loteSel === l.id ? 'bg-accent/60' : 'cursor-pointer'}
                  onClick={() => setLoteSel(l.id)}
                >
                  <TableCell className="tnum text-muted-foreground">{i + 1}º</TableCell>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{pasto?.nome}</TableCell>
                  <TableCell className="tnum text-right">{qtdLoteRecria(state.animais, l.id)}</TableCell>
                  <TableCell className="tnum">{fmtDate(l.dataEntrada)}</TableCell>
                  <TableCell className="tnum text-right">{fmtKg1(l.pesoEntrada)}</TableCell>
                  <TableCell className="tnum text-right font-semibold">{atual ? fmtKg1(atual.peso) : '—'}</TableCell>
                  <TableCell className="tnum text-right">
                    <span className={acimaMeta ? 'text-green-700' : 'text-amber-700'}>{fmtGMD(g3)}</span>
                  </TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtGMD(l.gmdMeta)}</TableCell>
                  <TableCell>
                    {proj ? (
                      proj.dias === 0 ? (
                        <Badge variant="good">Alvo atingido</Badge>
                      ) : (
                        <span className="tnum">{fmtDate(proj.data)} <span className="text-muted-foreground">({proj.dias} d · alvo {l.pesoAlvo} kg)</span></span>
                      )
                    ) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Clique em um lote para ver a curva de peso. GMD calculado com os três últimos pesos do lote.
        </div>
      </div>

      {lote && (
        <div className="mt-3">
          <ChartCard title={`Curva de peso — ${lote.nome} (real × meta)`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={curva} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="dias" {...axisProps} label={{ value: 'dias no lote', position: 'insideBottomRight', offset: -2, fontSize: 11, fill: MUTED_INK }} />
                <YAxis domain={['dataMin - 15', 'dataMax + 15']} {...axisProps} />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(v) => `Dia ${v}`}
                  formatter={(v, name) => [`${fmtKg1(Number(v))}`, name === 'real' ? 'Peso real' : 'Meta']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'real' ? 'Peso real' : `Meta (${fmtGMD(lote.gmdMeta)})`)} />
                <Line dataKey="meta" stroke={MUTED_INK} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line dataKey="real" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, fill: SERIES[0] }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <NovaPesagemDialog open={pesagemOpen} onClose={() => setPesagemOpen(false)} />
    </div>
  )
}

function NovaPesagemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lotesRecria, addPesagemLote } = useStore()
  const [loteId, setLoteId] = useState(lotesRecria[0]?.id ?? '')
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')

  const salvar = () => {
    if (!loteId || !peso) return
    addPesagemLote(loteId, { data, peso: Number(peso) })
    toast(`Pesagem do lote registrada: ${Number(peso).toLocaleString('pt-BR')} kg médio.`)
    setPeso('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova pesagem de lote">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Lote">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {lotesRecria.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Peso médio do lote (kg)">
          <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="285" />
        </FormRow>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Scale className="h-3.5 w-3.5" /> Cadência recomendada: 28 dias
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </div>
      </div>
    </Dialog>
  )
}
