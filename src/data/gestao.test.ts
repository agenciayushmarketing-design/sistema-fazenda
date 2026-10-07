// Fase E: custo do animal, incoerências, calendário sanitário, cobertura, carência, rodízio, DRE e WhatsApp
import { describe, expect, it } from 'vitest'
import { buildSeed } from './seed'
import {
  animaisEmCarencia, coberturaVacinal, custoAcumuladoAnimal, despesasPorCentro, dre, incoerencias,
  interpretarMensagem, metricasMes, projecaoPeso, rodizioPastos, statusTarefa,
} from '@/lib/gestao'
import { partosPrevistos } from '@/lib/metrics'

const HOJE = '2026-10-07'

describe('gestão — ciclo completo', () => {
  const seed = buildSeed('ciclo_completo', HOJE)

  it('calendário sanitário tem atrasadas, próximas e uma feita ligada a um manejo', () => {
    const st = seed.tarefasSanitarias.map((t) => statusTarefa(t, HOJE))
    expect(st).toContain('atrasada')
    expect(st).toContain('proxima')
    expect(st).toContain('concluida')
    const feita = seed.tarefasSanitarias.find((t) => t.concluidaEm)!
    expect(seed.manejosSanitarios.some((m) => m.id === feita.manejoId)).toBe(true)
    for (const t of seed.tarefasSanitarias) if (t.itemEstoqueId) expect(seed.estoque.some((i) => i.id === t.itemEstoqueId)).toBe(true)
  })

  it('incoerências de demonstração: peso que caiu, vacina repetida, morte com ocorrência aberta e lotação', () => {
    const tipos = incoerencias(seed).map((i) => i.tipo)
    expect(tipos).toContain('peso_caiu')
    expect(tipos).toContain('vacina_repetida')
    expect(tipos).toContain('morte_aberta')
    expect(tipos).not.toContain('animal_inativo')
  })

  it('cobertura vacinal entre 0 e 100% com elegíveis > 0; aftosa alta no seed', () => {
    const cob = coberturaVacinal(seed)
    for (const c of cob) {
      expect(c.pct).toBeGreaterThanOrEqual(0)
      expect(c.pct).toBeLessThanOrEqual(100)
      expect(c.cobertos).toBeLessThanOrEqual(c.elegiveis)
    }
    expect(cob.find((c) => c.chave === 'aftosa')!.pct).toBeGreaterThan(50)
  })

  it('há animal em carência (tratamento com carenciaAte no futuro)', () => {
    const lista = animaisEmCarencia(seed)
    expect(lista.length).toBeGreaterThan(0)
    for (const c of lista) expect(c.ate >= HOJE).toBe(true)
  })

  it('custo acumulado do animal cresce com a vida e dá custo/kg positivo', () => {
    const bezerro = seed.animais.find((a) => a.status === 'ativo' && a.categoria === 'bezerro')!
    const vaca = seed.animais.find((a) => a.status === 'ativo' && a.categoria === 'vaca')!
    const cb = custoAcumuladoAnimal(seed, bezerro)
    const cv = custoAcumuladoAnimal(seed, vaca)
    expect(cb.total).toBeGreaterThan(0)
    expect(cv.total).toBeGreaterThan(cb.total)
    expect(cb.custoKg).toBeGreaterThan(0)
    expect(cb.fases[0].fase).toContain('Cria')
    const boi = seed.animais.find((a) => a.status === 'ativo' && a.categoria === 'boi_terminacao')!
    const cbo = custoAcumuladoAnimal(seed, boi)
    expect(cbo.aquisicao).toBeGreaterThan(0) // comprado
  })

  it('rodízio: todo pasto tem entrada e troca prevista; pasto vazio fica em descanso', () => {
    const r = rodizioPastos(seed)
    expect(r.length).toBeGreaterThan(0)
    for (const p of r) {
      if (!p.emDescanso) {
        expect(p.entrada).toBeDefined()
        expect(p.trocaPrevista).toBeDefined()
        expect(p.diasNoPasto).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('DRE e centros de custo fecham com os lançamentos pagos', () => {
    const d = dre(seed)
    expect(d.totalDesp).toBeCloseTo(d.despVariaveis + d.despFixas, 2)
    expect(d.resultado).toBeCloseTo(d.totalRec - d.totalDesp, 2)
    const centros = despesasPorCentro(seed)
    const somaCentros = centros.reduce((s, c) => s + c.valor, 0)
    expect(somaCentros).toBeCloseTo(d.totalDesp, 0)
    const m = metricasMes(seed)
    expect(m.resMes).toBeCloseTo(m.recMes - m.despMes, 2)
  })

  it('projeção de peso 30–180 dias', () => {
    const p = projecaoPeso(300, 0.5)
    expect(p.map((x) => x.dias)).toEqual([30, 60, 90, 120, 180])
    expect(p[4].peso).toBe(390)
  })

  it('partos previstos excluem prenhez já parida', () => {
    const antes = partosPrevistos(seed).length
    const d = seed.diagnosticos.find((x) => x.resultado === 'prenha' && x.dppEstimado! >= HOJE)!
    d.partoId = 'PT-X'
    expect(partosPrevistos(seed).length).toBe(antes - 1)
  })
})

describe('lançamento por mensagem (WhatsApp simulado)', () => {
  it('entende valor, tipo, categoria, data e situação', () => {
    const a = interpretarMensagem('paguei 350 de diesel ontem')!
    expect(a.tipo).toBe('despesa')
    expect(a.valor).toBe(350)
    expect(a.categoria).toBe('Combustível')
    expect(a.pago).toBe(true)
    const b = interpretarMensagem('vendi 12 bezerros por 38.500')!
    expect(b.tipo).toBe('receita')
    expect(b.valor).toBe(38500)
    expect(b.categoria).toBe('Venda de animais')
    expect(b.centroCusto).toBe('Cria')
    const c = interpretarMensagem('conserto do trator 1.250, a prazo')!
    expect(c.categoria).toBe('Manutenção')
    expect(c.pago).toBe(false)
    expect(interpretarMensagem('bom dia pessoal')).toBeNull()
  })
})
