// Indicadores do Confinamento — tudo calculado a partir dos dados (nada fixo em componente)
import type { Baia, Dieta, Enfermaria, LoteConfinamento, SeedData } from '@/data/types'
import { addDays, CONFINAMENTO, diffDays, KG_POR_ARROBA } from '@/data/seed'
import { hojeISO } from '@/lib/format'
import { ativos } from '@/lib/metrics'
import type { Alerta } from '@/lib/metrics'

type DadosConf = Pick<
  SeedData,
  'animais' | 'lotesConfinamento' | 'baias' | 'dietas' | 'leiturasCocho' | 'estoque' | 'enfermaria' | 'config' | 'abates' | 'movEstoque'
>

const r2 = (n: number) => Math.round(n * 100) / 100

/** Custo de 1 kg da dieta como fornecida (soma dos ingredientes pelo custo médio do estoque) */
export function custoKgDieta(dieta: Dieta, estoque: SeedData['estoque']): number {
  return dieta.ingredientes.reduce((s, i) => {
    const item = estoque.find((e) => e.id === i.itemEstoqueId)
    return s + (i.pct / 100) * (item?.custoMedio ?? 0)
  }, 0)
}

/** Custo da dieta por kg de matéria seca */
export function custoKgMSDieta(dieta: Dieta, estoque: SeedData['estoque']): number {
  return dieta.msPct > 0 ? custoKgDieta(dieta, estoque) / (dieta.msPct / 100) : 0
}

export function lotesConfAtivos(data: Pick<SeedData, 'lotesConfinamento'>) {
  return data.lotesConfinamento.filter((l) => l.status === 'ativo')
}

export function cabecasLote(data: Pick<SeedData, 'animais'>, loteId: string): number {
  return ativos(data.animais).filter((a) => a.loteId === loteId).length
}

/** Peso médio atual do lote: média dos animais (cai para a última pesagem do lote se não houver animais) */
export function pesoMedioLote(data: Pick<SeedData, 'animais'>, lote: LoteConfinamento): number {
  const an = ativos(data.animais).filter((a) => a.loteId === lote.id)
  if (an.length > 0) return an.reduce((s, a) => s + a.pesoAtual, 0) / an.length
  const ult = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data)).at(-1)
  return ult?.peso ?? lote.pesoEntrada
}

/** Peso médio do lote numa data (interpolação entre pesagens) */
export function pesoNaData(lote: LoteConfinamento, data: string): number {
  const pes = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  if (pes.length === 0) return lote.pesoEntrada
  if (data <= pes[0].data) return pes[0].peso
  for (let i = 1; i < pes.length; i++) {
    if (data <= pes[i].data) {
      const span = diffDays(pes[i - 1].data, pes[i].data) || 1
      const f = diffDays(pes[i - 1].data, data) / span
      return pes[i - 1].peso + (pes[i].peso - pes[i - 1].peso) * f
    }
  }
  const ult = pes[pes.length - 1]
  const ant = pes[pes.length - 2]
  if (!ant) return ult.peso
  const gmd = (ult.peso - ant.peso) / (diffDays(ant.data, ult.data) || 1)
  return ult.peso + gmd * diffDays(ult.data, data)
}

export type StatusEnfermaria = 'tratamento' | 'carencia' | 'liberado'

export function statusEnfermaria(e: Enfermaria, hoje = hojeISO()): StatusEnfermaria {
  if (hoje < e.fimTratamento) return 'tratamento'
  if (hoje < addDays(e.fimTratamento, e.carenciaDias)) return 'carencia'
  return 'liberado'
}

export function enfermariaAberta(data: Pick<SeedData, 'enfermaria'>) {
  return data.enfermaria.filter((e) => !e.saida)
}

