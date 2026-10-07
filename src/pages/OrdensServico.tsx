import { Fragment, useMemo, useState, type ChangeEvent } from 'react'
import { Plus, MessageSquarePlus, Play, CheckCircle2, Camera } from 'lucide-react'
import { reduzirFoto } from '@/lib/imagem'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { nomeMembro } from '@/lib/metrics'
import { addDays } from '@/data/seed'
import { fmtDate, fmtNum, hojeISO } from '@/lib/format'
import type { OrdemServico as OS, StatusOS, TipoOS } from '@/data/types'

const TIPO_LABEL: Record<TipoOS, string> = {
  manutencao: 'Manutenção',
  pastagem: 'Pastagem',
  cerca: 'Cerca',
  sanitario: 'Sanitário',
  infraestrutura: 'Infraestrutura',
  outro: 'Outro',
}

const STATUS_LABEL: Record<StatusOS, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

export default function OrdensServico() {
  const state = useStore()
  const updateOSStatus = useStore((s) => s.updateOSStatus)
  const [novaOpen, setNovaOpen] = useState(false)
  const [notaPara, setNotaPara] = useState<OS | null>(null)
  const [concluirPara, setConcluirPara] = useState<OS | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [expandida, setExpandida] = useState('')

  const hoje = hojeISO()
  const em7 = addDays(hoje, 7)
  const pendentes = state.ordensServico.filter((o) => o.status !== 'concluida')
  const atrasadas = pendentes.filter((o) => o.prazo && o.prazo < hoje).length
  const paraHoje = pendentes.filter((o) => o.prazo === hoje).length
  const proximos7 = pendentes.filter((o) => o.prazo && o.prazo > hoje && o.prazo <= em7).length
  const concluidasMes = state.ordensServico.filter(
    (o) => o.status === 'concluida' && o.conclusao?.slice(0, 7) === hoje.slice(0, 7),
  ).length
  const situacao = (o: OS): 'atrasada' | 'hoje' | '7dias' | 'concluida' | 'aberta' =>
    o.status === 'concluida' ? 'concluida' : o.prazo && o.prazo < hoje ? 'atrasada' : o.prazo === hoje ? 'hoje' : o.prazo && o.prazo <= em7 ? '7dias' : 'aberta'
  const ordem = { atrasada: 0, hoje: 1, '7dias': 2, aberta: 3, concluida: 4 }

  const filtradas = useMemo(
    () =>
      [...state.ordensServico]
        .sort((a, b) => ordem[situacao(a)] - ordem[situacao(b)] || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || b.abertura.localeCompare(a.abertura))
        .filter((o) => !filtroStatus || (filtroStatus === 'atrasada' || filtroStatus === 'hoje' || filtroStatus === '7dias' ? situacao(o) === filtroStatus : o.status === filtroStatus)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.ordensServico, filtroStatus, hoje],
  )

  if (state.ordensServico.length === 0) {
    return (
      <div>
        <PageHeader title="Ordens de serviço" subtitle="Abertura, acompanhamento e conclusão de serviços" />
        <p className="mb-3 text-sm text-muted-foreground">
          Este perfil ainda não tem ordens de serviço — troque para o perfil <strong>Corte &amp; Leite</strong>
          {' '}na barra lateral para ver o módulo em uso, ou crie a primeira OS.
        </p>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nova OS
        </Button>
        <NovaOSDialog open={novaOpen} onClose={() => setNovaOpen(false)} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tarefas e ordens de serviço"
        subtitle="Atrasadas, hoje, próximos 7 dias — conclusão com responsável, observação e foto"
        actions={
          <Button onClick={() => setNovaOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova tarefa
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Atrasadas" value={fmtNum(atrasadas)} detail="prazo vencido" tone={atrasadas > 0 ? 'critical' : 'good'} />
        <StatCard label="Para hoje" value={fmtNum(paraHoje)} tone={paraHoje > 0 ? 'warning' : undefined} />
        <StatCard label="Próximos 7 dias" value={fmtNum(proximos7)} detail={`${fmtNum(pendentes.length)} pendentes no total`} />
        <StatCard label="Concluídas no mês" value={fmtNum(concluidasMes)} tone="good" />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {([['', 'Todas'], ['atrasada', `Atrasadas (${atrasadas})`], ['hoje', `Hoje (${paraHoje})`], ['7dias', `7 dias (${proximos7})`], ['concluida', `Concluídas`]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)} className={`rounded-md border px-2.5 py-1 text-xs font-medium touch:py-2 ${filtroStatus === v ? 'border-primary bg-accent' : 'bg-card hover:bg-secondary'}`}>{l}</button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Abertura</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((o) => {
              const atrasada = o.status !== 'concluida' && o.prazo && o.prazo < hoje
              const aberta = expandida === o.id
              return (
                <Fragment key={o.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpandida(aberta ? '' : o.id)}
                  >
                    <TableCell className="font-medium">{o.numero}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{o.titulo}</TableCell>
                    <TableCell><Badge>{TIPO_LABEL[o.tipo]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{o.vinculo ?? '—'}</TableCell>
                    <TableCell>{o.responsavel}</TableCell>
                    <TableCell className="tnum">{fmtDate(o.abertura)}</TableCell>
                    <TableCell className={`tnum ${atrasada ? 'font-semibold text-red-700' : ''}`}>
                      {fmtDate(o.prazo)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={o.status === 'concluida' ? 'good' : o.status === 'em_andamento' ? 'info' : atrasada ? 'critical' : 'warning'}
                      >
                        {STATUS_LABEL[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1 whitespace-nowrap">
                        {o.status === 'aberta' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            title="Iniciar"
                            onClick={() => {
                              updateOSStatus(o.id, 'em_andamento')
                              toast(`${o.numero} em andamento.`)
                            }}
                          >
                            <Play className="h-3 w-3" /> Iniciar
                          </Button>
                        )}
                        {o.status !== 'concluida' && (
                          <Button size="sm" variant="secondary" title="Concluir" onClick={() => setConcluirPara(o)}>
                            <CheckCircle2 className="h-3 w-3" /> Concluir
                          </Button>
                        )}
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-secondary"
                          title="Adicionar nota de acompanhamento"
                          aria-label={`Adicionar nota na ${o.numero}`}
                          onClick={() => setNotaPara(o)}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {aberta && (
                    <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                      <TableCell colSpan={9} className="px-6 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Acompanhamento
                        </div>
                        {o.notas.length === 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">Sem notas ainda.</div>
                        )}
                        <ul className="mt-1 space-y-0.5">
                          {o.notas.map((n, i) => (
                            <li key={i} className="text-xs">
                              <span className="tnum text-muted-foreground">{fmtDate(n.data)}</span> — {n.texto}
                            </li>
                          ))}
                          {o.conclusao && (
                            <li className="text-xs text-green-800">
                              <span className="tnum">{fmtDate(o.conclusao)}</span> — concluída{o.concluidaPorId ? ` por ${nomeMembro(state, o.concluidaPorId)}` : ''}{o.conclusaoObs ? `: ${o.conclusaoObs}` : ''}
                            </li>
                          )}
                        </ul>
                        {o.conclusaoFoto && <img src={o.conclusaoFoto} alt="Foto da conclusão" className="mt-2 h-24 w-24 rounded border object-cover" />}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Clique em uma OS para ver o acompanhamento. OS com prazo vencido aparecem nos alertas do Dashboard.
        </div>
      </div>

      <NovaOSDialog open={novaOpen} onClose={() => setNovaOpen(false)} />
      <NotaDialog os={notaPara} onClose={() => setNotaPara(null)} />
      <ConcluirDialog os={concluirPara} onClose={() => setConcluirPara(null)} />
    </div>
  )
}

function NovaOSDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addOS = useStore((s) => s.addOS)
  const { maquinas, pastos, lotes, equipe } = useStore()
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoOS>('manutencao')
  const [vinculo, setVinculo] = useState('')
  const [responsavel, setResponsavel] = useState(equipe.find((m) => m.papel === 'campo')?.nome ?? '')
  const [prazo, setPrazo] = useState(addDays(hojeISO(), 3))

  const vinculos = [...maquinas.map((m) => m.nome), ...pastos.map((p) => p.nome), ...lotes.map((l) => `Lote ${l.nome}`), 'Sede', 'Rebanho geral']

  const salvar = () => {
    if (!titulo.trim() || !responsavel.trim()) return
    addOS({
      titulo: titulo.trim(),
      tipo,
      vinculo: vinculo || undefined,
      responsavel: responsavel.trim(),
      abertura: hojeISO(),
      prazo: prazo || undefined,
      status: 'aberta',
    })
    toast('Ordem de serviço aberta.')
    setTitulo(''); setResponsavel(''); setPrazo(''); setVinculo('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova ordem de serviço">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Título">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reforma da cerca do fundo" />
        </FormRow>
        <FormRow label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoOS)}>
            {Object.entries(TIPO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Vínculo (máquina / pasto / lote)">
          <Select value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
            <option value="">— sem vínculo —</option>
            {vinculos.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Responsável">
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Zé Carlos" list="equipe-nomes" />
          <datalist id="equipe-nomes">{equipe.map((m) => <option key={m.id} value={m.nome} />)}</datalist>
        </FormRow>
        <FormRow label="Prazo">
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </FormRow>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Abrir OS</Button>
      </div>
    </Dialog>
  )
}

function ConcluirDialog({ os, onClose }: { os: OS | null; onClose: () => void }) {
  const concluirOS = useStore((s) => s.concluirOS)
  const { equipe, usuarioAtualId } = useStore()
  const [obs, setObs] = useState('')
  const [responsavelId, setResponsavelId] = useState(usuarioAtualId)
  const [foto, setFoto] = useState<string | undefined>()
  const [carregando, setCarregando] = useState(false)
  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    setCarregando(true)
    try {
      setFoto(await reduzirFoto(arq))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível usar essa imagem.', 'error')
    } finally {
      setCarregando(false)
    }
  }
  const salvar = () => {
    if (!os) return
    concluirOS(os.id, { obs, foto, responsavelId })
    toast(`${os.numero} concluída${foto ? ' com foto' : ''}.`)
    setObs(''); setFoto(undefined)
    onClose()
  }
  return (
    <Dialog open={os !== null} onClose={onClose} title={`Concluir — ${os?.titulo ?? ''}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Quem concluiu">
          <Select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
            {equipe.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Observação">
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Serviço feito, sobrou material" />
        </FormRow>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {foto ? <img src={foto} alt="Foto da conclusão" className="h-20 w-20 rounded-md border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed bg-secondary/50 text-muted-foreground"><Camera className="h-5 w-5" /></div>}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary touch:py-2.5">
          <Camera className="h-3.5 w-3.5" /> {carregando ? 'Processando…' : foto ? 'Trocar foto' : 'Tirar foto (celular)'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={escolher} />
        </label>
      </div>
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">A conclusão fica registrada com quem fez, a observação e a foto — e entra no Fechamento do Dia.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Concluir tarefa</Button>
      </div>
    </Dialog>
  )
}

function NotaDialog({ os, onClose }: { os: OS | null; onClose: () => void }) {
  const addNotaOS = useStore((s) => s.addNotaOS)
  const [texto, setTexto] = useState('')

  const salvar = () => {
    if (!os || !texto.trim()) return
    addNotaOS(os.id, { data: hojeISO(), texto: texto.trim() })
    toast(`Nota adicionada na ${os.numero}.`)
    setTexto('')
    onClose()
  }

  return (
    <Dialog open={os !== null} onClose={onClose} title={`Nota de acompanhamento — ${os?.numero ?? ''}`}>
      <FormRow label="O que aconteceu?">
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Material entregue, início amanhã" />
      </FormRow>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Adicionar nota</Button>
      </div>
    </Dialog>
  )
}
