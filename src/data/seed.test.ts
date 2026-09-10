// Testes de coerência do seed — validam as identidades obrigatórias da demo
// em TODOS os perfis de demonstração.
import { describe, expect, it } from 'vitest'
import { buildSeed, diffDays, KG_POR_ARROBA, PERFIS } from './seed'
import type { PerfilDemo } from './types'

const HOJE = '2026-09-09' // data fixa para o teste ser determinístico
const PERFIS_LISTA: PerfilDemo[] = ['ciclo_completo', 'cria_150', 'corte_leite']

describe.each(PERFIS_LISTA)('coerência do seed — perfil %s', (perfil) => {
  const seed = buildSeed(perfil, HOJE)
  const P = PERFIS[perfil]

  it('soma das categorias do Rebanho = total de cabeças do Dashboard', () => {
    const ativos = seed.animais.filter((a) => a.status === 'ativo')
    const porCategoria = new Map<string, number>()
    for (const a of ativos) {
      porCategoria.set(a.categoria, (porCategoria.get(a.categoria) ?? 0) + 1)
    }
    const soma = [...porCategoria.values()].reduce((a, b) => a + b, 0)
    expect(soma).toBe(seed.fazenda.totalCabecas)
    if (perfil === 'ciclo_completo') expect(soma).toBe(1200)
    if (perfil === 'cria_150') {
      // rebanho de cria: 150 matrizes exatas
      expect(porCategoria.get('vaca')).toBe(150)
    }
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

  it('bezerros ao pé (sem desmame) = partos − mortes − desmamados (base da previsão de apartação)', () => {
    const mortes = seed.movimentacoes.filter(
      (m) => m.tipo === 'morte' && (m.categoria === 'bezerro' || m.categoria === 'bezerra'),
    ).length
    const desmamados = new Set(seed.desmames.map((d) => d.bezerroBrinco))
    const aoPe = seed.animais.filter(
      (a) =>
        a.status === 'ativo' &&
        (a.categoria === 'bezerro' || a.categoria === 'bezerra') &&
        !desmamados.has(a.brinco),
    )
    expect(aoPe.length).toBe(seed.partos.length - mortes - seed.desmames.length)
  })

  it('desmamados em Cria = entrada dos lotes de recria de desmame', () => {
    for (const lote of seed.lotesRecria) {
      const cfg = P.recria.find((r) => r.id === lote.id)!
      if (cfg.origem !== 'desmame') continue
      const desmamadosParaLote = seed.desmames.filter((d) => d.loteDestinoId === lote.id)
      expect(desmamadosParaLote.length).toBe(lote.qtd)
      const animaisNoLote = seed.animais.filter((a) => a.status === 'ativo' && a.loteId === lote.id)
      expect(animaisNoLote.length).toBe(lote.qtd)
    }
  })

  it('peso de entrada + (GMD × dias) = peso de cada pesagem de cada lote de recria', () => {
    for (const lote of seed.lotesRecria) {
      const pesagens = [...lote.pesagens].sort((a, b) => a.data.localeCompare(b.data))
      expect(pesagens.length).toBeGreaterThan(0)
      for (const p of pesagens) {
        const d = diffDays(lote.dataEntrada, p.data)
        // pesagens do seed são arredondadas a 1 casa — comparar com o esperado idem
        const esperado = Math.round((lote.pesoEntrada + lote.gmd * d) * 10) / 10
        expect(p.peso).toBeCloseTo(esperado, 5)
      }
    }
  })

  it('doses de sêmen usadas em Reprodução = saída do Estoque de sêmen (total e por touro)', () => {
    const dosesProtocolos = seed.protocolosIATF.reduce((s, p) => s + p.doses, 0)
    const saidasSemen = seed.movEstoque
      .filter((m) => m.tipo === 'saida' && m.itemId.startsWith('SEM-'))
      .reduce((s, m) => s + m.quantidade, 0)
    expect(dosesProtocolos).toBe(saidasSemen)
    const semenIds = [...new Set(seed.protocolosIATF.map((p) => p.semenItemId))]
    for (const semenId of semenIds) {
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
    for (const e of entradas) {
      const pedido = recebidos.find((p) => p.id === e.pedidoId)
      expect(pedido, `entrada ${e.id} sem pedido de origem`).toBeDefined()
      const item = pedido!.itens.find((i) => i.itemEstoqueId === e.itemId)
      expect(item, `entrada ${e.id} sem item no pedido`).toBeDefined()
      expect(e.quantidade).toBe(item!.quantidade)
      expect(e.valorUnitario).toBe(item!.valorUnitario)
    }
    const totalItens = recebidos.reduce((s, p) => s + p.itens.length, 0)
    expect(entradas.length).toBe(totalItens)
    const valorPedidos = recebidos.reduce(
      (s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)
    const valorEntradas = entradas.reduce((s, m) => s + m.quantidade * (m.valorUnitario ?? 0), 0)
    expect(valorEntradas).toBeCloseTo(valorPedidos, 2)
  })

  it('saldo de cada item de estoque = entradas − saídas, nunca negativo', () => {
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

  it('rateios somam 100% e custo/@ = custos rateados ÷ arrobas produzidas (quando há produção)', () => {
    for (const p of seed.pedidos) {
      const somaRateio = Object.values(p.rateio).reduce((a, b) => a + b, 0)
      expect(somaRateio).toBe(100)
    }
    const custoTotal = seed.pedidos
      .filter((p) => p.status === 'recebido')
      .reduce((s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)

    let ganhoKg = 0
    for (const l of seed.lotesRecria) {
      ganhoKg += l.qtd * l.gmd * diffDays(l.dataEntrada, HOJE)
    }
    for (const a of seed.animais) {
      if (a.status === 'ativo' && a.categoria === 'boi_terminacao') {
        ganhoKg += a.pesoAtual - a.pesagens[0].peso
      }
    }
    if (ganhoKg > 0) {
      const custoPorArroba = custoTotal / (ganhoKg / KG_POR_ARROBA)
      expect(custoPorArroba).toBeGreaterThan(100)
      expect(custoPorArroba).toBeLessThan(600)
    } else {
      expect(perfil).toBe('cria_150') // só o perfil de cria pura não produz arrobas em recria
    }
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

  it('IP por matriz: todo parto anterior casa com parto atual da mesma matriz, dentro da faixa', () => {
    expect(seed.partosAnteriores.length).toBeGreaterThan(0)
    for (const ant of seed.partosAnteriores) {
      const atual = seed.partos.find((p) => p.matrizBrinco === ant.matrizBrinco)
      expect(atual, `parto anterior de ${ant.matrizBrinco} sem parto atual`).toBeDefined()
      const ip = diffDays(ant.data, atual!.data)
      expect(ip).toBeGreaterThanOrEqual(P.cria.ipMinDias)
      expect(ip).toBeLessThanOrEqual(P.cria.ipMaxDias)
    }
    // no máximo 1 parto anterior por matriz
    const matrizes = seed.partosAnteriores.map((p) => p.matrizBrinco)
    expect(new Set(matrizes).size).toBe(matrizes.length)
  })

  it('Financeiro: despesas com origem em pedido = soma dos pedidos recebidos', () => {
    const valorPedidos = seed.pedidos
      .filter((p) => p.status === 'recebido')
      .reduce((s, p) => s + p.itens.reduce((si, i) => si + i.quantidade * i.valorUnitario, 0), 0)
    const despesasPedidos = seed.lancamentos
      .filter((l) => l.tipo === 'despesa' && l.origem === 'pedido')
      .reduce((s, l) => s + l.valor, 0)
    expect(despesasPedidos).toBeCloseTo(valorPedidos, 2)
    // e cada despesa referencia um pedido existente
    for (const l of seed.lancamentos.filter((x) => x.origem === 'pedido')) {
      expect(seed.pedidos.some((p) => p.id === l.refId)).toBe(true)
    }
  })

  it('Financeiro: despesas com origem em manutenção = soma das manutenções das máquinas', () => {
    const custoManutencoes = seed.maquinas.reduce(
      (s, m) => s + m.manutencoes.reduce((si, mt) => si + mt.custo, 0), 0)
    const despesasManutencao = seed.lancamentos
      .filter((l) => l.tipo === 'despesa' && l.origem === 'manutencao')
      .reduce((s, l) => s + l.valor, 0)
    expect(despesasManutencao).toBeCloseTo(custoManutencoes, 2)
  })

  it('Financeiro: receita de venda de animais bate com a venda de descarte do seed', () => {
    const receitaVendas = seed.lancamentos
      .filter((l) => l.tipo === 'receita' && l.origem === 'venda_animal')
      .reduce((s, l) => s + l.valor, 0)
    const esperado = P.vendaDescarte ? P.vendaDescarte.qtd * P.vendaDescarte.valorCabeca : 0
    expect(receitaVendas).toBeCloseTo(esperado, 2)
  })

  it('sanitário: manejos referenciam insumos do estoque e rondas citam brincos existentes', () => {
    expect(seed.manejosSanitarios.length).toBeGreaterThan(0)
    for (const m of seed.manejosSanitarios) {
      if (m.itemEstoqueId) {
        expect(seed.estoque.some((i) => i.id === m.itemEstoqueId), `manejo ${m.id} com insumo inexistente`).toBe(true)
      }
      expect(m.qtdAnimais).toBeGreaterThan(0)
    }
    expect(seed.rondas.length).toBeGreaterThan(0)
    const brincos = new Set(seed.animais.filter((a) => a.status === 'ativo').map((a) => a.brinco))
    for (const r of seed.rondas) {
      expect(seed.pastos.some((p) => p.id === r.pastoId), `ronda ${r.id} com pasto inexistente`).toBe(true)
      for (const o of r.ocorrencias) {
        if (o.brinco) {
          expect(brincos.has(o.brinco), `ronda ${r.id} cita brinco inexistente ${o.brinco}`).toBe(true)
        }
      }
    }
  })

  it('partos previstos: toda prenha tem DPP coerente com a concepção (+283 dias)', () => {
    for (const d of seed.diagnosticos) {
      if (d.resultado !== 'prenha') continue
      expect(d.dataConcepcao, `prenha ${d.matrizBrinco} sem concepção`).toBeDefined()
      expect(d.dppEstimado, `prenha ${d.matrizBrinco} sem DPP`).toBeDefined()
      expect(diffDays(d.dataConcepcao!, d.dppEstimado!)).toBe(283)
    }
  })

  it('geração é determinística para a mesma data', () => {
    const outra = buildSeed(perfil, HOJE)
    expect(JSON.stringify(outra)).toBe(JSON.stringify(seed))
  })
})

describe('perfil corte_leite — leite', () => {
  const seed = buildSeed('corte_leite', HOJE)

  it('produção diária tem 30 dias e a receita parcial do mês = litros do mês × preço do litro', () => {
    expect(seed.producaoLeite.length).toBe(30)
    expect(seed.leite).toBeDefined()
    const mesAtual = HOJE.slice(0, 7)
    const litrosMes = seed.producaoLeite
      .filter((p) => p.data.slice(0, 7) === mesAtual)
      .reduce((s, p) => s + p.litros, 0)
    const receitaParcial = seed.lancamentos.find(
      (l) => l.origem === 'leite' && !l.pagamento,
    )
    expect(receitaParcial).toBeDefined()
    expect(receitaParcial!.valor).toBeCloseTo(litrosMes * seed.leite!.precoLitro, 2)
  })

  it('vacas de leite em lactação batem com a configuração', () => {
    const lactacao = seed.animais.filter(
      (a) => a.status === 'ativo' && a.aptidao === 'leite' && a.loteId === 'L-LAC',
    )
    expect(lactacao.length).toBe(seed.leite!.vacasLactacao)
  })
})
