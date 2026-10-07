import { useState, type ChangeEvent } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ArrowLeft, Baby, Camera, LogOut, Pencil, Plus, Scale, Scissors, Stethoscope, Syringe } from 'lucide-react'
import { reduzirFoto } from '@/lib/imagem'
import { useStore, type Store } from '@/store/useStore'
import { PageHeader, ChartCard, FormRow, StatCard } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { DesmameDialog, EventoAnimalDialog, PartoDialog, PesagemAnimalDialog } from '@/components/AnimalDialogs'
import { CATEGORIA_LABEL, type Animal, type Categoria, type Desmame, type EventoSanitario, type Movimentacao, type Parto } from '@/data/types'
import { addDays, CUSTO_DIA_FASE, diffDays, KG_POR_ARROBA } from '@/data/seed'
import { eficienciaMatrizes, nomeMembro } from '@/lib/metrics'
import { custoAcumuladoAnimal, projecaoPeso } from '@/lib/gestao'
import { fmtArroba, fmtBRL, fmtDate, fmtDateShort, fmtGMD, fmtIdade, fmtKg1, fmtNum, fmtNum1, fmtNum2, fmtPct, hojeISO } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'

export default function FichaAnimal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useStore()
  const [searchParams] = useSearchParams()
  const [editOpen, setEditOpen] = useState(false)
  const [saidaOpen, setSaidaOpen] = useState(false)
  const [pesarOpen, setPesarOpen] = useState(false)
  const [desmameOpen, setDesmameOpen] = useState(false)
  const [eventoOpen, setEventoOpen] = useState<null | 'Vacinação' | 'Tratamento'>(null)
  const [partoOpen, setPartoOpen] = useState(false)

  const animal = state.animais.find((a) => a.id === id)
  if (!animal) {
    return (
      <div>
        <PageHeader title="Animal não encontrado" />
        <Link to="/rebanho" className="text-sm text-primary hover:underline">← Voltar ao rebanho</Link>
      </div>
    )
  }

  const hoje = hojeISO()
  const lote = state.lotes.find((l) => l.id === animal.loteId)
  const pasto = lote ? state.pastos.find((p) => p.id === lote.pastoId) : undefined
  const movs = state.movimentacoes.filter((m) => m.brinco === animal.brinco || faixaInclui(m.brinco, animal.brinco))
  const parto = state.partos.find((p) => p.bezerroBrinco === animal.brinco)
  const desmame = state.desmames.find((d) => d.bezerroBrinco === animal.brinco)
  const mae = animal.maeBrinco ? state.animais.find((a) => a.brinco === animal.maeBrinco) : undefined
  const pai = animal.paiNome ? state.animais.find((a) => a.categoria === 'touro' && animal.paiNome!.startsWith(a.brinco)) : undefined
  const crias = state.animais.filter((a) => a.maeBrinco === animal.brinco).sort((a, b) => b.nascimento.localeCompare(a.nascimento))
  const custo = custoAcumuladoAnimal(state, animal)
  const ativo = animal.status === 'ativo'
  const aoPe = ativo && (animal.categoria === 'bezerro' || animal.categoria === 'bezerra') && !desmame

  // situação reprodutiva (matrizes)
  const ehMatriz = animal.sexo === 'F' && (animal.categoria === 'vaca' || animal.categoria === 'novilha_24')
  const dgsMatriz = state.diagnosticos.filter((d) => d.matrizBrinco === animal.brinco).sort((a, b) => b.data.localeCompare(a.data))
  const dgAtual = dgsMatriz[0]
  const partosMatriz = [...state.partos.filter((p) => p.matrizBrinco === animal.brinco), ...state.partosAnteriores.filter((p) => p.matrizBrinco === animal.brinco)].sort((a, b) => b.data.localeCompare(a.data))
  const ipMatriz = partosMatriz.length >= 2 ? diffDays(partosMatriz[1].data, partosMatriz[0].data) : null
  const desmamesCrias = crias.map((c) => state.desmames.find((d) => d.bezerroBrinco === c.brinco)).filter(Boolean) as { peso: number }[]
  const pesoMedioDesmame = desmamesCrias.length > 0 ? desmamesCrias.reduce((s, d) => s + d.peso, 0) / desmamesCrias.length : null
  const eficiencia = ehMatriz ? eficienciaMatrizes(state).find((e) => e.vaca.id === animal.id) : undefined
  const posicaoEf = eficiencia ? eficienciaMatrizes(state).findIndex((e) => e.vaca.id === animal.id) + 1 : 0
  const totalEf = ehMatriz ? eficienciaMatrizes(state).length : 0

  const pesagens = [...animal.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  const gmdVida = pesagens.length >= 2 ? (pesagens[pesagens.length - 1].peso - pesagens[0].peso) / Math.max(1, diffDays(pesagens[0].data, pesagens[pesagens.length - 1].data)) : null
  const gmdRecente = pesagens.length >= 2 ? (pesagens[pesagens.length - 1].peso - pesagens[pesagens.length - 2].peso) / Math.max(1, diffDays(pesagens[pesagens.length - 2].data, pesagens[pesagens.length - 1].data)) : null
  const projecao = gmdRecente !== null && gmdRecente > 0 ? projecaoPeso(animal.pesoAtual, gmdRecente) : []
  const carencias = animal.sanitario.filter((e) => e.carenciaAte && e.carenciaAte >= hoje)
  const naEnfermaria = state.enfermaria.find((e) => e.animalId === animal.id && !e.saida)
  const sanitario = [...animal.sanitario].sort((a, b) => b.data.localeCompare(a.data))
  const tabParam = searchParams.get('tab') ?? ''
  const tabInicial = ['resumo', 'historico', 'pesagens', 'reproducao', 'sanidade'].includes(tabParam) ? tabParam : 'resumo'

  return (
    <div>
      <PageHeader
        title={`Ficha — ${animal.brinco}`}
        subtitle={`${CATEGORIA_LABEL[animal.categoria]} · ${animal.raca} · ${fmtIdade(animal.nascimento)} · ${lote?.nome ?? animal.loteId}${!ativo ? ` · ${animal.status === 'vendido' ? 'VENDIDO' : 'MORTO'}` : ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Button>
            {ativo && (
              <>
                <Button variant="secondary" onClick={() => setPesarOpen(true)}><Scale className="h-3.5 w-3.5" /> Pesar</Button>
                {aoPe && <Button variant="secondary" onClick={() => setDesmameOpen(true)}><Scissors className="h-3.5 w-3.5" /> Apartar</Button>}
                <Button variant="secondary" onClick={() => setEventoOpen('Vacinação')}><Syringe className="h-3.5 w-3.5" /> Vacinar</Button>
                <Button variant="secondary" onClick={() => setEventoOpen('Tratamento')}><Stethoscope className="h-3.5 w-3.5" /> Tratar</Button>
                {ehMatriz && <Button variant="secondary" onClick={() => setPartoOpen(true)}><Baby className="h-3.5 w-3.5" /> Registrar parto</Button>}
                <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                <Button variant="destructive" onClick={() => setSaidaOpen(true)}><LogOut className="h-3.5 w-3.5" /> Vender / saída</Button>
              </>
            )}
          </>
        }
      />

      {(carencias.length > 0 || naEnfermaria) && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          {naEnfermaria ? `Na enfermaria desde ${fmtDate(naEnfermaria.entrada)} — ${naEnfermaria.diagnostico}. ` : ''}
          {carencias.length > 0 ? `Em carência até ${fmtDate(carencias.map((c) => c.carenciaAte!).sort().at(-1))} (${carencias[0].produto}) — não pode ir para abate antes disso.` : ''}
        </div>
      )}

      <Tabs defaultValue={tabInicial}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({movs.length})</TabsTrigger>
          <TabsTrigger value="pesagens">Pesagens ({pesagens.length})</TabsTrigger>
          {ehMatriz && <TabsTrigger value="reproducao">Reprodução</TabsTrigger>}
          <TabsTrigger value="sanidade">Sanidade ({sanitario.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <StatCard label="Peso atual" value={fmtKg1(animal.pesoAtual)} detail={pesagens.at(-1) ? `pesado em ${fmtDate(pesagens.at(-1)!.data)}` : 'sem pesagem'} />
            <StatCard label="GMD histórico" value={gmdVida !== null ? fmtGMD(gmdVida) : '—'} detail={gmdRecente !== null ? `recente ${fmtNum2(gmdRecente)} kg/dia` : undefined} />
            <StatCard label="Arrobas" value={fmtArroba(animal.pesoAtual / KG_POR_ARROBA)} detail={custo.valorMercado > 0 ? `≈ ${fmtBRL(custo.valorMercado)} a ${fmtBRL(state.config.precoArroba ?? 0)}/@` : '30 kg PV por @'} />
            <StatCard label="Custo acumulado" value={fmtBRL(custo.total)} detail={custo.aquisicao > 0 ? `${fmtBRL(custo.aquisicao)} na aquisição` : custo.origemTexto}
              hint="Custo de aquisição (se comprado) mais os dias em cada fase pelo custo diário da fase. Configurável no Financeiro." />
            <StatCard label="Custo / kg" value={fmtBRL(custo.custoKg)} detail={`${fmtBRL(custo.custoArroba)} por @`} tone={state.config.precoArroba && custo.custoArroba > state.config.precoArroba ? 'critical' : 'good'} />
            <StatCard label="Resultado estimado" value={custo.valorMercado > 0 ? fmtBRL(custo.valorMercado - custo.total) : '—'} detail="valor de mercado − custo" tone={custo.valorMercado > 0 ? (custo.valorMercado - custo.total >= 0 ? 'good' : 'critical') : undefined} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Identificação e genealogia</CardTitle></CardHeader>
              <CardContent>
                <FotoAnimal animal={animal} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                  <dt className="text-muted-foreground">Brinco</dt><dd className="font-medium">{animal.brinco}</dd>
                  <dt className="text-muted-foreground">Sexo</dt><dd>{animal.sexo === 'M' ? 'Macho' : 'Fêmea'}</dd>
                  <dt className="text-muted-foreground">Categoria</dt><dd>{CATEGORIA_LABEL[animal.categoria]}</dd>
                  <dt className="text-muted-foreground">Raça</dt><dd>{animal.raca}{animal.raca === 'Nelore PO' ? ' (PO)' : animal.raca === 'Nelore' ? ' (comercial)' : ''}</dd>
                  <dt className="text-muted-foreground">Nascimento</dt><dd className="tnum">{fmtDate(animal.nascimento)} · {fmtIdade(animal.nascimento)}</dd>
                  <dt className="text-muted-foreground">Mãe</dt>
                  <dd>{mae ? <Link to={`/rebanho/${mae.id}`} className="font-medium text-primary hover:underline">{mae.brinco}</Link> : (animal.maeBrinco ?? '—')}</dd>
                  <dt className="text-muted-foreground">Pai</dt>
                  <dd>{pai ? <Link to={`/rebanho/${pai.id}`} className="font-medium text-primary hover:underline">{animal.paiNome}</Link> : (animal.paiNome ?? '—')}</dd>
                  <dt className="text-muted-foreground">Lote</dt><dd><Link to={`/rebanho?lote=${animal.loteId}`} className="text-primary hover:underline">{lote?.nome ?? animal.loteId}</Link></dd>
                  <dt className="text-muted-foreground">Pasto</dt><dd>{pasto?.nome ?? '—'}</dd>
                  <dt className="text-muted-foreground">Origem</dt><dd>{custo.origemTexto}</dd>
                  {animal.ecc !== undefined && (<><dt className="text-muted-foreground">ECC</dt><dd className="tnum">{fmtNum1(animal.ecc)}</dd></>)}
                  {parto && (<><dt className="text-muted-foreground">Peso ao nascer</dt><dd className="tnum">{fmtKg1(parto.pesoNascer)}</dd></>)}
                  {desmame && (<><dt className="text-muted-foreground">Desmame</dt><dd className="tnum">{fmtDate(desmame.data)} · {fmtKg1(desmame.peso)} · {desmame.idadeDias} d</dd></>)}
                </dl>
                {crias.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Crias ({crias.length})</div>
                    <ul className="mt-1 space-y-0.5 text-[12px]">
                      {crias.map((c) => {
                        const d = state.desmames.find((x) => x.bezerroBrinco === c.brinco)
                        return (
                          <li key={c.id} className="flex items-center justify-between gap-2">
                            <Link to={`/rebanho/${c.id}`} className="font-medium text-primary hover:underline">{c.brinco}</Link>
                            <span className="tnum text-muted-foreground">{fmtDate(c.nascimento)} · {c.sexo === 'M' ? 'M' : 'F'} · {d ? `desm. ${fmtKg1(d.peso)}` : c.status === 'ativo' ? `${fmtKg1(c.pesoAtual)} hoje` : c.status}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Custo acumulado por fase</CardTitle></CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Fase</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead className="text-right pr-4">Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custo.aquisicao > 0 && (
                      <TableRow>
                        <TableCell className="pl-4">Aquisição</TableCell>
                        <TableCell className="text-muted-foreground">{custo.origemTexto}</TableCell>
                        <TableCell className="tnum text-right">—</TableCell>
                        <TableCell className="tnum text-right pr-4">{fmtBRL(custo.aquisicao)}</TableCell>
                      </TableRow>
                    )}
                    {custo.fases.map((f) => (
                      <TableRow key={f.fase}>
                        <TableCell className="pl-4">{f.fase}</TableCell>
                        <TableCell className="tnum text-muted-foreground">{fmtDateShort(f.inicio)} → {fmtDateShort(f.fim)}</TableCell>
                        <TableCell className="tnum text-right">{f.dias}</TableCell>
                        <TableCell className="tnum text-right pr-4">{fmtBRL(f.custo)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell className="pl-4" colSpan={3}>Total · {fmtBRL(custo.custoKg)}/kg · {fmtBRL(custo.custoArroba)}/@</TableCell>
                      <TableCell className="tnum text-right pr-4">{fmtBRL(custo.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">
                  Custo diário por fase: cria {fmtBRL(state.config.custoDiaCria ?? CUSTO_DIA_FASE.cria)}, recria {fmtBRL(state.config.custoDiaRecria ?? CUSTO_DIA_FASE.recria)}, cocho pelo painel do lote.
                </div>
              </CardContent>
            </Card>

            <ChartCard title="Curva de peso">
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
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader><CardTitle>Linha do tempo</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead>Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhaDoTempo(animal, movs, sanitario, parto, desmame, state).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="tnum pl-4">{fmtDate(e.data)}</TableCell>
                      <TableCell><Badge variant={e.tom}>{e.evento}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{e.detalhe}</TableCell>
                      <TableCell className="text-muted-foreground">{e.por}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pesagens">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard title="Histórico de pesagens" className="lg:col-span-2">
              {pesagens.length >= 2 ? (
                <ResponsiveContainer width="100%" height={220}>
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
              {ativo && <div className="mt-2 border-t pt-2"><Button size="sm" variant="secondary" onClick={() => setPesarOpen(true)}><Plus className="h-3 w-3" /> Nova pesagem</Button></div>}
            </ChartCard>
            <Card>
              <CardHeader><CardTitle>Projeção de peso (GMD recente)</CardTitle></CardHeader>
              <CardContent className="px-0 pb-0">
                {projecao.length === 0 ? (
                  <div className="px-4 pb-3 text-xs text-muted-foreground">Sem ganho recente para projetar.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="pl-4">Em</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right pr-4">@</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {projecao.map((p) => (
                        <TableRow key={p.dias}>
                          <TableCell className="pl-4">{p.dias} dias</TableCell>
                          <TableCell className="tnum">{fmtDate(p.data)}</TableCell>
                          <TableCell className="tnum text-right font-semibold">{fmtKg1(p.peso)}</TableCell>
                          <TableCell className="tnum text-right pr-4">{fmtNum1(p.arrobas)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">Ritmo: {gmdRecente !== null ? fmtGMD(gmdRecente) : '—'} entre as duas últimas pesagens.</div>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-3">
            <CardContent className="px-0 pb-0 pt-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-4">Data</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right">Variação</TableHead><TableHead className="text-right pr-4">GMD no período</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...pesagens].reverse().map((p, i, arr) => {
                    const ant = arr[i + 1]
                    const dias = ant ? diffDays(ant.data, p.data) : 0
                    return (
                      <TableRow key={p.data}>
                        <TableCell className="tnum pl-4">{fmtDate(p.data)}</TableCell>
                        <TableCell className="tnum text-right font-medium">{fmtKg1(p.peso)}</TableCell>
                        <TableCell className={`tnum text-right ${ant && p.peso < ant.peso ? 'text-red-700' : 'text-muted-foreground'}`}>{ant ? `${p.peso - ant.peso >= 0 ? '+' : ''}${fmtNum1(p.peso - ant.peso)} kg` : '—'}</TableCell>
                        <TableCell className="tnum text-right pr-4">{ant && dias > 0 ? fmtGMD((p.peso - ant.peso) / dias) : '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {ehMatriz && (
          <TabsContent value="reproducao">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard label="Situação" value={dgAtual ? (dgAtual.resultado === 'prenha' ? (dgAtual.partoId ? 'Pariu' : 'Prenha') : dgAtual.resultado === 'pendente' ? 'DG pendente' : 'Vazia') : 'Sem DG'} detail={dgAtual?.resultado === 'prenha' && !dgAtual.partoId ? `parto previsto ${fmtDate(dgAtual.dppEstimado)}` : dgAtual ? `DG em ${fmtDate(dgAtual.data)}` : 'estação atual'} tone={dgAtual?.resultado === 'prenha' ? 'good' : dgAtual?.resultado === 'vazia' ? 'critical' : 'warning'} />
              <StatCard label="Intervalo entre partos" value={ipMatriz !== null ? `${ipMatriz} dias` : '—'} detail={ipMatriz !== null ? `${fmtNum1(ipMatriz / 30.44)} meses · tolerância ${state.config.toleranciaIPMeses}` : 'precisa de 2 partos'} tone={ipMatriz !== null ? (ipMatriz / 30.44 > state.config.toleranciaIPMeses ? 'critical' : ipMatriz <= 395 ? 'good' : 'warning') : undefined} />
              <StatCard label="Crias" value={fmtNum(partosMatriz.length)} detail={pesoMedioDesmame !== null ? `${fmtKg1(pesoMedioDesmame)} médio à desmama` : 'sem desmame registrado'} />
              <StatCard label="Eficiência vaca × bezerro" value={eficiencia ? fmtPct(eficiencia.eficiencia) : '—'} detail={eficiencia ? `${posicaoEf}º de ${totalEf} · ${eficiencia.classe === 'alta' ? 'alta' : eficiencia.classe === 'baixa' ? 'baixa — avaliar' : 'média'}` : 'sem cria avaliável'} tone={eficiencia ? (eficiencia.classe === 'alta' ? 'good' : eficiencia.classe === 'baixa' ? 'critical' : undefined) : undefined}
                hint="Kg de bezerro ajustado a 205 dias por kg da vaca. Vaca pesada desmamando cria leve = baixa eficiência." />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Diagnósticos de gestação</CardTitle></CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader><TableRow><TableHead className="pl-4">Data</TableHead><TableHead>Resultado</TableHead><TableHead>Origem</TableHead><TableHead className="pr-4">Parto previsto</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {dgsMatriz.length === 0 && <TableRow><TableCell colSpan={4} className="pl-4 text-muted-foreground">Sem diagnóstico registrado.</TableCell></TableRow>}
                      {dgsMatriz.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="tnum pl-4">{fmtDate(d.data)}</TableCell>
                          <TableCell><Badge variant={d.resultado === 'prenha' ? 'good' : d.resultado === 'pendente' ? 'warning' : 'critical'}>{d.resultado === 'prenha' ? (d.partoId ? 'Prenha → pariu' : 'Prenha') : d.resultado === 'pendente' ? 'Pendente' : 'Vazia'}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{d.origemPrenhez === 'IATF' ? `IATF${d.protocoloId ? ` · ${state.protocolosIATF.find((p) => p.id === d.protocoloId)?.touroSemen ?? ''}` : ''}` : d.origemPrenhez === 'touro' ? 'Touro de repasse' : '—'}</TableCell>
                          <TableCell className="tnum pr-4">{fmtDate(d.dppEstimado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Partos e crias</CardTitle></CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader><TableRow><TableHead className="pl-4">Parto</TableHead><TableHead>Cria</TableHead><TableHead className="text-right">Nasceu</TableHead><TableHead className="text-right pr-4">Desmame</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {partosMatriz.length === 0 && <TableRow><TableCell colSpan={4} className="pl-4 text-muted-foreground">Sem partos registrados.</TableCell></TableRow>}
                      {partosMatriz.map((p) => {
                        const cria = state.animais.find((a) => a.brinco === p.bezerroBrinco)
                        const d = state.desmames.find((x) => x.bezerroBrinco === p.bezerroBrinco)
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="tnum pl-4">{fmtDate(p.data)}</TableCell>
                            <TableCell>{cria ? <Link to={`/rebanho/${cria.id}`} className="font-medium text-primary hover:underline">{p.bezerroBrinco}</Link> : <span className="text-muted-foreground">{p.bezerroBrinco === '—' ? 'safra anterior' : p.bezerroBrinco}</span>}{p.paiNome ? <span className="text-[11px] text-muted-foreground"> · pai {p.paiNome}</span> : ''}</TableCell>
                            <TableCell className="tnum text-right">{fmtKg1(p.pesoNascer)}</TableCell>
                            <TableCell className="tnum text-right pr-4">{d ? `${fmtKg1(d.peso)} · ${d.idadeDias} d` : '—'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="sanidade">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="Carência" value={carencias.length > 0 ? `até ${fmtDate(carencias.map((c) => c.carenciaAte!).sort().at(-1))}` : 'Livre'} detail={carencias.length > 0 ? carencias[0].produto : 'pode ir para abate'} tone={carencias.length > 0 ? 'warning' : 'good'} />
            <StatCard label="Última vacina" value={sanitario.find((e) => /vacina/i.test(e.tipo)) ? fmtDate(sanitario.find((e) => /vacina/i.test(e.tipo))!.data) : '—'} detail={sanitario.find((e) => /vacina/i.test(e.tipo))?.produto} />
            <StatCard label="Último vermífugo" value={sanitario.find((e) => /vermif/i.test(e.tipo)) ? fmtDate(sanitario.find((e) => /vermif/i.test(e.tipo))!.data) : '—'} />
            <StatCard label="Tratamentos" value={fmtNum(sanitario.filter((e) => /tratamento/i.test(e.tipo)).length)} detail={naEnfermaria ? 'na enfermaria agora' : 'no histórico'} tone={naEnfermaria ? 'critical' : undefined} />
          </div>
          <Card className="mt-3">
            <CardHeader><CardTitle>Histórico sanitário</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-4">Data</TableHead><TableHead>Tipo</TableHead><TableHead>Produto</TableHead><TableHead>Carência</TableHead><TableHead className="pr-4">Obs.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sanitario.length === 0 && <TableRow><TableCell colSpan={5} className="pl-4 text-muted-foreground">Sem registros.</TableCell></TableRow>}
                  {sanitario.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="tnum pl-4">{fmtDate(e.data)}</TableCell>
                      <TableCell><Badge variant={/tratamento/i.test(e.tipo) ? 'warning' : /vacina/i.test(e.tipo) ? 'info' : 'default'}>{e.tipo}</Badge></TableCell>
                      <TableCell>{e.produto}</TableCell>
                      <TableCell className="tnum">{e.carenciaAte ? (e.carenciaAte >= hoje ? <span className="text-amber-700">até {fmtDate(e.carenciaAte)}</span> : <span className="text-muted-foreground">cumprida {fmtDate(e.carenciaAte)}</span>) : '—'}</TableCell>
                      <TableCell className="pr-4 text-muted-foreground">{e.obs ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditarAnimalDialog key={animal.id + String(editOpen)} animal={animal} open={editOpen} onClose={() => setEditOpen(false)} />
      <SaidaAnimalDialog animal={animal} open={saidaOpen} onClose={() => setSaidaOpen(false)} onDone={() => navigate('/rebanho')} />
      <PesagemAnimalDialog open={pesarOpen} onClose={() => setPesarOpen(false)} animal={animal} />
      <DesmameDialog open={desmameOpen} onClose={() => setDesmameOpen(false)} animal={animal} />
      <EventoAnimalDialog open={eventoOpen !== null} onClose={() => setEventoOpen(null)} animal={animal} tipoInicial={eventoOpen ?? undefined} />
      <PartoDialog open={partoOpen} onClose={() => setPartoOpen(false)} matrizInicial={animal.brinco} />
    </div>
  )
}

function faixaInclui(faixa: string, brinco: string): boolean {
  const m = faixa.match(/^(.+?)-(\d+)…(.+?)-(\d+)$/)
  if (!m || m[1] !== m[3]) return false
  const b = brinco.match(/^(.+?)-(\d+)$/)
  return Boolean(b && b[1] === m[1] && Number(b[2]) >= Number(m[2]) && Number(b[2]) <= Number(m[4]))
}

/** Movimentações + sanidade + parto/desmame numa linha do tempo única */
function linhaDoTempo(
  animal: Animal,
  movs: Movimentacao[],
  sanitario: EventoSanitario[],
  parto: Parto | undefined,
  desmame: Desmame | undefined,
  state: Store,
) {
  const itens: { data: string; evento: string; detalhe: string; por: string; tom: 'default' | 'good' | 'warning' | 'critical' | 'info' }[] = []
  for (const m of movs) itens.push({ data: m.data, evento: m.tipo.replace('_', ' '), detalhe: `${m.origem ?? '—'} → ${m.destino ?? '—'}${m.obs ? ` · ${m.obs}` : ''}`, por: nomeMembro(state, m.responsavelId), tom: m.tipo === 'morte' ? 'critical' : m.tipo === 'venda' ? 'info' : m.tipo === 'nascimento' ? 'good' : 'default' })
  for (const e of sanitario) itens.push({ data: e.data, evento: e.tipo, detalhe: `${e.produto}${e.carenciaAte ? ` · carência até ${fmtDate(e.carenciaAte)}` : ''}`, por: '', tom: /tratamento/i.test(e.tipo) ? 'warning' : 'info' })
  if (parto) itens.push({ data: parto.data, evento: 'Parto', detalhe: `Mãe ${parto.matrizBrinco} · ${fmtKg1(parto.pesoNascer)} · dificuldade ${parto.dificuldade}`, por: '', tom: 'good' })
  if (desmame) itens.push({ data: desmame.data, evento: 'Desmame', detalhe: `${fmtKg1(desmame.peso)} aos ${desmame.idadeDias} dias`, por: '', tom: 'good' })
  for (const p of animal.pesagens) itens.push({ data: p.data, evento: 'Pesagem', detalhe: fmtKg1(p.peso), por: '', tom: 'default' })
  return itens.sort((a, b) => b.data.localeCompare(a.data))
}

/** Foto do animal: no celular abre a câmera; a imagem é reduzida e fica só no aparelho */
function FotoAnimal({ animal }: { animal: Animal }) {
  const updateAnimal = useStore((s) => s.updateAnimal)
  const [carregando, setCarregando] = useState(false)

  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    setCarregando(true)
    try {
      const foto = await reduzirFoto(arq)
      updateAnimal(animal.id, { foto })
      toast(`Foto de ${animal.brinco} salva.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível usar essa imagem.', 'error')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mb-3 flex items-center gap-3">
      {animal.foto ? (
        <img src={animal.foto} alt={`Foto do animal ${animal.brinco}`} className="h-20 w-20 rounded-md border object-cover" />
      ) : (
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed bg-secondary/50 text-muted-foreground">
          <Camera className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">sem foto</span>
        </div>
      )}
      {animal.status === 'ativo' && (
        <div className="flex flex-col gap-1">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-secondary">
            <Camera className="h-3.5 w-3.5" />
            {carregando ? 'Processando…' : animal.foto ? 'Trocar foto' : 'Tirar / escolher foto'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={escolher} />
          </label>
          {animal.foto && (
            <button
              onClick={() => {
                updateAnimal(animal.id, { foto: undefined })
                toast('Foto removida.')
              }}
              className="text-left text-[11px] text-muted-foreground hover:text-red-600"
            >
              Remover foto
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EditarAnimalDialog({ animal, open, onClose }: { animal: Animal; open: boolean; onClose: () => void }) {
  const { lotes, updateAnimal, addMovimentacao } = useStore()
  const [loteId, setLoteId] = useState(animal.loteId)
  const [categoria, setCategoria] = useState<Categoria>(animal.categoria)
  const [ecc, setEcc] = useState(animal.ecc?.toString() ?? '')

  const salvar = () => {
    const eccNum = ecc === '' ? undefined : Number(ecc.replace(',', '.'))
    if (eccNum !== undefined && !(eccNum >= 1 && eccNum <= 5)) {
      toast('O escore corporal (ECC) vai de 1 a 5.', 'error')
      return
    }
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
      patch.ecc = eccNum
    }
    if (Object.keys(patch).length > 0) {
      updateAnimal(animal.id, patch)
      toast(`Ficha de ${animal.brinco} atualizada — alterações registradas no livro.`)
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Editar ${animal.brinco}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
  const addLancamento = useStore((s) => s.addLancamento)
  const [motivo, setMotivo] = useState<'venda' | 'morte'>('venda')
  const [causa, setCausa] = useState('Doença')
  const [causaObs, setCausaObs] = useState('')
  const [valor, setValor] = useState('')
  const [condicao, setCondicao] = useState<'vista' | 'prazo'>('vista')
  const [vencimento, setVencimento] = useState(addDays(hojeISO(), 30))

  return (
    <Dialog open={open} onClose={onClose} title={`Registrar saída — ${animal.brinco}`} className="max-w-md">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Motivo da saída">
          <Select value={motivo} onChange={(e) => setMotivo(e.target.value as 'venda' | 'morte')}>
            <option value="venda">Venda</option>
            <option value="morte">Morte</option>
          </Select>
        </FormRow>
        {motivo === 'morte' && (
          <>
            <FormRow label="Causa">
              <Select value={causa} onChange={(e) => setCausa(e.target.value)}>
                {['Doença', 'Acidente', 'Picada de cobra', 'Raio', 'Parto', 'Intoxicação', 'Desconhecida'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormRow>
            <FormRow label="Detalhe (opcional)">
              <Input value={causaObs} onChange={(e) => setCausaObs(e.target.value)} placeholder="Pneumonia, encontrado no fundo do pasto" />
            </FormRow>
          </>
        )}
        {motivo === 'venda' && (
          <>
            <FormRow label="Valor da venda (R$, opcional)">
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="2800" />
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
      <p className="mt-3 text-[13px] text-muted-foreground">
        O animal sai do inventário ativo e a {motivo === 'venda' ? 'venda' : 'morte'} é registrada no
        livro de movimentação com a data de hoje.
        {motivo === 'venda' &&
          (condicao === 'prazo'
            ? ' Com valor informado, a receita fica em "a receber" no Financeiro até o vencimento.'
            : ' Se o valor for informado, a receita entra no Financeiro como recebida hoje.')}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          variant="destructive"
          onClick={() => {
            removeAnimal(animal.id, motivo, motivo === 'morte' ? `${causa}${causaObs.trim() ? ` — ${causaObs.trim()}` : ''}` : undefined)
            const v = Number(valor)
            const aPrazo = condicao === 'prazo'
            if (motivo === 'venda' && v > 0) {
              addLancamento({
                tipo: 'receita',
                categoria: 'Venda de animais',
                descricao: `Venda do animal ${animal.brinco}`,
                valor: v,
                vencimento: aPrazo ? vencimento : hojeISO(),
                pagamento: aPrazo ? undefined : hojeISO(),
                origem: 'venda_animal',
                refId: animal.id,
              })
            }
            toast(
              motivo === 'venda' && v > 0
                ? aPrazo
                  ? `Venda de ${animal.brinco} registrada — ${fmtBRL(v)} a receber em ${fmtDate(vencimento)}.`
                  : `Venda de ${animal.brinco} registrada — receita lançada no Financeiro.`
                : `Saída de ${animal.brinco} registrada (${motivo === 'venda' ? 'venda' : 'morte'}).`,
            )
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
