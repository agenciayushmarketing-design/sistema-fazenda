// Tipos do domínio — Fazenda Santa Helena (demo)

export type PerfilDemo = 'ciclo_completo' | 'cria_150' | 'corte_leite' | 'confinamento'

export type Categoria =
  | 'bezerro'
  | 'bezerra'
  | 'garrote'
  | 'novilha_13_24'
  | 'novilha_24'
  | 'vaca'
  | 'touro'
  | 'boi_terminacao'

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  bezerro: 'Bezerro',
  bezerra: 'Bezerra',
  garrote: 'Garrote',
  novilha_13_24: 'Novilha 13–24m',
  novilha_24: 'Novilha >24m',
  vaca: 'Vaca',
  touro: 'Touro',
  boi_terminacao: 'Boi terminação',
}

export type Raca = 'Nelore PO' | 'Nelore' | 'Girolando'

export type CondicaoPasto = 'boa' | 'regular' | 'ruim'

export interface Pasto {
  id: string
  nome: string
  areaHa: number
  capacidadeUA: number
  tipo: 'pasto' | 'confinamento'
  /** condição da forragem (vista na ronda) */
  condicao?: CondicaoPasto
  /** dias de ocupação planejados antes do rodízio */
  diasOcupacaoPlano?: number
  /** último dia em que o pasto ficou vazio (início do descanso) */
  descansoDesde?: string
}

export interface Lote {
  id: string
  nome: string
  pastoId: string
  finalidade: 'cria' | 'recria' | 'terminacao' | 'reproducao' | 'leite'
  /** data em que o lote entrou no pasto atual (calendário de rodízio) */
  entradaPasto?: string
}

export interface Pesagem {
  data: string // ISO yyyy-mm-dd
  peso: number // kg
}

export interface EventoSanitario {
  data: string
  tipo: string // vacinação, vermifugação, tratamento
  produto: string
  /** fim da carência (tratamentos): até essa data o animal não pode ir para abate */
  carenciaAte?: string
  obs?: string
}

export interface Animal {
  id: string
  brinco: string
  sexo: 'M' | 'F'
  categoria: Categoria
  raca: Raca
  aptidao?: 'corte' | 'leite'
  nascimento: string
  loteId: string
  maeBrinco?: string
  paiNome?: string
  pesoAtual: number
  ecc?: number // escore de condição corporal 1-5 (matrizes)
  pesagens: Pesagem[]
  sanitario: EventoSanitario[]
  status: 'ativo' | 'vendido' | 'morto'
  /** foto reduzida (data URL JPEG) — fica só no aparelho */
  foto?: string
}

export type TipoMovimentacao =
  | 'nascimento'
  | 'morte'
  | 'compra'
  | 'venda'
  | 'transferencia'
  | 'mudanca_categoria'
  | 'desmame'

export interface Movimentacao {
  id: string
  data: string
  tipo: TipoMovimentacao
  brinco: string
  categoria: Categoria
  quantidade: number
  origem?: string
  destino?: string
  obs?: string
  responsavelId?: string
}

// ---- Cria ----
export interface EstacaoMonta {
  id: string
  nome: string
  inicio: string
  fim: string
  matrizesExpostas: number
  status: 'encerrada' | 'em_andamento'
}

export interface Parto {
  id: string
  data: string
  matrizBrinco: string
  bezerroBrinco: string
  sexo: 'M' | 'F'
  pesoNascer: number
  dificuldade: 1 | 2 | 3 | 4 | 5 // 1 = sem auxílio
  estacaoId: string
  /** animal criado por este parto (lançamentos feitos no app) */
  animalId?: string
  /** pai (touro de repasse ou sêmen do protocolo) */
  paiNome?: string
}

export interface Desmame {
  id: string
  data: string
  bezerroBrinco: string
  peso: number
  idadeDias: number
  loteDestinoId: string
}

// ---- Recria ----
export interface LoteRecria {
  id: string // = id do Lote
  nome: string
  pastoId: string
  sexo: 'M' | 'F'
  qtd: number
  dataEntrada: string
  pesoEntrada: number // média kg
  gmd: number // kg/dia (real, do seed)
  gmdMeta: number
  pesoAlvo: number // 330 fêmea / 380 macho
  pesagens: Pesagem[] // peso médio do lote a cada 28 dias
}

