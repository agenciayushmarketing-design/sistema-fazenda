// Tipos do domínio — Fazenda Santa Helena (demo)

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

export type Raca = 'Nelore PO' | 'Nelore'

export interface Pasto {
  id: string
  nome: string
  areaHa: number
  capacidadeUA: number
  tipo: 'pasto' | 'confinamento'
}

export interface Lote {
  id: string
  nome: string
  pastoId: string
  finalidade: 'cria' | 'recria' | 'terminacao' | 'reproducao'
}

export interface Pesagem {
  data: string // ISO yyyy-mm-dd
  peso: number // kg
}

export interface EventoSanitario {
  data: string
  tipo: string // vacinação, vermifugação, tratamento
  produto: string
}

export interface Animal {
  id: string
  brinco: string
  sexo: 'M' | 'F'
  categoria: Categoria
  raca: Raca
  nascimento: string
  loteId: string
  maeBrinco?: string
  paiNome?: string
  pesoAtual: number
  ecc?: number // escore de condição corporal 1-5 (matrizes)
  pesagens: Pesagem[]
  sanitario: EventoSanitario[]
  status: 'ativo' | 'vendido' | 'morto'
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
  dataConcepcao?: string
  dppEstimado?: string
  estacaoId: string
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

// ---- Dataset completo ----
export interface SeedData {
  geradoEm: string
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
  desmames: Desmame[]
  lotesRecria: LoteRecria[]
  protocolosIATF: ProtocoloIATF[]
  diagnosticos: DiagnosticoGestacao[]
  tourosRepasse: TouroRepasse[]
  estoque: ItemEstoque[]
  movEstoque: MovEstoque[]
  pedidos: Pedido[]
  precosHistoricos: PrecoHistorico[]
}