/** Consumo diário do lote: previsto (pela dieta e pelo peso) × realizado (leitura) */
export function consumoLote(data: DadosConf, lote: LoteConfinamento, dias?: number) {
  const hoje = hojeISO()
  const cab = cabecasLote(data, lote.id)
  const leituras = data.leiturasCocho
    .filter((l) => l.loteId === lote.id)
    .sort((a, b) => a.data.localeCompare(b.data))
  const corte = dias ? addDays(hoje, -dias) : undefined
  return leituras
    .filter((l) => !corte || l.data >= corte)
    .map((l) => {
      const dieta = data.dietas.find((d) => d.id === l.dietaId) ?? data.dietas.find((d) => d.id === lote.dietaId)
      const ms = dieta ? dieta.msPct / 100 : 1
      const pv = pesoNaData(lote, l.data)
      const previsto = dieta ? (l.cabecas * pv * (dieta.consumoMSPctPV / 100)) / ms : l.kgCalculado
      return {
        data: l.data,
        nota: l.nota,
        realizado: l.kgCalculado,
        previsto: Math.round(previsto),
        kgMS: l.kgCalculado * ms,
        msCabDia: l.cabecas > 0 ? (l.kgCalculado * ms) / l.cabecas : 0,
        pctPV: l.cabecas > 0 && pv > 0 ? ((l.kgCalculado * ms) / l.cabecas / pv) * 100 : 0,
        sobraKg: l.sobraKg ?? 0,
        custo: dieta ? l.kgCalculado * custoKgDieta(dieta, data.estoque) : 0,
        cabecas: l.cabecas || cab,
      }
    })
}

export interface ResumoLote {
  lote: LoteConfinamento
  baia?: Baia
  dieta?: Dieta
  cab: number
  mortos: number
  mortalidadePct: number
  naEnfermaria: number
  diasCocho: number
  pesoAtual: number
  ganhoKgCab: number
  gmd: number
  gmdRecente: number
  ganhoCarcacaDia: number
  /** consumo de matéria seca por cabeça/dia (média dos últimos 7 dias) e em % do peso vivo */
  msCabDia: number
  consumoPctPV: number
  kgAsFedCabDia: number
  conversaoAlimentar: number
  custoEntrada: number
  custoAlimentacao: number
  custoFixo: number
  custoSanitario: number
  custoTotal: number
  custoDiarioCab: number
  arrobasProduzidas: number
  custoArrobaProduzida: number
  diasRestantes: number
  dataAbatePrevista: string
  diasCochoPrevistos: number
  acimaDoPlano: boolean
  custoTotalProjetado: number
  arrobasSaida: number
  receitaProjetada: number
  margemProjetada: number
  margemCab: number
  arrobaEquilibrio: number
  precoArroba: number
}

export interface CenarioConf {
  /** variações em % sobre a cotação, o custo (alimentação + fixo) e o GMD */
  arrobaPct?: number
  custoPct?: number
  gmdPct?: number
}

