// Diálogos do animal usados na Ficha, em Cria e em Sanitário:
// parto (matriz prenha → pai preenchido), desmame, vacina/tratamento individual e pesagem.
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { FormRow } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { partosPrevistos } from '@/lib/metrics'
import { fmtDate, fmtKg1, hojeISO } from '@/lib/format'
import type { Animal } from '@/data/types'

function Erro({ msg }: { msg: string }) {
  if (!msg) return null
  return <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{msg}</p>
}
function Dica({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-900">{children}</p>
}

/** Parto: escolhe a matriz prenha (ordem de DPP); o pai vem do protocolo IATF ou do touro de repasse */
export function PartoDialog({ open, onClose, matrizInicial }: { open: boolean; onClose: () => void; matrizInicial?: string }) {
  const state = useStore()
  const addParto = useStore((s) => s.addParto)
  const prenhas = partosPrevistos(state)
  const paiDe = (brinco: string) => {
    const dg = state.diagnosticos.find((d) => d.matrizBrinco === brinco && d.resultado === 'prenha' && !d.partoId)
    if (dg?.origemPrenhez === 'IATF') return state.protocolosIATF.find((p) => p.id === dg.protocoloId)?.touroSemen ?? 'Sêmen (IATF)'
    if (dg?.origemPrenhez === 'touro') return state.tourosRepasse[0] ? `${state.tourosRepasse[0].nome} (repasse)` : 'Touro de repasse'
    return ''
  }
  const [data, setData] = useState(hojeISO())
  const [matriz, setMatriz] = useState('')
  const [outra, setOutra] = useState('')
  const [pai, setPai] = useState('')
  const [bezerro, setBezerro] = useState('')
  const [sexo, setSexo] = useState<'M' | 'F'>('M')
  const [peso, setPeso] = useState('32')
  const [dif, setDif] = useState('1')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    const ini = matrizInicial && prenhas.some((p) => p.matrizBrinco === matrizInicial) ? matrizInicial : matrizInicial ? '__outra' : (prenhas[0]?.matrizBrinco ?? '__outra')
    setMatriz(ini)
    setOutra(ini === '__outra' ? (matrizInicial ?? '') : '')
    setPai(ini === '__outra' ? '' : paiDe(ini))
    setData(hojeISO()); setBezerro(''); setErro('')
    // próximo brinco de bezerro livre
    const n = state.animais.filter((a) => /^BZ-/.test(a.brinco)).length + 1
    setBezerro(`BZ-${String(n).padStart(3, '0')}`)
  }
  if (!open && aberto) setAberto(false)
  const brincoMatriz = matriz === '__outra' ? outra.trim() : matriz
  const prenha = prenhas.find((p) => p.matrizBrinco === brincoMatriz)

  const salvar = () => {
    if (!brincoMatriz || !bezerro.trim()) {
      setErro('Informe a matriz e o brinco do bezerro.')
      return
    }
    const r = addParto({
      data, matrizBrinco: brincoMatriz, bezerroBrinco: bezerro, sexo, pesoNascer: Number(peso),
      dificuldade: Number(dif) as 1 | 2 | 3 | 4 | 5, paiNome: pai.trim() || undefined,
      estacaoId: state.estacoes.find((e) => e.status === 'em_andamento')?.id ?? state.estacoes[0]?.id ?? 'EM-ATUAL',
    })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar o parto.')
      return
    }
    toast(`Parto registrado — ${bezerro.trim()} criado no Rebanho com mãe ${brincoMatriz}${pai ? ` e pai ${pai}` : ''}.`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar parto">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Matriz prenha">
          <Select
            value={matriz}
            onChange={(e) => {
              setMatriz(e.target.value)
              setPai(e.target.value === '__outra' ? '' : paiDe(e.target.value))
            }}
          >
            {prenhas.map((p) => (
              <option key={p.matrizBrinco} value={p.matrizBrinco}>
                {p.matrizBrinco} — parto previsto {fmtDate(p.dpp)} ({p.origem === 'IATF' ? 'IATF' : 'touro'})
              </option>
            ))}
            <option value="__outra">Outra matriz (digitar brinco)</option>
          </Select>
        </FormRow>
        {matriz === '__outra' ? (
          <FormRow label="Brinco da matriz"><Input value={outra} onChange={(e) => setOutra(e.target.value)} placeholder="V-0123" /></FormRow>
        ) : (
          <FormRow label="Previsão × data real">
            <div className="tnum flex h-8 items-center text-[13px] text-muted-foreground touch:h-10">
              {prenha ? `${fmtDate(prenha.dpp)} · ${prenha.diasRestantes >= 0 ? `${prenha.diasRestantes} d antes` : `${-prenha.diasRestantes} d depois`}` : '—'}
            </div>
          </FormRow>
        )}
        <FormRow label="Pai (touro / sêmen)"><Input value={pai} onChange={(e) => setPai(e.target.value)} placeholder="REM Armador" /></FormRow>
        <FormRow label="Data do parto"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
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
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {n === 1 ? 'sem auxílio' : n === 5 ? 'cesariana' : 'auxílio'}</option>)}
          </Select>
        </FormRow>
      </div>
      <Erro msg={erro} />
      <Dica>A cria nasce cadastrada com mãe, pai e lote da matriz; a prenhez vira "parto realizado" e sai dos partos previstos.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar parto</Button>
      </div>
    </Dialog>
  )
}

