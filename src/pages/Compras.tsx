import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Plus, PackageCheck, Trash2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { custoPorCentro, custoTotalRateado, arrobasProduzidas, custoPorArroba } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtDateShort, fmtNum, fmtNum1, fmtNum2, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { CentroCusto, Pedido } from '@/data/types'

const STATUS_LABEL: Record<Pedido['status'], string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
}

const CENTRO_LABEL: Record<CentroCusto, string> = {
  Cria: 'Cria',
  Recria: 'Recria',
  Terminacao: 'Terminação',
  Geral: 'Geral',
}

export default function Compras() {
  const state = useStore()
  const receberPedido = useStore((s) => s.receberPedido)
  const removePedido = useStore((s) => s.removePedido)
  const [novoOpen, setNovoOpen] = useState(false)
  const [insumoSel, setInsumoSel] = useState('SAL-MIN')
  const [pedidoReceber, setPedidoReceber] = useState<Pedido | null>(null)
  const [pedidoExcluir, setPedidoExcluir] = useState<Pedido | null>(null)

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
              <TableHead className="w-32 text-right">Ações</TableHead>
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
                    .map(([c, pct]) => `${CENTRO_LABEL[c]} ${pct}%`)
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
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    {(p.status === 'pendente' || p.status === 'aprovado') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        title="Marcar como recebido (gera entrada no Estoque)"
                        onClick={() => setPedidoReceber(p)}
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Receber
                      </Button>
                    )}
                    {p.status !== 'recebido' && (
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                        title="Excluir pedido"
                        aria-label={`Excluir pedido ${p.numero}`}
                        onClick={() => setPedidoExcluir(p)}
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
            <LineChart data={historico} margin={{ top: 6, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
              <YAxis
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
                tickFormatter={(v) => `R$ ${fmtNum2(Number(v))}`}
                width={70}
                {...axisProps}
              />
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
                {(Object.entries(centros) as [CentroCusto, number][]).map(([c, v]) => (
                  <TableRow key={c}>
                    <TableCell className="pl-4 font-medium">{CENTRO_LABEL[c]}</TableCell>
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

      <ConfirmDialog
        open={pedidoReceber !== null}
        onClose={() => setPedidoReceber(null)}
        onConfirm={() => {
          if (!pedidoReceber) return
          receberPedido(pedidoReceber.id)
          toast(
            `Pedido ${pedidoReceber.numero} recebido — ${pedidoReceber.itens.length} ${
              pedidoReceber.itens.length === 1 ? 'entrada lançada' : 'entradas lançadas'
            } no Estoque.`,
          )
        }}
        title="Receber pedido"
        confirmLabel="Confirmar recebimento"
      >
        Confirmar o recebimento do pedido <strong>{pedidoReceber?.numero}</strong> (
        {pedidoReceber ? fmtBRL(totalPedido(pedidoReceber)) : ''})? As entradas serão lançadas no
        Estoque com os valores do pedido.
      </ConfirmDialog>

      <ConfirmDialog
        open={pedidoExcluir !== null}
        onClose={() => setPedidoExcluir(null)}
        onConfirm={() => {
          if (!pedidoExcluir) return
          removePedido(pedidoExcluir.id)
          toast(`Pedido ${pedidoExcluir.numero} excluído.`)
        }}
        title="Excluir pedido"
        confirmLabel="Excluir"
        tone="destructive"
      >
        Excluir o pedido <strong>{pedidoExcluir?.numero}</strong> de {pedidoExcluir?.fornecedor}?
      </ConfirmDialog>
    </div>
  )
}

interface LinhaPedido {
  itemId: string
  qtd: string
  valor: string
}

function NovoPedidoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, pedidos, addPedido } = useStore()
  const [fornecedor, setFornecedor] = useState('')
  const [linhas, setLinhas] = useState<LinhaPedido[]>([{ itemId: estoque[0]?.id ?? '', qtd: '', valor: '' }])
  const [rateio, setRateio] = useState<Record<CentroCusto, string>>({ Cria: '0', Recria: '0', Terminacao: '0', Geral: '100' })
  const [erro, setErro] = useState('')

  const setLinha = (i: number, patch: Partial<LinhaPedido>) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const totalGeral = linhas.reduce((s, l) => s + (Number(l.qtd) || 0) * (Number(l.valor) || 0), 0)
  const somaRateio = (Object.values(rateio) as string[]).reduce((s, v) => s + (Number(v) || 0), 0)

  const salvar = () => {
    if (!fornecedor.trim()) {
      setErro('Informe o fornecedor.')
      return
    }
    const itensValidos = linhas.filter((l) => l.itemId && Number(l.qtd) > 0 && Number(l.valor) > 0)
    if (itensValidos.length === 0) {
      setErro('Adicione ao menos um item com quantidade e valor.')
      return
    }
    if (somaRateio !== 100) {
      setErro(`O rateio precisa somar 100% (atual: ${somaRateio}%).`)
      return
    }
    addPedido({
      numero: `PC-2025-${String(70 + pedidos.length).padStart(3, '0')}`,
      fornecedor: fornecedor.trim(),
      data: hojeISO(),
      status: 'pendente',
      itens: itensValidos.map((l) => {
        const item = estoque.find((i) => i.id === l.itemId)
        return {
          itemEstoqueId: l.itemId,
          descricao: item?.nome ?? l.itemId,
          quantidade: Number(l.qtd),
          valorUnitario: Number(l.valor),
        }
      }),
      rateio: {
        Cria: Number(rateio.Cria) || 0,
        Recria: Number(rateio.Recria) || 0,
        Terminacao: Number(rateio.Terminacao) || 0,
        Geral: Number(rateio.Geral) || 0,
      },
    })
    toast(`Pedido criado com ${itensValidos.length} ${itensValidos.length === 1 ? 'item' : 'itens'} — ${fmtBRL(totalGeral)}.`)
    setFornecedor('')
    setLinhas([{ itemId: estoque[0]?.id ?? '', qtd: '', valor: '' }])
    setRateio({ Cria: '0', Recria: '0', Terminacao: '0', Geral: '100' })
    setErro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo pedido de compra" className="max-w-2xl">
      <FormRow label="Fornecedor">
        <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nutrição Cerrado" className="max-w-sm" />
      </FormRow>

      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Itens do pedido</div>
        {linhas.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Select value={l.itemId} onChange={(e) => setLinha(i, { itemId: e.target.value })} className="flex-1">
              {estoque.map((it) => (
                <option key={it.id} value={it.id}>{it.nome}</option>
              ))}
            </Select>
            <Input
              type="number"
              value={l.qtd}
              onChange={(e) => setLinha(i, { qtd: e.target.value })}
              placeholder="Qtd"
              className="w-24"
              aria-label="Quantidade"
            />
            <Input
              type="number"
              step="0.01"
              value={l.valor}
              onChange={(e) => setLinha(i, { valor: e.target.value })}
              placeholder="R$ unit."
              className="w-28"
              aria-label="Valor unitário"
            />
            <button
              onClick={() => setLinhas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600 disabled:opacity-40"
              disabled={linhas.length === 1}
              aria-label="Remover item"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLinhas((ls) => [...ls, { itemId: estoque[0]?.id ?? '', qtd: '', valor: '' }])}
        >
          <Plus className="h-3 w-3" /> Adicionar item
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">
          Rateio por centro de custo (soma deve ser 100%)
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(CENTRO_LABEL) as CentroCusto[]).map((c) => (
            <div key={c} className="space-y-1">
              <div className="text-[11px] text-muted-foreground">{CENTRO_LABEL[c]}</div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={rateio[c]}
                  onChange={(e) => setRateio((r) => ({ ...r, [c]: e.target.value }))}
                  className="pr-6"
                  aria-label={`Rateio ${CENTRO_LABEL[c]}`}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-1 text-[11px] ${somaRateio === 100 ? 'text-muted-foreground' : 'text-red-700'}`}>
          Soma atual: {somaRateio}%
        </div>
      </div>

      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="tnum text-sm font-semibold">Total: {fmtBRL(totalGeral)}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Criar pedido</Button>
        </div>
      </div>
    </Dialog>
  )
}