export function resumoLote(data: DadosConf, lote: LoteConfinamento, cenario: CenarioConf = {}): ResumoLote {
  const hoje = hojeISO()
  const fArroba = 1 + (cenario.arrobaPct ?? 0) / 100
  const fCusto = 1 + (cenario.custoPct ?? 0) / 100
  const fGmd = 1 + (cenario.gmdPct ?? 0) / 100
  const precoArroba = (data.config.precoArroba ?? 0) * fArroba
  const custoFixoDia = data.config.custoFixoCabDia ?? CONFINAMENTO.custoFixoCabDia
  const baia = data.baias.find((b) => b.id === lote.baiaId)
  const dieta = data.dietas.find((d) => d.id === lote.dietaId)
  const cab = cabecasLote(data, lote.id)
  const mortos = data.animais.filter((a) => a.loteId === lote.id && a.status === 'morto').length
  const naEnfermaria = enfermariaAberta(data).filter((e) => e.loteId === lote.id).length
  const fimLote = lote.status === 'abatido' ? (lote.pesagens.at(-1)?.data ?? hoje) : hoje
  const diasCocho = Math.max(1, diffDays(lote.dataEntrada, fimLote))
  const pesoAtual = pesoMedioLote(data, lote)
  const ganhoKgCab = pesoAtual - lote.pesoEntrada
  const gmd = ganhoKgCab / diasCocho
  const pes = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
  const ult = pes.at(-1)
  const ant = pes.at(-2)
  const gmdRecente = ult && ant && diffDays(ant.data, ult.data) > 0 ? (ult.peso - ant.peso) / diffDays(ant.data, ult.data) : gmd
  const rend = lote.rendimentoEstimado / 100

  const consumo = consumoLote(data, lote)
  const ult7 = consumo.slice(-7)
  const msCabDia = ult7.length > 0 ? ult7.reduce((s, c) => s + c.msCabDia, 0) / ult7.length : 0
  const kgAsFedCabDia = ult7.length > 0 ? ult7.reduce((s, c) => s + c.realizado / c.cabecas, 0) / ult7.length : 0
  const consumoPctPV = pesoAtual > 0 ? (msCabDia / pesoAtual) * 100 : 0
  const kgMSTotal = consumo.reduce((s, c) => s + c.kgMS, 0)
  const ganhoTotalKg = ganhoKgCab * cab
  const conversaoAlimentar = ganhoTotalKg > 0 ? kgMSTotal / ganhoTotalKg : 0

  // custo de entrada dos animais que ainda estão no lote (os já abatidos levaram a parte deles)
  const custoEntrada = (lote.status === 'abatido' ? lote.qtdEntrada : cab + mortos) * lote.custoCabEntrada
  const custoAlimentacao = consumo.reduce((s, c) => s + c.custo, 0) * fCusto
  const custoFixo = cab * diasCocho * custoFixoDia * fCusto
  const custoSanitario = data.enfermaria.filter((e) => e.loteId === lote.id).reduce((s, e) => s + e.custo, 0)
  const custoTotal = custoEntrada + custoAlimentacao + custoFixo + custoSanitario
  const custoDiarioCab = cab > 0 ? (custoAlimentacao + custoFixo + custoSanitario) / (cab * diasCocho) : 0
  const arrobasProduzidas = (ganhoTotalKg * rend) / CONFINAMENTO.kgArrobaCarcaca
  const custoArrobaProduzida = arrobasProduzidas > 0 ? (custoAlimentacao + custoFixo + custoSanitario) / arrobasProduzidas : 0

  // projeção até o peso de abate com o ritmo recente (ou a meta, no começo do lote)
  const ritmo = (diasCocho >= 14 && gmdRecente > 0 ? gmdRecente : lote.gmdMeta) * fGmd
  const diasRestantes = lote.status === 'abatido' ? 0 : Math.max(0, Math.ceil((lote.pesoAbateAlvo - pesoAtual) / Math.max(ritmo, 0.1)))
  const dataAbatePrevista = addDays(hoje, diasRestantes)
  const diasCochoPrevistos = diasCocho + diasRestantes
  const acimaDoPlano = lote.status === 'ativo' && diasCochoPrevistos > lote.diasCochoPlano
  const custoDiaAtual = (kgAsFedCabDia > 0 && dieta ? kgAsFedCabDia * custoKgDieta(dieta, data.estoque) : custoDiarioCab) * fCusto
  const custoRestante = cab * diasRestantes * (custoDiaAtual + custoFixoDia * fCusto)
  const custoTotalProjetado = custoTotal + custoRestante
  const pesoSaida = lote.status === 'abatido' ? pesoAtual : Math.max(pesoAtual, lote.pesoAbateAlvo)
  const arrobasSaida = (cab * pesoSaida * rend) / CONFINAMENTO.kgArrobaCarcaca
  const receitaProjetada = arrobasSaida * precoArroba
  const margemProjetada = receitaProjetada - custoTotalProjetado
  const margemCab = cab > 0 ? margemProjetada / cab : 0
  const arrobaEquilibrio = arrobasSaida > 0 ? custoTotalProjetado / arrobasSaida : 0

  return {
    lote, baia, dieta, cab, mortos, mortalidadePct: lote.qtdEntrada > 0 ? (mortos / lote.qtdEntrada) * 100 : 0, naEnfermaria,
    diasCocho, pesoAtual, ganhoKgCab, gmd, gmdRecente, ganhoCarcacaDia: gmd * rend,
    msCabDia, consumoPctPV, kgAsFedCabDia, conversaoAlimentar,
    custoEntrada, custoAlimentacao, custoFixo, custoSanitario, custoTotal, custoDiarioCab,
    arrobasProduzidas, custoArrobaProduzida,
    diasRestantes, dataAbatePrevista, diasCochoPrevistos, acimaDoPlano,
    custoTotalProjetado, arrobasSaida, receitaProjetada, margemProjetada, margemCab, arrobaEquilibrio, precoArroba,
  }
}

