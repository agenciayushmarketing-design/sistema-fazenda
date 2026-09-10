import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  listaVazias, matrizesIPEstourado, metricasReproducao, partosPrevistos, partosPrevistosPorMes,
  DIAS_POR_MES,
} from '@/lib/metrics'
import { addDays } from '@/data/seed'
import { fmtBRL, fmtDate, fmtMesAno, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { Animal, TouroRepasse } from '@/data/types'

export default function Reproducao() {
  const state = useStore()
  const updateDiagnostico = useStore((s) => s.updateDiagnostico)
  const updateConfig = useStore((s) => s.updateConfig)
  const removeTouroRepasse = useStore((s) => s.removeTouroRepasse)
  const m = metricasReproducao(state)
  const [dgOpen, setDgOpen] = useState(false)
  const [protoOpen, setProtoOpen] = useState(false)
  const [touroEdit, setTouroEdit] = useState<TouroRepasse | null>(null)
  const [touroExcluir, setTouroExcluir] = useState<TouroRepasse | null>(null)
  const [venderMatriz, setVenderMatriz] = useState<Animal | null>(null)
  const [searchParams] = useSearchParams()
  const tabInicial = ['protocolos', 'dg', 'pendentes', 'partos', 'reprodutores', 'descarte'].includes(
    searchParams.get('tab') ?? '',
  )
    ? searchParams.get('tab')!
    : 'protocolos'

  const dgsPendentes = state.diagnosticos.filter((d) => d.resultado === 'pendente')
  const dgsFeitos = state.diagnosticos.filter((d) => d.resultado !== 'pendente')
  const dgsPag = usePagination(dgsFeitos, 50)
  const previstos = partosPrevistos(state)
  const previstosMes = partosPrevistosPorMes(state)
  const previstosPag = usePagination(previstos, 50)

  const hoje = hojeISO()
  const vazias = listaVazias(state)
  const ipEstourado = matrizesIPEstourado(state)
  const totalDescarte = vazias.filter((v) => v.descarte).length + ipEstourado.length
  const vaziasPag = usePagination(vazias, 50)

  const prenhasPorProtocolo = (protocoloId: string) =>
    state.diagnosticos.filter((d) => d.resultado === 'prenha' && d.protocoloId === protocoloId).length

  return (
    <div>
      <PageHeader
        title="Reprodução"
        subtitle={m.estacao ? `${m.estacao.nome} · ${fmtDate(m.estacao.inicio)} — ${fmtDate(m.estacao.fim)}` : 'Estação de monta'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setProtoOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo protocolo IATF
            </Button>
            <Button onClick={() => setDgOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Lançar diagnóstico
            </Button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Prenhez IATF" value={fmtPct(m.prenhezIATFPct)} detail={`${m.prenhasIATF}/${m.dosesIATF} doses`} />
        <StatCard label="Prenhez acumulada" value={fmtPct(m.prenhezFinalPct)} detail={`${m.prenhasTotal}/${m.expostas} expostas`} />
        <StatCard label="Prenhez de repasse" value={fmtNum(m.prenhasTouro)} detail="confirmadas por touro" />
        <StatCard label="DG pendente" value={fmtNum(m.pendentes)} detail="matrizes sem diagnóstico" tone={m.pendentes > 0 ? 'warning' : undefined} />
        <StatCard label="ECC médio das matrizes" value={fmtNum1(m.eccMedio)} detail="média das matrizes ativas (1–5)" />
        <StatCard label="Custo por prenhez" value={fmtBRL(m.custoPorPrenhez)} detail="sêmen + hormônios" />
      </div>

      <div className="mb-3 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Distribuição de prenhez por terço da estação" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={m.prenhezPorTerco} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="terco" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="prenhezes" name="Prenhezes" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#52514e' }}>
                {m.prenhezPorTerco.map((_, i) => (
                  <Cell key={i} fill={SERIES[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Concentração no 1º terço = mais bezerros no início da próxima safra e lotes de desmame mais uniformes.
          </p>
        </ChartCard>

        <Card>
          <CardHeader><CardTitle>Touros de repasse — índice de prenhez</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Touro</TableHead>
                  <TableHead className="text-right">Vacas</TableHead>
                  <TableHead className="text-right">Prenhezes</TableHead>
                  <TableHead className="text-right pr-4">Índice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.tourosRepasse.map((t) => (
                  <TableRow key={t.brinco}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{t.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{t.brinco}</div>
                    </TableCell>
                    <TableCell className="tnum text-right">{t.vacasRepasse}</TableCell>
                    <TableCell className="tnum text-right">{t.prenhezesRepasse}</TableCell>
                    <TableCell className="tnum text-right pr-4 font-semibold">
                      {fmtPct((t.prenhezesRepasse / t.vacasRepasse) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="protocolos">Protocolos IATF ({state.protocolosIATF.length})</TabsTrigger>
          <TabsTrigger value="dg">Diagnósticos ({fmtNum(dgsFeitos.length)})</TabsTrigger>
          <TabsTrigger value="pendentes">DG pendente ({fmtNum(dgsPendentes.length)})</TabsTrigger>
          <TabsTrigger value="partos">Partos previstos ({fmtNum(previstos.length)})</TabsTrigger>
          <TabsTrigger value="reprodutores">Reprodutores ({fmtNum(state.tourosRepasse.length)})</TabsTrigger>
          <TabsTrigger value="descarte">Descarte ({fmtNum(totalDescarte)})</TabsTrigger>
        </TabsList>

        <TabsContent value="protocolos">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Lote de matrizes</TableHead>
                  <TableHead>D0 · implante P4</TableHead>
                  <TableHead>D8 · retirada + eCG/PGF</TableHead>
                  <TableHead>D10 · inseminação</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Inseminador</TableHead>
                  <TableHead>Touro / sêmen</TableHead>
                  <TableHead className="text-right">Matrizes</TableHead>
                  <TableHead className="text-right">Prenhez</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.protocolosIATF.map((p) => {
                  const prenhas = prenhasPorProtocolo(p.id)
                  const status =
                    prenhas > 0 ? 'concluido' : p.dataIA <= hoje ? 'aguardando_dg' : 'em_andamento'
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.loteDescricao}</TableCell>
                      <TableCell className="tnum">{fmtDate(p.dataInicio)}</TableCell>
                      <TableCell className="tnum">{fmtDate(addDays(p.dataInicio, 8))}</TableCell>
                      <TableCell className="tnum font-medium">{fmtDate(p.dataIA)}</TableCell>
                      <TableCell>{p.produto}</TableCell>
                      <TableCell>{p.inseminador}</TableCell>
                      <TableCell>{p.touroSemen}</TableCell>
                      <TableCell className="tnum text-right">{p.matrizes}</TableCell>
                      <TableCell className="tnum text-right font-semibold">
                        {prenhas > 0 ? `${fmtPct((prenhas / p.doses) * 100)}` : '—'}
                        {prenhas > 0 && (
                          <span className="ml-1 font-normal text-muted-foreground">({prenhas}/{p.doses})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === 'concluido' ? 'good' : status === 'aguardando_dg' ? 'warning' : 'info'}>
                          {status === 'concluido' ? 'Concluído' : status === 'aguardando_dg' ? 'Aguardando DG' : 'Em andamento'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Cronograma padrão: D0 implante de progesterona · D8 retirada + hormônios · D10 inseminação.
              As doses geram saída automática no Estoque de sêmen; a prenhez da coluna vem dos DGs
              vinculados a cada protocolo.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dg">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>DPP estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dgsPag.pageItems.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="tnum">{fmtDate(d.data)}</TableCell>
                    <TableCell className="font-medium">{d.matrizBrinco}</TableCell>
                    <TableCell>
                      <Badge variant={d.resultado === 'prenha' ? 'good' : 'critical'}>
                        {d.resultado === 'prenha' ? 'Prenha' : 'Vazia'}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.origemPrenhez === 'IATF' ? 'IATF' : d.origemPrenhez === 'touro' ? 'Repasse (touro)' : '—'}</TableCell>
                    <TableCell className="tnum">{fmtDate(d.dppEstimado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...dgsPag} />
          </div>
        </TabsContent>

        <TabsContent value="pendentes">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação rápida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dgsPendentes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.matrizBrinco}</TableCell>
                    <TableCell><Badge variant="warning">DG pendente</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            updateDiagnostico(d.id, {
                              resultado: 'prenha',
                              data: hojeISO(),
                              origemPrenhez: 'touro',
                              dataConcepcao: addDays(hojeISO(), -45),
                              dppEstimado: addDays(hojeISO(), 283 - 45),
                            })
                            toast(`DG de ${d.matrizBrinco}: prenha (repasse).`)
                          }}
                        >
                          Prenha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateDiagnostico(d.id, { resultado: 'vazia', data: hojeISO() })
                            toast(`DG de ${d.matrizBrinco}: vazia.`)
                          }}
                        >
                          Vazia
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {dgsPendentes.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-muted-foreground">Nenhum diagnóstico pendente.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="partos">
          <div className="mb-3 rounded-lg border bg-card px-4 pt-3 pb-1">
            <div className="text-[13px] font-semibold">Nascimentos previstos por mês (pelo DPP das prenhas)</div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={previstosMes} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="mes" tickFormatter={fmtMesAno} {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtMesAno(String(v))} formatter={(v) => [String(v), 'Partos previstos']} />
                <Bar dataKey="qtd" name="Partos previstos" fill={SERIES[0]} radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#52514e' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Origem da prenhez</TableHead>
                  <TableHead>Concepção</TableHead>
                  <TableHead>DPP (parto previsto)</TableHead>
                  <TableHead className="text-right">Dias restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previstosPag.pageItems.map((p) => (
                  <TableRow key={p.matrizBrinco}>
                    <TableCell className="font-medium">{p.matrizBrinco}</TableCell>
                    <TableCell>{p.origem === 'IATF' ? 'IATF' : 'Repasse (touro)'}</TableCell>
                    <TableCell className="tnum">{fmtDate(p.dataConcepcao)}</TableCell>
                    <TableCell>
                      <span className="tnum">{fmtDate(p.dpp)}</span>{' '}
                      {p.diasRestantes <= 30 && <Badge variant="warning">próximo</Badge>}
                    </TableCell>
                    <TableCell className="tnum text-right">{p.diasRestantes}</TableCell>
                  </TableRow>
                ))}
                {previstos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Nenhuma prenhez confirmada com DPP futuro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...previstosPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              DPP = data provável de parto (concepção + 283 dias). Partos a 30 dias ou menos viram
              alerta no Dashboard — hora de montar o piquete maternidade.
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reprodutores">
          <div className="mb-2 flex justify-end">
            <Button onClick={() => setTouroEdit({ brinco: '', nome: '', vacasRepasse: 0, prenhezesRepasse: 0 })}>
              <Plus className="h-3.5 w-3.5" /> Novo reprodutor
            </Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brinco</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Vacas em repasse</TableHead>
                  <TableHead className="text-right">Prenhezes</TableHead>
                  <TableHead className="text-right">Índice</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.tourosRepasse.map((t) => {
                  const animal = state.animais.find((a) => a.brinco === t.brinco && a.status === 'ativo')
                  return (
                    <TableRow key={t.brinco}>
                      <TableCell className="font-medium">
                        {animal ? (
                          <Link to={`/rebanho/${animal.id}`} className="text-primary hover:underline">{t.brinco}</Link>
                        ) : (
                          t.brinco
                        )}
                      </TableCell>
                      <TableCell>{t.nome}</TableCell>
                      <TableCell className="tnum text-right">{t.vacasRepasse}</TableCell>
                      <TableCell className="tnum text-right">{t.prenhezesRepasse}</TableCell>
                      <TableCell className="tnum text-right font-semibold">
                        {t.vacasRepasse > 0 ? fmtPct((t.prenhezesRepasse / t.vacasRepasse) * 100) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="rounded p-1 text-muted-foreground hover:bg-secondary"
                            aria-label={`Editar ${t.nome}`}
                            onClick={() => setTouroEdit(t)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                            aria-label={`Excluir ${t.nome}`}
                            onClick={() => setTouroExcluir(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Fluxo da estação: IATF → DG30 → vazias vão para o repasse com estes touros → DG final →
              vazia definitiva entra na lista de descarte.
            </div>
          </div>

          <div className="mt-3 rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sêmen em uso (IATF)</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Doses usadas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.estoque.filter((i) => i.categoria === 'semen').map((i) => {
                  const usadas = state.protocolosIATF
                    .filter((p) => p.semenItemId === i.id)
                    .reduce((s, p) => s + p.doses, 0)
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.botijao ? `Botijão ${i.botijao} · caneca ${i.caneca}` : '—'}
                      </TableCell>
                      <TableCell className="tnum text-right">{fmtNum(usadas)}</TableCell>
                      <TableCell className="tnum text-right font-semibold">{fmtNum(i.saldo)} doses</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="descarte">
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Vazia há mais de quantos dias vira aviso de venda?
            </span>
            <Input
              type="number"
              min="1"
              max="365"
              value={state.config.diasVaziaDescarte}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (v >= 1 && v <= 365) updateConfig({ diasVaziaDescarte: v })
              }}
              className="w-20"
              aria-label="Dias vazia até descarte"
            />
            <span className="text-xs text-muted-foreground">
              · IP acima de {state.config.toleranciaIPMeses} meses também entra (tolerância configurável em Cria → IP)
            </span>
          </div>

          {ipEstourado.length > 0 && (
            <div className="mb-3 rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matriz (IP estourado)</TableHead>
                    <TableHead className="text-right">IP (meses)</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipEstourado.map((ip) => (
                    <TableRow key={ip.matrizBrinco} className="bg-red-50/60 hover:bg-red-50">
                      <TableCell className="font-medium text-red-700">{ip.matrizBrinco}</TableCell>
                      <TableCell className="tnum text-right font-semibold text-red-700">{fmtNum1(ip.ipMeses)}</TableCell>
                      <TableCell><Badge variant="critical">Descarte — IP</Badge></TableCell>
                      <TableCell className="text-right">
                        {ip.animal && (
                          <Button size="sm" variant="secondary" onClick={() => setVenderMatriz(ip.animal!)}>
                            <Banknote className="h-3 w-3" /> Vender
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz vazia</TableHead>
                  <TableHead>DG</TableHead>
                  <TableHead className="text-right">Dias vazia</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaziasPag.pageItems.map((v) => (
                  <TableRow key={v.matrizBrinco} className={v.descarte ? 'bg-red-50/60 hover:bg-red-50' : ''}>
                    <TableCell className={`font-medium ${v.descarte ? 'text-red-700' : ''}`}>{v.matrizBrinco}</TableCell>
                    <TableCell className="tnum">{fmtDate(v.dataDG)}</TableCell>
                    <TableCell className={`tnum text-right font-semibold ${v.descarte ? 'text-red-700' : ''}`}>
                      {v.diasVazia}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.descarte ? 'critical' : 'warning'}>
                        {v.descarte ? 'Descarte — vender' : 'Aguardando'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {v.animal && (
                        <Button size="sm" variant="secondary" onClick={() => setVenderMatriz(v.animal!)}>
                          <Banknote className="h-3 w-3" /> Vender
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {vazias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">Nenhuma matriz vazia na estação atual.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...vaziasPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Vazia há {state.config.diasVaziaDescarte}+ dias fica vermelha e vira alerta no Dashboard.
              O botão Vender registra a saída e a receita direto daqui.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NovoDGDialog open={dgOpen} onClose={() => setDgOpen(false)} />
      <NovoProtocoloDialog open={protoOpen} onClose={() => setProtoOpen(false)} />
      <TouroDialog touro={touroEdit} onClose={() => setTouroEdit(null)} jaExiste={state.tourosRepasse.some((t) => t.brinco === touroEdit?.brinco)} />
      <VenderMatrizDialog animal={venderMatriz} onClose={() => setVenderMatriz(null)} />

      <ConfirmDialog
        open={touroExcluir !== null}
        onClose={() => setTouroExcluir(null)}
        onConfirm={() => {
          if (!touroExcluir) return
          removeTouroRepasse(touroExcluir.brinco)
          toast(`Reprodutor ${touroExcluir.nome} removido do cadastro.`)
        }}
        title="Excluir reprodutor"
        confirmLabel="Excluir"
        tone="destructive"
      >
        Remover <strong>{touroExcluir?.nome}</strong> ({touroExcluir?.brinco}) do cadastro de
        reprodutores? O animal continua no rebanho.
      </ConfirmDialog>
    </div>
  )
}

function NovoProtocoloDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, addProtocolo } = useStore()
  const semens = estoque.filter((i) => i.categoria === 'semen')
  const [nome, setNome] = useState('IATF Lote 4')
  const [loteDescricao, setLoteDescricao] = useState('Vacas paridas')
  const [d0, setD0] = useState(hojeISO())
  const [produto, setProduto] = useState('Sincrogest + eCG')
  const [inseminador, setInseminador] = useState('Carlos Mendes')
  const [semenId, setSemenId] = useState(semens[0]?.id ?? '')
  const [matrizes, setMatrizes] = useState('')
  const [erro, setErro] = useState('')

  const salvar = () => {
    const n = Number(matrizes)
    if (!nome || !semenId || !n || n <= 0) return
    const semen = estoque.find((i) => i.id === semenId)
    const r = addProtocolo({
      nome,
      loteDescricao,
      dataInicio: d0,
      dataIA: addDays(d0, 10),
      produto,
      inseminador,
      touroSemen: semen?.nome.replace('Sêmen ', '') ?? semenId,
      semenItemId: semenId,
      doses: n,
      matrizes: n,
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível criar o protocolo.')
      return
    }
    toast(`Protocolo ${nome} criado — ${n} doses baixadas do estoque de sêmen.`)
    setMatrizes(''); setErro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo protocolo IATF">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Nome do protocolo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormRow>
        <FormRow label="Lote de matrizes">
          <Input value={loteDescricao} onChange={(e) => setLoteDescricao(e.target.value)} />
        </FormRow>
        <FormRow label="Data D0">
          <Input type="date" value={d0} onChange={(e) => setD0(e.target.value)} />
        </FormRow>
        <FormRow label="Produto (protocolo hormonal)">
          <Input value={produto} onChange={(e) => setProduto(e.target.value)} />
        </FormRow>
        <FormRow label="Inseminador">
          <Input value={inseminador} onChange={(e) => setInseminador(e.target.value)} />
        </FormRow>
        <FormRow label="Touro / sêmen">
          <Select value={semenId} onChange={(e) => setSemenId(e.target.value)}>
            {semens.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} — saldo {i.saldo} doses</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Matrizes (= doses)">
          <Input type="number" value={matrizes} onChange={(e) => setMatrizes(e.target.value)} placeholder="120" />
        </FormRow>
      </div>
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        A IA é agendada para D0 + 10 e as doses geram saída automática no Estoque de sêmen.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Criar protocolo</Button>
      </div>
    </Dialog>
  )
}

function TouroDialog({
  touro,
  onClose,
  jaExiste,
}: {
  touro: TouroRepasse | null
  onClose: () => void
  jaExiste: boolean
}) {
  const addTouroRepasse = useStore((s) => s.addTouroRepasse)
  const updateTouroRepasse = useStore((s) => s.updateTouroRepasse)
  const [brinco, setBrinco] = useState('')
  const [nome, setNome] = useState('')
  const [vacas, setVacas] = useState('')
  const [prenhezes, setPrenhezes] = useState('')
  const [erro, setErro] = useState('')

  // recarrega o formulário a cada abertura (novo objeto por clique)
  useEffect(() => {
    if (!touro) return
    setBrinco(touro.brinco)
    setNome(touro.nome)
    setVacas(String(touro.vacasRepasse || ''))
    setPrenhezes(String(touro.prenhezesRepasse || ''))
    setErro('')
  }, [touro])

  const salvar = () => {
    const dados = {
      brinco: brinco.trim(),
      nome: nome.trim(),
      vacasRepasse: Number(vacas) || 0,
      prenhezesRepasse: Number(prenhezes) || 0,
    }
    if (dados.prenhezesRepasse > dados.vacasRepasse) {
      setErro('Prenhezes não pode ser maior que o número de vacas em repasse.')
      return
    }
    if (jaExiste) {
      updateTouroRepasse(touro!.brinco, dados)
      toast(`Reprodutor ${dados.nome} atualizado.`)
    } else {
      const r = addTouroRepasse(dados)
      if (!r.ok) {
        setErro(r.erro ?? 'Não foi possível salvar.')
        return
      }
      toast(`Reprodutor ${dados.nome} cadastrado.`)
    }
    onClose()
  }

  return (
    <Dialog open={touro !== null} onClose={onClose} title={jaExiste ? `Editar reprodutor — ${touro?.nome}` : 'Novo reprodutor'}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Brinco">
          <Input value={brinco} onChange={(e) => setBrinco(e.target.value)} placeholder="T-06" disabled={jaExiste} />
        </FormRow>
        <FormRow label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Trovão SH" />
        </FormRow>
        <FormRow label="Vacas em repasse">
          <Input type="number" min="0" value={vacas} onChange={(e) => setVacas(e.target.value)} />
        </FormRow>
        <FormRow label="Prenhezes confirmadas">
          <Input type="number" min="0" value={prenhezes} onChange={(e) => setPrenhezes(e.target.value)} />
        </FormRow>
      </div>
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}

function VenderMatrizDialog({ animal, onClose }: { animal: Animal | null; onClose: () => void }) {
  const removeAnimal = useStore((s) => s.removeAnimal)
  const addLancamento = useStore((s) => s.addLancamento)
  const [valor, setValor] = useState('')
  const [condicao, setCondicao] = useState<'vista' | 'prazo'>('vista')
  const [vencimento, setVencimento] = useState(addDays(hojeISO(), 30))

  const vender = () => {
    if (!animal) return
    removeAnimal(animal.id, 'venda')
    const v = Number(valor)
    const aPrazo = condicao === 'prazo'
    if (v > 0) {
      addLancamento({
        tipo: 'receita',
        categoria: 'Venda de animais',
        descricao: `Descarte: venda da matriz ${animal.brinco}`,
        valor: v,
        vencimento: aPrazo ? vencimento : hojeISO(),
        pagamento: aPrazo ? undefined : hojeISO(),
        origem: 'venda_animal',
        refId: animal.id,
      })
    }
    toast(
      v > 0
        ? aPrazo
          ? `Matriz ${animal.brinco} vendida — ${fmtBRL(v)} a receber em ${fmtDate(vencimento)}.`
          : `Matriz ${animal.brinco} vendida — receita de ${fmtBRL(v)} no Financeiro.`
        : `Venda da matriz ${animal.brinco} registrada.`,
    )
    setValor('')
    onClose()
  }

  return (
    <Dialog open={animal !== null} onClose={onClose} title={`Vender matriz — ${animal?.brinco ?? ''}`} className="max-w-md">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Valor da venda (R$, opcional)">
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="2800" />
        </FormRow>
        <FormRow label="Condição de pagamento">
          <Select value={condicao} onChange={(e) => setCondicao(e.target.value as 'vista' | 'prazo')}>
            <option value="vista">À vista (recebido hoje)</option>
            <option value="prazo">A prazo (a receber)</option>
          </Select>
        </FormRow>
        {condicao === 'prazo' && (
          <FormRow label="Vencimento">
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </FormRow>
        )}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        A matriz sai do inventário, a venda entra no livro de movimentação e — com valor informado —
        a receita cai no Financeiro.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="destructive" onClick={vender}>Registrar venda</Button>
      </div>
    </Dialog>
  )
}

function NovoDGDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estacoes, addDiagnostico } = useStore()
  const [matriz, setMatriz] = useState('')
  const [resultado, setResultado] = useState<'prenha' | 'vazia'>('prenha')
  const [origem, setOrigem] = useState<'IATF' | 'touro'>('touro')
  const [concepcao, setConcepcao] = useState(addDays(hojeISO(), -45))

  const salvar = () => {
    if (!matriz) return
    addDiagnostico({
      data: hojeISO(),
      matrizBrinco: matriz,
      resultado,
      origemPrenhez: resultado === 'prenha' ? origem : undefined,
      dataConcepcao: resultado === 'prenha' ? concepcao : undefined,
      dppEstimado: resultado === 'prenha' ? addDays(concepcao, 283) : undefined,
      estacaoId: estacoes.find((e) => e.status === 'em_andamento')?.id ?? 'EM-ATUAL',
    })
    toast(`Diagnóstico de ${matriz} registrado: ${resultado === 'prenha' ? 'prenha' : 'vazia'}.`)
    setMatriz('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Lançar diagnóstico de gestação">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Matriz (brinco)"><Input value={matriz} onChange={(e) => setMatriz(e.target.value)} placeholder="V-0042" /></FormRow>
        <FormRow label="Resultado">
          <Select value={resultado} onChange={(e) => setResultado(e.target.value as 'prenha' | 'vazia')}>
            <option value="prenha">Prenha</option>
            <option value="vazia">Vazia</option>
          </Select>
        </FormRow>
        {resultado === 'prenha' && (
          <>
            <FormRow label="Origem">
              <Select value={origem} onChange={(e) => setOrigem(e.target.value as 'IATF' | 'touro')}>
                <option value="IATF">IATF</option>
                <option value="touro">Repasse (touro)</option>
              </Select>
            </FormRow>
            <FormRow label="Data estimada de concepção">
              <Input type="date" value={concepcao} onChange={(e) => setConcepcao(e.target.value)} />
            </FormRow>
          </>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
