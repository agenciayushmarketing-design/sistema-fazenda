import { useState } from 'react'
import { Plus, Trash2, Scissors } from 'lucide-react'
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
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { apartacoesPorMes, intervaloPartosPorMatriz, metricasCria, previsaoApartacao, DIAS_POR_MES } from '@/lib/metrics'
import { addDays } from '@/data/seed'
import { fmtBRL, fmtDate, fmtIdade, fmtKg, fmtKg1, fmtMesAno, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import type { Parto } from '@/data/types'

export default function Cria() {
  const state = useStore()
  const removeParto = useStore((s) => s.removeParto)
  const updateConfig = useStore((s) => s.updateConfig)
  const m = metricasCria(state)
  const [partoOpen, setPartoOpen] = useState(false)
  const [desmameOpen, setDesmameOpen] = useState(false)
  const [apartarOpen, setApartarOpen] = useState(false)
  const [partoExcluir, setPartoExcluir] = useState<Parto | null>(null)

  const partosOrdenados = [...state.partos].sort((a, b) => b.data.localeCompare(a.data))
  const desmamesOrdenados = [...state.desmames].sort((a, b) => b.data.localeCompare(a.data))
  const partosPag = usePagination(partosOrdenados, 50)
  const desmamesPag = usePagination(desmamesOrdenados, 50)

  const apartacoes = previsaoApartacao(state)
  const apartMeses = apartacoesPorMes(state)
  const apartPag = usePagination(apartacoes, 50)
  const ips = intervaloPartosPorMatriz(state)
  const ipsPag = usePagination(ips, 50)

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
        <StatCard
          label="Intervalo entre partos"
          value={m.intervaloPartosDias > 0 ? `${fmtNum1(m.intervaloPartosMeses)} meses` : '—'}
          detail={`${m.intervaloPartosDias} dias · média de ${m.matrizesComIP} matrizes`}
          tone={m.intervaloPartosMeses > state.config.toleranciaIPMeses ? 'critical' : undefined}
          hint={`Tempo médio entre um parto e o seguinte da mesma matriz. Acima de ${state.config.toleranciaIPMeses} meses (tolerância configurável), a vaca é marcada para descarte.`}
        />
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
          <TabsTrigger value="apartacao">Previsão de apartação ({fmtNum(apartacoes.length)})</TabsTrigger>
          <TabsTrigger value="ip">IP por matriz ({fmtNum(ips.length)})</TabsTrigger>
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
                  const destinoNome = lote?.nome ?? (d.loteDestinoId === 'VENDA' ? 'Venda na apartação' : d.loteDestinoId)
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="tnum">{fmtDate(d.data)}</TableCell>
                      <TableCell className="font-medium">{d.bezerroBrinco}</TableCell>
                      <TableCell className="tnum text-right">{fmtKg1(d.peso)}</TableCell>
                      <TableCell className="tnum text-right">{d.idadeDias}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum1(aj205)} kg</TableCell>
                      <TableCell className="text-muted-foreground">{destinoNome}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination {...desmamesPag} />
          </div>
        </TabsContent>

        <TabsContent value="apartacao">
          <div className="mb-2 flex justify-end">
            <Button onClick={() => setApartarOpen(true)}>
              <Scissors className="h-3.5 w-3.5" /> Apartar bezerros
            </Button>
          </div>
          <div className="mb-3 rounded-lg border bg-card px-4 pt-3 pb-1">
            <div className="text-[13px] font-semibold">Bezerros a apartar por mês (previsão aos 8 meses)</div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={apartMeses} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="mes" tickFormatter={fmtMesAno} {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtMesAno(String(v))} formatter={(v) => [String(v), 'Bezerros']} />
                <Bar dataKey="qtd" name="Bezerros" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#52514e' }}>
                  {apartMeses.map((_, i) => (
                    <Cell key={i} fill={SERIES[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezerro(a)</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead className="text-right">Peso atual</TableHead>
                  <TableHead>Apartação prevista</TableHead>
                  <TableHead className="text-right">Peso projetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartPag.pageItems.map((p) => (
                  <TableRow key={p.animal.id}>
                    <TableCell className="font-medium">{p.animal.brinco}</TableCell>
                    <TableCell>{p.animal.sexo}</TableCell>
                    <TableCell className="text-muted-foreground">{p.animal.maeBrinco ?? '—'}</TableCell>
                    <TableCell className="tnum">{fmtDate(p.animal.nascimento)}</TableCell>
                    <TableCell className="tnum">{fmtIdade(p.animal.nascimento)}</TableCell>
                    <TableCell className="tnum text-right">{fmtKg(p.animal.pesoAtual)}</TableCell>
                    <TableCell>
                      <span className="tnum">{fmtDate(p.dataPrevista)}</span>{' '}
                      <Badge variant={p.diasRestantes <= 30 ? 'warning' : 'default'}>
                        {p.diasRestantes <= 0 ? 'no ponto' : `${p.diasRestantes} d`}
                      </Badge>
                    </TableCell>
                    <TableCell className="tnum text-right">{fmtKg(p.pesoProjetado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...apartPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              Apartação prevista = nascimento + 8 meses (240 dias). Peso projetado assume ganho de
              0,72 kg/dia ao pé até a data.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ip">
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Tolerância de IP (meses) — acima disso a matriz fica em vermelho para descarte:
            </span>
            <Input
              type="number"
              min="10"
              max="36"
              value={state.config.toleranciaIPMeses}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (v >= 10 && v <= 36) updateConfig({ toleranciaIPMeses: v })
              }}
              className="w-20"
              aria-label="Tolerância de IP em meses"
            />
            <span className="tnum text-xs text-muted-foreground">
              {fmtNum(ips.filter((ip) => ip.ipDias / DIAS_POR_MES > state.config.toleranciaIPMeses).length)}{' '}
              matriz(es) acima do limite
            </span>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Parto anterior</TableHead>
                  <TableHead>Parto atual</TableHead>
                  <TableHead className="text-right">IP (meses)</TableHead>
                  <TableHead className="text-right">IP (dias)</TableHead>
                  <TableHead>Avaliação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipsPag.pageItems.map((ip) => {
                  const meses = ip.ipDias / DIAS_POR_MES
                  const estourou = meses > state.config.toleranciaIPMeses
                  const atencao = !estourou && meses > state.config.toleranciaIPMeses - 2
                  return (
                    <TableRow key={ip.matrizBrinco} className={estourou ? 'bg-red-50/60 hover:bg-red-50' : ''}>
                      <TableCell className={`font-medium ${estourou ? 'text-red-700' : ''}`}>{ip.matrizBrinco}</TableCell>
                      <TableCell className="tnum">{fmtDate(ip.partoAnterior)}</TableCell>
                      <TableCell className="tnum">{fmtDate(ip.partoAtual)}</TableCell>
                      <TableCell className={`tnum text-right font-semibold ${estourou ? 'text-red-700' : ''}`}>
                        {fmtNum1(meses)}
                      </TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{ip.ipDias}</TableCell>
                      <TableCell>
                        <Badge variant={estourou ? 'critical' : atencao ? 'warning' : 'good'}>
                          {estourou ? 'Descarte' : atencao ? 'Atenção' : 'Boa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination {...ipsPag} />
            <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              IP = meses entre o parto da safra anterior e o da safra atual, matriz a matriz. Tolerância
              atual: {state.config.toleranciaIPMeses} meses (configurável acima). Média do rebanho:{' '}
              {fmtNum1(m.intervaloPartosMeses)} meses ({m.intervaloPartosDias} dias). As matrizes em
              vermelho também aparecem na lista de descarte, em Reprodução.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NovoPartoDialog open={partoOpen} onClose={() => setPartoOpen(false)} />
      <NovoDesmameDialog open={desmameOpen} onClose={() => setDesmameOpen(false)} />
      <ApartarDialog open={apartarOpen} onClose={() => setApartarOpen(false)} />

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

function ApartarDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore()
  const apartarBezerros = useStore((s) => s.apartarBezerros)
  const [sexo, setSexo] = useState<'' | 'M' | 'F'>('')
  const [qtd, setQtd] = useState('')
  const [destino, setDestino] = useState<'recria' | 'venda'>(state.lotesRecria.length > 0 ? 'recria' : 'venda')
  const [loteId, setLoteId] = useState(state.lotesRecria[0]?.id ?? '')
  const [valor, setValor] = useState('')
  const [comprador, setComprador] = useState('')
  const [condicao, setCondicao] = useState<'vista' | 'prazo'>('vista')
  const [vencimento, setVencimento] = useState(addDays(hojeISO(), 30))
  const [erro, setErro] = useState('')

  const previsao = previsaoApartacao(state).filter((p) => !sexo || p.animal.sexo === sexo)
  const noPonto = previsao.filter((p) => p.diasRestantes <= 0).length
  const q = Number(qtd)
  const v = Number(valor)
  const porCabeca = q > 0 && v > 0 ? v / q : 0

  const salvar = () => {
    if (destino === 'venda' && condicao === 'prazo' && vencimento <= hojeISO()) {
      setErro('Para venda a prazo, o vencimento precisa ser uma data futura.')
      return
    }
    const r = apartarBezerros({
      qtd: q,
      sexo: sexo || undefined,
      destino,
      loteId: destino === 'recria' ? loteId : undefined,
      valorTotal: destino === 'venda' ? v : undefined,
      comprador: comprador.trim() || undefined,
      vencimento: destino === 'venda' && condicao === 'prazo' ? vencimento : undefined,
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível apartar.')
      return
    }
    toast(
      destino === 'recria'
        ? `${r.qtd} bezerro(s) apartado(s) para o lote de recria — desmames registrados.`
        : condicao === 'prazo'
          ? `${r.qtd} bezerro(s) apartado(s) e vendido(s) — ${fmtBRL(v)} a receber em ${fmtDate(vencimento)}.`
          : `${r.qtd} bezerro(s) apartado(s) e vendido(s) — receita de ${fmtBRL(v)} no Financeiro.`,
    )
    setQtd(''); setValor(''); setComprador(''); setErro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Apartar bezerros">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Sexo">
          <Select value={sexo} onChange={(e) => setSexo(e.target.value as '' | 'M' | 'F')}>
            <option value="">Machos e fêmeas</option>
            <option value="M">Só machos</option>
            <option value="F">Só fêmeas</option>
          </Select>
        </FormRow>
        <FormRow label={`Quantidade (no ponto: ${fmtNum(noPonto)} · ao pé: ${fmtNum(previsao.length)})`}>
          <Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder={String(noPonto || previsao.length)} />
        </FormRow>
        <FormRow label="Destino da apartação">
          <Select value={destino} onChange={(e) => setDestino(e.target.value as 'recria' | 'venda')}>
            {state.lotesRecria.length > 0 && <option value="recria">Transferir para lote de recria</option>}
            <option value="venda">Vender na apartação</option>
          </Select>
        </FormRow>
        {destino === 'recria' ? (
          <FormRow label="Lote de recria">
            <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              {state.lotesRecria.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </Select>
          </FormRow>
        ) : (
          <>
            <FormRow label="Valor total da venda (R$)">
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="45000" />
            </FormRow>
            <FormRow label="Comprador (opcional)">
              <Input value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="Recria Forte Ltda" />
            </FormRow>
            <FormRow label="Condição de pagamento">
              <Select value={condicao} onChange={(e) => setCondicao(e.target.value as 'vista' | 'prazo')}>
                <option value="vista">À vista (recebido hoje)</option>
                <option value="prazo">A prazo (a receber)</option>
              </Select>
            </FormRow>
            {condicao === 'prazo' && (
              <FormRow label="Vencimento">
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </FormRow>
            )}
          </>
        )}
      </div>
      {porCabeca > 0 && destino === 'venda' && (
        <p className="tnum mt-2 text-xs text-muted-foreground">≈ {fmtBRL(porCabeca)} por cabeça</p>
      )}
      {erro && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
          {erro}
        </p>
      )}
      <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">
        Aparta sempre os mais velhos primeiro. Cada bezerro ganha registro de desmame com o peso atual;{' '}
        {destino === 'recria'
          ? 'os animais mudam para o lote de recria escolhido.'
          : 'a venda entra no livro e a receita no Financeiro.'}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Apartar</Button>
      </div>
    </Dialog>
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
      estacaoId: estacoes.find((e) => e.status === 'encerrada')?.id ?? 'EM-PASS',
    })
    toast(`Parto registrado — ${bezerro} criado automaticamente no Rebanho.`)
    setMatriz(''); setBezerro('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar parto">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
