// Painel do lote: números do cocho ao abate, composição do custo e ações do lote
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { Scale, Utensils, Split, Beef, Stethoscope } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard, ChartCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { consumoLote, enfermariaAberta, resumoLote, statusEnfermaria } from '@/lib/confinamento'
import { diffDays } from '@/data/seed'
import { FASE_LABEL } from '@/data/types'
import { fmtBRL, fmtDate, fmtDateShort, fmtGMD, fmtNum, fmtNum1, fmtNum2, fmtPct } from '@/lib/format'
import { SERIES, GRID, MUTED_INK, axisProps, tooltipStyle } from '@/lib/chart'
import { AbateDialog, ApartarPesoDialog, EntradaEnfermariaDialog, PesagemLoteDialog, TrocarDietaDialog } from './dialogs'
import type { LoteConfinamento } from '@/data/types'

const STATUS_ENF = { tratamento: 'Em tratamento', carencia: 'Em carência', liberado: 'Carência cumprida' } as const

export function PainelLote({ lote }: { lote: LoteConfinamento }) {
  const state = useStore()
  const r = resumoLote(state, lote)
  const [pesagem, setPesagem] = useState(false)
  const [dieta, setDieta] = useState(false)
  const [apartar, setApartar] = useState(false)
  const [abate, setAbate] = useState(false)
  const [enf, setEnf] = useState(false)
  const ativo = lote.status === 'ativo'

  const curva = [...lote.pesagens]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((p) => {
      const dias = diffDays(lote.dataEntrada, p.data)
      return { dias, data: p.data, real: p.peso, meta: Math.round((lote.pesoEntrada + lote.gmdMeta * dias) * 10) / 10 }
    })
  const consumo21 = consumoLote(state, lote, 21).map((c) => ({
    data: c.data, realizado: Math.round(c.msCabDia * 10) / 10, previsto: Math.round(((c.previsto / c.cabecas) * ((r.dieta?.msPct ?? 100) / 100)) * 10) / 10, nota: c.nota,
  }))
  const custoProd = r.custoAlimentacao + r.custoFixo + r.custoSanitario
  const composicao = [
    { nome: lote.origem === 'compra' ? 'Compra (com ágio)' : 'Recria anterior', valor: r.custoEntrada },
    { nome: 'Alimentação', valor: r.custoAlimentacao },
    { nome: 'Fixo', valor: r.custoFixo },
    { nome: 'Sanitário', valor: r.custoSanitario },
  ]
  const enfLote = enfermariaAberta(state).filter((e) => e.loteId === lote.id)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">{lote.nome}</h2>
            <Badge variant={ativo ? 'info' : 'default'}>{r.baia?.nome ?? '—'}</Badge>
            <Badge variant={lote.fase === 'terminacao' ? 'good' : lote.fase === 'adaptacao' ? 'warning' : 'default'}>{FASE_LABEL[lote.fase]} · {r.dieta?.nome ?? 'sem dieta'}</Badge>
            {!ativo && <Badge>Abatido</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Entrada {fmtDate(lote.dataEntrada)} · {fmtNum(lote.qtdEntrada)} cab · {fmtNum(lote.pesoEntrada)} kg · {lote.origem === 'compra' ? `${lote.fornecedor ?? 'compra'}, ágio ${lote.agioPct}%` : 'recria própria'} · {fmtBRL(lote.custoCabEntrada)}/cab
          </div>
        </div>
        {ativo && (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setPesagem(true)}><Scale className="h-3.5 w-3.5" /> Pesagem</Button>
            <Button size="sm" variant="secondary" onClick={() => setDieta(true)}><Utensils className="h-3.5 w-3.5" /> Trocar dieta</Button>
            <Button size="sm" variant="secondary" onClick={() => setApartar(true)}><Split className="h-3.5 w-3.5" /> Apartar por peso</Button>
            <Button size="sm" variant="secondary" onClick={() => setEnf(true)}><Stethoscope className="h-3.5 w-3.5" /> Enfermaria</Button>
            <Button size="sm" onClick={() => setAbate(true)}><Beef className="h-3.5 w-3.5" /> Registrar abate</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Dias de cocho" value={fmtNum(r.diasCocho)} detail={`plano ${lote.diasCochoPlano} · previsto ${r.diasCochoPrevistos}`} tone={r.acimaDoPlano ? 'warning' : undefined}
          hint="Dias desde a entrada no cocho. 'Previsto' soma os dias que faltam para o peso de abate no ritmo atual." />
        <StatCard label="Peso atual" value={`${fmtNum(r.pesoAtual)} kg`} detail={`${r.cab} cab · +${fmtNum(r.ganhoKgCab)} kg/cab`} />
        <StatCard label="GMD" value={fmtGMD(r.gmd)} detail={`recente ${fmtNum2(r.gmdRecente)} · meta ${fmtNum2(lote.gmdMeta)}`} tone={r.gmdRecente < lote.gmdMeta * 0.9 ? 'warning' : 'good'}
          hint="Ganho médio diário desde a entrada; 'recente' é entre as duas últimas pesagens." />
        <StatCard label="Ganho de carcaça" value={`${fmtNum2(r.ganhoCarcacaDia)} kg/dia`} detail={`rendimento ${fmtPct(lote.rendimentoEstimado)}`}
          hint="GMD × rendimento de carcaça: quanto de carne vendável o animal põe por dia." />
        <StatCard label="Consumo MS" value={`${fmtNum1(r.msCabDia)} kg/cab`} detail={`${fmtNum2(r.consumoPctPV)}% do PV · ${fmtNum1(r.kgAsFedCabDia)} kg no cocho`}
          hint="Matéria seca ingerida por cabeça/dia (média de 7 dias). O normal é 2 a 2,5% do peso vivo." />
        <StatCard label="Conversão alimentar" value={`${fmtNum1(r.conversaoAlimentar)} : 1`} detail="kg MS por kg de ganho" tone={r.conversaoAlimentar > 8 ? 'warning' : 'good'}
          hint="Quantos kg de matéria seca o lote come para ganhar 1 kg de peso vivo. Quanto menor, melhor." />
        <StatCard label="Custo diário" value={`${fmtBRL(r.custoDiarioCab)}/cab`} detail="alimentação + fixo + sanitário" />
        <StatCard label="Custo / @ produzida" value={fmtBRL(r.custoArrobaProduzida)} detail={`${fmtNum1(r.arrobasProduzidas)} @ produzidas`} tone={r.custoArrobaProduzida > r.precoArroba ? 'critical' : 'good'}
          hint="Custo de produção (sem a compra) dividido pelas arrobas de carcaça que o lote ganhou no cocho. Comparar com o preço da arroba." />
        <StatCard label="Arroba de equilíbrio" value={fmtBRL(r.arrobaEquilibrio)} detail={`cotação ${fmtBRL(r.precoArroba)}`} tone={r.arrobaEquilibrio > r.precoArroba ? 'critical' : 'good'}
          hint="Preço da arroba que paga todo o custo do lote (compra + cocho) na saída. Abaixo da cotação = lucro." />
        <StatCard label="Margem projetada" value={fmtBRL(r.margemProjetada)} detail={`${fmtBRL(r.margemCab)}/cab`} tone={r.margemProjetada >= 0 ? 'good' : 'critical'}
          hint="Receita no abate (peso alvo × rendimento × cotação) menos o custo total projetado até lá." />
        <StatCard label="Abate previsto" value={ativo ? fmtDate(r.dataAbatePrevista) : fmtDate(lote.pesagens.at(-1)?.data)} detail={ativo ? `${r.diasRestantes} dias · alvo ${fmtNum(lote.pesoAbateAlvo)} kg` : 'lote encerrado'} />
        <StatCard label="Enfermaria / mortalidade" value={`${r.naEnfermaria} · ${fmtPct(r.mortalidadePct)}`} detail={`${r.mortos} óbito(s) de ${lote.qtdEntrada}`} tone={r.naEnfermaria > 0 ? 'warning' : undefined} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard title="Evolução do peso — real × meta (kg médio)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={curva} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="dias" {...axisProps} />
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => `Dia ${v}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={lote.pesoAbateAlvo} stroke={MUTED_INK} strokeDasharray="5 4" label={{ value: `abate ${lote.pesoAbateAlvo}`, position: 'insideTopRight', fontSize: 10, fill: MUTED_INK }} />
              <Line dataKey="real" name="Real" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2.5, fill: SERIES[0] }} />
              <Line dataKey="meta" name="Meta" stroke={SERIES[3]} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Consumo de MS — últimos 21 dias (kg/cab/dia)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={consumo21} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtDate(String(v))} formatter={(v, nome, item) => [`${fmtNum1(Number(v))} kg${nome === 'Realizado' ? ` · nota ${(item?.payload as { nota: number })?.nota ?? '—'}` : ''}`, String(nome)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="realizado" name="Realizado" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2, fill: SERIES[0] }} />
              <Line dataKey="previsto" name="Previsto" stroke={SERIES[3]} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Composição do custo — ${fmtBRL(r.custoTotal)} (${fmtBRL(r.custoTotal / Math.max(1, r.cab))}/cab)`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={composicao} layout="vertical" margin={{ top: 0, right: 60, left: 30, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <YAxis type="category" dataKey="nome" width={90} {...axisProps} />
              <Tooltip {...tooltipStyle} formatter={(v) => [fmtBRL(Number(v)), 'Custo']} />
              <Bar dataKey="valor" fill={SERIES[1]} radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 10, fill: '#52514e', formatter: (v: number) => `${Math.round((v / Math.max(1, r.custoTotal)) * 100)}%` }} />
            </BarChart>
          </ResponsiveContainer>
          <div className="tnum mt-1 text-[11px] text-muted-foreground">
            Produção no cocho: {fmtBRL(custoProd)} · projetado até o abate: {fmtBRL(r.custoTotalProjetado)} · receita projetada {fmtBRL(r.receitaProjetada)}
          </div>
        </ChartCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-[13px] font-semibold">Dietas do lote</div>
          <ul className="mt-1.5 space-y-1 text-[12px]">
            {lote.historicoDieta.map((h) => (
              <li key={h.data + h.dietaId} className="flex justify-between">
                <span>{FASE_LABEL[h.fase]} — {state.dietas.find((d) => d.id === h.dietaId)?.nome ?? h.dietaId}</span>
                <span className="tnum text-muted-foreground">desde {fmtDate(h.data)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-[13px] font-semibold">Enfermaria do lote ({enfLote.length})</div>
          {enfLote.length === 0 ? (
            <div className="mt-1.5 text-[12px] text-muted-foreground">Nenhum animal do lote na enfermaria.</div>
          ) : (
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {enfLote.map((e) => {
                const st = statusEnfermaria(e)
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span><Link to={`/rebanho/${e.animalId}`} className="font-medium hover:underline">{e.brinco}</Link> — {e.diagnostico}</span>
                    <Badge variant={st === 'liberado' ? 'good' : st === 'carencia' ? 'warning' : 'critical'}>{STATUS_ENF[st]}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <PesagemLoteDialog open={pesagem} onClose={() => setPesagem(false)} loteInicial={lote.id} />
      <TrocarDietaDialog open={dieta} onClose={() => setDieta(false)} loteId={lote.id} />
      <ApartarPesoDialog open={apartar} onClose={() => setApartar(false)} loteInicial={lote.id} />
      <AbateDialog open={abate} onClose={() => setAbate(false)} loteInicial={lote.id} />
      <EntradaEnfermariaDialog open={enf} onClose={() => setEnf(false)} />
    </div>
  )
}
