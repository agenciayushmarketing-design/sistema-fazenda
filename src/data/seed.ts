// =====================================================================
// SEED DETERMINÍSTICO — Fazenda Santa Helena (dados 100% fictícios)
//
// Todo o dataset da demo nasce deste arquivo, gerado por funções puras
// a partir dos parâmetros abaixo. Nenhum número de negócio deve viver
// solto nos componentes. As datas são relativas ao dia da geração,
// então a demo nunca envelhece.
// =====================================================================

import type {
  Animal,
  Categoria,
  Desmame,
  DiagnosticoGestacao,
  EstacaoMonta,
  ItemEstoque,
  ItemPedido,
  Lote,
  LoteRecria,
  MovEstoque,
  Movimentacao,
  Parto,
  Pasto,
  Pedido,
  PrecoHistorico,
  ProtocoloIATF,
  SeedData,
  TouroRepasse,
} from './types'

// ---------------------------------------------------------------------
// PARÂMETROS DA DEMO (edite aqui, nunca nos componentes)
// ---------------------------------------------------------------------

export const PARAMS = {
  fazenda: { nome: 'Fazenda Santa Helena', areaHa: 800 },

  // Inventário-alvo por categoria (soma = total de cabeças)
  inventario: {
    vaca: 420,
    touro: 15,
    novilha_24: 85,
    boi_terminacao: 88,
    // bezerro/bezerra derivam de partos − mortes (abaixo)
    // garrote / novilha_13_24 derivam dos lotes de recria R3/R4
  },

  // Safra de nascimentos atual (estação de monta de 2 safras atrás)
  cria: {
    matrizesExpostasSafraPassada: 420,
    partos: 330,
    mortesPreDesmame: 13,
    machosNascidos: 166, // dos 330 partos
    nascimentoIniDias: -305, // janela de partos, dias relativos a hoje
    nascimentoFimDias: -215,
    pesoNascerMedio: 32, // kg (±4)
    intervaloPartosDias: 385, // média histórica das matrizes (indicador da demo)
    // desmame em duas rodadas
    desmameMachos: { dia: -75, qtd: 90, pesoMedio: 205 },
    desmameFemeas: { dia: -40, qtd: 80, pesoMedio: 182 },
  },

  // Lotes de recria: peso atual do lote = pesoEntrada + gmd × dias (exato)
  recria: [
    { id: 'R1', nome: 'Recria Machos 25/26', sexo: 'M', qtd: 90, entradaDias: -75, pesoEntrada: 205, gmd: 0.58, gmdMeta: 0.55, pesoAlvo: 380, pastoId: 'P2' },
    { id: 'R2', nome: 'Recria Fêmeas 25/26', sexo: 'F', qtd: 80, entradaDias: -40, pesoEntrada: 182, gmd: 0.44, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P3' },
    { id: 'R3', nome: 'Garrotes 24/25', sexo: 'M', qtd: 140, entradaDias: -270, pesoEntrada: 198, gmd: 0.52, gmdMeta: 0.5, pesoAlvo: 380, pastoId: 'P1' },
    { id: 'R4', nome: 'Novilhas 24/25', sexo: 'F', qtd: 135, entradaDias: -270, pesoEntrada: 182, gmd: 0.46, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P4' },
  ] as const,

  confinamento: { qtd: 88, entradaDias: -60, pesoEntrada: 425, gmd: 1.35 },

  // Estação de monta atual + IATF
  reproducao: {
    estacaoInicioDias: -95,
    estacaoFimDias: 25,
    matrizesExpostas: 460,
    protocolos: [
      { id: 'IATF-1', nome: 'IATF Lote 1', matrizes: 160, d0Dias: -88, produto: 'Sincrogest + eCG', inseminador: 'Carlos Mendes', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-2', nome: 'IATF Lote 2', matrizes: 160, d0Dias: -85, produto: 'Sincrogest + eCG', inseminador: 'Carlos Mendes', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-3', nome: 'IATF Lote 3', matrizes: 140, d0Dias: -82, produto: 'Sincrogest + eCG', inseminador: 'Ana Paula Rocha', touroSemen: 'Basco FIV CIAV', semenItemId: 'SEM-BAS' },
    ],
    prenhasIATF: 239, // DG30: 239/460 = 52%
    dg30Dias: -55,
    prenhasRepasse: 122, // DG final parcial
    dgFinalDias: -10,
    dgPendentes: 60, // ainda sem diagnóstico → alerta
    eccMedio: 3.1,
    gestacaoDias: 283,
  },

  // Pastos (soma das áreas = areaHa)
  pastos: [
    { id: 'P1', nome: 'Retiro Santa Rita', areaHa: 180, capacidadeUA: 250, tipo: 'pasto' },
    { id: 'P2', nome: 'Retiro Boa Vista', areaHa: 220, capacidadeUA: 300, tipo: 'pasto' },
    { id: 'P3', nome: 'Retiro Palmeiras', areaHa: 200, capacidadeUA: 260, tipo: 'pasto' },
    { id: 'P4', nome: 'Retiro Invernada Grande', areaHa: 160, capacidadeUA: 200, tipo: 'pasto' },
    { id: 'P5', nome: 'Confinamento Sede', areaHa: 40, capacidadeUA: 220, tipo: 'confinamento' },
  ] as const,

  // Pedidos de compra. Pedidos "recebido" geram entrada no estoque
  // com quantidades e valores idênticos (identidade validada em teste).
  pedidos: [
    {
      numero: 'PC-2025-041', fornecedor: 'Central Genética Ltda', dataDias: -130, recebidoDias: -120, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'SEM-ARM', descricao: 'Sêmen REM Armador (dose)', quantidade: 500, valorUnitario: 65 },
        { itemEstoqueId: 'SEM-BAS', descricao: 'Sêmen Basco FIV CIAV (dose)', quantidade: 200, valorUnitario: 95 },
      ],
    },
    {
      numero: 'PC-2025-042', fornecedor: 'AgroFarma Distribuidora', dataDias: -110, recebidoDias: -100, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'HOR-P4', descricao: 'Implante intravaginal P4', quantidade: 500, valorUnitario: 18 },
        { itemEstoqueId: 'HOR-ECG', descricao: 'eCG 400 UI (dose)', quantidade: 500, valorUnitario: 14 },
        { itemEstoqueId: 'HOR-PGF', descricao: 'Prostaglandina (dose)', quantidade: 500, valorUnitario: 6 },
      ],
    },
    {
      numero: 'PC-2025-047', fornecedor: 'AgroFarma Distribuidora', dataDias: -95, recebidoDias: -90, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'VAC-AFT', descricao: 'Vacina aftosa (dose)', quantidade: 1300, valorUnitario: 1.8 },
        { itemEstoqueId: 'VAC-CLO', descricao: 'Vacina clostridiose (dose)', quantidade: 800, valorUnitario: 1.2 },
        { itemEstoqueId: 'VAC-BRU', descricao: 'Vacina brucelose B19 (dose)', quantidade: 200, valorUnitario: 3.5 },
        { itemEstoqueId: 'VAC-RAI', descricao: 'Vacina raiva (dose)', quantidade: 500, valorUnitario: 1.1 },
      ],
    },
    {
      numero: 'PC-2025-050', fornecedor: 'Nutrição Cerrado', dataDias: -85, recebidoDias: -80, status: 'recebido',
      rateio: { Cria: 40, Recria: 40, Terminacao: 0, Geral: 20 },
      itens: [
        { itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 80 P (kg)', quantidade: 20000, valorUnitario: 2.1 },
      ],
    },
    {
      numero: 'PC-2025-055', fornecedor: 'Nutrição Cerrado', dataDias: -60, recebidoDias: -55, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
      itens: [
        { itemEstoqueId: 'RAC-CONF', descricao: 'Ração confinamento 14% PB (kg)', quantidade: 120000, valorUnitario: 1.55 },
      ],
    },
    {
      numero: 'PC-2025-058', fornecedor: 'Nutrição Cerrado', dataDias: -50, recebidoDias: -45, status: 'recebido',
      rateio: { Cria: 0, Recria: 100, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'SUP-REC', descricao: 'Suplemento proteico recria (kg)', quantidade: 45000, valorUnitario: 2.4 },
      ],
    },
    {
      numero: 'PC-2025-061', fornecedor: 'AgroFarma Distribuidora', dataDias: -35, recebidoDias: -30, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'MED-IVE', descricao: 'Ivermectina 1% 500ml (frasco)', quantidade: 60, valorUnitario: 42 },
        { itemEstoqueId: 'MED-OXI', descricao: 'Oxitetraciclina LA 200ml (frasco)', quantidade: 40, valorUnitario: 38 },
        { itemEstoqueId: 'MED-FLO', descricao: 'Florfenicol 30% 250ml (frasco)', quantidade: 25, valorUnitario: 95 },
      ],
    },
    {
      numero: 'PC-2025-064', fornecedor: 'Campo Verde Defensivos', dataDias: -12, status: 'aprovado',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'DEF-HER', descricao: 'Herbicida pastagem (L)', quantidade: 400, valorUnitario: 48 },
      ],
    },
    {
      numero: 'PC-2025-066', fornecedor: 'Nutrição Cerrado', dataDias: -5, status: 'pendente',
      rateio: { Cria: 40, Recria: 40, Terminacao: 0, Geral: 20 },
      itens: [
        { itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 80 P (kg)', quantidade: 15000, valorUnitario: 2.25 },
      ],
    },
  ] as const,

  // Definição dos itens de estoque (saldo é derivado: entradas − saídas)
  itensEstoque: [
    { id: 'SEM-ARM', nome: 'Sêmen REM Armador', categoria: 'semen', unidade: 'dose', minimo: 50, botijao: 'BT-01', caneca: 'C2' },
    { id: 'SEM-BAS', nome: 'Sêmen Basco FIV CIAV', categoria: 'semen', unidade: 'dose', minimo: 30, botijao: 'BT-01', caneca: 'C5' },
    { id: 'HOR-P4', nome: 'Implante intravaginal P4', categoria: 'hormonio', unidade: 'un', minimo: 50, validadeDias: 240 },
    { id: 'HOR-ECG', nome: 'eCG 400 UI', categoria: 'hormonio', unidade: 'dose', minimo: 50, validadeDias: 180 },
    { id: 'HOR-PGF', nome: 'Prostaglandina', categoria: 'hormonio', unidade: 'dose', minimo: 50, validadeDias: 210 },
    { id: 'VAC-AFT', nome: 'Vacina aftosa', categoria: 'vacina', unidade: 'dose', minimo: 200, validadeDias: 120 },
    { id: 'VAC-CLO', nome: 'Vacina clostridiose', categoria: 'vacina', unidade: 'dose', minimo: 200, validadeDias: 45 },
    { id: 'VAC-BRU', nome: 'Vacina brucelose B19', categoria: 'vacina', unidade: 'dose', minimo: 50, validadeDias: 200 },
    { id: 'VAC-RAI', nome: 'Vacina raiva', categoria: 'vacina', unidade: 'dose', minimo: 100, validadeDias: 300 },
    { id: 'SAL-MIN', nome: 'Sal mineral 80 P', categoria: 'sal_mineral', unidade: 'kg', minimo: 5000 },
    { id: 'RAC-CONF', nome: 'Ração confinamento 14% PB', categoria: 'racao', unidade: 'kg', minimo: 20000 },
    { id: 'SUP-REC', nome: 'Suplemento proteico recria', categoria: 'racao', unidade: 'kg', minimo: 10000 },
    { id: 'MED-IVE', nome: 'Ivermectina 1% 500ml', categoria: 'medicamento', unidade: 'frasco', minimo: 10, validadeDias: 300 },
    { id: 'MED-OXI', nome: 'Oxitetraciclina LA 200ml', categoria: 'medicamento', unidade: 'frasco', minimo: 8, validadeDias: 280 },
    { id: 'MED-FLO', nome: 'Florfenicol 30% 250ml', categoria: 'medicamento', unidade: 'frasco', minimo: 5, validadeDias: 320 },
    { id: 'DEF-HER', nome: 'Herbicida pastagem', categoria: 'defensivo', unidade: 'L', minimo: 0 },
  ] as const,

  // Saídas de estoque (consumos). Sêmen sai automaticamente dos protocolos IATF.
  saidasEstoque: [
    { itemId: 'VAC-AFT', dia: -70, quantidade: 1200, loteDestino: 'Rebanho geral', obs: 'Campanha aftosa' },
    { itemId: 'VAC-CLO', dia: -40, quantidade: 330, loteDestino: 'Bezerros(as) da safra', obs: 'Clostridiose ao desmame' },
    { itemId: 'VAC-BRU', dia: -40, quantidade: 80, loteDestino: 'Bezerras 3–8 meses', obs: 'Brucelose B19' },
    { itemId: 'HOR-P4', dia: -88, quantidade: 460, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-ECG', dia: -82, quantidade: 460, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-PGF', dia: -82, quantidade: 460, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'SAL-MIN', dia: -65, quantidade: 3800, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'SAL-MIN', dia: -37, quantidade: 3800, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'SAL-MIN', dia: -9, quantidade: 3800, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'SAL-MIN', dia: -2, quantidade: 3800, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'RAC-CONF', dia: -30, quantidade: 33000, loteDestino: 'Confinamento Sede', obs: 'Trato diário' },
    { itemId: 'RAC-CONF', dia: -3, quantidade: 30360, loteDestino: 'Confinamento Sede', obs: 'Trato diário' },
    { itemId: 'SUP-REC', dia: -25, quantidade: 18000, loteDestino: 'Lotes de recria', obs: 'Suplementação' },
    { itemId: 'SUP-REC', dia: -1, quantidade: 12000, loteDestino: 'Lotes de recria', obs: 'Suplementação' },
    { itemId: 'MED-IVE', dia: -70, quantidade: 35, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
    { itemId: 'MED-OXI', dia: -20, quantidade: 12, loteDestino: 'Confinamento Sede' },
    { itemId: 'MED-FLO', dia: -15, quantidade: 6, loteDestino: 'Recria Machos 25/26' },
  ] as const,

  // Histórico de vendas/compras de animais (movimentações)
  vendaDescarte: { dia: -85, qtd: 30, obs: 'Vacas de descarte — Frigorífico Boi Forte' },
  compraBois: { dia: -60, qtd: 88, obs: 'Garrotões p/ terminação — Leilão Uberaba' },

  // Conversão: 1 @ = 30 kg de peso vivo equivalente (rendimento 50%)
  kgPorArroba: 30,
  uaKg: 450, // 1 UA = 450 kg de peso vivo

  seedRandom: 20260814,
} as const

