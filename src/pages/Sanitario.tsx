import { useState, Fragment } from 'react'
import { Plus, Syringe, CheckCircle2, X } from 'lucide-react'
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
import { fmtDate, fmtNum, hojeISO } from '@/lib/format'
import type { ManejoSanitario, TipoOcorrencia } from '@/data/types'

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
  const [manejoOpen, setManejoOpen] = useState(false)
  const [rondaOpen, setRondaOpen] = useState(false)
  const [rondaExpandida, setRondaExpandida] = useState('')

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

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Animais tratados no mês"
          value={fmtNum(animaisTratadosMes)}
          detail="soma dos manejos em lote"
          hint="Total de animais alcançados por vacinação, vermifugação ou medicação em lote neste mês."
        />
        <StatCard label="Manejos registrados" value={fmtNum(state.manejosSanitarios.length)} detail="histórico de campanhas" />
        <StatCard label="Rondas no mês" value={fmtNum(rondasMes)} detail={`${state.rondas.length} no histórico`} />
        <StatCard
          label="Ocorrências em aberto"
          value={fmtNum(abertas.length)}
          detail={doentes > 0 ? `${doentes} animal(is) em observação` : 'nenhum animal doente'}
          tone={doentes > 0 ? 'critical' : abertas.length > 0 ? 'warning' : 'good'}
        />
      </div>

      <Tabs defaultValue="manejos">
        <TabsList>
          <TabsTrigger value="manejos">Manejos em lote ({fmtNum(state.manejosSanitarios.length)})</TabsTrigger>
          <TabsTrigger value="rondas">Rondas sanitárias ({fmtNum(state.rondas.length)})</TabsTrigger>
        </TabsList>

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

      <ManejoDialog open={manejoOpen} onClose={() => setManejoOpen(false)} />
      <RondaDialog open={rondaOpen} onClose={() => setRondaOpen(false)} />
    </div>
  )
}

function ManejoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, lotes, animais, registrarManejoLote } = useStore()
  const insumos = estoque.filter((i) => ['vacina', 'medicamento', 'hormonio'].includes(i.categoria))
  const [data, setData] = useState(hojeISO())
  const [tipo, setTipo] = useState<ManejoSanitario['tipo']>('vacinacao')
  const [itemId, setItemId] = useState(insumos[0]?.id ?? '')
  const [loteId, setLoteId] = useState('') // '' = rebanho geral
  const [dose, setDose] = useState('1')
  const [responsavel, setResponsavel] = useState('')
  const [erro, setErro] = useState('')

  const alvoQtd = loteId
    ? ativos(animais).filter((a) => a.loteId === loteId).length
    : ativos(animais).length
  const item = estoque.find((i) => i.id === itemId)
  const consumo = Math.ceil(alvoQtd * (Number(dose) || 0) * 100) / 100

  const salvar = () => {
    if (!itemId || !responsavel.trim() || !(Number(dose) > 0)) {
      setErro('Informe o insumo, a dose por animal e o responsável.')
      return
    }
    const r = registrarManejoLote({
      data,
      tipo,
      itemEstoqueId: itemId,
      loteId: loteId || undefined,
      dosePorAnimal: Number(dose),
      responsavel: responsavel.trim(),
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar o manejo.')
      return
    }
    toast(`${TIPO_MANEJO_LABEL[tipo]} registrada em ${fmtNum(r.qtdAnimais ?? 0)} animais — estoque baixado e fichas atualizadas.`)
    setErro(''); setResponsavel('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar manejo em lote">
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
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
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
          <Input type="number" step="0.01" min="0.01" value={dose} onChange={(e) => setDose(e.target.value)} />
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

interface LinhaOcorrencia {
  brinco: string
  tipo: TipoOcorrencia
  descricao: string
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
      }))
    const r = addRonda({ data, responsavel: responsavel.trim(), pastoId, obs: obs.trim() || undefined, ocorrencias })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar a ronda.')
      return
    }
    const mortes = ocorrencias.filter((o) => o.tipo === 'morte').length
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
