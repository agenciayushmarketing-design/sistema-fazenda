// Dietas por fase: ingredientes, custo por kg de MS, plano de troca e batida do dia
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { StatCard } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { custoKgDieta, custoKgMSDieta, diasEstoqueIngredientes, lotesConfAtivos, pesoMedioLote } from '@/lib/confinamento'
import { CONFINAMENTO } from '@/data/seed'
import { FASE_LABEL } from '@/data/types'
import { fmtBRL, fmtNum, fmtNum1, fmtNum2, hojeISO } from '@/lib/format'
import { EditarDietaDialog } from './dialogs'

export function DietasTab() {
  const state = useStore()
  const [editar, setEditar] = useState<string | null>(null)
  const hoje = hojeISO()
  const lotes = lotesConfAtivos(state)
  const estoqueDias = diasEstoqueIngredientes(state)

  // batida prevista de hoje por dieta (cab × PV × %PV ÷ MS) e por ingrediente
  const porDieta = state.dietas.map((d) => {
    const nosLotes = lotes.filter((l) => l.dietaId === d.id)
    const cab = nosLotes.reduce((s, l) => s + state.animais.filter((a) => a.status === 'ativo' && a.loteId === l.id).length, 0)
    const kg = nosLotes.reduce((s, l) => {
      const c = state.animais.filter((a) => a.status === 'ativo' && a.loteId === l.id).length
      return s + (c * pesoMedioLote(state, l) * (d.consumoMSPctPV / 100)) / (d.msPct / 100)
    }, 0)
    return { dieta: d, lotes: nosLotes.length, cab, kg, custoKg: custoKgDieta(d, state.estoque), custoKgMS: custoKgMSDieta(d, state.estoque) }
  })
  const kgTotal = porDieta.reduce((s, p) => s + p.kg, 0)
  const custoDia = porDieta.reduce((s, p) => s + p.kg * p.custoKg, 0)
  const ingredientesHoje = [...new Set(state.dietas.flatMap((d) => d.ingredientes.map((i) => i.itemEstoqueId)))].map((id) => {
    const kg = porDieta.reduce((s, p) => s + p.kg * ((p.dieta.ingredientes.find((i) => i.itemEstoqueId === id)?.pct ?? 0) / 100), 0)
    const item = state.estoque.find((e) => e.id === id)
    const dias = estoqueDias.find((x) => x.item?.id === id)?.dias ?? Infinity
    return { id, item, kg, dias }
  })
  const feitasHoje = state.leiturasCocho.filter((l) => l.data === hoje && l.baiaId).length

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Batida prevista hoje" value={`${fmtNum1(kgTotal / 1000)} t`} detail={`${fmtNum(lotes.reduce((s, l) => s + state.animais.filter((a) => a.status === 'ativo' && a.loteId === l.id).length, 0))} cab · ${feitasHoje}/${lotes.length} baias lidas`}
          hint="Quanto de ração as dietas pedem hoje, pelo peso dos lotes. A leitura de cocho ajusta baia a baia." />
        <StatCard label="Custo de alimentação / dia" value={fmtBRL(custoDia)} detail={`${fmtBRL(custoDia / Math.max(1, lotes.reduce((s, l) => s + state.animais.filter((a) => a.status === 'ativo' && a.loteId === l.id).length, 0)))}/cab`} />
        <StatCard label="Dieta mais cara" value={fmtBRL(Math.max(...porDieta.map((p) => p.custoKgMS)))} detail="por kg de matéria seca" />
        <StatCard label="Ingrediente mais curto" value={estoqueDias[0]?.item ? `${fmtNum1(estoqueDias[0].dias)} dias` : '—'} detail={estoqueDias[0]?.item?.nome} tone={estoqueDias[0] && estoqueDias[0].dias < CONFINAMENTO.diasEstoqueMinimo ? 'critical' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {porDieta.map(({ dieta, lotes: n, cab, kg, custoKg, custoKgMS }) => (
          <div key={dieta.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div>
                <div className="text-[13px] font-semibold">{dieta.nome}</div>
                <div className="text-[11px] text-muted-foreground">{FASE_LABEL[dieta.fase]} · {dieta.diasPrevistos} dias · MS {dieta.msPct}% · consumo {fmtNum1(dieta.consumoMSPctPV)}% PV</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditar(dieta.id)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">R$/kg</TableHead>
                  <TableHead className="text-right">Hoje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dieta.ingredientes.map((i) => {
                  const item = state.estoque.find((e) => e.id === i.itemEstoqueId)
                  return (
                    <TableRow key={i.itemEstoqueId}>
                      <TableCell>{item?.nome ?? i.itemEstoqueId}</TableCell>
                      <TableCell className="tnum text-right">{i.pct}%</TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{fmtNum2(item?.custoMedio ?? 0)}</TableCell>
                      <TableCell className="tnum text-right">{fmtNum(Math.round((kg * i.pct) / 100))} kg</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="tnum border-t px-3 py-2 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Custo como fornecida</span><span className="font-semibold">{fmtBRL(custoKg)}/kg</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Custo por kg de MS</span><span className="font-semibold">{fmtBRL(custoKgMS)}/kg MS</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Em uso</span><span>{n} lote(s) · {fmtNum(cab)} cab · {fmtNum1(kg / 1000)} t/dia</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Custo por cabeça/dia</span><span className="font-semibold">{fmtBRL(cab > 0 ? (kg * custoKg) / cab : 0)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-[13px] font-semibold">Plano de troca de dieta</div>
          <ul className="space-y-1 px-3 py-2 text-[12px]">
            {state.dietas.map((d, i) => {
              const inicio = state.dietas.slice(0, i).reduce((s, x) => s + x.diasPrevistos, 0)
              return (
                <li key={d.id} className="flex items-center justify-between">
                  <span><Badge variant={d.fase === 'terminacao' ? 'good' : d.fase === 'adaptacao' ? 'warning' : 'default'}>{FASE_LABEL[d.fase]}</Badge> <span className="ml-1">{d.nome}</span></span>
                  <span className="tnum text-muted-foreground">{d.fase === 'terminacao' ? `do dia ${inicio + 1} até o abate` : `dia ${inicio + 1} a ${inicio + d.diasPrevistos}`}</span>
                </li>
              )
            })}
          </ul>
          <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">A troca é feita no painel do lote (botão "Trocar dieta") e fica registrada no histórico dele.</div>
        </div>
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-[13px] font-semibold">Ingredientes — consumo de hoje e dias de estoque</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead className="text-right">Hoje</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Dura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredientesHoje.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>{x.item?.nome ?? x.id}</TableCell>
                  <TableCell className="tnum text-right">{fmtNum(Math.round(x.kg))} kg</TableCell>
                  <TableCell className="tnum text-right text-muted-foreground">{fmtNum(x.item?.saldo ?? 0)} kg</TableCell>
                  <TableCell className="tnum text-right">
                    <Badge variant={x.dias < CONFINAMENTO.diasEstoqueMinimo ? 'critical' : x.dias < 15 ? 'warning' : 'good'}>{Number.isFinite(x.dias) ? `${fmtNum1(x.dias)} dias` : '—'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {editar && <EditarDietaDialog open={Boolean(editar)} onClose={() => setEditar(null)} dietaId={editar} />}
    </div>
  )
}
