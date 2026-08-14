// Métricas derivadas do estado — funções puras usadas pelas páginas
import type { Animal, Categoria, ItemEstoque, Pasto, SeedData } from '@/data/types'
import { PARAMS, addDays, diffDays } from '@/data/seed'
import { hojeISO } from '@/lib/format'

export const UA_KG = PARAMS.uaKg
export const KG_POR_ARROBA = PARAMS.kgPorArroba

export function ativos(animais: Animal[]) {
  return animais.filter((a) => a.status === 'ativo')
}

export function inventarioPorCategoria(animais: Animal[]): Record<Categoria, number> {
  const inv = {
    bezerro: 0, bezerra: 0, garrote: 0, novilha_13_24: 0,
    novilha_24: 0, vaca: 0, touro: 0, boi_terminacao: 0,
  } as Record<Categoria, number>
  for (const a of ativos(animais)) inv[a.categoria]++
  return inv
}

export function uaTotal(animais: Animal[]): number {
  return ativos(animais).reduce((s, a) => s + a.pesoAtual, 0) / UA_KG
}

export function uaPorPasto(data: Pick<SeedData, 'animais' | 'lotes' | 'pastos'>): { pasto: Pasto; ua: number }[] {
  const lotePasto = new Map(data.lotes.map((l) => [l.id, l.pastoId]))
  const kgPorPasto = new Map<string, number>()
  for (const a of ativos(data.animais)) {
    const pastoId = lotePasto.get(a.loteId)
    if (!pastoId) continue
    kgPorPasto.set(pastoId, (kgPorPasto.get(pastoId) ?? 0) + a.pesoAtual)
  }
  return data.pastos.map((p) => ({ pasto: p, ua: (kgPorPasto.get(p.id) ?? 0) / UA_KG }))
}

/** GMD médio ponderado dos lotes de recria */
export function gmdMedioRecria(data: Pick<SeedData, 'lotesRecria'>): number {
  let kg = 0
  let cabDias = 0
  const hoje = hojeISO()
  for (const l of data.lotesRecria) {
    const dias = Math.max(diffDays(l.dataEntrada, hoje), 1)
    kg += l.qtd * l.gmd * dias
    cabDias += l.qtd * dias
  }
  return cabDias > 0 ? kg / cabDias : 0
}

/** Ganho total de kg dos lotes ativos (recria + terminação) desde a entrada */
export function ganhoKgTotal(data: Pick<SeedData, 'lotesRecria' | 'animais'>): number {
  const hoje = hojeISO()
  let kg = 0
  for (const l of data.lotesRecria) {
    kg += l.qtd * l.gmd * Math.max(diffDays(l.dataEntrada, hoje), 0)
  }
  // confinamento: peso atual − primeira pesagem
  for (const a of ativos(data.animais)) {
    if (a.categoria !== 'boi_terminacao' || a.pesagens.length === 0) continue
    kg += a.pesoAtual - a.pesagens[0].peso
  }
  return kg
}

export function arrobasProduzidas(data: Pick<SeedData, 'lotesRecria' | 'animais'>): number {
  return ganhoKgTotal(data) / KG_POR_ARROBA
}

