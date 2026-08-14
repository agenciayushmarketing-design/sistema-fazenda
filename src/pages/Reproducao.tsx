import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, StatCard, ChartCard, FormRow } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { metricasReproducao } from '@/lib/metrics'
import { addDays } from '@/data/seed'
import { fmtBRL, fmtDate, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'

export default function Reproducao() {
  const state = useStore()
  const updateDiagnostico = useStore((s) => s.updateDiagnostico)
  const m = metricasReproducao(state)
  const [dgOpen, setDgOpen] = useState(false)

  const dgsPendentes = state.diagnosticos.filter((d) => d.resultado === 'pendente')
  const dgsFeitos = state.diagnosticos.filter((d) => d.resultado !== 'pendente')

  return (
    <div>
      <PageHeader
        title="Reprodução"
        subtitle={m.estacao ? `${m.estacao.nome} · ${fmtDate(m.estacao.inicio)} — ${fmtDate(m.estacao.fim)}` : 'Estação de monta'}
        actions={
          <Button onClick={() => setDgOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Lançar diagnóstico
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Prenhez IATF" value={fmtPct(m.prenhezIATFPct)} detail={`${m.prenhasIATF}/${m.dosesIATF} doses`} />
        <StatCard label="Prenhez acumulada" value={fmtPct(m.prenhezFinalPct)} detail={`${m.prenhasTotal}/${m.expostas} expostas`} />
        <StatCard label="Prenhez de repasse" value={fmtNum(m.prenhasTouro)} detail="confirmadas por touro" />
        <StatCard label="DG pendente" value={fmtNum(m.pendentes)} detail="matrizes sem diagnóstico" tone={m.pendentes > 0 ? 'warning' : undefined} />
        <StatCard label="ECC médio das matrizes" value={fmtNum1(3.1)} detail="escore 1–5" />
        <StatCard label="Custo por prenhez" value={fmtBRL(m.custoPorPrenhez)} detail="sêmen + hormônios" />
      </div>

      <div className="mb-3 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Distribuição de prenhez por terço da estação" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={m.prenhezPorTerco} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="terco" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="prenhezes" name="Prenhezes" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#52514e' }}>
                {m.prenhezPorTerco.map((_, i) => (
                  <Cell key={i} fill={SERIES[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Concentração no 1º terço = mais bezerros no início da próxima safra e lotes de desmame mais uniformes.
          </p>
        </ChartCard>

        <Card>
          <CardHeader><CardTitle>Touros de repasse — índice de prenhez</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Touro</TableHead>
                  <TableHead className="text-right">Vacas</TableHead>
                  <TableHead className="text-right">Prenhezes</TableHead>
                  <TableHead className="text-right pr-4">Índice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.tourosRepasse.map((t) => (
                  <TableRow key={t.brinco}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{t.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{t.brinco}</div>
                    </TableCell>
                    <TableCell className="tnum text-right">{t.vacasRepasse}</TableCell>
                    <TableCell className="tnum text-right">{t.prenhezesRepasse}</TableCell>
                    <TableCell className="tnum text-right pr-4 font-semibold">
                      {fmtPct((t.prenhezesRepasse / t.vacasRepasse) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="protocolos">
        <TabsList>
          <TabsTrigger value="protocolos">Protocolos IATF ({state.protocolosIATF.length})</TabsTrigger>
          <TabsTrigger value="dg">Diagnósticos ({fmtNum(dgsFeitos.length)})</TabsTrigger>
          <TabsTrigger value="pendentes">DG pendente ({fmtNum(dgsPendentes.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="protocolos">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>D0</TableHead>
                  <TableHead>IA</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Inseminador</TableHead>
                  <TableHead>Touro / sêmen</TableHead>
                  <TableHead className="text-right">Matrizes</TableHead>
                  <TableHead className="text-right">Doses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.protocolosIATF.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.loteDescricao}</TableCell>
                    <TableCell className="tnum">{fmtDate(p.dataInicio)}</TableCell>
                    <TableCell className="tnum">{fmtDate(p.dataIA)}</TableCell>
                    <TableCell>{p.produto}</TableCell>
                    <TableCell>{p.inseminador}</TableCell>
                    <TableCell>{p.touroSemen}</TableCell>
                    <TableCell className="tnum text-right">{p.matrizes}</TableCell>
                    <TableCell className="tnum text-right">{p.doses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              As doses aplicadas geram saída automática no Estoque de sêmen (rastreável na aba Estoque).
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dg">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>DPP estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dgsFeitos.slice(0, 150).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="tnum">{fmtDate(d.data)}</TableCell>
                    <TableCell className="font-medium">{d.matrizBrinco}</TableCell>
                    <TableCell>
                      <Badge variant={d.resultado === 'prenha' ? 'good' : 'critical'}>
                        {d.resultado === 'prenha' ? 'Prenha' : 'Vazia'}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.origemPrenhez === 'IATF' ? 'IATF' : d.origemPrenhez === 'touro' ? 'Repasse (touro)' : '—'}</TableCell>
                    <TableCell className="tnum">{fmtDate(d.dppEstimado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {dgsFeitos.length > 150 && (
              <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                Exibindo 150 de {fmtNum(dgsFeitos.length)} diagnósticos.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pendentes">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação rápida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dgsPendentes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.matrizBrinco}</TableCell>
                    <TableCell><Badge variant="warning">DG pendente</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            updateDiagnostico(d.id, {
                              resultado: 'prenha',
                              data: hojeISO(),
                              origemPrenhez: 'touro',
                              dataConcepcao: addDays(hojeISO(), -45),
                              dppEstimado: addDays(hojeISO(), 283 - 45),
                            })
                          }
                        >
                          Prenha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateDiagnostico(d.id, { resultado: 'vazia', data: hojeISO() })}
                        >
                          Vazia
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {dgsPendentes.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-muted-foreground">Nenhum diagnóstico pendente.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <NovoDGDialog open={dgOpen} onClose={() => setDgOpen(false)} />
    </div>
  )
}

function NovoDGDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { estacoes, addDiagnostico } = useStore()
  const [matriz, setMatriz] = useState('')
  const [resultado, setResultado] = useState<'prenha' | 'vazia'>('prenha')
  const [origem, setOrigem] = useState<'IATF' | 'touro'>('touro')
  const [concepcao, setConcepcao] = useState(addDays(hojeISO(), -45))

  const salvar = () => {
    if (!matriz) return
    addDiagnostico({
      data: hojeISO(),
      matrizBrinco: matriz,
      resultado,
      origemPrenhez: resultado === 'prenha' ? origem : undefined,
      dataConcepcao: resultado === 'prenha' ? concepcao : undefined,
      dppEstimado: resultado === 'prenha' ? addDays(concepcao, 283) : undefined,
      estacaoId: estacoes.find((e) => e.status === 'em_andamento')?.id ?? 'EM-2526',
    })
    setMatriz('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Lançar diagnóstico de gestação">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Matriz (brinco)"><Input value={matriz} onChange={(e) => setMatriz(e.target.value)} placeholder="V-0042" /></FormRow>
        <FormRow label="Resultado">
          <Select value={resultado} onChange={(e) => setResultado(e.target.value as 'prenha' | 'vazia')}>
            <option value="prenha">Prenha</option>
            <option value="vazia">Vazia</option>
          </Select>
        </FormRow>
        {resultado === 'prenha' && (
          <>
            <FormRow label="Origem">
              <Select value={origem} onChange={(e) => setOrigem(e.target.value as 'IATF' | 'touro')}>
                <option value="IATF">IATF</option>
                <option value="touro">Repasse (touro)</option>
              </Select>
            </FormRow>
            <FormRow label="Data estimada de concepção">
              <Input type="date" value={concepcao} onChange={(e) => setConcepcao(e.target.value)} />
            </FormRow>
          </>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar</Button>
      </div>
    </Dialog>
  )
}
