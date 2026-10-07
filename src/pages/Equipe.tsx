import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle2, Undo2, Trash2, ShieldCheck, AlertTriangle, OctagonAlert } from 'lucide-react'
import { incoerencias } from '@/lib/gestao'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { conferenciasPendentes, nomeMembro } from '@/lib/metrics'
import { fmtNum, hojeISO } from '@/lib/format'
import type { MembroEquipe, PapelEquipe } from '@/data/types'

const PAPEL_LABEL: Record<PapelEquipe, string> = {
  campo: 'Campo',
  escritorio: 'Escritório',
  gerente: 'Gerente',
}

function fmtDataHora(iso: string): string {
  const [data, hora] = iso.split('T')
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y} ${hora?.slice(0, 5) ?? ''}`
}

export default function Equipe() {
  const state = useStore()
  const aprovarConferencia = useStore((s) => s.aprovarConferencia)
  const devolverConferencia = useStore((s) => s.devolverConferencia)
  const removeMembroEquipe = useStore((s) => s.removeMembroEquipe)
  const [novoOpen, setNovoOpen] = useState(false)
  const [membroExcluir, setMembroExcluir] = useState<MembroEquipe | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tabInicial = tabParam === 'equipe' || tabParam === 'incoerencias' ? tabParam : 'aprovacoes'
  const lista = incoerencias(state)

  const usuario = state.equipe.find((m) => m.id === state.usuarioAtualId)
  const podeAprovar = usuario?.papel !== 'campo'
  const pendentes = conferenciasPendentes(state)
  const hoje = hojeISO()
  const aprovadasHoje = state.conferencias.filter(
    (c) => c.status === 'aprovado' && c.conferidoEm?.startsWith(hoje),
  ).length

  const filtradas = [...state.conferencias]
    .sort((a, b) => b.lancadoEm.localeCompare(a.lancadoEm))
    .filter((c) => !filtroStatus || c.status === filtroStatus)
  const pag = usePagination(filtradas, 50)

  return (
    <div>
      <PageHeader
        title="Equipe e conferência"
        subtitle="Quem lança, quem confere: todo lançamento do campo passa pelo visto do escritório"
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo membro
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Aguardando conferência"
          value={fmtNum(pendentes.length)}
          detail="lançamentos do campo"
          tone={pendentes.length > 0 ? 'warning' : 'good'}
          hint="O campo lança e o dado já vale na fazenda; o escritório confere e dá o visto — nada se perde, nada passa sem controle."
        />
        <StatCard label="Incoerências apontadas" value={fmtNum(lista.length)} detail={`${lista.filter((i) => i.severidade === 'critical').length} graves`} tone={lista.some((i) => i.severidade === 'critical') ? 'critical' : lista.length > 0 ? 'warning' : 'good'}
          hint="O sistema cruza os lançamentos e aponta o que não bate: peso que caiu, vacina repetida, lançamento em animal vendido, pasto acima da lotação, morte com ocorrência aberta." />
        <StatCard label="Conferidas hoje" value={fmtNum(aprovadasHoje)} tone="good" />
        <StatCard label="Membros da equipe" value={fmtNum(state.equipe.length)} detail={`${state.equipe.filter((m) => m.papel === 'campo').length} no campo`} />
        <StatCard
          label="Operando agora"
          value={usuario?.nome.split(' ')[0] ?? '—'}
          detail={usuario ? PAPEL_LABEL[usuario.papel] : ''}
          hint="Troque quem está operando no seletor do topo da tela para simular as permissões de cada papel."
        />
      </div>

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="aprovacoes">Conferências ({fmtNum(state.conferencias.length)})</TabsTrigger>
          <TabsTrigger value="incoerencias">Incoerências ({fmtNum(lista.length)})</TabsTrigger>
          <TabsTrigger value="equipe">Equipe ({fmtNum(state.equipe.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoerencias">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>O que não bate</TableHead>
                  <TableHead>Detalhe</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhuma incoerência — os lançamentos estão batendo entre si.</TableCell></TableRow>}
                {lista.map((i, k) => (
                  <TableRow key={k} className={i.severidade === 'critical' ? 'bg-red-50/40' : ''}>
                    <TableCell>{i.severidade === 'critical' ? <OctagonAlert className="h-4 w-4 text-red-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}</TableCell>
                    <TableCell className="font-medium">{i.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{i.detalhe}</TableCell>
                    <TableCell><Badge>{REGRA[i.tipo]}</Badge></TableCell>
                    <TableCell className="text-right"><Link to={i.link} className="text-[12px] font-medium text-primary hover:underline">abrir</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Regras: peso que caiu mais de 5% · ganho acima de 2,5 kg/dia · lançamento em animal vendido ou morto · mesma vacina 2× em 30 dias · pasto acima da lotação · morte com ocorrência de ronda em aberto.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="aprovacoes">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-40">
              <option value="">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="devolvido">Devolvidas</option>
            </Select>
            {!podeAprovar && (
              <span className="text-[11px] text-amber-700">
                Você está operando como Campo — só o Escritório ou o Gerente dão o visto.
              </span>
            )}
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Lançado por</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-44 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pag.pageItems.map((c) => (
                  <TableRow key={c.id} className={c.status === 'pendente' ? 'bg-amber-50/50 hover:bg-amber-50' : ''}>
                    <TableCell className="tnum">{fmtDataHora(c.lancadoEm)}</TableCell>
                    <TableCell><Badge>{c.tipo}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate font-medium">{c.resumo}</TableCell>
                    <TableCell>{nomeMembro(state, c.responsavelId)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'aprovado' ? 'good' : c.status === 'devolvido' ? 'critical' : 'warning'}>
                        {c.status === 'aprovado' ? 'Conferida' : c.status === 'devolvido' ? 'Devolvida' : 'Pendente'}
                      </Badge>
                      {c.conferidoPorId && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          por {nomeMembro(state, c.conferidoPorId)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === 'pendente' && (
                        <div className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!podeAprovar}
                            title={podeAprovar ? 'Dar o visto' : 'Só Escritório/Gerente aprovam'}
                            onClick={() => {
                              aprovarConferencia(c.id)
                              toast(`Visto dado: ${c.tipo.toLowerCase()} conferido.`)
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!podeAprovar}
                            title={podeAprovar ? 'Devolver para o campo revisar' : 'Só Escritório/Gerente devolvem'}
                            onClick={() => {
                              devolverConferencia(c.id)
                              toast('Lançamento devolvido para o campo revisar.', 'error')
                            }}
                          >
                            <Undo2 className="h-3 w-3" /> Devolver
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">Nenhuma conferência nesse filtro.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...pag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              O lançamento do campo entra valendo na hora (a fazenda não para); o visto do escritório
              fica registrado com quem conferiu e quando. Pendências viram alerta no Dashboard.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.equipe.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.nome}
                      {m.id === state.usuarioAtualId && (
                        <Badge variant="info" className="ml-1.5">operando agora</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.papel === 'gerente' ? 'good' : m.papel === 'escritorio' ? 'info' : 'default'}>
                        {PAPEL_LABEL[m.papel]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.papel === 'campo'
                        ? 'Lança no campo — entra na fila de conferência'
                        : m.papel === 'escritorio'
                          ? 'Lança direto e dá o visto nas conferências'
                          : 'Acesso total'}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                        aria-label={`Remover ${m.nome}`}
                        onClick={() => setMembroExcluir(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-1.5 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Na demonstração, o seletor do topo simula o login de cada membro — no sistema completo,
              cada um entra com a própria senha e vê só o que o papel permite.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NovoMembroDialog open={novoOpen} onClose={() => setNovoOpen(false)} />

      <ConfirmDialog
        open={membroExcluir !== null}
        onClose={() => setMembroExcluir(null)}
        onConfirm={() => {
          if (!membroExcluir) return
          const r = removeMembroEquipe(membroExcluir.id)
          if (r.ok) toast(`${membroExcluir.nome} removido da equipe.`)
          else toast(r.erro ?? 'Não foi possível remover.', 'error')
        }}
        title="Remover membro"
        confirmLabel="Remover"
        tone="destructive"
      >
        Remover <strong>{membroExcluir?.nome}</strong> da equipe? Os lançamentos antigos dele continuam
        no histórico.
      </ConfirmDialog>
    </div>
  )
}

const REGRA = {
  peso_caiu: 'Peso caiu >5%',
  ganho_anormal: 'Ganho fora do normal',
  animal_inativo: 'Animal vendido/morto',
  vacina_repetida: 'Vacina repetida',
  lotacao: 'Lotação do pasto',
  morte_aberta: 'Morte c/ ocorrência',
} as const

function NovoMembroDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addMembroEquipe = useStore((s) => s.addMembroEquipe)
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState<PapelEquipe>('campo')

  const salvar = () => {
    if (!nome.trim()) return
    addMembroEquipe({ nome: nome.trim(), papel })
    toast(`${nome.trim()} adicionado à equipe (${PAPEL_LABEL[papel]}).`)
    setNome('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo membro da equipe">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Pedro Vaqueiro" />
        </FormRow>
        <FormRow label="Papel">
          <Select value={papel} onChange={(e) => setPapel(e.target.value as PapelEquipe)}>
            <option value="campo">Campo — lança, escritório confere</option>
            <option value="escritorio">Escritório — lança e dá o visto</option>
            <option value="gerente">Gerente — acesso total</option>
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