export function custoTotalRateado(data: Pick<SeedData, 'pedidos'>): number {
  return data.pedidos
    .filter((p) => p.status === 'recebido')
    .reduce((s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)
}

export function custoPorArroba(data: Pick<SeedData, 'pedidos' | 'lotesRecria' | 'animais'>): number {
  const arrobas = arrobasProduzidas(data)
  return arrobas > 0 ? custoTotalRateado(data) / arrobas : 0
}

export function custoPorCentro(data: Pick<SeedData, 'pedidos'>): Record<string, number> {
  const out: Record<string, number> = { Cria: 0, Recria: 0, Terminacao: 0, Geral: 0 }
  for (const p of data.pedidos) {
    if (p.status !== 'recebido') continue
    const total = p.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
    for (const [centro, pct] of Object.entries(p.rateio)) {
      out[centro] += (total * pct) / 100
    }
  }
  return out
}

/** Quantidade real de um lote de recria = animais ativos alocados nele */
export function qtdLoteRecria(animais: Animal[], loteId: string): number {
  return ativos(animais).filter((a) => a.loteId === loteId).length
}

// ---- Reprodução ----
export function metricasReproducao(
  data: Pick<SeedData, 'diagnosticos' | 'estacoes' | 'protocolosIATF' | 'pedidos' | 'animais'>,
) {
  const estacao = data.estacoes.find((e) => e.status === 'em_andamento')
  const dgs = data.diagnosticos.filter((d) => d.estacaoId === estacao?.id)
  const prenhas = dgs.filter((d) => d.resultado === 'prenha')
  const prenhasIATF = prenhas.filter((d) => d.origemPrenhez === 'IATF')
  const pendentes = dgs.filter((d) => d.resultado === 'pendente')
  const expostas = estacao?.matrizesExpostas ?? 0
  const dosesIATF = data.protocolosIATF.reduce((s, p) => s + p.doses, 0)

  // custo por prenhez: sêmen + hormônios recebidos ÷ prenhezes confirmadas
  const custoRepro = data.pedidos
    .filter((p) => p.status === 'recebido')
    .flatMap((p) => p.itens)
    .filter((i) => i.itemEstoqueId.startsWith('SEM-') || i.itemEstoqueId.startsWith('HOR-'))
    .reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)

  // ECC médio das matrizes ativas (vacas + novilhas >24m com escore registrado)
  const matrizes = ativos(data.animais).filter(
    (a) => (a.categoria === 'vaca' || a.categoria === 'novilha_24') && a.ecc !== undefined,
  )
  const eccMedio =
    matrizes.length > 0 ? matrizes.reduce((s, a) => s + (a.ecc ?? 0), 0) / matrizes.length : 0

  return {
    eccMedio,
    estacao,
    expostas,
    dosesIATF,
    prenhezIATFPct: dosesIATF > 0 ? (prenhasIATF.length / dosesIATF) * 100 : 0,
    prenhezFinalPct: expostas > 0 ? (prenhas.length / expostas) * 100 : 0,
    prenhasTotal: prenhas.length,
    prenhasIATF: prenhasIATF.length,
    prenhasTouro: prenhas.length - prenhasIATF.length,
    pendentes: pendentes.length,
    custoPorPrenhez: prenhas.length > 0 ? custoRepro / prenhas.length : 0,
    prenhezPorTerco: prenhezPorTerco(data),
  }
}

export function prenhezPorTerco(data: Pick<SeedData, 'diagnosticos' | 'estacoes'>) {
  const estacao = data.estacoes.find((e) => e.status === 'em_andamento')
  if (!estacao) return []
  const dur = diffDays(estacao.inicio, estacao.fim)
  const tercos = [0, 0, 0]
  for (const d of data.diagnosticos) {
    if (d.resultado !== 'prenha' || !d.dataConcepcao || d.estacaoId !== estacao.id) continue
    const off = diffDays(estacao.inicio, d.dataConcepcao)
    const t = Math.min(2, Math.max(0, Math.floor((off / dur) * 3)))
    tercos[t]++
  }
  return [
    { terco: '1º terço', prenhezes: tercos[0] },
    { terco: '2º terço', prenhezes: tercos[1] },
    { terco: '3º terço', prenhezes: tercos[2] },
  ]
}

// ---- Cria ----
export function metricasCria(data: Pick<SeedData, 'partos' | 'desmames' | 'movimentacoes' | 'estacoes' | 'animais'>) {
  const partos = data.partos
  const mortes = data.movimentacoes.filter(
    (m) => m.tipo === 'morte' && (m.categoria === 'bezerro' || m.categoria === 'bezerra'),
  )
  const estacaoPassada = data.estacoes.find((e) => e.status === 'encerrada')
  const expostas = estacaoPassada?.matrizesExpostas ?? 0

  // peso 205 dias ajustado: peso desmame ajustado linearmente
  const pesosAj = data.desmames.map((d) => {
    const parto = partos.find((p) => p.bezerroBrinco === d.bezerroBrinco)
    const nascer = parto?.pesoNascer ?? 32
    return nascer + ((d.peso - nascer) / d.idadeDias) * 205
  })
  const pesoDesmame205 = pesosAj.length > 0 ? pesosAj.reduce((a, b) => a + b, 0) / pesosAj.length : 0
  const kgDesmamado = data.desmames.reduce((s, d) => s + d.peso, 0)

  return {
    partos: partos.length,
    mortes: mortes.length,
    natalidadePct: expostas > 0 ? (partos.length / expostas) * 100 : 0,
    mortalidadePct: partos.length > 0 ? (mortes.length / partos.length) * 100 : 0,
    desmamados: data.desmames.length,
    taxaDesmamePct: expostas > 0 ? ((partos.length - mortes.length) / expostas) * 100 : 0,
    pesoDesmame205,
    kgBezerroPorMatriz: expostas > 0 ? kgDesmamado / expostas : 0,
    intervaloPartosDias: PARAMS.cria.intervaloPartosDias,
  }
}

