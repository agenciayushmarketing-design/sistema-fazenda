// Diálogos do Confinamento — cada um chama uma ação do store e mostra o erro na tela
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { FormRow } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { lerNumero } from '@/lib/planilha'
import { cabecasLote, custoKgDieta, lotesConfAtivos, pesoMedioLote, resumoLote } from '@/lib/confinamento'
import { CONFINAMENTO, KG_POR_ARROBA, NOTAS_COCHO, addDays } from '@/data/seed'
import { FASE_LABEL } from '@/data/types'
import { fmtBRL, fmtDate, fmtNum, fmtNum1, fmtPct, hojeISO } from '@/lib/format'
import type { LeituraCocho } from '@/data/types'

export function Erro({ msg }: { msg: string }) {
  if (!msg) return null
  return <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{msg}</p>
}

export function Dica({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">{children}</p>
}

const n = (s: string) => lerNumero(s) ?? 0

/** Leitura de cocho da baia: nota + sobra pesada → trato sugerido (ajustável) */
export function LeituraBaiaDialog({ open, onClose, loteInicial }: { open: boolean; onClose: () => void; loteInicial?: string }) {
  const state = useStore()
  const registrar = useStore((s) => s.registrarTratoConfinamento)
  const hoje = hojeISO()
  const lotes = lotesConfAtivos(state)
  const pendentes = lotes.filter((l) => !state.leiturasCocho.some((x) => x.loteId === l.id && x.data === hoje))
  const [loteId, setLoteId] = useState('')
  const [nota, setNota] = useState<LeituraCocho['nota'] | null>(null)
  const [sobra, setSobra] = useState('')
  const [trato, setTrato] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)

  const ultimaDe = (id: string) =>
    [...state.leiturasCocho.filter((l) => l.loteId === id)].sort((a, b) => a.data.localeCompare(b.data)).at(-1)

  if (open && !aberto) {
    setAberto(true)
    const id = loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : (pendentes[0]?.id ?? lotes[0]?.id ?? '')
    setLoteId(id)
    setNota(null)
    setSobra('')
    setTrato('')
    setErro('')
  }
  if (!open && aberto) setAberto(false)

  const lote = lotes.find((l) => l.id === loteId)
  const baia = state.baias.find((b) => b.id === lote?.baiaId)
  const dieta = state.dietas.find((d) => d.id === lote?.dietaId)
  const ultima = lote ? ultimaDe(lote.id) : undefined
  const kgOntem = ultima?.kgCalculado ?? 0
  const cab = lote ? cabecasLote(state, lote.id) : 0
  const pv = lote ? pesoMedioLote(state, lote) : 0
  const previsto = dieta && cab > 0 ? Math.round((cab * pv * (dieta.consumoMSPctPV / 100)) / (dieta.msPct / 100)) : 0
  const sugerido = nota !== null ? Math.round((kgOntem || previsto) * (1 + NOTAS_COCHO[nota].ajuste)) : null
  const tratoFinal = trato ? n(trato) : (sugerido ?? 0)
  const jaFeita = lote ? state.leiturasCocho.some((x) => x.loteId === lote.id && x.data === hoje) : false
  const custoTrato = dieta ? tratoFinal * custoKgDieta(dieta, state.estoque) : 0

  const escolherNota = (v: LeituraCocho['nota']) => {
    setNota(v)
    setTrato('')
    // sobra típica da nota, se o tratador ainda não pesou
    if (!sobra) {
      const pct = [0, 0.02, 0.05, 0.15, 0.28][v]
      setSobra(String(Math.round(kgOntem * pct)))
    }
  }

  const salvar = () => {
    if (!lote) return
    if (nota === null) {
      setErro('Escolha a nota do cocho.')
      return
    }
    const r = registrar({ data: hoje, loteId: lote.id, nota, sobraKg: n(sobra), kgOntem, kgTrato: tratoFinal })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`${baia?.nome}: trato de ${fmtNum(tratoFinal)} kg registrado — ${dieta?.ingredientes.length} ingredientes baixados do estoque.`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Leitura de cocho — baia">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Baia / lote">
          <Select
            value={loteId}
            onChange={(e) => {
              setLoteId(e.target.value)
              setNota(null)
              setSobra('')
              setTrato('')
              setErro('')
            }}
          >
            {lotes.map((l) => {
              const b = state.baias.find((x) => x.id === l.baiaId)
              const feita = state.leiturasCocho.some((x) => x.loteId === l.id && x.data === hoje)
              return (
                <option key={l.id} value={l.id}>
                  {b?.nome ?? l.baiaId} — {l.nome}{feita ? ' ✓' : ''}
                </option>
              )
            })}
          </Select>
        </FormRow>
        <FormRow label="Dieta / trato de ontem">
          <div className="tnum flex h-8 items-center text-[13px] touch:h-10">
            {dieta?.nome ?? '—'} · {fmtNum(kgOntem)} kg {ultima ? `(${fmtDate(ultima.data)})` : ''}
          </div>
        </FormRow>
      </div>

      <div className="mt-3 text-xs font-medium text-muted-foreground">Como está o cocho (sobra do trato de ontem)?</div>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-5">
        {NOTAS_COCHO.map((x) => (
          <button
            key={x.nota}
            onClick={() => escolherNota(x.nota)}
            className={cn('rounded-md border px-2 py-2 text-left transition-colors sm:text-center', nota === x.nota ? 'border-primary bg-accent' : 'hover:bg-secondary')}
          >
            <div className="text-lg font-bold leading-none">{x.nota}</div>
            <div className="mt-1 text-[11px] font-medium">{x.rotulo}</div>
            <div className="text-[10px] text-muted-foreground">{x.ajuste > 0 ? '+' : ''}{Math.round(x.ajuste * 100)}%</div>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Sobra pesada (kg)">
          <Input type="number" min="0" value={sobra} onChange={(e) => setSobra(e.target.value)} placeholder="0" />
        </FormRow>
        <FormRow label="Trato de hoje (kg)">
          <Input type="number" min="1" value={trato} onChange={(e) => setTrato(e.target.value)} placeholder={sugerido ? String(sugerido) : '—'} />
        </FormRow>
        <FormRow label="Previsto pela dieta">
          <div className="tnum flex h-8 items-center text-[13px] touch:h-10">{fmtNum(previsto)} kg · {fmtNum(cab)} cab</div>
        </FormRow>
      </div>

      <div className={cn('tnum mt-3 rounded-md border px-3 py-2 text-[13px]', sugerido !== null ? 'border-green-200 bg-green-50 text-green-900' : 'bg-secondary/50 text-muted-foreground')}>
        {sugerido !== null && nota !== null ? (
          <>
            Sugestão: {fmtNum(kgOntem || previsto)} kg × ({NOTAS_COCHO[nota].ajuste >= 0 ? '+' : ''}{Math.round(NOTAS_COCHO[nota].ajuste * 100)}%) = <strong>{fmtNum(sugerido)} kg</strong>
            {cab > 0 ? ` → ${fmtNum1(tratoFinal / cab)} kg/cab` : ''}
            {dieta ? ` · ${fmtNum1((tratoFinal * dieta.msPct) / 100 / Math.max(1, cab))} kg MS/cab · ${fmtBRL(custoTrato)} de ração` : ''}
          </>
        ) : (
          'Escolha a nota para calcular o trato de hoje.'
        )}
      </div>
      {jaFeita && <Erro msg="A leitura desta baia já foi feita hoje." />}
      <Erro msg={erro} />
      <Dica>A batida de ração baixa cada ingrediente da dieta no estoque, na proporção da fórmula.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={jaFeita}>Registrar leitura</Button>
      </div>
    </Dialog>
  )
}

export function PesagemLoteDialog({ open, onClose, loteInicial }: { open: boolean; onClose: () => void; loteInicial?: string }) {
  const state = useStore()
  const pesar = useStore((s) => s.pesarLoteConfinamento)
  const lotes = lotesConfAtivos(state)
  const [loteId, setLoteId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    setLoteId(loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : (lotes[0]?.id ?? ''))
    setData(hojeISO())
    setPeso('')
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const lote = lotes.find((l) => l.id === loteId)
  const atual = lote ? pesoMedioLote(state, lote) : 0
  const p = n(peso)
  const salvar = () => {
    if (!lote) return
    const r = pesar(lote.id, { data, peso: p })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`${lote.nome}: ${fmtNum1(p)} kg médio — ${fmtNum(cabecasLote(state, lote.id))} fichas atualizadas.`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Pesagem intermediária do lote">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Lote">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Peso médio (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder={String(Math.round(atual))} /></FormRow>
      </div>
      <p className="tnum mt-2 text-xs text-muted-foreground">
        Peso médio atual: {fmtNum1(atual)} kg{p > 0 ? ` → ${p > atual ? '+' : ''}${fmtNum1(p - atual)} kg` : ''}
      </p>
      <Erro msg={erro} />
      <Dica>Cada animal recebe a pesagem mantendo a diferença dele para a média — o ranking individual continua valendo.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar pesagem</Button>
      </div>
    </Dialog>
  )
}

export function TrocarDietaDialog({ open, onClose, loteId }: { open: boolean; onClose: () => void; loteId: string }) {
  const state = useStore()
  const trocar = useStore((s) => s.trocarDietaLote)
  const lote = state.lotesConfinamento.find((l) => l.id === loteId)
  const [dietaId, setDietaId] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    const prox = state.dietas.find((d) => d.id !== lote?.dietaId && d.fase !== lote?.fase)
    setDietaId(prox?.id ?? state.dietas[0]?.id ?? '')
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const dieta = state.dietas.find((d) => d.id === dietaId)
  const salvar = () => {
    const r = trocar(loteId, dietaId)
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível trocar.')
      return
    }
    toast(`${lote?.nome} passou para a dieta ${dieta?.nome} (${FASE_LABEL[dieta!.fase]}).`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={`Trocar dieta — ${lote?.nome ?? ''}`}>
      <FormRow label="Nova dieta / fase">
        <Select value={dietaId} onChange={(e) => setDietaId(e.target.value)}>
          {state.dietas.map((d) => (
            <option key={d.id} value={d.id}>{d.nome} — {FASE_LABEL[d.fase]} · {fmtBRL(custoKgDieta(d, state.estoque))}/kg</option>
          ))}
        </Select>
      </FormRow>
      {dieta && (
        <p className="tnum mt-2 text-xs text-muted-foreground">
          MS {dieta.msPct}% · consumo {fmtNum1(dieta.consumoMSPctPV)}% do PV · {dieta.ingredientes.length} ingredientes
        </p>
      )}
      <Erro msg={erro} />
      <Dica>A troca vale a partir do próximo trato; o histórico de dietas do lote guarda a data.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Trocar dieta</Button>
      </div>
    </Dialog>
  )
}

export function ApartarPesoDialog({ open, onClose, loteInicial }: { open: boolean; onClose: () => void; loteInicial?: string }) {
  const state = useStore()
  const apartar = useStore((s) => s.apartarPorPeso)
  const lotes = lotesConfAtivos(state)
  const livres = state.baias.filter((b) => !lotes.some((l) => l.baiaId === b.id))
  const [loteId, setLoteId] = useState('')
  const [qtd, setQtd] = useState('')
  const [baiaId, setBaiaId] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    const id = loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : (lotes[0]?.id ?? '')
    setLoteId(id)
    setQtd('')
    setBaiaId(livres[0]?.id ?? '')
    setNome(`${lotes.find((l) => l.id === id)?.nome ?? 'Lote'} — pesados`)
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const lote = lotes.find((l) => l.id === loteId)
  const animais = lote ? state.animais.filter((a) => a.status === 'ativo' && a.loteId === lote.id).sort((a, b) => b.pesoAtual - a.pesoAtual) : []
  const q = Math.round(n(qtd))
  const corte = q > 0 && q < animais.length ? animais[q - 1].pesoAtual : null
  const mediaPesados = q > 0 ? animais.slice(0, q).reduce((s, a) => s + a.pesoAtual, 0) / q : 0
  const mediaLeves = q > 0 && q < animais.length ? animais.slice(q).reduce((s, a) => s + a.pesoAtual, 0) / (animais.length - q) : 0
  const salvar = () => {
    const r = apartar({ loteId, qtd: q, baiaId, nome })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível apartar.')
      return
    }
    toast(`${q} cabeças apartadas para ${state.baias.find((b) => b.id === baiaId)?.nome} como "${nome}".`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Apartação por peso">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Lote de origem">
          <Select value={loteId} onChange={(e) => { setLoteId(e.target.value); setNome(`${lotes.find((l) => l.id === e.target.value)?.nome ?? 'Lote'} — pesados`) }}>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome} ({cabecasLote(state, l.id)} cab)</option>)}
          </Select>
        </FormRow>
        <FormRow label="Quantos mais pesados apartar">
          <Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder={String(Math.round(animais.length / 2))} />
        </FormRow>
        <FormRow label="Baia de destino (vazia)">
          <Select value={baiaId} onChange={(e) => setBaiaId(e.target.value)}>
            {livres.length === 0 && <option value="">Nenhuma baia livre</option>}
            {livres.map((b) => <option key={b.id} value={b.id}>{b.nome} — até {b.capacidade} cab</option>)}
          </Select>
        </FormRow>
        <FormRow label="Nome do lote novo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormRow>
      </div>
      <p className="tnum mt-2 text-xs text-muted-foreground">
        {corte !== null
          ? `Corte em ${fmtNum(corte)} kg: ${q} cab com ${fmtNum1(mediaPesados)} kg médio saem; ${animais.length - q} cab com ${fmtNum1(mediaLeves)} kg ficam.`
          : `${animais.length} cab no lote — informe quantos apartar.`}
      </p>
      <Erro msg={erro} />
      <Dica>Os mais pesados seguem para a baia nova com a mesma dieta; cada lote passa a ter a própria projeção de abate.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={livres.length === 0}>Apartar</Button>
      </div>
    </Dialog>
  )
}

export function EntradaLoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore()
  const entrada = useStore((s) => s.entradaLoteConfinamento)
  const lotes = lotesConfAtivos(state)
  const livres = state.baias.filter((b) => !lotes.some((l) => l.baiaId === b.id))
  const [nome, setNome] = useState('')
  const [baiaId, setBaiaId] = useState('')
  const [qtd, setQtd] = useState('')
  const [peso, setPeso] = useState('380')
  const [origem, setOrigem] = useState<'compra' | 'recria_propria'>('compra')
  const [fornecedor, setFornecedor] = useState('')
  const [agio, setAgio] = useState('8')
  const [precoMagro, setPrecoMagro] = useState(String(state.config.precoArroba ?? 320))
  const [custoRecria, setCustoRecria] = useState('3650')
  const [dietaId, setDietaId] = useState('')
  const [alvo, setAlvo] = useState('540')
  const [rend, setRend] = useState('54')
  const [plano, setPlano] = useState('105')
  const [condicao, setCondicao] = useState<'vista' | 'prazo'>('vista')
  const [vencimento, setVencimento] = useState(addDays(hojeISO(), 30))
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    setNome(`Lote ${String(state.lotesConfinamento.length + 1).padStart(2, '0')}`)
    setBaiaId(livres[0]?.id ?? '')
    setQtd('')
    setDietaId(state.dietas.find((d) => d.fase === 'adaptacao')?.id ?? state.dietas[0]?.id ?? '')
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const q = Math.round(n(qtd))
  const custoCab = origem === 'compra' ? (n(peso) / KG_POR_ARROBA) * n(precoMagro) * (1 + n(agio) / 100) : n(custoRecria)
  const salvar = () => {
    const r = entrada({
      nome, baiaId, qtd: q, pesoEntrada: n(peso), origem, fornecedor, agioPct: n(agio), precoArrobaMagro: n(precoMagro), custoRecriaCab: n(custoRecria),
      dietaId, pesoAbateAlvo: n(alvo), rendimentoEstimado: n(rend), diasCochoPlano: Math.round(n(plano)), gmdMeta: 1.4,
      vencimento: origem === 'compra' && condicao === 'prazo' ? vencimento : undefined,
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(origem === 'compra' ? `${nome}: ${q} cab na ${state.baias.find((b) => b.id === baiaId)?.nome} — ${fmtBRL(q * custoCab)} lançados no Financeiro.` : `${nome}: ${q} cab da recria entraram no cocho.`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Entrada de lote novo">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Nome do lote"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></FormRow>
        <FormRow label="Baia (vazia)">
          <Select value={baiaId} onChange={(e) => setBaiaId(e.target.value)}>
            {livres.length === 0 && <option value="">Nenhuma baia livre</option>}
            {livres.map((b) => <option key={b.id} value={b.id}>{b.nome} — até {b.capacidade} cab</option>)}
          </Select>
        </FormRow>
        <FormRow label="Cabeças"><Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="110" /></FormRow>
        <FormRow label="Peso de entrada (kg médio)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} /></FormRow>
        <FormRow label="Origem">
          <Select value={origem} onChange={(e) => setOrigem(e.target.value as 'compra' | 'recria_propria')}>
            <option value="compra">Compra (boi magro)</option>
            <option value="recria_propria">Recria própria</option>
          </Select>
        </FormRow>
        {origem === 'compra' ? (
          <>
            <FormRow label="Fornecedor"><Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Leilão / fazenda" /></FormRow>
            <FormRow label="R$/@ do boi magro"><Input type="number" value={precoMagro} onChange={(e) => setPrecoMagro(e.target.value)} /></FormRow>
            <FormRow label="Ágio (%)"><Input type="number" value={agio} onChange={(e) => setAgio(e.target.value)} /></FormRow>
            <FormRow label="Pagamento">
              <Select value={condicao} onChange={(e) => setCondicao(e.target.value as 'vista' | 'prazo')}>
                <option value="vista">À vista (pago hoje)</option>
                <option value="prazo">A prazo (a pagar)</option>
              </Select>
            </FormRow>
            {condicao === 'prazo' && <FormRow label="Vencimento"><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></FormRow>}
          </>
        ) : (
          <FormRow label="Custo acumulado na recria (R$/cab)"><Input type="number" value={custoRecria} onChange={(e) => setCustoRecria(e.target.value)} /></FormRow>
        )}
        <FormRow label="Dieta de entrada">
          <Select value={dietaId} onChange={(e) => setDietaId(e.target.value)}>
            {state.dietas.map((d) => <option key={d.id} value={d.id}>{d.nome} — {FASE_LABEL[d.fase]}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Peso de abate alvo (kg)"><Input type="number" value={alvo} onChange={(e) => setAlvo(e.target.value)} /></FormRow>
        <FormRow label="Rendimento estimado (%)"><Input type="number" value={rend} onChange={(e) => setRend(e.target.value)} /></FormRow>
        <FormRow label="Dias de cocho planejados"><Input type="number" value={plano} onChange={(e) => setPlano(e.target.value)} /></FormRow>
      </div>
      <p className="tnum mt-2 text-xs text-muted-foreground">
        Custo de entrada: {fmtBRL(custoCab)}/cab{q > 0 ? ` · ${fmtBRL(q * custoCab)} no lote` : ''}
        {origem === 'compra' ? ` (${fmtNum1(n(peso) / KG_POR_ARROBA)} @ × ${fmtBRL(n(precoMagro))} + ágio)` : ''}
      </p>
      <Erro msg={erro} />
      <Dica>Os animais entram com brinco sequencial, a baia fica ocupada e a compra vai para o Financeiro no centro de custo Terminação.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={livres.length === 0}>Registrar entrada</Button>
      </div>
    </Dialog>
  )
}

export function AbateDialog({ open, onClose, loteInicial }: { open: boolean; onClose: () => void; loteInicial?: string }) {
  const state = useStore()
  const registrar = useStore((s) => s.registrarAbate)
  const lotes = lotesConfAtivos(state)
  const [loteId, setLoteId] = useState('')
  const [qtd, setQtd] = useState('')
  const [data, setData] = useState(hojeISO())
  const [frig, setFrig] = useState('Frigorífico Planalto')
  const [carcaca, setCarcaca] = useState('')
  const [preco, setPreco] = useState(String(state.config.precoArroba ?? 320))
  const [condicao, setCondicao] = useState<'vista' | 'prazo'>('prazo')
  const [vencimento, setVencimento] = useState(addDays(hojeISO(), 30))
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    const ordenados = lotes.map((l) => resumoLote(state, l)).sort((a, b) => a.diasRestantes - b.diasRestantes)
    const id = loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : (ordenados[0]?.lote.id ?? '')
    setLoteId(id)
    setQtd(String(id ? cabecasLote(state, id) : ''))
    setCarcaca('')
    setData(hojeISO())
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const lote = lotes.find((l) => l.id === loteId)
  const r = lote ? resumoLote(state, lote) : null
  const q = Math.round(n(qtd))
  const animais = lote ? state.animais.filter((a) => a.status === 'ativo' && a.loteId === lote.id).sort((a, b) => b.pesoAtual - a.pesoAtual) : []
  const pvMedio = q > 0 && q <= animais.length ? animais.slice(0, q).reduce((s, a) => s + a.pesoAtual, 0) / q : 0
  const carcacaEstimada = lote ? Math.round(q * pvMedio * (lote.rendimentoEstimado / 100)) : 0
  const carc = n(carcaca)
  const rendReal = carc > 0 && pvMedio > 0 && q > 0 ? (carc / (pvMedio * q)) * 100 : 0
  const arrobas = carc / CONFINAMENTO.kgArrobaCarcaca
  const receita = arrobas * n(preco)
  const salvar = () => {
    const res = registrar({ loteId, qtd: q, data, frigorifico: frig, pesoCarcacaTotal: carc, precoArroba: n(preco), vencimento: condicao === 'prazo' ? vencimento : undefined })
    if (!res.ok) {
      setErro(res.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`Abate registrado: ${q} cab, ${fmtNum1(arrobas)} @, rendimento ${fmtPct(res.abate!.rendimentoReal)} — ${fmtBRL(receita)} ${condicao === 'prazo' ? 'a receber' : 'recebidos'}.`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Registrar abate (romaneio)">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Lote">
          <Select value={loteId} onChange={(e) => { setLoteId(e.target.value); setQtd(String(cabecasLote(state, e.target.value))) }}>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome} ({cabecasLote(state, l.id)} cab)</option>)}
          </Select>
        </FormRow>
        <FormRow label="Cabeças abatidas"><Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} /></FormRow>
        <FormRow label="Data do abate"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Frigorífico"><Input value={frig} onChange={(e) => setFrig(e.target.value)} /></FormRow>
        <FormRow label="Peso de carcaça total (kg)"><Input type="number" value={carcaca} onChange={(e) => setCarcaca(e.target.value)} placeholder={carcacaEstimada ? String(carcacaEstimada) : ''} /></FormRow>
        <FormRow label="R$/@ negociado"><Input type="number" value={preco} onChange={(e) => setPreco(e.target.value)} /></FormRow>
        <FormRow label="Recebimento">
          <Select value={condicao} onChange={(e) => setCondicao(e.target.value as 'vista' | 'prazo')}>
            <option value="prazo">A prazo (a receber)</option>
            <option value="vista">À vista (recebido)</option>
          </Select>
        </FormRow>
        {condicao === 'prazo' && <FormRow label="Vencimento"><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></FormRow>}
      </div>
      <div className="tnum mt-3 grid grid-cols-2 gap-2 rounded-md border bg-secondary/40 px-3 py-2 text-[12px] sm:grid-cols-4">
        <div><div className="text-[10px] uppercase text-muted-foreground">Peso vivo médio</div>{fmtNum1(pvMedio)} kg</div>
        <div><div className="text-[10px] uppercase text-muted-foreground">Rendimento real × est.</div>{carc > 0 ? `${fmtPct(rendReal)} × ${fmtPct(lote?.rendimentoEstimado ?? 0)}` : `— × ${fmtPct(lote?.rendimentoEstimado ?? 0)}`}</div>
        <div><div className="text-[10px] uppercase text-muted-foreground">Arrobas</div>{fmtNum1(arrobas)} @</div>
        <div><div className="text-[10px] uppercase text-muted-foreground">Receita</div>{fmtBRL(receita)}</div>
      </div>
      {r && q > 0 && (
        <p className="tnum mt-2 text-xs text-muted-foreground">
          {r.diasCocho} dias de cocho · GMD {fmtNum2Safe(r.gmd)} kg/dia · custo acumulado {fmtBRL((r.custoTotal / Math.max(1, r.cab)) * q)} ({q} cab)
          {carc > 0 ? ` · margem ${fmtBRL(receita - (r.custoTotal / Math.max(1, r.cab)) * q)}` : ''}
        </p>
      )}
      <Erro msg={erro} />
      <Dica>Os mais pesados saem primeiro. O romaneio dá o rendimento real, a receita entra no Financeiro e o lote guarda a fotografia final (dias, GMD, conversão, custo e margem).</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar abate</Button>
      </div>
    </Dialog>
  )
}

function fmtNum2Safe(v: number) {
  return v.toFixed(2).replace('.', ',')
}

export function EntradaEnfermariaDialog({ open, onClose, animalInicial }: { open: boolean; onClose: () => void; animalInicial?: string }) {
  const state = useStore()
  const entrada = useStore((s) => s.entradaEnfermaria)
  const [brinco, setBrinco] = useState('')
  const [diagnostico, setDiagnostico] = useState('Pneumonia')
  const [tratamento, setTratamento] = useState('Florfenicol 30% — 2 aplicações')
  const [itemId, setItemId] = useState('')
  const [custo, setCusto] = useState('95')
  const [diasTrat, setDiasTrat] = useState('4')
  const [carencia, setCarencia] = useState('30')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const meds = state.estoque.filter((i) => i.categoria === 'medicamento')
  if (open && !aberto) {
    setAberto(true)
    setBrinco(animalInicial ? (state.animais.find((a) => a.id === animalInicial)?.brinco ?? '') : '')
    setItemId(meds[0]?.id ?? '')
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  const animal = state.animais.find((a) => a.status === 'ativo' && a.brinco.toLowerCase() === brinco.trim().toLowerCase())
  const lote = animal ? state.lotes.find((l) => l.id === animal.loteId) : undefined
  const salvar = () => {
    if (!animal) {
      setErro(`Nenhum animal ativo com o brinco "${brinco}".`)
      return
    }
    const r = entrada({ animalId: animal.id, diagnostico, tratamento, itemEstoqueId: itemId || undefined, custo: n(custo), diasTratamento: Math.round(n(diasTrat)), carenciaDias: Math.round(n(carencia)) })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`${animal.brinco} entrou na enfermaria — ${diagnostico}. Carência até ${fmtDate(addDays(hojeISO(), Math.round(n(diasTrat)) + Math.round(n(carencia))))}.`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Entrada na enfermaria">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Brinco"><Input value={brinco} onChange={(e) => setBrinco(e.target.value)} placeholder="CF5-044" /></FormRow>
        <FormRow label="Lote">
          <div className="flex h-8 items-center text-[13px] text-muted-foreground touch:h-10">{animal ? `${lote?.nome ?? animal.loteId} · ${fmtNum(animal.pesoAtual)} kg` : '—'}</div>
        </FormRow>
        <FormRow label="Diagnóstico">
          <Select value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)}>
            {['Pneumonia', 'Acidose', 'Laminite', 'Timpanismo', 'Abscesso', 'Conjuntivite', 'Outro'].map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Tratamento"><Input value={tratamento} onChange={(e) => setTratamento(e.target.value)} /></FormRow>
        <FormRow label="Medicamento (baixa 1 un. do estoque)">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Sem baixa de estoque</option>
            {meds.map((m) => <option key={m.id} value={m.id}>{m.nome} — saldo {m.saldo}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Custo do tratamento (R$)"><Input type="number" value={custo} onChange={(e) => setCusto(e.target.value)} /></FormRow>
        <FormRow label="Dias de tratamento"><Input type="number" value={diasTrat} onChange={(e) => setDiasTrat(e.target.value)} /></FormRow>
        <FormRow label="Carência (dias)"><Input type="number" value={carencia} onChange={(e) => setCarencia(e.target.value)} /></FormRow>
      </div>
      <Erro msg={erro} />
      <Dica>O tratamento entra na ficha do animal; a carência trava o abate até o prazo e vira alerta quando é cumprida.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar entrada</Button>
      </div>
    </Dialog>
  )
}

export function EditarDietaDialog({ open, onClose, dietaId }: { open: boolean; onClose: () => void; dietaId: string }) {
  const state = useStore()
  const update = useStore((s) => s.updateDieta)
  const dieta = state.dietas.find((d) => d.id === dietaId)
  const [pcts, setPcts] = useState<Record<string, string>>({})
  const [ms, setMs] = useState('')
  const [consumo, setConsumo] = useState('')
  const [dias, setDias] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto && dieta) {
    setAberto(true)
    setPcts(Object.fromEntries(dieta.ingredientes.map((i) => [i.itemEstoqueId, String(i.pct)])))
    setMs(String(dieta.msPct))
    setConsumo(String(dieta.consumoMSPctPV).replace('.', ','))
    setDias(String(dieta.diasPrevistos))
    setErro('')
  }
  if (!open && aberto) setAberto(false)
  if (!dieta) return null
  const soma = Object.values(pcts).reduce((s, v) => s + n(v), 0)
  const custoKg = dieta.ingredientes.reduce((s, i) => s + (n(pcts[i.itemEstoqueId] ?? '0') / 100) * (state.estoque.find((e) => e.id === i.itemEstoqueId)?.custoMedio ?? 0), 0)
  const salvar = () => {
    const r = update(dieta.id, {
      ingredientes: dieta.ingredientes.map((i) => ({ itemEstoqueId: i.itemEstoqueId, pct: n(pcts[i.itemEstoqueId] ?? '0') })),
      msPct: n(ms), consumoMSPctPV: n(consumo), diasPrevistos: Math.round(n(dias)),
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível salvar.')
      return
    }
    toast(`Dieta ${dieta.nome} atualizada — ${fmtBRL(custoKg)}/kg como fornecida.`)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={`Dieta ${dieta.nome} — ${FASE_LABEL[dieta.fase]}`}>
      <div className="space-y-2">
        {dieta.ingredientes.map((i) => {
          const item = state.estoque.find((e) => e.id === i.itemEstoqueId)
          return (
            <div key={i.itemEstoqueId} className="flex items-center gap-2">
              <div className="flex-1 text-[13px]">{item?.nome ?? i.itemEstoqueId}<span className="text-muted-foreground"> · {fmtBRL(item?.custoMedio ?? 0)}/kg</span></div>
              <Input type="number" className="w-20" value={pcts[i.itemEstoqueId] ?? ''} onChange={(e) => setPcts({ ...pcts, [i.itemEstoqueId]: e.target.value })} />
              <span className="w-4 text-xs text-muted-foreground">%</span>
            </div>
          )
        })}
      </div>
      <p className={cn('tnum mt-2 text-xs', Math.round(soma) === 100 ? 'text-muted-foreground' : 'text-red-700')}>
        Soma {fmtNum(soma)}% · custo {fmtBRL(custoKg)}/kg como fornecida · {fmtBRL(n(ms) > 0 ? custoKg / (n(ms) / 100) : 0)}/kg MS
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <FormRow label="Matéria seca (%)"><Input type="number" value={ms} onChange={(e) => setMs(e.target.value)} /></FormRow>
        <FormRow label="Consumo MS (% PV)"><Input value={consumo} onChange={(e) => setConsumo(e.target.value)} /></FormRow>
        <FormRow label="Dias na fase"><Input type="number" value={dias} onChange={(e) => setDias(e.target.value)} /></FormRow>
      </div>
      <Erro msg={erro} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar dieta</Button>
      </div>
    </Dialog>
  )
}
