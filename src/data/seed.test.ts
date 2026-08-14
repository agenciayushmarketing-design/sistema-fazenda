// Testes de coerência do seed — validam as identidades obrigatórias da demo.
import { describe, expect, it } from 'vitest'
import { buildSeed, diffDays, PARAMS } from './seed'

const HOJE = '2026-08-14' // data fixa para o teste ser determinístico
const seed = buildSeed(HOJE)

describe('coerência do seed', () => {
  it('soma das categorias do Rebanho = total de cabeças do Dashboard', () => {
    const ativos = seed.animais.filter((a) => a.status === 'ativo')
    const porCategoria = new Map<string, number>()
    for (const a of ativos) {
      porCategoria.set(a.categoria, (porCategoria.get(a.categoria) ?? 0) + 1)
    }
    const soma = [...porCategoria.values()].reduce((a, b) => a + b, 0)
    expect(soma).toBe(seed.fazenda.totalCabecas)
    expect(soma).toBe(1200)
  })

  it('partos registrados em Cria − mortalidade = bezerros no inventário do Rebanho', () => {
    const mortes = seed.movimentacoes.filter(
      (m) => m.tipo === 'morte' && (m.categoria === 'bezerro' || m.categoria === 'bezerra'),
    )
    const bezerrosInventario = seed.animais.filter(
      (a) => a.status === 'ativo' && (a.categoria === 'bezerro' || a.categoria === 'bezerra'),
    )
    expect(seed.partos.length - mortes.length).toBe(bezerrosInventario.length)
  })

  it('desmamados em Cria = entrada dos lotes de recria no período', () => {
    for (const loteId of ['R1', 'R2']) {
      const desmamadosParaLote = seed.desmames.filter((d) => d.loteDestinoId === loteId)
      const lote = seed.lotesRecria.find((l) => l.id === loteId)!
      expect(desmamadosParaLote.length).toBe(lote.qtd)
      // e os animais estão de fato no lote
      const animaisNoLote = seed.animais.filter((a) => a.status === 'ativo' && a.loteId === loteId)
      expect(animaisNoLote.length).toBe(lote.qtd)
    }
  })

  it('peso de entrada + (GMD × dias) = peso atual de cada lote de recria, exato', () => {
    for (const lote of seed.lotesRecria) {
      const pesagens = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
      const ultima = pesagens[pesagens.length - 1]
      const dias = diffDays(lote.dataEntrada, ultima.data)
      const esperado = lote.pesoEntrada + lote.gmd * dias
      expect(ultima.peso).toBeCloseTo(esperado, 1)
      // toda pesagem intermediária também segue a identidade
      for (const p of pesagens) {
        const d = diffDays(lote.dataEntrada, p.data)
        expect(p.peso).toBeCloseTo(lote.pesoEntrada + lote.gmd * d, 1)
      }
    }
  })

  it('doses de sêmen usadas em Reprodução = saída do Estoque de sêmen', () => {
    const dosesProtocolos = seed.protocolosIATF.reduce((s, p) => s + p.doses, 0)
    const saidasSemen = seed.movEstoque
      .filter((m) => m.tipo === 'saida' && m.itemId.startsWith('SEM-'))
      .reduce((s, m) => s + m.quantidade, 0)
    expect(dosesProtocolos).toBe(saidasSemen)
    // por touro/sêmen também
    for (const semenId of ['SEM-ARM', 'SEM-BAS']) {
      const usado = seed.protocolosIATF
        .filter((p) => p.semenItemId === semenId)
        .reduce((s, p) => s + p.doses, 0)
      const saida = seed.movEstoque
        .filter((m) => m.tipo === 'saida' && m.itemId === semenId)
        .reduce((s, m) => s + m.quantidade, 0)
      expect(usado).toBe(saida)
    }
  })

  it('entradas do Estoque = pedidos recebidos em Compras, com valores batendo', () => {
    const recebidos = seed.pedidos.filter((p) => p.status === 'recebido')
    const entradas = seed.movEstoque.filter((m) => m.tipo === 'entrada')

    // toda entrada referencia um pedido recebido com item idêntico (qtd e valor)
    for (const e of entradas) {
      const pedido = recebidos.find((p) => p.id === e.pedidoId)
      expect(pedido, `entrada ${e.id} sem pedido de origem`).toBeDefined()
      const item = pedido!.itens.find((i) => i.itemEstoqueId === e.itemId)
      expect(item, `entrada ${e.id} sem item no pedido`).toBeDefined()
      expect(e.quantidade).toBe(item!.quantidade)
      expect(e.valorUnitario).toBe(item!.valorUnitario)
    }
    // e todo item de pedido recebido virou exatamente uma entrada
    const totalItens = recebidos.reduce((s, p) => s + p.itens.length, 0)
    expect(entradas.length).toBe(totalItens)
    // valores totais batem
    const valorPedidos = recebidos.reduce(
      (s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)
    const valorEntradas = entradas.reduce((s, m) => s + m.quantidade * (m.valorUnitario ?? 0), 0)
    expect(valorEntradas).toBeCloseTo(valorPedidos, 2)
  })

  it('saldo de cada item de estoque = entradas − saídas', () => {
    for (const item of seed.estoque) {
      const entradas = seed.movEstoque
        .filter((m) => m.itemId === item.id && m.tipo === 'entrada')
        .reduce((s, m) => s + m.quantidade, 0)
      const saidas = seed.movEstoque
        .filter((m) => m.itemId === item.id && m.tipo === 'saida')
        .reduce((s, m) => s + m.quantidade, 0)
      expect(item.saldo).toBe(entradas - saidas)
      expect(item.saldo).toBeGreaterThanOrEqual(0)
    }
  })

  it('custo/@ do Dashboard = soma dos custos rateados ÷ arrobas produzidas', () => {
    // custos rateados: pedidos recebidos (rateio soma 100% em cada pedido)
    for (const p of seed.pedidos) {
      const somaRateio = Object.values(p.rateio).reduce((a, b) => a + b, 0)
      expect(somaRateio).toBe(100)
    }
    const custoTotal = seed.pedidos
      .filter((p) => p.status === 'recebido')
      .reduce((s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)

    // arrobas produzidas: ganho de kg dos lotes ativos ÷ 30
    let ganhoKg = 0
    for (const l of seed.lotesRecria) {
      ganhoKg += l.qtd * l.gmd * diffDays(l.dataEntrada, HOJE)
    }
    for (const a of seed.animais) {
      if (a.status === 'ativo' && a.categoria === 'boi_terminacao') {
        ganhoKg += a.pesoAtual - a.pesagens[0].peso
      }
    }
    const arrobas = ganhoKg / PARAMS.kgPorArroba
    expect(arrobas).toBeGreaterThan(0)
    const custoPorArroba = custoTotal / arrobas
    // identidade: mesma fórmula usada pelo Dashboard (lib/metrics)
    expect(custoPorArroba).toBeCloseTo(custoTotal / (ganhoKg / 30), 6)
    // sanidade: valor plausível para a demo
    expect(custoPorArroba).toBeGreaterThan(100)
    expect(custoPorArroba).toBeLessThan(600)
  })

  it('todo desmamado tem parto correspondente e idade coerente', () => {
    for (const d of seed.desmames) {
      const parto = seed.partos.find((p) => p.bezerroBrinco === d.bezerroBrinco)
      expect(parto, `desmame ${d.bezerroBrinco} sem parto`).toBeDefined()
      expect(d.idadeDias).toBe(diffDays(parto!.data, d.data))
      expect(d.idadeDias).toBeGreaterThan(150)
      expect(d.idadeDias).toBeLessThan(300)
    }
  })

  it('geração é determinística para a mesma data', () => {
    const outra = buildSeed(HOJE)
    expect(JSON.stringify(outra)).toBe(JSON.stringify(seed))
  })
})
