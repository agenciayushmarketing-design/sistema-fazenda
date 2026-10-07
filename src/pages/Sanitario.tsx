import { useState, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Plus, Syringe, CheckCircle2, X, Camera, CalendarPlus } from 'lucide-react'
import { reduzirFoto } from '@/lib/imagem'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePagination } from '@/hooks/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { ativos, ocorrenciasAbertas } from '@/lib/metrics'
import { animaisEmCarencia, coberturaVacinal, statusTarefa } from '@/lib/gestao'
import { addDays } from '@/data/seed'
import { fmtDate, fmtNum, fmtPct, hojeISO } from '@/lib/format'
import type { ManejoSanitario, TarefaSanitaria, TipoOcorrencia } from '@/data/types'

const STATUS_TAREFA = {
  atrasada: { rotulo: 'Atrasada', variante: 'critical' as const },
  hoje: { rotulo: 'Hoje', variante: 'warning' as const },
  proxima: { rotulo: 'Próxima', variante: 'info' as const },
  futura: { rotulo: 'Agendada', variante: 'default' as const },
  concluida: { rotulo: 'Feita', variante: 'good' as const },
}

const TIPO_MANEJO_LABEL: Record<ManejoSanitario['tipo'], string> = {
  vacinacao: 'Vacinação',
  vermifugacao: 'Vermifugação',
  medicacao: 'Medicação',
}

const TIPO_OCORRENCIA_LABEL: Record<TipoOcorrencia, string> = {
  observacao: 'Observação',
  tratamento: 'Tratamento',
  doente: 'Animal doente',
  morte: 'Morte',
}

