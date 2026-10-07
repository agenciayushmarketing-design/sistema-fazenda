import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Plus, CheckCircle2, Trash2, MessageCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dre, despesasPorCentro, interpretarMensagem, metricasMes } from '@/lib/gestao'
import { custoPorArroba, ganhoKgTotal, custoTotalRateado } from '@/lib/metrics'
import { lerNumero } from '@/lib/planilha'
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
import { metricasFinanceiro, nomeMembro, statusLancamento } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtMesAno, fmtNum, fmtNum2, fmtPct, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { CentroCusto, Lancamento, OrigemLancamento } from '@/data/types'
import { Cell, BarChart } from 'recharts'

const CENTRO_LABEL: Record<CentroCusto, string> = { Cria: 'Cria', Recria: 'Recria', Terminacao: 'Terminação', Geral: 'Geral' }

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
  const mes = metricasMes(state)
  const demonstrativo = dre(state)
  const centros = despesasPorCentro(state)
  const totalCentros = centros.reduce((s, c) => s + c.valor, 0)
  const ganhoKg = ganhoKgTotal(state)
  const custoKgProduzido = ganhoKg > 0 ? custoTotalRateado(state) / ganhoKg : 0
  const updateConfig = useStore((s) => s.updateConfig)
  const [cotacao, setCotacao] = useState(String(state.config.precoArroba ?? ''))
  const [novoOpen, setNovoOpen] = useState(false)
  const [zapOpen, setZapOpen] = useState(false)
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
          <>
            <Button variant="secondary" onClick={() => setZapOpen(true)}>
              <MessageCircle className="h-3.5 w-3.5" /> Lançar por WhatsApp
            </Button>
            <Button onClick={() => setNovoOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo lançamento
            </Button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label={`Resultado de ${fmtMesAno(mes.mes + '-01')}`} value={fmtBRL(mes.resMes)} detail={`${fmtBRL(mes.recMes)} − ${fmtBRL(mes.despMes)}`} tone={mes.resMes >= 0 ? 'good' : 'critical'}
          hint="Mês de calendário, regime de caixa: o que entrou menos o que saiu até hoje." />
        <StatCard label="Resultado — 12 meses" value={fmtBRL(mes.res12)} detail={`margem ${fmtPct(mes.margem12)}`} tone={mes.res12 >= 0 ? 'good' : 'critical'} />
        <StatCard label="Custo / @ produzida" value={fmtBRL(custoPorArroba(state))} detail={`${fmtBRL(custoKgProduzido)} por kg produzido`}
          hint="Insumos comprados divididos pelas arrobas (ou kg) de peso vivo ganhas nos lotes em recria e terminação." />
        <StatCard label="A pagar" value={fmtBRL(m.aPagar)} detail="despesas em aberto" tone={m.aPagar > 0 ? 'warning' : undefined} />
        <StatCard label="A receber" value={fmtBRL(m.aReceber)} detail="receitas em aberto" />
        <StatCard label="Contas vencidas" value={fmtNum(m.vencidas)} tone={m.vencidas > 0 ? 'critical' : 'good'} />
        <StatCard label="Receitas — 30 dias" value={fmtBRL(m.receitasMes)} detail="regime de caixa" tone="good" />
        <StatCard label="Despesas — 30 dias" value={fmtBRL(m.despesasMes)} detail="regime de caixa" />
      </div>

      <Tabs defaultValue="caixa">
        <TabsList>
          <TabsTrigger value="caixa">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="dre">DRE simplificada</TabsTrigger>
          <TabsTrigger value="centros">Centros de custo</TabsTrigger>
          <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b px-3 py-2 text-[13px] font-semibold">DRE simplificada — últimos 12 meses (caixa)</div>
              <Table>
                <TableBody>
                  <TableRow className="font-semibold"><TableCell>Receitas</TableCell><TableCell className="tnum text-right">{fmtBRL(demonstrativo.totalRec)}</TableCell><TableCell className="tnum text-right text-muted-foreground">100%</TableCell></TableRow>
                  {demonstrativo.receitas.map((r) => (
                    <TableRow key={r.categoria}><TableCell className="pl-6 text-muted-foreground">{r.categoria}</TableCell><TableCell className="tnum text-right">{fmtBRL(r.valor)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((r.valor / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  ))}
                  <TableRow className="font-semibold"><TableCell>(−) Custos variáveis</TableCell><TableCell className="tnum text-right">{fmtBRL(demonstrativo.despVariaveis)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((demonstrativo.despVariaveis / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  {demonstrativo.despesas.filter((d) => !['Pessoal', 'Energia', 'Combustível', 'Manutenção', 'Impostos'].includes(d.categoria)).map((d) => (
                    <TableRow key={d.categoria}><TableCell className="pl-6 text-muted-foreground">{d.categoria}</TableCell><TableCell className="tnum text-right">{fmtBRL(d.valor)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((d.valor / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-secondary/40 font-semibold"><TableCell>= Margem de contribuição</TableCell><TableCell className="tnum text-right">{fmtBRL(demonstrativo.margemContribuicao)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((demonstrativo.margemContribuicao / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  <TableRow className="font-semibold"><TableCell>(−) Custos fixos</TableCell><TableCell className="tnum text-right">{fmtBRL(demonstrativo.despFixas)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((demonstrativo.despFixas / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  {demonstrativo.despesas.filter((d) => ['Pessoal', 'Energia', 'Combustível', 'Manutenção', 'Impostos'].includes(d.categoria)).map((d) => (
                    <TableRow key={d.categoria}><TableCell className="pl-6 text-muted-foreground">{d.categoria}</TableCell><TableCell className="tnum text-right">{fmtBRL(d.valor)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{demonstrativo.totalRec > 0 ? fmtPct((d.valor / demonstrativo.totalRec) * 100) : '—'}</TableCell></TableRow>
                  ))}
                  <TableRow className={`font-bold ${demonstrativo.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}><TableCell>= Resultado</TableCell><TableCell className="tnum text-right">{fmtBRL(demonstrativo.resultado)}</TableCell><TableCell className="tnum text-right">{fmtPct(demonstrativo.margemPct)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Variáveis: insumos e compra de animais. Fixos: pessoal, energia, combustível, manutenção e impostos. Período {fmtDate(demonstrativo.inicio)} a {fmtDate(demonstrativo.fim)}.</div>
            </div>
            <ChartCard title="Receitas × despesas por categoria (12 meses)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...demonstrativo.receitas.map((r) => ({ nome: r.categoria, valor: Math.round(r.valor), tipo: 'receita' })), ...demonstrativo.despesas.map((d) => ({ nome: d.categoria, valor: Math.round(d.valor), tipo: 'despesa' }))]} layout="vertical" margin={{ top: 0, right: 60, left: 40, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} {...axisProps} />
                  <YAxis type="category" dataKey="nome" width={110} {...axisProps} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmtBRL(Number(v)), 'Valor']} />
                  <Bar dataKey="valor" radius={[0, 3, 3, 0]}>
                    {[...demonstrativo.receitas, ...demonstrativo.despesas].map((x, i) => <Cell key={i} fill={i < demonstrativo.receitas.length ? SERIES[2] : SERIES[1]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="centros">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Despesas pagas por centro de custo — 12 meses">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={centros.map((c) => ({ nome: c.label, valor: Math.round(c.valor) }))} margin={{ top: 16, right: 8, left: 12, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="nome" {...axisProps} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} {...axisProps} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmtBRL(Number(v)), 'Despesas']} />
                  <Bar dataKey="valor" fill={SERIES[1]} radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#52514e', formatter: (v: number) => `${Math.round((v / Math.max(1, totalCentros)) * 100)}%` }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="rounded-lg border bg-card">
              <div className="border-b px-3 py-2 text-[13px] font-semibold">Onde o dinheiro foi</div>
              <Table>
                <TableHeader><TableRow><TableHead>Centro de custo</TableHead><TableHead className="text-right">Despesas</TableHead><TableHead className="text-right">% do total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {centros.map((c) => (
                    <TableRow key={c.centro}><TableCell className="font-medium">{c.label}</TableCell><TableCell className="tnum text-right">{fmtBRL(c.valor)}</TableCell><TableCell className="tnum text-right text-muted-foreground">{totalCentros > 0 ? fmtPct((c.valor / totalCentros) * 100) : '—'}</TableCell></TableRow>
                  ))}
                  <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="tnum text-right">{fmtBRL(totalCentros)}</TableCell><TableCell className="tnum text-right">100%</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Pedidos de insumos entram pelo rateio da compra; os demais lançamentos pelo centro escolhido no lançamento (sem centro = Geral).</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cotacoes">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-[13px] font-semibold">Arroba do boi gordo (R$/@)</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Usada no valor do rebanho em pé, na margem projetada do confinamento, no resultado estimado da ficha do animal e nos simuladores.</p>
              <div className="mt-2 flex gap-2">
                <Input value={cotacao} onChange={(e) => setCotacao(e.target.value)} placeholder="320" />
                <Button onClick={() => { const v = lerNumero(cotacao) ?? 0; if (!(v > 0)) return; updateConfig({ precoArroba: v }); toast(`Cotação da arroba salva: ${fmtBRL(v)}.`) }}>Salvar</Button>
              </div>
              <div className="tnum mt-2 text-xs text-muted-foreground">Em uso: {state.config.precoArroba ? fmtBRL(state.config.precoArroba) : 'não cadastrada'}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-[13px] font-semibold">Custo diário por fase (R$/cab/dia)</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Base do custo acumulado na ficha do animal: cria (ao pé da vaca) e recria a pasto. O confinamento usa o custo real do lote.</p>
              <CustoFaseEditor />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-[13px] font-semibold">Leite (R$/litro)</div>
              <div className="tnum mt-2 text-xl font-bold">{state.leite ? fmtNum2(state.leite.precoLitro) : '—'}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">{state.leite ? 'Definido no módulo Leite (receita do mês parcial).' : 'Esta fazenda não produz leite.'}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="caixa">
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
              <TableHead>Centro</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Por</TableHead>
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
                  <TableCell className="text-muted-foreground">{l.centroCusto ? CENTRO_LABEL[l.centroCusto] : l.origem === 'pedido' ? 'rateio' : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{ORIGEM_LABEL[l.origem]}</TableCell>
                  <TableCell className="text-muted-foreground">{nomeMembro(state, l.responsavelId)}</TableCell>
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

        </TabsContent>
      </Tabs>

      <NovoLancamentoDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
      <WhatsAppDialog open={zapOpen} onClose={() => setZapOpen(false)} />

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
  const [centro, setCentro] = useState<CentroCusto>('Geral')
  const [erro, setErro] = useState('')

  const salvar = () => {
    const v = lerNumero(valor) ?? 0
    if (!descricao.trim() || !(v > 0)) {
      setErro('Informe a descrição e um valor maior que zero.')
      return
    }
    addLancamento({
      tipo,
      categoria,
      descricao: descricao.trim(),
      valor: v,
      vencimento,
      pagamento: pago ? hojeISO() : undefined,
      origem: 'manual',
      centroCusto: centro,
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
        <FormRow label="Centro de custo">
          <Select value={centro} onChange={(e) => setCentro(e.target.value as CentroCusto)}>
            {(Object.keys(CENTRO_LABEL) as CentroCusto[]).map((c) => <option key={c} value={c}>{CENTRO_LABEL[c]}</option>)}
          </Select>
        </FormRow>
      </div>
      {erro && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{erro}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}

function CustoFaseEditor() {
  const config = useStore((s) => s.config)
  const updateConfig = useStore((s) => s.updateConfig)
  const [cria, setCria] = useState(String(config.custoDiaCria ?? 1.9).replace('.', ','))
  const [recria, setRecria] = useState(String(config.custoDiaRecria ?? 3.2).replace('.', ','))
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <FormRow label="Cria"><Input value={cria} onChange={(e) => setCria(e.target.value)} /></FormRow>
      <FormRow label="Recria"><Input value={recria} onChange={(e) => setRecria(e.target.value)} /></FormRow>
      <div className="col-span-2">
        <Button variant="secondary" onClick={() => { const c = lerNumero(cria) ?? 0; const r = lerNumero(recria) ?? 0; if (!(c > 0 && r > 0)) return; updateConfig({ custoDiaCria: c, custoDiaRecria: r }); toast('Custos por fase salvos — fichas recalculadas.') }}>Salvar custos</Button>
      </div>
    </div>
  )
}

const EXEMPLOS = ['paguei 350 de diesel ontem', 'vendi 12 bezerros por 38.500', 'conserto do trator 1.250, a prazo', 'salário do Zé 2.800 pago hoje']

/** Simula a mensagem de WhatsApp que vira lançamento pendente de conferência */
function WhatsAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lancar = useStore((s) => s.lancarPorMensagem)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const previa = texto.trim() ? interpretarMensagem(texto) : null
  const enviar = () => {
    const r = lancar(texto)
    if (!r.ok) {
      setErro(r.erro ?? 'Não entendi a mensagem.')
      return
    }
    toast(`Lançamento criado a partir da mensagem — ${fmtBRL(r.lancamento!.valor)} em ${r.lancamento!.categoria}, aguardando conferência.`)
    setTexto(''); setErro('')
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Lançar por WhatsApp (simulação)">
      <div className="rounded-lg bg-[#e5ddd5] p-3">
        <div className="ml-auto max-w-[85%] rounded-lg bg-[#dcf8c6] px-3 py-2 text-[13px] shadow-sm">
          <input
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setErro('') }}
            placeholder="Escreva como mandaria no grupo da fazenda…"
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            aria-label="Mensagem"
          />
        </div>
        {previa && (
          <div className="mt-2 max-w-[85%] rounded-lg bg-white px-3 py-2 text-[12px] shadow-sm">
            <div className="font-semibold">Entendi assim:</div>
            <div className="tnum mt-0.5">{previa.tipo === 'receita' ? 'Receita' : 'Despesa'} de <strong>{fmtBRL(previa.valor)}</strong> · {previa.categoria} · {CENTRO_LABEL[previa.centroCusto]} · {fmtDate(previa.data)} · {previa.pago ? (previa.tipo === 'receita' ? 'recebido' : 'pago') : 'em aberto'}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">confiança {previa.confianca} — o escritório confere antes de valer</div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {EXEMPLOS.map((ex) => <button key={ex} onClick={() => setTexto(ex)} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary">{ex}</button>)}
      </div>
      {erro && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{erro}</p>}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">No sistema completo, a mensagem chega pelo número da fazenda; aqui você digita para ver a interpretação. O lançamento entra pendente na Conferência.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={enviar} disabled={!previa}>Enviar mensagem</Button>
      </div>
    </Dialog>
  )
}
