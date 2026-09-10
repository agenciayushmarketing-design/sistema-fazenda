// Métricas derivadas do estado — funções puras usadas pelas páginas
import type { Animal, Categoria, Lancamento, Pasto, SeedData } from '@/data/types'
import { addDays, diffDays, APARTACAO_DIAS, KG_POR_ARROBA, UA_KG } from '@/data/seed'
import { hojeISO } from '@/lib/format'

export { UA_KG, KG_POR_ARROBA, APARTACAO_DIAS }

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

/** Quantidade real de um lote de recria = animais ativos alocados nele */
export function qtdLoteRecria(animais: Animal[], loteId: string): number {
  return ativos(animais).filter((a) => a.loteId === loteId).length
}

/** Ganho total de kg dos lotes ativos (recria + terminação) desde a entrada */
export function ganhoKgTotal(data: Pick<SeedData, 'lotesRecria' | 'animais'>): number {
  const hoje = hojeISO()
  let kg = 0
  for (const l of data.lotesRecria) {
    kg += l.qtd * l.gmd * Math.max(diffDays(l.dataEntrada, hoje), 0)
  }
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

// ---- Partos previstos (calendário de nascimentos a partir dos DPPs) ----
export function partosPrevistos(data: Pick<SeedData, 'diagnosticos'>) {
  const hoje = hojeISO()
  return data.diagnosticos
    .filter((d) => d.resultado === 'prenha' && d.dppEstimado && d.dppEstimado >= hoje)
    .map((d) => ({
      matrizBrinco: d.matrizBrinco,
      origem: d.origemPrenhez,
      dataConcepcao: d.dataConcepcao,
      dpp: d.dppEstimado!,
      diasRestantes: diffDays(hoje, d.dppEstimado!),
    }))
    .sort((a, b) => a.dpp.localeCompare(b.dpp))
}

export function partosPrevistosPorMes(data: Pick<SeedData, 'diagnosticos'>) {
  const porMes = new Map<string, number>()
  for (const p of partosPrevistos(data)) {
    const mes = p.dpp.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) ?? 0) + 1)
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, qtd]) => ({ mes: `${mes}-01`, qtd }))
}

// ---- Sanitário ----
export function ocorrenciasAbertas(data: Pick<SeedData, 'rondas'>) {
  return data.rondas.flatMap((r) =>
    r.ocorrencias
      .filter((o) => !o.resolvida)
      .map((o) => ({ ronda: r, ocorrencia: o })),
  )
}

// ---- Descarte (vazias + IP estourado) ----
export const DIAS_POR_MES = 30.44

/** Vazias da estação atual, com dias desde o diagnóstico e a marcação de descarte */
export function listaVazias(data: Pick<SeedData, 'diagnosticos' | 'estacoes' | 'animais' | 'config'>) {
  const hoje = hojeISO()
  const estacao = data.estacoes.find((e) => e.status === 'em_andamento')
  const porBrinco = new Map(ativos(data.animais).map((a) => [a.brinco, a]))
  return data.diagnosticos
    .filter((d) => d.resultado === 'vazia' && d.estacaoId === estacao?.id)
    .map((d) => {
      const diasVazia = diffDays(d.data, hoje)
      return {
        matrizBrinco: d.matrizBrinco,
        animal: porBrinco.get(d.matrizBrinco),
        dataDG: d.data,
        diasVazia,
        descarte: diasVazia >= data.config.diasVaziaDescarte,
      }
    })
    .sort((a, b) => b.diasVazia - a.diasVazia)
}

/** Matrizes com IP acima da tolerância configurada (em meses) */
export function matrizesIPEstourado(
  data: Pick<SeedData, 'partos' | 'partosAnteriores' | 'animais' | 'config'>,
) {
  const porBrinco = new Map(ativos(data.animais).map((a) => [a.brinco, a]))
  return intervaloPartosPorMatriz(data)
    .map((ip) => ({ ...ip, ipMeses: ip.ipDias / DIAS_POR_MES, animal: porBrinco.get(ip.matrizBrinco) }))
    .filter((ip) => ip.ipMeses > data.config.toleranciaIPMeses)
}

