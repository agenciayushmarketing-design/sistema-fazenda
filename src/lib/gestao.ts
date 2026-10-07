// Indicadores da Fase E: custo do animal, incoerências da conferência, calendário sanitário,
// cobertura vacinal, carência, rodízio de pastos, projeção de peso, DRE e centros de custo.
import type { Animal, CentroCusto, Lancamento, Pasto, SeedData, TarefaSanitaria } from '@/data/types'
import { CATEGORIA_LABEL } from '@/data/types'
import { addDays, CUSTO_DIA_FASE, diffDays, KG_POR_ARROBA, MERCADO, RODIZIO, VACINAS_COBERTURA } from '@/data/seed'
import { hojeISO } from '@/lib/format'
import { ativos, uaPorPasto } from '@/lib/metrics'
import { resumoLote } from '@/lib/confinamento'

// ---- Custo acumulado do animal (por fase) ----
export interface FaseCusto {
  fase: string
  inicio: string
  fim: string
  dias: number
  custo: number
}

/** Fases pela vida do animal (nascimento → desmame → recria → terminação) ou pela compra */
export function custoAcumuladoAnimal(data: SeedData, animal: Animal) {
  const hoje = hojeISO()
  const fim = animal.status === 'ativo' ? hoje : (data.movimentacoes.find((m) => m.brinco === animal.brinco && (m.tipo === 'venda' || m.tipo === 'morte'))?.data ?? hoje)
  const cfgCria = data.config.custoDiaCria ?? CUSTO_DIA_FASE.cria
  const cfgRecria = data.config.custoDiaRecria ?? CUSTO_DIA_FASE.recria
  const fases: FaseCusto[] = []
  let aquisicao = 0
  let origemTexto = 'Nascido na fazenda'

  const loteConf = data.lotesConfinamento.find((l) => l.id === animal.loteId)
  const compra = data.movimentacoes.find((m) => m.tipo === 'compra' && (m.brinco === animal.brinco || faixaInclui(m.brinco, animal.brinco)))
  const desmame = data.desmames.find((d) => d.bezerroBrinco === animal.brinco)

  if (loteConf) {
    aquisicao = loteConf.custoCabEntrada
    origemTexto = loteConf.origem === 'compra' ? `Comprado — ${loteConf.fornecedor ?? 'boi magro'}` : 'Recria própria (custo acumulado)'
    const r = resumoLote(data, loteConf)
    const inicio = loteConf.dataEntrada
    const dias = Math.max(0, diffDays(inicio, fim))
    fases.push({ fase: 'Terminação (cocho)', inicio, fim, dias, custo: dias * (r.custoDiarioCab || CUSTO_DIA_FASE.terminacao) })
  } else if (compra) {
    const lanc = data.lancamentos.find((l) => l.origem === 'compra_animal' && l.descricao.includes(String(compra.quantidade)))
    const pesoEntrada = [...animal.pesagens].sort((a, b) => a.data.localeCompare(b.data))[0]?.peso ?? animal.pesoAtual
    // sem lançamento (compra antiga do seed): estima pelo peso de entrada e pela arroba com ágio
    aquisicao = lanc && compra.quantidade > 0 ? lanc.valor / compra.quantidade : (pesoEntrada / KG_POR_ARROBA) * (data.config.precoArroba ?? MERCADO.precoArrobaBoi) * (1 + MERCADO.agioBezerroPct / 200)
    origemTexto = `Comprado em ${compra.data.split('-').reverse().join('/')}`
    const fase = animal.categoria === 'boi_terminacao' ? 'Terminação' : 'Recria'
    const custoDia = animal.categoria === 'boi_terminacao' ? CUSTO_DIA_FASE.terminacao : cfgRecria
    const dias = Math.max(0, diffDays(compra.data, fim))
    fases.push({ fase, inicio: compra.data, fim, dias, custo: dias * custoDia })
  } else {
    const fimCria = desmame ? desmame.data : animal.categoria === 'bezerro' || animal.categoria === 'bezerra' ? fim : addDays(animal.nascimento, 240)
    const fimCriaReal = fimCria > fim ? fim : fimCria
    const diasCria = Math.max(0, diffDays(animal.nascimento, fimCriaReal))
    fases.push({ fase: 'Cria (ao pé da vaca)', inicio: animal.nascimento, fim: fimCriaReal, dias: diasCria, custo: diasCria * cfgCria })
    if (fimCriaReal < fim) {
      const ehMatriz = animal.categoria === 'vaca' || animal.categoria === 'touro'
      const fimRecria = ehMatriz ? addDays(animal.nascimento, 730) : fim
      const fimRecriaReal = fimRecria > fim ? fim : fimRecria
      const diasRecria = Math.max(0, diffDays(fimCriaReal, fimRecriaReal))
      fases.push({ fase: 'Recria', inicio: fimCriaReal, fim: fimRecriaReal, dias: diasRecria, custo: diasRecria * cfgRecria })
      if (ehMatriz && fimRecriaReal < fim) {
        const dias = Math.max(0, diffDays(fimRecriaReal, fim))
        fases.push({ fase: 'Reprodução (matriz)', inicio: fimRecriaReal, fim, dias, custo: dias * cfgCria })
      }
    }
  }
  const custoFases = fases.reduce((s, f) => s + f.custo, 0)
  const total = aquisicao + custoFases
  return {
    fases,
    aquisicao,
    origemTexto,
    total,
    custoKg: animal.pesoAtual > 0 ? total / animal.pesoAtual : 0,
    custoArroba: animal.pesoAtual > 0 ? total / (animal.pesoAtual / KG_POR_ARROBA) : 0,
    valorMercado: data.config.precoArroba ? (animal.pesoAtual / KG_POR_ARROBA) * data.config.precoArroba : 0,
  }
}

