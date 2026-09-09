// =====================================================================
// SEED DETERMINÍSTICO MULTI-PERFIL — dados 100% fictícios
//
// Todo o dataset da demo nasce deste arquivo, gerado por funções puras
// a partir dos parâmetros de cada PERFIL de demonstração:
//   - ciclo_completo : Fazenda Santa Helena, 800 ha, 1.200 cab
//   - cria_120       : Sítio Boa Esperança, cria pura, 120 matrizes
//   - corte_leite    : Fazenda Dois Córregos, corte + leite + máquinas
// Nenhum número de negócio deve viver solto nos componentes.
// Datas relativas ao dia da geração — a demo nunca envelhece.
// =====================================================================

import type {
  Animal,
  Categoria,
  CentroCusto,
  Desmame,
  DiagnosticoGestacao,
  EstacaoMonta,
  ItemEstoque,
  Lancamento,
  Lote,
  LoteRecria,
  Maquina,
  MovEstoque,
  Movimentacao,
  OrdemServico,
  Parto,
  Pasto,
  Pedido,
  PerfilDemo,
  PrecoHistorico,
  ProducaoLeite,
  ProtocoloIATF,
  SeedData,
  TouroRepasse,
} from './types'

// ---------------------------------------------------------------------
// Constantes universais da demo
// ---------------------------------------------------------------------

export const UA_KG = 450 // 1 UA = 450 kg de peso vivo
export const KG_POR_ARROBA = 30 // 1 @ = 30 kg PV equivalente (rendimento 50%)
export const GESTACAO_DIAS = 283
export const APARTACAO_DIAS = 240 // apartação (desmame) prevista aos 8 meses

// ---------------------------------------------------------------------
// Estrutura de parâmetros de um perfil
// ---------------------------------------------------------------------

interface RecriaLoteParams {
  id: string
  nome: string
  sexo: 'M' | 'F'
  /** lotes de desmame recebem animais dos desmames; os demais geram animais próprios */
  origem: 'desmame' | 'propria'
  categoria?: Categoria // p/ origem própria (garrote / novilha_13_24)
  prefixo?: string // brinco p/ origem própria
  qtd: number
  entradaDias: number
  pesoEntrada: number
  gmd: number
  gmdMeta: number
  pesoAlvo: number
  pastoId: string
}

interface DesmameRoundParams {
  dia: number
  qtd: number
  sexo: 'M' | 'F'
  pesoMedio: number
  loteId: string
}

interface PerfilParams {
  nomePerfil: string
  fazenda: { nome: string; areaHa: number }
  seedRandom: number
  inventario: {
    vaca: number
    vacaLeite: number
    touro: number
    novilha_24: number
    boi_terminacao: number
  }
  /** novilhas 13-24m fora de lote de recria (perfil cria) */
  novilhasJovens?: { qtd: number; loteId: string; prefixo: string }
  pastos: Pasto[]
  lotes: Lote[]
  lotesCriaIds: string[] // lotes que recebem matrizes + bezerros ao pé
  loteNovilhasId: string
  loteLactacaoId?: string
  loteSecasId?: string
  cria: {
    matrizesExpostasSafraPassada: number
    partos: number
    mortesPreDesmame: number
    mortesMachos: number
    machosNascidos: number
    nascimentoIniDias: number
    nascimentoFimDias: number
    pesoNascerMedio: number
    /** % das matrizes paridas com parto também na safra anterior (base do IP) */
    matrizesComPartoAnterior: number
    ipMinDias: number
    ipMaxDias: number
  }
  desmameRounds: DesmameRoundParams[]
  recria: RecriaLoteParams[]
  confinamento?: { qtd: number; entradaDias: number; pesoEntrada: number; gmd: number; loteId: string }
  reproducao: {
    estacaoInicioDias: number
    estacaoFimDias: number
    matrizesExpostas: number
    protocolos: {
      id: string
      nome: string
      loteDescricao: string
      matrizes: number
      d0Dias: number
      produto: string
      inseminador: string
      touroSemen: string
      semenItemId: string
    }[]
    prenhasIATF: number
    dg30Dias: number
    prenhasRepasse: number
    dgFinalDias: number
    dgPendentes: number
    tourosRepasse: TouroRepasse[]
  }
  itensEstoque: {
    id: string
    nome: string
    categoria: ItemEstoque['categoria']
    unidade: string
    minimo: number
    validadeDias?: number
    botijao?: string
    caneca?: string
  }[]
  pedidos: {
    numero: string
    fornecedor: string
    dataDias: number
    recebidoDias?: number
    status: Pedido['status']
    rateio: Record<CentroCusto, number>
    itens: { itemEstoqueId: string; descricao: string; quantidade: number; valorUnitario: number }[]
  }[]
  saidasEstoque: { itemId: string; dia: number; quantidade: number; loteDestino: string; obs?: string }[]
  historicoPrecosBase: Record<string, number>
  vendaDescarte?: { dia: number; qtd: number; valorCabeca: number; obs: string }
  compraBois?: { dia: number; obs: string }
  mudancaCategoria?: { qtd: number }
  despesasFixas: { descricao: string; categoria: string; valorMes: number }[]
  maquinas: {
    id: string
    nome: string
    tipo: string
    ano: number
    horimetro?: number
    proximaRevisaoHorimetro?: number
    proximaRevisaoDataDias?: number
    manutencoes: { diasAtras: number; tipo: 'preventiva' | 'corretiva'; descricao: string; custo: number; horimetro?: number }[]
  }[]
  ordensServico: {
    numero: string
    titulo: string
    tipo: OrdemServico['tipo']
    vinculo?: string
    responsavel: string
    aberturaDias: number
    prazoDias?: number
    status: OrdemServico['status']
    conclusaoDias?: number
    notas: { dias: number; texto: string }[]
  }[]
  leite?: { vacasLactacao: number; precoLitro: number; mediaLitrosVacaDia: number }
}

// ---------------------------------------------------------------------
// PERFIL 1 — Ciclo completo (a demo original)
// ---------------------------------------------------------------------

