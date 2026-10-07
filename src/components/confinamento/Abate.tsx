// Abate e projeção: calendário, baias que liberam, romaneios feitos e apartação
import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Beef, Split } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard, ChartCard } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { baiasStatus, resumoConfinamento } from '@/lib/confinamento'
import { fmtBRL, fmtDate, fmtMesAno, fmtNum, fmtNum1, fmtNum2, fmtPct } from '@/lib/format'
import { SERIES, GRID, axisProps, tooltipStyle } from '@/lib/chart'
import { AbateDialog, ApartarPesoDialog } from './dialogs'

export function AbateTab() {
  const state = useStore()
  const resumo = resumoConfinamento(state)
  const baias = baiasStatus(state)
  const [abateOpen, setAbateOpen] = useState(false)
  const [apartarOpen, setApartarOpen] = useState(false)
  const [loteSel, setLoteSel] = useState<string | undefined>()

  // calendário: cabeças previstas para abate por mês
  const porMes = new Map<string, number>()
  for (const r of resumo.lotes) {
    const mes = `${r.dataAbatePrevista.slice(0, 7)}-01`
    porMes.set(mes, (porMes.get(mes) ?? 0) + r.cab)
  }
  const calendario = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, cab]) => ({ mes, cab }))
  const liberam30 = baias.filter((b) => !b.livre && b.liberaEmDias <= 30)
  const abates = [...state.abates].sort((a, b) => b.data.localeCompare(a.data))
  const receita12m = abates.reduce((s, a) => s + a.receita, 0)
  const margemAbates = abates.reduce((s, a) => s + a.margem, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] text-muted-foreground">Projeção pelo ritmo recente de cada lote até o peso de abate; o romaneio do frigorífico fecha a conta real.</div>
        <div className="flex gap-1.5">
          <Button variant="secondary" onClick={() => { setLoteSel(undefined); setApartarOpen(true) }}><Split className="h-3.5 w-3.5" /> Apartar por peso</Button>
          <Button onClick={() => { setLoteSel(undefined); setAbateOpen(true) }}><Beef className="h-3.5 w-3.5" /> Registrar abate</Button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Abates em 30 dias" value={fmtNum(resumo.abates30)} detail={`${fmtNum(resumo.cabAbates30)} cabeças · ${liberam30.length} baia(s) liberam`} tone={resumo.abates30 > 0 ? 'warning' : undefined} />
        <StatCard label="Receita projetada" value={fmtBRL(resumo.receitaProjetada)} detail={`${resumo.lotes.length} lotes no cocho · @ ${fmtBRL(resumo.precoArroba)}`} />
        <StatCard label="Abates realizados" value={fmtNum(abates.length)} detail={`${fmtNum(abates.reduce((s, a) => s + a.qtd, 0))} cab · ${fmtBRL(receita12m)}`} />
        <StatCard label="Margem dos abates" value={fmtBRL(margemAbates)} detail={abates.length ? `${fmtBRL(margemAbates / abates.reduce((s, a) => s + a.qtd, 0))}/cab` : '—'} tone={margemAbates >= 0 ? 'good' : 'critical'} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard title="Calendário de abate — cabeças por mês">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calendario} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="mes" tickFormatter={fmtMesAno} {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => fmtMesAno(String(v))} formatter={(v) => [String(v), 'Cabeças']} />
              <Bar dataKey="cab" fill={SERIES[0]} radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#52514e' }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="rounded-lg border bg-card xl:col-span-2">
          <div className="border-b px-3 py-2 text-[13px] font-semibold">Lotes por data prevista de abate</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Baia</TableHead>
                <TableHead className="text-right">Cab</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead className="text-right">Alvo</TableHead>
                <TableHead className="text-right">Faltam</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead className="text-right">@ saída</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumo.lotes.map((r) => (
                <TableRow key={r.lote.id}>
                  <TableCell className="font-medium">{r.lote.nome}</TableCell>
                  <TableCell>{r.baia?.nome ?? '—'}</TableCell>
                  <TableCell className="tnum text-right">{r.cab}</TableCell>
                  <TableCell className="tnum text-right">{fmtNum(r.pesoAtual)} kg</TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtNum(r.lote.pesoAbateAlvo)} kg</TableCell>
                  <TableCell className="tnum text-right">
                    <Badge variant={r.diasRestantes <= 7 ? 'critical' : r.diasRestantes <= 30 ? 'warning' : 'default'}>{r.diasRestantes} d</Badge>
                  </TableCell>
                  <TableCell className="tnum">{fmtDate(r.dataAbatePrevista)}{r.acimaDoPlano ? <span className="ml-1 text-[10px] text-amber-700">acima do plano</span> : ''}</TableCell>
                  <TableCell className="tnum text-right">{fmtNum1(r.arrobasSaida)}</TableCell>
                  <TableCell className={`tnum text-right font-semibold ${r.margemProjetada >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(r.margemProjetada)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => { setLoteSel(r.lote.id); setAbateOpen(true) }}>Abater</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mb-3 rounded-lg border bg-card px-3 py-2">
        <div className="text-[13px] font-semibold">Baias que liberam em 30 dias</div>
        {liberam30.length === 0 ? (
          <div className="mt-1 text-[12px] text-muted-foreground">Nenhuma baia libera nos próximos 30 dias.</div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {liberam30.map((b) => (
              <span key={b.baia.id} className="rounded-md border bg-secondary/50 px-2 py-1 text-[11px]">
                <span className="font-semibold">{b.baia.nome}</span> · {b.resumo?.lote.nome} · em {b.liberaEmDias} dias ({fmtDate(b.resumo!.dataAbatePrevista)})
              </span>
            ))}
            {baias.filter((b) => b.livre).map((b) => (
              <span key={b.baia.id} className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[11px] text-green-800">
                <span className="font-semibold">{b.baia.nome}</span> · livre agora
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-[13px] font-semibold">Abates realizados — romaneio e resultado</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Frigorífico</TableHead>
              <TableHead className="text-right">Cab</TableHead>
              <TableHead className="text-right">PV médio</TableHead>
              <TableHead className="text-right">Rend. real × est.</TableHead>
              <TableHead className="text-right">@</TableHead>
              <TableHead className="text-right">R$/@</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Dias · GMD · CA</TableHead>
              <TableHead className="text-right">Custo/@ prod.</TableHead>
              <TableHead className="text-right">Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {abates.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Nenhum abate registrado.</TableCell></TableRow>
            )}
            {abates.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="tnum">{fmtDate(a.data)}</TableCell>
                <TableCell className="font-medium">{a.loteNome}</TableCell>
                <TableCell>{a.frigorifico}</TableCell>
                <TableCell className="tnum text-right">{a.qtd}</TableCell>
                <TableCell className="tnum text-right">{fmtNum(a.pesoVivoMedio)} kg</TableCell>
                <TableCell className="tnum text-right">
                  <span className={a.rendimentoReal >= a.rendimentoEstimado ? 'text-green-700' : 'text-amber-700'}>{fmtPct(a.rendimentoReal)}</span>
                  <span className="text-muted-foreground"> × {fmtPct(a.rendimentoEstimado)}</span>
                </TableCell>
                <TableCell className="tnum text-right">{fmtNum1(a.pesoCarcacaTotal / 15)}</TableCell>
                <TableCell className="tnum text-right">{fmtBRL(a.precoArroba)}</TableCell>
                <TableCell className="tnum text-right">{fmtBRL(a.receita)}</TableCell>
                <TableCell className="tnum text-right text-muted-foreground">{a.diasCocho} · {fmtNum2(a.gmd)} · {fmtNum1(a.conversaoAlimentar)}</TableCell>
                <TableCell className="tnum text-right">{fmtBRL(a.custoArrobaProduzida)}</TableCell>
                <TableCell className={`tnum text-right font-semibold ${a.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(a.margem)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AbateDialog open={abateOpen} onClose={() => setAbateOpen(false)} loteInicial={loteSel} />
      <ApartarPesoDialog open={apartarOpen} onClose={() => setApartarOpen(false)} loteInicial={loteSel} />
    </div>
  )
}
