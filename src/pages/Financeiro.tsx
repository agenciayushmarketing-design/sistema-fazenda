import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Plus, CheckCircle2, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination,
} from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { metricasFinanceiro, statusLancamento } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtMesAno, fmtNum, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { Lancamento, OrigemLancamento } from '@/data/types'

const ORIGEM_LABEL: Record<OrigemLancamento, string> = {
  pedido: 'Compras',
  manutencao: 'Manutenção',
  venda_animal: 'Venda de animais',
  compra_animal: 'Compra de animais',
  leite: 'Leite',
  fixa: 'Despesa fixa',
  manual: 'Manual',
}

export default function Financeiro() {
  const state = useStore()
  const pagarLancamento = useStore((s) => s.pagarLancamento)
  const removeLancamento = useStore((s) => s.removeLancamento)
  const m = metricasFinanceiro(state)
  const [novoOpen, setNovoOpen] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [excluir, setExcluir] = useState<Lancamento | null>(null)

  const hoje = hojeISO()
  const filtrados = useMemo(
    () =>
      [...state.lancamentos]
        .sort((a, b) => b.vencimento.localeCompare(a.vencimento))
        .filter((l) => !filtroTipo || l.tipo === filtroTipo)
        .filter((l) => !filtroStatus || statusLancamento(l, hoje) === filtroStatus),
    [state.lancamentos, filtroTipo, filtroStatus, hoje],
  )
  const pag = usePagination(filtrados, 50)

  const fluxoChart = m.fluxo12m.map((f) => ({
    mes: f.mes,
    Receitas: Math.round(f.receitas),
    Despesas: Math.round(f.despesas),
    Resultado: Math.round(f.resultado),
  }))

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Fluxo de caixa, contas a pagar e a receber — integrado a Compras, Máquinas e Leite"
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo lançamento
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Receitas — 30 dias" value={fmtBRL(m.receitasMes)} detail="regime de caixa" tone="good" />
        <StatCard label="Despesas — 30 dias" value={fmtBRL(m.despesasMes)} detail="regime de caixa" />
        <StatCard
          label="Resultado — 30 dias"
          value={fmtBRL(m.resultadoMes)}
          tone={m.resultadoMes >= 0 ? 'good' : 'critical'}
        />
        <StatCard label="A pagar" value={fmtBRL(m.aPagar)} detail="despesas em aberto" tone={m.aPagar > 0 ? 'warning' : undefined} />
        <StatCard label="A receber" value={fmtBRL(m.aReceber)} detail="receitas em aberto" />
        <StatCard label="Contas vencidas" value={fmtNum(m.vencidas)} tone={m.vencidas > 0 ? 'critical' : 'good'} />
      </div>

      <div className="mb-3">
        <ChartCard title="Fluxo de caixa — últimos 12 meses">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={fluxoChart} margin={{ top: 4, right: 8, left: 12, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="mes" tickFormatter={fmtMesAno} {...axisProps} />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} {...axisProps} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(v) => fmtMesAno(String(v))}
                formatter={(v, name) => [fmtBRL(Number(v)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Receitas" fill={SERIES[2]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Despesas" fill={SERIES[1]} radius={[3, 3, 0, 0]} />
              <Line dataKey="Resultado" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2.5, fill: SERIES[0] }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-40">
          <option value="">Receitas e despesas</option>
          <option value="receita">Só receitas</option>
          <option value="despesa">Só despesas</option>
        </Select>
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-40">
          <option value="">Todos os status</option>
          <option value="aberto">Em aberto</option>
          <option value="vencido">Vencidos</option>
          <option value="pago">Pagos</option>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pag.pageItems.map((l) => {
              const st = statusLancamento(l, hoje)
              return (
                <TableRow key={l.id}>
                  <TableCell className="tnum">{fmtDate(l.vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={l.tipo === 'receita' ? 'good' : 'default'}>
                      {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate font-medium">{l.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{l.categoria}</TableCell>
                  <TableCell className="text-muted-foreground">{ORIGEM_LABEL[l.origem]}</TableCell>
                  <TableCell className={`tnum text-right font-semibold ${l.tipo === 'receita' ? 'text-green-700' : ''}`}>
                    {l.tipo === 'receita' ? '+' : '−'} {fmtBRL(l.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st === 'pago' ? 'good' : st === 'vencido' ? 'critical' : 'warning'}>
                      {st === 'pago' ? (l.tipo === 'receita' ? 'Recebido' : 'Pago') : st === 'vencido' ? 'Vencido' : 'Em aberto'}
                    </Badge>
                    {l.pagamento && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">em {fmtDate(l.pagamento)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1 whitespace-nowrap">
                      {st !== 'pago' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            pagarLancamento(l.id)
                            toast(`${l.tipo === 'receita' ? 'Recebimento' : 'Pagamento'} de ${fmtBRL(l.valor)} registrado.`)
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> {l.tipo === 'receita' ? 'Receber' : 'Pagar'}
                        </Button>
                      )}
                      {l.origem === 'manual' && (
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                          aria-label="Excluir lançamento"
                          onClick={() => setExcluir(l)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination {...pag} />
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Lançamentos de Compras, Manutenção, Venda de animais e Leite são gerados automaticamente pelos
          respectivos módulos — origem sempre rastreável.
        </div>
      </div>

      <NovoLancamentoDialog open={novoOpen} onClose={() => setNovoOpen(false)} />

      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        onConfirm={() => {
          if (!excluir) return
          const r = removeLancamento(excluir.id)
          if (r.ok) toast('Lançamento excluído.')
          else toast(r.erro ?? 'Não foi possível excluir.', 'error')
        }}
        title="Excluir lançamento"
        confirmLabel="Excluir"
        tone="destructive"
      >
        Excluir o lançamento <strong>{excluir?.descricao}</strong> ({excluir ? fmtBRL(excluir.valor) : ''})?
      </ConfirmDialog>
    </div>
  )
}

function NovoLancamentoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addLancamento = useStore((s) => s.addLancamento)
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [categoria, setCategoria] = useState('Geral')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState(hojeISO())
  const [pago, setPago] = useState(false)

  const salvar = () => {
    const v = Number(valor)
    if (!descricao.trim() || !v || v <= 0) return
    addLancamento({
      tipo,
      categoria,
      descricao: descricao.trim(),
      valor: v,
      vencimento,
      pagamento: pago ? hojeISO() : undefined,
      origem: 'manual',
    })
    toast(`${tipo === 'receita' ? 'Receita' : 'Despesa'} de ${fmtBRL(v)} lançada.`)
    setDescricao(''); setValor('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo lançamento">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </Select>
        </FormRow>
        <FormRow label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {['Geral', 'Insumos', 'Pessoal', 'Energia', 'Combustível', 'Manutenção', 'Venda de animais', 'Leite', 'Impostos'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="ITR parcela 2" />
        </FormRow>
        <FormRow label="Valor (R$)">
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        </FormRow>
        <FormRow label="Vencimento">
          <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </FormRow>
        <FormRow label="Situação">
          <Select value={pago ? '1' : '0'} onChange={(e) => setPago(e.target.value === '1')}>
            <option value="0">Em aberto</option>
            <option value="1">Já pago/recebido (hoje)</option>
          </Select>
        </FormRow>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
