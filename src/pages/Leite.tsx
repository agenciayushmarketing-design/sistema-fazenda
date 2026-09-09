import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { metricasLeite, ativos } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtDateShort, fmtNum, fmtNum1, hojeISO } from '@/lib/format'
import { SERIES, GRID, MUTED_INK, axisProps, tooltipStyle } from '@/lib/chart'

export default function Leite() {
  const state = useStore()
  const m = metricasLeite(state)
  const [prodOpen, setProdOpen] = useState(false)

  const producaoDesc = [...state.producaoLeite].sort((a, b) => b.data.localeCompare(a.data))
  const pag = usePagination(producaoDesc, 31)

  if (!m || !state.leite) {
    return (
      <div>
        <PageHeader title="Leite" subtitle="Produção diária, tanque e receita" />
        <p className="text-sm text-muted-foreground">
          Este perfil de demonstração não tem atividade leiteira — troque para o perfil
          <strong> Corte &amp; Leite</strong> na barra lateral para ver o módulo em uso.
        </p>
      </div>
    )
  }

  const vacasLote = ativos(state.animais).filter((a) => a.aptidao === 'leite')
  const secas = vacasLote.length - m.vacasLactacao
  const metaDiaria = m.vacasLactacao * state.leite.mediaLitrosVacaDia

  return (
    <div>
      <PageHeader
        title="Leite"
        subtitle="Produção diária, média por vaca e receita — integrado ao Financeiro"
        actions={
          <Button onClick={() => setProdOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar produção do dia
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Vacas em lactação" value={fmtNum(m.vacasLactacao)} detail={`${secas} secas · ${vacasLote.length} no plantel leite`} />
        <StatCard label="Produção de ontem" value={`${fmtNum(m.producaoOntem)} L`} />
        <StatCard label="Média 7 dias" value={`${fmtNum(Math.round(m.media7dias))} L/dia`} />
        <StatCard label="Média por vaca" value={`${fmtNum1(m.mediaVacaDia)} L/dia`} detail={`meta ${state.leite.mediaLitrosVacaDia} L`} />
        <StatCard label="Litros no mês" value={`${fmtNum(m.litrosMes)} L`} />
        <StatCard label="Receita do mês" value={fmtBRL(m.receitaMes)} detail={`${fmtBRL(state.leite.precoLitro)}/L`} tone="good" />
      </div>

      <div className="mb-3">
        <ChartCard title="Produção diária — últimos 30 dias (L)">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={state.producaoLeite} margin={{ top: 6, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
              <YAxis domain={['dataMin - 40', 'dataMax + 40']} {...axisProps} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(v) => fmtDate(String(v))}
                formatter={(v) => [`${fmtNum(Number(v))} L`, 'Produção']}
              />
              <ReferenceLine
                y={metaDiaria}
                stroke={MUTED_INK}
                strokeDasharray="5 4"
                label={{ value: `meta ${fmtNum(metaDiaria)} L`, position: 'insideTopRight', fontSize: 10, fill: MUTED_INK }}
              />
              <Line dataKey="litros" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2.5, fill: SERIES[0] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Litros</TableHead>
              <TableHead className="text-right">Média por vaca</TableHead>
              <TableHead className="text-right">Valor estimado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pag.pageItems.map((p) => (
              <TableRow key={p.data}>
                <TableCell className="tnum">{fmtDate(p.data)}</TableCell>
                <TableCell className="tnum text-right font-semibold">{fmtNum(p.litros)} L</TableCell>
                <TableCell className="tnum text-right">{fmtNum1(p.litros / m.vacasLactacao)} L</TableCell>
                <TableCell className="tnum text-right">{fmtBRL(p.litros * state.leite!.precoLitro)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pag} />
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          O fechamento mensal do leite entra como receita no Financeiro; o mês corrente fica como
          "a receber" até o pagamento do laticínio.
        </div>
      </div>

      <NovaProducaoDialog open={prodOpen} onClose={() => setProdOpen(false)} />
    </div>
  )
}

function NovaProducaoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addProducaoLeite = useStore((s) => s.addProducaoLeite)
  const [data, setData] = useState(hojeISO())
  const [litros, setLitros] = useState('')

  const salvar = () => {
    const l = Number(litros)
    if (!l || l <= 0) return
    addProducaoLeite({ data, litros: l })
    toast(`Produção de ${fmtNum(l)} L registrada para ${fmtDate(data)}.`)
    setLitros('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar produção do dia">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormRow>
        <FormRow label="Litros no tanque">
          <Input type="number" value={litros} onChange={(e) => setLitros(e.target.value)} placeholder="760" />
        </FormRow>
      </div>
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        Registrar novamente a mesma data substitui o valor anterior (correção de medição).
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