function faixaInclui(faixa: string, brinco: string): boolean {
  const m = faixa.match(/^(.+?)-(\d+)…(.+?)-(\d+)$/)
  if (!m || m[1] !== m[3]) return false
  const b = brinco.match(/^(.+?)-(\d+)$/)
  return Boolean(b && b[1] === m[1] && Number(b[2]) >= Number(m[2]) && Number(b[2]) <= Number(m[4]))
}

// ---- Incoerências para a conferência ----
export interface Incoerencia {
  tipo: 'peso_caiu' | 'ganho_anormal' | 'animal_inativo' | 'vacina_repetida' | 'lotacao' | 'morte_aberta'
  severidade: 'warning' | 'critical'
  titulo: string
  detalhe: string
  animalId?: string
  link: string
}

export function incoerencias(data: SeedData): Incoerencia[] {
  const out: Incoerencia[] = []
  for (const a of data.animais) {
    const pes = [...a.pesagens].sort((x, y) => x.data.localeCompare(y.data))
    const ult = pes[pes.length - 1]
    const ant = pes[pes.length - 2]
    if (a.status === 'ativo' && ult && ant) {
      const dias = Math.max(1, diffDays(ant.data, ult.data))
      const gmd = (ult.peso - ant.peso) / dias
      if (ult.peso < ant.peso * 0.95) {
        out.push({ tipo: 'peso_caiu', severidade: 'warning', animalId: a.id, titulo: `${a.brinco}: peso caiu ${Math.round((1 - ult.peso / ant.peso) * 100)}%`, detalhe: `${ant.peso} kg → ${ult.peso} kg em ${dias} dia(s) — erro de digitação ou animal doente?`, link: `/rebanho/${a.id}` })
      } else if (gmd > 2.5) {
        out.push({ tipo: 'ganho_anormal', severidade: 'warning', animalId: a.id, titulo: `${a.brinco}: ganho de ${gmd.toFixed(2).replace('.', ',')} kg/dia`, detalhe: `${ant.peso} kg → ${ult.peso} kg em ${dias} dia(s) — fora do normal, conferir a balança`, link: `/rebanho/${a.id}` })
      }
    }
    if (a.status !== 'ativo') {
      const saida = data.movimentacoes.find((m) => m.brinco === a.brinco && (m.tipo === 'venda' || m.tipo === 'morte'))?.data
      if (saida) {
        const depois = [...a.pesagens.filter((p) => p.data > saida).map((p) => `pesagem ${p.data}`), ...a.sanitario.filter((e) => e.data > saida).map((e) => `${e.tipo.toLowerCase()} ${e.data}`)]
        if (depois.length > 0) {
          out.push({ tipo: 'animal_inativo', severidade: 'critical', animalId: a.id, titulo: `${a.brinco} (${a.status}) recebeu lançamento depois da saída`, detalhe: depois.slice(0, 2).map((d) => d.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1')).join(' · '), link: `/rebanho/${a.id}` })
        }
      }
    }
    const vacinas = a.sanitario.filter((e) => /vacina/i.test(e.tipo)).sort((x, y) => x.data.localeCompare(y.data))
    for (let i = 1; i < vacinas.length; i++) {
      if (vacinas[i].produto === vacinas[i - 1].produto && diffDays(vacinas[i - 1].data, vacinas[i].data) <= 30) {
        out.push({ tipo: 'vacina_repetida', severidade: 'warning', animalId: a.id, titulo: `${a.brinco}: ${vacinas[i].produto} aplicada 2× em ${diffDays(vacinas[i - 1].data, vacinas[i].data)} dias`, detalhe: 'Dose repetida ou lançamento em duplicidade', link: `/rebanho/${a.id}` })
        break
      }
    }
  }
  for (const { pasto, ua } of uaPorPasto(data)) {
    if (ua > pasto.capacidadeUA) {
      out.push({ tipo: 'lotacao', severidade: 'critical', titulo: `${pasto.nome} acima da lotação`, detalhe: `${Math.round(ua)} UA para ${pasto.capacidadeUA} UA de capacidade — rodízio pendente`, link: '/rebanho?tab=mapa' })
    }
  }
  // bezerros mortos pré-desmame só existem no livro (sem ficha): a morte do livro também conta
  const mortos = new Map(data.animais.filter((a) => a.status === 'morto').map((a) => [a.brinco, a.id]))
  for (const m of data.movimentacoes) if (m.tipo === 'morte' && m.quantidade === 1 && !mortos.has(m.brinco)) mortos.set(m.brinco, '')
  for (const r of data.rondas) {
    for (const o of r.ocorrencias) {
      if (o.brinco && !o.resolvida && o.tipo !== 'morte' && mortos.has(o.brinco)) {
        out.push({ tipo: 'morte_aberta', severidade: 'critical', animalId: mortos.get(o.brinco) || undefined, titulo: `${o.brinco} morreu com ocorrência de ronda em aberto`, detalhe: `${o.descricao} (ronda de ${r.data.split('-').reverse().join('/')}) — fechar a ocorrência com a causa`, link: '/sanitario?tab=rondas' })
      }
    }
  }
  return out.sort((a, b) => (a.severidade === 'critical' ? -1 : 1) - (b.severidade === 'critical' ? -1 : 1))
}

// ---- Calendário sanitário, cobertura vacinal e carência ----
export type StatusTarefa = 'atrasada' | 'hoje' | 'proxima' | 'concluida' | 'futura'

export function statusTarefa(t: TarefaSanitaria, hoje = hojeISO()): StatusTarefa {
  if (t.concluidaEm) return 'concluida'
  if (t.data < hoje) return 'atrasada'
  if (t.data === hoje) return 'hoje'
  if (t.data <= addDays(hoje, 30)) return 'proxima'
  return 'futura'
}

export function coberturaVacinal(data: Pick<SeedData, 'animais'>) {
  const hoje = hojeISO()
  const vivos = ativos(data.animais)
  return VACINAS_COBERTURA.map((v) => {
    const elegiveis = v.soFemeasJovens
      ? vivos.filter((a) => a.sexo === 'F' && diffDays(a.nascimento, hoje) >= 90 && diffDays(a.nascimento, hoje) <= 730)
      : vivos
    const limite = addDays(hoje, -Math.round(v.meses * 30.44))
    const cobertos = elegiveis.filter((a) => a.sanitario.some((e) => e.produto.toLowerCase().includes(v.chave) && e.data >= limite))
    return { ...v, elegiveis: elegiveis.length, cobertos: cobertos.length, pct: elegiveis.length > 0 ? (cobertos.length / elegiveis.length) * 100 : 0 }
  })
}

export function animaisEmCarencia(data: Pick<SeedData, 'animais' | 'enfermaria'>) {
  const hoje = hojeISO()
  const lista: { animal: Animal; produto: string; ate: string; diasRestantes: number }[] = []
  for (const a of ativos(data.animais)) {
    for (const e of a.sanitario) {
      if (e.carenciaAte && e.carenciaAte >= hoje) lista.push({ animal: a, produto: e.produto, ate: e.carenciaAte, diasRestantes: diffDays(hoje, e.carenciaAte) })
    }
  }
  for (const e of data.enfermaria) {
    if (e.saida || e.carenciaDias <= 0) continue
    const ate = addDays(e.fimTratamento, e.carenciaDias)
    if (ate >= hoje) {
      const animal = data.animais.find((a) => a.id === e.animalId)
      if (animal && !lista.some((l) => l.animal.id === animal.id)) lista.push({ animal, produto: e.tratamento, ate, diasRestantes: diffDays(hoje, ate) })
    }
  }
  return lista.sort((a, b) => a.ate.localeCompare(b.ate))
}

// ---- Rodízio de pastos ----
export function rodizioPastos(data: Pick<SeedData, 'pastos' | 'lotes' | 'animais'>) {
  const hoje = hojeISO()
  const vivos = ativos(data.animais)
  return data.pastos
    .filter((p) => p.tipo === 'pasto')
    .map((p) => {
      const lotes = data.lotes.filter((l) => l.pastoId === p.id && vivos.some((a) => a.loteId === l.id))
      const entrada = lotes.map((l) => l.entradaPasto ?? hoje).sort()[0]
      const plano = p.diasOcupacaoPlano ?? RODIZIO.diasOcupacao
      const diasNoPasto = entrada ? diffDays(entrada, hoje) : 0
      const trocaPrevista = entrada ? addDays(entrada, plano) : undefined
      const diasDescanso = lotes.length === 0 && p.descansoDesde ? diffDays(p.descansoDesde, hoje) : lotes.length === 0 ? RODIZIO.diasDescanso : 0
      return {
        pasto: p,
        lotes,
        cabecas: vivos.filter((a) => lotes.some((l) => l.id === a.loteId)).length,
        entrada,
        diasNoPasto,
        trocaPrevista,
        diasParaTroca: trocaPrevista ? diffDays(hoje, trocaPrevista) : undefined,
        vencido: trocaPrevista !== undefined && trocaPrevista < hoje,
        emDescanso: lotes.length === 0,
        diasDescanso,
        prontoParaReceber: lotes.length === 0 && diasDescanso >= RODIZIO.diasDescanso && p.condicao !== 'ruim',
      }
    })
    .sort((a, b) => (a.diasParaTroca ?? 999) - (b.diasParaTroca ?? 999))
}

// ---- Projeção de peso (30 a 180 dias) ----
export function projecaoPeso(pesoAtual: number, gmd: number, horizontes = [30, 60, 90, 120, 180]) {
  const hoje = hojeISO()
  return horizontes.map((d) => ({ dias: d, data: addDays(hoje, d), peso: pesoAtual + gmd * d, arrobas: (pesoAtual + gmd * d) / KG_POR_ARROBA }))
}

// ---- Financeiro: mês de calendário, 12 meses, DRE e centros de custo ----
export function metricasMes(data: Pick<SeedData, 'lancamentos'>) {
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  const ini12 = (() => { const [y, m] = hoje.split('-').map(Number); const d = new Date(y, m - 12, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` })()
  const soma = (f: (l: Lancamento) => boolean) => data.lancamentos.filter(f).reduce((s, l) => s + l.valor, 0)
  const recMes = soma((l) => l.tipo === 'receita' && !!l.pagamento && l.pagamento.startsWith(mes))
  const despMes = soma((l) => l.tipo === 'despesa' && !!l.pagamento && l.pagamento.startsWith(mes))
  const rec12 = soma((l) => l.tipo === 'receita' && !!l.pagamento && l.pagamento >= ini12 && l.pagamento <= hoje)
  const desp12 = soma((l) => l.tipo === 'despesa' && !!l.pagamento && l.pagamento >= ini12 && l.pagamento <= hoje)
  return { mes, recMes, despMes, resMes: recMes - despMes, rec12, desp12, res12: rec12 - desp12, margem12: rec12 > 0 ? ((rec12 - desp12) / rec12) * 100 : 0 }
}

/** DRE simplificada dos últimos 12 meses (regime de caixa), por categoria */
export function dre(data: Pick<SeedData, 'lancamentos'>) {
  const hoje = hojeISO()
  const [y, m] = hoje.split('-').map(Number)
  const d0 = new Date(y, m - 12, 1)
  const ini = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-01`
  const pagos = data.lancamentos.filter((l) => l.pagamento && l.pagamento >= ini && l.pagamento <= hoje)
  const porCat = (tipo: Lancamento['tipo']) => {
    const map = new Map<string, number>()
    for (const l of pagos.filter((x) => x.tipo === tipo)) map.set(l.categoria, (map.get(l.categoria) ?? 0) + l.valor)
    return [...map.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor)
  }
  const receitas = porCat('receita')
  const despesas = porCat('despesa')
  const totalRec = receitas.reduce((s, r) => s + r.valor, 0)
  const totalDesp = despesas.reduce((s, r) => s + r.valor, 0)
  // custo variável × fixo: Pessoal/Energia/Combustível/Manutenção são o fixo da fazenda
  const fixas = new Set(['Pessoal', 'Energia', 'Combustível', 'Manutenção', 'Impostos'])
  const despFixas = despesas.filter((d) => fixas.has(d.categoria)).reduce((s, d) => s + d.valor, 0)
  const despVariaveis = totalDesp - despFixas
  return {
    inicio: ini, fim: hoje, receitas, despesas, totalRec, totalDesp, despVariaveis, despFixas,
    margemContribuicao: totalRec - despVariaveis,
    resultado: totalRec - totalDesp,
    margemPct: totalRec > 0 ? ((totalRec - totalDesp) / totalRec) * 100 : 0,
  }
}

const CENTROS: CentroCusto[] = ['Cria', 'Recria', 'Terminacao', 'Geral']

/** Despesas pagas (12 meses) por centro de custo: pedidos pelo rateio, o resto pelo campo do lançamento */
export function despesasPorCentro(data: Pick<SeedData, 'lancamentos' | 'pedidos'>) {
  const hoje = hojeISO()
  const [y, m] = hoje.split('-').map(Number)
  const d0 = new Date(y, m - 12, 1)
  const ini = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-01`
  const out: Record<CentroCusto, number> = { Cria: 0, Recria: 0, Terminacao: 0, Geral: 0 }
  for (const l of data.lancamentos) {
    if (l.tipo !== 'despesa' || !l.pagamento || l.pagamento < ini) continue
    const pedido = l.origem === 'pedido' ? data.pedidos.find((p) => p.id === l.refId) : undefined
    if (pedido) {
      for (const c of CENTROS) out[c] += (l.valor * (pedido.rateio[c] ?? 0)) / 100
    } else {
      out[l.centroCusto ?? 'Geral'] += l.valor
    }
  }
  return CENTROS.map((c) => ({ centro: c, label: c === 'Terminacao' ? 'Terminação' : c, valor: out[c] }))
}

// ---- Lançamento por mensagem (WhatsApp simulado) ----
const CATEGORIAS_PALAVRAS: [RegExp, string, CentroCusto][] = [
  [/diesel|combust|gasolina|óleo|oleo/i, 'Combustível', 'Geral'],
  [/sal[aá]rio|folha|diária|diaria|peão|peao|mão de obra|mao de obra/i, 'Pessoal', 'Geral'],
  [/energia|luz|cemig|enel/i, 'Energia', 'Geral'],
  [/vacina|rem[ée]dio|vermífugo|vermifugo|sal mineral|ração|racao|semen|sêmen|adubo|calc[aá]rio|semente/i, 'Insumos', 'Geral'],
  [/conserto|peça|peca|oficina|mec[aâ]nico|pneu|manuten|revis/i, 'Manutenção', 'Geral'],
  [/imposto|itr|funrural|taxa/i, 'Impostos', 'Geral'],
  [/leite/i, 'Leite', 'Geral'],
  [/bezerr|boi|vaca|novilh|garrote|gado|cabeça|cabeca|arroba|@/i, 'Venda de animais', 'Geral'],
]

export interface MensagemInterpretada {
  tipo: 'receita' | 'despesa'
  valor: number
  categoria: string
  centroCusto: CentroCusto
  data: string
  pago: boolean
  descricao: string
  confianca: 'alta' | 'media' | 'baixa'
}

/** "paguei 350 de diesel ontem" → despesa, R$ 350, Combustível, ontem, pago */
export function interpretarMensagem(texto: string): MensagemInterpretada | null {
  const t = texto.trim()
  // vários números na frase ("12 bezerros por 38.500"): vale o que vem com R$/por, senão o maior
  const re = /(?:(r\$|por|de)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(mil|k)?/gi
  const candidatos: { valor: number; pontos: number; bruto: string }[] = []
  for (const m of t.matchAll(re)) {
    let v = Number(m[2].includes(',') ? m[2].replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(m[2]) ? m[2].replace(/\./g, '') : m[2])
    if (m[3]) v *= 1000
    if (!(v > 0)) continue
    candidatos.push({ valor: v, pontos: (m[1] ? 2 : 0) + (/[.,]/.test(m[2]) || m[3] ? 1 : 0), bruto: m[0] })
  }
  if (candidatos.length === 0) return null
  candidatos.sort((a, b) => b.pontos - a.pontos || b.valor - a.valor)
  const valor = candidatos[0].valor
  const valorMatch = [candidatos[0].bruto]
  const receita = /vendi|venda|recebi|entrou|receita/i.test(t)
  const pago = receita ? /recebi|entrou|à vista|a vista|pago/i.test(t) : !/a prazo|vence|boleto|fiado|parcel/i.test(t)
  const hoje = hojeISO()
  const data = /ontem/i.test(t) ? addDays(hoje, -1) : /anteontem/i.test(t) ? addDays(hoje, -2) : (t.match(/dia (\d{1,2})/i) ? `${hoje.slice(0, 8)}${t.match(/dia (\d{1,2})/i)![1].padStart(2, '0')}` : hoje)
  let categoria = receita ? 'Venda de animais' : 'Geral'
  let centro: CentroCusto = 'Geral'
  let achou = false
  for (const [re, cat, c] of CATEGORIAS_PALAVRAS) {
    if (re.test(t)) {
      categoria = cat
      centro = c
      achou = true
      break
    }
  }
  if (/bezerr|desmam|cria/i.test(t)) centro = 'Cria'
  else if (/recria|garrote|novilh/i.test(t)) centro = 'Recria'
  else if (/boi gordo|abate|confinam|terminaç/i.test(t)) centro = 'Terminacao'
  if (receita && categoria === 'Geral') categoria = 'Venda de animais'
  return {
    tipo: receita ? 'receita' : 'despesa', valor, categoria, centroCusto: centro, data, pago,
    descricao: t.replace(/\s+/g, ' ').slice(0, 80),
    confianca: achou && valorMatch[0].length > 1 ? 'alta' : achou ? 'media' : 'baixa',
  }
}

export const CATEGORIA_TEXTO = (c: keyof typeof CATEGORIA_LABEL) => CATEGORIA_LABEL[c]
export type { Pasto }
