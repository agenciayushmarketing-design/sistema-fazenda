import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, buildSeed, diffDays } from '@/data/seed'
import { hojeISO } from '@/lib/format'
import { CATEGORIA_LABEL } from '@/data/types'
import type {
  Animal,
  Categoria,
  Desmame,
  DiagnosticoGestacao,
  Lancamento,
  ManejoSanitario,
  Manutencao,
  MovEstoque,
  Movimentacao,
  NotaOS,
  OrdemServico,
  Parto,
  Pedido,
  PerfilDemo,
  Pesagem,
  ProducaoLeite,
  ProtocoloIATF,
  RondaSanitaria,
  SeedData,
  StatusOS,
} from '@/data/types'

const STORAGE_KEY = 'fazenda-santa-helena-demo'

interface Actions {
  resetDemo: () => void
  setPerfil: (perfil: PerfilDemo) => void

  // Rebanho
  addAnimal: (a: Animal, mov?: Omit<Movimentacao, 'id'>) => void
  updateAnimal: (id: string, patch: Partial<Animal>) => void
  removeAnimal: (id: string, motivo: 'morte' | 'venda') => void
  addPesagemAnimal: (id: string, pes: Pesagem) => void
  addMovimentacao: (m: Omit<Movimentacao, 'id'>) => void
  /** Venda em lote: baixa os animais, registra no livro e lança a receita no Financeiro.
   *  Com `vencimento`, a receita fica em aberto (a receber); sem, é recebida hoje. */
  venderAnimais: (p: {
    categoria: Categoria
    qtd: number
    valorTotal: number
    comprador?: string
    vencimento?: string
  }) => { ok: boolean; erro?: string }
  /** Compra em lote: cria os animais, registra no livro e lança a despesa no Financeiro.
   *  Com `vencimento`, a despesa fica em aberto (a pagar); sem, é paga hoje. */
  comprarAnimais: (p: {
    categoria: Categoria
    qtd: number
    pesoMedio: number
    valorTotal: number
    vendedor?: string
    loteId: string
    vencimento?: string
  }) => void

  // Cria — mutações mantêm as identidades do seed (parto cria o animal, etc.)
  addParto: (p: Omit<Parto, 'id'>) => void
  removeParto: (id: string) => { ok: boolean; erro?: string }
  addDesmame: (d: Omit<Desmame, 'id'>) => { ok: boolean; erro?: string }
  /** Apartação em lote: desmama os bezerros mais velhos ao pé — transferindo para um
   *  lote de recria ou vendendo direto (receita no Financeiro, à vista ou a prazo). */
  apartarBezerros: (p: {
    qtd: number
    sexo?: 'M' | 'F'
    destino: 'recria' | 'venda'
    loteId?: string
    valorTotal?: number
    comprador?: string
    vencimento?: string
  }) => { ok: boolean; erro?: string; qtd?: number }

  // Recria
  addPesagemLote: (loteId: string, pes: Pesagem) => void

  // Reprodução
  addProtocolo: (p: Omit<ProtocoloIATF, 'id'>) => { ok: boolean; erro?: string }
  addDiagnostico: (d: Omit<DiagnosticoGestacao, 'id'>) => void
  updateDiagnostico: (id: string, patch: Partial<DiagnosticoGestacao>) => void

  // Estoque
  addSaidaEstoque: (m: Omit<MovEstoque, 'id' | 'tipo'>) => { ok: boolean; erro?: string }
  updateItemEstoque: (id: string, patch: { minimo?: number }) => void

  // Compras
  addPedido: (p: Omit<Pedido, 'id'>) => void
  updatePedido: (id: string, patch: Partial<Pedido>) => void
  removePedido: (id: string) => void
  receberPedido: (id: string) => void

  // Financeiro
  addLancamento: (l: Omit<Lancamento, 'id'>) => void
  pagarLancamento: (id: string) => void
  removeLancamento: (id: string) => { ok: boolean; erro?: string }

  // Máquinas — manutenção também vira despesa no Financeiro
  addManutencao: (maquinaId: string, m: Omit<Manutencao, 'id'>) => void

