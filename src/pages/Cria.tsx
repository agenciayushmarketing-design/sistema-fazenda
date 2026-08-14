import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from '@/components/ui/table'
import { usePagination } from '@/hooks/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { metricasCria } from '@/lib/metrics'
import { fmtDate, fmtKg1, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'
import type { Parto } from '@/data/types'

export default function Cria() {
  const state = useStore()
  const removeParto = useStore((s) => s.removeParto)
  const m = metricasCria(state)
  const [partoOpen, setPartoOpen] = useState(false)
  const [desmameOpen, setDesmameOpen] = useState(false)
  const [partoExcluir, setPartoExcluir] = useState<Parto | null>(null)

  const partosOrdenados = [...state.partos].sort((a, b) => b.data.localeCompare(a.data))
  const desmamesOrdenados = [...state.desmames].sort((a, b) => b.data.localeCompare(a.data))
  const partosPag = usePagination(partosOrdenados, 50)
  const desmamesPag = usePagination(desmamesOrdenados, 50)

  return (
    <div>
      <PageHeader
        title="Cria"
        subtitle="Estação de monta, partos, desmame e indicadores da safra"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDesmameOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar desmame
            </Button>
            <Button onClick={() => setPartoOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar parto
            </Button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Taxa de natalidade" value={fmtPct(m.natalidadePct)} detail={`${m.partos} partos / ${state.estacoes[0]?.matrizesExpostas} expostas`} />
        <StatCard label="Mortalidade pré-desmame" value={fmtPct(m.mortalidadePct)} detail={`${m.mortes} mortes`} tone={m.mortalidadePct > 6 ? 'critical' : undefined} />
        <StatCard label="Peso desmame aj. 205d" value={fmtKg1(m.pesoDesmame205)} detail={`${m.desmamados} desmamados`} />
        <StatCard label="Intervalo entre partos" value={`${m.intervaloPartosDias} dias`} detail="média das matrizes" />
        <StatCard label="Kg bezerro / matriz" value={fmtKg1(m.kgBezerroPorMatriz)} detail="desmamado por exposta" />
        <StatCard label="Taxa de desmame" value={fmtPct(m.taxaDesmamePct)} detail="projetada (vivos/expostas)" />
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-2">
        {state.estacoes.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-[13px] font-semibold">{e.nome}</div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtDate(e.inicio)} — {fmtDate(e.fim)} · {fmtNum(e.matrizesExpostas)} matrizes expostas
                </div>
              </div>
              <Badge variant={e.status === 'em_andamento' ? 'good' : 'default'}>
                {e.status === 'em_andamento' ? 'Em andamento' : 'Encerrada'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="partos">
        <TabsList>
          <TabsTrigger value="partos">Partos ({fmtNum(state.partos.length)})</TabsTrigger>
          <TabsTrigger value="desmames">Desmames ({fmtNum(state.desmames.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="partos">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Bezerro(a)</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead className="text-right">Peso ao nascer</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partosPag.pageItems.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tnum">{fmtDate(p.data)}</TableCell>
                    <TableCell className="font-medium">{p.matrizBrinco}</TableCell>
                    <TableCell>{p.bezerroBrinco}</TableCell>
                    <TableCell>{p.sexo}</TableCell>
                    <TableCell className="tnum text-right">{fmtKg1(p.pesoNascer)}</TableCell>
                    <TableCell>
                      <Badge variant={p.dificuldade === 1 ? 'default' : p.dificuldade <= 2 ? 'warning' : 'critical'}>
                        Escore {p.dificuldade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                        title="Excluir parto"
                        aria-label={`Excluir parto de ${p.matrizBrinco}`}
                        onClick={() => setPartoExcluir(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...partosPag} />
          </div>
        </TabsContent>

        <TabsContent value="desmames">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Bezerro(a)</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Idade (dias)</TableHead>
                  <TableHead className="text-right">Peso aj. 205d</TableHead>
                  <TableHead>Lote de destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {desmamesPag.pageItems.map((d) => {
                  const parto = state.partos.find((p) => p.bezerroBrinco === d.bezerroBrinco)
                  const nascer = parto?.pesoNascer ?? 32
                  const aj205 = nascer + ((d.peso - nascer) / d.idadeDias) * 205
                  const lote = state.lotes.find((l) => l.id === d.loteDestinoId)
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="tnum">{fmtDate(d.data)}</TableCell>
                      <TableCell className="font-medium">{d.bezerroBrinco}</TableCell>
                      <TableCell className="tnum text-right">{fmtKg1(d.peso)}</TableCell>
                      <TableCell className="tnum text-right">{d.idadeDias}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum1(aj205)} kg</TableCell>
                      <TableCell className="text-muted-foreground">{lote?.nome ?? d.loteDestinoId}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination {...desmamesPag} />
          </div>
        </TabsContent>
      </Tabs>

      <NovoPartoDialog open={partoOpen} onClose={() => setPartoOpen(false)} />
      <NovoDesmameDialog open={desmameOpen} onClose={() => setDesmameOpen(false)} />

      <ConfirmDialog
        open={partoExcluir !== null}
        onClose={() => setPartoExcluir(null)}
        onConfirm={() => {
          if (!partoExcluir) return
          const r = removeParto(partoExcluir.id)
          if (r.ok) {
            toast(`Parto de ${partoExcluir.matrizBrinco} excluído — bezerro removido do Rebanho.`)
          } else {
            toast(r.erro ?? 'Não foi possível excluir.', 'error')
          }
        }}
        title="Excluir parto"
        confirmLabel="Excluir"
        tone="destructive"
      >
        Excluir o parto de <strong>{partoExcluir?.matrizBrinco}</strong> ({partoExcluir?.bezerroBrinco})?
        O bezerro e a movimentação de nascimento também serão removidos do Rebanho.
      </ConfirmDialog>
    </div>
  )
}

function NovoPartoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addParto = useStore((s) => s.addParto)
  const estacoes = useStore((s) => s.estacoes)
  const [data, setData] = useState(hojeISO())
  const [matriz, setMatriz] = useState('')
  const [bezerro, setBezerro] = useState('')
  const [sexo, setSexo] = useState<'M' | 'F'>('M')
  const [peso, setPeso] = useState('32')
  const [dif, setDif] = useState('1')

  const salvar = () => {
    if (!matriz || !bezerro) return
    addParto({
      data,
      matrizBrinco: matriz,
      bezerroBrinco: bezerro,
      sexo,
      pesoNascer: Number(peso),
      dificuldade: Number(dif) as 1 | 2 | 3 | 4 | 5,
      estacaoId: estacoes.find((e) => e.status === 'encerrada')?.id ?? 'EM-2425',
    })
    toast(`Parto registrado — ${bezerro} criado automaticamente no Rebanho.`)
    setMatriz(''); setBezerro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar parto">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Matriz (brinco)"><Input value={matriz} onChange={(e) => setMatriz(e.target.value)} placeholder="V-0123" /></FormRow>
        <FormRow label="Brinco do bezerro"><Input value={bezerro} onChange={(e) => setBezerro(e.target.value)} placeholder="BZ-401" /></FormRow>
        <FormRow label="Sexo">
          <Select value={sexo} onChange={(e) => setSexo(e.target.value as 'M' | 'F')}>
            <option value="M">Macho</option>
            <option value="F">Fêmea</option>
          </Select>
        </FormRow>
        <FormRow label="Peso ao nascer (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} /></FormRow>
        <FormRow label="Escore de dificuldade (1–5)">
          <Select value={dif} onChange={(e) => setDif(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} — {n === 1 ? 'sem auxílio' : n === 5 ? 'cesariana' : 'auxílio'}</option>
            ))}
          </Select>
        </FormRow>
      </div>
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        O bezerro é criado automaticamente no Rebanho (lote da matriz) e registrado no livro de movimentação.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}

function NovoDesmameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { partos, lotesRecria, addDesmame } = useStore()
  const [data, setData] = useState(hojeISO())
  const [brinco, setBrinco] = useState('')
  const [peso, setPeso] = useState('195')
  const [loteId, setLoteId] = useState('R1')
  const [erro, setErro] = useState('')

  const salvar = () => {
    if (!brinco) return
    const parto = partos.find((p) => p.bezerroBrinco === brinco)
    const idade = parto ? Math.max(1, Math.round((new Date(data).getTime() - new Date(parto.data).getTime()) / 86400000)) : 210
    const r = addDesmame({ data, bezerroBrinco: brinco.trim(), peso: Number(peso), idadeDias: idade, loteDestinoId: loteId })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar o desmame.')
      return
    }
    toast(`Desmame registrado — ${brinco.trim()} transferido para o lote de recria.`)
    setBrinco(''); setErro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar desmame">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Brinco do bezerro"><Input value={brinco} onChange={(e) => setBrinco(e.target.value)} placeholder="BZ-023" /></FormRow>
        <FormRow label="Peso ao desmame (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} /></FormRow>
        <FormRow label="Lote de destino">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {lotesRecria.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
        </FormRow>
      </div>
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        O animal é movido para o lote de destino e a pesagem do desmame entra na ficha individual.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