export function resumoConfinamento(data: DadosConf, cenario: CenarioConf = {}) {
  const hoje = hojeISO()
  const lotes = lotesConfAtivos(data).map((l) => resumoLote(data, l, cenario))
  const cab = lotes.reduce((s, l) => s + l.cab, 0)
  const pond = (f: (l: ResumoLote) => number) => (cab > 0 ? lotes.reduce((s, l) => s + f(l) * l.cab, 0) / cab : 0)
  const ganhoTotal = lotes.reduce((s, l) => s + l.ganhoKgCab * l.cab, 0)
  const kgMS = lotes.reduce((s, l) => s + l.conversaoAlimentar * l.ganhoKgCab * l.cab, 0)
  const arrobasProduzidas = lotes.reduce((s, l) => s + l.arrobasProduzidas, 0)
  const custoProducao = lotes.reduce((s, l) => s + l.custoAlimentacao + l.custoFixo + l.custoSanitario, 0)
  const capacidade = data.baias.reduce((s, b) => s + b.capacidade, 0)
  const ocupadas = new Set(lotes.map((l) => l.lote.baiaId)).size
  const abates30 = lotes.filter((l) => l.diasRestantes <= 30)
  const leiturasHoje = data.leiturasCocho.filter((l) => l.data === hoje).map((l) => l.loteId)
  const semLeituraHoje = lotes.filter((l) => !leiturasHoje.includes(l.lote.id))
  return {
    lotes: lotes.sort((a, b) => a.diasRestantes - b.diasRestantes),
    cab,
    capacidade,
    ocupacaoPct: capacidade > 0 ? (cab / capacidade) * 100 : 0,
    baiasOcupadas: ocupadas,
    baiasTotal: data.baias.length,
    gmd: pond((l) => l.gmd),
    conversaoAlimentar: ganhoTotal > 0 ? kgMS / ganhoTotal : 0,
    msCabDia: pond((l) => l.msCabDia),
    custoDiarioCab: pond((l) => l.custoDiarioCab),
    custoArrobaProduzida: arrobasProduzidas > 0 ? custoProducao / arrobasProduzidas : 0,
    arrobasProduzidas,
    precoArroba: (data.config.precoArroba ?? 0) * (1 + (cenario.arrobaPct ?? 0) / 100),
    margemProjetada: lotes.reduce((s, l) => s + l.margemProjetada, 0),
    receitaProjetada: lotes.reduce((s, l) => s + l.receitaProjetada, 0),
    abates30: abates30.length,
    cabAbates30: abates30.reduce((s, l) => s + l.cab, 0),
    naEnfermaria: enfermariaAberta(data).length,
    semLeituraHoje,
    mortalidadePct: (() => {
      const entradas = lotesConfAtivos(data).reduce((s, l) => s + l.qtdEntrada, 0)
      const mortos = lotes.reduce((s, l) => s + l.mortos, 0)
      return entradas > 0 ? (mortos / entradas) * 100 : 0
    })(),
  }
}

/** Situação de cada baia: lote, ocupação e quando libera */
export function baiasStatus(data: DadosConf) {
  const resumos = lotesConfAtivos(data).map((l) => resumoLote(data, l))
  return data.baias.map((b) => {
    const r = resumos.find((x) => x.lote.baiaId === b.id)
    return {
      baia: b,
      resumo: r,
      cab: r?.cab ?? 0,
      ocupacaoPct: b.capacidade > 0 ? ((r?.cab ?? 0) / b.capacidade) * 100 : 0,
      liberaEmDias: r ? r.diasRestantes : 0,
      livre: !r,
    }
  })
}

