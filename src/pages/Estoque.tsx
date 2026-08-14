import { useMemo, useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { CategoriaInsumo } from '@/data/types'
import { addDays } from '@/data/seed'
import { fmtBRL, fmtDate, fmtNum, hojeISO } from '@/lib/format'

const CAT_LABEL: Record<CategoriaInsumo, string> = {
  semen: 'Sêmen',
  medicamento: 'Medicamentos',
  vacina: 'Vacinas',
  sal_mineral: 'Sal mineral',
  racao: 'Ração / suplemento',
  defensivo: 'Defensivos',
  hormonio: 'Hormônios',
}

export default function Estoque() {
  const state = useStore()
  const [filtroCat, setFiltroCat] = useState('')
  const [saidaOpen, setSaidaOpen] = useState(false)

  const hoje = hojeISO()
  const limiteValidade = addDays(hoje, 60)

  const itens = useMemo(
    () => state.estoque.filter((it) => !filtroCat || it.categoria === filtroCat),
    [state.estoque, filtroCat],
  )

  const abaixoMinimo = state.estoque.filter((it) => it.minimo > 0 && it.saldo < it.minimo)
  const vencendo = state.estoque.filter((it) => it.validade && it.validade <= limiteValidade && it.saldo > 0)
  const valorTotal = state.estoque.reduce((s, it) => s + it.saldo * it.custoMedio, 0)

  const nomeItem = (id: string) => state.estoque.find((i) => i.id === id)?.nome ?? id
  const movsOrdenados = [...state.movEstoque].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Insumos, saldos, validade e movimentação"
        actions={
          <Button onClick={() => setSaidaOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar saída (consumo)
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Itens cadastrados" value={fmtNum(state.estoque.length)} detail={`${Object.keys(CAT_LABEL).length} categorias`} />
        <StatCard label="Valor em estoque" value={fmtBRL(valorTotal)} detail="pelo custo médio" />
        <StatCard label="Abaixo do mínimo" value={fmtNum(abaixoMinimo.length)} detail={abaixoMinimo.map((i) => i.nome).join(', ') || 'nenhum'} tone={abaixoMinimo.length > 0 ? 'warning' : 'good'} />
        <StatCard label="Vencendo em 60 dias" value={fmtNum(vencendo.length)} detail={vencendo.map((i) => i.nome).join(', ') || 'nenhum'} tone={vencendo.length > 0 ? 'warning' : 'good'} />
      </div>

      <Tabs defaultValue="saldos">
        <TabsList>
          <TabsTrigger value="saldos">Saldos</TabsTrigger>
          <TabsTrigger value="movimentacao">Movimentação ({fmtNum(state.movEstoque.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="saldos">
          <div className="mb-2">
            <Select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="w-52">
              <option value="">Todas as categorias</option>
              {Object.entries(CAT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Custo médio</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it) => {
                  const baixo = it.minimo > 0 && it.saldo < it.minimo
                  const vence = it.validade && it.validade <= limiteValidade && it.saldo > 0
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{CAT_LABEL[it.categoria]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {it.botijao ? `Botijão ${it.botijao} · caneca ${it.caneca}` : '—'}
                      </TableCell>
                      <TableCell className="tnum text-right font-semibold">{fmtNum(it.saldo)}</TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{it.minimo > 0 ? fmtNum(it.minimo) : '—'}</TableCell>
                      <TableCell>{it.unidade}</TableCell>
                      <TableCell className="tnum">{fmtDate(it.validade)}</TableCell>
                      <TableCell className="tnum text-right">{it.custoMedio > 0 ? fmtBRL(it.custoMedio) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {baixo && <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Mínimo</Badge>}
                          {vence && <Badge variant="critical"><AlertTriangle className="h-3 w-3" /> Validade</Badge>}
                          {!baixo && !vence && <Badge variant="good">OK</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimentacao">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor unit.</TableHead>
                  <TableHead>Origem / destino</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movsOrdenados.map((mv) => {
                  const pedido = mv.pedidoId ? state.pedidos.find((p) => p.id === mv.pedidoId) : undefined
                  return (
                    <TableRow key={mv.id}>
                      <TableCell className="tnum">{fmtDate(mv.data)}</TableCell>
                      <TableCell>
                        <Badge variant={mv.tipo === 'entrada' ? 'good' : 'info'}>
                          {mv.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{nomeItem(mv.itemId)}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum(mv.quantidade)}</TableCell>
                      <TableCell className="tnum text-right">{mv.valorUnitario !== undefined ? fmtBRL(mv.valorUnitario) : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {mv.tipo === 'entrada' ? `Pedido ${pedido?.numero ?? mv.pedidoId ?? '—'}` : mv.loteDestino ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">{mv.obs ?? '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Entradas vêm de pedidos recebidos em Compras; saídas de sêmen espelham as doses dos protocolos IATF.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NovaSaidaDialog open={saidaOpen} onClose={() => setSaidaOpen(false)} />
    </div>
  )
}

function NovaSaidaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estoque, lotes, addSaidaEstoque } = useStore()
  const [itemId, setItemId] = useState(estoque[0]?.id ?? '')
  const [qtd, setQtd] = useState('')
  const [lote, setLote] = useState('Rebanho geral')
  const [obs, setObs] = useState('')

  const item = estoque.find((i) => i.id === itemId)

  const salvar = () => {
    const q = Number(qtd)
    if (!itemId || !q || q <= 0) return
    addSaidaEstoque({ data: hojeISO(), itemId, quantidade: q, loteDestino: lote, obs: obs || undefined })
    setQtd(''); setObs('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar saída de estoque">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Insumo">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {estoque.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} (saldo {fmtNum(i.saldo)} {i.unidade})</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label={`Quantidade${item ? ` (${item.unidade})` : ''}`}>
          <Input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </FormRow>
        <FormRow label="Lote / destino do consumo">
          <Select value={lote} onChange={(e) => setLote(e.target.value)}>
            <option value="Rebanho geral">Rebanho geral</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.nome}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Observação">
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional" />
        </FormRow>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