const PERFIL_CICLO: PerfilParams = {
  nomePerfil: 'Ciclo completo',
  fazenda: { nome: 'Fazenda Santa Helena', areaHa: 800 },
  seedRandom: 20260814,
  inventario: { vaca: 420, vacaLeite: 0, touro: 15, novilha_24: 85, boi_terminacao: 88 },
  pastos: [
    { id: 'P1', nome: 'Retiro Santa Rita', areaHa: 180, capacidadeUA: 250, tipo: 'pasto' },
    { id: 'P2', nome: 'Retiro Boa Vista', areaHa: 220, capacidadeUA: 300, tipo: 'pasto' },
    { id: 'P3', nome: 'Retiro Palmeiras', areaHa: 200, capacidadeUA: 260, tipo: 'pasto' },
    { id: 'P4', nome: 'Retiro Invernada Grande', areaHa: 160, capacidadeUA: 200, tipo: 'pasto' },
    { id: 'P5', nome: 'Confinamento Sede', areaHa: 40, capacidadeUA: 220, tipo: 'confinamento' },
  ],
  lotes: [
    { id: 'L-SR', nome: 'Matrizes Santa Rita', pastoId: 'P1', finalidade: 'cria' },
    { id: 'L-BV', nome: 'Matrizes Boa Vista', pastoId: 'P2', finalidade: 'cria' },
    { id: 'L-PA', nome: 'Matrizes Palmeiras', pastoId: 'P3', finalidade: 'cria' },
    { id: 'L-NC', nome: 'Novilhas de Cobertura', pastoId: 'P4', finalidade: 'reproducao' },
    { id: 'CONF', nome: 'Confinamento Sede', pastoId: 'P5', finalidade: 'terminacao' },
  ],
  lotesCriaIds: ['L-SR', 'L-BV', 'L-PA'],
  loteNovilhasId: 'L-NC',
  cria: {
    matrizesExpostasSafraPassada: 420,
    partos: 330,
    mortesPreDesmame: 13,
    mortesMachos: 6,
    machosNascidos: 166,
    nascimentoIniDias: -305,
    nascimentoFimDias: -215,
    pesoNascerMedio: 32,
    matrizesComPartoAnterior: 0.85,
    ipMinDias: 345,
    ipMaxDias: 430,
  },
  desmameRounds: [
    { dia: -75, qtd: 90, sexo: 'M', pesoMedio: 205, loteId: 'R1' },
    { dia: -40, qtd: 80, sexo: 'F', pesoMedio: 182, loteId: 'R2' },
  ],
  recria: [
    { id: 'R1', nome: 'Recria Machos 25/26', sexo: 'M', origem: 'desmame', qtd: 90, entradaDias: -75, pesoEntrada: 205, gmd: 0.58, gmdMeta: 0.55, pesoAlvo: 380, pastoId: 'P2' },
    { id: 'R2', nome: 'Recria Fêmeas 25/26', sexo: 'F', origem: 'desmame', qtd: 80, entradaDias: -40, pesoEntrada: 182, gmd: 0.44, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P3' },
    { id: 'R3', nome: 'Garrotes 24/25', sexo: 'M', origem: 'propria', categoria: 'garrote', prefixo: 'GR', qtd: 140, entradaDias: -270, pesoEntrada: 198, gmd: 0.52, gmdMeta: 0.5, pesoAlvo: 380, pastoId: 'P1' },
    { id: 'R4', nome: 'Novilhas 24/25', sexo: 'F', origem: 'propria', categoria: 'novilha_13_24', prefixo: 'NV', qtd: 135, entradaDias: -270, pesoEntrada: 182, gmd: 0.46, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P4' },
  ],
  confinamento: { qtd: 88, entradaDias: -60, pesoEntrada: 425, gmd: 1.35, loteId: 'CONF' },
  reproducao: {
    estacaoInicioDias: -95,
    estacaoFimDias: 25,
    matrizesExpostas: 460,
    protocolos: [
      { id: 'IATF-1', nome: 'IATF Lote 1', loteDescricao: 'Vacas paridas', matrizes: 160, d0Dias: -88, produto: 'Sincrogest + eCG', inseminador: 'Carlos Mendes', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-2', nome: 'IATF Lote 2', loteDescricao: 'Vacas paridas', matrizes: 160, d0Dias: -85, produto: 'Sincrogest + eCG', inseminador: 'Carlos Mendes', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-3', nome: 'IATF Lote 3', loteDescricao: 'Novilhas + vacas solteiras', matrizes: 140, d0Dias: -82, produto: 'Sincrogest + eCG', inseminador: 'Ana Paula Rocha', touroSemen: 'Basco FIV CIAV', semenItemId: 'SEM-BAS' },
    ],
    prenhasIATF: 239,
    dg30Dias: -55,
    prenhasRepasse: 122,
    dgFinalDias: -10,
    dgPendentes: 60,
    tourosRepasse: [
      { brinco: 'T-01', nome: 'Imperador SH', vacasRepasse: 45, prenhezesRepasse: 28 },
      { brinco: 'T-02', nome: 'Diamante SH', vacasRepasse: 44, prenhezesRepasse: 26 },
      { brinco: 'T-03', nome: 'Sultão SH', vacasRepasse: 44, prenhezesRepasse: 24 },
      { brinco: 'T-04', nome: 'Trovão SH', vacasRepasse: 44, prenhezesRepasse: 22 },
      { brinco: 'T-05', nome: 'Ouro Fino SH', vacasRepasse: 44, prenhezesRepasse: 22 },
    ],
  },
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
  ],
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
      itens: [{ itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 80 P (kg)', quantidade: 20000, valorUnitario: 2.1 }],
    },
    {
      numero: 'PC-2025-055', fornecedor: 'Nutrição Cerrado', dataDias: -60, recebidoDias: -55, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
      itens: [{ itemEstoqueId: 'RAC-CONF', descricao: 'Ração confinamento 14% PB (kg)', quantidade: 120000, valorUnitario: 1.55 }],
    },
    {
      numero: 'PC-2025-058', fornecedor: 'Nutrição Cerrado', dataDias: -50, recebidoDias: -45, status: 'recebido',
      rateio: { Cria: 0, Recria: 100, Terminacao: 0, Geral: 0 },
      itens: [{ itemEstoqueId: 'SUP-REC', descricao: 'Suplemento proteico recria (kg)', quantidade: 45000, valorUnitario: 2.4 }],
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
      itens: [{ itemEstoqueId: 'DEF-HER', descricao: 'Herbicida pastagem (L)', quantidade: 400, valorUnitario: 48 }],
    },
    {
      numero: 'PC-2025-066', fornecedor: 'Nutrição Cerrado', dataDias: -5, status: 'pendente',
      rateio: { Cria: 40, Recria: 40, Terminacao: 0, Geral: 20 },
      itens: [{ itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 80 P (kg)', quantidade: 15000, valorUnitario: 2.25 }],
    },
  ],
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
  ],
  historicoPrecosBase: { 'SAL-MIN': 1.85, 'RAC-CONF': 1.42, 'SUP-REC': 2.15, 'SEM-ARM': 58, 'VAC-AFT': 1.65, 'MED-IVE': 39 },
  vendaDescarte: { dia: -85, qtd: 30, valorCabeca: 2600, obs: 'Vacas de descarte — Frigorífico Boi Forte' },
  compraBois: { dia: -60, obs: 'Garrotões p/ terminação — Leilão Uberaba' },
  mudancaCategoria: { qtd: 40 },
  despesasFixas: [
    { descricao: 'Folha de pagamento', categoria: 'Pessoal', valorMes: 18000 },
    { descricao: 'Energia elétrica', categoria: 'Energia', valorMes: 2400 },
    { descricao: 'Combustível e lubrificantes', categoria: 'Combustível', valorMes: 5500 },
  ],
  maquinas: [],
  ordensServico: [],
}

// ---------------------------------------------------------------------
// PERFIL 2 — Cria, 120 matrizes (o pedido do lead de cria)
// ---------------------------------------------------------------------

const PERFIL_CRIA: PerfilParams = {
  nomePerfil: 'Cria — 120 matrizes',
  fazenda: { nome: 'Sítio Boa Esperança', areaHa: 150 },
  seedRandom: 20260901,
  inventario: { vaca: 120, vacaLeite: 0, touro: 4, novilha_24: 14, boi_terminacao: 0 },
  novilhasJovens: { qtd: 18, loteId: 'L-NOV', prefixo: 'NJ' },
  pastos: [
    { id: 'P1', nome: 'Pasto Sede', areaHa: 60, capacidadeUA: 90, tipo: 'pasto' },
    { id: 'P2', nome: 'Pasto do Rio', areaHa: 55, capacidadeUA: 80, tipo: 'pasto' },
    { id: 'P3', nome: 'Pasto Novo', areaHa: 35, capacidadeUA: 50, tipo: 'pasto' },
  ],
  lotes: [
    { id: 'L-M1', nome: 'Matrizes Sede', pastoId: 'P1', finalidade: 'cria' },
    { id: 'L-M2', nome: 'Matrizes do Rio', pastoId: 'P2', finalidade: 'cria' },
    { id: 'L-NOV', nome: 'Novilhas', pastoId: 'P3', finalidade: 'reproducao' },
  ],
  lotesCriaIds: ['L-M1', 'L-M2'],
  loteNovilhasId: 'L-NOV',
  cria: {
    matrizesExpostasSafraPassada: 120,
    partos: 95,
    mortesPreDesmame: 4,
    mortesMachos: 2,
    machosNascidos: 48,
    nascimentoIniDias: -210, // safra mais recente: bezerros de 1 a 7 meses, todos ao pé
    nascimentoFimDias: -30,
    pesoNascerMedio: 31,
    matrizesComPartoAnterior: 0.82,
    ipMinDias: 350,
    ipMaxDias: 435,
  },
  desmameRounds: [], // apartação prevista aos 8 meses — nenhum bezerro apartado ainda
  recria: [],
  reproducao: {
    estacaoInicioDias: -60,
    estacaoFimDias: 60,
    matrizesExpostas: 110,
    protocolos: [
      { id: 'IATF-1', nome: 'IATF Lote Sede', loteDescricao: 'Vacas paridas — Sede', matrizes: 55, d0Dias: -52, produto: 'Sincrogest + eCG', inseminador: 'João Batista', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-2', nome: 'IATF Lote Rio', loteDescricao: 'Vacas paridas — Rio', matrizes: 55, d0Dias: -48, produto: 'Sincrogest + eCG', inseminador: 'João Batista', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
    ],
    prenhasIATF: 58,
    dg30Dias: -18,
    prenhasRepasse: 0, // repasse com touro em andamento — DG do repasse ainda não feito
    dgFinalDias: -2,
    dgPendentes: 30,
    tourosRepasse: [
      { brinco: 'T-01', nome: 'Cacique BE', vacasRepasse: 26, prenhezesRepasse: 0 },
      { brinco: 'T-02', nome: 'Vendaval BE', vacasRepasse: 26, prenhezesRepasse: 0 },
    ],
  },
  itensEstoque: [
    { id: 'SEM-ARM', nome: 'Sêmen REM Armador', categoria: 'semen', unidade: 'dose', minimo: 20, botijao: 'BT-01', caneca: 'C1' },
    { id: 'HOR-P4', nome: 'Implante intravaginal P4', categoria: 'hormonio', unidade: 'un', minimo: 20, validadeDias: 220 },
    { id: 'HOR-ECG', nome: 'eCG 400 UI', categoria: 'hormonio', unidade: 'dose', minimo: 20, validadeDias: 180 },
    { id: 'HOR-PGF', nome: 'Prostaglandina', categoria: 'hormonio', unidade: 'dose', minimo: 20, validadeDias: 200 },
    { id: 'VAC-AFT', nome: 'Vacina aftosa', categoria: 'vacina', unidade: 'dose', minimo: 50, validadeDias: 100 },
    { id: 'VAC-CLO', nome: 'Vacina clostridiose', categoria: 'vacina', unidade: 'dose', minimo: 50, validadeDias: 40 },
    { id: 'SAL-MIN', nome: 'Sal mineral 65 P', categoria: 'sal_mineral', unidade: 'kg', minimo: 1000 },
    { id: 'MED-IVE', nome: 'Ivermectina 1% 500ml', categoria: 'medicamento', unidade: 'frasco', minimo: 4, validadeDias: 280 },
  ],
  pedidos: [
    {
      numero: 'PC-2026-011', fornecedor: 'Central Genética Ltda', dataDias: -75, recebidoDias: -66, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [{ itemEstoqueId: 'SEM-ARM', descricao: 'Sêmen REM Armador (dose)', quantidade: 150, valorUnitario: 68 }],
    },
    {
      numero: 'PC-2026-012', fornecedor: 'AgroFarma Distribuidora', dataDias: -70, recebidoDias: -62, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'HOR-P4', descricao: 'Implante intravaginal P4', quantidade: 120, valorUnitario: 19 },
        { itemEstoqueId: 'HOR-ECG', descricao: 'eCG 400 UI (dose)', quantidade: 120, valorUnitario: 15 },
        { itemEstoqueId: 'HOR-PGF', descricao: 'Prostaglandina (dose)', quantidade: 120, valorUnitario: 6.5 },
      ],
    },
    {
      numero: 'PC-2026-015', fornecedor: 'AgroFarma Distribuidora', dataDias: -55, recebidoDias: -48, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'VAC-AFT', descricao: 'Vacina aftosa (dose)', quantidade: 260, valorUnitario: 1.85 },
        { itemEstoqueId: 'VAC-CLO', descricao: 'Vacina clostridiose (dose)', quantidade: 150, valorUnitario: 1.25 },
      ],
    },
    {
      numero: 'PC-2026-017', fornecedor: 'Agropecuária do Vale', dataDias: -40, recebidoDias: -35, status: 'recebido',
      rateio: { Cria: 60, Recria: 0, Terminacao: 0, Geral: 40 },
      itens: [
        { itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 65 P (kg)', quantidade: 4000, valorUnitario: 2.3 },
        { itemEstoqueId: 'MED-IVE', descricao: 'Ivermectina 1% 500ml (frasco)', quantidade: 12, valorUnitario: 44 },
      ],
    },
    {
      numero: 'PC-2026-019', fornecedor: 'Agropecuária do Vale', dataDias: -4, status: 'pendente',
      rateio: { Cria: 60, Recria: 0, Terminacao: 0, Geral: 40 },
      itens: [{ itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 65 P (kg)', quantidade: 3000, valorUnitario: 2.45 }],
    },
  ],
  saidasEstoque: [
    { itemId: 'HOR-P4', dia: -52, quantidade: 110, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-ECG', dia: -44, quantidade: 110, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-PGF', dia: -44, quantidade: 110, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'VAC-AFT', dia: -30, quantidade: 245, loteDestino: 'Rebanho geral', obs: 'Campanha aftosa' },
    { itemId: 'VAC-CLO', dia: -25, quantidade: 95, loteDestino: 'Bezerros(as) da safra' },
    { itemId: 'SAL-MIN', dia: -30, quantidade: 950, loteDestino: 'Pastos (cocho)', obs: 'Consumo mensal' },
    { itemId: 'SAL-MIN', dia: -2, quantidade: 950, loteDestino: 'Pastos (cocho)', obs: 'Consumo mensal' },
    { itemId: 'MED-IVE', dia: -30, quantidade: 6, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
  ],
  historicoPrecosBase: { 'SAL-MIN': 2.05, 'SEM-ARM': 60, 'VAC-AFT': 1.7 },
  despesasFixas: [
    { descricao: 'Folha de pagamento', categoria: 'Pessoal', valorMes: 5800 },
    { descricao: 'Energia elétrica', categoria: 'Energia', valorMes: 650 },
    { descricao: 'Combustível', categoria: 'Combustível', valorMes: 1100 },
  ],
  maquinas: [],
  ordensServico: [],
}

// ---------------------------------------------------------------------
// PERFIL 3 — Corte & Leite (o pedido do lead "sistema completo")
// ---------------------------------------------------------------------

const PERFIL_CORTE_LEITE: PerfilParams = {
  nomePerfil: 'Corte & Leite',
  fazenda: { nome: 'Fazenda Dois Córregos', areaHa: 420 },
  seedRandom: 20260922,
  inventario: { vaca: 150, vacaLeite: 60, touro: 8, novilha_24: 25, boi_terminacao: 40 },
  pastos: [
    { id: 'P1', nome: 'Retiro Grande', areaHa: 140, capacidadeUA: 180, tipo: 'pasto' },
    { id: 'P2', nome: 'Retiro do Meio', areaHa: 120, capacidadeUA: 150, tipo: 'pasto' },
    { id: 'P3', nome: 'Piquetes do Leite', areaHa: 60, capacidadeUA: 100, tipo: 'pasto' },
    { id: 'P4', nome: 'Pasto das Novilhas', areaHa: 60, capacidadeUA: 80, tipo: 'pasto' },
    { id: 'P5', nome: 'Confinamento e Sede', areaHa: 40, capacidadeUA: 120, tipo: 'confinamento' },
  ],
  lotes: [
    { id: 'L-C1', nome: 'Matrizes Corte 1', pastoId: 'P1', finalidade: 'cria' },
    { id: 'L-C2', nome: 'Matrizes Corte 2', pastoId: 'P2', finalidade: 'cria' },
    { id: 'L-LAC', nome: 'Leite — Lactação', pastoId: 'P3', finalidade: 'leite' },
    { id: 'L-SEC', nome: 'Leite — Vacas Secas', pastoId: 'P3', finalidade: 'leite' },
    { id: 'L-NC', nome: 'Novilhas de Cobertura', pastoId: 'P4', finalidade: 'reproducao' },
    { id: 'CONF', nome: 'Confinamento Sede', pastoId: 'P5', finalidade: 'terminacao' },
  ],
  lotesCriaIds: ['L-C1', 'L-C2'],
  loteNovilhasId: 'L-NC',
  loteLactacaoId: 'L-LAC',
  loteSecasId: 'L-SEC',
  cria: {
    matrizesExpostasSafraPassada: 205,
    partos: 160,
    mortesPreDesmame: 6,
    mortesMachos: 3,
    machosNascidos: 82,
    nascimentoIniDias: -290,
    nascimentoFimDias: -200,
    pesoNascerMedio: 32,
    matrizesComPartoAnterior: 0.8,
    ipMinDias: 350,
    ipMaxDias: 440,
  },
  desmameRounds: [
    { dia: -65, qtd: 32, sexo: 'M', pesoMedio: 198, loteId: 'R1' },
    { dia: -35, qtd: 28, sexo: 'F', pesoMedio: 176, loteId: 'R2' },
  ],
  recria: [
    { id: 'R1', nome: 'Recria Machos 25/26', sexo: 'M', origem: 'desmame', qtd: 32, entradaDias: -65, pesoEntrada: 198, gmd: 0.55, gmdMeta: 0.52, pesoAlvo: 380, pastoId: 'P1' },
    { id: 'R2', nome: 'Recria Fêmeas 25/26', sexo: 'F', origem: 'desmame', qtd: 28, entradaDias: -35, pesoEntrada: 176, gmd: 0.46, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P2' },
    { id: 'R3', nome: 'Garrotes 24/25', sexo: 'M', origem: 'propria', categoria: 'garrote', prefixo: 'GR', qtd: 40, entradaDias: -250, pesoEntrada: 195, gmd: 0.5, gmdMeta: 0.5, pesoAlvo: 380, pastoId: 'P1' },
    { id: 'R4', nome: 'Novilhas 24/25', sexo: 'F', origem: 'propria', categoria: 'novilha_13_24', prefixo: 'NV', qtd: 35, entradaDias: -250, pesoEntrada: 180, gmd: 0.45, gmdMeta: 0.5, pesoAlvo: 330, pastoId: 'P4' },
  ],
  confinamento: { qtd: 40, entradaDias: -55, pesoEntrada: 430, gmd: 1.3, loteId: 'CONF' },
  reproducao: {
    estacaoInicioDias: -90,
    estacaoFimDias: 30,
    matrizesExpostas: 200,
    protocolos: [
      { id: 'IATF-1', nome: 'IATF Corte 1', loteDescricao: 'Vacas paridas — corte', matrizes: 100, d0Dias: -84, produto: 'Sincrogest + eCG', inseminador: 'Roberto Lima', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-2', nome: 'IATF Corte 2', loteDescricao: 'Novilhas + solteiras', matrizes: 100, d0Dias: -80, produto: 'Sincrogest + eCG', inseminador: 'Roberto Lima', touroSemen: 'Basco FIV CIAV', semenItemId: 'SEM-BAS' },
    ],
    prenhasIATF: 104,
    dg30Dias: -50,
    prenhasRepasse: 48,
    dgFinalDias: -8,
    dgPendentes: 25,
    tourosRepasse: [
      { brinco: 'T-01', nome: 'Imperador DC', vacasRepasse: 32, prenhezesRepasse: 18 },
      { brinco: 'T-02', nome: 'Diamante DC', vacasRepasse: 32, prenhezesRepasse: 16 },
      { brinco: 'T-03', nome: 'Sultão DC', vacasRepasse: 32, prenhezesRepasse: 14 },
    ],
  },
  itensEstoque: [
    { id: 'SEM-ARM', nome: 'Sêmen REM Armador', categoria: 'semen', unidade: 'dose', minimo: 30, botijao: 'BT-01', caneca: 'C2' },
    { id: 'SEM-BAS', nome: 'Sêmen Basco FIV CIAV', categoria: 'semen', unidade: 'dose', minimo: 20, botijao: 'BT-01', caneca: 'C4' },
    { id: 'HOR-P4', nome: 'Implante intravaginal P4', categoria: 'hormonio', unidade: 'un', minimo: 30, validadeDias: 230 },
    { id: 'HOR-ECG', nome: 'eCG 400 UI', categoria: 'hormonio', unidade: 'dose', minimo: 30, validadeDias: 180 },
    { id: 'HOR-PGF', nome: 'Prostaglandina', categoria: 'hormonio', unidade: 'dose', minimo: 30, validadeDias: 210 },
    { id: 'VAC-AFT', nome: 'Vacina aftosa', categoria: 'vacina', unidade: 'dose', minimo: 100, validadeDias: 110 },
    { id: 'VAC-CLO', nome: 'Vacina clostridiose', categoria: 'vacina', unidade: 'dose', minimo: 80, validadeDias: 50 },
    { id: 'VAC-BRU', nome: 'Vacina brucelose B19', categoria: 'vacina', unidade: 'dose', minimo: 30, validadeDias: 190 },
    { id: 'SAL-MIN', nome: 'Sal mineral 80 P', categoria: 'sal_mineral', unidade: 'kg', minimo: 2500 },
    { id: 'RAC-CONF', nome: 'Ração confinamento 14% PB', categoria: 'racao', unidade: 'kg', minimo: 8000 },
    { id: 'RAC-LACT', nome: 'Ração lactação 21% PB', categoria: 'racao', unidade: 'kg', minimo: 5000 },
    { id: 'MED-IVE', nome: 'Ivermectina 1% 500ml', categoria: 'medicamento', unidade: 'frasco', minimo: 6, validadeDias: 290 },
    { id: 'MED-OXI', nome: 'Oxitetraciclina LA 200ml', categoria: 'medicamento', unidade: 'frasco', minimo: 5, validadeDias: 270 },
  ],
  pedidos: [
    {
      numero: 'PC-2025-101', fornecedor: 'Central Genética Ltda', dataDias: -120, recebidoDias: -110, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'SEM-ARM', descricao: 'Sêmen REM Armador (dose)', quantidade: 150, valorUnitario: 66 },
        { itemEstoqueId: 'SEM-BAS', descricao: 'Sêmen Basco FIV CIAV (dose)', quantidade: 130, valorUnitario: 92 },
      ],
    },
    {
      numero: 'PC-2025-103', fornecedor: 'AgroFarma Distribuidora', dataDias: -100, recebidoDias: -92, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'HOR-P4', descricao: 'Implante intravaginal P4', quantidade: 220, valorUnitario: 18.5 },
        { itemEstoqueId: 'HOR-ECG', descricao: 'eCG 400 UI (dose)', quantidade: 220, valorUnitario: 14.5 },
        { itemEstoqueId: 'HOR-PGF', descricao: 'Prostaglandina (dose)', quantidade: 220, valorUnitario: 6 },
      ],
    },
    {
      numero: 'PC-2025-107', fornecedor: 'AgroFarma Distribuidora', dataDias: -85, recebidoDias: -78, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'VAC-AFT', descricao: 'Vacina aftosa (dose)', quantidade: 560, valorUnitario: 1.8 },
        { itemEstoqueId: 'VAC-CLO', descricao: 'Vacina clostridiose (dose)', quantidade: 300, valorUnitario: 1.2 },
        { itemEstoqueId: 'VAC-BRU', descricao: 'Vacina brucelose B19 (dose)', quantidade: 90, valorUnitario: 3.5 },
      ],
    },
    {
      numero: 'PC-2025-110', fornecedor: 'Nutrição Cerrado', dataDias: -70, recebidoDias: -64, status: 'recebido',
      rateio: { Cria: 40, Recria: 30, Terminacao: 0, Geral: 30 },
      itens: [{ itemEstoqueId: 'SAL-MIN', descricao: 'Sal mineral 80 P (kg)', quantidade: 9000, valorUnitario: 2.15 }],
    },
    {
      numero: 'PC-2025-114', fornecedor: 'Nutrição Cerrado', dataDias: -52, recebidoDias: -47, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
      itens: [{ itemEstoqueId: 'RAC-CONF', descricao: 'Ração confinamento 14% PB (kg)', quantidade: 48000, valorUnitario: 1.58 }],
    },
    {
      numero: 'PC-2025-118', fornecedor: 'Nutrição Cerrado', dataDias: -30, recebidoDias: -25, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [{ itemEstoqueId: 'RAC-LACT', descricao: 'Ração lactação 21% PB (kg)', quantidade: 30000, valorUnitario: 2.05 }],
    },
    {
      numero: 'PC-2025-121', fornecedor: 'AgroFarma Distribuidora', dataDias: -20, recebidoDias: -15, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'MED-IVE', descricao: 'Ivermectina 1% 500ml (frasco)', quantidade: 25, valorUnitario: 43 },
        { itemEstoqueId: 'MED-OXI', descricao: 'Oxitetraciclina LA 200ml (frasco)', quantidade: 18, valorUnitario: 39 },
      ],
    },
    {
      numero: 'PC-2025-124', fornecedor: 'Nutrição Cerrado', dataDias: -6, status: 'pendente',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [{ itemEstoqueId: 'RAC-LACT', descricao: 'Ração lactação 21% PB (kg)', quantidade: 30000, valorUnitario: 2.12 }],
    },
  ],
  saidasEstoque: [
    { itemId: 'HOR-P4', dia: -84, quantidade: 200, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-ECG', dia: -76, quantidade: 200, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-PGF', dia: -76, quantidade: 200, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'VAC-AFT', dia: -60, quantidade: 500, loteDestino: 'Rebanho geral', obs: 'Campanha aftosa' },
    { itemId: 'VAC-CLO', dia: -35, quantidade: 160, loteDestino: 'Bezerros(as) da safra' },
    { itemId: 'VAC-BRU', dia: -35, quantidade: 40, loteDestino: 'Bezerras 3–8 meses' },
    { itemId: 'SAL-MIN', dia: -45, quantidade: 2200, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'SAL-MIN', dia: -15, quantidade: 2200, loteDestino: 'Retiros (cocho)', obs: 'Consumo mensal' },
    { itemId: 'RAC-CONF', dia: -25, quantidade: 22000, loteDestino: 'Confinamento Sede', obs: 'Trato diário' },
    { itemId: 'RAC-LACT', dia: -12, quantidade: 16000, loteDestino: 'Leite — Lactação', obs: 'Trato da ordenha' },
    { itemId: 'MED-IVE', dia: -60, quantidade: 14, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
    { itemId: 'MED-OXI', dia: -10, quantidade: 5, loteDestino: 'Leite — Lactação' },
  ],
  historicoPrecosBase: { 'SAL-MIN': 1.9, 'RAC-CONF': 1.45, 'RAC-LACT': 1.88, 'SEM-ARM': 59 },
  vendaDescarte: { dia: -75, qtd: 18, valorCabeca: 2750, obs: 'Vacas de descarte — Frigorífico Planalto' },
  compraBois: { dia: -55, obs: 'Garrotões p/ terminação — Leilão regional' },
  mudancaCategoria: { qtd: 15 },
  despesasFixas: [
    { descricao: 'Folha de pagamento', categoria: 'Pessoal', valorMes: 14000 },
    { descricao: 'Energia elétrica (ordenha + sede)', categoria: 'Energia', valorMes: 3800 },
    { descricao: 'Combustível e lubrificantes', categoria: 'Combustível', valorMes: 4200 },
  ],
  maquinas: [
    {
      id: 'MAQ-1', nome: 'Trator MF 4275', tipo: 'Trator', ano: 2018, horimetro: 3450, proximaRevisaoHorimetro: 3500,
      manutencoes: [
        { diasAtras: 160, tipo: 'preventiva', descricao: 'Revisão de 3.000 h — óleo, filtros e correias', custo: 2850, horimetro: 3010 },
        { diasAtras: 45, tipo: 'corretiva', descricao: 'Troca da bomba hidráulica', custo: 4200, horimetro: 3390 },
      ],
    },
    {
      id: 'MAQ-2', nome: 'Trator John Deere 5075E', tipo: 'Trator', ano: 2021, horimetro: 1870, proximaRevisaoHorimetro: 2000,
      manutencoes: [
        { diasAtras: 90, tipo: 'preventiva', descricao: 'Revisão de 1.500 h', custo: 1950, horimetro: 1620 },
      ],
    },
    {
      id: 'MAQ-3', nome: 'Vagão forrageiro Ipacol', tipo: 'Implemento', ano: 2019,
      proximaRevisaoDataDias: 40,
      manutencoes: [
        { diasAtras: 30, tipo: 'corretiva', descricao: 'Solda no chassi e troca de facas', custo: 980 },
      ],
    },
    {
      id: 'MAQ-4', nome: 'Pulverizador 600 L', tipo: 'Implemento', ano: 2020,
      proximaRevisaoDataDias: 120,
      manutencoes: [],
    },
    {
      id: 'MAQ-5', nome: 'Ordenhadeira canalizada 8 conjuntos', tipo: 'Ordenha', ano: 2022,
      proximaRevisaoDataDias: 20,
      manutencoes: [
        { diasAtras: 75, tipo: 'preventiva', descricao: 'Troca de teteiras e mangueiras de leite', custo: 1650 },
      ],
    },
    {
      id: 'MAQ-6', nome: 'Tanque resfriador 2.000 L', tipo: 'Ordenha', ano: 2022,
      proximaRevisaoDataDias: 90,
      manutencoes: [
        { diasAtras: 55, tipo: 'corretiva', descricao: 'Reparo no compressor', custo: 1200 },
      ],
    },
  ],
  ordensServico: [
    {
      numero: 'OS-041', titulo: 'Reforma da cerca do Retiro do Meio', tipo: 'cerca', vinculo: 'Retiro do Meio',
      responsavel: 'Zé Carlos', aberturaDias: -20, prazoDias: 10, status: 'em_andamento',
      notas: [
        { dias: -15, texto: 'Material comprado — 80 mourões e 12 rolos de arame' },
        { dias: -6, texto: '60% do trecho concluído' },
      ],
    },
    {
      numero: 'OS-042', titulo: 'Revisão de 3.000 h do trator MF 4275', tipo: 'manutencao', vinculo: 'Trator MF 4275',
      responsavel: 'Mecânica Rural Silva', aberturaDias: -165, status: 'concluida', conclusaoDias: -160,
      notas: [{ dias: -160, texto: 'Revisão concluída na oficina — óleo, filtros e correias' }],
    },
    {
      numero: 'OS-043', titulo: 'Limpeza profunda do tanque resfriador', tipo: 'manutencao', vinculo: 'Tanque resfriador 2.000 L',
      responsavel: 'Equipe do leite', aberturaDias: -3, prazoDias: 4, status: 'aberta', notas: [],
    },
    {
      numero: 'OS-044', titulo: 'Reforma do curral de manejo', tipo: 'infraestrutura', vinculo: 'Sede',
      responsavel: 'Zé Carlos', aberturaDias: -35, prazoDias: 25, status: 'em_andamento',
      notas: [{ dias: -10, texto: 'Brete novo instalado, falta o embarcadouro' }],
    },
    {
      numero: 'OS-045', titulo: 'Vacinação de aftosa — rebanho geral', tipo: 'sanitario', vinculo: 'Rebanho geral',
      responsavel: 'Roberto Lima', aberturaDias: -62, status: 'concluida', conclusaoDias: -60,
      notas: [{ dias: -60, texto: '500 doses aplicadas' }],
    },
    {
      numero: 'OS-046', titulo: 'Pulverização do Pasto das Novilhas', tipo: 'pastagem', vinculo: 'Pasto das Novilhas',
      responsavel: 'João Pedro', aberturaDias: -12, prazoDias: -2, status: 'aberta',
      notas: [{ dias: -8, texto: 'Aguardando chegada do herbicida' }],
    },
  ],
  leite: { vacasLactacao: 42, precoLitro: 2.65, mediaLitrosVacaDia: 18 },
}

