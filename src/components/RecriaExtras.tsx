import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { lerNumero } from '@/lib/planilha'
import { gmdMedioRecria, rankingGMDIndividual } from '@/lib/metrics'
import { addDays, KG_POR_ARROBA, LIMITE_GMD_INDIVIDUAL, MERCADO } from '@/data/seed'
import { fmtBRL, fmtDate, fmtGMD, fmtKg1, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'

// ---------------------------------------------------------------------
// Ranking individual: quem mais e quem menos ganhou dentro de cada lote
// ---------------------------------------------------------------------
export function RankingIndividual() {
  const state = useStore()
  const [loteFiltro, setLoteFiltro] = useState('')
  const [soAlertas, setSoAlertas] = useState(false)
  const todos = useMemo(() => rankingGMDIndividual(state), [state])
  const lista = todos
    .filter((r) => !loteFiltro || r.lote.id === loteFiltro)
    .filter((r) => !soAlertas || r.alerta)
  const pag = usePagination(lista, 50)
  const alertas = todos.filter((r) => r.alerta).length
  const lotes = [...new Map(todos.map((r) => [r.lote.id, r.lote])).values()]

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum animal da recria tem duas ou mais pesagens individuais no lote ainda.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Animais no ranking" value={fmtNum(todos.length)} detail="com 2+ pesagens no lote" />
        <StatCard
          label="Maior ganho"
          value={fmtGMD(todos[0].gmd)}
          detail={`${todos[0].animal.brinco} · ${todos[0].lote.nome}`}
          tone="good"
        />
        <StatCard
          label="Menor ganho"
          value={fmtGMD(todos[todos.length - 1].gmd)}
          detail={`${todos[todos.length - 1].animal.brinco} · ${todos[todos.length - 1].lote.nome}`}
          tone="warning"
        />
        <StatCard
          label="Abaixo da média do lote"
          value={fmtNum(alertas)}
          detail={`ganhando ${Math.round((1 - LIMITE_GMD_INDIVIDUAL) * 100)}%+ menos que o lote`}
          tone={alertas > 0 ? 'critical' : 'good'}
          hint="Cada animal é comparado com a média do próprio lote (mesmo pasto e manejo). Quem fica muito abaixo pode estar doente, dominado no cocho ou com problema de dente."
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Select value={loteFiltro} onChange={(e) => setLoteFiltro(e.target.value)} className="w-52">
          <option value="">Todos os lotes</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </Select>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input type="checkbox" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} />
          Só os que estão abaixo da média
        </label>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Brinco</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="text-right">Peso atual</TableHead>
              <TableHead className="text-right">GMD</TableHead>
              <TableHead className="text-right">Média do lote</TableHead>
              <TableHead className="text-right">vs. lote</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pag.pageItems.map((r) => {
              const pos = todos.indexOf(r) + 1
              const dif = r.relativo - 1
              return (
                <TableRow key={r.animal.id} className={r.alerta ? 'bg-red-50/60 hover:bg-red-50' : ''}>
                  <TableCell className="tnum text-muted-foreground">{pos}º</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/rebanho/${r.animal.id}`} className="text-primary hover:underline">{r.animal.brinco}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.lote.nome}</TableCell>
                  <TableCell className="tnum text-right">{fmtKg1(r.animal.pesoAtual)}</TableCell>
                  <TableCell className={cn('tnum text-right font-semibold', r.alerta && 'text-red-700')}>{fmtGMD(r.gmd)}</TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtGMD(r.mediaLote)}</TableCell>
                  <TableCell className={cn('tnum text-right', dif < 0 ? 'text-red-700' : 'text-green-700')}>
                    <span className="inline-flex items-center gap-0.5">
                      {dif < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {dif > 0 ? '+' : ''}
                      {fmtNum1(dif * 100)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.alerta ? (
                      <Badge variant="critical">Abaixo — examinar</Badge>
                    ) : r.relativo >= 1.15 ? (
                      <Badge variant="good">Destaque</Badge>
                    ) : (
                      <Badge>Na média</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination {...pag} />
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          GMD individual calculado com as 3 últimas pesagens do animal no lote. Os destaques são bons candidatos a
          reprodutor ou reposição; os de baixo merecem uma olhada no curral.
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Simulador de compra de bezerros: projeção de lucro antes de fechar negócio
// ---------------------------------------------------------------------
export function SimularCompra() {
  const state = useStore()
  const comprarAnimais = useStore((s) => s.comprarAnimais)
  const gmdRef = gmdMedioRecria(state) || 0.55
  const [qtd, setQtd] = useState('50')
  const [pesoCompra, setPesoCompra] = useState('210')
  const [valorCab, setValorCab] = useState(() =>
    String(Math.round((210 / KG_POR_ARROBA) * MERCADO.precoArrobaBoi * (1 + MERCADO.agioBezerroPct / 100))),
  )
  const [gmd, setGmd] = useState(gmdRef.toFixed(2).replace('.', ','))
  const [pesoVenda, setPesoVenda] = useState('450')
  const [precoVenda, setPrecoVenda] = useState(String(MERCADO.precoArrobaBoi))
  const [custoDia, setCustoDia] = useState(String(MERCADO.custoDiarioCab).replace('.', ','))
  const [mortalidade, setMortalidade] = useState(String(MERCADO.mortalidadePct).replace('.', ','))
  const [loteId, setLoteId] = useState(state.lotesRecria[0]?.id ?? state.lotes[0]?.id ?? '')

  const n = (s: string) => lerNumero(s) ?? 0
  const q = n(qtd)
  const pc = n(pesoCompra)
  const vc = n(valorCab)
  const g = n(gmd)
  const pv = n(pesoVenda)
  const pr = n(precoVenda)
  const cd = n(custoDia)
  const mort = n(mortalidade) / 100

  const valido = q > 0 && pc > 0 && vc > 0 && g > 0 && pv > pc && pr > 0
  const dias = valido ? Math.ceil((pv - pc) / g) : 0
  const vivos = q * (1 - mort)
  const custoCompra = q * vc
  const custoManutencao = vivos * dias * cd
  const custoTotal = custoCompra + custoManutencao
  const receita = vivos * (pv / KG_POR_ARROBA) * pr
  const lucro = receita - custoTotal
  const margem = receita > 0 ? lucro / receita : 0
  const rentMes = custoTotal > 0 && dias > 0 ? lucro / custoTotal / (dias / 30) : 0
  const precoArrobaPago = pc > 0 ? vc / (pc / KG_POR_ARROBA) : 0
  const agio = pr > 0 ? precoArrobaPago / pr - 1 : 0
  // quanto dá para pagar por cabeça e ainda empatar
  const maximoPorCab = q > 0 ? (receita - custoManutencao) / q : 0
  const arrobasProduzidas = vivos * ((pv - pc) / KG_POR_ARROBA)
  const custoArrobaProduzida = arrobasProduzidas > 0 ? custoManutencao / arrobasProduzidas : 0

  const campo = (rotulo: string, valor: string, set: (v: string) => void, sufixo?: string) => (
    <FormRow label={rotulo}>
      <div className="relative">
        <Input inputMode="decimal" value={valor} onChange={(e) => set(e.target.value)} className={sufixo ? 'pr-12' : ''} />
        {sufixo && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            {sufixo}
          </span>
        )}
      </div>
    </FormRow>
  )

  return (
    <div className="grid gap-3 xl:grid-cols-5">
      <div className="rounded-lg border bg-card p-4 xl:col-span-2">
        <div className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
          <Calculator className="h-4 w-4" /> Dados do negócio
        </div>
        <div className="grid grid-cols-2 gap-3">
          {campo('Quantidade', qtd, setQtd, 'cab')}
          {campo('Peso na compra', pesoCompra, setPesoCompra, 'kg')}
          {campo('Valor por cabeça', valorCab, setValorCab, 'R$')}
          {campo('GMD esperado', gmd, setGmd, 'kg/dia')}
          {campo('Peso de venda', pesoVenda, setPesoVenda, 'kg')}
          {campo('Preço da @ na venda', precoVenda, setPrecoVenda, 'R$/@')}
          {campo('Custo diário', custoDia, setCustoDia, 'R$/cab')}
          {campo('Mortalidade', mortalidade, setMortalidade, '%')}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          GMD sugerido = média atual da sua recria ({fmtGMD(gmdRef)}). Custo diário cobre pasto, sal, sanitário e mão de obra.
        </p>
      </div>

      <div className="xl:col-span-3">
        {!valido ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Preencha os dados — o peso de venda precisa ser maior que o de compra.
          </div>
        ) : (
          <>
            <div
              className={cn(
                'mb-3 rounded-lg border px-4 py-3',
                lucro >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
              )}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Resultado projetado</div>
              <div className={cn('tnum mt-1 text-2xl font-bold', lucro >= 0 ? 'text-green-800' : 'text-red-700')}>
                {fmtBRL(lucro)}
              </div>
              <div className="tnum text-[12px]">
                {fmtBRL(vivos > 0 ? lucro / vivos : 0)} por cabeça · margem {fmtPct(margem * 100)} · {fmtPct(rentMes * 100)} ao mês
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard label="Tempo até o peso" value={`${fmtNum(dias)} dias`} detail={`venda ~${fmtDate(addDays(hojeISO(), dias))}`} />
              <StatCard label="Receita" value={fmtBRL(receita)} detail={`${fmtNum(Math.round(vivos))} cab × ${fmtNum1(pv / KG_POR_ARROBA)} @`} />
              <StatCard label="Custo total" value={fmtBRL(custoTotal)} detail={`compra ${fmtBRL(custoCompra)}`} />
              <StatCard
                label="Ágio pago"
                value={fmtPct(agio * 100)}
                detail={`${fmtBRL(precoArrobaPago)}/@ do bezerro`}
                tone={agio > 0.3 ? 'warning' : undefined}
                hint="Quanto a arroba do bezerro sai mais cara que a arroba de venda do boi."
              />
            </div>

            <div className="rounded-lg border bg-card px-4 py-3 text-[13px]">
              <div>
                Pague <strong>no máximo {fmtBRL(maximoPorCab)} por cabeça</strong> para não ter prejuízo{' '}
                <span className="text-muted-foreground">
                  (você está pagando {fmtBRL(vc)} —{' '}
                  {vc <= maximoPorCab
                    ? `sobra ${fmtBRL(maximoPorCab - vc)} de folga por cabeça`
                    : `passa ${fmtBRL(vc - maximoPorCab)} do limite`}
                  ).
                </span>
              </div>
              <div className="tnum mt-1 text-muted-foreground">
                Custo da arroba produzida na recria: {fmtBRL(custoArrobaProduzida)}/@ · {fmtNum1(arrobasProduzidas)} @ produzidas
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                <FormRow label="Lote de destino">
                  <Select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="w-52">
                    {state.lotes.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </Select>
                </FormRow>
                <Button
                  onClick={() => {
                    const r = comprarAnimais({
                      categoria: pc >= 240 ? 'garrote' : 'bezerro',
                      qtd: Math.round(q),
                      pesoMedio: pc,
                      valorTotal: Math.round(q) * vc,
                      vendedor: 'Compra simulada',
                      loteId,
                    })
                    if (!r.ok) {
                      toast(r.erro ?? 'Não foi possível fechar a compra.', 'error')
                      return
                    }
                    toast(`${fmtNum(Math.round(q))} animais comprados por ${fmtBRL(custoCompra)} — entraram no rebanho e a despesa foi lançada.`)
                  }}
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> Fechar esta compra
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