/** União (sem duplicar matriz) dos dois critérios de descarte — alimenta o alerta */
export function candidatasDescarte(
  data: Pick<SeedData, 'diagnosticos' | 'estacoes' | 'animais' | 'config' | 'partos' | 'partosAnteriores'>,
) {
  const brincos = new Set<string>()
  for (const v of listaVazias(data)) if (v.descarte) brincos.add(v.matrizBrinco)
  for (const ip of matrizesIPEstourado(data)) brincos.add(ip.matrizBrinco)
  return brincos
}

// ---- Cria ----

/** IP por matriz: parto da safra atual × parto da safra anterior */
export function intervaloPartosPorMatriz(data: Pick<SeedData, 'partos' | 'partosAnteriores'>) {
  const out: { matrizBrinco: string; partoAnterior: string; partoAtual: string; ipDias: number }[] = []
  for (const ant of data.partosAnteriores) {
    const atual = data.partos.find((p) => p.matrizBrinco === ant.matrizBrinco)
    if (!atual) continue
    out.push({
      matrizBrinco: ant.matrizBrinco,
      partoAnterior: ant.data,
      partoAtual: atual.data,
      ipDias: diffDays(ant.data, atual.data),
    })
  }
  return out.sort((a, b) => b.ipDias - a.ipDias)
}

export function metricasCria(
  data: Pick<SeedData, 'partos' | 'partosAnteriores' | 'desmames' | 'movimentacoes' | 'estacoes' | 'animais'>,
) {
  const partos = data.partos
  const mortes = data.movimentacoes.filter(
    (m) => m.tipo === 'morte' && (m.categoria === 'bezerro' || m.categoria === 'bezerra'),
  )
  const estacaoPassada = data.estacoes.find((e) => e.status === 'encerrada')
  const expostas = estacaoPassada?.matrizesExpostas ?? 0

  const pesosAj = data.desmames.map((d) => {
    const parto = partos.find((p) => p.bezerroBrinco === d.bezerroBrinco)
    const nascer = parto?.pesoNascer ?? 32
    return nascer + ((d.peso - nascer) / d.idadeDias) * 205
  })
  const pesoDesmame205 = pesosAj.length > 0 ? pesosAj.reduce((a, b) => a + b, 0) / pesosAj.length : 0
  const kgDesmamado = data.desmames.reduce((s, d) => s + d.peso, 0)

  // IP médio real, calculado matriz a matriz (safra anterior × atual)
  const ips = intervaloPartosPorMatriz(data)
  const intervaloPartosDias =
    ips.length > 0 ? Math.round(ips.reduce((s, x) => s + x.ipDias, 0) / ips.length) : 0

  return {
    partos: partos.length,
    mortes: mortes.length,
    natalidadePct: expostas > 0 ? (partos.length / expostas) * 100 : 0,
    mortalidadePct: partos.length > 0 ? (mortes.length / partos.length) * 100 : 0,
    desmamados: data.desmames.length,
    taxaDesmamePct: expostas > 0 ? ((partos.length - mortes.length) / expostas) * 100 : 0,
    pesoDesmame205,
    kgBezerroPorMatriz: expostas > 0 ? kgDesmamado / expostas : 0,
    intervaloPartosDias,
    intervaloPartosMeses: intervaloPartosDias / DIAS_POR_MES,
    matrizesComIP: ips.length,
  }
}