/** Dias de estoque de cada ingrediente das dietas (saldo ÷ consumo médio dos últimos 7 dias) */
export function diasEstoqueIngredientes(data: DadosConf) {
  const hoje = hojeISO()
  const corte = addDays(hoje, -7)
  const ids = new Set(data.dietas.flatMap((d) => d.ingredientes.map((i) => i.itemEstoqueId)))
  return [...ids]
    .map((id) => {
      const item = data.estoque.find((e) => e.id === id)
      const kg7 = data.movEstoque
        .filter((m) => m.itemId === id && m.tipo === 'saida' && m.data > corte)
        .reduce((s, m) => s + m.quantidade, 0)
      const porDia = kg7 / 7
      return { item, consumoDia: porDia, dias: item && porDia > 0 ? item.saldo / porDia : Infinity }
    })
    .filter((x) => x.item)
    .sort((a, b) => a.dias - b.dias)
}

export function alertasConfinamento(data: DadosConf): Alerta[] {
  const out: Alerta[] = []
  if (data.lotesConfinamento.length === 0) return out
  const hoje = hojeISO()
  const resumo = resumoConfinamento(data)

  if (resumo.semLeituraHoje.length > 0) {
    out.push({
      tipo: 'cocho', severidade: 'warning',
      titulo: `${resumo.semLeituraHoje.length} baia(s) sem leitura de cocho hoje`,
      detalhe: 'O trato do dia sai da nota da sobra — fazer a leitura antes do primeiro trato',
      link: '/confinamento?tab=cocho',
    })
  }
  for (const r of resumo.lotes) {
    const serie = consumoLote(data, r.lote, 10)
    const ult3 = serie.slice(-3)
    const ant7 = serie.slice(0, -3)
    if (ult3.length === 3 && ant7.length >= 4) {
      const m3 = ult3.reduce((s, c) => s + c.msCabDia, 0) / 3
      const m7 = ant7.reduce((s, c) => s + c.msCabDia, 0) / ant7.length
      const queda = m7 > 0 ? (1 - m3 / m7) * 100 : 0
      if (queda >= CONFINAMENTO.quedaConsumoPct) {
        out.push({
          tipo: 'cocho', severidade: 'critical',
          titulo: `${r.lote.nome}: consumo caiu ${Math.round(queda)}% em 3 dias`,
          detalhe: `${m3.toFixed(1).replace('.', ',')} kg MS/cab/dia contra ${m7.toFixed(1).replace('.', ',')} na semana anterior — conferir água, acidose e saúde do lote`,
          link: `/confinamento?tab=cocho&lote=${r.lote.id}`,
        })
      }
    }
    const ontem = serie.find((c) => c.data === addDays(hoje, -1))
    if (ontem && ontem.nota === 4) {
      out.push({
        tipo: 'cocho', severidade: 'warning',
        titulo: `${r.baia?.nome ?? r.lote.nome}: muita sobra no cocho (nota 4)`,
        detalhe: `${ontem.sobraKg.toLocaleString('pt-BR')} kg sobraram do trato de ontem — reduzir o trato de hoje em 10%`,
        link: `/confinamento?tab=cocho&lote=${r.lote.id}`,
      })
    }
    if (r.diasCocho >= 14 && r.gmdRecente < r.lote.gmdMeta * 0.9) {
      out.push({
        tipo: 'gmd', severidade: 'warning',
        titulo: `${r.lote.nome}: GMD ${r.gmdRecente.toFixed(2).replace('.', ',')} kg/dia abaixo da meta da fase`,
        detalhe: `Meta ${r.lote.gmdMeta.toFixed(2).replace('.', ',')} kg/dia — rever dieta, cocho e sanidade do lote`,
        link: `/confinamento?tab=lotes&lote=${r.lote.id}`,
      })
    }
    if (r.acimaDoPlano) {
      out.push({
        tipo: 'abate', severidade: 'warning',
        titulo: `${r.lote.nome}: ${r.diasCochoPrevistos} dias de cocho previstos (plano ${r.lote.diasCochoPlano})`,
        detalhe: `Cada dia a mais custa ~${r.custoDiarioCab.toFixed(2).replace('.', ',')} R$/cab — avaliar abate antecipado`,
        link: `/confinamento?tab=abate`,
      })
    }
  }
  const aberta = enfermariaAberta(data)
  if (resumo.cab > 0 && (aberta.length / resumo.cab) * 100 > CONFINAMENTO.enfermariaMaxPct) {
    out.push({
      tipo: 'enfermaria', severidade: 'critical',
      titulo: `${aberta.length} animais na enfermaria (${((aberta.length / resumo.cab) * 100).toFixed(1).replace('.', ',')}% do cocho)`,
      detalhe: 'Acima do limite — revisar protocolo de recepção e adaptação',
      link: '/confinamento?tab=enfermaria',
    })
  }
  const liberados = aberta.filter((e) => statusEnfermaria(e, hoje) === 'liberado')
  if (liberados.length > 0) {
    out.push({
      tipo: 'enfermaria', severidade: 'warning',
      titulo: `${liberados.length} animal(is) com carência cumprida ainda na enfermaria`,
      detalhe: liberados.slice(0, 3).map((e) => e.brinco).join(' · ') + ' — dar alta e devolver ao lote',
      link: '/confinamento?tab=enfermaria',
    })
  }
  for (const d of diasEstoqueIngredientes(data)) {
    if (d.item && d.dias < CONFINAMENTO.diasEstoqueMinimo) {
      out.push({
        tipo: 'estoque', severidade: 'critical',
        titulo: `${d.item.nome}: estoque para ${d.dias.toFixed(1).replace('.', ',')} dias`,
        detalhe: `${d.item.saldo.toLocaleString('pt-BR')} kg em estoque, consumo de ${Math.round(d.consumoDia).toLocaleString('pt-BR')} kg/dia`,
        link: '/compras',
      })
    }
  }
  return out
}