  // Ordens de serviço
  addOS: (os: Omit<OrdemServico, 'id' | 'numero' | 'notas'>) => void
  updateOSStatus: (id: string, status: StatusOS) => void
  addNotaOS: (id: string, nota: NotaOS) => void

  // Leite
  addProducaoLeite: (p: ProducaoLeite) => void

  // Sanitário
  /** Manejo em lote: baixa o estoque e escreve o evento na ficha de cada animal do alvo */
  registrarManejoLote: (p: {
    data: string
    tipo: ManejoSanitario['tipo']
    itemEstoqueId: string
    loteId?: string // ausente = rebanho geral
    dosePorAnimal: number
    responsavel: string
    obs?: string
  }) => { ok: boolean; erro?: string; qtdAnimais?: number }
  /** Ronda: registra ocorrências; tratamento escreve na ficha, morte dá baixa no animal */
  addRonda: (r: Omit<RondaSanitaria, 'id'>) => { ok: boolean; erro?: string }
  resolverOcorrencia: (rondaId: string, index: number) => void
}

export type Store = SeedData & Actions

let seq = 1000
const nid = (prefix: string) => `${prefix}-${++seq}`

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed('ciclo_completo'),

      resetDemo: () => {
        const perfil = get().perfil
        localStorage.removeItem(STORAGE_KEY)
        set(buildSeed(perfil), false)
      },

      setPerfil: (perfil) => {
        localStorage.removeItem(STORAGE_KEY)
        set(buildSeed(perfil), false)
      },

      addAnimal: (a, movi) =>
        set((s) => ({
          animais: [...s.animais, a],
          movimentacoes: movi
            ? [...s.movimentacoes, { id: nid('MV'), ...movi }]
            : s.movimentacoes,
          fazenda: { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas + 1 },
        })),

      updateAnimal: (id, patch) =>
        set((s) => ({
          animais: s.animais.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      removeAnimal: (id, motivo) =>
        set((s) => {
          const animal = s.animais.find((a) => a.id === id)
          if (!animal) return s
          return {
            animais: s.animais.map((a) =>
              a.id === id ? { ...a, status: motivo === 'morte' ? 'morto' as const : 'vendido' as const } : a,
            ),
            movimentacoes: [
              ...s.movimentacoes,
              {
                id: nid('MV'),
                data: hojeISO(),
                tipo: motivo,
                brinco: animal.brinco,
                categoria: animal.categoria,
                quantidade: 1,
                origem: animal.loteId,
                obs: 'Registrado manualmente',
              },
            ],
            fazenda: { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas - 1 },
          }
        }),

      addPesagemAnimal: (id, pes) =>
        set((s) => ({
          animais: s.animais.map((a) =>
            a.id === id
              ? {
                  ...a,
                  pesagens: [...a.pesagens, pes].sort((x, y) => x.data.localeCompare(y.data)),
                  pesoAtual: pes.peso,
                }
              : a,
          ),
        })),

      addMovimentacao: (m) =>
        set((s) => ({ movimentacoes: [...s.movimentacoes, { id: nid('MV'), ...m }] })),

      venderAnimais: ({ categoria, qtd, valorTotal, comprador, vencimento }) => {
        const s = get()
        const candidatos = s.animais.filter((a) => a.status === 'ativo' && a.categoria === categoria)
        if (qtd <= 0) return { ok: false, erro: 'Informe a quantidade.' }
        if (candidatos.length < qtd) {
          return {
            ok: false,
            erro: `Só há ${candidatos.length} ${CATEGORIA_LABEL[categoria].toLowerCase()}(s) ativos no rebanho.`,
          }
        }
        const vendidos = candidatos.slice(0, qtd)
        const ids = new Set(vendidos.map((a) => a.id))
        const hoje = hojeISO()
        set({
          animais: s.animais.map((a) => (ids.has(a.id) ? { ...a, status: 'vendido' as const } : a)),
          movimentacoes: [
            ...s.movimentacoes,
            {
              id: nid('MV'),
              data: hoje,
              tipo: 'venda' as const,
              brinco: qtd === 1 ? vendidos[0].brinco : `${vendidos[0].brinco} … ${vendidos[qtd - 1].brinco}`,
              categoria,
              quantidade: qtd,
              origem: 'Rebanho',
              obs: comprador ? `Comprador: ${comprador}` : 'Venda em lote',
            },
          ],
          lancamentos:
            valorTotal > 0
              ? [
                  ...s.lancamentos,
                  {
                    id: nid('LC'),
                    tipo: 'receita' as const,
                    categoria: 'Venda de animais',
                    descricao: `Venda de ${qtd} ${CATEGORIA_LABEL[categoria].toLowerCase()}(s)${comprador ? ` — ${comprador}` : ''}`,
                    valor: valorTotal,
                    vencimento: vencimento ?? hoje,
                    pagamento: vencimento ? undefined : hoje,
                    origem: 'venda_animal' as const,
                  },
                ]
              : s.lancamentos,
          fazenda: { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas - qtd },
        })
        return { ok: true }
      },

      comprarAnimais: ({ categoria, qtd, pesoMedio, valorTotal, vendedor, loteId, vencimento }) =>
        set((s) => {
          const hoje = hojeISO()
          // idade típica estimada por categoria (meses) para preencher o nascimento
          const idadeMeses: Record<Categoria, number> = {
            bezerro: 6, bezerra: 6, garrote: 18, novilha_13_24: 18,
            novilha_24: 28, vaca: 60, touro: 48, boi_terminacao: 30,
          }
          const sexoF: Categoria[] = ['bezerra', 'novilha_13_24', 'novilha_24', 'vaca']
          const base = s.animais.filter((a) => a.brinco.startsWith('CP-')).length
          const novos: Animal[] = []
          for (let i = 0; i < qtd; i++) {
            // offsets espelhados: média do lote comprado = peso médio informado
            const off = i % 2 === 0 ? (i % 12) * 1.5 : -((i - 1) % 12) * 1.5
            const peso = Math.round((pesoMedio + off) * 10) / 10
            novos.push({
              id: nid('A'),
              brinco: `CP-${String(base + i + 1).padStart(3, '0')}`,
              sexo: sexoF.includes(categoria) ? 'F' : 'M',
              categoria,
              raca: 'Nelore',
              nascimento: addDays(hoje, -idadeMeses[categoria] * 30),
              loteId,
              pesoAtual: peso,
              pesagens: [{ data: hoje, peso }],
              sanitario: [],
              status: 'ativo',
            })
          }
          const loteNome = s.lotes.find((l) => l.id === loteId)?.nome ?? loteId
          return {
            animais: [...s.animais, ...novos],
            movimentacoes: [
              ...s.movimentacoes,
              {
                id: nid('MV'),
                data: hoje,
                tipo: 'compra' as const,
                brinco: qtd === 1 ? novos[0].brinco : `${novos[0].brinco} … ${novos[qtd - 1].brinco}`,
                categoria,
                quantidade: qtd,
                destino: loteNome,
                obs: vendedor ? `Vendedor: ${vendedor}` : 'Compra em lote',
              },
            ],
            lancamentos:
              valorTotal > 0
                ? [
                    ...s.lancamentos,
                    {
                      id: nid('LC'),
                      tipo: 'despesa' as const,
                      categoria: 'Compra de animais',
                      descricao: `Compra de ${qtd} ${CATEGORIA_LABEL[categoria].toLowerCase()}(s)${vendedor ? ` — ${vendedor}` : ''}`,
                      valor: valorTotal,
                      vencimento: vencimento ?? hoje,
                      pagamento: vencimento ? undefined : hoje,
                      origem: 'compra_animal' as const,
                    },
                  ]
                : s.lancamentos,
            fazenda: { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas + qtd },
          }
        }),

      // Parto cria o bezerro no Rebanho: inventário e livro permanecem coerentes
      addParto: (p) =>
        set((s) => {
          const matriz = s.animais.find((a) => a.brinco === p.matrizBrinco && a.status === 'ativo')
          const bezerro: Animal = {
            id: nid('A'),
            brinco: p.bezerroBrinco,
            sexo: p.sexo,
            categoria: p.sexo === 'M' ? 'bezerro' : 'bezerra',
            raca: matriz?.raca ?? 'Nelore',
            nascimento: p.data,
            loteId: matriz?.loteId ?? s.lotes[0]?.id ?? '',
            maeBrinco: p.matrizBrinco,
            pesoAtual: p.pesoNascer,
            pesagens: [{ data: p.data, peso: p.pesoNascer }],
            sanitario: [],
            status: 'ativo',
          }
          return {
            partos: [...s.partos, { id: nid('PT'), ...p }],
            animais: [...s.animais, bezerro],
            movimentacoes: [
              ...s.movimentacoes,
              {
                id: nid('MV'),
                data: p.data,
                tipo: 'nascimento' as const,
                brinco: p.bezerroBrinco,
                categoria: bezerro.categoria,
                quantidade: 1,
                destino: 'Rebanho de cria',
                obs: `Matriz ${p.matrizBrinco}`,
              },
            ],
            fazenda: { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas + 1 },
          }
        }),

      removeParto: (id) => {
        const s = get()
        const parto = s.partos.find((p) => p.id === id)
        if (!parto) return { ok: false, erro: 'Parto não encontrado.' }
        if (s.desmames.some((d) => d.bezerroBrinco === parto.bezerroBrinco)) {
          return { ok: false, erro: 'Este bezerro já tem desmame registrado — exclua o histórico vinculado antes.' }
        }
        const animal = s.animais.find((a) => a.brinco === parto.bezerroBrinco && a.status === 'ativo')
        set({
          partos: s.partos.filter((p) => p.id !== id),
          animais: animal ? s.animais.filter((a) => a.id !== animal.id) : s.animais,
          movimentacoes: s.movimentacoes.filter(
            (m) => !(m.tipo === 'nascimento' && m.brinco === parto.bezerroBrinco),
          ),
          fazenda: animal
            ? { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas - 1 }
            : s.fazenda,
        })
        return { ok: true }
      },

      // Desmame move o animal para o lote de destino e registra a pesagem
      addDesmame: (d) => {
        const s = get()
        const animal = s.animais.find((a) => a.brinco === d.bezerroBrinco && a.status === 'ativo')
        if (!animal) return { ok: false, erro: `Animal ${d.bezerroBrinco} não encontrado no rebanho ativo.` }
        if (s.desmames.some((x) => x.bezerroBrinco === d.bezerroBrinco)) {
          return { ok: false, erro: `${d.bezerroBrinco} já tem desmame registrado.` }
        }
        const loteNome = s.lotes.find((l) => l.id === d.loteDestinoId)?.nome ?? d.loteDestinoId
        set({
          desmames: [...s.desmames, { id: nid('DS'), ...d }],
          animais: s.animais.map((a) =>
            a.id === animal.id
              ? {
                  ...a,
                  loteId: d.loteDestinoId,
                  pesoAtual: d.peso,
                  pesagens: [...a.pesagens, { data: d.data, peso: d.peso }].sort((x, y) =>
                    x.data.localeCompare(y.data),
                  ),
                }
              : a,
          ),
          movimentacoes: [
            ...s.movimentacoes,
            {
              id: nid('MV'),
              data: d.data,
              tipo: 'desmame' as const,
              brinco: d.bezerroBrinco,
              categoria: animal.categoria,
              quantidade: 1,
              origem: 'Rebanho de cria',
              destino: loteNome,
            },
          ],
        })
        return { ok: true }
      },

      apartarBezerros: ({ qtd, sexo, destino, loteId, valorTotal, comprador, vencimento }) => {
        const s = get()
        const hoje = hojeISO()
        const desmamadosSet = new Set(s.desmames.map((d) => d.bezerroBrinco))
        let candidatos = s.animais.filter(
          (a) =>
            a.status === 'ativo' &&
            (a.categoria === 'bezerro' || a.categoria === 'bezerra') &&
            !desmamadosSet.has(a.brinco),
        )
        if (sexo) candidatos = candidatos.filter((a) => a.sexo === sexo)
        candidatos.sort((a, b) => a.nascimento.localeCompare(b.nascimento)) // mais velhos primeiro
        if (!qtd || qtd <= 0) return { ok: false, erro: 'Informe a quantidade a apartar.' }
        if (candidatos.length < qtd) {
          return { ok: false, erro: `Só há ${candidatos.length} bezerro(s) ao pé nesse recorte.` }
        }
        const loteNome = loteId ? s.lotes.find((l) => l.id === loteId)?.nome ?? loteId : undefined
        if (destino === 'recria' && !loteNome) {
          return { ok: false, erro: 'Escolha o lote de recria de destino.' }
        }
        if (destino === 'venda' && !(valorTotal && valorTotal > 0)) {
          return { ok: false, erro: 'Informe o valor total da venda na apartação.' }
        }
        const alvo = candidatos.slice(0, qtd)
        const ids = new Set(alvo.map((a) => a.id))
        const novosDesmames: Desmame[] = alvo.map((a) => ({
          id: nid('DS'),
          data: hoje,
          bezerroBrinco: a.brinco,
          peso: a.pesoAtual,
          idadeDias: diffDays(a.nascimento, hoje),
          loteDestinoId: destino === 'recria' ? loteId! : 'VENDA',
        }))
        const brincoFaixa = qtd === 1 ? alvo[0].brinco : `${alvo[0].brinco} … ${alvo[qtd - 1].brinco}`
        const movs: Movimentacao[] = [
          {
            id: nid('MV'),
            data: hoje,
            tipo: 'desmame' as const,
            brinco: brincoFaixa,
            categoria: sexo === 'F' ? ('bezerra' as const) : ('bezerro' as const),
            quantidade: qtd,
            origem: 'Rebanho de cria',
            destino: destino === 'recria' ? loteNome : 'Venda na apartação',
          },
        ]
        if (destino === 'venda') {
          movs.push({
            id: nid('MV'),
            data: hoje,
            tipo: 'venda' as const,
            brinco: brincoFaixa,
            categoria: sexo === 'F' ? ('bezerra' as const) : ('bezerro' as const),
            quantidade: qtd,
            origem: 'Apartação',
            obs: comprador ? `Comprador: ${comprador}` : 'Venda na apartação',
          })
        }
        set({
          desmames: [...s.desmames, ...novosDesmames],
          animais: s.animais.map((a) => {
            if (!ids.has(a.id)) return a
            if (destino === 'recria') {
              return {
                ...a,
                loteId: loteId!,
                pesagens: [...a.pesagens, { data: hoje, peso: a.pesoAtual }],
              }
            }
            return { ...a, status: 'vendido' as const }
          }),
          movimentacoes: [...s.movimentacoes, ...movs],
          lancamentos:
            destino === 'venda'
              ? [
                  ...s.lancamentos,
                  {
                    id: nid('LC'),
                    tipo: 'receita' as const,
                    categoria: 'Venda de animais',
                    descricao: `Apartação: venda de ${qtd} bezerro(s)${comprador ? ` — ${comprador}` : ''}`,
                    valor: valorTotal!,
                    vencimento: vencimento ?? hoje,
                    pagamento: vencimento ? undefined : hoje,
                    origem: 'venda_animal' as const,
                  },
                ]
              : s.lancamentos,
          fazenda:
            destino === 'venda'
              ? { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas - qtd }
              : s.fazenda,
        })
        return { ok: true, qtd }
      },

      addPesagemLote: (loteId, pes) =>
        set((s) => ({
          lotesRecria: s.lotesRecria.map((l) =>
            l.id === loteId ? { ...l, pesagens: [...l.pesagens, pes] } : l,
          ),
        })),

      // Protocolo IATF dá baixa das doses no estoque de sêmen
      addProtocolo: (p) => {
        const s = get()
        const item = s.estoque.find((i) => i.id === p.semenItemId)
        if (!item) return { ok: false, erro: 'Sêmen não encontrado no estoque.' }
        if (item.saldo < p.doses) {
          return { ok: false, erro: `Saldo insuficiente de ${item.nome}: ${item.saldo} doses disponíveis.` }
        }
        set({
          protocolosIATF: [...s.protocolosIATF, { id: nid('IATF'), ...p }],
          movEstoque: [
            ...s.movEstoque,
            {
              id: nid('ME'),
              data: p.dataIA,
              itemId: p.semenItemId,
              tipo: 'saida' as const,
              quantidade: p.doses,
              loteDestino: p.nome,
              obs: `IATF — ${p.touroSemen}`,
            },
          ],
          estoque: s.estoque.map((i) =>
            i.id === p.semenItemId ? { ...i, saldo: i.saldo - p.doses } : i,
          ),
        })
        return { ok: true }
      },

      addDiagnostico: (d) =>
        set((s) => ({ diagnosticos: [...s.diagnosticos, { id: nid('DG'), ...d }] })),

      updateDiagnostico: (id, patch) =>
        set((s) => ({
          diagnosticos: s.diagnosticos.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      addSaidaEstoque: (m) => {
        const s = get()
        const item = s.estoque.find((i) => i.id === m.itemId)
        if (!item) return { ok: false, erro: 'Insumo não encontrado.' }
        if (m.quantidade > item.saldo) {
          return {
            ok: false,
            erro: `Saldo insuficiente: ${item.saldo.toLocaleString('pt-BR')} ${item.unidade} disponíveis.`,
          }
        }
        set({
          movEstoque: [...s.movEstoque, { id: nid('ME'), tipo: 'saida' as const, ...m }],
          estoque: s.estoque.map((it) =>
            it.id === m.itemId ? { ...it, saldo: it.saldo - m.quantidade } : it,
          ),
        })
        return { ok: true }
      },

      updateItemEstoque: (id, patch) =>
        set((s) => ({
          estoque: s.estoque.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        })),

      addPedido: (p) =>
        set((s) => ({ pedidos: [...s.pedidos, { id: nid('PED'), ...p }] })),

      updatePedido: (id, patch) =>
        set((s) => ({
          pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePedido: (id) =>
        set((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) })),

      // Receber pedido: entradas no Estoque + despesa paga no Financeiro
      receberPedido: (id) =>
        set((s) => {
          const ped = s.pedidos.find((p) => p.id === id)
          if (!ped || ped.status === 'recebido') return s
          const data = hojeISO()
          const total = ped.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0)
          const novasEntradas: MovEstoque[] = ped.itens.map((it) => ({
            id: nid('ME'),
            data,
            itemId: it.itemEstoqueId,
            tipo: 'entrada' as const,
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            pedidoId: ped.id,
            obs: `Recebimento ${ped.numero}`,
          }))
          return {
            pedidos: s.pedidos.map((p) =>
              p.id === id ? { ...p, status: 'recebido' as const, dataRecebimento: data } : p,
            ),
            movEstoque: [...s.movEstoque, ...novasEntradas],
            estoque: s.estoque.map((it) => {
              const entrada = ped.itens.find((pi) => pi.itemEstoqueId === it.id)
              if (!entrada) return it
              const novoSaldo = it.saldo + entrada.quantidade
              const novoCusto =
                (it.saldo * it.custoMedio + entrada.quantidade * entrada.valorUnitario) /
                (it.saldo + entrada.quantidade)
              return { ...it, saldo: novoSaldo, custoMedio: Math.round(novoCusto * 100) / 100 }
            }),
            precosHistoricos: [
              ...s.precosHistoricos,
              ...ped.itens.map((it) => ({ itemEstoqueId: it.itemEstoqueId, data, preco: it.valorUnitario })),
            ],
            lancamentos: [
              ...s.lancamentos,
              {
                id: nid('LC'),
                tipo: 'despesa' as const,
                categoria: 'Insumos',
                descricao: `Pedido ${ped.numero} — ${ped.fornecedor}`,
                valor: total,
                vencimento: data,
                pagamento: data,
                origem: 'pedido' as const,
                refId: ped.id,
              },
            ],
          }
        }),

      addLancamento: (l) =>
        set((s) => ({ lancamentos: [...s.lancamentos, { id: nid('LC'), ...l }] })),

      pagarLancamento: (id) =>
        set((s) => ({
          lancamentos: s.lancamentos.map((l) =>
            l.id === id && !l.pagamento ? { ...l, pagamento: hojeISO() } : l,
          ),
        })),

      removeLancamento: (id) => {
        const s = get()
        const l = s.lancamentos.find((x) => x.id === id)
        if (!l) return { ok: false, erro: 'Lançamento não encontrado.' }
        if (l.origem !== 'manual') {
          return { ok: false, erro: 'Só lançamentos manuais podem ser excluídos — os demais têm origem rastreável.' }
        }
        set({ lancamentos: s.lancamentos.filter((x) => x.id !== id) })
        return { ok: true }
      },

      addManutencao: (maquinaId, m) =>
        set((s) => {
          const maq = s.maquinas.find((x) => x.id === maquinaId)
          if (!maq) return s
          const manut: Manutencao = { id: nid('MT'), ...m }
          return {
            maquinas: s.maquinas.map((x) =>
              x.id === maquinaId
                ? {
                    ...x,
                    manutencoes: [...x.manutencoes, manut],
                    horimetro:
                      m.horimetro !== undefined && x.horimetro !== undefined
                        ? Math.max(x.horimetro, m.horimetro)
                        : x.horimetro,
                  }
                : x,
            ),
            lancamentos: [
              ...s.lancamentos,
              {
                id: nid('LC'),
                tipo: 'despesa' as const,
                categoria: 'Manutenção',
                descricao: `${m.descricao} — ${maq.nome}`,
                valor: m.custo,
                vencimento: m.data,
                pagamento: m.data,
                origem: 'manutencao' as const,
                refId: manut.id,
              },
            ],
          }
        }),

      addOS: (os) =>
        set((s) => ({
          ordensServico: [
            ...s.ordensServico,
            {
              id: nid('OS'),
              numero: `OS-${String(47 + s.ordensServico.length).padStart(3, '0')}`,
              notas: [],
              ...os,
            },
          ],
        })),

      updateOSStatus: (id, status) =>
        set((s) => ({
          ordensServico: s.ordensServico.map((o) =>
            o.id === id
              ? { ...o, status, conclusao: status === 'concluida' ? hojeISO() : undefined }
              : o,
          ),
        })),

      addNotaOS: (id, nota) =>
        set((s) => ({
          ordensServico: s.ordensServico.map((o) =>
            o.id === id ? { ...o, notas: [...o.notas, nota] } : o,
          ),
        })),

      addProducaoLeite: (p) =>
        set((s) => ({
          producaoLeite: [...s.producaoLeite.filter((x) => x.data !== p.data), p].sort((a, b) =>
            a.data.localeCompare(b.data),
          ),
        })),

      registrarManejoLote: ({ data, tipo, itemEstoqueId, loteId, dosePorAnimal, responsavel, obs }) => {
        const s = get()
        const item = s.estoque.find((i) => i.id === itemEstoqueId)
        if (!item) return { ok: false, erro: 'Insumo não encontrado no estoque.' }
        const alvo = loteId
          ? s.animais.filter((a) => a.status === 'ativo' && a.loteId === loteId)
          : s.animais.filter((a) => a.status === 'ativo')
        if (alvo.length === 0) return { ok: false, erro: 'Nenhum animal ativo no alvo escolhido.' }
        const consumo = Math.ceil(alvo.length * dosePorAnimal * 100) / 100
        if (consumo > item.saldo) {
          return {
            ok: false,
            erro: `Estoque insuficiente: precisa de ${consumo.toLocaleString('pt-BR')} ${item.unidade}, saldo ${item.saldo.toLocaleString('pt-BR')}.`,
          }
        }
        const alvoNome = loteId ? s.lotes.find((l) => l.id === loteId)?.nome ?? loteId : 'Rebanho geral'
        const tipoLabel = tipo === 'vacinacao' ? 'Vacinação' : tipo === 'vermifugacao' ? 'Vermifugação' : 'Medicação'
        const ids = new Set(alvo.map((a) => a.id))
        set({
          manejosSanitarios: [
            ...s.manejosSanitarios,
            {
              id: nid('MS'),
              data,
              tipo,
              produto: item.nome,
              itemEstoqueId,
              alvo: alvoNome,
              qtdAnimais: alvo.length,
              responsavel,
              obs,
            },
          ],
          animais: s.animais.map((a) =>
            ids.has(a.id)
              ? { ...a, sanitario: [...a.sanitario, { data, tipo: tipoLabel, produto: item.nome }] }
              : a,
          ),
          movEstoque: [
            ...s.movEstoque,
            {
              id: nid('ME'),
              data,
              itemId: itemEstoqueId,
              tipo: 'saida' as const,
              quantidade: consumo,
              loteDestino: alvoNome,
              obs: `${tipoLabel} em lote — ${alvo.length} animais`,
            },
          ],
          estoque: s.estoque.map((i) =>
            i.id === itemEstoqueId ? { ...i, saldo: Math.round((i.saldo - consumo) * 100) / 100 } : i,
          ),
        })
        return { ok: true, qtdAnimais: alvo.length }
      },

      addRonda: (r) => {
        const s = get()
        // brincos citados precisam existir no rebanho ativo
        for (const o of r.ocorrencias) {
          if (o.brinco && !s.animais.some((a) => a.brinco === o.brinco && a.status === 'ativo')) {
            return { ok: false, erro: `Brinco ${o.brinco} não encontrado no rebanho ativo.` }
          }
        }
        let animais = s.animais
        let movimentacoes = s.movimentacoes
        let baixas = 0
        for (const o of r.ocorrencias) {
          if (!o.brinco) continue
          const animal = animais.find((a) => a.brinco === o.brinco && a.status === 'ativo')
          if (!animal) continue
          if (o.tipo === 'tratamento' || o.tipo === 'doente') {
            animais = animais.map((a) =>
              a.id === animal.id
                ? {
                    ...a,
                    sanitario: [
                      ...a.sanitario,
                      { data: r.data, tipo: o.tipo === 'tratamento' ? 'Tratamento (ronda)' : 'Em observação (ronda)', produto: o.descricao },
                    ],
                  }
                : a,
            )
          } else if (o.tipo === 'morte') {
            baixas++
            animais = animais.map((a) => (a.id === animal.id ? { ...a, status: 'morto' as const } : a))
            movimentacoes = [
              ...movimentacoes,
              {
                id: nid('MV'),
                data: r.data,
                tipo: 'morte' as const,
                brinco: animal.brinco,
                categoria: animal.categoria,
                quantidade: 1,
                origem: animal.loteId,
                obs: `Ronda sanitária: ${o.descricao}`,
              },
            ]
          }
        }
        set({
          rondas: [...s.rondas, { id: nid('RS'), ...r }],
          animais,
          movimentacoes,
          fazenda: baixas > 0 ? { ...s.fazenda, totalCabecas: s.fazenda.totalCabecas - baixas } : s.fazenda,
        })
        return { ok: true }
      },

      resolverOcorrencia: (rondaId, index) =>
        set((s) => ({
          rondas: s.rondas.map((r) =>
            r.id === rondaId
              ? {
                  ...r,
                  ocorrencias: r.ocorrencias.map((o, i) => (i === index ? { ...o, resolvida: true } : o)),
                }
              : r,
          ),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 4, // v4: módulo sanitário (manejos + rondas)
      // dados persistidos de versões anteriores não têm os novos módulos/perfis → re-semeia
      migrate: () => buildSeed('ciclo_completo') as unknown as Store,
    },
  ),
)