// ---- Reprodução ----
export interface ProtocoloIATF {
  id: string
  nome: string
  loteDescricao: string
  dataInicio: string // D0
  dataIA: string
  produto: string
  inseminador: string
  touroSemen: string
  semenItemId: string
  doses: number
  matrizes: number
}

export interface DiagnosticoGestacao {
  id: string
  data: string
  matrizBrinco: string
  resultado: 'prenha' | 'vazia' | 'pendente'
  origemPrenhez?: 'IATF' | 'touro'
  protocoloId?: string // prenhez de IATF: qual protocolo emprenhou
  dataConcepcao?: string
  dppEstimado?: string
  estacaoId: string
  /** parto já registrado para esta prenhez (sai da lista de partos previstos) */
  partoId?: string
}

export interface TouroRepasse {
  brinco: string
  nome: string
  vacasRepasse: number
  prenhezesRepasse: number
}

// ---- Estoque ----
export type CategoriaInsumo =
  | 'semen'
  | 'medicamento'
  | 'vacina'
  | 'sal_mineral'
  | 'racao'
  | 'defensivo'
  | 'hormonio'

export interface ItemEstoque {
  id: string
  nome: string
  categoria: CategoriaInsumo
  unidade: string
  saldo: number
  minimo: number
  validade?: string
  custoMedio: number
  botijao?: string
  caneca?: string
}

export interface MovEstoque {
  id: string
  data: string
  itemId: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  valorUnitario?: number // entradas
  pedidoId?: string // origem (entrada)
  loteDestino?: string // consumo (saída)
  obs?: string
  responsavelId?: string
}

// ---- Compras ----
export type CentroCusto = 'Cria' | 'Recria' | 'Terminacao' | 'Geral'

export interface ItemPedido {
  itemEstoqueId: string
  descricao: string
  quantidade: number
  valorUnitario: number
}

export interface Pedido {
  id: string
  numero: string
  fornecedor: string
  data: string
  dataRecebimento?: string
  status: 'pendente' | 'aprovado' | 'recebido' | 'cancelado'
  itens: ItemPedido[]
  rateio: Record<CentroCusto, number> // percentuais somando 100
}

export interface PrecoHistorico {
  itemEstoqueId: string
  data: string
  preco: number
}

// ---- Financeiro ----
export type OrigemLancamento =
  | 'pedido'
  | 'manutencao'
  | 'venda_animal'
  | 'compra_animal'
  | 'leite'
  | 'fixa'
  | 'manual'

export interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string // Insumos, Pessoal, Energia, Manutenção, Venda de animais, Leite…
  descricao: string
  valor: number
  vencimento: string
  pagamento?: string // presente = pago/recebido
  origem: OrigemLancamento
  refId?: string // pedido, manutenção, etc.
  centroCusto?: CentroCusto
  responsavelId?: string
}

// ---- Máquinas ----
export interface Manutencao {
  id: string
  data: string
  tipo: 'preventiva' | 'corretiva'
  descricao: string
  custo: number
  horimetro?: number
}

export interface Maquina {
  id: string
  nome: string
  tipo: string // trator, implemento, ordenha…
  ano: number
  horimetro?: number // horas de uso (quando se aplica)
  proximaRevisaoHorimetro?: number
  proximaRevisaoData?: string
  manutencoes: Manutencao[]
}

// ---- Ordens de serviço ----
export type TipoOS = 'manutencao' | 'pastagem' | 'cerca' | 'sanitario' | 'infraestrutura' | 'outro'
export type StatusOS = 'aberta' | 'em_andamento' | 'concluida'

export interface NotaOS {
  data: string
  texto: string
}

export interface OrdemServico {
  id: string
  numero: string
  titulo: string
  tipo: TipoOS
  vinculo?: string // máquina, pasto ou lote relacionado
  responsavel: string
  abertura: string
  prazo?: string
  status: StatusOS
  conclusao?: string
  notas: NotaOS[]
  /** fechamento: quem concluiu, o que foi feito e a foto tirada no celular */
  concluidaPorId?: string
  conclusaoObs?: string
  conclusaoFoto?: string
}