export const PERFIS: Record<PerfilDemo, PerfilParams> = {
  ciclo_completo: PERFIL_CICLO,
  cria_120: PERFIL_CRIA,
  corte_leite: PERFIL_CORTE_LEITE,
}

/** Metadados de apresentação de cada perfil (nome, módulos da sidebar e destaques do banner) */
export interface PerfilInfo {
  nome: string
  descricao: string
  modulos: string[]
  /** frase de abertura do banner do Dashboard */
  boasVindas: string
  /** o que mostrar primeiro numa apresentação — vira link no banner */
  destaques: { rotulo: string; link: string }[]
}

export const PERFIL_INFO: Record<PerfilDemo, PerfilInfo> = {
  ciclo_completo: {
    nome: 'Ciclo completo',
    descricao: 'Nelore, 800 ha, 1.200 cabeças',
    modulos: ['/', '/rebanho', '/cria', '/recria', '/reproducao', '/estoque', '/compras', '/financeiro'],
    boasVindas:
      'Operação de ciclo completo: da cria à terminação, com estoque, compras e custo por arroba amarrados de ponta a ponta.',
    destaques: [
      { rotulo: 'Rebanho de 1.200 cabeças rastreado', link: '/rebanho' },
      { rotulo: 'GMD e projeções da recria', link: '/recria' },
      { rotulo: 'IATF e prenhez por terço', link: '/reproducao' },
      { rotulo: 'Custo/@ e fluxo de caixa', link: '/financeiro' },
    ],
  },
  cria_120: {
    nome: 'Cria — 120 matrizes',
    descricao: 'Cria pura: partos, IATF, IP e apartação',
    boasVindas:
      'Pequena propriedade de cria: 120 matrizes, com tudo que importa na produção de bezerros — sem módulos que você não usa.',
    modulos: ['/', '/rebanho', '/cria', '/reproducao', '/estoque'],
    destaques: [
      { rotulo: 'Partos e desmames da safra', link: '/cria' },
      { rotulo: 'Previsão de apartação aos 8 meses', link: '/cria' },
      { rotulo: 'IP (intervalo entre partos) por matriz', link: '/cria' },
      { rotulo: 'IATF e diagnóstico de gestação', link: '/reproducao' },
    ],
  },
  corte_leite: {
    nome: 'Corte & Leite',
    descricao: 'Completo: financeiro, máquinas, OS e leite',
    boasVindas:
      'Fazenda mista de corte e leite com a gestão completa: rebanho, reprodução, financeiro, frota de máquinas e ordens de serviço.',
    modulos: ['/', '/rebanho', '/cria', '/recria', '/reproducao', '/leite', '/estoque', '/compras', '/financeiro', '/maquinas', '/os'],
    destaques: [
      { rotulo: 'Fluxo de caixa e contas a pagar', link: '/financeiro' },
      { rotulo: 'Produção de leite diária', link: '/leite' },
      { rotulo: 'Máquinas, horímetro e manutenção', link: '/maquinas' },
      { rotulo: 'Ordens de serviço com acompanhamento', link: '/os' },
    ],
  },
}

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

