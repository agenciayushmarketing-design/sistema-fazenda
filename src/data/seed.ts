// =====================================================================
// SEED DETERMINÍSTICO MULTI-PERFIL — dados 100% fictícios
//
// Todo o dataset da demo nasce deste arquivo, gerado por funções puras
// a partir dos parâmetros de cada PERFIL de demonstração:
//   - ciclo_completo : Fazenda Santa Helena, 800 ha, 1.200 cab
//   - cria_120       : Sítio Boa Esperança, cria pura, 120 matrizes
//   - corte_leite    : Fazenda Dois Córregos, corte + leite + máquinas
//   - confinamento   : Confinamento Boa Vista, 12 baias, ~1.000 cab no cocho
// Nenhum número de negócio deve viver solto nos componentes.
// Datas relativas ao dia da geração — a demo nunca envelhece.
// =====================================================================

import type {
  Abate,
  Animal,
  Baia,
  Categoria,
  CentroCusto,
  Conferencia,
  ConfigFazenda,
  Desmame,
  DiagnosticoGestacao,
  Dieta,
  Enfermaria,
  EstacaoMonta,
  FaseConfinamento,
  FornecimentoSal,
  ItemEstoque,
  Lancamento,
  LeituraCocho,
  Lote,
  LoteConfinamento,
  LoteRecria,
  ManejoSanitario,
  Maquina,
  MembroEquipe,
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
  RondaSanitaria,
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

/** Meta de consumo de sal mineral (g/cabeça/dia) por finalidade do lote */
export const META_SAL_G_CAB_DIA: Record<Lote['finalidade'], number> = {
  cria: 90,
  reproducao: 80,
  leite: 100,
  recria: 60,
  terminacao: 0, // confinamento recebe o mineral na ração
}

/** Tolerância de desvio do consumo de sal antes de virar alerta */
export const TOLERANCIA_SAL = 0.2

/** Animal da recria ganhando abaixo disso (fração da média do lote) vira alerta */
export const LIMITE_GMD_INDIVIDUAL = 0.8

/** Referências de mercado usadas como padrão na calculadora de compra (editáveis na tela) */
export const MERCADO = {
  precoArrobaBoi: 310, // R$/@
  agioBezerroPct: 20, // bezerro costuma sair com ágio sobre a @ do boi
  custoDiarioCab: 3.2, // R$/cab/dia em recria a pasto (pasto, sal, sanitário, mão de obra)
  mortalidadePct: 1.5,
}

/** Confinamento: referências de mercado e de manejo (editáveis nas telas) */
export const CONFINAMENTO = {
  /** 1 @ de carcaça = 15 kg */
  kgArrobaCarcaca: 15,
  /** acima disso (fração do rebanho confinado) a enfermaria vira alerta */
  enfermariaMaxPct: 1,
  /** insumo com menos dias de estoque que isso vira alerta */
  diasEstoqueMinimo: 7,
  /** queda do consumo dos últimos 3 dias contra a média dos 7 anteriores que vira alerta */
  quedaConsumoPct: 8,
  /** GMD da fase multiplica o GMD médio do lote (adaptação come menos) */
  fatorGmdFase: { adaptacao: 0.7, crescimento: 1.08, terminacao: 1.1 } as const,
  /** custo fixo padrão por cabeça/dia (mão de obra, energia, depreciação) */
  custoFixoCabDia: 1.5,
}

/** Escala de leitura de cocho: nota da sobra → ajuste do trato de hoje */
export const NOTAS_COCHO = [
  { nota: 0, rotulo: 'Lambido', descricao: 'Cocho vazio e lambido — faltou comida', ajuste: 0.1 },
  { nota: 1, rotulo: 'Limpo', descricao: 'Poucos restos espalhados', ajuste: 0.05 },
  { nota: 2, rotulo: 'Ideal', descricao: 'Fina camada de sobra (~5%)', ajuste: 0 },
  { nota: 3, rotulo: 'Sobra', descricao: 'Sobra moderada (10–25%)', ajuste: -0.05 },
  { nota: 4, rotulo: 'Muita sobra', descricao: 'Mais de 25% do trato no cocho', ajuste: -0.1 },
] as const

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

interface LoteConfParams {
  id: string
  nome: string
  prefixo: string
  baiaId: string
  qtd: number
  entradaDias: number
  pesoEntrada: number
  gmd: number
  gmdMeta: number
  origem: LoteConfinamento['origem']
  fornecedor?: string
  agioPct: number
  /** custo por cabeça acumulado na recria (lotes próprios) */
  custoRecriaCab?: number
  pesoAbateAlvo: number
  rendimentoEstimado: number
  diasCochoPlano: number
  /** consumo real ÷ previsto (1 = na meta) */
  fatorConsumo?: number
  /** queda de consumo nos últimos dias — alerta da demo */
  quedaRecente?: { dias: number; fator: number }
  /** sobra de ontem (fração do trato) — nota 4 na demo */
  sobraOntemPct?: number
}

interface ConfinamentoParams {
  pastoId: string
  /** R$/@ do boi magro — base do custo de compra dos lotes */
  precoArrobaMagro: number
  baias: Baia[]
  dietas: Dieta[]
  lotes: LoteConfParams[]
  /** compras dos ingredientes: quantidade = consumo gerado × fator (sobra em estoque) */
  ingredientes: { itemId: string; fornecedor: string; fator: number; valorUnitario: number }[]
  abatesAnteriores: {
    loteNome: string
    baiaId: string
    dataDias: number
    diasCocho: number
    qtd: number
    pesoEntrada: number
    pesoVivoMedio: number
    rendimentoReal: number
    rendimentoEstimado: number
    precoArroba: number
    frigorifico: string
    custoCabEntrada: number
    custoAlimentacaoCab: number
    conversaoAlimentar: number
  }[]
  enfermaria: {
    loteId: string
    idx: number
    entradaDias: number
    diagnostico: string
    tratamento: string
    itemEstoqueId?: string
    custo: number
    diasTratamento: number
    carenciaDias: number
    saidaDias?: number
    destino?: Enfermaria['destino']
  }[]
}

interface PerfilParams {
  nomePerfil: string
  /** módulo Confinamento completo (baias, dietas, cocho por baia, abate, enfermaria) */
  confinamentoCompleto?: ConfinamentoParams
  fazenda: { nome: string; areaHa: number }
  config: ConfigFazenda
  equipe: MembroEquipe[]
  usuarioAtualId: string
  /** lançamentos do campo aguardando (ou já com) o visto do escritório */
  conferencias: {
    dias: number
    hora: string
    tipo: string
    resumo: string
    responsavelId: string
    status: Conferencia['status']
    conferidoPorId?: string
  }[]
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
  /** salga em campo: gera os fornecimentos de sal (e as saídas de estoque) */
  salga: {
    inicioDias: number
    itemId: string
    diasPorFornecimento: number
    /** consumo real ÷ meta por lote (padrão ~1,0) — os desvios viram os alertas da demo */
    fatores: Record<string, number>
  }
  /** leitura de cocho do confinamento (gera as leituras e as saídas de ração) */
  cocho?: { loteId: string; itemId: string; kgCabInicial: number; kgCabAlvo: number }
  manejos: {
    dia: number
    tipo: ManejoSanitario['tipo']
    produto: string
    itemEstoqueId?: string
    alvo: string
    qtdAnimais: number
    responsavel: string
    obs?: string
  }[]
  rondas: {
    dia: number
    responsavel: string
    pastoId: string
    obs?: string
    ocorrencias: { brinco?: string; tipo: RondaSanitaria['ocorrencias'][number]['tipo']; descricao: string; resolvida: boolean }[]
  }[]
}

// ---------------------------------------------------------------------
// PERFIL 1 — Ciclo completo (a demo original)
// ---------------------------------------------------------------------

const PERFIL_CICLO: PerfilParams = {
  nomePerfil: 'Ciclo completo',
  fazenda: { nome: 'Fazenda Santa Helena', areaHa: 800 },
  config: { toleranciaIPMeses: 18, diasVaziaDescarte: 45 },
  equipe: [
    { id: 'EQ-1', nome: 'Mateus (proprietário)', papel: 'gerente' },
    { id: 'EQ-2', nome: 'Dona Cida', papel: 'escritorio' },
    { id: 'EQ-3', nome: 'Carlos Mendes', papel: 'campo' },
    { id: 'EQ-4', nome: 'Zé Carlos', papel: 'campo' },
    { id: 'EQ-5', nome: 'João Pedro', papel: 'campo' },
  ],
  usuarioAtualId: 'EQ-1',
  conferencias: [
    { dias: 0, hora: '07:40', tipo: 'Pesagem de lote', resumo: 'Recria Machos 25/26 — 248,5 kg médio', responsavelId: 'EQ-5', status: 'pendente' },
    { dias: 0, hora: '06:55', tipo: 'Ronda sanitária', resumo: 'GR-023 apartado em observação (Retiro Santa Rita)', responsavelId: 'EQ-4', status: 'pendente' },
    { dias: -2, hora: '16:10', tipo: 'Saída de estoque', resumo: 'Sal mineral 80 P — 3.800 kg nos cochos', responsavelId: 'EQ-4', status: 'pendente' },
    { dias: -3, hora: '08:20', tipo: 'Manejo em lote', resumo: 'Clostridiose nos bezerros da safra — 330 doses', responsavelId: 'EQ-3', status: 'aprovado', conferidoPorId: 'EQ-2' },
    { dias: -5, hora: '17:05', tipo: 'Pesagem de lote', resumo: 'Garrotes 24/25 — 336,2 kg médio', responsavelId: 'EQ-5', status: 'aprovado', conferidoPorId: 'EQ-2' },
  ],
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
    ipMaxDias: 570, // até ~18,7 meses — as piores estouram a tolerância de 18
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
    { itemId: 'SUP-REC', dia: -25, quantidade: 18000, loteDestino: 'Lotes de recria', obs: 'Suplementação' },
    { itemId: 'SUP-REC', dia: -1, quantidade: 12000, loteDestino: 'Lotes de recria', obs: 'Suplementação' },
    { itemId: 'MED-IVE', dia: -70, quantidade: 35, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
    { itemId: 'MED-OXI', dia: -20, quantidade: 12, loteDestino: 'Confinamento Sede' },
    { itemId: 'MED-FLO', dia: -15, quantidade: 6, loteDestino: 'Recria Machos 25/26' },
  ],
  historicoPrecosBase: { 'SAL-MIN': 1.85, 'RAC-CONF': 1.42, 'SUP-REC': 2.15, 'SEM-ARM': 58, 'VAC-AFT': 1.65, 'MED-IVE': 39 },
  salga: {
    inicioDias: -63,
    itemId: 'SAL-MIN',
    diasPorFornecimento: 7,
    fatores: { 'L-SR': 1.38, R2: 0.68 }, // excesso em Santa Rita, subconsumo nas fêmeas de recria
  },
  cocho: { loteId: 'CONF', itemId: 'RAC-CONF', kgCabInicial: 9, kgCabAlvo: 12 },
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
  manejos: [
    { dia: -70, tipo: 'vacinacao', produto: 'Vacina aftosa', itemEstoqueId: 'VAC-AFT', alvo: 'Rebanho geral', qtdAnimais: 1200, responsavel: 'Equipe de campo', obs: 'Campanha oficial — 1.200 doses' },
    { dia: -70, tipo: 'vermifugacao', produto: 'Ivermectina 1%', itemEstoqueId: 'MED-IVE', alvo: 'Rebanho geral', qtdAnimais: 1200, responsavel: 'Equipe de campo', obs: '35 frascos consumidos' },
    { dia: -40, tipo: 'vacinacao', produto: 'Vacina clostridiose', itemEstoqueId: 'VAC-CLO', alvo: 'Bezerros(as) da safra', qtdAnimais: 330, responsavel: 'Carlos Mendes' },
    { dia: -40, tipo: 'vacinacao', produto: 'Vacina brucelose B19', itemEstoqueId: 'VAC-BRU', alvo: 'Bezerras 3–8 meses', qtdAnimais: 80, responsavel: 'Carlos Mendes' },
  ],
  rondas: [
    {
      dia: -2, responsavel: 'Zé Carlos', pastoId: 'P1',
      ocorrencias: [
        { brinco: 'GR-023', tipo: 'doente', descricao: 'Apatia e febre — suspeita de pneumonia, apartado para tratamento', resolvida: false },
        { tipo: 'observacao', descricao: 'Cocho de sal vazio no fundo do pasto', resolvida: false },
      ],
    },
    {
      dia: -6, responsavel: 'João Pedro', pastoId: 'P2',
      ocorrencias: [
        { brinco: 'BZ-014', tipo: 'tratamento', descricao: 'Bicheira no umbigo — aplicado matabicheira', resolvida: true },
      ],
    },
    { dia: -12, responsavel: 'Zé Carlos', pastoId: 'P3', obs: 'Sem ocorrências — pasto e aguadas em ordem', ocorrencias: [] },
  ],
}

// ---------------------------------------------------------------------
// PERFIL 2 — Cria pura, pequena propriedade (150 matrizes)
// ---------------------------------------------------------------------

const PERFIL_CRIA: PerfilParams = {
  nomePerfil: 'Cria — 150 matrizes',
  fazenda: { nome: 'Sítio Boa Esperança', areaHa: 180 },
  config: { toleranciaIPMeses: 18, diasVaziaDescarte: 45 },
  equipe: [
    { id: 'EQ-1', nome: 'Seu Osvaldo (proprietário)', papel: 'gerente' },
    { id: 'EQ-2', nome: 'Dona Marta', papel: 'escritorio' },
    { id: 'EQ-3', nome: 'João Batista', papel: 'campo' },
  ],
  usuarioAtualId: 'EQ-1',
  conferencias: [
    { dias: 0, hora: '07:15', tipo: 'Ronda sanitária', resumo: 'BZ-021 com diarreia, separado com a mãe', responsavelId: 'EQ-3', status: 'pendente' },
    { dias: -2, hora: '16:30', tipo: 'Saída de estoque', resumo: 'Sal mineral 65 P — 1.100 kg nos cochos', responsavelId: 'EQ-3', status: 'pendente' },
    { dias: -4, hora: '08:00', tipo: 'Diagnóstico de gestação', resumo: 'DG30 da IATF — 70 prenhas de 135', responsavelId: 'EQ-3', status: 'aprovado', conferidoPorId: 'EQ-2' },
  ],
  seedRandom: 20260901,
  inventario: { vaca: 150, vacaLeite: 0, touro: 4, novilha_24: 14, boi_terminacao: 0 },
  novilhasJovens: { qtd: 18, loteId: 'L-NOV', prefixo: 'NJ' },
  pastos: [
    { id: 'P1', nome: 'Pasto Sede', areaHa: 70, capacidadeUA: 100, tipo: 'pasto' },
    { id: 'P2', nome: 'Pasto do Rio', areaHa: 65, capacidadeUA: 95, tipo: 'pasto' },
    { id: 'P3', nome: 'Pasto Novo', areaHa: 45, capacidadeUA: 60, tipo: 'pasto' },
  ],
  lotes: [
    { id: 'L-M1', nome: 'Matrizes Sede', pastoId: 'P1', finalidade: 'cria' },
    { id: 'L-M2', nome: 'Matrizes do Rio', pastoId: 'P2', finalidade: 'cria' },
    { id: 'L-NOV', nome: 'Novilhas', pastoId: 'P3', finalidade: 'reproducao' },
  ],
  lotesCriaIds: ['L-M1', 'L-M2'],
  loteNovilhasId: 'L-NOV',
  cria: {
    matrizesExpostasSafraPassada: 150,
    partos: 118,
    mortesPreDesmame: 5,
    mortesMachos: 2,
    machosNascidos: 60,
    nascimentoIniDias: -210, // safra mais recente: bezerros de 1 a 7 meses, todos ao pé
    nascimentoFimDias: -30,
    pesoNascerMedio: 31,
    matrizesComPartoAnterior: 0.82,
    ipMinDias: 350,
    ipMaxDias: 580, // até ~19 meses — as piores estouram a tolerância de 18
  },
  desmameRounds: [], // apartação prevista aos 8 meses — nenhum bezerro apartado ainda
  recria: [],
  reproducao: {
    estacaoInicioDias: -60,
    estacaoFimDias: 60,
    matrizesExpostas: 135,
    protocolos: [
      { id: 'IATF-1', nome: 'IATF Lote Sede', loteDescricao: 'Vacas paridas — Sede', matrizes: 68, d0Dias: -52, produto: 'Sincrogest + eCG', inseminador: 'João Batista', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
      { id: 'IATF-2', nome: 'IATF Lote Rio', loteDescricao: 'Vacas paridas — Rio', matrizes: 67, d0Dias: -48, produto: 'Sincrogest + eCG', inseminador: 'João Batista', touroSemen: 'REM Armador', semenItemId: 'SEM-ARM' },
    ],
    prenhasIATF: 70,
    dg30Dias: -18,
    prenhasRepasse: 0, // repasse com touro em andamento — DG do repasse ainda não feito
    dgFinalDias: -2,
    dgPendentes: 35,
    tourosRepasse: [
      { brinco: 'T-01', nome: 'Cacique BE', vacasRepasse: 33, prenhezesRepasse: 0 },
      { brinco: 'T-02', nome: 'Vendaval BE', vacasRepasse: 32, prenhezesRepasse: 0 },
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
      itens: [{ itemEstoqueId: 'SEM-ARM', descricao: 'Sêmen REM Armador (dose)', quantidade: 170, valorUnitario: 68 }],
    },
    {
      numero: 'PC-2026-012', fornecedor: 'AgroFarma Distribuidora', dataDias: -70, recebidoDias: -62, status: 'recebido',
      rateio: { Cria: 100, Recria: 0, Terminacao: 0, Geral: 0 },
      itens: [
        { itemEstoqueId: 'HOR-P4', descricao: 'Implante intravaginal P4', quantidade: 150, valorUnitario: 19 },
        { itemEstoqueId: 'HOR-ECG', descricao: 'eCG 400 UI (dose)', quantidade: 150, valorUnitario: 15 },
        { itemEstoqueId: 'HOR-PGF', descricao: 'Prostaglandina (dose)', quantidade: 150, valorUnitario: 6.5 },
      ],
    },
    {
      numero: 'PC-2026-015', fornecedor: 'AgroFarma Distribuidora', dataDias: -55, recebidoDias: -48, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 0, Geral: 100 },
      itens: [
        { itemEstoqueId: 'VAC-AFT', descricao: 'Vacina aftosa (dose)', quantidade: 320, valorUnitario: 1.85 },
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
    { itemId: 'HOR-P4', dia: -52, quantidade: 135, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-ECG', dia: -44, quantidade: 135, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'HOR-PGF', dia: -44, quantidade: 135, loteDestino: 'Matrizes IATF', obs: 'Protocolo IATF' },
    { itemId: 'VAC-AFT', dia: -30, quantidade: 300, loteDestino: 'Rebanho geral', obs: 'Campanha aftosa' },
    { itemId: 'VAC-CLO', dia: -25, quantidade: 115, loteDestino: 'Bezerros(as) da safra' },
    { itemId: 'MED-IVE', dia: -30, quantidade: 7, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
  ],
  historicoPrecosBase: { 'SAL-MIN': 2.05, 'SEM-ARM': 60, 'VAC-AFT': 1.7 },
  salga: {
    inicioDias: -33, // o sal chegou no pedido de -35
    itemId: 'SAL-MIN',
    diasPorFornecimento: 7,
    fatores: { 'L-M2': 1.32 }, // Pasto do Rio: consumo acima da meta (sal exposto à chuva?)
  },
  despesasFixas: [
    { descricao: 'Folha de pagamento', categoria: 'Pessoal', valorMes: 5800 },
    { descricao: 'Energia elétrica', categoria: 'Energia', valorMes: 650 },
    { descricao: 'Combustível', categoria: 'Combustível', valorMes: 1100 },
  ],
  maquinas: [],
  ordensServico: [],
  manejos: [
    { dia: -30, tipo: 'vacinacao', produto: 'Vacina aftosa', itemEstoqueId: 'VAC-AFT', alvo: 'Rebanho geral', qtdAnimais: 299, responsavel: 'João Batista', obs: 'Campanha oficial' },
    { dia: -30, tipo: 'vermifugacao', produto: 'Ivermectina 1%', itemEstoqueId: 'MED-IVE', alvo: 'Rebanho geral', qtdAnimais: 299, responsavel: 'João Batista' },
    { dia: -25, tipo: 'vacinacao', produto: 'Vacina clostridiose', itemEstoqueId: 'VAC-CLO', alvo: 'Bezerros(as) da safra', qtdAnimais: 113, responsavel: 'João Batista' },
  ],
  rondas: [
    {
      dia: -1, responsavel: 'João Batista', pastoId: 'P1',
      ocorrencias: [
        { brinco: 'BZ-021', tipo: 'doente', descricao: 'Bezerro com diarreia — separado com a mãe no piquete da sede', resolvida: false },
      ],
    },
    {
      dia: -5, responsavel: 'João Batista', pastoId: 'P2',
      ocorrencias: [
        { brinco: 'V-0088', tipo: 'tratamento', descricao: 'Casco rachado — aplicado curativo e antibiótico', resolvida: true },
        { tipo: 'observacao', descricao: 'Cerca do fundo precisando de reforço em dois palanques', resolvida: false },
      ],
    },
    { dia: -9, responsavel: 'Dona Marta', pastoId: 'P3', obs: 'Sem ocorrências', ocorrencias: [] },
  ],
}

// ---------------------------------------------------------------------
// PERFIL 3 — Corte & Leite (o pedido do lead "sistema completo")
// ---------------------------------------------------------------------

const PERFIL_CORTE_LEITE: PerfilParams = {
  nomePerfil: 'Corte & Leite',
  fazenda: { nome: 'Fazenda Dois Córregos', areaHa: 420 },
  config: { toleranciaIPMeses: 18, diasVaziaDescarte: 45 },
  equipe: [
    { id: 'EQ-1', nome: 'Vilmar (proprietário)', papel: 'gerente' },
    { id: 'EQ-2', nome: 'Ana Paula', papel: 'escritorio' },
    { id: 'EQ-3', nome: 'Roberto Lima', papel: 'campo' },
    { id: 'EQ-4', nome: 'Zé Carlos', papel: 'campo' },
    { id: 'EQ-5', nome: 'Equipe do leite', papel: 'campo' },
  ],
  usuarioAtualId: 'EQ-1',
  conferencias: [
    { dias: 0, hora: '06:20', tipo: 'Produção de leite', resumo: 'Tanque do dia — 716 L', responsavelId: 'EQ-5', status: 'pendente' },
    { dias: 0, hora: '07:50', tipo: 'Ronda sanitária', resumo: 'L-0012 suspeita de mastite, leite descartado', responsavelId: 'EQ-5', status: 'pendente' },
    { dias: -1, hora: '15:40', tipo: 'Manutenção', resumo: 'Troca da bomba hidráulica — Trator MF 4275', responsavelId: 'EQ-4', status: 'pendente' },
    { dias: -3, hora: '09:10', tipo: 'Manejo em lote', resumo: 'Vermifugação do rebanho geral — 512 animais', responsavelId: 'EQ-3', status: 'aprovado', conferidoPorId: 'EQ-2' },
  ],
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
    ipMaxDias: 560, // até ~18,4 meses — as piores estouram a tolerância de 18
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
    { itemId: 'RAC-LACT', dia: -12, quantidade: 16000, loteDestino: 'Leite — Lactação', obs: 'Trato da ordenha' },
    { itemId: 'MED-IVE', dia: -60, quantidade: 14, loteDestino: 'Rebanho geral', obs: 'Vermifugação' },
    { itemId: 'MED-OXI', dia: -10, quantidade: 5, loteDestino: 'Leite — Lactação' },
  ],
  historicoPrecosBase: { 'SAL-MIN': 1.9, 'RAC-CONF': 1.45, 'RAC-LACT': 1.88, 'SEM-ARM': 59 },
  salga: {
    inicioDias: -60,
    itemId: 'SAL-MIN',
    diasPorFornecimento: 7,
    fatores: { 'L-C1': 0.7 }, // Matrizes Corte 1: subconsumo (cocho longe da aguada?)
  },
  cocho: { loteId: 'CONF', itemId: 'RAC-CONF', kgCabInicial: 9, kgCabAlvo: 12 },
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
  manejos: [
    { dia: -60, tipo: 'vacinacao', produto: 'Vacina aftosa', itemEstoqueId: 'VAC-AFT', alvo: 'Rebanho geral', qtdAnimais: 500, responsavel: 'Roberto Lima', obs: 'Campanha oficial' },
    { dia: -60, tipo: 'vermifugacao', produto: 'Ivermectina 1%', itemEstoqueId: 'MED-IVE', alvo: 'Rebanho geral', qtdAnimais: 512, responsavel: 'Equipe de campo' },
    { dia: -35, tipo: 'vacinacao', produto: 'Vacina clostridiose', itemEstoqueId: 'VAC-CLO', alvo: 'Bezerros(as) da safra', qtdAnimais: 160, responsavel: 'Roberto Lima' },
    { dia: -35, tipo: 'vacinacao', produto: 'Vacina brucelose B19', itemEstoqueId: 'VAC-BRU', alvo: 'Bezerras 3–8 meses', qtdAnimais: 40, responsavel: 'Roberto Lima' },
  ],
  rondas: [
    {
      dia: -1, responsavel: 'Equipe do leite', pastoId: 'P3',
      ocorrencias: [
        { brinco: 'L-0012', tipo: 'doente', descricao: 'Suspeita de mastite no quarto posterior direito — leite descartado', resolvida: false },
      ],
    },
    {
      dia: -4, responsavel: 'João Pedro', pastoId: 'P1',
      ocorrencias: [
        { brinco: 'GR-011', tipo: 'tratamento', descricao: 'Berne no lombo — aplicado mata-bicheira', resolvida: true },
        { brinco: 'BZ-030', tipo: 'observacao', descricao: 'Bezerro apartado da mãe, reunido ao lote', resolvida: true },
      ],
    },
    { dia: -8, responsavel: 'Zé Carlos', pastoId: 'P4', obs: 'Aguada baixa — acompanhar na próxima semana', ocorrencias: [] },
  ],
}

// ---------------------------------------------------------------------
// PERFIL 4 — Confinamento (12 baias, ~1.000 cabeças no cocho)
// ---------------------------------------------------------------------

const PERFIL_CONF: PerfilParams = {
  nomePerfil: 'Confinamento',
  fazenda: { nome: 'Confinamento Boa Vista', areaHa: 60 },
  config: { toleranciaIPMeses: 18, diasVaziaDescarte: 45, precoArroba: 325, custoFixoCabDia: 1.5 },
  equipe: [
    { id: 'EQ-1', nome: 'Ricardo (gestor)', papel: 'gerente' },
    { id: 'EQ-2', nome: 'Fernanda Souza', papel: 'escritorio' },
    { id: 'EQ-3', nome: 'Jonas (tratador)', papel: 'campo' },
    { id: 'EQ-4', nome: 'Edson (tratador)', papel: 'campo' },
    { id: 'EQ-5', nome: 'Dr. Paulo (veterinário)', papel: 'campo' },
  ],
  usuarioAtualId: 'EQ-1',
  conferencias: [
    { dias: 0, hora: '06:40', tipo: 'Leitura de cocho', resumo: 'Baia B03 — nota 4, sobra de 28% pesada', responsavelId: 'EQ-3', status: 'pendente' },
    { dias: 0, hora: '07:15', tipo: 'Enfermaria', resumo: 'CF4-031 entrou na enfermaria — pneumonia', responsavelId: 'EQ-5', status: 'pendente' },
    { dias: -1, hora: '16:30', tipo: 'Pesagem de lote', resumo: 'Lote 01 — 528,4 kg médio (brete)', responsavelId: 'EQ-4', status: 'aprovado', conferidoPorId: 'EQ-2' },
  ],
  seedRandom: 20261007,
  inventario: { vaca: 0, vacaLeite: 0, touro: 0, novilha_24: 0, boi_terminacao: 1 },
  pastos: [
    { id: 'P1', nome: 'Confinamento Boa Vista', areaHa: 12, capacidadeUA: 1600, tipo: 'confinamento' },
    { id: 'P2', nome: 'Piquetes de recepção', areaHa: 48, capacidadeUA: 120, tipo: 'pasto' },
  ],
  lotes: [],
  lotesCriaIds: [],
  loteNovilhasId: '',
  cria: {
    matrizesExpostasSafraPassada: 0, partos: 0, mortesPreDesmame: 0, mortesMachos: 0, machosNascidos: 0,
    nascimentoIniDias: -300, nascimentoFimDias: -200, pesoNascerMedio: 32, matrizesComPartoAnterior: 0,
    ipMinDias: 360, ipMaxDias: 420,
  },
  desmameRounds: [],
  recria: [],
  reproducao: {
    estacaoInicioDias: -90, estacaoFimDias: 30, matrizesExpostas: 0, protocolos: [],
    prenhasIATF: 0, dg30Dias: -50, prenhasRepasse: 0, dgFinalDias: -8, dgPendentes: 0, tourosRepasse: [],
  },
  confinamentoCompleto: {
    pastoId: 'P1',
    precoArrobaMagro: 325,
    baias: Array.from({ length: 12 }, (_, i) => ({
      id: `B${String(i + 1).padStart(2, '0')}`,
      nome: `Baia ${String(i + 1).padStart(2, '0')}`,
      capacidade: 125,
    })),
    dietas: [
      {
        id: 'D-ADAP', nome: 'Adaptação', fase: 'adaptacao', msPct: 52, consumoMSPctPV: 1.9, diasPrevistos: 14,
        ingredientes: [
          { itemEstoqueId: 'SIL-MIL', pct: 62 }, { itemEstoqueId: 'MIL-MOI', pct: 24 }, { itemEstoqueId: 'FAR-SOJ', pct: 7 },
          { itemEstoqueId: 'CAR-ALG', pct: 4 }, { itemEstoqueId: 'NUC-CONF', pct: 3 },
        ],
      },
      {
        id: 'D-CRES', nome: 'Crescimento', fase: 'crescimento', msPct: 62, consumoMSPctPV: 2.2, diasPrevistos: 40,
        ingredientes: [
          { itemEstoqueId: 'SIL-MIL', pct: 46 }, { itemEstoqueId: 'MIL-MOI', pct: 37 }, { itemEstoqueId: 'FAR-SOJ', pct: 8 },
          { itemEstoqueId: 'CAR-ALG', pct: 6 }, { itemEstoqueId: 'NUC-CONF', pct: 3 },
        ],
      },
      {
        id: 'D-TERM', nome: 'Terminação', fase: 'terminacao', msPct: 71, consumoMSPctPV: 2.2, diasPrevistos: 50,
        ingredientes: [
          { itemEstoqueId: 'SIL-MIL', pct: 32 }, { itemEstoqueId: 'MIL-MOI', pct: 50 }, { itemEstoqueId: 'FAR-SOJ', pct: 7 },
          { itemEstoqueId: 'CAR-ALG', pct: 7 }, { itemEstoqueId: 'NUC-CONF', pct: 4 },
        ],
      },
    ],
    lotes: [
      { id: 'CF-01', nome: 'Lote 01 — Nelore Uberaba', prefixo: 'CF1', baiaId: 'B01', qtd: 118, entradaDias: -98, pesoEntrada: 390, gmd: 1.42, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Leilão Uberaba', agioPct: 8, pesoAbateAlvo: 540, rendimentoEstimado: 54.5, diasCochoPlano: 95 },
      { id: 'CF-02', nome: 'Lote 02 — Nelore Prata', prefixo: 'CF2', baiaId: 'B02', qtd: 118, entradaDias: -92, pesoEntrada: 385, gmd: 1.38, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Fazenda Prata', agioPct: 8, pesoAbateAlvo: 540, rendimentoEstimado: 54, diasCochoPlano: 105 },
      { id: 'CF-03', nome: 'Lote 03 — Nelore Frutal', prefixo: 'CF3', baiaId: 'B03', qtd: 115, entradaDias: -80, pesoEntrada: 400, gmd: 1.45, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Leilão Frutal', agioPct: 7, pesoAbateAlvo: 550, rendimentoEstimado: 54.5, diasCochoPlano: 100, sobraOntemPct: 0.28 },
      { id: 'CF-04', nome: 'Lote 04 — Recria própria', prefixo: 'CF4', baiaId: 'B04', qtd: 110, entradaDias: -66, pesoEntrada: 372, gmd: 1.22, gmdMeta: 1.4, origem: 'recria_propria', agioPct: 0, custoRecriaCab: 3650, pesoAbateAlvo: 530, rendimentoEstimado: 53.5, diasCochoPlano: 110 },
      { id: 'CF-05', nome: 'Lote 05 — Nelore Araguari', prefixo: 'CF5', baiaId: 'B05', qtd: 120, entradaDias: -52, pesoEntrada: 380, gmd: 1.4, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Fazenda Araguari', agioPct: 9, pesoAbateAlvo: 540, rendimentoEstimado: 54, diasCochoPlano: 110 },
      { id: 'CF-06', nome: 'Lote 06 — Nelore Ituiutaba', prefixo: 'CF6', baiaId: 'B06', qtd: 112, entradaDias: -38, pesoEntrada: 395, gmd: 1.36, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Leilão Ituiutaba', agioPct: 8, pesoAbateAlvo: 545, rendimentoEstimado: 54, diasCochoPlano: 105, quedaRecente: { dias: 3, fator: 0.86 } },
      { id: 'CF-07', nome: 'Lote 07 — Cruzados Angus', prefixo: 'CF7', baiaId: 'B07', qtd: 108, entradaDias: -24, pesoEntrada: 410, gmd: 1.55, gmdMeta: 1.5, origem: 'compra', fornecedor: 'Fazenda Santa Clara', agioPct: 10, pesoAbateAlvo: 560, rendimentoEstimado: 55.5, diasCochoPlano: 95 },
      { id: 'CF-08', nome: 'Lote 08 — Nelore Monte Alegre', prefixo: 'CF8', baiaId: 'B08', qtd: 116, entradaDias: -12, pesoEntrada: 378, gmd: 1.32, gmdMeta: 1.4, origem: 'compra', fornecedor: 'Fazenda Monte Alegre', agioPct: 8, pesoAbateAlvo: 540, rendimentoEstimado: 54, diasCochoPlano: 110 },
      { id: 'CF-09', nome: 'Lote 09 — Recria própria', prefixo: 'CF9', baiaId: 'B09', qtd: 105, entradaDias: -5, pesoEntrada: 372, gmd: 1.3, gmdMeta: 1.4, origem: 'recria_propria', agioPct: 0, custoRecriaCab: 3700, pesoAbateAlvo: 535, rendimentoEstimado: 53.5, diasCochoPlano: 110 },
    ],
    ingredientes: [
      { itemId: 'SIL-MIL', fornecedor: 'Produção própria — silagem 25/26', fator: 1.6, valorUnitario: 0.16 },
      { itemId: 'MIL-MOI', fornecedor: 'Cerealista Triângulo', fator: 1.3, valorUnitario: 0.85 },
      { itemId: 'FAR-SOJ', fornecedor: 'Cerealista Triângulo', fator: 1.25, valorUnitario: 2.0 },
      { itemId: 'CAR-ALG', fornecedor: 'Algodoeira Vale', fator: 1.4, valorUnitario: 1.15 },
      { itemId: 'NUC-CONF', fornecedor: 'Nutrição Cerrado', fator: 1.06, valorUnitario: 5.2 },
    ],
    abatesAnteriores: [
      { loteNome: 'Lote 24-11 — Nelore Uberaba', baiaId: 'B10', dataDias: -32, diasCocho: 98, qtd: 112, pesoEntrada: 388, pesoVivoMedio: 538, rendimentoReal: 54.6, rendimentoEstimado: 54, precoArroba: 318, frigorifico: 'Frigorífico Planalto', custoCabEntrada: 4240, custoAlimentacaoCab: 1260, conversaoAlimentar: 6.8 },
      { loteNome: 'Lote 24-10 — Nelore Prata', baiaId: 'B11', dataDias: -68, diasCocho: 102, qtd: 120, pesoEntrada: 380, pesoVivoMedio: 535, rendimentoReal: 53.8, rendimentoEstimado: 54, precoArroba: 312, frigorifico: 'Frigorífico Planalto', custoCabEntrada: 4150, custoAlimentacaoCab: 1310, conversaoAlimentar: 7.1 },
    ],
    enfermaria: [
      // em tratamento / carência hoje
      { loteId: 'CF-04', idx: 31, entradaDias: 0, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      { loteId: 'CF-04', idx: 12, entradaDias: -2, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      { loteId: 'CF-04', idx: 57, entradaDias: -3, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      { loteId: 'CF-04', idx: 74, entradaDias: -6, diagnostico: 'Timpanismo', tratamento: 'Sonda + antiespumante', custo: 40, diasTratamento: 1, carenciaDias: 0 },
      { loteId: 'CF-04', idx: 88, entradaDias: -9, diagnostico: 'Laminite', tratamento: 'Casqueamento + anti-inflamatório', itemEstoqueId: 'MED-OXI', custo: 60, diasTratamento: 3, carenciaDias: 21 },
      { loteId: 'CF-08', idx: 5, entradaDias: -1, diagnostico: 'Acidose', tratamento: 'Bicarbonato + feno, dieta de adaptação', custo: 25, diasTratamento: 3, carenciaDias: 0 },
      { loteId: 'CF-08', idx: 40, entradaDias: -1, diagnostico: 'Acidose', tratamento: 'Bicarbonato + feno, dieta de adaptação', custo: 25, diasTratamento: 3, carenciaDias: 0 },
      { loteId: 'CF-08', idx: 66, entradaDias: -4, diagnostico: 'Conjuntivite', tratamento: 'Colírio + oxitetraciclina', itemEstoqueId: 'MED-OXI', custo: 45, diasTratamento: 5, carenciaDias: 21 },
      { loteId: 'CF-08', idx: 91, entradaDias: -5, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      { loteId: 'CF-02', idx: 19, entradaDias: -8, diagnostico: 'Abscesso', tratamento: 'Drenagem + oxitetraciclina', itemEstoqueId: 'MED-OXI', custo: 55, diasTratamento: 5, carenciaDias: 21 },
      { loteId: 'CF-05', idx: 44, entradaDias: -11, diagnostico: 'Laminite', tratamento: 'Casqueamento + anti-inflamatório', itemEstoqueId: 'MED-OXI', custo: 60, diasTratamento: 3, carenciaDias: 21 },
      { loteId: 'CF-05', idx: 77, entradaDias: -14, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      // carência cumprida e ainda na enfermaria — alerta "pode voltar ao lote"
      { loteId: 'CF-02', idx: 63, entradaDias: -40, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30 },
      { loteId: 'CF-01', idx: 22, entradaDias: -31, diagnostico: 'Abscesso', tratamento: 'Drenagem + oxitetraciclina', itemEstoqueId: 'MED-OXI', custo: 55, diasTratamento: 5, carenciaDias: 21 },
      // histórico: altas e óbitos
      { loteId: 'CF-01', idx: 48, entradaDias: -70, diagnostico: 'Pneumonia', tratamento: 'Florfenicol 30% — 2 aplicações', itemEstoqueId: 'MED-FLO', custo: 95, diasTratamento: 4, carenciaDias: 30, saidaDias: -36, destino: 'alta' },
      { loteId: 'CF-02', idx: 80, entradaDias: -60, diagnostico: 'Timpanismo', tratamento: 'Sonda + antiespumante', custo: 40, diasTratamento: 1, carenciaDias: 0, saidaDias: -58, destino: 'alta' },
      { loteId: 'CF-03', idx: 9, entradaDias: -50, diagnostico: 'Laminite', tratamento: 'Casqueamento + anti-inflamatório', itemEstoqueId: 'MED-OXI', custo: 60, diasTratamento: 3, carenciaDias: 21, saidaDias: -26, destino: 'alta' },
      { loteId: 'CF-05', idx: 101, entradaDias: -30, diagnostico: 'Acidose', tratamento: 'Bicarbonato + feno, dieta de adaptação', custo: 25, diasTratamento: 3, carenciaDias: 0, saidaDias: -26, destino: 'alta' },
      { loteId: 'CF-01', idx: 117, entradaDias: -75, diagnostico: 'Pneumonia grave', tratamento: 'Florfenicol 30% + suporte', itemEstoqueId: 'MED-FLO', custo: 190, diasTratamento: 4, carenciaDias: 30, saidaDias: -72, destino: 'obito' },
      { loteId: 'CF-03', idx: 114, entradaDias: -41, diagnostico: 'Timpanismo agudo', tratamento: 'Sonda + antiespumante', custo: 40, diasTratamento: 1, carenciaDias: 0, saidaDias: -41, destino: 'obito' },
    ],
  },
  itensEstoque: [
    { id: 'SIL-MIL', nome: 'Silagem de milho', categoria: 'racao', unidade: 'kg', minimo: 150000 },
    { id: 'MIL-MOI', nome: 'Milho grão moído', categoria: 'racao', unidade: 'kg', minimo: 60000 },
    { id: 'FAR-SOJ', nome: 'Farelo de soja', categoria: 'racao', unidade: 'kg', minimo: 10000 },
    { id: 'CAR-ALG', nome: 'Caroço de algodão', categoria: 'racao', unidade: 'kg', minimo: 8000 },
    { id: 'NUC-CONF', nome: 'Núcleo mineral confinamento', categoria: 'sal_mineral', unidade: 'kg', minimo: 4000 },
    { id: 'VAC-CLO', nome: 'Vacina clostridiose', categoria: 'vacina', unidade: 'dose', minimo: 200, validadeDias: 80 },
    { id: 'VAC-AFT', nome: 'Vacina aftosa', categoria: 'vacina', unidade: 'dose', minimo: 200, validadeDias: 150 },
    { id: 'MED-IVE', nome: 'Ivermectina 1% 500ml', categoria: 'medicamento', unidade: 'frasco', minimo: 10, validadeDias: 300 },
    { id: 'MED-OXI', nome: 'Oxitetraciclina LA 200ml', categoria: 'medicamento', unidade: 'frasco', minimo: 8, validadeDias: 280 },
    { id: 'MED-FLO', nome: 'Florfenicol 30% 250ml', categoria: 'medicamento', unidade: 'frasco', minimo: 6, validadeDias: 320 },
  ],
  pedidos: [
    {
      numero: 'PC-2025-201', fornecedor: 'AgroFarma Distribuidora', dataDias: -105, recebidoDias: -100, status: 'recebido',
      rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
      itens: [
        { itemEstoqueId: 'VAC-CLO', descricao: 'Vacina clostridiose (dose)', quantidade: 1400, valorUnitario: 1.2 },
        { itemEstoqueId: 'VAC-AFT', descricao: 'Vacina aftosa (dose)', quantidade: 1400, valorUnitario: 1.8 },
        { itemEstoqueId: 'MED-IVE', descricao: 'Ivermectina 1% 500ml (frasco)', quantidade: 60, valorUnitario: 42 },
        { itemEstoqueId: 'MED-OXI', descricao: 'Oxitetraciclina LA 200ml (frasco)', quantidade: 40, valorUnitario: 38 },
        { itemEstoqueId: 'MED-FLO', descricao: 'Florfenicol 30% 250ml (frasco)', quantidade: 36, valorUnitario: 95 },
      ],
    },
  ],
  saidasEstoque: [
    { itemId: 'VAC-CLO', dia: -98, quantidade: 1022, loteDestino: 'Lotes na entrada', obs: 'Clostridiose na recepção' },
    { itemId: 'MED-IVE', dia: -98, quantidade: 30, loteDestino: 'Lotes na entrada', obs: 'Vermifugação na recepção' },
    { itemId: 'VAC-AFT', dia: -60, quantidade: 900, loteDestino: 'Lotes 01 a 06', obs: 'Campanha aftosa' },
  ],
  historicoPrecosBase: { 'MIL-MOI': 0.72, 'FAR-SOJ': 1.85, 'NUC-CONF': 4.8, 'CAR-ALG': 1.05 },
  salga: { inicioDias: 0, itemId: 'NUC-CONF', diasPorFornecimento: 7, fatores: {} },
  despesasFixas: [
    { descricao: 'Folha de pagamento', categoria: 'Pessoal', valorMes: 42000 },
    { descricao: 'Energia elétrica (fábrica de ração + poço)', categoria: 'Energia', valorMes: 6500 },
    { descricao: 'Combustível (vagão, pá e trator)', categoria: 'Combustível', valorMes: 9800 },
  ],
  maquinas: [
    {
      id: 'MAQ-1', nome: 'Vagão misturador 12 m³', tipo: 'Trato', ano: 2021, horimetro: 2890, proximaRevisaoHorimetro: 3000,
      manutencoes: [
        { diasAtras: 120, tipo: 'preventiva', descricao: 'Revisão de 2.500 h — facas, correias e balança', custo: 3800, horimetro: 2510 },
        { diasAtras: 18, tipo: 'corretiva', descricao: 'Troca da célula de carga da balança', custo: 2400, horimetro: 2855 },
      ],
    },
    {
      id: 'MAQ-2', nome: 'Pá carregadeira JCB', tipo: 'Carregadeira', ano: 2019, horimetro: 5120, proximaRevisaoHorimetro: 5250,
      manutencoes: [{ diasAtras: 70, tipo: 'preventiva', descricao: 'Revisão de 5.000 h', custo: 5200, horimetro: 5005 }],
    },
    {
      id: 'MAQ-3', nome: 'Trator MF 7180', tipo: 'Trator', ano: 2020, horimetro: 3340, proximaRevisaoHorimetro: 3500,
      manutencoes: [{ diasAtras: 40, tipo: 'corretiva', descricao: 'Reparo no sistema hidráulico', custo: 1900, horimetro: 3290 }],
    },
    {
      id: 'MAQ-4', nome: 'Balança rodoviária 60 t', tipo: 'Balança', ano: 2018,
      proximaRevisaoDataDias: 25,
      manutencoes: [{ diasAtras: 340, tipo: 'preventiva', descricao: 'Aferição anual (INMETRO)', custo: 1500 }],
    },
  ],
  ordensServico: [
    {
      numero: 'OS-101', titulo: 'Reforma do piso da baia B10', tipo: 'infraestrutura', vinculo: 'Baia 10',
      responsavel: 'Edson (tratador)', aberturaDias: -9, prazoDias: 6, status: 'em_andamento',
      notas: [{ dias: -4, texto: 'Piso raspado, falta o cascalho e a compactação' }],
    },
    {
      numero: 'OS-102', titulo: 'Cobertura do cocho da baia B05', tipo: 'infraestrutura', vinculo: 'Baia 05',
      responsavel: 'Construtora Rural', aberturaDias: -20, prazoDias: -3, status: 'aberta',
      notas: [{ dias: -12, texto: 'Aguardando a estrutura metálica' }],
    },
    {
      numero: 'OS-103', titulo: 'Aferição da balança do vagão', tipo: 'manutencao', vinculo: 'Vagão misturador 12 m³',
      responsavel: 'Jonas (tratador)', aberturaDias: -22, status: 'concluida', conclusaoDias: -18,
      notas: [{ dias: -18, texto: 'Célula de carga trocada e balança aferida' }],
    },
  ],
  manejos: [
    { dia: -98, tipo: 'vacinacao', produto: 'Vacina clostridiose', itemEstoqueId: 'VAC-CLO', alvo: 'Lotes na entrada', qtdAnimais: 1022, responsavel: 'Dr. Paulo (veterinário)', obs: 'Protocolo de recepção' },
    { dia: -98, tipo: 'vermifugacao', produto: 'Ivermectina 1%', itemEstoqueId: 'MED-IVE', alvo: 'Lotes na entrada', qtdAnimais: 1022, responsavel: 'Dr. Paulo (veterinário)' },
    { dia: -60, tipo: 'vacinacao', produto: 'Vacina aftosa', itemEstoqueId: 'VAC-AFT', alvo: 'Lotes 01 a 06', qtdAnimais: 900, responsavel: 'Dr. Paulo (veterinário)', obs: 'Campanha oficial' },
  ],
  rondas: [
    {
      dia: -1, responsavel: 'Dr. Paulo (veterinário)', pastoId: 'P1',
      ocorrencias: [
        { brinco: 'CF4-031', tipo: 'doente', descricao: 'Tosse e secreção nasal — levar para a enfermaria', resolvida: true },
        { tipo: 'observacao', descricao: 'Bebedouro da B06 com vazão baixa — conferir boia', resolvida: false },
      ],
    },
    { dia: -5, responsavel: 'Jonas (tratador)', pastoId: 'P1', obs: 'Cochos e bebedouros limpos, sem ocorrências', ocorrencias: [] },
  ],
}

export const PERFIS: Record<PerfilDemo, PerfilParams> = {
  ciclo_completo: PERFIL_CICLO,
  cria_150: PERFIL_CRIA,
  corte_leite: PERFIL_CORTE_LEITE,
  confinamento: PERFIL_CONF,
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
    modulos: ['/', '/rebanho', '/cria', '/recria', '/reproducao', '/sanitario', '/nutricao', '/estoque', '/compras', '/financeiro', '/equipe', '/relatorios'],
    boasVindas:
      'Operação de ciclo completo: da cria à terminação, com estoque, compras e custo por arroba amarrados de ponta a ponta.',
    destaques: [
      { rotulo: 'Rebanho de 1.200 cabeças rastreado', link: '/rebanho' },
      { rotulo: 'GMD e projeções da recria', link: '/recria' },
      { rotulo: 'IATF e prenhez por terço', link: '/reproducao' },
      { rotulo: 'Salga: meta × realizado', link: '/nutricao' },
      { rotulo: 'Leitura de cocho → trato do dia', link: '/nutricao?tab=cocho' },
      { rotulo: 'Eficiência vaca × bezerro', link: '/cria?tab=eficiencia' },
      { rotulo: 'Simular compra de bezerros', link: '/recria?tab=simular' },
      { rotulo: 'Mapa dos pastos e rodízio', link: '/rebanho?tab=mapa' },
      { rotulo: 'Custo/@ e fluxo de caixa', link: '/financeiro' },
    ],
  },
  cria_150: {
    nome: 'Cria — 150 matrizes',
    descricao: 'Cria pura: partos, IATF, IP e apartação',
    boasVindas:
      'Pequena propriedade de cria com tudo que importa na produção de bezerros — sem módulos que você não usa.',
    modulos: ['/', '/rebanho', '/cria', '/reproducao', '/sanitario', '/nutricao', '/estoque', '/equipe', '/relatorios'],
    destaques: [
      { rotulo: 'Partos e desmames da safra', link: '/cria' },
      { rotulo: 'Previsão de apartação aos 8 meses', link: '/cria?tab=apartacao' },
      { rotulo: 'IP (intervalo entre partos) por matriz', link: '/cria?tab=ip' },
      { rotulo: 'Eficiência vaca × bezerro', link: '/cria?tab=eficiencia' },
      { rotulo: 'IATF, DG e partos previstos', link: '/reproducao?tab=partos' },
      { rotulo: 'Lista de descarte (vazias + IP)', link: '/reproducao?tab=descarte' },
      { rotulo: 'Salga: meta × realizado', link: '/nutricao' },
      { rotulo: 'Vacinação e ronda sanitária', link: '/sanitario' },
      { rotulo: 'Mapa dos pastos', link: '/rebanho?tab=mapa' },
    ],
  },
  corte_leite: {
    nome: 'Corte & Leite',
    descricao: 'Completo: financeiro, máquinas, OS e leite',
    boasVindas:
      'Fazenda mista de corte e leite com a gestão completa: rebanho, reprodução, financeiro, frota de máquinas e ordens de serviço.',
    modulos: ['/', '/rebanho', '/cria', '/recria', '/reproducao', '/sanitario', '/nutricao', '/leite', '/estoque', '/compras', '/financeiro', '/maquinas', '/os', '/equipe', '/relatorios'],
    destaques: [
      { rotulo: 'Fluxo de caixa e contas a pagar', link: '/financeiro' },
      { rotulo: 'Salga e leitura de cocho', link: '/nutricao' },
      { rotulo: 'Mapa dos pastos e rodízio', link: '/rebanho?tab=mapa' },
      { rotulo: 'Produção de leite diária', link: '/leite' },
      { rotulo: 'Máquinas, horímetro e manutenção', link: '/maquinas' },
      { rotulo: 'Ordens de serviço com acompanhamento', link: '/os' },
    ],
  },
  confinamento: {
    nome: 'Confinamento',
    descricao: 'Confinamento, 12 baias, 1.022 cabeças no cocho',
    boasVindas:
      'Confinamento do cocho ao abate: leitura de cocho por baia, dietas por fase, custo por arroba produzida, margem projetada, enfermaria e romaneio do frigorífico.',
    modulos: ['/', '/confinamento', '/rebanho', '/sanitario', '/estoque', '/compras', '/financeiro', '/maquinas', '/os', '/equipe', '/relatorios'],
    destaques: [
      { rotulo: 'Painel do confinamento', link: '/confinamento' },
      { rotulo: 'Painel do lote: custo, conversão e margem', link: '/confinamento?tab=lotes' },
      { rotulo: 'Leitura de cocho por baia', link: '/confinamento?tab=cocho' },
      { rotulo: 'Dietas por fase e batida de ração', link: '/confinamento?tab=dietas' },
      { rotulo: 'Abate, romaneio e projeção', link: '/confinamento?tab=abate' },
      { rotulo: 'Enfermaria e carência', link: '/confinamento?tab=enfermaria' },
      { rotulo: 'Simulador de cenário e viabilidade', link: '/confinamento?tab=simular' },
      { rotulo: 'Fluxo de caixa', link: '/financeiro' },
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

/** número no padrão pt-BR para textos gerados pelo seed (livro de movimentação) */
function fmtPesoSeed(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
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
  const agora = new Date()
  const today =
    hoje ??
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  const P = PERFIS[perfil]
  const rng = mulberry32(P.seedRandom)

  // responsáveis padrão por papel (carimbo dos lançamentos do seed)
  const equipe: MembroEquipe[] = P.equipe.map((m) => ({ ...m }))
  const campoId = equipe.find((m) => m.papel === 'campo')?.id ?? equipe[0].id
  const escritorioId = equipe.find((m) => m.papel === 'escritorio')?.id ?? equipe[0].id
  const gerenteId = equipe.find((m) => m.papel === 'gerente')?.id ?? equipe[0].id

  const pastos: Pasto[] = P.pastos.map((p) => ({ ...p }))
  const lotes: Lote[] = [
    ...P.lotes.map((l) => ({ ...l })),
    ...P.recria.map((r) => ({ id: r.id, nome: r.nome, pastoId: r.pastoId, finalidade: 'recria' as const })),
  ]

  const animais: Animal[] = []
  const movimentacoes: Movimentacao[] = []
  let movSeq = 1
  const mov = (m: Omit<Movimentacao, 'id'>) => {
    movimentacoes.push({
      id: `MV-${String(movSeq++).padStart(4, '0')}`,
      responsavelId: m.responsavelId ?? campoId,
      ...m,
    })
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
      // ganho ao pé varia por dupla vaca/bezerro — é o que diferencia a eficiência das matrizes
      const gmdPe = 0.62 + rng() * 0.28
      peso = round1(b.parto.pesoNascer + gmdPe * idadeDias)
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
        // variação natural ± alguns animais fora da curva (base do ranking e do alerta individual)
        const foraDaCurva = i % 20 === 7 ? 0.7 : i % 20 === 13 ? 1.25 : 1
        const gmdInd = (lr.gmd + (i % 2 === 0 ? 1 : -1) * ((i % 7) * 0.008)) * foraDaCurva
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

  // ---- Confinamento completo: baias, dietas, lotes individuais, cocho por baia, abates, enfermaria ----
  const baias: Baia[] = []
  const dietas: Dieta[] = []
  const lotesConfinamento: LoteConfinamento[] = []
  const abates: Abate[] = []
  const enfermaria: Enfermaria[] = []
  const leiturasConf: LeituraCocho[] = []
  const saidasConf: Omit<MovEstoque, 'id'>[] = []
  const pedidosConf: PerfilParams['pedidos'] = []
  const lancamentosConf: Omit<Lancamento, 'id'>[] = []
  const C = P.confinamentoCompleto
  if (C) {
    baias.push(...C.baias.map((b) => ({ ...b })))
    dietas.push(...C.dietas.map((d) => ({ ...d, ingredientes: d.ingredientes.map((i) => ({ ...i })) })))
    const dietaDaFase = (f: FaseConfinamento) => dietas.find((d) => d.fase === f)!
    const diasAdap = dietaDaFase('adaptacao').diasPrevistos
    const diasCres = dietaDaFase('crescimento').diasPrevistos
    const faseNoDia = (d: number): FaseConfinamento =>
      d < diasAdap ? 'adaptacao' : d < diasAdap + diasCres ? 'crescimento' : 'terminacao'
    const pastoConf = pastos.find((p) => p.id === C.pastoId)
    const nomePasto = pastoConf?.nome ?? 'Confinamento'

    // consumo diário por ingrediente (todas as baias) → saídas de estoque e compras
    const consumoDia = new Map<string, Map<string, number>>()
    const lotesPorDia = new Map<string, number>()

    for (const lc of C.lotes) {
      const dataEntrada = addDays(today, lc.entradaDias)
      const diasCocho = -lc.entradaDias
      lotes.push({ id: lc.id, nome: lc.nome, pastoId: C.pastoId, finalidade: 'terminacao' })

      // peso médio do lote dia a dia: o GMD muda com a fase (adaptação ganha menos)
      const pesoNoDia: number[] = [lc.pesoEntrada]
      for (let d = 1; d <= diasCocho; d++) {
        pesoNoDia.push(pesoNoDia[d - 1] + lc.gmd * CONFINAMENTO.fatorGmdFase[faseNoDia(d - 1)])
      }
      const pesagensLote: { data: string; peso: number }[] = []
      for (let d = 0; d <= diasCocho; d += 28) pesagensLote.push({ data: addDays(dataEntrada, d), peso: round1(pesoNoDia[d]) })
      if (diasCocho % 28 !== 0) pesagensLote.push({ data: today, peso: round1(pesoNoDia[diasCocho]) })

      const historicoDieta: LoteConfinamento['historicoDieta'] = [{ data: dataEntrada, dietaId: dietaDaFase('adaptacao').id, fase: 'adaptacao' }]
      if (diasCocho >= diasAdap) historicoDieta.push({ data: addDays(dataEntrada, diasAdap), dietaId: dietaDaFase('crescimento').id, fase: 'crescimento' })
      if (diasCocho >= diasAdap + diasCres) historicoDieta.push({ data: addDays(dataEntrada, diasAdap + diasCres), dietaId: dietaDaFase('terminacao').id, fase: 'terminacao' })
      const faseAtual = faseNoDia(diasCocho)
      const custoCabEntrada =
        lc.origem === 'compra'
          ? Math.round((lc.pesoEntrada / KG_POR_ARROBA) * C.precoArrobaMagro * (1 + lc.agioPct / 100))
          : (lc.custoRecriaCab ?? 0)

      // animais individuais (os óbitos da enfermaria entram como 'morto')
      const obitos = C.enfermaria.filter((e) => e.loteId === lc.id && e.destino === 'obito')
      const qtdEntrada = lc.qtd + obitos.length
      for (let i = 0; i < qtdEntrada; i++) {
        const obito = obitos.find((e) => e.idx === i)
        const off = ((i % 17) - 8) * 2.4
        const fator = i % 23 === 5 ? 0.78 : i % 23 === 14 ? 1.15 : 1 + (((i * 7) % 11) - 5) * 0.02
        const pesoEntradaInd = round1(lc.pesoEntrada + off)
        const pesagensInd = pesagensLote.map((p) => ({
          data: p.data,
          peso: round1(pesoEntradaInd + (p.peso - lc.pesoEntrada) * fator),
        }))
        const dataMorte = obito ? addDays(today, obito.saidaDias ?? 0) : undefined
        const pesagensAnimal = dataMorte ? pesagensInd.filter((p) => p.data <= dataMorte) : pesagensInd
        animais.push({
          id: `A-${lc.prefixo}${i + 1}`,
          brinco: `${lc.prefixo}-${String(i + 1).padStart(3, '0')}`,
          sexo: 'M',
          categoria: 'boi_terminacao',
          raca: 'Nelore',
          nascimento: addDays(dataEntrada, -Math.round(720 + rng() * 180)),
          loteId: lc.id,
          pesoAtual: pesagensAnimal[pesagensAnimal.length - 1]?.peso ?? pesoEntradaInd,
          pesagens: pesagensAnimal,
          sanitario: [
            { data: dataEntrada, tipo: 'Vacinação', produto: 'Vacina clostridiose' },
            { data: dataEntrada, tipo: 'Vermifugação', produto: 'Ivermectina 1%' },
          ],
          status: obito ? 'morto' : 'ativo',
        })
      }
      const cab = lc.qtd
      const faixa = `${lc.prefixo}-001…${lc.prefixo}-${String(qtdEntrada).padStart(3, '0')}`
      if (lc.origem === 'compra') {
        mov({ data: dataEntrada, tipo: 'compra', brinco: faixa, categoria: 'boi_terminacao', quantidade: qtdEntrada, destino: lc.nome, obs: `${lc.fornecedor} — ${fmtPesoSeed(lc.pesoEntrada)} kg médio, ágio ${lc.agioPct}%` })
        lancamentosConf.push({
          tipo: 'despesa', categoria: 'Compra de animais', descricao: `${qtdEntrada} bois magros — ${lc.nome}`,
          valor: qtdEntrada * custoCabEntrada, vencimento: dataEntrada, pagamento: dataEntrada, origem: 'compra_animal', refId: lc.id, centroCusto: 'Terminacao',
        })
      } else {
        mov({ data: dataEntrada, tipo: 'transferencia', brinco: faixa, categoria: 'boi_terminacao', quantidade: qtdEntrada, origem: 'Recria própria', destino: lc.nome, obs: `Entrada no cocho — ${fmtPesoSeed(lc.pesoEntrada)} kg médio` })
      }

      lotesConfinamento.push({
        id: lc.id, nome: lc.nome, baiaId: lc.baiaId, dataEntrada, qtdEntrada, pesoEntrada: lc.pesoEntrada,
        origem: lc.origem, fornecedor: lc.fornecedor, custoCabEntrada, agioPct: lc.agioPct,
        dietaId: dietaDaFase(faseAtual).id, fase: faseAtual, historicoDieta, gmdMeta: lc.gmdMeta,
        pesoAbateAlvo: lc.pesoAbateAlvo, rendimentoEstimado: lc.rendimentoEstimado, diasCochoPlano: lc.diasCochoPlano,
        pesagens: pesagensLote, status: 'ativo',
      })

      // leituras de cocho até ONTEM (a de hoje fica pendente para a apresentação)
      let tratoAnterior = 0
      for (let d = 0; d < diasCocho; d++) {
        const dia = lc.entradaDias + d
        const dieta = dietaDaFase(faseNoDia(d))
        const previsto = (cab * pesoNoDia[d] * (dieta.consumoMSPctPV / 100)) / (dieta.msPct / 100)
        let fator = (lc.fatorConsumo ?? 1) * (0.96 + rng() * 0.08)
        if (lc.quedaRecente && dia >= -lc.quedaRecente.dias) fator *= lc.quedaRecente.fator
        if (d < 3) fator *= 0.8 + d * 0.07 // primeiros dias: trato de chegada
        const realizado = Math.round(previsto * fator)
        let sobraPct = fator < 0.98 ? rng() * 0.02 : 0.02 + rng() * 0.07
        if (dia === -1 && lc.sobraOntemPct !== undefined) sobraPct = lc.sobraOntemPct
        const nota: LeituraCocho['nota'] = sobraPct < 0.01 ? 0 : sobraPct < 0.03 ? 1 : sobraPct < 0.07 ? 2 : sobraPct < 0.2 ? 3 : 4
        const data = addDays(today, dia)
        leiturasConf.push({
          id: `LC-${lc.prefixo}-${String(d + 1).padStart(3, '0')}`,
          data, loteId: lc.id, baiaId: lc.baiaId, nota, cabecas: cab,
          kgOntem: d === 0 ? realizado : tratoAnterior, kgCalculado: realizado,
          sobraKg: Math.round(realizado * sobraPct), dietaId: dieta.id,
          itemEstoqueId: dieta.ingredientes[0].itemEstoqueId, responsavelId: campoId,
        })
        tratoAnterior = realizado
        const porItem = consumoDia.get(data) ?? new Map<string, number>()
        for (const ing of dieta.ingredientes) porItem.set(ing.itemEstoqueId, (porItem.get(ing.itemEstoqueId) ?? 0) + (realizado * ing.pct) / 100)
        consumoDia.set(data, porItem)
        lotesPorDia.set(data, (lotesPorDia.get(data) ?? 0) + 1)
      }
    }

    // batida de ração do dia: uma saída por ingrediente
    const totalPorItem = new Map<string, number>()
    for (const [data, porItem] of [...consumoDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const [itemId, kg] of porItem) {
        const q = Math.round(kg)
        saidasConf.push({ data, itemId, tipo: 'saida', quantidade: q, loteDestino: nomePasto, obs: `Batida de ração — ${lotesPorDia.get(data)} baias` })
        totalPorItem.set(itemId, (totalPorItem.get(itemId) ?? 0) + q)
      }
    }
    // compras dos ingredientes: duas entregas (antes do 1º lote e no meio do período) cobrindo consumo × fator
    const primeiroDia = Math.min(...C.lotes.map((l) => l.entradaDias))
    C.ingredientes.forEach((ing, i) => {
      const total = Math.round(((totalPorItem.get(ing.itemId) ?? 0) * ing.fator) / 100) * 100
      const nome = P.itensEstoque.find((it) => it.id === ing.itemId)?.nome ?? ing.itemId
      const parte1 = Math.round((total * 0.55) / 100) * 100
      pedidosConf.push({
        numero: `PC-2025-${210 + i * 2}`, fornecedor: ing.fornecedor, dataDias: primeiroDia - 6, recebidoDias: primeiroDia - 2, status: 'recebido',
        rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
        itens: [{ itemEstoqueId: ing.itemId, descricao: `${nome} (kg)`, quantidade: parte1, valorUnitario: ing.valorUnitario }],
      })
      pedidosConf.push({
        numero: `PC-2025-${211 + i * 2}`, fornecedor: ing.fornecedor, dataDias: Math.round(primeiroDia / 2) - 5, recebidoDias: Math.round(primeiroDia / 2), status: 'recebido',
        rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
        itens: [{ itemEstoqueId: ing.itemId, descricao: `${nome} (kg)`, quantidade: total - parte1, valorUnitario: Math.round(ing.valorUnitario * 1.04 * 100) / 100 }],
      })
    })
    // reposição do núcleo já aprovada (o alerta de "menos de 7 dias" mostra que ela está a caminho)
    const nucleo = C.ingredientes[C.ingredientes.length - 1]
    pedidosConf.push({
      numero: 'PC-2025-230', fornecedor: nucleo.fornecedor, dataDias: -2, status: 'aprovado',
      rateio: { Cria: 0, Recria: 0, Terminacao: 100, Geral: 0 },
      itens: [{ itemEstoqueId: nucleo.itemId, descricao: `${P.itensEstoque.find((it) => it.id === nucleo.itemId)?.nome ?? nucleo.itemId} (kg)`, quantidade: 12000, valorUnitario: Math.round(nucleo.valorUnitario * 1.05 * 100) / 100 }],
    })

    // abates já feitos: receita no Financeiro, venda no livro e fotografia do lote
    C.abatesAnteriores.forEach((ab, i) => {
      const data = addDays(today, ab.dataDias)
      const pesoCarcacaTotal = Math.round(ab.qtd * ab.pesoVivoMedio * (ab.rendimentoReal / 100))
      const arrobas = pesoCarcacaTotal / CONFINAMENTO.kgArrobaCarcaca
      const receita = Math.round(arrobas * ab.precoArroba)
      const custoFixo = ab.qtd * ab.diasCocho * (P.config.custoFixoCabDia ?? CONFINAMENTO.custoFixoCabDia)
      const custoTotal = ab.qtd * (ab.custoCabEntrada + ab.custoAlimentacaoCab) + custoFixo
      const ganhoCarcacaKg = ab.qtd * (ab.pesoVivoMedio - ab.pesoEntrada) * (ab.rendimentoReal / 100)
      const arrobasProduzidas = ganhoCarcacaKg / CONFINAMENTO.kgArrobaCarcaca
      const loteId = `CF-AB${i + 1}`
      abates.push({
        id: `AB-${i + 1}`, data, loteId, loteNome: ab.loteNome, frigorifico: ab.frigorifico, qtd: ab.qtd,
        pesoVivoMedio: ab.pesoVivoMedio, pesoCarcacaTotal, rendimentoReal: ab.rendimentoReal, rendimentoEstimado: ab.rendimentoEstimado,
        precoArroba: ab.precoArroba, receita, diasCocho: ab.diasCocho, gmd: round1((ab.pesoVivoMedio - ab.pesoEntrada) / ab.diasCocho * 100) / 100,
        conversaoAlimentar: ab.conversaoAlimentar, custoTotal,
        custoArrobaProduzida: Math.round(((ab.qtd * ab.custoAlimentacaoCab + custoFixo) / arrobasProduzidas) * 100) / 100,
        arrobasProduzidas: Math.round(arrobasProduzidas * 10) / 10, margem: receita - custoTotal,
      })
      const dataEntrada = addDays(data, -ab.diasCocho)
      lotesConfinamento.push({
        id: loteId, nome: ab.loteNome, baiaId: ab.baiaId, dataEntrada, qtdEntrada: ab.qtd, pesoEntrada: ab.pesoEntrada,
        origem: 'compra', custoCabEntrada: ab.custoCabEntrada, agioPct: 8, dietaId: dietaDaFase('terminacao').id, fase: 'terminacao',
        historicoDieta: [
          { data: dataEntrada, dietaId: dietaDaFase('adaptacao').id, fase: 'adaptacao' },
          { data: addDays(dataEntrada, diasAdap), dietaId: dietaDaFase('crescimento').id, fase: 'crescimento' },
          { data: addDays(dataEntrada, diasAdap + diasCres), dietaId: dietaDaFase('terminacao').id, fase: 'terminacao' },
        ],
        gmdMeta: 1.4, pesoAbateAlvo: ab.pesoVivoMedio, rendimentoEstimado: ab.rendimentoEstimado, diasCochoPlano: ab.diasCocho,
        pesagens: [{ data: dataEntrada, peso: ab.pesoEntrada }, { data, peso: ab.pesoVivoMedio }], status: 'abatido',
      })
      mov({ data, tipo: 'venda', brinco: ab.loteNome, categoria: 'boi_terminacao', quantidade: ab.qtd, origem: nomePasto, obs: `Abate — ${ab.frigorifico}, ${fmtPesoSeed(ab.pesoVivoMedio)} kg vivo, rendimento ${ab.rendimentoReal}%` })
      lancamentosConf.push({
        tipo: 'receita', categoria: 'Venda de animais', descricao: `Abate ${ab.loteNome} — ${ab.frigorifico}`,
        valor: receita, vencimento: addDays(data, 30), pagamento: ab.dataDias + 30 <= 0 ? addDays(data, 30) : undefined,
        origem: 'venda_animal', refId: `AB-${i + 1}`, centroCusto: 'Terminacao',
      })
    })

    // enfermaria: entrada, tratamento (baixa o medicamento), alta ou óbito
    C.enfermaria.forEach((e, i) => {
      const lc = C.lotes.find((l) => l.id === e.loteId)!
      const animal = animais.find((a) => a.id === `A-${lc.prefixo}${e.idx + 1}`)!
      const entrada = addDays(today, e.entradaDias)
      const saida = e.saidaDias !== undefined ? addDays(today, e.saidaDias) : undefined
      enfermaria.push({
        id: `EN-${i + 1}`, animalId: animal.id, brinco: animal.brinco, loteId: e.loteId, entrada,
        diagnostico: e.diagnostico, tratamento: e.tratamento, itemEstoqueId: e.itemEstoqueId, custo: e.custo,
        carenciaDias: e.carenciaDias, fimTratamento: addDays(entrada, e.diasTratamento), saida, destino: e.destino,
        responsavelId: equipe.find((m) => m.nome.startsWith('Dr.'))?.id ?? campoId,
      })
      animal.sanitario.push({ data: entrada, tipo: 'Tratamento', produto: `${e.diagnostico} — ${e.tratamento}` })
      if (e.itemEstoqueId) {
        saidasConf.push({ data: entrada, itemId: e.itemEstoqueId, tipo: 'saida', quantidade: 1, loteDestino: 'Enfermaria', obs: `${animal.brinco} — ${e.diagnostico}` })
      }
      if (e.destino === 'obito' && saida) {
        mov({ data: saida, tipo: 'morte', brinco: animal.brinco, categoria: 'boi_terminacao', quantidade: 1, origem: lc.nome, obs: `Óbito na enfermaria — ${e.diagnostico}` })
      }
    })
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
        protocoloId: proto.id,
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
      // metade das vazias já foi diagnosticada no DG30 — base do aviso de descarte por dias vazia
      dgPush({ data: i % 2 === 0 ? dg30 : dgFinal, matrizBrinco: brinco, resultado: 'vazia', estacaoId: 'EM-ATUAL' })
    } else {
      dgPush({ data: dgFinal, matrizBrinco: brinco, resultado: 'pendente', estacaoId: 'EM-ATUAL' })
    }
  }

  const tourosRepasse: TouroRepasse[] = R.tourosRepasse.map((t) => ({ ...t }))

  // ---- Compras ----
  const pedidos: Pedido[] = [...P.pedidos, ...pedidosConf].map((p, i) => ({
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
    movEstoque.push({
      id: `ME-${String(++meSeq).padStart(3, '0')}`,
      responsavelId: m.tipo === 'entrada' ? escritorioId : campoId,
      ...m,
    })
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
  for (const s of saidasConf) mePush(s)

  // ---- Salga em campo: cada fornecimento de sal é uma saída de estoque ----
  const fornecimentosSal: FornecimentoSal[] = []
  for (const lote of lotes) {
    const meta = META_SAL_G_CAB_DIA[lote.finalidade]
    if (meta <= 0) continue
    const cab = animais.filter((a) => a.status === 'ativo' && a.loteId === lote.id).length
    if (cab === 0) continue
    const fator = P.salga.fatores[lote.id] ?? 0.92 + rng() * 0.16
    const entradaLote = P.recria.find((r) => r.id === lote.id)?.entradaDias
    let dia = Math.max(P.salga.inicioDias, entradaLote ?? P.salga.inicioDias)
    while (dia <= 0) {
      // sacos de 25 kg para ~N dias de consumo na meta
      const kg = Math.max(25, Math.round((cab * meta * P.salga.diasPorFornecimento) / 1000 / 25) * 25)
      const duracaoReal = Math.max(1, Math.round((kg * 1000) / (cab * meta * fator)))
      const fim = dia + duracaoReal
      const data = addDays(today, dia)
      fornecimentosSal.push({
        id: `FS-${String(fornecimentosSal.length + 1).padStart(3, '0')}`,
        data,
        loteId: lote.id,
        itemEstoqueId: P.salga.itemId,
        kg,
        cabecas: cab,
        metaGCabDia: meta,
        fimReal: fim <= 0 ? addDays(today, fim) : undefined,
        responsavelId: campoId,
      })
      mePush({
        data,
        itemId: P.salga.itemId,
        tipo: 'saida',
        quantidade: kg,
        loteDestino: lote.nome,
        obs: 'Salga no cocho',
      })
      dia = fim
    }
  }

  // ---- Leitura de cocho do confinamento: a nota de ontem define o trato de hoje ----
  const leiturasCocho: LeituraCocho[] = []
  if (P.cocho && P.confinamento) {
    const c = P.cocho
    const cab = P.confinamento.qtd
    const loteNome = lotes.find((l) => l.id === c.loteId)?.nome ?? c.loteId
    let trato = Math.round(cab * c.kgCabInicial)
    // até ontem: a leitura de HOJE fica pendente para ser feita ao vivo na apresentação
    for (let d = P.confinamento.entradaDias; d <= -1; d++) {
      let nota: LeituraCocho['nota']
      if (d === P.confinamento.entradaDias) {
        nota = 2 // dia da entrada: trato de adaptação
      } else {
        const kgCab = trato / cab
        const r = rng()
        if (kgCab < c.kgCabAlvo * 0.97) nota = r < 0.5 ? 0 : 1
        else if (kgCab > c.kgCabAlvo * 1.03) nota = r < 0.85 ? 3 : 4
        else nota = r < 0.2 ? 1 : r < 0.75 ? 2 : 3
      }
      const kgOntem = trato
      const ajuste = NOTAS_COCHO[nota].ajuste
      trato = d === P.confinamento.entradaDias ? trato : Math.round(trato * (1 + ajuste))
      const data = addDays(today, d)
      leiturasCocho.push({
        id: `LT-${String(leiturasCocho.length + 1).padStart(3, '0')}`,
        data,
        loteId: c.loteId,
        nota,
        cabecas: cab,
        kgOntem,
        kgCalculado: trato,
        itemEstoqueId: c.itemId,
        responsavelId: campoId,
      })
      mePush({
        data,
        itemId: c.itemId,
        tipo: 'saida',
        quantidade: trato,
        loteDestino: loteNome,
        obs: `Trato do dia (leitura nota ${nota})`,
      })
    }
  }

  leiturasCocho.push(...leiturasConf)
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

  // ---- Conferências (campo lança → escritório dá o visto) ----
  const conferencias: Conferencia[] = P.conferencias.map((c, i) => ({
    id: `CF-${i + 1}`,
    tipo: c.tipo,
    resumo: c.resumo,
    responsavelId: c.responsavelId,
    lancadoEm: `${addDays(today, c.dias)}T${c.hora}:00`,
    status: c.status,
    conferidoPorId: c.conferidoPorId,
    conferidoEm: c.conferidoPorId ? `${addDays(today, c.dias)}T18:00:00` : undefined,
  }))

  // ---- Sanitário: manejos em lote + rondas ----
  const manejosSanitarios: ManejoSanitario[] = P.manejos.map((m, i) => ({
    id: `MS-${i + 1}`,
    data: addDays(today, m.dia),
    tipo: m.tipo,
    produto: m.produto,
    itemEstoqueId: m.itemEstoqueId,
    alvo: m.alvo,
    qtdAnimais: m.qtdAnimais,
    responsavel: m.responsavel,
    obs: m.obs,
  }))

  const rondas: RondaSanitaria[] = P.rondas.map((r, i) => ({
    id: `RS-${i + 1}`,
    data: addDays(today, r.dia),
    responsavel: r.responsavel,
    pastoId: r.pastoId,
    obs: r.obs,
    ocorrencias: r.ocorrencias.map((o) => ({ ...o })),
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
    lancamentos.push({
      id: `LC-${String(++lcSeq).padStart(3, '0')}`,
      responsavelId: escritorioId,
      ...l,
    })
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
  // confinamento: compra dos lotes e receita dos abates
  for (const l of lancamentosConf) lcPush(l)
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
    config: { ...P.config },
    equipe,
    usuarioAtualId: P.usuarioAtualId,
    conferencias,
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
    manejosSanitarios,
    rondas,
    fornecimentosSal,
    leiturasCocho,
    baias,
    dietas,
    lotesConfinamento,
    abates,
    enfermaria,
  }
}