/** Desmame individual; com `animal`, vem preenchido e pede o peso da mãe */
export function DesmameDialog({ open, onClose, animal }: { open: boolean; onClose: () => void; animal?: Animal }) {
  const { partos, lotesRecria, lotes, animais, addDesmame, addPesagemAnimal } = useStore()
  const destinos = lotesRecria.length > 0 ? lotesRecria : lotes
  const [data, setData] = useState(hojeISO())
  const [brinco, setBrinco] = useState('')
  const [peso, setPeso] = useState('195')
  const [pesoMae, setPesoMae] = useState('')
  const [loteId, setLoteId] = useState(destinos[0]?.id ?? '')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  if (open && !aberto) {
    setAberto(true)
    setBrinco(animal?.brinco ?? '')
    setPeso(animal ? String(Math.round(animal.pesoAtual)) : '195')
    setPesoMae('')
    setData(hojeISO()); setErro('')
  }
  if (!open && aberto) setAberto(false)
  const bez = animais.find((a) => a.status === 'ativo' && a.brinco.toLowerCase() === brinco.trim().toLowerCase())
  const mae = bez?.maeBrinco ? animais.find((a) => a.status === 'ativo' && a.brinco === bez.maeBrinco) : undefined

  const salvar = () => {
    if (!brinco.trim()) {
      setErro('Informe o brinco do bezerro.')
      return
    }
    const parto = partos.find((p) => p.bezerroBrinco === brinco.trim())
    const nasc = parto?.data ?? bez?.nascimento
    const idade = nasc ? Math.max(1, Math.round((new Date(data).getTime() - new Date(nasc).getTime()) / 86400000)) : 210
    const r = addDesmame({ data, bezerroBrinco: brinco.trim(), peso: Number(peso), idadeDias: idade, loteDestinoId: loteId })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar o desmame.')
      return
    }
    if (mae && Number(pesoMae) > 0) addPesagemAnimal(mae.id, { data, peso: Number(pesoMae) })
    toast(`Desmame registrado — ${brinco.trim()} foi para ${destinos.find((l) => l.id === loteId)?.nome ?? 'o lote de destino'}${mae && Number(pesoMae) > 0 ? `; peso da mãe ${mae.brinco} atualizado` : ''}.`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar desmame">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Brinco do bezerro"><Input value={brinco} onChange={(e) => setBrinco(e.target.value)} placeholder="BZ-023" disabled={Boolean(animal)} /></FormRow>
        <FormRow label="Peso ao desmame (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} /></FormRow>
        <FormRow label={mae ? `Peso da mãe ${mae.brinco} (kg, opcional)` : 'Peso da mãe (kg, opcional)'}>
          <Input type="number" value={pesoMae} onChange={(e) => setPesoMae(e.target.value)} placeholder={mae ? String(Math.round(mae.pesoAtual)) : '—'} disabled={!mae} />
        </FormRow>
        <FormRow label="Lote de destino">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            {destinos.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </Select>
        </FormRow>
      </div>
      <Erro msg={erro} />
      <Dica>O animal muda para o lote de destino, a pesagem do desmame entra na ficha e o peso da mãe alimenta a eficiência vaca × bezerro.</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar desmame</Button>
      </div>
    </Dialog>
  )
}

const CARENCIAS: Record<string, number> = { oxitetraciclina: 21, florfenicol: 30, ivermectina: 28, enrofloxacina: 10, penicilina: 14 }

/** Vacina, vermífugo ou tratamento em UM animal, com baixa de 1 dose do estoque */
export function EventoAnimalDialog({ open, onClose, animal, tipoInicial }: { open: boolean; onClose: () => void; animal: Animal; tipoInicial?: 'Vacinação' | 'Tratamento' | 'Vermifugação' }) {
  const state = useStore()
  const registrar = useStore((s) => s.registrarEventoAnimal)
  const [tipo, setTipo] = useState<'Vacinação' | 'Tratamento' | 'Vermifugação'>('Vacinação')
  const [itemId, setItemId] = useState('')
  const [produto, setProduto] = useState('')
  const [data, setData] = useState(hojeISO())
  const [carencia, setCarencia] = useState('0')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const insumos = state.estoque.filter((i) => (tipo === 'Vacinação' ? i.categoria === 'vacina' : i.categoria === 'medicamento'))
  const sugerirCarencia = (nome: string) => {
    const chave = Object.keys(CARENCIAS).find((k) => nome.toLowerCase().includes(k))
    setCarencia(String(chave ? CARENCIAS[chave] : tipo === 'Tratamento' ? 14 : 0))
  }
  if (open && !aberto) {
    setAberto(true)
    const t = tipoInicial ?? 'Vacinação'
    setTipo(t)
    const lista = state.estoque.filter((i) => (t === 'Vacinação' ? i.categoria === 'vacina' : i.categoria === 'medicamento'))
    setItemId(lista[0]?.id ?? '')
    setProduto(lista[0]?.nome ?? '')
    setData(hojeISO()); setObs(''); setErro('')
    setCarencia(String(t === 'Tratamento' ? (lista[0] ? (Object.entries(CARENCIAS).find(([k]) => lista[0].nome.toLowerCase().includes(k))?.[1] ?? 14) : 14) : 0))
  }
  if (!open && aberto) setAberto(false)

  const salvar = () => {
    const r = registrar({ animalId: animal.id, tipo, produto, itemEstoqueId: itemId || undefined, data, carenciaDias: Number(carencia) || 0, obs })
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível registrar.')
      return
    }
    toast(`${tipo} de ${animal.brinco} registrada${tipo === 'Tratamento' && Number(carencia) > 0 ? ` — carência de ${carencia} dias` : ''}.`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={`${tipo} — ${animal.brinco}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Tipo">
          <Select
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as typeof tipo
              setTipo(t)
              const lista = state.estoque.filter((i) => (t === 'Vacinação' ? i.categoria === 'vacina' : i.categoria === 'medicamento'))
              setItemId(lista[0]?.id ?? '')
              setProduto(lista[0]?.nome ?? '')
              setCarencia(t === 'Tratamento' ? '14' : '0')
            }}
          >
            <option value="Vacinação">Vacinação</option>
            <option value="Vermifugação">Vermifugação</option>
            <option value="Tratamento">Tratamento</option>
          </Select>
        </FormRow>
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Insumo do estoque (baixa 1 dose)">
          <Select
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value)
              const it = state.estoque.find((i) => i.id === e.target.value)
              if (it) {
                setProduto(it.nome)
                if (tipo === 'Tratamento') sugerirCarencia(it.nome)
              }
            }}
          >
            <option value="">Sem baixa de estoque</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome} — saldo {i.saldo}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Produto / descrição"><Input value={produto} onChange={(e) => setProduto(e.target.value)} /></FormRow>
        {tipo === 'Tratamento' && (
          <FormRow label="Carência (dias)"><Input type="number" min="0" value={carencia} onChange={(e) => setCarencia(e.target.value)} /></FormRow>
        )}
        <FormRow label="Observação"><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder={tipo === 'Tratamento' ? 'Pneumonia — 2 aplicações' : ''} /></FormRow>
      </div>
      <Erro msg={erro} />
      <Dica>{tipo === 'Tratamento' ? 'Com carência, o animal entra na lista "em carência" e fica travado para abate até a data.' : 'O evento entra na ficha do animal e conta na cobertura vacinal.'}</Dica>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar</Button>
      </div>
    </Dialog>
  )
}

export function PesagemAnimalDialog({ open, onClose, animal }: { open: boolean; onClose: () => void; animal: Animal }) {
  const addPesagemAnimal = useStore((s) => s.addPesagemAnimal)
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')
  const [erro, setErro] = useState('')
  const ult = [...animal.pesagens].sort((a, b) => a.data.localeCompare(b.data)).at(-1)
  const p = Number(peso)
  const variacao = ult && p > 0 ? ((p - ult.peso) / ult.peso) * 100 : 0
  const salvar = () => {
    if (!(p > 0)) {
      setErro('Informe o peso.')
      return
    }
    if (data > hojeISO()) {
      setErro('A pesagem não pode ser no futuro.')
      return
    }
    addPesagemAnimal(animal.id, { data, peso: p })
    toast(`Pesagem de ${animal.brinco} registrada: ${fmtKg1(p)}.`)
    setPeso('')
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={`Pesar — ${animal.brinco}`} className="max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormRow>
        <FormRow label="Peso (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder={ult ? String(Math.round(ult.peso)) : '315'} /></FormRow>
      </div>
      <p className={`tnum mt-2 text-xs ${Math.abs(variacao) > 5 && p > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
        {ult ? `Última pesagem: ${fmtKg1(ult.peso)} em ${fmtDate(ult.data)}` : 'Sem pesagem anterior'}
        {ult && p > 0 ? ` → ${variacao >= 0 ? '+' : ''}${variacao.toFixed(1).replace('.', ',')}%${Math.abs(variacao) > 5 ? ' (a conferência vai apontar se cair mais de 5%)' : ''}` : ''}
      </p>
      <Erro msg={erro} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Registrar pesagem</Button>
      </div>
    </Dialog>
  )
}
