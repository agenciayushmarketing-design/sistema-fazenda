import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ArrowLeft, LogOut, Pencil, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, ChartCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { CATEGORIA_LABEL, type Animal, type Categoria } from '@/data/types'
import { fmtDate, fmtDateShort, fmtIdade, fmtKg1, fmtNum1, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'

export default function FichaAnimal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const [saidaOpen, setSaidaOpen] = useState(false)

  const animal = state.animais.find((a) => a.id === id)
  if (!animal) {
    return (
      <div>
        <PageHeader title="Animal não encontrado" />
        <Link to="/rebanho" className="text-sm text-primary hover:underline">← Voltar ao rebanho</Link>
      </div>
    )
  }

  const lote = state.lotes.find((l) => l.id === animal.loteId)
  const pasto = lote ? state.pastos.find((p) => p.id === lote.pastoId) : undefined
  const movs = state.movimentacoes.filter((m) => m.brinco === animal.brinco)
  const parto = state.partos.find((p) => p.bezerroBrinco === animal.brinco)
  const desmame = state.desmames.find((d) => d.bezerroBrinco === animal.brinco)

  const pesagens = [...animal.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  const gmdVida =
    pesagens.length >= 2
      ? (pesagens[pesagens.length - 1].peso - pesagens[0].peso) /
        Math.max(1, Math.round((new Date(pesagens[pesagens.length - 1].data).getTime() - new Date(pesagens[0].data).getTime()) / 86400000))
      : null

  return (
    <div>
      <PageHeader
        title={`Ficha — ${animal.brinco}`}
        subtitle={`${CATEGORIA_LABEL[animal.categoria]} · ${animal.raca} · ${fmtIdade(animal.nascimento)}${animal.status !== 'ativo' ? ` · ${animal.status === 'vendido' ? 'VENDIDO' : 'MORTO'}` : ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/rebanho')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
            {animal.status === 'ativo' && (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="destructive" onClick={() => setSaidaOpen(true)}>
                  <LogOut className="h-3.5 w-3.5" /> Registrar saída
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Identificação e genealogia</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-muted-foreground">Brinco</dt><dd className="font-medium">{animal.brinco}</dd>
              <dt className="text-muted-foreground">Sexo</dt><dd>{animal.sexo === 'M' ? 'Macho' : 'Fêmea'}</dd>
              <dt className="text-muted-foreground">Categoria</dt><dd>{CATEGORIA_LABEL[animal.categoria]}</dd>
              <dt className="text-muted-foreground">Raça</dt><dd>{animal.raca}</dd>
              <dt className="text-muted-foreground">Nascimento</dt><dd className="tnum">{fmtDate(animal.nascimento)}</dd>
              <dt className="text-muted-foreground">Mãe</dt><dd>{animal.maeBrinco ?? '—'}</dd>
              <dt className="text-muted-foreground">Pai</dt><dd>{animal.paiNome ?? '—'}</dd>
              <dt className="text-muted-foreground">Lote</dt><dd>{lote?.nome ?? animal.loteId}</dd>
              <dt className="text-muted-foreground">Pasto</dt><dd>{pasto?.nome ?? '—'}</dd>
              <dt className="text-muted-foreground">Peso atual</dt><dd className="tnum font-semibold">{fmtKg1(animal.pesoAtual)}</dd>
              {animal.ecc !== undefined && (<><dt className="text-muted-foreground">ECC</dt><dd className="tnum">{fmtNum1(animal.ecc)}</dd></>)}
              {gmdVida !== null && (<><dt className="text-muted-foreground">GMD histórico</dt><dd className="tnum">{fmtNum1(gmdVida * 1000)} g/dia</dd></>)}
              {parto && (<><dt className="text-muted-foreground">Peso ao nascer</dt><dd className="tnum">{fmtKg1(parto.pesoNascer)}</dd></>)}
              {desmame && (<><dt className="text-muted-foreground">Desmame</dt><dd className="tnum">{fmtDate(desmame.data)} · {fmtKg1(desmame.peso)}</dd></>)}
            </dl>
          </CardContent>
        </Card>

        <ChartCard title="Histórico de pesagens" className="lg:col-span-2">
          {pesagens.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pesagens} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="data" tickFormatter={fmtDateShort} {...axisProps} />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} {...axisProps} />
                <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtDate(String(v))} formatter={(v) => [`${fmtNum1(Number(v))} kg`, 'Peso']} />
                <Line dataKey="peso" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, fill: SERIES[0] }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">Pesagens insuficientes para gráfico.</div>
          )}
          {animal.status === 'ativo' && <NovaPesagemInline animal={animal} />}
        </ChartCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Histórico sanitário</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animal.sanitario.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="pl-4 text-muted-foreground">Sem registros.</TableCell></TableRow>
                )}
                {animal.sanitario.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="tnum pl-4">{fmtDate(e.data)}</TableCell>
                    <TableCell>{e.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">{e.produto}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Movimentações</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem → Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="pl-4 text-muted-foreground">Sem movimentações individuais.</TableCell></TableRow>
                )}
                {movs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tnum pl-4">{fmtDate(m.data)}</TableCell>
                    <TableCell><Badge>{m.tipo}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.origem ?? '—'} → {m.destino ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <EditarAnimalDialog animal={animal} open={editOpen} onClose={() => setEditOpen(false)} />
      <SaidaAnimalDialog
        animal={animal}
        open={saidaOpen}
        onClose={() => setSaidaOpen(false)}
        onDone={() => navigate('/rebanho')}
      />
    </div>
  )
}

/** Formulário compacto de pesagem individual, abaixo do gráfico */
function NovaPesagemInline({ animal }: { animal: Animal }) {
  const addPesagemAnimal = useStore((s) => s.addPesagemAnimal)
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')

  const salvar = () => {
    const p = Number(peso)
    if (!p || p <= 0) return
    addPesagemAnimal(animal.id, { data, peso: p })
    toast(`Pesagem de ${animal.brinco} registrada: ${fmtKg1(p)}.`)
    setPeso('')
  }

  return (
    <div className="mt-2 flex items-end gap-2 border-t pt-2">
      <FormRow label="Data">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-36" />
      </FormRow>
      <FormRow label="Peso (kg)">
        <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="315" className="w-24" />
      </FormRow>
      <Button size="sm" variant="secondary" onClick={salvar}>
        <Plus className="h-3 w-3" /> Nova pesagem
      </Button>
    </div>
  )
}

function EditarAnimalDialog({ animal, open, onClose }: { animal: Animal; open: boolean; onClose: () => void }) {
  const { lotes, updateAnimal, addMovimentacao } = useStore()
  const [loteId, setLoteId] = useState(animal.loteId)
  const [categoria, setCategoria] = useState<Categoria>(animal.categoria)
  const [ecc, setEcc] = useState(animal.ecc?.toString() ?? '')

  const salvar = () => {
    const patch: Partial<Animal> = {}
    if (loteId !== animal.loteId) {
      patch.loteId = loteId
      addMovimentacao({
        data: hojeISO(),
        tipo: 'transferencia',
        brinco: animal.brinco,
        categoria: animal.categoria,
        quantidade: 1,
        origem: lotes.find((l) => l.id === animal.loteId)?.nome ?? animal.loteId,
        destino: lotes.find((l) => l.id === loteId)?.nome ?? loteId,
        obs: 'Transferência manual',
      })
    }
    if (categoria !== animal.categoria) {
      patch.categoria = categoria
      addMovimentacao({
        data: hojeISO(),
        tipo: 'mudanca_categoria',
        brinco: animal.brinco,
        categoria,
        quantidade: 1,
        origem: CATEGORIA_LABEL[animal.categoria],
        destino: CATEGORIA_LABEL[categoria],
        obs: 'Reclassificação manual',
      })
    }
    if (ecc !== (animal.ecc?.toString() ?? '')) {
      patch.ecc = ecc === '' ? undefined : Number(ecc)
    }
    if (Object.keys(patch).length > 0) {
      updateAnimal(animal.id, patch)
      toast(`Ficha de ${animal.brinco} atualizada — alterações registradas no livro.`)
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Editar ${animal.brinco}`}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Lote">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="ECC (1–5, opcional)">
          <Input type="number" step="0.1" min="1" max="5" value={ecc} onChange={(e) => setEcc(e.target.value)} />
        </FormRow>
      </div>
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        Mudanças de lote e de categoria são registradas no livro de movimentação (transferência /
        mudança de categoria).
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}

function SaidaAnimalDialog({
  animal,
  open,
  onClose,
  onDone,
}: {
  animal: Animal
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const removeAnimal = useStore((s) => s.removeAnimal)
  const [motivo, setMotivo] = useState<'venda' | 'morte'>('venda')

  return (
    <Dialog open={open} onClose={onClose} title={`Registrar saída — ${animal.brinco}`} className="max-w-md">
      <FormRow label="Motivo da saída">
        <Select value={motivo} onChange={(e) => setMotivo(e.target.value as 'venda' | 'morte')}>
          <option value="venda">Venda</option>
          <option value="morte">Morte</option>
        </Select>
      </FormRow>
      <p className="mt-3 text-[13px] text-muted-foreground">
        O animal sai do inventário ativo e a {motivo === 'venda' ? 'venda' : 'morte'} é registrada no
        livro de movimentação com a data de hoje.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          variant="destructive"
          onClick={() => {
            removeAnimal(animal.id, motivo)
            toast(`Saída de ${animal.brinco} registrada (${motivo === 'venda' ? 'venda' : 'morte'}).`)
            onClose()
            onDone()
          }}
        >
          Registrar {motivo === 'venda' ? 'venda' : 'morte'}
        </Button>
      </div>
    </Dialog>
  )
}