const NOMES_TOUROS = [
  'Imperador', 'Diamante', 'Sultão', 'Trovão', 'Ouro Fino',
  'Cacique', 'Maestro', 'Vendaval', 'Rubi', 'Dominador',
  'Guardião', 'Faraó', 'Titã', 'Barão', 'Astro',
]

// ---------------------------------------------------------------------
// Geração do dataset
// ---------------------------------------------------------------------

export function buildSeed(perfil: PerfilDemo = 'ciclo_completo', hoje?: string): SeedData {
  const today = hoje ?? new Date().toISOString().slice(0, 10)
  const P = PERFIS[perfil]
  const rng = mulberry32(P.seedRandom)

  const pastos: Pasto[] = P.pastos.map((p) => ({ ...p }))
  const lotes: Lote[] = [
    ...P.lotes.map((l) => ({ ...l })),
    ...P.recria.map((r) => ({ id: r.id, nome: r.nome, pastoId: r.pastoId, finalidade: 'recria' as const })),
  ]

  const animais: Animal[] = []
  const movimentacoes: Movimentacao[] = []
  let movSeq = 1
  const mov = (m: Omit<Movimentacao, 'id'>) => {
    movimentacoes.push({ id: `MV-${String(movSeq++).padStart(4, '0')}`, ...m })
  }

  // ---- Touros ----
  const lotesTouros = [...P.lotesCriaIds, P.loteNovilhasId]
  for (let i = 0; i < P.inventario.touro; i++) {
    const peso = Math.round(760 + rng() * 140)
    animais.push({
      id: `A-T${i + 1}`,
      brinco: `T-${String(i + 1).padStart(2, '0')}`,
      sexo: 'M',
      categoria: 'touro',
      raca: 'Nelore PO',
      nascimento: addDays(today, -Math.round(1500 + rng() * 1500)),
      loteId: lotesTouros[i % lotesTouros.length],
      pesoAtual: peso,
      pesagens: [
        { data: addDays(today, -180), peso: peso - 18 },
        { data: addDays(today, -60), peso: peso - 5 },
      ],
      sanitario: [
        { data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' },
        { data: addDays(today, -70), tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
      ],
      status: 'ativo',
    })
  }

  // ---- Vacas de corte ----
  for (let i = 0; i < P.inventario.vaca; i++) {
    const peso = Math.round(430 + rng() * 70)
    animais.push({
      id: `A-V${i + 1}`,
      brinco: `V-${String(i + 1).padStart(4, '0')}`,
      sexo: 'F',
      categoria: 'vaca',
      raca: rng() < 0.3 ? 'Nelore PO' : 'Nelore',
      aptidao: 'corte',
      nascimento: addDays(today, -Math.round(1460 + rng() * 2900)),
      loteId: P.lotesCriaIds[i % P.lotesCriaIds.length],
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

  // ---- Vacas de leite (perfil corte & leite) ----
  const lactacao = P.leite?.vacasLactacao ?? 0
  for (let i = 0; i < P.inventario.vacaLeite; i++) {
    const peso = Math.round(500 + rng() * 90)
    animais.push({
      id: `A-L${i + 1}`,
      brinco: `L-${String(i + 1).padStart(4, '0')}`,
      sexo: 'F',
      categoria: 'vaca',
      raca: 'Girolando',
      aptidao: 'leite',
      nascimento: addDays(today, -Math.round(1400 + rng() * 2200)),
      loteId: i < lactacao ? (P.loteLactacaoId ?? P.lotesCriaIds[0]) : (P.loteSecasId ?? P.lotesCriaIds[0]),
      pesoAtual: peso,
      ecc: round1(2.8 + rng() * 1.2),
      pesagens: [{ data: addDays(today, -120), peso: peso - Math.round(rng() * 20) }],
      sanitario: [
        { data: addDays(today, -60), tipo: 'Vacinação', produto: 'Vacina aftosa' },
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
      loteId: P.loteNovilhasId,
      pesoAtual: peso,
      ecc: round1(2.8 + rng() * 1.2),
      pesagens: [{ data: addDays(today, -95), peso: peso - Math.round(rng() * 15) }],
      sanitario: [{ data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' }],
      status: 'ativo',
    })
  }

  // ---- Novilhas 13-24m avulsas (perfil cria) ----
  if (P.novilhasJovens) {
    for (let i = 0; i < P.novilhasJovens.qtd; i++) {
      const peso = Math.round(230 + rng() * 60)
      animais.push({
        id: `A-NJ${i + 1}`,
        brinco: `${P.novilhasJovens.prefixo}-${String(i + 1).padStart(3, '0')}`,
        sexo: 'F',
        categoria: 'novilha_13_24',
        raca: rng() < 0.3 ? 'Nelore PO' : 'Nelore',
        nascimento: addDays(today, -Math.round(400 + rng() * 300)),
        loteId: P.novilhasJovens.loteId,
        pesoAtual: peso,
        pesagens: [{ data: addDays(today, -60), peso: peso - Math.round(rng() * 12) }],
        sanitario: [{ data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' }],
        status: 'ativo',
      })
    }
  }

  // ---- Estações de monta ----
  const estacoes: EstacaoMonta[] = [
    {
      id: 'EM-PASS',
      nome: 'Estação passada (encerrada)',
      inicio: addDays(today, P.cria.nascimentoIniDias - GESTACAO_DIAS),
      fim: addDays(today, P.cria.nascimentoFimDias - GESTACAO_DIAS),
      matrizesExpostas: P.cria.matrizesExpostasSafraPassada,
      status: 'encerrada',
    },
    {
      id: 'EM-ATUAL',
      nome: 'Estação atual',
      inicio: addDays(today, P.reproducao.estacaoInicioDias),
      fim: addDays(today, P.reproducao.estacaoFimDias),
      matrizesExpostas: P.reproducao.matrizesExpostas,
      status: 'em_andamento',
    },
  ]

  // ---- Partos, mortes, bezerros ----
  const partos: Parto[] = []
  const partosAnteriores: Parto[] = []
  const desmames: Desmame[] = []
  const janela = P.cria.nascimentoFimDias - P.cria.nascimentoIniDias

  const sexos: ('M' | 'F')[] = []
  for (let i = 0; i < P.cria.partos; i++) sexos.push(i < P.cria.machosNascidos ? 'M' : 'F')
  for (let i = sexos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[sexos[i], sexos[j]] = [sexos[j], sexos[i]]
  }

  let mortosM = 0
  let mortosF = 0
  const MORTES_M = P.cria.mortesMachos
  const MORTES_F = P.cria.mortesPreDesmame - MORTES_M

  interface BezerroTmp {
    parto: Parto
    morto: boolean
    dataMorte?: string
  }
  const bezerros: BezerroTmp[] = []
  // o sorteio de "tem parto anterior?" acontece só na 1ª ocorrência da matriz,
  // para o IP casar exatamente com o primeiro parto atual dela
  const matrizesVistas = new Set<string>()

  let seqM = 0
  let seqF = 0
  for (let i = 0; i < P.cria.partos; i++) {
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
      estacaoId: 'EM-PASS',
    }
    partos.push(parto)

    // parto da safra anterior (base do IP por matriz) — 1 por matriz, no primeiro parto dela
    if (!matrizesVistas.has(matriz)) {
      matrizesVistas.add(matriz)
      if (rng() < P.cria.matrizesComPartoAnterior) {
        const ip = Math.round(P.cria.ipMinDias + rng() * (P.cria.ipMaxDias - P.cria.ipMinDias))
        partosAnteriores.push({
          id: `PTA-${String(partosAnteriores.length + 1).padStart(3, '0')}`,
          data: addDays(parto.data, -ip),
          matrizBrinco: matriz,
          bezerroBrinco: '—',
          sexo: rng() < 0.5 ? 'M' : 'F',
          pesoNascer: round1(P.cria.pesoNascerMedio - 3 + rng() * 6),
          dificuldade: 1,
          estacaoId: 'EM-ANT',
        })
      }
    }

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

  // ---- Desmame → entrada nos lotes de recria ----
  const vivosM = bezerros.filter((b) => !b.morto && b.parto.sexo === 'M')
  const vivosF = bezerros.filter((b) => !b.morto && b.parto.sexo === 'F')
  const desmamadosSet = new Set<string>()
  let desmSeq = 0

  for (const round of P.desmameRounds) {
    const vivos = round.sexo === 'M' ? vivosM : vivosF
    const candidatos = vivos.filter((b) => !desmamadosSet.has(b.parto.bezerroBrinco)).slice(0, round.qtd)
    const loteNome = lotes.find((l) => l.id === round.loteId)?.nome ?? round.loteId
    for (const b of candidatos) {
      const dataDesm = addDays(today, round.dia)
      const idade = diffDays(b.parto.data, dataDesm)
      const peso = round1(round.pesoMedio - 12 + rng() * 24)
      desmames.push({
        id: `DS-${String(++desmSeq).padStart(3, '0')}`,
        data: dataDesm,
        bezerroBrinco: b.parto.bezerroBrinco,
        peso,
        idadeDias: idade,
        loteDestinoId: round.loteId,
      })
      desmamadosSet.add(b.parto.bezerroBrinco)
      mov({
        data: dataDesm,
        tipo: 'desmame',
        brinco: b.parto.bezerroBrinco,
        categoria: b.parto.sexo === 'M' ? 'bezerro' : 'bezerra',
        quantidade: 1,
        origem: 'Rebanho de cria',
        destino: loteNome,
      })
    }
  }

  // ---- Animais bezerros (vivos) ----
  let bzSeq = 0
  for (const b of bezerros) {
    if (b.morto) continue
    bzSeq++
    const desm = desmamadosSet.has(b.parto.bezerroBrinco)
    const idadeDias = diffDays(b.parto.data, today)
    const sexo = b.parto.sexo
    let peso: number
    let loteId: string
    const pesagens = [{ data: b.parto.data, peso: b.parto.pesoNascer }]
    if (desm) {
      const desmame = desmames.find((d) => d.bezerroBrinco === b.parto.bezerroBrinco)!
      const lote = P.recria.find((r) => r.id === desmame.loteDestinoId)!
      loteId = lote.id
      const diasNoLote = diffDays(desmame.data, today)
      peso = round1(desmame.peso + lote.gmd * diasNoLote)
      pesagens.push({ data: desmame.data, peso: desmame.peso })
    } else {
      loteId = P.lotesCriaIds[bzSeq % P.lotesCriaIds.length]
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
      paiNome: `${NOMES_TOUROS[Math.floor(rng() * 6)]} ${P.fazenda.nome.split(' ').pop()}`,
      pesoAtual: peso,
      pesagens,
      sanitario: [
        { data: addDays(today, -35), tipo: 'Vacinação', produto: sexo === 'F' ? 'Clostridiose + Brucelose B19' : 'Vacina clostridiose' },
      ],
      status: 'ativo',
    })
  }

  // ---- Lotes de recria + animais próprios (garrotes / novilhas 13-24m) ----
  const lotesRecria: LoteRecria[] = []
  for (const lr of P.recria) {
    const dataEntrada = addDays(today, lr.entradaDias)
    const dias = -lr.entradaDias
    const pesagens: { data: string; peso: number }[] = []
    for (let d = 0; d <= dias; d += 28) {
      pesagens.push({ data: addDays(dataEntrada, d), peso: round1(lr.pesoEntrada + lr.gmd * d) })
    }
    if (dias % 28 !== 0) {
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

    if (lr.origem === 'propria' && lr.categoria && lr.prefixo) {
      for (let i = 0; i < lr.qtd; i++) {
        const off = i % 2 === 0 ? (i % 20) * 0.9 : -((i - 1) % 20) * 0.9
        const gmdInd = lr.gmd + (i % 2 === 0 ? 1 : -1) * ((i % 7) * 0.008)
        const pesoEntradaInd = round1(lr.pesoEntrada + off)
        const pesoAtualInd = round1(pesoEntradaInd + gmdInd * dias)
        const pesagensInd: { data: string; peso: number }[] = []
        for (let d = 0; d <= dias; d += 28) {
          pesagensInd.push({ data: addDays(dataEntrada, d), peso: round1(pesoEntradaInd + gmdInd * d) })
        }
        animais.push({
          id: `A-${lr.prefixo}${i + 1}`,
          brinco: `${lr.prefixo}-${String(i + 1).padStart(3, '0')}`,
          sexo: lr.sexo,
          categoria: lr.categoria,
          raca: rng() < 0.25 ? 'Nelore PO' : 'Nelore',
          nascimento: addDays(dataEntrada, -Math.round(210 + rng() * 90)),
          loteId: lr.id,
          pesoAtual: pesoAtualInd,
          pesagens: pesagensInd,
          sanitario: [
            { data: addDays(today, -70), tipo: 'Vacinação', produto: 'Vacina aftosa' },
            { data: addDays(today, -70), tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
          ],
          status: 'ativo',
        })
      }
    }
  }

  // ---- Confinamento (bois de terminação, comprados) ----
  if (P.confinamento && P.inventario.boi_terminacao > 0) {
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
        loteId: conf.loteId,
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
    if (P.compraBois) {
      mov({
        data: dataEntradaConf,
        tipo: 'compra',
        brinco: `BT-001…BT-${String(conf.qtd).padStart(3, '0')}`,
        categoria: 'boi_terminacao',
        quantidade: conf.qtd,
        destino: lotes.find((l) => l.id === conf.loteId)?.nome ?? conf.loteId,
        obs: P.compraBois.obs,
      })
    }
  }

  if (P.vendaDescarte) {
    mov({
      data: addDays(today, P.vendaDescarte.dia),
      tipo: 'venda',
      brinco: 'Lote descarte',
      categoria: 'vaca',
      quantidade: P.vendaDescarte.qtd,
      origem: 'Matrizes (pastos)',
      obs: P.vendaDescarte.obs,
    })
  }
  if (P.mudancaCategoria) {
    mov({
      data: addDays(today, P.reproducao.estacaoInicioDias),
      tipo: 'mudanca_categoria',
      brinco: 'Lote novilhas',
      categoria: 'vaca',
      quantidade: P.mudancaCategoria.qtd,
      origem: 'Novilha >24m',
      destino: 'Vaca (entrada em reprodução)',
      obs: 'Novilhas incorporadas ao rebanho de matrizes',
    })
  }

  movimentacoes.sort((a, b) => a.data.localeCompare(b.data))

  // ---- Reprodução: protocolos IATF + diagnósticos ----
  const R = P.reproducao
  const protocolosIATF: ProtocoloIATF[] = R.protocolos.map((pr) => ({
    id: pr.id,
    nome: pr.nome,
    loteDescricao: pr.loteDescricao,
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
  const matrizBrinco = (i: number) =>
    i < P.inventario.vaca
      ? `V-${String(i + 1).padStart(4, '0')}`
      : `N-${String(i - P.inventario.vaca + 1).padStart(4, '0')}`

  const dg30 = addDays(today, R.dg30Dias)
  const dgFinal = addDays(today, R.dgFinalDias)
  for (let i = 0; i < R.matrizesExpostas; i++) {
    const brinco = matrizBrinco(i)
    if (i < R.prenhasIATF) {
      const proto = protocolosIATF[i % protocolosIATF.length]
      dgPush({
        data: dg30,
        matrizBrinco: brinco,
        resultado: 'prenha',
        origemPrenhez: 'IATF',
        dataConcepcao: proto.dataIA,
        dppEstimado: addDays(proto.dataIA, GESTACAO_DIAS),
        estacaoId: 'EM-ATUAL',
      })
    } else if (i < R.prenhasIATF + R.prenhasRepasse) {
      const diasPosIA = 15 + Math.round(rng() * 45)
      const concepcao = addDays(today, R.protocolos[0].d0Dias + 10 + diasPosIA)
      dgPush({
        data: dgFinal,
        matrizBrinco: brinco,
        resultado: 'prenha',
        origemPrenhez: 'touro',
        dataConcepcao: concepcao,
        dppEstimado: addDays(concepcao, GESTACAO_DIAS),
        estacaoId: 'EM-ATUAL',
      })
    } else if (i < R.matrizesExpostas - R.dgPendentes) {
      dgPush({ data: dgFinal, matrizBrinco: brinco, resultado: 'vazia', estacaoId: 'EM-ATUAL' })
    } else {
      dgPush({ data: dgFinal, matrizBrinco: brinco, resultado: 'pendente', estacaoId: 'EM-ATUAL' })
    }
  }

  const tourosRepasse: TouroRepasse[] = R.tourosRepasse.map((t) => ({ ...t }))

  // ---- Compras ----
  const pedidos: Pedido[] = P.pedidos.map((p, i) => ({
    id: `PED-${i + 1}`,
    numero: p.numero,
    fornecedor: p.fornecedor,
    data: addDays(today, p.dataDias),
    dataRecebimento: p.recebidoDias !== undefined ? addDays(today, p.recebidoDias) : undefined,
    status: p.status,
    itens: p.itens.map((it) => ({ ...it })),
    rateio: { ...p.rateio },
  }))

  // ---- Estoque: entradas (pedidos recebidos) + saídas ----
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
      obs: s.obs,
    })
  }
  movEstoque.sort((a, b) => a.data.localeCompare(b.data))

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
      validade: def.validadeDias !== undefined ? addDays(today, def.validadeDias) : undefined,
      custoMedio: totalEntrada > 0 ? Math.round((valorEntrada / totalEntrada) * 100) / 100 : 0,
      botijao: def.botijao,
      caneca: def.caneca,
    }
  })

  // ---- Histórico de preços ----
  const precosHistoricos: PrecoHistorico[] = []
  for (const [itemId, base] of Object.entries(P.historicoPrecosBase)) {
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

  // ---- Máquinas + Ordens de serviço ----
  const maquinas: Maquina[] = P.maquinas.map((m) => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    ano: m.ano,
    horimetro: m.horimetro,
    proximaRevisaoHorimetro: m.proximaRevisaoHorimetro,
    proximaRevisaoData: m.proximaRevisaoDataDias !== undefined ? addDays(today, m.proximaRevisaoDataDias) : undefined,
    manutencoes: m.manutencoes.map((mt, i) => ({
      id: `${m.id}-MT${i + 1}`,
      data: addDays(today, -mt.diasAtras),
      tipo: mt.tipo,
      descricao: mt.descricao,
      custo: mt.custo,
      horimetro: mt.horimetro,
    })),
  }))

  const ordensServico: OrdemServico[] = P.ordensServico.map((o, i) => ({
    id: `OS-${i + 1}`,
    numero: o.numero,
    titulo: o.titulo,
    tipo: o.tipo,
    vinculo: o.vinculo,
    responsavel: o.responsavel,
    abertura: addDays(today, o.aberturaDias),
    prazo: o.prazoDias !== undefined ? addDays(today, o.prazoDias) : undefined,
    status: o.status,
    conclusao: o.conclusaoDias !== undefined ? addDays(today, o.conclusaoDias) : undefined,
    notas: o.notas.map((n) => ({ data: addDays(today, n.dias), texto: n.texto })),
  }))

  // ---- Leite: produção diária dos últimos 30 dias ----
  const producaoLeite: ProducaoLeite[] = []
  if (P.leite) {
    for (let d = 29; d >= 0; d--) {
      const fator = 0.92 + rng() * 0.16
      producaoLeite.push({
        data: addDays(today, -d),
        litros: Math.round(P.leite.vacasLactacao * P.leite.mediaLitrosVacaDia * fator),
      })
    }
  }

  // ---- Financeiro: lançamentos ----
  const lancamentos: Lancamento[] = []
  let lcSeq = 0
  const lcPush = (l: Omit<Lancamento, 'id'>) => {
    lancamentos.push({ id: `LC-${String(++lcSeq).padStart(3, '0')}`, ...l })
  }
  // despesas: pedidos recebidos (1 lançamento por pedido, pago no recebimento)
  for (const ped of pedidos) {
    if (ped.status !== 'recebido' || !ped.dataRecebimento) continue
    const total = ped.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
    lcPush({
      tipo: 'despesa',
      categoria: 'Insumos',
      descricao: `Pedido ${ped.numero} — ${ped.fornecedor}`,
      valor: total,
      vencimento: ped.dataRecebimento,
      pagamento: ped.dataRecebimento,
      origem: 'pedido',
      refId: ped.id,
    })
  }
  // despesas: manutenções de máquinas
  for (const maq of maquinas) {
    for (const mt of maq.manutencoes) {
      lcPush({
        tipo: 'despesa',
        categoria: 'Manutenção',
        descricao: `${mt.descricao} — ${maq.nome}`,
        valor: mt.custo,
        vencimento: mt.data,
        pagamento: mt.data,
        origem: 'manutencao',
        refId: mt.id,
      })
    }
  }
  // despesas fixas: últimos 6 meses pagos (a mais recente cai no mês corrente) + próxima em aberto
  for (const df of P.despesasFixas) {
    for (let m = 6; m >= 1; m--) {
      const dataPg = addDays(today, -m * 30 + 21)
      lcPush({
        tipo: 'despesa',
        categoria: df.categoria,
        descricao: `${df.descricao} — mensal`,
        valor: df.valorMes,
        vencimento: dataPg,
        pagamento: dataPg,
        origem: 'fixa',
      })
    }
    lcPush({
      tipo: 'despesa',
      categoria: df.categoria,
      descricao: `${df.descricao} — mês atual`,
      valor: df.valorMes,
      vencimento: addDays(today, 5),
      origem: 'fixa',
    })
  }
  // receita: venda de descarte
  if (P.vendaDescarte) {
    lcPush({
      tipo: 'receita',
      categoria: 'Venda de animais',
      descricao: `${P.vendaDescarte.qtd} vacas de descarte`,
      valor: P.vendaDescarte.qtd * P.vendaDescarte.valorCabeca,
      vencimento: addDays(today, P.vendaDescarte.dia),
      pagamento: addDays(today, P.vendaDescarte.dia),
      origem: 'venda_animal',
    })
  }
  // receitas de leite: 3 meses fechados pagos + mês atual (parcial) a receber
  if (P.leite) {
    const receitaMesCheio = Math.round(P.leite.vacasLactacao * P.leite.mediaLitrosVacaDia * 30 * P.leite.precoLitro)
    for (let m = 3; m >= 1; m--) {
      lcPush({
        tipo: 'receita',
        categoria: 'Leite',
        descricao: `Leite — fechamento do mês (-${m})`,
        valor: receitaMesCheio,
        vencimento: addDays(today, -m * 30 + 10),
        pagamento: addDays(today, -m * 30 + 10),
        origem: 'leite',
      })
    }
    const mesAtual = today.slice(0, 7)
    const litrosMesAtual = producaoLeite
      .filter((pr) => pr.data.slice(0, 7) === mesAtual)
      .reduce((s, pr) => s + pr.litros, 0)
    lcPush({
      tipo: 'receita',
      categoria: 'Leite',
      descricao: 'Leite — mês atual (parcial, a receber)',
      valor: Math.round(litrosMesAtual * P.leite.precoLitro * 100) / 100,
      vencimento: addDays(today, 12),
      origem: 'leite',
    })
  }

  return {
    perfil,
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
    partosAnteriores,
    desmames,
    lotesRecria,
    protocolosIATF,
    diagnosticos,
    tourosRepasse,
    estoque,
    movEstoque,
    pedidos,
    precosHistoricos,
    lancamentos,
    maquinas,
    ordensServico,
    producaoLeite,
    leite: P.leite ? { ...P.leite } : undefined,
  }
}
