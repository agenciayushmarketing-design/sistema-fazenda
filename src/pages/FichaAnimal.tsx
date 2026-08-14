import { useParams, useNavigate, Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader, ChartCard } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CATEGORIA_LABEL } from '@/data/types'
import { fmtDate, fmtDateShort, fmtIdade, fmtKg1, fmtNum1 } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'

export default function FichaAnimal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useStore()
  const removeAnimal = useStore((s) => s.removeAnimal)

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
        subtitle={`${CATEGORIA_LABEL[animal.categoria]} · ${animal.raca} · ${fmtIdade(animal.nascimento)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/rebanho')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(`Registrar saída (venda) do animal ${animal.brinco}?`)) {
                  removeAnimal(animal.id, 'venda')
                  navigate('/rebanho')
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Registrar saída
            </Button>
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
              {gmdVida !== null && (<><dt className="text-muted-foreground">GMD histórico</dt><dd className="tnum">{fmtNum1(gmdVida * 1000) } g/dia</dd></>)}
              {parto && (<><dt className="text-muted-foreground">Peso ao nascer</dt><dd className="tnum">{fmtKg1(parto.pesoNascer)}</dd></>)}
              {desmame && (<><dt className="text-muted-foreground">Desmame</dt><dd className="tnum">{fmtDate(desmame.data)} · {fmtKg1(desmame.peso)}</dd></>)}
            </dl>
          </CardContent>
        </Card>

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
    </div>
  )
}