/** Previsão de apartação: bezerros ao pé com data prevista aos 8 meses */
export function previsaoApartacao(data: Pick<SeedData, 'animais' | 'desmames'>) {
  const hoje = hojeISO()
  const desmamados = new Set(data.desmames.map((d) => d.bezerroBrinco))
  return ativos(data.animais)
    .filter((a) => (a.categoria === 'bezerro' || a.categoria === 'bezerra') && !desmamados.has(a.brinco))
    .map((a) => {
      const dataPrevista = addDays(a.nascimento, APARTACAO_DIAS)
      const diasRestantes = diffDays(hoje, dataPrevista)
      const pesoProjetado = Math.round(a.pesoAtual + Math.max(0, diasRestantes) * 0.72)
      return { animal: a, dataPrevista, diasRestantes, pesoProjetado }
    })
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))
}

/** Apartações previstas agrupadas por mês (para gráfico e planejamento) */
export function apartacoesPorMes(data: Pick<SeedData, 'animais' | 'desmames'>) {
  const porMes = new Map<string, number>()
  for (const p of previsaoApartacao(data)) {
    const mes = p.dataPrevista.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) ?? 0) + 1)
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, qtd]) => ({ mes: `${mes}-01`, qtd }))
}

// ---- Financeiro ----
export function statusLancamento(l: Lancamento, hoje = hojeISO()): 'pago' | 'vencido' | 'aberto' {
  if (l.pagamento) return 'pago'
  return l.vencimento < hoje ? 'vencido' : 'aberto'
}

export function metricasFinanceiro(data: Pick<SeedData, 'lancamentos'>) {
  const hoje = hojeISO()
  const inicio30 = addDays(hoje, -30)

  let receitasMes = 0
  let despesasMes = 0
  let aPagar = 0
  let aReceber = 0
  let vencidas = 0
  for (const l of data.lancamentos) {
    const st = statusLancamento(l, hoje)
    if (st === 'pago' && l.pagamento! > inicio30) {
      if (l.tipo === 'receita') receitasMes += l.valor
      else despesasMes += l.valor
    }
    if (st !== 'pago') {
      if (l.tipo === 'despesa') {
        aPagar += l.valor
        if (st === 'vencido') vencidas++
      } else {
        aReceber += l.valor
      }
    }
  }

  // fluxo de caixa dos últimos 12 meses (regime de caixa: data de pagamento)
  const fluxo: { mes: string; receitas: number; despesas: number }[] = []
  for (let m = 11; m >= 0; m--) {
    const ref = addDays(hoje, -m * 30).slice(0, 7)
    if (fluxo.some((f) => f.mes === `${ref}-01`)) continue
    fluxo.push({ mes: `${ref}-01`, receitas: 0, despesas: 0 })
  }
  for (const l of data.lancamentos) {
    if (!l.pagamento) continue
    const mes = `${l.pagamento.slice(0, 7)}-01`
    const f = fluxo.find((x) => x.mes === mes)
    if (!f) continue
    if (l.tipo === 'receita') f.receitas += l.valor
    else f.despesas += l.valor
  }
  const fluxo12m = fluxo.map((f) => ({ ...f, resultado: f.receitas - f.despesas }))

  return { receitasMes, despesasMes, resultadoMes: receitasMes - despesasMes, aPagar, aReceber, vencidas, fluxo12m }
}

// ---- Máquinas ----
export function custoManutencao12m(data: Pick<SeedData, 'maquinas'>): number {
  const limite = addDays(hojeISO(), -365)
  return data.maquinas.reduce(
    (s, m) => s + m.manutencoes.filter((mt) => mt.data >= limite).reduce((si, mt) => si + mt.custo, 0),
    0,
  )
}

export function maquinasComRevisaoProxima(data: Pick<SeedData, 'maquinas'>) {
  const hoje = hojeISO()
  const limiteData = addDays(hoje, 30)
  return data.maquinas.filter((m) => {
    if (m.proximaRevisaoHorimetro !== undefined && m.horimetro !== undefined) {
      return m.horimetro >= m.proximaRevisaoHorimetro - 100
    }
    if (m.proximaRevisaoData) return m.proximaRevisaoData <= limiteData
    return false
  })
}

