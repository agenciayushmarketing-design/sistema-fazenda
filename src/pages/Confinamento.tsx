// Confinamento — do cocho ao abate: painel geral, painel do lote, cocho por baia,
// dietas, abate, enfermaria e simulador. Todos os números vêm de src/lib/confinamento.ts.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { AlertTriangle, ChevronRight, ClipboardCheck, OctagonAlert, Plus, Scale } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard } from '@/components/shared'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { alertasConfinamento, baiasStatus, resumoConfinamento } from '@/lib/confinamento'
import { diffDays } from '@/data/seed'
import { FASE_LABEL } from '@/data/types'
import { fmtBRL, fmtDate, fmtGMD, fmtNum, fmtNum1, fmtNum2, fmtPct } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import { cn } from '@/lib/utils'
import { PainelLote } from '@/components/confinamento/PainelLote'
import { CochoTab } from '@/components/confinamento/Cocho'
import { DietasTab } from '@/components/confinamento/Dietas'
import { AbateTab } from '@/components/confinamento/Abate'
import { EnfermariaTab } from '@/components/confinamento/Enfermaria'
import { SimuladorTab } from '@/components/confinamento/Simulador'
import { EntradaLoteDialog, LeituraBaiaDialog, PesagemLoteDialog } from '@/components/confinamento/dialogs'

const ABAS = ['painel', 'lotes', 'cocho', 'dietas', 'abate', 'enfermaria', 'simular'] as const

