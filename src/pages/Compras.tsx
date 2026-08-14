import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Plus, PackageCheck, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { custoPorCentro, custoTotalRateado, arrobasProduzidas, custoPorArroba } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtDateShort, fmtNum, fmtNum1, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { CentroCusto, Pedido } from '@/data/types'

const STATUS_LABEL: Record<Pedido['status'], string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
}

export default function Compras() {
  const state = useStore()
  const receberPedido = useStore((s) => s.receberPedido)
  const removePedido = useStore((s) => s.removePedido)
  const [novoOpen, setNovoOpen] = useState(false)
  const [insumoSel, setInsumoSel] = useState('SAL-MIN')

  const totalPedido = (p: Pedido) => p.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
  const centros = custoPorCentro(state)
  const totalRateado = custoTotalRateado(state)
  const arrobas = arrobasProduzidas(state)

  const pedidosOrdenados = [...state.pedidos].sort((a, b) => b.data.localeCompare(a.data))

  const historico = useMemo(
    () =>
      state.precosHistoricos
        .filter((h) => h.itemEstoqueId === insumoSel)
        .sort((a, b) => a.data.localeCompare(b.data)),
    [state.precosHistoricos, insumoSel],
  )
  const insumosComHistorico = useMemo(() => {
    const ids = [...new Set(state.precosHistoricos.map((h) => h.itemEstoqueId))]
    return ids
      .map((id) => state.estoque.find((i) => i.id === id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
  }, [state.precosHistoricos, state.estoque])

  return (
    <div>
      <PageHeader
        title="Compras"
        subtitle="Pedidos, recebimento no estoque e rateio por centro de custo"
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo pedido
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Custo total recebido" value={fmtBRL(totalRateado)} detail="pedidos com status recebido" />
        <StatCard label="Centro Cria" value={fmtBRL(centros.Cria)} />
        <StatCard label="Centro Recria" value={fmtBRL(centros.Recria)} />
        <StatCard label="Centro Terminação" value={fmtBRL(centros.Terminacao)} />
        <StatCard label="Centro Geral" value={fmtBRL(centros.Geral)} />
        <StatCard label="Custo / @ produzida" value={fmtBRL(custoPorArroba(state))} detail={`${fmtNum1(arrobas)} @ no período`} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Rateio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidosOrdenados.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.numero}</TableCell>
                <TableCell>{p.fornecedor}</TableCell>
                <TableCell className="tnum">{fmtDate(p.data)}</TableCell>
                <TableCell className="max-w-[280px]">
                  {p.itens.map((i) => (
                    <div key={i.itemEstoqueId} className="truncate text-[12px] text-muted-foreground">
                      {fmtNum(i.quantidade)} × {i.descricao} @ {fmtBRL(i.valorUnitario)}
                    </div>
                  ))}
                </TableCell>
                <TableCell className="tnum text-right font-semibold">{fmtBRL(totalPedido(p))}</TableCell>
                <TableCell className="text-[11px] text-muted-foreground">
                  {(Object.entries(p.rateio) as [CentroCusto, number][])
                    .filter(([, pct]) => pct > 0)
                    .map(([c, pct]) => `${c === 'Terminacao' ? 'Terminação' : c} ${pct}%`)
                    .join(' · ')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === 'recebido' ? 'good'
                      : p.status === 'aprovado' ? 'info'
                      : p.status === 'cancelado' ? 'critical'
                      : 'warning'
                    }
                  >
                    {STATUS_LABEL[p.status]}
                  </Badge>
                  {p.dataRecebimento && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">em {fmtDate(p.dataRecebimento)}</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    {(p.status === 'pendente' || p.status === 'aprovado') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        title="Marcar como recebido (gera entrada no Estoque)"
                        onClick={() => {
                          if (confirm(`Confirmar recebimento do pedido ${p.numero}? As entradas serão lançadas no Estoque.`)) {
                            receberPedido(p.id)
                          }
                        }}
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Receber
                      </Button>
                    )}
                    {p.status !== 'recebido' && (
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                        title="Excluir pedido"
                        onClick={() => {
                          if (confirm(`Excluir o pedido ${p.numero}?`)) removePedido(p.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Ao marcar um pedido como recebido, cada item gera automaticamente uma entrada correspondente no Estoque.
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Histórico de preço por insumo" className="xl:col-span-2">
          <div className="mb-2">
            <Select value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)} className="w-64">
              {insumosComHistorico.map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historico} margin={{ top: 6, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
              <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} tickFormatter={(v) => fmtNum1(Number(v))} {...axisProps} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(v) => fmtDate(String(v))}
                formatter={(v) => [fmtBRL(Number(v)), 'Preço unitário']}
              />
              <Line dataKey="preco" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, fill: SERIES[0] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Rateio por centro de custo</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Centro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right pr-4">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(centros).map(([c, v]) => (
                  <TableRow key={c}>
                    <TableCell className="pl-4 font-medium">{c === 'Terminacao' ? 'Terminação' : c}</TableCell>
                    <TableCell className="tnum text-right">{fmtBRL(v)}</TableCell>
                    <TableCell className="tnum text-right pr-4 text-muted-foreground">
                      {totalRateado > 0 ? fmtNum1((v / totalRateado) * 100) : '0,0'}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <NovoPedidoDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
    </div>
  )
}

function NovoPedidoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, pedidos, addPedido } = useStore()
  const [fornecedor, setFornecedor] = useState('')
  const [itemId, setItemId] = useState(estoque[0]?.id ?? '')
  const [qtd, setQtd] = useState('')
  const [valor, setValor] = useState('')
  const [rateio, setRateio] = useState<CentroCusto>('Geral')

  const salvar = () => {
    const q = Number(qtd)
    const v = Number(valor)
    if (!fornecedor || !q || !v) return
    const item = estoque.find((i) => i.id === itemId)
    addPedido({
      numero: `PC-2025-${String(70 + pedidos.length).padStart(3, '0')}`,
      fornecedor,
      data: hojeISO(),
      status: 'pendente',
      itens: [{ itemEstoqueId: itemId, descricao: item?.nome ?? itemId, quantidade: q, valorUnitario: v }],
      rateio: {
        Cria: rateio === 'Cria' ? 100 : 0,
        Recria: rateio === 'Recria' ? 100 : 0,
        Terminacao: rateio === 'Terminacao' ? 100 : 0,
        Geral: rateio === 'Geral' ? 100 : 0,
      },
    })
    setFornecedor(''); setQtd(''); setValor('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo pedido de compra">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Fornecedor">
          <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nutrição Cerrado" />
        </FormRow>
        <FormRow label="Insumo">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {estoque.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Quantidade">
          <Input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </FormRow>
        <FormRow label="Valor unitário (R$)">
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        </FormRow>
        <FormRow label="Centro de custo (100%)">
          <Select value={rateio} onChange={(e) => setRateio(e.target.value as CentroCusto)}>
            <option value="Cria">Cria</option>
            <option value="Recria">Recria</option>
            <option value="Terminacao">Terminação</option>
            <option value="Geral">Geral</option>
          </Select>
        </FormRow>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Criar pedido</Button>
      </div>
    </Dialog>
  )
}
