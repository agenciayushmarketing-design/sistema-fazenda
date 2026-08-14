import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed } from '@/data/seed'
import { hojeISO } from '@/lib/format'
import type {
  Animal,
  Desmame,
  DiagnosticoGestacao,
  MovEstoque,
  Movimentacao,
  Parto,
  Pedido,
  Pesagem,
  ProtocoloIATF,
  SeedData,
} from '@/data/types'

const STORAGE_KEY = 'fazenda-santa-helena-demo'

interface Actions {
  resetDemo: () => void

  // Rebanho
  addAnimal: (a: Animal, mov?: Omit<Movimentacao, 'id'>) => void
  updateAnimal: (id: string, patch: Partial<Animal>) => void
  removeAnimal: (id: string, motivo: 'morte' | 'venda') => void
  addPesagemAnimal: (id: string, pes: Pesagem) => void
  addMovimentacao: (m: Omit<Movimentacao, 'id'>) => void

  // Cria — mutações mantêm as identidades do seed (parto cria o animal, etc.)
  addParto: (p: Omit<Parto, 'id'>) => void
  removeParto: (id: string) => { ok: boolean; erro?: string }
  addDesmame: (d: Omit<Desmame, 'id'>) => { ok: boolean; erro?: string }

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
}

export type Store = SeedData & Actions

let seq = 1000
const nid = (prefix: string) => `${prefix}-${++seq}`

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(),

      resetDemo: () => {
        localStorage.removeItem(STORAGE_KEY)
        set(buildSeed(), false)
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
            loteId: matriz?.loteId ?? 'L-SR',
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

      // Cascata: remove também o animal e a movimentação de nascimento.
      // Bloqueia se houver desmame vinculado (removeria histórico rastreável).
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

      addPesagemLote: (loteId, pes) =>
        set((s) => ({
          lotesRecria: s.lotesRecria.map((l) =>
            l.id === loteId ? { ...l, pesagens: [...l.pesagens, pes] } : l,
          ),
        })),

      // Protocolo IATF dá baixa das doses no estoque de sêmen (identidade doses = saída)
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

      // Saída de consumo valida saldo — estoque nunca fica negativo
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

      // Marcar como recebido gera entradas correspondentes no Estoque
      receberPedido: (id) =>
        set((s) => {
          const ped = s.pedidos.find((p) => p.id === id)
          if (!ped || ped.status === 'recebido') return s
          const data = hojeISO()
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
          }
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    },
  ),
)