export default function Confinamento() {
  const state = useStore()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? ''
  const tabInicial = (ABAS as readonly string[]).includes(tabParam) ? tabParam : 'painel'
  const loteParam = searchParams.get('lote') ?? undefined
  const [leituraOpen, setLeituraOpen] = useState(false)
  const [pesagemOpen, setPesagemOpen] = useState(false)
  const [entradaOpen, setEntradaOpen] = useState(false)

  const resumo = resumoConfinamento(state)
  const baias = baiasStatus(state)
  const alertas = alertasConfinamento(state)
  const [loteSel, setLoteSel] = useState(loteParam && state.lotesConfinamento.some((l) => l.id === loteParam) ? loteParam : (resumo.lotes[0]?.lote.id ?? ''))
  const lote = state.lotesConfinamento.find((l) => l.id === loteSel) ?? resumo.lotes[0]?.lote

  // curvas de peso dos lotes ativos (kg médio × dias no cocho)
  const curvas = resumo.lotes.map((r) => ({
    nome: r.lote.nome.split(' — ')[0],
    dados: r.lote.pesagens.map((p) => ({ dias: diffDays(r.lote.dataEntrada, p.data), peso: p.peso })),
  }))
  const maxDias = Math.max(0, ...curvas.flatMap((c) => c.dados.map((d) => d.dias)))
  const curvaData: Record<string, number | string>[] = []
  for (let d = 0; d <= maxDias; d += 7) {
    const row: Record<string, number | string> = { dias: d }
    for (const c of curvas) {
      const p = c.dados.find((x) => Math.abs(x.dias - d) < 4)
      if (p) row[c.nome] = p.peso
    }
    curvaData.push(row)
  }

  return (
    <div>
      <PageHeader
        title="Confinamento"
        subtitle={`${fmtNum(resumo.cab)} cabeças em ${resumo.baiasOcupadas} de ${resumo.baiasTotal} baias · ${fmtPct(resumo.ocupacaoPct)} da capacidade`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPesagemOpen(true)}><Scale className="h-3.5 w-3.5" /> Pesagem</Button>
            <Button variant="secondary" onClick={() => setLeituraOpen(true)}><ClipboardCheck className="h-3.5 w-3.5" /> Leitura de cocho</Button>
            <Button onClick={() => setEntradaOpen(true)}><Plus className="h-3.5 w-3.5" /> Entrada de lote</Button>
          </>
        }
      />

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="lotes">Lotes ({resumo.lotes.length})</TabsTrigger>
          <TabsTrigger value="cocho">Cocho{resumo.semLeituraHoje.length > 0 ? ` (${resumo.semLeituraHoje.length} pendentes)` : ''}</TabsTrigger>
          <TabsTrigger value="dietas">Dietas</TabsTrigger>
          <TabsTrigger value="abate">Abate ({resumo.abates30})</TabsTrigger>
          <TabsTrigger value="enfermaria">Enfermaria ({resumo.naEnfermaria})</TabsTrigger>
          <TabsTrigger value="simular">Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="painel">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Cabeças no cocho" value={fmtNum(resumo.cab)} detail={`${resumo.lotes.length} lotes · ${fmtPct(resumo.mortalidadePct)} mortalidade`}
              hint="Animais vivos nas baias hoje." />
            <StatCard label="GMD médio" value={fmtGMD(resumo.gmd)} detail="ponderado por cabeça" tone={resumo.gmd >= 1.3 ? 'good' : 'warning'}
              hint="Ganho médio diário de todos os lotes desde a entrada, ponderado pelo tamanho de cada um." />
            <StatCard label="Conversão alimentar" value={`${fmtNum1(resumo.conversaoAlimentar)} : 1`} detail={`${fmtNum1(resumo.msCabDia)} kg MS/cab/dia`} tone={resumo.conversaoAlimentar > 8 ? 'warning' : 'good'}
              hint="Kg de matéria seca para cada kg de peso vivo ganho. Entre 6 e 8 é o esperado em confinamento." />
            <StatCard label="Custo / @ produzida" value={fmtBRL(resumo.custoArrobaProduzida)} detail={`cotação ${fmtBRL(resumo.precoArroba)}`} tone={resumo.custoArrobaProduzida > resumo.precoArroba ? 'critical' : 'good'}
              hint="Custo do cocho (alimentação, fixo e sanitário) dividido pelas arrobas de carcaça produzidas. Abaixo da cotação = o cocho paga." />
            <StatCard label="Margem projetada" value={fmtBRL(resumo.margemProjetada)} detail={`receita ${fmtBRL(resumo.receitaProjetada)}`} tone={resumo.margemProjetada >= 0 ? 'good' : 'critical'}
              hint="Soma da margem projetada dos lotes no abate, pela cotação atual." />
            <StatCard label="Abates em 30 dias" value={fmtNum(resumo.abates30)} detail={`${fmtNum(resumo.cabAbates30)} cabeças`} tone={resumo.abates30 > 0 ? 'warning' : undefined} />
            <StatCard label="Custo diário" value={`${fmtBRL(resumo.custoDiarioCab)}/cab`} detail={`${fmtBRL(resumo.custoDiarioCab * resumo.cab)}/dia no cocho`} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ChartCard title="Lotes — ordenados pela data de abate" className="xl:col-span-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {resumo.lotes.map((r) => (
                  <button
                    key={r.lote.id}
                    onClick={() => setLoteSel(r.lote.id)}
                    className={cn('rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-secondary', r.lote.id === lote?.id && 'border-primary bg-accent')}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[12px] font-semibold">{r.lote.nome}</span>
                      <Badge variant={r.diasRestantes <= 7 ? 'critical' : r.diasRestantes <= 30 ? 'warning' : 'default'}>{r.diasRestantes} d</Badge>
                    </div>
                    <div className="tnum mt-0.5 text-[11px] text-muted-foreground">
                      {r.baia?.nome} · {r.cab} cab · {fmtNum(r.pesoAtual)} kg · {FASE_LABEL[r.lote.fase]}
                    </div>
                    <div className="tnum text-[11px]">
                      GMD <span className={r.gmdRecente < r.lote.gmdMeta * 0.9 ? 'text-amber-700' : 'text-green-700'}>{fmtNum2(r.gmd)}</span> · CA {fmtNum1(r.conversaoAlimentar)} · margem <span className={r.margemProjetada >= 0 ? 'text-green-700' : 'text-red-700'}>{fmtBRL(r.margemCab)}/cab</span>
                    </div>
                  </button>
                ))}
              </div>
            </ChartCard>
            <ChartCard title={`Alertas do confinamento (${alertas.length})`}>
              <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                {alertas.map((a, i) => (
                  <Link key={i} to={a.link} className={`group flex items-start gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${a.severidade === 'critical' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}>
                    {a.severidade === 'critical' ? <OctagonAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />}
                    <div className="flex-1">
                      <div className="text-xs font-semibold leading-tight">{a.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{a.detalhe}</div>
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
                {alertas.length === 0 && <div className="text-xs text-muted-foreground">Nenhum alerta ativo.</div>}
              </div>
            </ChartCard>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ChartCard title="Ocupação das baias">
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {baias.map((b) => (
                  <button
                    key={b.baia.id}
                    onClick={() => b.resumo && setLoteSel(b.resumo.lote.id)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-left',
                      b.livre ? 'border-dashed bg-secondary/40 text-muted-foreground' : b.liberaEmDias <= 30 ? 'border-amber-200 bg-amber-50' : 'bg-card hover:bg-secondary',
                    )}
                  >
                    <div className="text-[12px] font-semibold">{b.baia.nome}</div>
                    <div className="tnum text-[11px]">{b.livre ? 'livre' : `${b.cab}/${b.baia.capacidade} · ${Math.round(b.ocupacaoPct)}%`}</div>
                    <div className="mt-1 h-1 rounded bg-secondary"><div className="h-1 rounded bg-primary" style={{ width: `${Math.min(100, b.ocupacaoPct)}%` }} /></div>
                  </button>
                ))}
              </div>
            </ChartCard>
            <ChartCard title="Curva de peso dos lotes (kg médio × dias de cocho)" className="xl:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={curvaData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="dias" {...axisProps} />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} {...axisProps} />
                  <Tooltip {...tooltipStyle} labelFormatter={(v) => `Dia ${v}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {curvas.map((c, i) => (
                    <Line key={c.nome} dataKey={c.nome} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={{ r: 2, fill: SERIES[i % SERIES.length] }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="lotes">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Lote</span>
            <Select value={lote?.id ?? ''} onChange={(e) => setLoteSel(e.target.value)} className="w-full sm:w-72">
              {state.lotesConfinamento.filter((l) => l.status === 'ativo').map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              {state.lotesConfinamento.some((l) => l.status === 'abatido') && (
                <optgroup label="Abatidos">
                  {state.lotesConfinamento.filter((l) => l.status === 'abatido').map((l) => <option key={l.id} value={l.id}>{l.nome} — {fmtDate(l.pesagens.at(-1)?.data)}</option>)}
                </optgroup>
              )}
            </Select>
          </div>
          {lote ? <PainelLote key={lote.id} lote={lote} /> : <div className="text-sm text-muted-foreground">Nenhum lote no cocho.</div>}
        </TabsContent>

        <TabsContent value="cocho"><CochoTab loteInicial={loteParam} /></TabsContent>
        <TabsContent value="dietas"><DietasTab /></TabsContent>
        <TabsContent value="abate"><AbateTab /></TabsContent>
        <TabsContent value="enfermaria"><EnfermariaTab /></TabsContent>
        <TabsContent value="simular"><SimuladorTab /></TabsContent>
      </Tabs>

      <LeituraBaiaDialog open={leituraOpen} onClose={() => setLeituraOpen(false)} />
      <PesagemLoteDialog open={pesagemOpen} onClose={() => setPesagemOpen(false)} loteInicial={lote?.id} />
      <EntradaLoteDialog open={entradaOpen} onClose={() => setEntradaOpen(false)} />
    </div>
  )
}
