// Leitura de cocho por baia: pendências do dia, realizado × previsto e histórico
import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ClipboardCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard, ChartCard } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { consumoLote, custoKgDieta, lotesConfAtivos, resumoConfinamento } from '@/lib/confinamento'
import { nomeMembro } from '@/lib/metrics'
import { NOTAS_COCHO } from '@/data/seed'
import { fmtBRL, fmtDate, fmtDateShort, fmtNum, fmtNum1, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import { LeituraBaiaDialog } from './dialogs'

const NOTA_VARIANTE = ['critical', 'warning', 'good', 'warning', 'critical'] as const

export function CochoTab({ loteInicial }: { loteInicial?: string }) {
  const state = useStore()
  const hoje = hojeISO()
  const lotes = lotesConfAtivos(state)
  const resumo = resumoConfinamento(state)
  const [leituraOpen, setLeituraOpen] = useState(false)
  const [loteLeitura, setLoteLeitura] = useState<string | undefined>()
  const [loteSel, setLoteSel] = useState(loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : (lotes[0]?.id ?? ''))
  const lote = lotes.find((l) => l.id === loteSel) ?? lotes[0]

  const hojeLeituras = state.leiturasCocho.filter((l) => l.data === hoje && l.baiaId)
  const kgHoje = hojeLeituras.reduce((s, l) => s + l.kgCalculado, 0)
  const custoHoje = hojeLeituras.reduce((s, l) => {
    const d = state.dietas.find((x) => x.id === l.dietaId)
    return s + (d ? l.kgCalculado * custoKgDieta(d, state.estoque) : 0)
  }, 0)
  const ontem = state.leiturasCocho.filter((l) => l.data === (() => { const d = new Date(hoje + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })() && l.baiaId)
  const sobraOntem = ontem.reduce((s, l) => s + (l.sobraKg ?? 0), 0)

  const serie7 = lote ? consumoLote(state, lote, 7).map((c) => ({ data: c.data, Realizado: c.realizado, Previsto: c.previsto, nota: c.nota })) : []
  const historico = useMemo(
    () => (lote ? consumoLote(state, lote).reverse() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.leiturasCocho, lote?.id],
  )
  const pag = usePagination(historico, 30)
  const baiaNome = (id?: string) => state.baias.find((b) => b.id === id)?.nome ?? id ?? '—'

  return (
    <div>
      {resumo.semLeituraHoje.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-[13px] font-medium text-amber-900">
            {resumo.semLeituraHoje.length} baia(s) sem leitura hoje: {resumo.semLeituraHoje.map((l) => baiaNome(l.lote.baiaId)).join(', ')}
          </span>
          <Button size="sm" onClick={() => { setLoteLeitura(resumo.semLeituraHoje[0].lote.id); setLeituraOpen(true) }}>
            <ClipboardCheck className="h-3.5 w-3.5" /> Fazer leitura agora
          </Button>
        </div>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Leituras de hoje" value={`${hojeLeituras.length} / ${lotes.length}`} detail="baias com trato definido" tone={hojeLeituras.length < lotes.length ? 'warning' : 'good'} />
        <StatCard label="Ração batida hoje" value={`${fmtNum(Math.round(kgHoje / 1000 * 10) / 10)} t`} detail={`${fmtBRL(custoHoje)} de ingredientes`} />
        <StatCard label="Sobra pesada ontem" value={`${fmtNum(sobraOntem)} kg`} detail={`${ontem.filter((l) => l.nota >= 3).length} baia(s) com sobra`} tone={ontem.some((l) => l.nota === 4) ? 'warning' : undefined} />
        <StatCard label="Consumo MS médio" value={`${fmtNum1(resumo.msCabDia)} kg/cab`} detail="média de 7 dias do confinamento" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard title="Baias — nota de ontem e trato de hoje">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {lotes.map((l) => {
              const ult = [...state.leiturasCocho.filter((x) => x.loteId === l.id)].sort((a, b) => a.data.localeCompare(b.data)).at(-1)
              const feita = ult?.data === hoje
              return (
                <button
                  key={l.id}
                  onClick={() => setLoteSel(l.id)}
                  className={`rounded-md border px-2 py-1.5 text-left transition-colors ${l.id === lote?.id ? 'border-primary bg-accent' : 'hover:bg-secondary'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">{baiaNome(l.baiaId)}</span>
                    {ult && <Badge variant={NOTA_VARIANTE[ult.nota]}>{ult.nota}</Badge>}
                  </div>
                  <div className="tnum text-[11px] text-muted-foreground">
                    {ult ? `${fmtNum(ult.kgCalculado)} kg · ${fmtNum1(ult.kgCalculado / ult.cabecas)} kg/cab` : 'sem leitura'}
                  </div>
                  <div className={`text-[10px] ${feita ? 'text-green-700' : 'text-amber-700'}`}>{feita ? 'leitura de hoje feita' : 'leitura pendente'}</div>
                </button>
              )
            })}
          </div>
        </ChartCard>
        <ChartCard title={`Realizado × previsto — últimos 7 dias (kg no cocho)`} className="xl:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Select value={lote?.id ?? ''} onChange={(e) => setLoteSel(e.target.value)} className="w-full sm:w-64">
              {lotes.map((l) => <option key={l.id} value={l.id}>{baiaNome(l.baiaId)} — {l.nome}</option>)}
            </Select>
            <Button size="sm" variant="secondary" onClick={() => { setLoteLeitura(lote?.id); setLeituraOpen(true) }}>
              <ClipboardCheck className="h-3.5 w-3.5" /> Ler esta baia
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={serie7} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtDate(String(v))} formatter={(v, nome, item) => [`${fmtNum(Number(v))} kg${nome === 'Realizado' ? ` · nota ${(item?.payload as { nota: number })?.nota}` : ''}`, String(nome)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Previsto" fill={SERIES[3]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Realizado" fill={SERIES[0]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-[13px] font-semibold">Histórico — {lote ? `${baiaNome(lote.baiaId)} · ${lote.nome}` : ''}</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Sobra</TableHead>
              <TableHead className="text-right">Trato</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">MS/cab</TableHead>
              <TableHead className="text-right">% PV</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pag.pageItems.map((c) => {
              const l = state.leiturasCocho.find((x) => x.loteId === lote?.id && x.data === c.data)
              return (
                <TableRow key={c.data}>
                  <TableCell className="tnum">{fmtDate(c.data)}</TableCell>
                  <TableCell><Badge variant={NOTA_VARIANTE[c.nota]}>{c.nota} · {NOTAS_COCHO[c.nota].rotulo}</Badge></TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtNum(c.sobraKg)} kg</TableCell>
                  <TableCell className="tnum text-right font-semibold">{fmtNum(c.realizado)} kg</TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtNum(c.previsto)} kg</TableCell>
                  <TableCell className="tnum text-right">{fmtNum1(c.msCabDia)}</TableCell>
                  <TableCell className="tnum text-right">{fmtNum1(c.pctPV)}%</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(c.custo)}</TableCell>
                  <TableCell className="text-muted-foreground">{nomeMembro(state, l?.responsavelId)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination {...pag} />
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Cada leitura baixa os ingredientes da dieta do estoque na proporção da fórmula — o tratador lança a nota e a sobra, o sistema calcula, baixa e registra.
        </div>
      </div>

      <LeituraBaiaDialog open={leituraOpen} onClose={() => setLeituraOpen(false)} loteInicial={loteLeitura} />
    </div>
  )
}