// ---- Leite ----
export function metricasLeite(data: Pick<SeedData, 'producaoLeite' | 'leite'>) {
  if (!data.leite || data.producaoLeite.length === 0) return null
  const hoje = hojeISO()
  const mesAtual = hoje.slice(0, 7)
  const ultimos7 = data.producaoLeite.slice(-7)
  const media7 = ultimos7.reduce((s, p) => s + p.litros, 0) / Math.max(ultimos7.length, 1)
  const ontem = data.producaoLeite[data.producaoLeite.length - 1]
  const litrosMes = data.producaoLeite
    .filter((p) => p.data.slice(0, 7) === mesAtual)
    .reduce((s, p) => s + p.litros, 0)
  return {
    vacasLactacao: data.leite.vacasLactacao,
    precoLitro: data.leite.precoLitro,
    producaoOntem: ontem.litros,
    media7dias: media7,
    mediaVacaDia: media7 / data.leite.vacasLactacao,
    litrosMes,
    receitaMes: litrosMes * data.leite.precoLitro,
  }
}

// ---- Alertas ----
export interface Alerta {
  tipo: 'vacina' | 'lotacao' | 'estoque' | 'dg' | 'os' | 'maquina' | 'parto' | 'sanitario' | 'descarte'
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
      link: '/reproducao?tab=pendentes',
    })
  }
  for (const os of data.ordensServico) {
    if (os.status !== 'concluida' && os.prazo && os.prazo < hoje) {
      out.push({
        tipo: 'os',
        severidade: 'critical',
        titulo: `OS ${os.numero} com prazo vencido`,
        detalhe: `${os.titulo} — prazo ${os.prazo.split('-').reverse().join('/')}`,
        link: '/os',
      })
    }
  }
  const descarte = candidatasDescarte(data)
  if (descarte.size > 0) {
    out.push({
      tipo: 'descarte',
      severidade: 'warning',
      titulo: `${descarte.size} matriz(es) candidatas a descarte`,
      detalhe: `Vazias há ${data.config.diasVaziaDescarte}+ dias ou IP acima de ${data.config.toleranciaIPMeses} meses`,
      link: '/reproducao?tab=descarte',
    })
  }
  const partosProximos = partosPrevistos(data).filter((p) => p.diasRestantes <= 30)
  if (partosProximos.length > 0) {
    out.push({
      tipo: 'parto',
      severidade: 'warning',
      titulo: `${partosProximos.length} parto(s) previsto(s) em 30 dias`,
      detalhe: 'Preparar piquete maternidade e reforçar a ronda nas matrizes',
      link: '/reproducao?tab=partos',
    })
  }
  const abertas = ocorrenciasAbertas(data)
  if (abertas.length > 0) {
    out.push({
      tipo: 'sanitario',
      severidade: abertas.some((a) => a.ocorrencia.tipo === 'doente') ? 'critical' : 'warning',
      titulo: `${abertas.length} ocorrência(s) de ronda em aberto`,
      detalhe: abertas
        .slice(0, 2)
        .map((a) => (a.ocorrencia.brinco ? `${a.ocorrencia.brinco}: ` : '') + a.ocorrencia.descricao)
        .join(' · '),
      link: '/sanitario?tab=rondas',
    })
  }
  for (const m of maquinasComRevisaoProxima(data)) {
    out.push({
      tipo: 'maquina',
      severidade: 'warning',
      titulo: `${m.nome}: revisão próxima`,
      detalhe:
        m.proximaRevisaoHorimetro !== undefined && m.horimetro !== undefined
          ? `Horímetro ${m.horimetro.toLocaleString('pt-BR')} h — revisão aos ${m.proximaRevisaoHorimetro.toLocaleString('pt-BR')} h`
          : `Revisão programada para ${m.proximaRevisaoData?.split('-').reverse().join('/')}`,
      link: '/maquinas',
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