export default function Sanitario() {
  const state = useStore()
  const resolverOcorrencia = useStore((s) => s.resolverOcorrencia)
  const concluirTarefa = useStore((s) => s.concluirTarefaSanitaria)
  const [manejoOpen, setManejoOpen] = useState(false)
  const [tarefaParaManejo, setTarefaParaManejo] = useState<TarefaSanitaria | null>(null)
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false)
  const [rondaOpen, setRondaOpen] = useState(false)
  const [rondaExpandida, setRondaExpandida] = useState('')
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? ''
  const tabInicial = ['rondas', 'manejos', 'calendario', 'cobertura'].includes(tabParam) ? tabParam : 'calendario'
  const tarefas = [...state.tarefasSanitarias].sort((a, b) => a.data.localeCompare(b.data))
  const porStatus = (st: ReturnType<typeof statusTarefa>) => tarefas.filter((t) => statusTarefa(t, hojeISO()) === st)
  const cobertura = coberturaVacinal(state)
  const carencia = animaisEmCarencia(state)
  const loteNomeDe = (id?: string) => state.lotes.find((l) => l.id === id)?.nome

  const hoje = hojeISO()
  const mesAtual = hoje.slice(0, 7)
  const abertas = ocorrenciasAbertas(state)
  const doentes = abertas.filter((a) => a.ocorrencia.tipo === 'doente').length
  const rondasMes = state.rondas.filter((r) => r.data.slice(0, 7) === mesAtual).length
  const animaisTratadosMes = state.manejosSanitarios
    .filter((m) => m.data.slice(0, 7) === mesAtual)
    .reduce((s, m) => s + m.qtdAnimais, 0)

  const manejosOrdenados = [...state.manejosSanitarios].sort((a, b) => b.data.localeCompare(a.data))
  const manejosPag = usePagination(manejosOrdenados, 50)
  const rondasOrdenadas = [...state.rondas].sort((a, b) => b.data.localeCompare(a.data))
  const rondasPag = usePagination(rondasOrdenadas, 50)

  const pastoNome = (id: string) => state.pastos.find((p) => p.id === id)?.nome ?? id

  return (
    <div>
      <PageHeader
        title="Sanitário"
        subtitle="Vacinação em lote, manejos e rondas sanitárias — tudo rastreado na ficha de cada animal"
        actions={
          <>
            <Button variant="secondary" onClick={() => setRondaOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova ronda
            </Button>
            <Button onClick={() => setManejoOpen(true)}>
              <Syringe className="h-3.5 w-3.5" /> Registrar manejo em lote
            </Button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tarefas atrasadas" value={fmtNum(porStatus('atrasada').length)} detail={`${porStatus('hoje').length} para hoje · ${porStatus('proxima').length} em 30 dias`} tone={porStatus('atrasada').length > 0 ? 'critical' : 'good'}
          hint="Calendário sanitário: vacinas, vermifugações e reforços com data marcada." />
        <StatCard label="Cobertura aftosa" value={fmtPct(cobertura[0]?.pct ?? 0)} detail={`${fmtNum(cobertura[0]?.cobertos ?? 0)} de ${fmtNum(cobertura[0]?.elegiveis ?? 0)} nos últimos 6 meses`} tone={(cobertura[0]?.pct ?? 0) >= 95 ? 'good' : 'warning'} />
        <StatCard label="Em carência" value={fmtNum(carencia.length)} detail="não podem ir para abate" tone={carencia.length > 0 ? 'warning' : 'good'}
          hint="Animais tratados com medicamento cuja carência ainda não terminou." />
        <StatCard
          label="Animais tratados no mês"
          value={fmtNum(animaisTratadosMes)}
          detail="soma dos manejos em lote"
          hint="Total de animais alcançados por vacinação, vermifugação ou medicação em lote neste mês."
        />
        <StatCard label="Rondas no mês" value={fmtNum(rondasMes)} detail={`${state.rondas.length} no histórico`} />
        <StatCard
          label="Ocorrências em aberto"
          value={fmtNum(abertas.length)}
          detail={doentes > 0 ? `${doentes} animal(is) em observação` : 'nenhum animal doente'}
          tone={doentes > 0 ? 'critical' : abertas.length > 0 ? 'warning' : 'good'}
        />
      </div>

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="calendario">Calendário ({fmtNum(tarefas.filter((t) => !t.concluidaEm).length)})</TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura e carência</TabsTrigger>
          <TabsTrigger value="manejos">Manejos em lote ({fmtNum(state.manejosSanitarios.length)})</TabsTrigger>
          <TabsTrigger value="rondas">Rondas sanitárias ({fmtNum(state.rondas.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-muted-foreground">Atrasadas primeiro. "Fazer agora" abre o manejo em lote já preenchido e marca a tarefa como feita.</span>
            <Button size="sm" variant="secondary" onClick={() => setNovaTarefaOpen(true)}><CalendarPlus className="h-3.5 w-3.5" /> Agendar tarefa</Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...porStatus('atrasada'), ...porStatus('hoje'), ...porStatus('proxima'), ...porStatus('futura'), ...porStatus('concluida')].map((t) => {
                  const st = statusTarefa(t, hoje)
                  const item = state.estoque.find((i) => i.id === t.itemEstoqueId)
                  return (
                    <TableRow key={t.id} className={st === 'atrasada' ? 'bg-red-50/40' : ''}>
                      <TableCell className="tnum">{fmtDate(t.data)}{st === 'atrasada' ? <span className="ml-1 text-[10px] text-red-700">({Math.round((new Date(hoje).getTime() - new Date(t.data).getTime()) / 86400000)} d)</span> : ''}</TableCell>
                      <TableCell><Badge variant={STATUS_TAREFA[st].variante}>{STATUS_TAREFA[st].rotulo}</Badge></TableCell>
                      <TableCell className="font-medium">{t.titulo}</TableCell>
                      <TableCell>{TIPO_MANEJO_LABEL[t.tipo]}</TableCell>
                      <TableCell className="text-muted-foreground">{loteNomeDe(t.loteId) ?? t.alvo}</TableCell>
                      <TableCell className="text-muted-foreground">{item ? `${item.nome} (saldo ${fmtNum(item.saldo)})` : '—'}</TableCell>
                      <TableCell className="text-right">
                        {t.concluidaEm ? (
                          <span className="text-[11px] text-muted-foreground">feita em {fmtDate(t.concluidaEm)}</span>
                        ) : (
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => { setTarefaParaManejo(t); setManejoOpen(true) }}><Syringe className="h-3 w-3" /> Fazer agora</Button>
                            <Button size="sm" variant="ghost" onClick={() => { concluirTarefa(t.id); toast(`"${t.titulo}" marcada como feita.`) }}><CheckCircle2 className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Tarefas atrasadas viram alerta no Dashboard. O insumo da tarefa já aparece com o saldo para você conferir antes do dia.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cobertura">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b px-3 py-2 text-[13px] font-semibold">Cobertura vacinal (animais ativos dentro da validade)</div>
              <div className="space-y-3 px-3 py-3">
                {cobertura.map((v) => (
                  <div key={v.chave}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium">{v.nome}</span>
                      <span className="tnum text-muted-foreground">{fmtNum(v.cobertos)} / {fmtNum(v.elegiveis)} · <span className={v.pct >= 95 ? 'text-green-700' : v.pct >= 80 ? 'text-amber-700' : 'text-red-700'}>{fmtPct(v.pct)}</span></span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${v.pct >= 95 ? 'bg-green-600' : v.pct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, v.pct)}%` }} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">validade considerada: {v.meses >= 120 ? 'dose única' : `${v.meses} meses`}</div>
                  </div>
                ))}
              </div>
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Conta quem tem a vacina no histórico dentro do prazo. Vacina vencida = animal descoberto.</div>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="border-b px-3 py-2 text-[13px] font-semibold">Animais em carência ({carencia.length})</div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Brinco</TableHead><TableHead>Lote</TableHead><TableHead>Tratamento</TableHead><TableHead>Liberado em</TableHead><TableHead className="text-right">Faltam</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {carencia.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum animal em carência.</TableCell></TableRow>}
                  {carencia.map((c) => (
                    <TableRow key={c.animal.id + c.ate}>
                      <TableCell><Link to={`/rebanho/${c.animal.id}?tab=sanidade`} className="font-medium text-primary hover:underline">{c.animal.brinco}</Link></TableCell>
                      <TableCell className="text-muted-foreground">{loteNomeDe(c.animal.loteId) ?? c.animal.loteId}</TableCell>
                      <TableCell>{c.produto}</TableCell>
                      <TableCell className="tnum">{fmtDate(c.ate)}</TableCell>
                      <TableCell className="tnum text-right"><Badge variant={c.diasRestantes <= 3 ? 'good' : 'warning'}>{c.diasRestantes} d</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Tratamento registrado na ficha (botão "Tratar") ou na enfermaria do confinamento. Até a data, o animal não pode ser abatido.</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manejos">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead className="text-right">Animais</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manejosPag.pageItems.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tnum">{fmtDate(m.data)}</TableCell>
                    <TableCell>
                      <Badge variant={m.tipo === 'vacinacao' ? 'info' : m.tipo === 'vermifugacao' ? 'default' : 'warning'}>
                        {TIPO_MANEJO_LABEL[m.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.produto}</TableCell>
                    <TableCell className="text-muted-foreground">{m.alvo}</TableCell>
                    <TableCell className="tnum text-right">{fmtNum(m.qtdAnimais)}</TableCell>
                    <TableCell>{m.responsavel}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{m.obs ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...manejosPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Um manejo em lote baixa o estoque do insumo e registra o evento no histórico sanitário
              de cada animal do alvo.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rondas">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pasto</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ocorrências</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rondasPag.pageItems.map((r) => {
                  const pendentes = r.ocorrencias.filter((o) => !o.resolvida).length
                  const aberta = rondaExpandida === r.id
                  return (
                    <Fragment key={r.id}>
                      <TableRow className="cursor-pointer" onClick={() => setRondaExpandida(aberta ? '' : r.id)}>
                        <TableCell className="tnum">{fmtDate(r.data)}</TableCell>
                        <TableCell>{pastoNome(r.pastoId)}</TableCell>
                        <TableCell>{r.responsavel}</TableCell>
                        <TableCell className="tnum text-right">{r.ocorrencias.length}</TableCell>
                        <TableCell>
                          {r.ocorrencias.length === 0 ? (
                            <Badge variant="good">Sem ocorrências</Badge>
                          ) : pendentes > 0 ? (
                            <Badge variant="warning">{pendentes} em aberto</Badge>
                          ) : (
                            <Badge variant="good">Tudo resolvido</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {aberta && (
                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                          <TableCell colSpan={5} className="px-6 py-2">
                            {r.obs && <div className="mb-1 text-xs text-muted-foreground">{r.obs}</div>}
                            {r.ocorrencias.length === 0 && (
                              <div className="text-xs text-muted-foreground">Nenhuma ocorrência registrada nesta ronda.</div>
                            )}
                            <ul className="space-y-1">
                              {r.ocorrencias.map((o, i) => (
                                <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                                  <Badge
                                    variant={
                                      o.tipo === 'morte' ? 'critical'
                                      : o.tipo === 'doente' ? 'warning'
                                      : o.tipo === 'tratamento' ? 'info'
                                      : 'default'
                                    }
                                  >
                                    {TIPO_OCORRENCIA_LABEL[o.tipo]}
                                  </Badge>
                                  {o.brinco && <span className="font-medium">{o.brinco}</span>}
                                  <span className={o.resolvida ? 'text-muted-foreground line-through' : ''}>{o.descricao}</span>
                                  {o.foto && (
                                    <img src={o.foto} alt="Foto da ocorrência" className="h-16 w-16 rounded border object-cover" />
                                  )}
                                  {!o.resolvida && o.tipo !== 'morte' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        resolverOcorrencia(r.id, i)
                                        toast('Ocorrência marcada como resolvida.')
                                      }}
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Resolver
                                    </Button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination {...rondasPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Clique numa ronda para ver as ocorrências. Tratamentos entram na ficha do animal; morte
              dá baixa automática no rebanho. Ocorrências em aberto viram alerta no Dashboard.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ManejoDialog
        key={tarefaParaManejo?.id ?? 'livre'}
        open={manejoOpen}
        onClose={() => { setManejoOpen(false); setTarefaParaManejo(null) }}
        tarefa={tarefaParaManejo ?? undefined}
        onFeito={(manejoId) => { if (tarefaParaManejo) concluirTarefa(tarefaParaManejo.id, manejoId) }}
      />
      <NovaTarefaDialog open={novaTarefaOpen} onClose={() => setNovaTarefaOpen(false)} />
      <RondaDialog open={rondaOpen} onClose={() => setRondaOpen(false)} />
    </div>
  )
}

function ManejoDialog({ open, onClose, tarefa, onFeito }: { open: boolean; onClose: () => void; tarefa?: TarefaSanitaria; onFeito?: (manejoId?: string) => void }) {
  const { estoque, lotes, animais, registrarManejoLote } = useStore()
  const insumos = estoque.filter((i) => ['vacina', 'medicamento', 'hormonio'].includes(i.categoria))
  const [data, setData] = useState(hojeISO())
  const [tipo, setTipo] = useState<ManejoSanitario['tipo']>(tarefa?.tipo ?? 'vacinacao')
  const [itemId, setItemId] = useState(tarefa?.itemEstoqueId && insumos.some((i) => i.id === tarefa.itemEstoqueId) ? tarefa.itemEstoqueId : (insumos[0]?.id ?? ''))
  const [loteId, setLoteId] = useState(tarefa?.loteId ?? '') // '' = rebanho geral
  // frasco rende ~35 animais; vacina/hormônio é 1 dose por cabeça
  const doseSugerida = (id: string) => (estoque.find((i) => i.id === id)?.unidade === 'frasco' ? '0,03' : '1')
  const [dose, setDose] = useState(() => doseSugerida(tarefa?.itemEstoqueId && insumos.some((i) => i.id === tarefa.itemEstoqueId) ? tarefa.itemEstoqueId : (insumos[0]?.id ?? '')))
  const [responsavel, setResponsavel] = useState('')
  const [erro, setErro] = useState('')

  const alvoQtd = loteId
    ? ativos(animais).filter((a) => a.loteId === loteId).length
    : ativos(animais).length
  const item = estoque.find((i) => i.id === itemId)
  const doseN = Number(dose.replace(',', '.')) || 0
  const consumo = Math.ceil(alvoQtd * doseN * 100) / 100

  const salvar = () => {
    if (!itemId || !responsavel.trim() || !(doseN > 0)) {
      setErro('Informe o insumo, a dose por animal e o responsável.')
      return
    }
    const r = registrarManejoLote({
      data,
      tipo,
      itemEstoqueId: itemId,
      loteId: loteId || undefined,
      dosePorAnimal: doseN,
      responsavel: responsavel.trim(),
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar o manejo.')
      return
    }
    toast(`${TIPO_MANEJO_LABEL[tipo]} registrada em ${fmtNum(r.qtdAnimais ?? 0)} animais — estoque baixado e fichas atualizadas.${tarefa ? ' Tarefa do calendário marcada como feita.' : ''}`)
    onFeito?.()
    setErro(''); setResponsavel('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={tarefa ? `Fazer agora — ${tarefa.titulo}` : 'Registrar manejo em lote'}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormRow>
        <FormRow label="Tipo de manejo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as ManejoSanitario['tipo'])}>
            <option value="vacinacao">Vacinação</option>
            <option value="vermifugacao">Vermifugação</option>
            <option value="medicacao">Medicação</option>
          </Select>
        </FormRow>
        <FormRow label="Insumo (do Estoque)">
          <Select value={itemId} onChange={(e) => { setItemId(e.target.value); setDose(doseSugerida(e.target.value)) }}>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} — saldo {fmtNum(i.saldo)} {i.unidade}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Alvo">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            <option value="">Rebanho geral</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label={`Dose por animal (${item?.unidade ?? 'un'})`}>
          <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="1" />
        </FormRow>
        <FormRow label="Responsável">
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Equipe de campo" />
        </FormRow>
      </div>
      <p className="tnum mt-2 text-xs text-muted-foreground">
        {fmtNum(alvoQtd)} animais no alvo → consumo de {fmtNum(consumo)} {item?.unidade ?? ''} (saldo:{' '}
        {fmtNum(item?.saldo ?? 0)})
      </p>
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        O manejo baixa o estoque automaticamente e escreve o evento no histórico sanitário de todos
        os animais do alvo — rastreável na ficha individual.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar manejo</Button>
      </div>
    </Dialog>
  )
}

function NovaTarefaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, lotes, addTarefaSanitaria } = useStore()
  const insumos = estoque.filter((i) => ['vacina', 'medicamento'].includes(i.categoria))
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(addDays(hojeISO(), 7))
  const [tipo, setTipo] = useState<ManejoSanitario['tipo']>('vacinacao')
  const [loteId, setLoteId] = useState('')
  const [itemId, setItemId] = useState('')
  const salvar = () => {
    if (!titulo.trim()) return
    addTarefaSanitaria({ titulo: titulo.trim(), data, tipo, alvo: loteId ? (lotes.find((l) => l.id === loteId)?.nome ?? loteId) : 'Rebanho geral', loteId: loteId || undefined, itemEstoqueId: itemId || undefined })
    toast(`Tarefa "${titulo.trim()}" agendada para ${fmtDate(data)}.`)
    setTitulo('')
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Agendar tarefa sanitária">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Tarefa"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reforço de clostridiose" /></FormRow>
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as ManejoSanitario['tipo'])}>
            <option value="vacinacao">Vacinação</option>
            <option value="vermifugacao">Vermifugação</option>
            <option value="medicacao">Medicação</option>
          </Select>
        </FormRow>
        <FormRow label="Lote / alvo">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            <option value="">Rebanho geral</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Insumo (opcional)">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">—</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </Select>
        </FormRow>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Agendar</Button>
      </div>
    </Dialog>
  )
}

interface LinhaOcorrencia {
  brinco: string
  tipo: TipoOcorrencia
  descricao: string
  foto?: string
}

function RondaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pastos, addRonda } = useStore()
  const [data, setData] = useState(hojeISO())
  const [responsavel, setResponsavel] = useState('')
  const [pastoId, setPastoId] = useState(pastos[0]?.id ?? '')
  const [obs, setObs] = useState('')
  const [linhas, setLinhas] = useState<LinhaOcorrencia[]>([])
  const [erro, setErro] = useState('')

  const setLinha = (i: number, patch: Partial<LinhaOcorrencia>) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const salvar = () => {
    if (!responsavel.trim()) {
      setErro('Informe o responsável pela ronda.')
      return
    }
    const ocorrencias = linhas
      .filter((l) => l.descricao.trim())
      .map((l) => ({
        brinco: l.brinco.trim() || undefined,
        tipo: l.tipo,
        descricao: l.descricao.trim(),
        resolvida: false,
        foto: l.foto,
      }))
    const r = addRonda({ data, responsavel: responsavel.trim(), pastoId, obs: obs.trim() || undefined, ocorrencias })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar a ronda.')
      return
    }
    // só morte com brinco dá baixa no rebanho
    const mortes = ocorrencias.filter((o) => o.tipo === 'morte' && o.brinco).length
    toast(
      mortes > 0
        ? `Ronda registrada — ${mortes} baixa(s) por morte aplicada(s) no rebanho.`
        : `Ronda registrada com ${ocorrencias.length} ocorrência(s).`,
    )
    setLinhas([]); setObs(''); setResponsavel(''); setErro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova ronda sanitária" className="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormRow>
        <FormRow label="Pasto percorrido">
          <Select value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
            {pastos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Responsável">
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Zé Carlos" />
        </FormRow>
      </div>
      <div className="mt-3">
        <FormRow label="Observação geral (opcional)">
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Pasto e aguadas em ordem" />
        </FormRow>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Ocorrências (opcional)</div>
        {linhas.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <Select
              value={l.tipo}
              onChange={(e) => setLinha(i, { tipo: e.target.value as TipoOcorrencia })}
              className="w-full sm:w-36"
              aria-label="Tipo de ocorrência"
            >
              <option value="observacao">Observação</option>
              <option value="tratamento">Tratamento</option>
              <option value="doente">Animal doente</option>
              <option value="morte">Morte</option>
            </Select>
            <Input
              value={l.brinco}
              onChange={(e) => setLinha(i, { brinco: e.target.value })}
              placeholder="Brinco (opcional)"
              className="w-32"
              aria-label="Brinco"
            />
            <Input
              value={l.descricao}
              onChange={(e) => setLinha(i, { descricao: e.target.value })}
              placeholder="O que foi visto / feito"
              className="min-w-0 flex-1"
              aria-label="Descrição"
            />
            <label
              className={`inline-flex cursor-pointer items-center rounded p-1 hover:bg-secondary ${l.foto ? 'text-green-700' : 'text-muted-foreground'}`}
              title={l.foto ? 'Foto anexada — clique para trocar' : 'Anexar foto'}
            >
              {l.foto ? (
                <img src={l.foto} alt="Foto da ocorrência" className="h-6 w-6 rounded object-cover" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-label="Foto da ocorrência"
                onChange={async (e) => {
                  const arq = e.target.files?.[0]
                  e.target.value = ''
                  if (!arq) return
                  try {
                    setLinha(i, { foto: await reduzirFoto(arq) })
                  } catch {
                    toast('Não foi possível usar essa imagem.', 'error')
                  }
                }}
              />
            </label>
            <button
              onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
              aria-label="Remover ocorrência"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLinhas((ls) => [...ls, { brinco: '', tipo: 'observacao', descricao: '' }])}
        >
          <Plus className="h-3 w-3" /> Adicionar ocorrência
        </Button>
      </div>

      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        Ocorrência de tratamento/doente com brinco entra na ficha do animal; ocorrência de morte dá
        baixa automática no rebanho e no livro de movimentação.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar ronda</Button>
      </div>
    </Dialog>
  )
}