// ---- Alertas ----
export interface Alerta {
  tipo: 'vacina' | 'lotacao' | 'estoque' | 'dg'
  severidade: 'warning' | 'critical'
  titulo: string
  detalhe: string
  /** rota do módulo onde o alerta é tratado */
  link: string
}

export function alertas(data: SeedData): Alerta[] {
  const out: Alerta[] = []
  const hoje = hojeISO()
  const limite = addDays(hoje, 60)

  for (const it of data.estoque) {
    if (it.categoria === 'vacina' && it.validade && it.validade <= limite && it.saldo > 0) {
      out.push({
        tipo: 'vacina',
        severidade: 'warning',
        titulo: `${it.nome} vence em breve`,
        detalhe: `Validade ${it.validade.split('-').reverse().join('/')} — saldo ${it.saldo} ${it.unidade}`,
        link: '/estoque',
      })
    }
  }
  for (const { pasto, ua } of uaPorPasto(data)) {
    if (ua > pasto.capacidadeUA) {
      out.push({
        tipo: 'lotacao',
        severidade: 'critical',
        titulo: `${pasto.nome} acima da capacidade`,
        detalhe: `${ua.toFixed(0)} UA para capacidade de ${pasto.capacidadeUA} UA`,
        link: '/rebanho',
      })
    }
  }
  for (const it of data.estoque) {
    if (it.minimo > 0 && it.saldo < it.minimo) {
      out.push({
        tipo: 'estoque',
        severidade: 'warning',
        titulo: `${it.nome} abaixo do mínimo`,
        detalhe: `Saldo ${it.saldo.toLocaleString('pt-BR')} ${it.unidade} (mínimo ${it.minimo.toLocaleString('pt-BR')})`,
        link: '/estoque',
      })
    }
  }
  const pendentes = data.diagnosticos.filter((d) => d.resultado === 'pendente').length
  if (pendentes > 0) {
    out.push({
      tipo: 'dg',
      severidade: 'warning',
      titulo: `${pendentes} matrizes com DG pendente`,
      detalhe: 'Agendar diagnóstico de gestação do repasse',
      link: '/reproducao',
    })
  }
  return out.sort((a, b) => (a.severidade === 'critical' ? -1 : 1) - (b.severidade === 'critical' ? -1 : 1))
}

// ---- Evolução do rebanho (12 meses) ----
function categoriaNaData(a: Animal, dataRef: string): Categoria | null {
  if (a.nascimento > dataRef) return null
  const meses = diffDays(a.nascimento, dataRef) / 30.44
  switch (a.categoria) {
    case 'boi_terminacao':
      // comprados: só contam depois da primeira pesagem (entrada)
      return a.pesagens.length > 0 && a.pesagens[0].data <= dataRef ? 'boi_terminacao' : null
    case 'vaca':
    case 'touro':
      return a.categoria
    case 'novilha_24':
      return meses >= 24 ? 'novilha_24' : 'novilha_13_24'
    case 'bezerro':
    case 'garrote':
      return meses < 12 ? 'bezerro' : 'garrote'
    case 'bezerra':
    case 'novilha_13_24':
      return meses < 12 ? 'bezerra' : 'novilha_13_24'
  }
}

export function evolucaoRebanho(data: Pick<SeedData, 'animais' | 'movimentacoes'>) {
  const hoje = hojeISO()
  const pontos: { mes: string; Bezerros: number; Recria: number; Novilhas: number; Matrizes: number; Terminação: number }[] = []
  for (let m = 11; m >= 0; m--) {
    const ref = addDays(hoje, -m * 30)
    const p = { mes: ref, Bezerros: 0, Recria: 0, Novilhas: 0, Matrizes: 0, 'Terminação': 0 }
    for (const a of data.animais) {
      if (a.status !== 'ativo') continue
      const cat = categoriaNaData(a, ref)
      if (!cat) continue
      if (cat === 'bezerro' || cat === 'bezerra') p.Bezerros++
      else if (cat === 'garrote' || cat === 'novilha_13_24') p.Recria++
      else if (cat === 'novilha_24') p.Novilhas++
      else if (cat === 'vaca' || cat === 'touro') p.Matrizes++
      else p['Terminação']++
    }
    pontos.push(p)
  }
  return pontos
}
