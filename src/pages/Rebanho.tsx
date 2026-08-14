import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { FormRow } from '@/components/shared'
import { CATEGORIA_LABEL, type Animal, type Categoria } from '@/data/types'
import { inventarioPorCategoria, ativos } from '@/lib/metrics'
import { fmtDate, fmtIdade, fmtKg, fmtNum, hojeISO } from '@/lib/format'

const TIPO_MOV_LABEL: Record<string, string> = {
  nascimento: 'Nascimento',
  morte: 'Morte',
  compra: 'Compra',
  venda: 'Venda',
  transferencia: 'Transferência',
  mudanca_categoria: 'Mudança de categoria',
  desmame: 'Desmame',
}

export default function Rebanho() {
  const state = useStore()
  const inv = inventarioPorCategoria(state.animais)

  const [filtroCat, setFiltroCat] = useState('')
  const [filtroLote, setFiltroLote] = useState('')
  const [filtroBrinco, setFiltroBrinco] = useState('')
  const [filtroRaca, setFiltroRaca] = useState('')
  const [novoOpen, setNovoOpen] = useState(false)

  const animaisFiltrados = useMemo(() => {
    return ativos(state.animais)
      .filter((a) => !filtroCat || a.categoria === filtroCat)
      .filter((a) => !filtroLote || a.loteId === filtroLote)
      .filter((a) => !filtroRaca || a.raca === filtroRaca)
      .filter((a) => !filtroBrinco || a.brinco.toLowerCase().includes(filtroBrinco.toLowerCase()))
  }, [state.animais, filtroCat, filtroLote, filtroBrinco, filtroRaca])

  const loteNome = (id: string) => state.lotes.find((l) => l.id === id)?.nome ?? id

  return (
    <div>
      <PageHeader
        title="Rebanho"
        subtitle="Inventário, animais e livro de movimentação"
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo animal
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-4 gap-2 lg:grid-cols-8">
        {(Object.entries(inv) as [Categoria, number][]).map(([cat, qtd]) => (
          <button
            key={cat}
            onClick={() => setFiltroCat(filtroCat === cat ? '' : cat)}
            className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
              filtroCat === cat ? 'border-primary bg-accent' : 'bg-card hover:bg-secondary'
            }`}
          >
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORIA_LABEL[cat]}
            </div>
            <div className="tnum text-base font-bold leading-tight">{fmtNum(qtd)}</div>
          </button>
        ))}
      </div>

      <Tabs defaultValue="animais">
        <TabsList>
          <TabsTrigger value="animais">Animais ({fmtNum(animaisFiltrados.length)})</TabsTrigger>
          <TabsTrigger value="movimentacao">Livro de movimentação ({fmtNum(state.movimentacoes.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="animais">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar brinco…"
              value={filtroBrinco}
              onChange={(e) => setFiltroBrinco(e.target.value)}
              className="w-40"
            />
            <Select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="w-44">
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Select value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)} className="w-48">
              <option value="">Todos os lotes</option>
              {state.lotes.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </Select>
            <Select value={filtroRaca} onChange={(e) => setFiltroRaca(e.target.value)} className="w-36">
              <option value="">Todas as raças</option>
              <option value="Nelore PO">Nelore PO</option>
              <option value="Nelore">Nelore</option>
            </Select>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brinco</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Peso atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animaisFiltrados.slice(0, 200).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to={`/rebanho/${a.id}`} className="font-medium text-primary hover:underline">
                        {a.brinco}
                      </Link>
                    </TableCell>
                    <TableCell>{CATEGORIA_LABEL[a.categoria]}</TableCell>
                    <TableCell>{a.sexo}</TableCell>
                    <TableCell>{a.raca}</TableCell>
                    <TableCell className="tnum">{fmtIdade(a.nascimento)}</TableCell>
                    <TableCell className="text-muted-foreground">{loteNome(a.loteId)}</TableCell>
                    <TableCell className="tnum text-right">{fmtKg(a.pesoAtual)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {animaisFiltrados.length > 200 && (
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                Exibindo 200 de {fmtNum(animaisFiltrados.length)} animais — refine os filtros.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movimentacao">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Brinco / lote</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...state.movimentacoes].reverse().slice(0, 300).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tnum">{fmtDate(m.data)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.tipo === 'morte' ? 'critical'
                          : m.tipo === 'venda' ? 'warning'
                          : m.tipo === 'nascimento' ? 'good'
                          : m.tipo === 'compra' ? 'info'
                          : 'default'
                        }
                      >
                        {TIPO_MOV_LABEL[m.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.brinco}</TableCell>
                    <TableCell>{CATEGORIA_LABEL[m.categoria]}</TableCell>
                    <TableCell className="tnum text-right">{m.quantidade}</TableCell>
                    <TableCell className="text-muted-foreground">{m.origem ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{m.destino ?? '—'}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{m.obs ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <NovoAnimalDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
    </div>
  )
}

function NovoAnimalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lotes, addAnimal } = useStore()
  const [brinco, setBrinco] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('vaca')
  const [raca, setRaca] = useState<'Nelore' | 'Nelore PO'>('Nelore')
  const [nascimento, setNascimento] = useState('')
  const [loteId, setLoteId] = useState('L-SR')
  const [peso, setPeso] = useState('')
  const [origem, setOrigem] = useState<'nascimento' | 'compra'>('compra')

  const salvar = () => {
    if (!brinco || !nascimento || !peso) return
    const sexo = ['bezerra', 'novilha_13_24', 'novilha_24', 'vaca'].includes(categoria) ? 'F' : 'M'
    const novo: Animal = {
      id: `A-M${Date.now()}`,
      brinco,
      sexo,
      categoria,
      raca,
      nascimento,
      loteId,
      pesoAtual: Number(peso),
      pesagens: [{ data: hojeISO(), peso: Number(peso) }],
      sanitario: [],
      status: 'ativo',
    }
    addAnimal(novo, {
      data: hojeISO(),
      tipo: origem,
      brinco,
      categoria,
      quantidade: 1,
      destino: lotes.find((l) => l.id === loteId)?.nome,
      obs: 'Cadastro manual',
    })
    setBrinco(''); setPeso(''); setNascimento('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Novo animal">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Brinco">
          <Input value={brinco} onChange={(e) => setBrinco(e.target.value)} placeholder="V-0500" />
        </FormRow>
        <FormRow label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Raça">
          <Select value={raca} onChange={(e) => setRaca(e.target.value as 'Nelore' | 'Nelore PO')}>
            <option value="Nelore">Nelore</option>
            <option value="Nelore PO">Nelore PO</option>
          </Select>
        </FormRow>
        <FormRow label="Nascimento">
          <Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
        </FormRow>
        <FormRow label="Lote">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Peso (kg)">
          <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="320" />
        </FormRow>
        <FormRow label="Origem da entrada">
          <Select value={origem} onChange={(e) => setOrigem(e.target.value as 'nascimento' | 'compra')}>
            <option value="compra">Compra</option>
            <option value="nascimento">Nascimento</option>
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