/** Calculadora de viabilidade: compra, dias de cocho, custo, receita e giros por ano */
export function viabilidade(p: {
  cabecas: number
  pesoEntrada: number
  pesoSaida: number
  precoArrobaMagro: number
  agioPct: number
  precoArrobaGordo: number
  gmd: number
  custoDiaCab: number
  rendimento: number
  mortalidadePct: number
  diasVazioBaia: number
}) {
  const custoCab = (p.pesoEntrada / KG_POR_ARROBA) * p.precoArrobaMagro * (1 + p.agioPct / 100)
  const dias = p.gmd > 0 ? Math.ceil((p.pesoSaida - p.pesoEntrada) / p.gmd) : 0
  const vivos = p.cabecas * (1 - p.mortalidadePct / 100)
  const custoCompra = p.cabecas * custoCab
  const custoManutencao = vivos * dias * p.custoDiaCab
  const custoTotal = custoCompra + custoManutencao
  const arrobas = (vivos * p.pesoSaida * (p.rendimento / 100)) / CONFINAMENTO.kgArrobaCarcaca
  const receita = arrobas * p.precoArrobaGordo
  const lucro = receita - custoTotal
  const giros = dias > 0 ? 365 / (dias + p.diasVazioBaia) : 0
  return {
    custoCab: r2(custoCab), dias, vivos, custoCompra, custoManutencao, custoTotal, arrobas, receita, lucro,
    lucroCab: p.cabecas > 0 ? lucro / p.cabecas : 0,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
    giros, lucroAno: lucro * giros,
    arrobaEquilibrio: arrobas > 0 ? custoTotal / arrobas : 0,
    custoArrobaProduzida: (() => {
      const prod = (vivos * (p.pesoSaida - p.pesoEntrada) * (p.rendimento / 100)) / CONFINAMENTO.kgArrobaCarcaca
      return prod > 0 ? custoManutencao / prod : 0
    })(),
  }
}
