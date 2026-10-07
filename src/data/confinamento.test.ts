// Coerência do perfil Confinamento: baias, cocho, dietas, abates e enfermaria
import { describe, expect, it } from 'vitest'
import { buildSeed, diffDays } from './seed'
import {
  alertasConfinamento, baiasStatus, consumoLote, custoKgDieta, enfermariaAberta, resumoConfinamento, resumoLote, viabilidade,
} from '@/lib/confinamento'

const HOJE = '2026-10-07'

describe('coerência do seed — perfil confinamento', () => {
  const seed = buildSeed('confinamento', HOJE)
  const ativos = seed.animais.filter((a) => a.status === 'ativo')

  it('cada lote ativo ocupa uma baia própria e cabe nela; os animais do lote batem com a entrada − óbitos', () => {
    const lotes = seed.lotesConfinamento.filter((l) => l.status === 'ativo')
    expect(lotes.length).toBeGreaterThan(0)
    const baias = lotes.map((l) => l.baiaId)
    expect(new Set(baias).size).toBe(baias.length)
    for (const l of lotes) {
      const baia = seed.baias.find((b) => b.id === l.baiaId)!
      const cab = ativos.filter((a) => a.loteId === l.id).length
      const mortos = seed.animais.filter((a) => a.loteId === l.id && a.status === 'morto').length
      expect(cab).toBeLessThanOrEqual(baia.capacidade)
      expect(cab + mortos).toBe(l.qtdEntrada)
      expect(seed.lotes.some((x) => x.id === l.id && x.finalidade === 'terminacao')).toBe(true)
    }
    expect(seed.fazenda.totalCabecas).toBe(ativos.length)
  })

  it('dietas somam 100% com ingredientes do estoque; o custo por kg sai do custo médio', () => {
    for (const d of seed.dietas) {
      expect(d.ingredientes.reduce((s, i) => s + i.pct, 0)).toBe(100)
      for (const i of d.ingredientes) expect(seed.estoque.some((e) => e.id === i.itemEstoqueId)).toBe(true)
      expect(custoKgDieta(d, seed.estoque)).toBeGreaterThan(0.3)
      expect(custoKgDieta(d, seed.estoque)).toBeLessThan(2)
    }
  })

  it('leituras de cocho: uma por baia por dia até ontem, a de hoje pendente; saídas de ingredientes = soma das batidas', () => {
    const leituras = seed.leiturasCocho.filter((l) => l.baiaId)
    expect(leituras.length).toBeGreaterThan(300)
    const chaves = leituras.map((l) => `${l.loteId}|${l.data}`)
    expect(new Set(chaves).size).toBe(chaves.length)
    expect(leituras.some((l) => l.data === HOJE)).toBe(false)
    const ontem = '2026-10-06'
    const lotesAtivos = seed.lotesConfinamento.filter((l) => l.status === 'ativo')
    for (const l of lotesAtivos) expect(leituras.some((x) => x.loteId === l.id && x.data === ontem)).toBe(true)
    // batida por ingrediente
    const esperado = new Map<string, number>()
    for (const l of leituras) {
      const d = seed.dietas.find((x) => x.id === l.dietaId)!
      for (const i of d.ingredientes) esperado.set(i.itemEstoqueId, (esperado.get(i.itemEstoqueId) ?? 0) + (l.kgCalculado * i.pct) / 100)
    }
    for (const [itemId, kg] of esperado) {
      const saidas = seed.movEstoque
        .filter((m) => m.tipo === 'saida' && m.itemId === itemId && m.obs?.startsWith('Batida'))
        .reduce((s, m) => s + m.quantidade, 0)
      // arredondamento por dia: diferença menor que 1 kg por dia de batida
      expect(Math.abs(saidas - kg)).toBeLessThan(new Set(leituras.map((l) => l.data)).size)
    }
    for (const item of seed.estoque) expect(item.saldo).toBeGreaterThanOrEqual(0)
  })

  it('indicadores dos lotes ficam em faixas realistas (GMD, consumo, conversão, custo/@)', () => {
    for (const l of seed.lotesConfinamento.filter((x) => x.status === 'ativo')) {
      const r = resumoLote(seed, l)
      expect(r.gmd).toBeGreaterThan(0.6)
      expect(r.gmd).toBeLessThan(2)
      expect(r.consumoPctPV).toBeGreaterThan(1.3)
      expect(r.consumoPctPV).toBeLessThan(3)
      if (r.diasCocho > 20) {
        expect(r.conversaoAlimentar).toBeGreaterThan(4)
        expect(r.conversaoAlimentar).toBeLessThan(12)
        expect(r.custoArrobaProduzida).toBeGreaterThan(100)
        expect(r.custoArrobaProduzida).toBeLessThan(450)
      }
      expect(r.custoTotal).toBeCloseTo(r.custoEntrada + r.custoAlimentacao + r.custoFixo + r.custoSanitario, 2)
      expect(r.arrobaEquilibrio).toBeGreaterThan(200)
      expect(r.diasRestantes).toBeGreaterThanOrEqual(0)
    }
    const r = resumoConfinamento(seed)
    expect(r.cab).toBe(ativos.filter((a) => a.categoria === 'boi_terminacao').length)
    expect(r.margemProjetada).toBeGreaterThan(0)
    expect(r.abates30).toBeGreaterThan(0)
  })

  it('abates anteriores: receita = carcaça ÷ 15 × preço, e cada um tem receita no Financeiro e venda no livro', () => {
    expect(seed.abates.length).toBeGreaterThan(0)
    for (const a of seed.abates) {
      expect(a.receita).toBe(Math.round((a.pesoCarcacaTotal / 15) * a.precoArroba))
      expect(a.rendimentoReal).toBeCloseTo((a.pesoCarcacaTotal / (a.qtd * a.pesoVivoMedio)) * 100, 0)
      expect(seed.lancamentos.some((l) => l.origem === 'venda_animal' && l.refId === a.id && l.valor === a.receita)).toBe(true)
      expect(seed.movimentacoes.some((m) => m.tipo === 'venda' && m.quantidade === a.qtd && m.brinco === a.loteNome)).toBe(true)
      expect(a.margem).toBe(a.receita - a.custoTotal)
    }
    // compra dos lotes comprados também está no Financeiro
    for (const l of seed.lotesConfinamento.filter((x) => x.status === 'ativo' && x.origem === 'compra')) {
      expect(seed.lancamentos.some((x) => x.origem === 'compra_animal' && x.refId === l.id && x.valor === l.qtdEntrada * l.custoCabEntrada)).toBe(true)
    }
  })

  it('enfermaria: óbitos viram animal morto + morte no livro; medicamentos saem do estoque; há carência cumprida', () => {
    for (const e of seed.enfermaria) {
      const animal = seed.animais.find((a) => a.id === e.animalId)!
      expect(animal.brinco).toBe(e.brinco)
      expect(animal.sanitario.some((s) => s.tipo === 'Tratamento')).toBe(true)
      if (e.destino === 'obito') {
        expect(animal.status).toBe('morto')
        expect(seed.movimentacoes.some((m) => m.tipo === 'morte' && m.brinco === e.brinco)).toBe(true)
      }
      if (e.itemEstoqueId) {
        expect(seed.movEstoque.some((m) => m.tipo === 'saida' && m.itemId === e.itemEstoqueId && m.obs?.startsWith(e.brinco))).toBe(true)
      }
    }
    const abertos = enfermariaAberta(seed)
    expect(abertos.length).toBeGreaterThan(0)
    const alertas = alertasConfinamento(seed)
    const tipos = alertas.map((a) => a.titulo)
    expect(tipos.some((t) => t.includes('carência cumprida'))).toBe(true)
    expect(tipos.some((t) => t.includes('consumo caiu'))).toBe(true)
    expect(tipos.some((t) => t.includes('muita sobra'))).toBe(true)
    expect(tipos.some((t) => t.includes('sem leitura de cocho hoje'))).toBe(true)
    expect(tipos.some((t) => t.includes('estoque para'))).toBe(true)
    expect(tipos.some((t) => t.includes('abaixo da meta'))).toBe(true)
  })

  it('baias: ocupação nunca passa de 100% e as livres aparecem como livres', () => {
    const st = baiasStatus(seed)
    expect(st.length).toBe(seed.baias.length)
    for (const b of st) expect(b.ocupacaoPct).toBeLessThanOrEqual(100)
    expect(st.filter((b) => b.livre).length).toBeGreaterThan(0)
  })

  it('consumo do lote: previsto segue a dieta e o peso; o realizado de ontem é o da leitura', () => {
    const lote = seed.lotesConfinamento.find((l) => l.id === 'CF-01')!
    const serie = consumoLote(seed, lote, 7)
    expect(serie.length).toBe(7)
    const ult = serie[serie.length - 1]
    const leitura = seed.leiturasCocho.find((l) => l.loteId === lote.id && l.data === ult.data)!
    expect(ult.realizado).toBe(leitura.kgCalculado)
    expect(ult.previsto).toBeGreaterThan(ult.realizado * 0.8)
    expect(ult.previsto).toBeLessThan(ult.realizado * 1.25)
    expect(diffDays(lote.dataEntrada, HOJE)).toBe(98)
  })

  it('viabilidade: 300 cabeças rendem 3× o lucro de 100 e os giros/ano seguem os dias de cocho', () => {
    const base = { pesoEntrada: 380, pesoSaida: 540, precoArrobaMagro: 320, agioPct: 8, precoArrobaGordo: 325, gmd: 1.4, custoDiaCab: 15, rendimento: 54, mortalidadePct: 1, diasVazioBaia: 10 }
    const v100 = viabilidade({ cabecas: 100, ...base })
    const v300 = viabilidade({ cabecas: 300, ...base })
    expect(v300.lucro).toBeCloseTo(v100.lucro * 3, 2)
    expect(v100.dias).toBe(Math.ceil(160 / 1.4))
    expect(v100.giros).toBeCloseTo(365 / (v100.dias + 10), 5)
    expect(v100.custoCab).toBeCloseTo((380 / 30) * 320 * 1.08, 1)
  })
})