// ---- Sanitário ----
export type TipoManejo = 'vacinacao' | 'vermifugacao' | 'medicacao'

/** Manejo aplicado em lote (campanha): baixa o estoque e escreve na ficha de cada animal */
export interface ManejoSanitario {
  id: string
  data: string
  tipo: TipoManejo
  produto: string
  itemEstoqueId?: string
  alvo: string // "Rebanho geral" ou nome do lote
  qtdAnimais: number
  responsavel: string
  obs?: string
}

/** Calendário sanitário: o que precisa ser feito, quando, em quem */
export interface TarefaSanitaria {
  id: string
  titulo: string
  data: string
  tipo: TipoManejo
  alvo: string
  loteId?: string
  itemEstoqueId?: string
  concluidaEm?: string
  manejoId?: string
}

export type TipoOcorrencia = 'observacao' | 'tratamento' | 'doente' | 'morte'

export interface OcorrenciaRonda {
  brinco?: string
  tipo: TipoOcorrencia
  descricao: string
  resolvida: boolean
  /** foto reduzida (data URL JPEG) tirada no pasto */
  foto?: string
}

/** Ronda sanitária: percorrer um pasto e registrar o que foi visto */
export interface RondaSanitaria {
  id: string
  data: string
  responsavel: string
  pastoId: string
  obs?: string
  ocorrencias: OcorrenciaRonda[]
}

// ---- Leite ----
export interface ProducaoLeite {
  data: string
  litros: number
}

export interface ConfigLeite {
  vacasLactacao: number
  precoLitro: number
  mediaLitrosVacaDia: number
}

// ---- Nutrição ----
/** Sal mineral colocado no cocho de um lote; fimReal = dia em que o cocho esvaziou */
export interface FornecimentoSal {
  id: string
  data: string
  loteId: string
  itemEstoqueId: string
  kg: number
  cabecas: number
  metaGCabDia: number
  fimReal?: string
  responsavelId?: string
}

/** Leitura do cocho do confinamento: a nota da sobra de ontem define o trato de hoje */
export interface LeituraCocho {
  id: string
  data: string
  loteId: string
  nota: 0 | 1 | 2 | 3 | 4
  cabecas: number
  kgOntem: number
  kgCalculado: number
  itemEstoqueId: string
  responsavelId?: string
  /** módulo Confinamento: baia lida, sobra pesada e dieta do trato (a baixa é por ingrediente) */
  baiaId?: string
  sobraKg?: number
  dietaId?: string
}

// ---- Confinamento ----
export type FaseConfinamento = 'adaptacao' | 'crescimento' | 'terminacao'

export const FASE_LABEL: Record<FaseConfinamento, string> = {
  adaptacao: 'Adaptação',
  crescimento: 'Crescimento',
  terminacao: 'Terminação',
}

export interface Baia {
  id: string
  nome: string
  capacidade: number
}

export interface IngredienteDieta {
  itemEstoqueId: string
  /** % da mistura como fornecida (soma 100) */
  pct: number
}

/** Dieta por fase: a batida de ração baixa cada ingrediente na proporção */
export interface Dieta {
  id: string
  nome: string
  fase: FaseConfinamento
  ingredientes: IngredienteDieta[]
  /** matéria seca da mistura (%) */
  msPct: number
  /** consumo esperado de matéria seca, em % do peso vivo por dia */
  consumoMSPctPV: number
  /** dias previstos nessa fase (terminação: até o abate) */
  diasPrevistos: number
}

export interface TrocaDieta {
  data: string
  dietaId: string
  fase: FaseConfinamento
}

/** Lote de confinamento: ocupa uma baia; os animais ficam em `animais` com loteId = id */
export interface LoteConfinamento {
  id: string // = id do Lote
  nome: string
  baiaId: string
  dataEntrada: string
  qtdEntrada: number
  pesoEntrada: number // kg médio
  origem: 'compra' | 'recria_propria'
  fornecedor?: string
  /** custo de aquisição por cabeça (compra: com ágio; própria: custo da recria) */
  custoCabEntrada: number
  agioPct: number
  dietaId: string
  fase: FaseConfinamento
  historicoDieta: TrocaDieta[]
  gmdMeta: number
  pesoAbateAlvo: number
  rendimentoEstimado: number // % de carcaça
  diasCochoPlano: number
  pesagens: Pesagem[] // peso médio do lote
  status: 'ativo' | 'abatido'
}

