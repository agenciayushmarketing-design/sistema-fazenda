import { useState } from 'react'
import { Plus, AlertTriangle, Wrench } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { custoManutencao12m, maquinasComRevisaoProxima } from '@/lib/metrics'
import { fmtBRL, fmtDate, fmtNum, hojeISO } from '@/lib/format'
import type { Maquina } from '@/data/types'

export default function Maquinas() {
  const state = useStore()
  const [manutOpen, setManutOpen] = useState(false)
  const [maquinaSel, setMaquinaSel] = useState(state.maquinas[0]?.id ?? '')

  const revisaoProxima = maquinasComRevisaoProxima(state)
  const custo12m = custoManutencao12m(state)
  const totalManutencoes = state.maquinas.reduce((s, m) => s + m.manutencoes.length, 0)
  const maquina = state.maquinas.find((m) => m.id === maquinaSel) ?? state.maquinas[0]

  if (state.maquinas.length === 0) {
    return (
      <div>
        <PageHeader title="Máquinas" subtitle="Controle de máquinas e manutenção" />
        <p className="text-sm text-muted-foreground">
          Este perfil de demonstração não tem máquinas cadastradas — troque para o perfil
          <strong> Corte &amp; Leite</strong> na barra lateral para ver o módulo em uso.
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Máquinas"
        subtitle="Frota, horímetro e manutenções — custos integrados ao Financeiro"
        actions={
          <Button onClick={() => setManutOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar manutenção
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Máquinas na frota" value={fmtNum(state.maquinas.length)} />
        <StatCard label="Custo de manutenção (12m)" value={fmtBRL(custo12m)} detail={`${totalManutencoes} intervenções`} />
        <StatCard
          label="Revisões próximas"
          value={fmtNum(revisaoProxima.length)}
          detail={revisaoProxima.map((m) => m.nome).join(', ') || 'nenhuma'}
          tone={revisaoProxima.length > 0 ? 'warning' : 'good'}
        />
        <StatCard
          label="Preventivas × corretivas"
          value={`${state.maquinas.reduce((s, m) => s + m.manutencoes.filter((x) => x.tipo === 'preventiva').length, 0)} × ${state.maquinas.reduce((s, m) => s + m.manutencoes.filter((x) => x.tipo === 'corretiva').length, 0)}`}
          detail="histórico da frota"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Máquina</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ano</TableHead>
              <TableHead className="text-right">Horímetro</TableHead>
              <TableHead>Próxima revisão</TableHead>
              <TableHead className="text-right">Custo manut. (12m)</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.maquinas.map((m) => {
              const alerta = revisaoProxima.some((x) => x.id === m.id)
              const custo = m.manutencoes.reduce((s, mt) => s + mt.custo, 0)
              return (
                <TableRow
                  key={m.id}
                  className={maquinaSel === m.id ? 'bg-accent/60' : 'cursor-pointer'}
                  onClick={() => setMaquinaSel(m.id)}
                >
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{m.tipo}</TableCell>
                  <TableCell className="tnum text-right">{m.ano}</TableCell>
                  <TableCell className="tnum text-right">
                    {m.horimetro !== undefined ? `${fmtNum(m.horimetro)} h` : '—'}
                  </TableCell>
                  <TableCell className="tnum">
                    {m.proximaRevisaoHorimetro !== undefined
                      ? `${fmtNum(m.proximaRevisaoHorimetro)} h`
                      : fmtDate(m.proximaRevisaoData)}
                  </TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(custo)}</TableCell>
                  <TableCell>
                    {alerta ? (
                      <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Revisão próxima</Badge>
                    ) : (
                      <Badge variant="good">Em dia</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Clique em uma máquina para ver o histórico de manutenções. Cada manutenção gera despesa
          automática no Financeiro.
        </div>
      </div>

      {maquina && (
        <Card className="mt-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Manutenções — {maquina.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Horímetro</TableHead>
                  <TableHead className="text-right pr-4">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maquina.manutencoes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="pl-4 text-muted-foreground">Nenhuma manutenção registrada.</TableCell></TableRow>
                )}
                {[...maquina.manutencoes]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((mt) => (
                    <TableRow key={mt.id}>
                      <TableCell className="tnum pl-4">{fmtDate(mt.data)}</TableCell>
                      <TableCell>
                        <Badge variant={mt.tipo === 'preventiva' ? 'info' : 'warning'}>
                          {mt.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>{mt.descricao}</TableCell>
                      <TableCell className="tnum text-right">{mt.horimetro !== undefined ? `${fmtNum(mt.horimetro)} h` : '—'}</TableCell>
                      <TableCell className="tnum text-right pr-4 font-semibold">{fmtBRL(mt.custo)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NovaManutencaoDialog open={manutOpen} onClose={() => setManutOpen(false)} maquinaInicial={maquinaSel} />
    </div>
  )
}

function NovaManutencaoDialog({
  open,
  onClose,
  maquinaInicial,
}: {
  open: boolean
  onClose: () => void
  maquinaInicial: string
}) {
  const { maquinas, addManutencao } = useStore()
  const [maquinaId, setMaquinaId] = useState(maquinaInicial || (maquinas[0]?.id ?? ''))
  const [data, setData] = useState(hojeISO())
  const [tipo, setTipo] = useState<'preventiva' | 'corretiva'>('preventiva')
  const [descricao, setDescricao] = useState('')
  const [custo, setCusto] = useState('')
  const [horimetro, setHorimetro] = useState('')

  const maquina = maquinas.find((m) => m.id === maquinaId)

  const salvar = () => {
    const c = Number(custo)
    if (!maquinaId || !descricao.trim() || !c || c <= 0) return
    addManutencao(maquinaId, {
      data,
      tipo,
      descricao: descricao.trim(),
      custo: c,
      horimetro: horimetro ? Number(horimetro) : undefined,
    })
    toast(`Manutenção registrada — despesa de ${fmtBRL(c)} lançada no Financeiro.`)
    setDescricao(''); setCusto(''); setHorimetro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar manutenção">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Máquina">
          <Select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)}>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormRow>
        <FormRow label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'preventiva' | 'corretiva')}>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
          </Select>
        </FormRow>
        <FormRow label="Custo (R$)">
          <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </FormRow>
        <FormRow label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Troca de óleo e filtros" />
        </FormRow>
        {maquina?.horimetro !== undefined && (
          <FormRow label={`Horímetro (atual: ${fmtNum(maquina.horimetro)} h)`}>
            <Input type="number" value={horimetro} onChange={(e) => setHorimetro(e.target.value)} />
          </FormRow>
        )}
      </div>
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        A manutenção gera despesa automática no Financeiro (categoria Manutenção) e atualiza o horímetro
        da máquina.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
