import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { AlertTriangle, ChevronRight, OctagonAlert } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard } from '@/components/shared'
import { CATEGORIA_LABEL, type Categoria } from '@/data/types'
import {
  alertas, arrobasProduzidas, custoPorArroba, evolucaoRebanho, gmdMedioRecria,
  inventarioPorCategoria, metricasCria, metricasReproducao, uaTotal, ativos,
} from '@/lib/metrics'
import { fmtBRL, fmtGMD, fmtMesAno, fmtNum, fmtNum1, fmtNum2, fmtPct, fmtDateShort } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import { diffDays } from '@/data/seed'
import { hojeISO } from '@/lib/format'

/** Tooltip da evolução com total do mês ao final */
function EvolucaoTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-semibold text-muted-foreground">{fmtMesAno(String(label))}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tnum">{fmtNum(Number(p.value) || 0)}</span>
        </div>
      ))}
      <div className="mt-0.5 flex items-center justify-between gap-4 border-t pt-0.5 font-semibold">
        <span>Total</span>
        <span className="tnum">{fmtNum(total)}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const state = useStore()
  const inv = inventarioPorCategoria(state.animais)
  const total = ativos(state.animais).length
  const ua = uaTotal(state.animais)
  const repro = metricasReproducao(state)
  const cria = metricasCria(state)
  const gmd = gmdMedioRecria(state)
  const custoArroba = custoPorArroba(state)
  const arrobas = arrobasProduzidas(state)
  const listaAlertas = alertas(state)
  const evolucao = evolucaoRebanho(state)

  const distribuicao = (Object.entries(inv) as [Categoria, number][])
    .map(([cat, qtd]) => ({ categoria: CATEGORIA_LABEL[cat], qtd }))
    .sort((a, b) => b.qtd - a.qtd)

  // curva de peso dos lotes de recria (peso médio por data de pesagem)
  const hoje = hojeISO()
  const curvas = state.lotesRecria.map((l) => ({
    nome: l.nome,
    dados: l.pesagens.map((p) => ({ dias: diffDays(l.dataEntrada, p.data), peso: p.peso, data: p.data })),
  }))
  const maxDias = Math.max(...curvas.flatMap((c) => c.dados.map((d) => d.dias)))
  const curvaData: Record<string, number | string>[] = []
  for (let d = 0; d <= maxDias; d += 28) {
    const row: Record<string, number | string> = { dias: d }
    for (const c of curvas) {
      const ponto = c.dados.find((p) => p.dias === d)
      if (ponto) row[c.nome] = ponto.peso
    }
    curvaData.push(row)
  }
  void hoje

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${state.fazenda.nome} — visão geral do ciclo completo`}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total de cabeças" value={fmtNum(total)} detail="animais ativos" />
        <StatCard label="UA total" value={fmtNum1(ua)} detail="1 UA = 450 kg PV" />
        <StatCard label="Lotação" value={`${fmtNum2(ua / state.fazenda.areaHa)} UA/ha`} detail={`${fmtNum(state.fazenda.areaHa)} ha úteis`} />
        <StatCard label="Taxa de prenhez" value={fmtPct(repro.prenhezFinalPct)} detail={`${repro.prenhasTotal}/${repro.expostas} expostas · ${repro.pendentes} DG pendentes`} />
        <StatCard label="Taxa de desmame" value={fmtPct(cria.taxaDesmamePct)} detail="projetada, safra atual" />
        <StatCard label="GMD médio recria" value={fmtGMD(gmd)} detail="ponderado por lote" />
        <StatCard label="Custo / @ produzida" value={fmtBRL(custoArroba)} detail={`${fmtNum1(arrobas)} @ no período`} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Evolução do rebanho por categoria (12 meses)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={evolucao} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="mes" tickFormatter={fmtMesAno} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<EvolucaoTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Bezerros" stackId="a" fill={SERIES[0]} />
              <Bar dataKey="Recria" stackId="a" fill={SERIES[1]} />
              <Bar dataKey="Novilhas" stackId="a" fill={SERIES[2]} />
              <Bar dataKey="Matrizes" stackId="a" fill={SERIES[3]} />
              <Bar dataKey="Terminação" stackId="a" fill={SERIES[4]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição de categorias">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribuicao} layout="vertical" margin={{ top: 0, right: 36, left: 30, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey="categoria" width={80} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="qtd" name="Cabeças" fill={SERIES[0]} radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 11, fill: '#52514e' }}>
                {distribuicao.map((_, i) => (
                  <Cell key={i} fill={SERIES[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Curva de peso — lotes de recria (kg médio × dias no lote)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={curvaData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="dias" {...axisProps} label={{ value: 'dias', position: 'insideBottomRight', offset: -2, fontSize: 11, fill: '#898781' }} />
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => `Dia ${v}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {curvas.map((c, i) => (
                <Line
                  key={c.nome}
                  dataKey={c.nome}
                  stroke={SERIES[i]}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: SERIES[i] }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Alertas operacionais (${listaAlertas.length})`}>
          <div className="max-h-[230px] space-y-1.5 overflow-y-auto pr-1">
            {listaAlertas.map((a, i) => (
              <Link
                key={i}
                to={a.link}
                className={`group flex items-start gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
                  a.severidade === 'critical'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                {a.severidade === 'critical' ? (
                  <OctagonAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                )}
                <div className="flex-1">
                  <div className="text-xs font-semibold leading-tight">{a.titulo}</div>
                  <div className="text-[11px] text-muted-foreground">{a.detalhe}</div>
                </div>
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
            {listaAlertas.length === 0 && (
              <div className="text-xs text-muted-foreground">Nenhum alerta ativo.</div>
            )}
          </div>
        </ChartCard>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Última pesagem consolidada: {fmtDateShort(hojeISO())} · Valores do custo por arroba consideram os custos
        rateados dos pedidos recebidos divididos pelas arrobas produzidas nos lotes ativos.
      </p>
    </div>
  )
}