// ---------------------------------------------------------------------
// Utilitários puros
// ---------------------------------------------------------------------

/** PRNG determinístico (mulberry32) */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

// ---------------------------------------------------------------------
// Derivações puras usadas pelo app e pelos testes
// ---------------------------------------------------------------------

/** Ganho de kg no período de cada lote ativo (recria + confinamento) */
export function ganhoKgLotes(hoje: string) {
  const ganhos: { nome: string; kg: number }[] = []
  for (const l of PARAMS.recria) {
    const dias = -l.entradaDias
    ganhos.push({ nome: l.nome, kg: l.qtd * l.gmd * dias })
  }
  const c = PARAMS.confinamento
  ganhos.push({ nome: 'Confinamento Sede', kg: c.qtd * c.gmd * -c.entradaDias })
  void hoje
  return ganhos
}

export function arrobasProduzidas(hoje: string): number {
  const totalKg = ganhoKgLotes(hoje).reduce((s, g) => s + g.kg, 0)
  return totalKg / PARAMS.kgPorArroba
}

export function custoTotalRateado(): number {
  return PARAMS.pedidos
    .filter((p) => p.status === 'recebido')
    .reduce((s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)
}

export function custoPorArroba(hoje: string): number {
  return custoTotalRateado() / arrobasProduzidas(hoje)
}

// ---------------------------------------------------------------------
// Geração do dataset
// ---------------------------------------------------------------------

export function buildSeed(hoje?: string): SeedData {
  const today = hoje ?? new Date().toISOString().slice(0, 10)
  const rng = mulberry32(PARAMS.seedRandom)
  const P = PARAMS

  const pastos: Pasto[] = P.pastos.map((p) => ({ ...p }))

  // ---- Lotes ----
  const lotes: Lote[] = [
    { id: 'L-SR', nome: 'Matrizes Santa Rita', pastoId: 'P1', finalidade: 'cria' },
    { id: 'L-BV', nome: 'Matrizes Boa Vista', pastoId: 'P2', finalidade: 'cria' },
    { id: 'L-PA', nome: 'Matrizes Palmeiras', pastoId: 'P3', finalidade: 'cria' },
    { id: 'L-NC', nome: 'Novilhas de Cobertura', pastoId: 'P4', finalidade: 'reproducao' },
    ...P.recria.map((r) => ({ id: r.id, nome: r.nome, pastoId: r.pastoId, finalidade: 'recria' as const })),
    { id: 'CONF', nome: 'Confinamento Sede', pastoId: 'P5', finalidade: 'terminacao' },
  ]

  const animais: Animal[] = []
  const movimentacoes: Movimentacao[] = []
  let movSeq = 1
  const mov = (m: Omit<Movimentacao, 'id'>) => {
    movimentacoes.push({ id: `MV-${String(movSeq++).padStart(4, '0')}`, ...m })
  }

  const nomesTouros = [
    'Imperador SH', 'Diamante SH', 'Sultão SH', 'Trovão SH', 'Ouro Fino SH',
    'Cacique SH', 'Maestro SH', 'Vendaval SH', 'Rubi SH', 'Dominador SH',
    'Guardião SH', 'Faraó SH', 'Titã SH', 'Barão SH', 'Astro SH',
  ]

  // ---- Touros ----
  const touros: Animal[] = nomesTouros.map((nome, i) => {
    const peso = Math.round(760 + rng() * 140)
    return {
      id: `A-T${i + 1}`,
      brinco: `T-${String(i + 1).padStart(2, '0')}`,
      sexo: 'M' as const,
      categoria: 'touro' as const,
      raca: 'Nelore PO' as const,
      nascimento: addDays(today, -Math.round(1500 + rng() * 1500)),
      loteId: ['L-SR', 'L-BV', 'L-PA', 'L-NC'][i % 4],
      paiNome: undefined,
      pesoAtual: peso,
      pesagens: [
        { data: addDays(today, -180), peso: peso - 18 },
        { data: addDays(today, -60), peso: peso - 5 },
      ],
      sanitario: [
        { data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' },
        { data: addDays(today, -70), tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
      ],
      status: 'ativo' as const,
    }
  })
  animais.push(...touros)

  // ---- Vacas ----
  const lotesCria = ['L-SR', 'L-BV', 'L-PA']
  for (let i = 0; i < P.inventario.vaca; i++) {
    const peso = Math.round(430 + rng() * 70)
    animais.push({
      id: `A-V${i + 1}`,
      brinco: `V-${String(i + 1).padStart(4, '0')}`,
      sexo: 'F',
      categoria: 'vaca',
      raca: rng() < 0.3 ? 'Nelore PO' : 'Nelore',
      nascimento: addDays(today, -Math.round(1460 + rng() * 2900)),
      loteId: lotesCria[i % 3],
      pesoAtual: peso,
      ecc: round1(2.5 + rng() * 1.5),
      pesagens: [
        { data: addDays(today, -190), peso: peso - Math.round(rng() * 25) },
        { data: addDays(today, -95), peso: peso - Math.round(rng() * 12) },
      ],
      sanitario: [
        { data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' },
        { data: addDays(today, -70), tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
      ],
      status: 'ativo',
    })
  }

  // ---- Novilhas >24m ----
  for (let i = 0; i < P.inventario.novilha_24; i++) {
    const peso = Math.round(330 + rng() * 50)
    animais.push({
      id: `A-N${i + 1}`,
      brinco: `N-${String(i + 1).padStart(4, '0')}`,
      sexo: 'F',
      categoria: 'novilha_24',
      raca: rng() < 0.3 ? 'Nelore PO' : 'Nelore',
      nascimento: addDays(today, -Math.round(760 + rng() * 280)),
      loteId: 'L-NC',
      pesoAtual: peso,
      ecc: round1(2.8 + rng() * 1.2),
      pesagens: [{ data: addDays(today, -95), peso: peso - Math.round(rng() * 15) }],
      sanitario: [{ data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' }],
      status: 'ativo',
    })
  }

  // ---- Estações de monta ----
  const estacoes: EstacaoMonta[] = [
    {
      id: 'EM-2425',
      nome: 'Estação 24/25 (encerrada)',
      inicio: addDays(today, P.cria.nascimentoIniDias - P.reproducao.gestacaoDias),
      fim: addDays(today, P.cria.nascimentoFimDias - P.reproducao.gestacaoDias),
      matrizesExpostas: P.cria.matrizesExpostasSafraPassada,
      status: 'encerrada',
    },
    {
      id: 'EM-2526',
      nome: 'Estação 25/26 (atual)',
      inicio: addDays(today, P.reproducao.estacaoInicioDias),
      fim: addDays(today, P.reproducao.estacaoFimDias),
      matrizesExpostas: P.reproducao.matrizesExpostas,
      status: 'em_andamento',
    },
  ]

  // ---- Partos, mortes, bezerros ----
  const partos: Parto[] = []
  const desmames: Desmame[] = []
  const janela = P.cria.nascimentoFimDias - P.cria.nascimentoIniDias

  // sexo dos 330 partos: os primeiros `machosNascidos` são machos (ordem embaralhada determinística)
  const sexos: ('M' | 'F')[] = []
  for (let i = 0; i < P.cria.partos; i++) sexos.push(i < P.cria.machosNascidos ? 'M' : 'F')
  for (let i = sexos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[sexos[i], sexos[j]] = [sexos[j], sexos[i]]
  }

  // mortes pré-desmame: distribuídas entre machos e fêmeas
  // vivos: 317 → precisa bater com desmamados (90 M + 80 F) + ao pé
  // machos nascidos 166 − 6 mortos = 160 vivos; fêmeas 164 − 7 = 157 vivas
  let mortosM = 0
  let mortosF = 0
  const MORTES_M = 6
  const MORTES_F = P.cria.mortesPreDesmame - MORTES_M

  interface BezerroTmp {
    parto: Parto
    morto: boolean
    dataMorte?: string
  }
  const bezerros: BezerroTmp[] = []

  let seqM = 0
  let seqF = 0
  for (let i = 0; i < P.cria.partos; i++) {
    // partos concentrados no início da janela (curva decrescente)
    const frac = Math.pow(rng(), 1.6)
    const dia = P.cria.nascimentoIniDias + Math.round(frac * janela)
    const sexo = sexos[i]
    const brinco = sexo === 'M' ? `BZ-${String(++seqM).padStart(3, '0')}` : `BZ-F${String(++seqF).padStart(3, '0')}`
    const matriz = `V-${String(1 + Math.floor(rng() * P.inventario.vaca)).padStart(4, '0')}`
    const dif = rng()
    const parto: Parto = {
      id: `PT-${String(i + 1).padStart(3, '0')}`,
      data: addDays(today, dia),
      matrizBrinco: matriz,
      bezerroBrinco: brinco,
      sexo,
      pesoNascer: round1(P.cria.pesoNascerMedio - 4 + rng() * 8),
      dificuldade: (dif < 0.88 ? 1 : dif < 0.95 ? 2 : dif < 0.98 ? 3 : 4) as 1 | 2 | 3 | 4,
      estacaoId: 'EM-2425',
    }
    partos.push(parto)

    let morto = false
    if (sexo === 'M' && mortosM < MORTES_M && rng() < 0.06) {
      morto = true
      mortosM++
    } else if (sexo === 'F' && mortosF < MORTES_F && rng() < 0.07) {
      morto = true
      mortosF++
    }
    bezerros.push({ parto, morto, dataMorte: morto ? addDays(parto.data, 3 + Math.round(rng() * 40)) : undefined })
  }
  // garante o número exato de mortes (se a probabilidade não alcançou)
  for (const b of bezerros) {
    if (mortosM >= MORTES_M) break
    if (!b.morto && b.parto.sexo === 'M') {
      b.morto = true
      b.dataMorte = addDays(b.parto.data, 10)
      mortosM++
    }
  }
  for (const b of bezerros) {
    if (mortosF >= MORTES_F) break
    if (!b.morto && b.parto.sexo === 'F') {
      b.morto = true
      b.dataMorte = addDays(b.parto.data, 10)
      mortosF++
    }
  }

  // ordena por data para o livro de movimentação
  bezerros.sort((a, b) => a.parto.data.localeCompare(b.parto.data))
  for (const b of bezerros) {
    mov({
      data: b.parto.data,
      tipo: 'nascimento',
      brinco: b.parto.bezerroBrinco,
      categoria: b.parto.sexo === 'M' ? 'bezerro' : 'bezerra',
      quantidade: 1,
      destino: 'Rebanho de cria',
      obs: `Matriz ${b.parto.matrizBrinco}`,
    })
    if (b.morto && b.dataMorte) {
      mov({
        data: b.dataMorte,
        tipo: 'morte',
        brinco: b.parto.bezerroBrinco,
        categoria: b.parto.sexo === 'M' ? 'bezerro' : 'bezerra',
        quantidade: 1,
        origem: 'Rebanho de cria',
        obs: 'Morte pré-desmame',
      })
    }
  }

  // ---- Desmame → entrada nos lotes de recria R1 (M) e R2 (F) ----
  const vivosM = bezerros.filter((b) => !b.morto && b.parto.sexo === 'M')
  const vivosF = bezerros.filter((b) => !b.morto && b.parto.sexo === 'F')
  // desmama os mais velhos primeiro (já ordenados por data)
  const desmamadosM = vivosM.slice(0, P.cria.desmameMachos.qtd)
  const desmamadosF = vivosF.slice(0, P.cria.desmameFemeas.qtd)

  let desmSeq = 0
  const criaDesmame = (b: BezerroTmp, dia: number, pesoMedio: number, loteId: string) => {
    const dataDesm = addDays(today, dia)
    const idade = diffDays(b.parto.data, dataDesm)
    const peso = round1(pesoMedio - 12 + rng() * 24)
    desmames.push({
      id: `DS-${String(++desmSeq).padStart(3, '0')}`,
      data: dataDesm,
      bezerroBrinco: b.parto.bezerroBrinco,
      peso,
      idadeDias: idade,
      loteDestinoId: loteId,
    })
    mov({
      data: dataDesm,
      tipo: 'desmame',
      brinco: b.parto.bezerroBrinco,
      categoria: b.parto.sexo === 'M' ? 'bezerro' : 'bezerra',
      quantidade: 1,
      origem: 'Rebanho de cria',
      destino: loteId === 'R1' ? 'Recria Machos 25/26' : 'Recria Fêmeas 25/26',
    })
    return peso
  }
  for (const b of desmamadosM) criaDesmame(b, P.cria.desmameMachos.dia, P.cria.desmameMachos.pesoMedio, 'R1')
  for (const b of desmamadosF) criaDesmame(b, P.cria.desmameFemeas.dia, P.cria.desmameFemeas.pesoMedio, 'R2')

  // ---- Animais bezerros (vivos) ----
  const desmamadosSet = new Set([...desmamadosM, ...desmamadosF].map((b) => b.parto.bezerroBrinco))
  let bzSeq = 0
  for (const b of bezerros) {
    if (b.morto) continue
    bzSeq++
    const desm = desmamadosSet.has(b.parto.bezerroBrinco)
    const idadeDias = diffDays(b.parto.data, today)
    const sexo = b.parto.sexo
    // peso: nascer + ~0.75 kg/dia ao pé; desmamados seguem o lote de recria
    let peso: number
    let loteId: string
    let pesagens = [{ data: b.parto.data, peso: b.parto.pesoNascer }]
    if (desm) {
      const lote = sexo === 'M' ? P.recria[0] : P.recria[1]
      loteId = lote.id
      const desmame = desmames.find((d) => d.bezerroBrinco === b.parto.bezerroBrinco)!
      const diasNoLote = diffDays(desmame.data, today)
      peso = round1(desmame.peso + lote.gmd * diasNoLote)
      pesagens.push({ data: desmame.data, peso: desmame.peso })
    } else {
      loteId = lotesCria[bzSeq % 3]
      peso = round1(b.parto.pesoNascer + 0.75 * idadeDias)
    }
    animais.push({
      id: `A-BZ${bzSeq}`,
      brinco: b.parto.bezerroBrinco,
      sexo,
      categoria: sexo === 'M' ? 'bezerro' : 'bezerra',
      raca: rng() < 0.25 ? 'Nelore PO' : 'Nelore',
      nascimento: b.parto.data,
      loteId,
      maeBrinco: b.parto.matrizBrinco,
      paiNome: nomesTouros[Math.floor(rng() * 6)],
      pesoAtual: peso,
      pesagens,
      sanitario: [
        { data: addDays(today, -40), tipo: 'Vacinação', produto: sexo === 'F' ? 'Clostridiose + Brucelose B19' : 'Vacina clostridiose' },
      ],
      status: 'ativo',
    })
  }

  // ---- Lotes de recria R3/R4 (garrotes e novilhas 13-24m) + animais ----
  const lotesRecria: LoteRecria[] = []
  for (const lr of P.recria) {
    const dataEntrada = addDays(today, lr.entradaDias)
    const dias = -lr.entradaDias
    const pesagens: { data: string; peso: number }[] = []
    for (let d = 0; d <= dias; d += 28) {
      pesagens.push({ data: addDays(dataEntrada, d), peso: round1(lr.pesoEntrada + lr.gmd * d) })
    }
    // pesagem "de hoje" se a última cadência não caiu hoje
    if ((dias % 28) !== 0) {
      pesagens.push({ data: today, peso: round1(lr.pesoEntrada + lr.gmd * dias) })
    }
    lotesRecria.push({
      id: lr.id,
      nome: lr.nome,
      pastoId: lr.pastoId,
      sexo: lr.sexo,
      qtd: lr.qtd,
      dataEntrada,
      pesoEntrada: lr.pesoEntrada,
      gmd: lr.gmd,
      gmdMeta: lr.gmdMeta,
      pesoAlvo: lr.pesoAlvo,
      pesagens,
    })
  }

  // animais dos lotes R3 (garrote) e R4 (novilha 13-24m)
  const geraLoteAnimais = (
    lote: (typeof P.recria)[number],
    categoria: Categoria,
    prefixo: string,
  ) => {
    const dataEntrada = addDays(today, lote.entradaDias)
    for (let i = 0; i < lote.qtd; i++) {
      // offsets em pares espelhados → média do lote permanece exata
      const off = i % 2 === 0 ? (i % 20) * 0.9 : -((i - 1) % 20) * 0.9
      const gmdInd = lote.gmd + (i % 2 === 0 ? 1 : -1) * ((i % 7) * 0.008)
      const dias = -lote.entradaDias
      const pesoEntradaInd = round1(lote.pesoEntrada + off)
      const pesoAtualInd = round1(pesoEntradaInd + gmdInd * dias)
      const pesagens: { data: string; peso: number }[] = []
      for (let d = 0; d <= dias; d += 28) {
        pesagens.push({ data: addDays(dataEntrada, d), peso: round1(pesoEntradaInd + gmdInd * d) })
      }
      animais.push({
        id: `A-${prefixo}${i + 1}`,
        brinco: `${prefixo}-${String(i + 1).padStart(3, '0')}`,
        sexo: lote.sexo,
        categoria,
        raca: rng() < 0.25 ? 'Nelore PO' : 'Nelore',
        nascimento: addDays(dataEntrada, -Math.round(210 + rng() * 90)),
        loteId: lote.id,
        pesoAtual: pesoAtualInd,
        pesagens,
        sanitario: [
          { data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' },
          { data: addDays(today, -70), tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
        ],
        status: 'ativo',
      })
    }
  }
  geraLoteAnimais(P.recria[2], 'garrote', 'GR')
  geraLoteAnimais(P.recria[3], 'novilha_13_24', 'NV')

  // ---- Confinamento (bois de terminação, comprados) ----
  const conf = P.confinamento
  const dataEntradaConf = addDays(today, conf.entradaDias)
  for (let i = 0; i < conf.qtd; i++) {
    const off = i % 2 === 0 ? (i % 16) * 1.2 : -((i - 1) % 16) * 1.2
    const pesoEntradaInd = round1(conf.pesoEntrada + off)
    const pesoAtualInd = round1(pesoEntradaInd + conf.gmd * -conf.entradaDias)
    animais.push({
      id: `A-BT${i + 1}`,
      brinco: `BT-${String(i + 1).padStart(3, '0')}`,
      sexo: 'M',
      categoria: 'boi_terminacao',
      raca: 'Nelore',
      nascimento: addDays(today, -Math.round(850 + rng() * 200)),
      loteId: 'CONF',
      pesoAtual: pesoAtualInd,
      pesagens: [
        { data: dataEntradaConf, peso: pesoEntradaInd },
        { data: addDays(dataEntradaConf, 28), peso: round1(pesoEntradaInd + conf.gmd * 28) },
        { data: today, peso: pesoAtualInd },
      ],
      sanitario: [{ data: dataEntradaConf, tipo: 'Vermifugação', produto: 'Ivermectina 1%' }],
      status: 'ativo',
    })
  }
  mov({
    data: dataEntradaConf,
    tipo: 'compra',
    brinco: 'BT-001…BT-088',
    categoria: 'boi_terminacao',
    quantidade: conf.qtd,
    destino: 'Confinamento Sede',
    obs: P.compraBois.obs,
  })

  // venda de descarte (histórico — animais já fora do inventário)
  mov({
    data: addDays(today, P.vendaDescarte.dia),
    tipo: 'venda',
    brinco: 'Lote descarte',
    categoria: 'vaca',
    quantidade: P.vendaDescarte.qtd,
    origem: 'Matrizes (retiros)',
    obs: P.vendaDescarte.obs,
  })
  // mudança de categoria (histórico)
  mov({
    data: addDays(today, P.reproducao.estacaoInicioDias),
    tipo: 'mudanca_categoria',
    brinco: 'Lote novilhas',
    categoria: 'vaca',
    quantidade: 40,
    origem: 'Novilha >24m',
    destino: 'Vaca (entrada em reprodução)',
    obs: 'Novilhas incorporadas ao rebanho de matrizes',
  })

  movimentacoes.sort((a, b) => a.data.localeCompare(b.data))

  // ---- Reprodução: protocolos IATF + diagnósticos ----
  const R = P.reproducao
  const protocolosIATF: ProtocoloIATF[] = R.protocolos.map((pr) => ({
    id: pr.id,
    nome: pr.nome,
    loteDescricao: pr.id === 'IATF-3' ? 'Novilhas + vacas solteiras' : 'Vacas paridas',
    dataInicio: addDays(today, pr.d0Dias),
    dataIA: addDays(today, pr.d0Dias + 10),
    produto: pr.produto,
    inseminador: pr.inseminador,
    touroSemen: pr.touroSemen,
    semenItemId: pr.semenItemId,
    doses: pr.matrizes,
    matrizes: pr.matrizes,
  }))

  const diagnosticos: DiagnosticoGestacao[] = []
  let dgSeq = 0
  const dgPush = (d: Omit<DiagnosticoGestacao, 'id'>) => {
    diagnosticos.push({ id: `DG-${String(++dgSeq).padStart(3, '0')}`, ...d })
  }
  // matrizes numeradas 1..460 (vacas V-0001.. + novilhas N-...)
  const matrizBrinco = (i: number) =>
    i < P.inventario.vaca ? `V-${String(i + 1).padStart(4, '0')}` : `N-${String(i - P.inventario.vaca + 1).padStart(4, '0')}`

  const dg30 = addDays(today, R.dg30Dias)
  const dgFinal = addDays(today, R.dgFinalDias)
  // 239 prenhas IATF (concepção na data da IA → 1º terço da estação)
  for (let i = 0; i < R.matrizesExpostas; i++) {
    const brinco = matrizBrinco(i)
    if (i < R.prenhasIATF) {
      const proto = protocolosIATF[i % 3]
      dgPush({
        data: dg30,
        matrizBrinco: brinco,
        resultado: 'prenha',
        origemPrenhez: 'IATF',
        dataConcepcao: proto.dataIA,
        dppEstimado: addDays(proto.dataIA, R.gestacaoDias),
        estacaoId: 'EM-2526',
      })
    } else if (i < R.prenhasIATF + R.prenhasRepasse) {
      // repasse: concepção distribuída após a IA, maioria no 2º terço
      const diasPosIA = 15 + Math.round(rng() * 45)
      const concepcao = addDays(today, R.protocolos[0].d0Dias + 10 + diasPosIA)
      dgPush({
        data: dgFinal,
        matrizBrinco: brinco,
        resultado: 'prenha',
        origemPrenhez: 'touro',
        dataConcepcao: concepcao,
        dppEstimado: addDays(concepcao, R.gestacaoDias),
        estacaoId: 'EM-2526',
      })
    } else if (i < R.matrizesExpostas - R.dgPendentes) {
      dgPush({
        data: dgFinal,
        matrizBrinco: brinco,
        resultado: 'vazia',
        estacaoId: 'EM-2526',
      })
    } else {
      dgPush({
        data: dgFinal,
        matrizBrinco: brinco,
        resultado: 'pendente',
        estacaoId: 'EM-2526',
      })
    }
  }

  const tourosRepasse: TouroRepasse[] = [
    { brinco: 'T-01', nome: 'Imperador SH', vacasRepasse: 45, prenhezesRepasse: 28 },
    { brinco: 'T-02', nome: 'Diamante SH', vacasRepasse: 44, prenhezesRepasse: 26 },
    { brinco: 'T-03', nome: 'Sultão SH', vacasRepasse: 44, prenhezesRepasse: 24 },
    { brinco: 'T-04', nome: 'Trovão SH', vacasRepasse: 44, prenhezesRepasse: 22 },
    { brinco: 'T-05', nome: 'Ouro Fino SH', vacasRepasse: 44, prenhezesRepasse: 22 },
  ]

  // ---- Compras ----
  const pedidos: Pedido[] = P.pedidos.map((p, i) => ({
    id: `PED-${i + 1}`,
    numero: p.numero,
    fornecedor: p.fornecedor,
    data: addDays(today, p.dataDias),
    dataRecebimento: 'recebidoDias' in p && p.recebidoDias !== undefined ? addDays(today, p.recebidoDias) : undefined,
    status: p.status as Pedido['status'],
    itens: p.itens.map((it) => ({ ...it } as ItemPedido)),
    rateio: { ...p.rateio },
  }))

  // ---- Estoque: entradas (pedidos recebidos) + saídas (consumo) ----
  const movEstoque: MovEstoque[] = []
  let meSeq = 0
  const mePush = (m: Omit<MovEstoque, 'id'>) => {
    movEstoque.push({ id: `ME-${String(++meSeq).padStart(3, '0')}`, ...m })
  }
  for (const ped of pedidos) {
    if (ped.status !== 'recebido' || !ped.dataRecebimento) continue
    for (const it of ped.itens) {
      mePush({
        data: ped.dataRecebimento,
        itemId: it.itemEstoqueId,
        tipo: 'entrada',
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        pedidoId: ped.id,
        obs: `Recebimento ${ped.numero}`,
      })
    }
  }
  // saídas de sêmen: exatamente as doses dos protocolos IATF
  for (const proto of protocolosIATF) {
    mePush({
      data: proto.dataIA,
      itemId: proto.semenItemId,
      tipo: 'saida',
      quantidade: proto.doses,
      loteDestino: proto.nome,
      obs: `IATF — ${proto.touroSemen}`,
    })
  }
  for (const s of P.saidasEstoque) {
    mePush({
      data: addDays(today, s.dia),
      itemId: s.itemId,
      tipo: 'saida',
      quantidade: s.quantidade,
      loteDestino: s.loteDestino,
      obs: 'obs' in s ? (s as { obs?: string }).obs : undefined,
    })
  }
  movEstoque.sort((a, b) => a.data.localeCompare(b.data))

  // saldo derivado por item
  const estoque: ItemEstoque[] = P.itensEstoque.map((def) => {
    const entradas = movEstoque.filter((m) => m.itemId === def.id && m.tipo === 'entrada')
    const saidas = movEstoque.filter((m) => m.itemId === def.id && m.tipo === 'saida')
    const totalEntrada = entradas.reduce((s, m) => s + m.quantidade, 0)
    const totalSaida = saidas.reduce((s, m) => s + m.quantidade, 0)
    const valorEntrada = entradas.reduce((s, m) => s + m.quantidade * (m.valorUnitario ?? 0), 0)
    return {
      id: def.id,
      nome: def.nome,
      categoria: def.categoria,
      unidade: def.unidade,
      saldo: totalEntrada - totalSaida,
      minimo: def.minimo,
      validade: 'validadeDias' in def && def.validadeDias !== undefined ? addDays(today, def.validadeDias) : undefined,
      custoMedio: totalEntrada > 0 ? Math.round((valorEntrada / totalEntrada) * 100) / 100 : 0,
      botijao: 'botijao' in def ? def.botijao : undefined,
      caneca: 'caneca' in def ? def.caneca : undefined,
    }
  })

  // ---- Histórico de preços (base + pedidos) ----
  const precosHistoricos: PrecoHistorico[] = []
  const historicoBase: Record<string, number> = {
    'SAL-MIN': 1.85, 'RAC-CONF': 1.42, 'SUP-REC': 2.15, 'SEM-ARM': 58,
    'VAC-AFT': 1.65, 'MED-IVE': 39,
  }
  for (const [itemId, base] of Object.entries(historicoBase)) {
    for (let m = 11; m >= 3; m -= 2) {
      const drift = 1 + (11 - m) * 0.018
      precosHistoricos.push({
        itemEstoqueId: itemId,
        data: addDays(today, -m * 30),
        preco: Math.round(base * drift * 100) / 100,
      })
    }
  }
  for (const ped of pedidos) {
    for (const it of ped.itens) {
      precosHistoricos.push({ itemEstoqueId: it.itemEstoqueId, data: ped.data, preco: it.valorUnitario })
    }
  }
  precosHistoricos.sort((a, b) => a.data.localeCompare(b.data))

  return {
    geradoEm: today,
    fazenda: {
      nome: P.fazenda.nome,
      areaHa: P.fazenda.areaHa,
      totalCabecas: animais.filter((a) => a.status === 'ativo').length,
    },
    pastos,
    lotes,
    animais,
    movimentacoes,
    estacoes,
    partos,
    desmames,
    lotesRecria,
    protocolosIATF,
    diagnosticos,
    tourosRepasse,
    estoque,
    movEstoque,
    pedidos,
    precosHistoricos,
  }
}
