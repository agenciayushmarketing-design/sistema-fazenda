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

  // Cria
  addParto: (p: Omit<Parto, 'id'>) => void
  removeParto: (id: string) => void
  addDesmame: (d: Omit<Desmame, 'id'>) => void

  // Recria
  addPesagemLote: (loteId: string, pes: Pesagem) => void

  // Reprodução
  addProtocolo: (p: Omit<ProtocoloIATF, 'id'>) => void
  addDiagnostico: (d: Omit<DiagnosticoGestacao, 'id'>) => void
  updateDiagnostico: (id: string, patch: Partial<DiagnosticoGestacao>) => void

  // Estoque
  addSaidaEstoque: (m: Omit<MovEstoque, 'id' | 'tipo'>) => void
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
    (set) => ({
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

      addParto: (p) =>
        set((s) => ({
          partos: [...s.partos, { id: nid('PT'), ...p }],
          movimentacoes: [
            ...s.movimentacoes,
            {
              id: nid('MV'),
              data: p.data,
              tipo: 'nascimento' as const,
              brinco: p.bezerroBrinco,
              categoria: p.sexo === 'M' ? ('bezerro' as const) : ('bezerra' as const),
              quantidade: 1,
              destino: 'Rebanho de cria',
              obs: `Matriz ${p.matrizBrinco}`,
            },
          ],
        })),

      removeParto: (id) =>
        set((s) => ({ partos: s.partos.filter((p) => p.id !== id) })),

      addDesmame: (d) =>
        set((s) => ({
          desmames: [...s.desmames, { id: nid('DS'), ...d }],
          movimentacoes: [
            ...s.movimentacoes,
            {
              id: nid('MV'),
              data: d.data,
              tipo: 'desmame' as const,
              brinco: d.bezerroBrinco,
              categoria: 'bezerro' as const,
              quantidade: 1,
              origem: 'Rebanho de cria',
              destino: d.loteDestinoId,
            },
          ],
        })),

      addPesagemLote: (loteId, pes) =>
        set((s) => ({
          lotesRecria: s.lotesRecria.map((l) =>
            l.id === loteId ? { ...l, pesagens: [...l.pesagens, pes] } : l,
          ),
        })),

      addProtocolo: (p) =>
        set((s) => ({ protocolosIATF: [...s.protocolosIATF, { id: nid('IATF'), ...p }] })),

      addDiagnostico: (d) =>
        set((s) => ({ diagnosticos: [...s.diagnosticos, { id: nid('DG'), ...d }] })),

      updateDiagnostico: (id, patch) =>
        set((s) => ({
          diagnosticos: s.diagnosticos.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      addSaidaEstoque: (m) =>
        set((s) => ({
          movEstoque: [...s.movEstoque, { id: nid('ME'), tipo: 'saida' as const, ...m }],
          estoque: s.estoque.map((it) =>
            it.id === m.itemId ? { ...it, saldo: it.saldo - m.quantidade } : it,
          ),
        })),

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
