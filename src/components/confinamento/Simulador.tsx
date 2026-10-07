// Simulador de cenário (cotação, custo e GMD em %) e calculadora de viabilidade
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { StatCard, FormRow } from '@/components/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { lerNumero } from '@/lib/planilha'
import { resumoConfinamento, viabilidade } from '@/lib/confinamento'
import { CONFINAMENTO } from '@/data/seed'
import { fmtBRL, fmtNum, fmtNum1, fmtNum2, fmtPct } from '@/lib/format'

const n = (s: string) => lerNumero(s) ?? 0

function Faixa({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormRow label={label}>
      <div className="flex items-center gap-2">
        <input type="range" min="-30" max="30" step="1" value={n(value)} onChange={(e) => onChange(e.target.value)} className="flex-1" aria-label={label} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-16 text-right" />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </FormRow>
  )
}

export function SimuladorTab() {
  const state = useStore()
  const updateConfig = useStore((s) => s.updateConfig)
  const [arroba, setArroba] = useState('0')
  const [custo, setCusto] = useState('0')
  const [gmd, setGmd] = useState('0')
  const [cotacao, setCotacao] = useState(String(state.config.precoArroba ?? 320))
  const base = resumoConfinamento(state)
  const cen = resumoConfinamento(state, { arrobaPct: n(arroba), custoPct: n(custo), gmdPct: n(gmd) })

  // viabilidade
  const [pesoE, setPesoE] = useState('380')
  const [pesoS, setPesoS] = useState('540')
  const [magro, setMagro] = useState(String(state.config.precoArroba ?? 320))
  const [agio, setAgio] = useState('8')
  const [gordo, setGordo] = useState(String(state.config.precoArroba ?? 320))
  const [gmdV, setGmdV] = useState('1,40')
  const [custoDia, setCustoDia] = useState(String((base.custoDiarioCab || 15).toFixed(2)).replace('.', ','))
  const [rend, setRend] = useState('54')
  const [mort, setMort] = useState('1')
  const [vazio, setVazio] = useState('10')
  const cabecas = [100, 200, 300]
  const linhas = cabecas.map((c) =>
    viabilidade({
      cabecas: c, pesoEntrada: n(pesoE), pesoSaida: n(pesoS), precoArrobaMagro: n(magro), agioPct: n(agio), precoArrobaGordo: n(gordo),
      gmd: n(gmdV), custoDiaCab: n(custoDia), rendimento: n(rend), mortalidadePct: n(mort), diasVazioBaia: n(vazio),
    }),
  )

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-[13px] font-semibold">Cenário sobre os lotes no cocho</div>
          <div className="mt-2 space-y-3">
            <Faixa label="Arroba do boi gordo" value={arroba} onChange={setArroba} />
            <Faixa label="Custo (alimentação + fixo)" value={custo} onChange={setCusto} />
            <Faixa label="GMD" value={gmd} onChange={setGmd} />
          </div>
          <div className="mt-3 border-t pt-3">
            <FormRow label={`Cotação base da arroba (R$/@) — hoje ${fmtBRL(state.config.precoArroba ?? 0)}`}>
              <div className="flex gap-2">
                <Input value={cotacao} onChange={(e) => setCotacao(e.target.value)} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!(n(cotacao) > 0)) return
                    updateConfig({ precoArroba: n(cotacao) })
                    toast(`Cotação da arroba atualizada para ${fmtBRL(n(cotacao))} — painéis e margens recalculados.`)
                  }}
                >
                  Salvar cotação
                </Button>
              </div>
            </FormRow>
          </div>
          <Button variant="outline" className="mt-3" onClick={() => { setArroba('0'); setCusto('0'); setGmd('0') }}>Zerar cenário</Button>
        </div>

        <div className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="Margem projetada" value={fmtBRL(cen.margemProjetada)} detail={`base ${fmtBRL(base.margemProjetada)}`} tone={cen.margemProjetada >= 0 ? 'good' : 'critical'} />
            <StatCard label="Receita projetada" value={fmtBRL(cen.receitaProjetada)} detail={`@ ${fmtBRL(cen.precoArroba)}`} />
            <StatCard label="Custo / @ produzida" value={fmtBRL(cen.custoArrobaProduzida)} detail={`base ${fmtBRL(base.custoArrobaProduzida)}`} tone={cen.custoArrobaProduzida > cen.precoArroba ? 'critical' : 'good'} />
            <StatCard label="Lotes no vermelho" value={fmtNum(cen.lotes.filter((l) => l.margemProjetada < 0).length)} detail={`de ${cen.lotes.length} lotes`} tone={cen.lotes.some((l) => l.margemProjetada < 0) ? 'warning' : 'good'} />
          </div>
          <div className="mt-3 rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Cab</TableHead>
                  <TableHead className="text-right">Abate em</TableHead>
                  <TableHead className="text-right">@ equilíbrio</TableHead>
                  <TableHead className="text-right">Margem base</TableHead>
                  <TableHead className="text-right">Margem no cenário</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cen.lotes.map((r) => {
                  const b = base.lotes.find((x) => x.lote.id === r.lote.id)!
                  return (
                    <TableRow key={r.lote.id}>
                      <TableCell className="font-medium">{r.lote.nome}</TableCell>
                      <TableCell className="tnum text-right">{r.cab}</TableCell>
                      <TableCell className="tnum text-right">{r.diasRestantes} d</TableCell>
                      <TableCell className={`tnum text-right ${r.arrobaEquilibrio > r.precoArroba ? 'text-red-700' : ''}`}>{fmtBRL(r.arrobaEquilibrio)}</TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{fmtBRL(b.margemProjetada)}</TableCell>
                      <TableCell className={`tnum text-right font-semibold ${r.margemProjetada >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(r.margemProjetada)}</TableCell>
                      <TableCell className={`tnum text-right ${r.margemProjetada - b.margemProjetada >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(r.margemProjetada - b.margemProjetada)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border bg-card p-4">
        <div className="text-[13px] font-semibold">Calculadora de viabilidade — 100, 200 e 300 cabeças</div>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
          <FormRow label="Peso de entrada (kg)"><Input value={pesoE} onChange={(e) => setPesoE(e.target.value)} /></FormRow>
          <FormRow label="Peso de saída (kg)"><Input value={pesoS} onChange={(e) => setPesoS(e.target.value)} /></FormRow>
          <FormRow label="R$/@ boi magro"><Input value={magro} onChange={(e) => setMagro(e.target.value)} /></FormRow>
          <FormRow label="Ágio na compra (%)"><Input value={agio} onChange={(e) => setAgio(e.target.value)} /></FormRow>
          <FormRow label="R$/@ boi gordo"><Input value={gordo} onChange={(e) => setGordo(e.target.value)} /></FormRow>
          <FormRow label="GMD (kg/dia)"><Input value={gmdV} onChange={(e) => setGmdV(e.target.value)} /></FormRow>
          <FormRow label="Custo diário (R$/cab)"><Input value={custoDia} onChange={(e) => setCustoDia(e.target.value)} /></FormRow>
          <FormRow label="Rendimento (%)"><Input value={rend} onChange={(e) => setRend(e.target.value)} /></FormRow>
          <FormRow label="Mortalidade (%)"><Input value={mort} onChange={(e) => setMort(e.target.value)} /></FormRow>
          <FormRow label="Dias de baia vazia entre giros"><Input value={vazio} onChange={(e) => setVazio(e.target.value)} /></FormRow>
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabeças</TableHead>
                <TableHead className="text-right">Dias de cocho</TableHead>
                <TableHead className="text-right">Compra</TableHead>
                <TableHead className="text-right">Custo no cocho</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Lucro / giro</TableHead>
                <TableHead className="text-right">Por cabeça</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">@ equilíbrio</TableHead>
                <TableHead className="text-right">Giros/ano</TableHead>
                <TableHead className="text-right">Lucro / ano</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l, i) => (
                <TableRow key={cabecas[i]}>
                  <TableCell className="font-medium">{cabecas[i]}</TableCell>
                  <TableCell className="tnum text-right">{l.dias}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(l.custoCompra)}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(l.custoManutencao)}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(l.receita)}</TableCell>
                  <TableCell className={`tnum text-right font-semibold ${l.lucro >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(l.lucro)}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(l.lucroCab)}</TableCell>
                  <TableCell className="tnum text-right">{fmtPct(l.margemPct)}</TableCell>
                  <TableCell className="tnum text-right">{fmtBRL(l.arrobaEquilibrio)}</TableCell>
                  <TableCell className="tnum text-right">{fmtNum1(l.giros)}</TableCell>
                  <TableCell className={`tnum text-right font-semibold ${l.lucroAno >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(l.lucroAno)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="tnum mt-2 text-[11px] text-muted-foreground">
          Custo de entrada {fmtBRL(linhas[0].custoCab)}/cab · custo/@ produzida {fmtBRL(linhas[0].custoArrobaProduzida)} · ganho de carcaça {fmtNum2((n(gmdV) * n(rend)) / 100)} kg/dia · 1 @ = {CONFINAMENTO.kgArrobaCarcaca} kg de carcaça.
        </p>
      </div>
    </div>
  )
}