export interface Abate {
  id: string
  data: string
  loteId: string
  loteNome: string
  frigorifico: string
  qtd: number
  pesoVivoMedio: number
  /** peso total de carcaça do romaneio (kg) */
  pesoCarcacaTotal: number
  rendimentoReal: number // %
  rendimentoEstimado: number // %
  precoArroba: number
  receita: number
  /** fotografia do lote no abate (dias de cocho, custo, margem) */
  diasCocho: number
  gmd: number
  conversaoAlimentar: number
  custoTotal: number
  custoArrobaProduzida: number
  arrobasProduzidas: number
  margem: number
}

export interface Enfermaria {
  id: string
  animalId: string
  brinco: string
  loteId: string
  entrada: string
  diagnostico: string
  tratamento: string
  itemEstoqueId?: string
  custo: number
  carenciaDias: number
  /** fim do tratamento (início da carência); antes disso o animal ainda está em tratamento */
  fimTratamento: string
  saida?: string
  destino?: 'alta' | 'obito'
  responsavelId?: string
}

// ---- Equipe e conferência (campo lança → escritório dá o visto) ----
export type PapelEquipe = 'campo' | 'escritorio' | 'gerente'

export interface MembroEquipe {
  id: string
  nome: string
  papel: PapelEquipe
}

/** Lançamento feito por alguém do campo, aguardando o visto do escritório */
export interface Conferencia {
  id: string
  tipo: string // rótulo curto: Parto, Pesagem de lote, Saída de estoque…
  resumo: string
  responsavelId: string
  lancadoEm: string // ISO datetime
  status: 'pendente' | 'aprovado' | 'devolvido'
  conferidoPorId?: string
  conferidoEm?: string
}

/** Parâmetros operacionais que o produtor ajusta na tela (persistidos) */
export interface ConfigFazenda {
  /** IP acima disso (em meses) marca a matriz em vermelho para descarte */
  toleranciaIPMeses: number
  /** vazia há mais dias que isso vira aviso de venda */
  diasVaziaDescarte: number
  /** cotação da arroba do boi gordo usada nas projeções do confinamento (R$/@) */
  precoArroba?: number
  /** custo fixo do confinamento por cabeça/dia (mão de obra, energia, depreciação) */
  custoFixoCabDia?: number
  /** custo diário por cabeça em cada fase (custo acumulado do animal) */
  custoDiaCria?: number
  custoDiaRecria?: number
}

// ---- Dataset completo ----
export interface SeedData {
  perfil: PerfilDemo
  geradoEm: string
  config: ConfigFazenda
  equipe: MembroEquipe[]
  usuarioAtualId: string
  conferencias: Conferencia[]
  fazenda: {
    nome: string
    areaHa: number
    totalCabecas: number
  }
  pastos: Pasto[]
  lotes: Lote[]
  animais: Animal[]
  movimentacoes: Movimentacao[]
  estacoes: EstacaoMonta[]
  partos: Parto[]
  partosAnteriores: Parto[] // safra anterior — base do IP por matriz
  desmames: Desmame[]
  lotesRecria: LoteRecria[]
  protocolosIATF: ProtocoloIATF[]
  diagnosticos: DiagnosticoGestacao[]
  tourosRepasse: TouroRepasse[]
  estoque: ItemEstoque[]
  movEstoque: MovEstoque[]
  pedidos: Pedido[]
  precosHistoricos: PrecoHistorico[]
  lancamentos: Lancamento[]
  maquinas: Maquina[]
  ordensServico: OrdemServico[]
  producaoLeite: ProducaoLeite[]
  leite?: ConfigLeite
  manejosSanitarios: ManejoSanitario[]
  tarefasSanitarias: TarefaSanitaria[]
  rondas: RondaSanitaria[]
  fornecimentosSal: FornecimentoSal[]
  leiturasCocho: LeituraCocho[]
  // confinamento (vazios nas fazendas sem o módulo)
  baias: Baia[]
  dietas: Dieta[]
  lotesConfinamento: LoteConfinamento[]
  abates: Abate[]
  enfermaria: Enfermaria[]
}
