import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { Plus, Wheat, PackageOpen, ClipboardCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  ativos, consumoDiarioSalKg, consumoRealSal, duracaoPrevistaSal, nomeMembro, statusSalga,
} from '@/lib/metrics'
import { META_SAL_G_CAB_DIA, NOTAS_COCHO, PERFIS, TOLERANCIA_SAL } from '@/data/seed'
import { fmtDate, fmtDateShort, fmtNum, fmtNum1, hojeISO } from '@/lib/format'
import { SERIES, GRID, MUTED_INK, axisProps, tooltipStyle } from '@/lib/chart'
import type { LeituraCocho } from '@/data/types'

const NOTA_VARIANTE = ['critical', 'warning', 'good', 'warning', 'critical'] as const

export default function Nutricao() {
  const state = useStore()
  const fecharFornecimentoSal = useStore((s) => s.fecharFornecimentoSal)
  const [salOpen, setSalOpen] = useState(false)
  const [salLote, setSalLote] = useState('')
  const [leituraOpen, setLeituraOpen] = useState(false)
  const [searchParams] = useSearchParams()

  const cfgCocho = PERFIS[state.perfil].cocho
  const temCocho = Boolean(cfgCocho && state.lotes.some((l) => l.id === cfgCocho.loteId))
  const tabInicial = searchParams.get('tab') === 'cocho' && temCocho ? 'cocho' : 'salga'

  // ---- salga ----
  const hoje = hojeISO()
  const lotesSal = statusSalga(state)
  const itemSal = state.estoque.find((i) => i.id === PERFIS[state.perfil].salga.itemId)
  const consumoDia = consumoDiarioSalKg(state)
  const diasDeEstoque = itemSal && consumoDia > 0 ? itemSal.saldo / consumoDia : 0
  const foraDaMeta = lotesSal.filter((s) => s.situacao === 'acima' || s.situacao === 'abaixo').length
  const kgMes = state.fornecimentosSal
    .filter((f) => f.data.slice(0, 7) === hoje.slice(0, 7))
    .reduce((s, f) => s + f.kg, 0)
  const historicoSal = useMemo(
    () => [...state.fornecimentosSal].sort((a, b) => b.data.localeCompare(a.data)),
    [state.fornecimentosSal],
  )
  const salPag = usePagination(historicoSal, 50)
  const loteNome = (id: string) => state.lotes.find((l) => l.id === id)?.nome ?? id

  // ---- cocho ----
  const leituras = useMemo(
    () =>
      cfgCocho
        ? state.leiturasCocho.filter((l) => l.loteId === cfgCocho.loteId).sort((a, b) => a.data.localeCompare(b.data))
        : [],
    [state.leiturasCocho, cfgCocho],
  )
  const ultima = leituras[leituras.length - 1]
  const leituraHoje = leituras.find((l) => l.data === hoje)
  const cabConf = cfgCocho ? ativos(state.animais).filter((a) => a.loteId === cfgCocho.loteId).length : 0
  const consumoAcumulado = leituras.reduce((s, l) => s + l.kgCalculado, 0)
  const serieCocho = leituras.map((l) => ({
    data: l.data,
    kgCab: Math.round((l.kgCalculado / l.cabecas) * 10) / 10,
    nota: l.nota,
  }))
  const leiturasDesc = useMemo(() => [...leituras].reverse(), [leituras])
  const cochoPag = usePagination(leiturasDesc, 30)

  return (
    <div>
      <PageHeader
        title="Nutrição"
        subtitle="Salga com meta × realizado e leitura de cocho — cada lançamento baixa o estoque sozinho"
        actions={
          <>
            {temCocho && (
              <Button variant="secondary" onClick={() => setLeituraOpen(true)}>
                <ClipboardCheck className="h-3.5 w-3.5" /> Leitura de cocho
              </Button>
            )}
            <Button
              onClick={() => {
                setSalLote('')
                setSalOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Fornecer sal
            </Button>
          </>
        }
      />

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="salga">Salga em campo ({fmtNum(lotesSal.length)} lotes)</TabsTrigger>
          {temCocho && <TabsTrigger value="cocho">Leitura de cocho ({fmtNum(leituras.length)})</TabsTrigger>}
        </TabsList>

        <TabsContent value="salga">
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard
              label="Estoque de sal"
              value={itemSal ? `${fmtNum(itemSal.saldo)} kg` : '—'}
              detail={diasDeEstoque > 0 ? `dá para ~${fmtNum(Math.floor(diasDeEstoque))} dias` : undefined}
              tone={diasDeEstoque > 0 && diasDeEstoque < 20 ? 'warning' : undefined}
              hint="Saldo do estoque dividido pelo consumo diário esperado de todos os lotes na meta."
            />
            <StatCard label="Colocado no mês" value={`${fmtNum(kgMes)} kg`} detail="fornecimentos nos cochos" />
            <StatCard
              label="Consumo esperado"
              value={`${fmtNum1(consumoDia)} kg/dia`}
              detail="todos os lotes na meta"
              hint="Soma de cabeças × meta de consumo (g/cab/dia) de cada lote em pasto."
            />
            <StatCard
              label="Lotes fora da meta"
              value={fmtNum(foraDaMeta)}
              detail={`tolerância ±${Math.round(TOLERANCIA_SAL * 100)}%`}
              tone={foraDaMeta > 0 ? 'warning' : 'good'}
              hint="Consumo real do último cocho encerrado comparado à meta do lote. Acima pode ser desperdício; abaixo, falta de acesso ao cocho."
            />
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Cab.</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Consumo real</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Cocho atual</TableHead>
                  <TableHead className="w-48 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesSal.map((s) => {
                  const passou = s.atual && s.diasEmUso > s.duracaoPrevista
                  return (
                    <TableRow key={s.lote.id} className={s.situacao === 'acima' || s.situacao === 'abaixo' ? 'bg-amber-50/50 hover:bg-amber-50' : ''}>
                      <TableCell className="font-medium">{s.lote.nome}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum(s.cabecas)}</TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{s.meta} g/cab/dia</TableCell>
                      <TableCell className="tnum text-right font-semibold">
                        {s.consumoReal !== null ? `${fmtNum(Math.round(s.consumoReal))} g/cab/dia` : '—'}
                      </TableCell>
                      <TableCell>
                        {s.situacao === 'sem_dados' ? (
                          <Badge>Primeiro cocho</Badge>
                        ) : (
                          <Badge variant={s.situacao === 'ok' ? 'good' : 'warning'}>
                            {s.situacao === 'ok'
                              ? 'Na meta'
                              : `${s.desvio! > 0 ? '+' : ''}${Math.round(s.desvio! * 100)}% ${s.situacao === 'acima' ? 'acima' : 'abaixo'}`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[12px]">
                        {s.atual ? (
                          <span className={cn('tnum', passou && 'font-medium text-amber-700')}>
                            {fmtNum(s.atual.kg)} kg em {fmtDateShort(s.atual.data)} · dia {s.diasEmUso} de ~
                            {fmtNum(Math.round(s.duracaoPrevista))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">sem sal no cocho</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1 whitespace-nowrap">
                          {s.atual && (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Registrar que o cocho esvaziou hoje"
                              onClick={() => {
                                fecharFornecimentoSal(s.atual!.id, hoje)
                                toast(`Cocho de ${s.lote.nome} marcado como vazio — consumo real calculado.`)
                              }}
                            >
                              <PackageOpen className="h-3 w-3" /> Cocho vazio
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSalLote(s.lote.id)
                              setSalOpen(true)
                            }}
                          >
                            <Wheat className="h-3 w-3" /> Reabastecer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Consumo real = kg colocados ÷ (cabeças × dias até o cocho esvaziar), medido no último cocho
              encerrado. A duração prevista usa a meta do lote — passou dela, o cocho merece uma olhada.
            </div>
          </div>

          <div className="mt-3 rounded-lg border bg-card">
            <div className="border-b px-3 py-2 text-[13px] font-semibold">Histórico de fornecimentos</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Duração prevista</TableHead>
                  <TableHead className="text-right">Duração real</TableHead>
                  <TableHead className="text-right">Consumo real</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salPag.pageItems.map((f) => {
                  const real = consumoRealSal(f)
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="tnum">{fmtDate(f.data)}</TableCell>
                      <TableCell>{loteNome(f.loteId)}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum(f.kg)}</TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">
                        {fmtNum1(duracaoPrevistaSal(f))} dias
                      </TableCell>
                      <TableCell className="tnum text-right">
                        {f.fimReal ? `${Math.max(1, Math.round((new Date(f.fimReal).getTime() - new Date(f.data).getTime()) / 86400000))} dias` : 'em uso'}
                      </TableCell>
                      <TableCell className="tnum text-right font-medium">
                        {real !== null ? `${fmtNum(Math.round(real))} g` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{nomeMembro(state, f.responsavelId)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination {...salPag} />
          </div>
        </TabsContent>

        {temCocho && cfgCocho && (
          <TabsContent value="cocho">
            {!leituraHoje && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-[13px] font-medium text-amber-900">
                  Leitura de hoje pendente — o trato do dia sai da nota do cocho.
                </span>
                <Button size="sm" onClick={() => setLeituraOpen(true)}>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Fazer leitura agora
                </Button>
              </div>
            )}
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard
                label={leituraHoje ? 'Trato de hoje' : 'Último trato'}
                value={ultima ? `${fmtNum(ultima.kgCalculado)} kg` : '—'}
                detail={ultima ? fmtDate(ultima.data) : undefined}
              />
              <StatCard
                label="Por cabeça"
                value={ultima ? `${fmtNum1(ultima.kgCalculado / ultima.cabecas)} kg/dia` : '—'}
                detail={`meta ${fmtNum1(cfgCocho.kgCabAlvo)} kg · ${fmtNum(cabConf)} cab`}
              />
              <StatCard
                label="Última nota"
                value={ultima ? `${ultima.nota} — ${NOTAS_COCHO[ultima.nota].rotulo}` : '—'}
                tone={ultima && ultima.nota === 2 ? 'good' : 'warning'}
                hint="0 lambido · 1 limpo · 2 ideal · 3 sobra · 4 muita sobra. A nota da sobra de ontem ajusta o trato de hoje."
              />
              <StatCard label="Ração desde a entrada" value={`${fmtNum(Math.round(consumoAcumulado / 1000))} t`} detail={`${leituras.length} leituras`} />
            </div>

            <div className="mb-3 grid gap-3 xl:grid-cols-3">
              <ChartCard title="Trato por cabeça (kg/dia) — ajustado pela leitura de cocho" className="xl:col-span-2">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={serieCocho} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} {...axisProps} />
                    <Tooltip
                      {...tooltipStyle}
                      labelFormatter={(v) => fmtDate(String(v))}
                      formatter={(v, _n, item) => [
                        `${fmtNum1(Number(v))} kg/cab · nota ${(item?.payload as { nota: number })?.nota ?? '—'}`,
                        'Trato',
                      ]}
                    />
                    <ReferenceLine
                      y={cfgCocho.kgCabAlvo}
                      stroke={MUTED_INK}
                      strokeDasharray="5 4"
                      label={{ value: `meta ${fmtNum1(cfgCocho.kgCabAlvo)}`, position: 'insideTopRight', fontSize: 10, fill: MUTED_INK }}
                    />
                    <Line dataKey="kgCab" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2, fill: SERIES[0] }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="rounded-lg border bg-card px-4 py-3">
                <div className="text-[13px] font-semibold">Escala de leitura</div>
                <ul className="mt-2 space-y-1.5">
                  {NOTAS_COCHO.map((n) => (
                    <li key={n.nota} className="flex items-start gap-2 text-[12px]">
                      <Badge variant={NOTA_VARIANTE[n.nota]}>{n.nota}</Badge>
                      <span className="flex-1">
                        <span className="font-medium">{n.rotulo}</span>
                        <span className="text-muted-foreground"> — {n.descricao}</span>
                      </span>
                      <span className="tnum font-semibold">
                        {n.ajuste > 0 ? '+' : ''}
                        {Math.round(n.ajuste * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="text-right">Trato de ontem</TableHead>
                    <TableHead className="text-right">Ajuste</TableHead>
                    <TableHead className="text-right">Trato do dia</TableHead>
                    <TableHead className="text-right">Kg/cab</TableHead>
                    <TableHead>Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cochoPag.pageItems.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="tnum">{fmtDate(l.data)}</TableCell>
                      <TableCell>
                        <Badge variant={NOTA_VARIANTE[l.nota]}>
                          {l.nota} · {NOTAS_COCHO[l.nota].rotulo}
                        </Badge>
                      </TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{fmtNum(l.kgOntem)} kg</TableCell>
                      <TableCell className="tnum text-right">
                        {NOTAS_COCHO[l.nota].ajuste > 0 ? '+' : ''}
                        {Math.round(NOTAS_COCHO[l.nota].ajuste * 100)}%
                      </TableCell>
                      <TableCell className="tnum text-right font-semibold">{fmtNum(l.kgCalculado)} kg</TableCell>
                      <TableCell className="tnum text-right">{fmtNum1(l.kgCalculado / l.cabecas)}</TableCell>
                      <TableCell className="text-muted-foreground">{nomeMembro(state, l.responsavelId)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination {...cochoPag} />
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                Cada leitura gera a saída de ração do estoque automaticamente — o tratador lança a nota e
                o sistema calcula, baixa e registra.
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <FornecerSalDialog open={salOpen} loteInicial={salLote} onClose={() => setSalOpen(false)} />
      {cfgCocho && (
        <LeituraCochoDialog
          open={leituraOpen}
          onClose={() => setLeituraOpen(false)}
          loteId={cfgCocho.loteId}
          itemId={cfgCocho.itemId}
          ultima={ultima}
          cabecasAtuais={cabConf}
        />
      )}
    </div>
  )
}

function FornecerSalDialog({ open, loteInicial, onClose }: { open: boolean; loteInicial: string; onClose: () => void }) {
  const state = useStore()
  const addFornecimentoSal = useStore((s) => s.addFornecimentoSal)
  const lotesSal = state.lotes.filter((l) => META_SAL_G_CAB_DIA[l.finalidade] > 0)
  const itensSal = state.estoque.filter((i) => i.categoria === 'sal_mineral')
  const [loteId, setLoteId] = useState('')
  const [itemId, setItemId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [kg, setKg] = useState('')
  const [cochoVazio, setCochoVazio] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)

  /** cocho em uso do lote e se ele já passou de ~80% da duração prevista */
  const cochoEmUso = (id: string) => {
    const f = state.fornecimentosSal.find((x) => x.loteId === id && !x.fimReal)
    if (!f) return { f: undefined, provavelVazio: true }
    const dias = Math.max(0, (new Date(hojeISO()).getTime() - new Date(f.data).getTime()) / 86400000)
    return { f, provavelVazio: dias >= duracaoPrevistaSal(f) * 0.8 }
  }
  const sugerirKg = (id: string) => {
    const l = state.lotes.find((x) => x.id === id)
    const c = ativos(state.animais).filter((a) => a.loteId === id).length
    if (l) setKg(String(Math.max(25, Math.round((c * META_SAL_G_CAB_DIA[l.finalidade] * 7) / 1000 / 25) * 25)))
    setCochoVazio(cochoEmUso(id).provavelVazio)
  }

  // ao abrir: pré-seleciona o lote pedido (Reabastecer) e sugere a quantidade de ~7 dias
  if (open && !aberto) {
    const lote = loteInicial || lotesSal[0]?.id || ''
    setAberto(true)
    setLoteId(lote)
    setItemId(itensSal[0]?.id ?? '')
    setData(hojeISO())
    setErro('')
    sugerirKg(lote)
  }
  if (!open && aberto) setAberto(false)

  const lote = state.lotes.find((l) => l.id === loteId)
  const cab = ativos(state.animais).filter((a) => a.loteId === loteId).length
  const meta = lote ? META_SAL_G_CAB_DIA[lote.finalidade] : 0
  const kgN = Number(kg) || 0
  const diasPrevistos = cab > 0 && meta > 0 ? (kgN * 1000) / (cab * meta) : 0
  const item = state.estoque.find((i) => i.id === itemId)
  const emUso = cochoEmUso(loteId).f

  const salvar = () => {
    const r = addFornecimentoSal({ data, loteId, itemEstoqueId: itemId, kg: kgN, cochoVazio })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`${fmtNum(kgN)} kg de sal no cocho de ${lote?.nome} — estoque baixado.`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Fornecer sal no cocho">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Lote">
          <Select
            value={loteId}
            onChange={(e) => {
              setLoteId(e.target.value)
              sugerirKg(e.target.value)
            }}
          >
            {lotesSal.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormRow>
        <FormRow label="Sal">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {itensSal.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} — saldo {fmtNum(i.saldo)} kg</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Quantidade (kg)">
          <Input type="number" min="1" value={kg} onChange={(e) => setKg(e.target.value)} />
        </FormRow>
      </div>
      <p className="tnum mt-2 text-xs text-muted-foreground">
        {fmtNum(cab)} cabeças × meta de {meta} g/cab/dia → dura ~{fmtNum1(diasPrevistos)} dias
        {item ? ` · saldo após: ${fmtNum(item.saldo - kgN)} kg` : ''}
      </p>
      {emUso && emUso.data < data && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-[12px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={cochoVazio}
            onChange={(e) => setCochoVazio(e.target.checked)}
          />
          <span>
            <span className="font-medium">O cocho anterior já estava vazio</span>
            <span className="block text-muted-foreground">
              {cochoVazio
                ? `Fecha o cocho de ${fmtDateShort(emUso.data)} e mede o consumo real.`
                : `Complementa o cocho de ${fmtDateShort(emUso.data)} (ainda tinha sal) — o consumo é medido quando ele esvaziar.`}
            </span>
          </span>
        </label>
      )}
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{erro}</p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        O sal sai do estoque na hora. Quando o cocho esvazia, o sistema mede o consumo real do lote
        contra a meta — e avisa se estiver fora.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar</Button>
      </div>
    </Dialog>
  )
}

function LeituraCochoDialog({
  open,
  onClose,
  loteId,
  itemId,
  ultima,
  cabecasAtuais,
}: {
  open: boolean
  onClose: () => void
  loteId: string
  itemId: string
  ultima?: LeituraCocho
  cabecasAtuais: number
}) {
  const addLeituraCocho = useStore((s) => s.addLeituraCocho)
  const [nota, setNota] = useState<LeituraCocho['nota'] | null>(null)
  const [cab, setCab] = useState('')
  const [kgOntem, setKgOntem] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)

  if (open && !aberto) {
    setAberto(true)
    setNota(null)
    setCab(String(cabecasAtuais))
    setKgOntem(ultima ? String(ultima.kgCalculado) : '')
    setErro('')
  }
  if (!open && aberto) setAberto(false)

  const kgO = Number(kgOntem) || 0
  const cabN = Number(cab) || 0
  const calculado = nota !== null ? Math.round(kgO * (1 + NOTAS_COCHO[nota].ajuste)) : null

  const salvar = () => {
    if (nota === null) {
      setErro('Escolha a nota do cocho.')
      return
    }
    const r = addLeituraCocho({ data: hojeISO(), loteId, nota, cabecas: cabN, kgOntem: kgO, itemEstoqueId: itemId })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`Leitura registrada — trato de hoje: ${fmtNum(r.kgCalculado ?? 0)} kg (ração baixada do estoque).`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Leitura de cocho — confinamento">
      <div className="text-xs font-medium text-muted-foreground">Como está o cocho (sobra do trato de ontem)?</div>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-5">
        {NOTAS_COCHO.map((n) => (
          <button
            key={n.nota}
            onClick={() => setNota(n.nota)}
            className={cn(
              'rounded-md border px-2 py-2 text-left transition-colors sm:text-center',
              nota === n.nota ? 'border-primary bg-accent' : 'hover:bg-secondary',
            )}
          >
            <div className="text-lg font-bold leading-none">{n.nota}</div>
            <div className="mt-1 text-[11px] font-medium">{n.rotulo}</div>
            <div className="text-[10px] text-muted-foreground">
              {n.ajuste > 0 ? '+' : ''}
              {Math.round(n.ajuste * 100)}%
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Cabeças no confinamento">
          <Input type="number" min="1" value={cab} onChange={(e) => setCab(e.target.value)} />
        </FormRow>
        <FormRow label="Trato de ontem (kg)">
          <Input type="number" min="1" value={kgOntem} onChange={(e) => setKgOntem(e.target.value)} />
        </FormRow>
      </div>
      <div
        className={cn(
          'tnum mt-3 rounded-md border px-3 py-2 text-[13px]',
          calculado !== null ? 'border-green-200 bg-green-50 text-green-900' : 'bg-secondary/50 text-muted-foreground',
        )}
      >
        {calculado !== null && nota !== null ? (
          <>
            Trato de hoje: {fmtNum(kgO)} kg × ({NOTAS_COCHO[nota].ajuste >= 0 ? '+' : ''}
            {Math.round(NOTAS_COCHO[nota].ajuste * 100)}%) ={' '}
            <strong>{fmtNum(calculado)} kg</strong>
            {cabN > 0 ? ` → ${fmtNum1(calculado / cabN)} kg por cabeça` : ''}
          </>
        ) : (
          'Escolha a nota para calcular o trato de hoje.'
        )}
      </div>
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{erro}</p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar leitura</Button>
      </div>
    </Dialog>
  )
}
