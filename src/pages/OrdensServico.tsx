import { Fragment, useMemo, useState } from 'react'
import { Plus, MessageSquarePlus, Play, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
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
  const [filtroStatus, setFiltroStatus] = useState('')
  const [expandida, setExpandida] = useState('')

  const hoje = hojeISO()
  const abertas = state.ordensServico.filter((o) => o.status === 'aberta').length
  const andamento = state.ordensServico.filter((o) => o.status === 'em_andamento').length
  const atrasadas = state.ordensServico.filter((o) => o.status !== 'concluida' && o.prazo && o.prazo < hoje).length
  const concluidasMes = state.ordensServico.filter(
    (o) => o.status === 'concluida' && o.conclusao?.slice(0, 7) === hoje.slice(0, 7),
  ).length

  const filtradas = useMemo(
    () =>
      [...state.ordensServico]
        .sort((a, b) => b.abertura.localeCompare(a.abertura))
        .filter((o) => !filtroStatus || o.status === filtroStatus),
    [state.ordensServico, filtroStatus],
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
        title="Ordens de serviço"
        subtitle="Abertura, acompanhamento com notas e conclusão"
        actions={
          <Button onClick={() => setNovaOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova OS
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Abertas" value={fmtNum(abertas)} tone={abertas > 0 ? 'warning' : 'good'} />
        <StatCard label="Em andamento" value={fmtNum(andamento)} />
        <StatCard label="Com prazo vencido" value={fmtNum(atrasadas)} tone={atrasadas > 0 ? 'critical' : 'good'} />
        <StatCard label="Concluídas no mês" value={fmtNum(concluidasMes)} tone="good" />
      </div>

      <div className="mb-2">
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-44">
          <option value="">Todos os status</option>
          <option value="aberta">Abertas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluídas</option>
        </Select>
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
                          <Button
                            size="sm"
                            variant="secondary"
                            title="Concluir"
                            onClick={() => {
                              updateOSStatus(o.id, 'concluida')
                              toast(`${o.numero} concluída.`)
                            }}
                          >
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
                              <span className="tnum">{fmtDate(o.conclusao)}</span> — OS concluída
                            </li>
                          )}
                        </ul>
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
    </div>
  )
}

function NovaOSDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addOS = useStore((s) => s.addOS)
  const { maquinas, pastos } = useStore()
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoOS>('manutencao')
  const [vinculo, setVinculo] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prazo, setPrazo] = useState('')

  const vinculos = [...maquinas.map((m) => m.nome), ...pastos.map((p) => p.nome), 'Sede', 'Rebanho geral']

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
        <FormRow label="Vínculo (máquina / pasto)">
          <Select value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
            <option value="">— sem vínculo —</option>
            {vinculos.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Responsável">
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Zé Carlos" />
        </FormRow>
        <FormRow label="Prazo (opcional)">
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
