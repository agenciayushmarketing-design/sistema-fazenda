import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  alertas, apartacoesPorMes, arrobasProduzidas, custoPorArroba, custoPorCentro, custoTotalRateado, gmdUltimos3,
  inventarioPorCategoria, metricasCria, metricasFinanceiro, metricasReproducao, nomeMembro,
  partosPrevistosPorMes, previsaoApartacao, qtdLoteRecria, uaPorPasto, uaTotal, ativos,
} from '@/lib/metrics'
import { CATEGORIA_LABEL, type Categoria } from '@/data/types'
import { KG_POR_ARROBA, PERFIL_INFO } from '@/data/seed'
import { fmtBRL, fmtDate, fmtKg1, fmtMesAno, fmtNum, fmtNum1, fmtNum2, fmtPct, hojeISO } from '@/lib/format'
import { resumoConfinamento } from '@/lib/confinamento'
import { incoerencias, metricasMes, dre as dreCalc, statusTarefa } from '@/lib/gestao'
import type { Store } from '@/store/useStore'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b pb-1 text-[13px] font-bold uppercase tracking-wide">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 py-1 text-[13px]">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="tnum font-semibold">{valor}</span>
    </div>
  )
}

function TabelaRelatorio({ cab, linhas }: { cab: string[]; linhas: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b">
          {cab.map((c, i) => (
            <th key={c} className={`py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? 'text-left' : 'text-right'}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l, i) => (
          <tr key={i} className="border-b border-border/50">
            {l.map((c, j) => (
              <td key={j} className={`tnum py-1 ${j === 0 ? 'text-left' : 'text-right'}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  )
}

function RelatorioSafra({ state }: { state: Store }) {
  const cria = metricasCria(state)
  const repro = metricasReproducao(state)
  const apartMeses = apartacoesPorMes(state)
  const aoPe = previsaoApartacao(state)
  const partosMeses = partosPrevistosPorMes(state)

  return (
    <>
      <Secao titulo="Cria — safra atual">
        <LinhaDado rotulo="Matrizes expostas (estação passada)" valor={fmtNum(state.estacoes[0]?.matrizesExpostas ?? 0)} />
        <LinhaDado rotulo="Partos registrados" valor={fmtNum(cria.partos)} />
        <LinhaDado rotulo="Taxa de natalidade" valor={fmtPct(cria.natalidadePct)} />
        <LinhaDado rotulo="Mortalidade pré-desmame" valor={`${fmtPct(cria.mortalidadePct)} (${cria.mortes} mortes)`} />
        <LinhaDado rotulo="Desmamados / taxa de desmame projetada" valor={`${fmtNum(cria.desmamados)} · ${fmtPct(cria.taxaDesmamePct)}`} />
        {cria.desmamados > 0 && (
          <>
            <LinhaDado rotulo="Peso médio ao desmame (aj. 205 dias)" valor={fmtKg1(cria.pesoDesmame205)} />
            <LinhaDado rotulo="Kg de bezerro desmamado por matriz" valor={fmtKg1(cria.kgBezerroPorMatriz)} />
          </>
        )}
        <LinhaDado rotulo={`Intervalo entre partos (média de ${cria.matrizesComIP} matrizes)`} valor={cria.intervaloPartosDias > 0 ? `${cria.intervaloPartosDias} dias` : '—'} />
      </Secao>

      <Secao titulo="Reprodução — estação atual">
        <LinhaDado rotulo="Matrizes expostas" valor={fmtNum(repro.expostas)} />
        <LinhaDado rotulo="Prenhez IATF" valor={`${fmtPct(repro.prenhezIATFPct)} (${repro.prenhasIATF}/${repro.dosesIATF} doses)`} />
        <LinhaDado rotulo="Prenhez acumulada" valor={`${fmtPct(repro.prenhezFinalPct)} (${repro.prenhasTotal}/${repro.expostas})`} />
        <LinhaDado rotulo="Prenhezes de repasse (touro)" valor={fmtNum(repro.prenhasTouro)} />
        <LinhaDado rotulo="Diagnósticos pendentes" valor={fmtNum(repro.pendentes)} />
        <LinhaDado rotulo="ECC médio das matrizes" valor={fmtNum1(repro.eccMedio)} />
        <LinhaDado rotulo="Custo por prenhez (sêmen + hormônios)" valor={fmtBRL(repro.custoPorPrenhez)} />
        {repro.prenhezPorTerco.length > 0 && (
          <div className="mt-2">
            <TabelaRelatorio
              cab={['Terço da estação', 'Prenhezes']}
              linhas={repro.prenhezPorTerco.map((t) => [t.terco, fmtNum(t.prenhezes)])}
            />
          </div>
        )}
      </Secao>

      {aoPe.length > 0 && (
        <Secao titulo="Previsão de apartação (8 meses)">
          <LinhaDado rotulo="Bezerros ao pé" valor={fmtNum(aoPe.length)} />
          <div className="mt-2">
            <TabelaRelatorio
              cab={['Mês previsto', 'Bezerros a apartar']}
              linhas={apartMeses.map((m) => [fmtMesAno(m.mes), fmtNum(m.qtd)])}
            />
          </div>
        </Secao>
      )}

      {partosMeses.length > 0 && (
        <Secao titulo="Nascimentos previstos (DPP das prenhas)">
          <TabelaRelatorio
            cab={['Mês previsto', 'Partos previstos']}
            linhas={partosMeses.map((m) => [fmtMesAno(m.mes), fmtNum(m.qtd)])}
          />
        </Secao>
      )}
    </>
  )
}

function RelatorioInventario({ state }: { state: Store }) {
  const inv = inventarioPorCategoria(state.animais)
  const vivos = ativos(state.animais)
  const ua = uaTotal(state.animais)
  const pastos = uaPorPasto(state)

  const linhasCategorias = (Object.entries(inv) as [Categoria, number][])
    .filter(([, qtd]) => qtd > 0)
    .map(([cat, qtd]) => {
      const animais = vivos.filter((a) => a.categoria === cat)
      const kg = animais.reduce((s, a) => s + a.pesoAtual, 0)
      return [
        CATEGORIA_LABEL[cat],
        fmtNum(qtd),
        fmtNum(Math.round(kg / Math.max(qtd, 1))) + ' kg',
        fmtNum1(kg / 450),
      ]
    })

  return (
    <>
      <Secao titulo="Inventário por categoria">
        <TabelaRelatorio
          cab={['Categoria', 'Cabeças', 'Peso médio', 'UA']}
          linhas={[
            ...linhasCategorias,
            ['TOTAL', fmtNum(vivos.length), '—', fmtNum1(ua)],
          ]}
        />
      </Secao>

      <Secao titulo="Ocupação dos pastos">
        <TabelaRelatorio
          cab={['Pasto', 'Área (ha)', 'UA', 'Capacidade', 'Ocupação']}
          linhas={pastos.map(({ pasto, ua: uaP }) => [
            pasto.nome,
            fmtNum(pasto.areaHa),
            fmtNum1(uaP),
            fmtNum(pasto.capacidadeUA),
            fmtPct((uaP / pasto.capacidadeUA) * 100),
          ])}
        />
        <div className="mt-2">
          <LinhaDado rotulo="Lotação média da fazenda" valor={`${fmtNum2(ua / state.fazenda.areaHa)} UA/ha`} />
        </div>
      </Secao>
    </>
  )
}

function RelatorioFinanceiro({ state }: { state: Store }) {
  const fin = metricasFinanceiro(state)
  const centros = custoPorCentro(state)
  const totalRateado = custoTotalRateado(state)
  const arrobas = arrobasProduzidas(state)

  return (
    <>
      <Secao titulo="Resumo do caixa — últimos 30 dias">
        <LinhaDado rotulo="Receitas recebidas" valor={fmtBRL(fin.receitasMes)} />
        <LinhaDado rotulo="Despesas pagas" valor={fmtBRL(fin.despesasMes)} />
        <LinhaDado rotulo="Resultado" valor={fmtBRL(fin.resultadoMes)} />
        <LinhaDado rotulo="Contas a pagar (em aberto)" valor={fmtBRL(fin.aPagar)} />
        <LinhaDado rotulo="Contas a receber (em aberto)" valor={fmtBRL(fin.aReceber)} />
        <LinhaDado rotulo="Contas vencidas" valor={fmtNum(fin.vencidas)} />
      </Secao>

      <Secao titulo="Fluxo de caixa — últimos 12 meses">
        <TabelaRelatorio
          cab={['Mês', 'Receitas', 'Despesas', 'Resultado']}
          linhas={fin.fluxo12m.map((f) => [
            fmtMesAno(f.mes),
            fmtBRL(f.receitas),
            fmtBRL(f.despesas),
            fmtBRL(f.resultado),
          ])}
        />
      </Secao>

      <Secao titulo="Custos de insumos por centro de custo">
        <TabelaRelatorio
          cab={['Centro', 'Valor', '% do total']}
          linhas={Object.entries(centros).map(([c, v]) => [
            c === 'Terminacao' ? 'Terminação' : c,
            fmtBRL(v),
            totalRateado > 0 ? fmtPct((v / totalRateado) * 100) : '—',
          ])}
        />
        {arrobas > 0 && (
          <div className="mt-2">
            <LinhaDado rotulo="Arrobas produzidas no período" valor={`${fmtNum1(arrobas)} @`} />
            <LinhaDado rotulo="Custo por @ produzida" valor={fmtBRL(custoPorArroba(state))} />
          </div>
        )}
      </Secao>
    </>
  )
}

function RelatorioDia({ state }: { state: Store }) {
  const hoje = hojeISO()
  const doDia = <T extends { data: string }>(itens: T[]) => itens.filter((i) => i.data === hoje)

  const partos = doDia(state.partos)
  const desmames = doDia(state.desmames)
  const manejos = doDia(state.manejosSanitarios)
  const rondas = doDia(state.rondas)
  const movs = doDia(state.movimentacoes)
  const estoqueDia = doDia(state.movEstoque)
  const financeiroDia = state.lancamentos.filter((l) => l.pagamento === hoje || l.vencimento === hoje)
  const pesagensLote = state.lotesRecria
    .map((l) => ({ lote: l, pes: l.pesagens.filter((p) => p.data === hoje) }))
    .filter((x) => x.pes.length > 0)
  const leiteHoje = state.producaoLeite.find((p) => p.data === hoje)
  const confPendentes = state.conferencias.filter((c) => c.status === 'pendente')
  const salDia = doDia(state.fornecimentosSal)
  const cochoDia = doDia(state.leiturasCocho)
  const abatesDia = doDia(state.abates)
  const tarefasDia = state.ordensServico.filter((o) => o.conclusao === hoje)
  const calendarioDia = state.tarefasSanitarias.filter((t) => t.concluidaEm === hoje)
  const enfermariaDia = state.enfermaria.filter((e) => e.entrada === hoje || e.saida === hoje)
  const loteNome = (id: string) => state.lotes.find((l) => l.id === id)?.nome ?? id

  const nada =
    partos.length + desmames.length + manejos.length + rondas.length + movs.length +
    estoqueDia.length + financeiroDia.length + pesagensLote.length + salDia.length + cochoDia.length + abatesDia.length + enfermariaDia.length + tarefasDia.length + calendarioDia.length === 0 &&
    !leiteHoje

  return (
    <>
      {nada && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Nenhum lançamento registrado hoje ainda — o fechamento vai se preenchendo conforme o dia.
        </p>
      )}
      {pesagensLote.length > 0 && (
        <Secao titulo="Pesagens de lote do dia">
          <TabelaRelatorio
            cab={['Lote', 'Peso médio']}
            linhas={pesagensLote.map((x) => [x.lote.nome, `${fmtNum1(x.pes[x.pes.length - 1].peso)} kg`])}
          />
        </Secao>
      )}
      {cochoDia.length > 0 && (
        <Secao titulo="Leitura de cocho e trato do dia">
          <TabelaRelatorio
            cab={['Lote', 'Nota', 'Trato', 'Kg/cab', 'Por']}
            linhas={cochoDia.map((l) => [
              loteNome(l.loteId),
              l.nota,
              `${fmtNum(l.kgCalculado)} kg`,
              fmtNum1(l.kgCalculado / l.cabecas),
              nomeMembro(state, l.responsavelId),
            ])}
          />
        </Secao>
      )}
      {(tarefasDia.length > 0 || calendarioDia.length > 0) && (
        <Secao titulo="Tarefas concluídas hoje">
          <TabelaRelatorio
            cab={['Tarefa', 'Tipo', 'Por', 'Observação']}
            linhas={[
              ...tarefasDia.map((o) => [o.titulo, 'OS', nomeMembro(state, o.concluidaPorId), o.conclusaoObs ?? '—']),
              ...calendarioDia.map((t) => [t.titulo, 'Calendário sanitário', '—', t.alvo]),
            ]}
          />
        </Secao>
      )}
      {abatesDia.length > 0 && (
        <Secao titulo="Abates do dia">
          <TabelaRelatorio
            cab={['Lote', 'Frigorífico', 'Cab', 'Rendimento', '@', 'Receita', 'Margem']}
            linhas={abatesDia.map((a) => [a.loteNome, a.frigorifico, a.qtd, fmtPct(a.rendimentoReal), fmtNum1(a.pesoCarcacaTotal / 15), fmtBRL(a.receita), fmtBRL(a.margem)])}
          />
        </Secao>
      )}
      {enfermariaDia.length > 0 && (
        <Secao titulo="Enfermaria do dia">
          <TabelaRelatorio
            cab={['Brinco', 'Lote', 'Diagnóstico', 'Movimento']}
            linhas={enfermariaDia.map((e) => [e.brinco, loteNome(e.loteId), e.diagnostico, e.saida === hoje ? (e.destino === 'alta' ? 'alta' : 'óbito') : 'entrada'])}
          />
        </Secao>
      )}
      {salDia.length > 0 && (
        <Secao titulo="Salga do dia">
          <TabelaRelatorio
            cab={['Lote', 'Kg no cocho', 'Cabeças', 'Por']}
            linhas={salDia.map((f) => [loteNome(f.loteId), fmtNum(f.kg), fmtNum(f.cabecas), nomeMembro(state, f.responsavelId)])}
          />
        </Secao>
      )}
      {leiteHoje && (
        <Secao titulo="Leite do dia">
          <LinhaDado rotulo="Produção no tanque" valor={`${fmtNum(leiteHoje.litros)} L`} />
        </Secao>
      )}
      {partos.length > 0 && (
        <Secao titulo="Partos do dia">
          <TabelaRelatorio
            cab={['Matriz', 'Bezerro(a)', 'Sexo', 'Peso']}
            linhas={partos.map((p) => [p.matrizBrinco, p.bezerroBrinco, p.sexo, fmtKg1(p.pesoNascer)])}
          />
        </Secao>
      )}
      {desmames.length > 0 && (
        <Secao titulo="Desmames / apartações do dia">
          <TabelaRelatorio
            cab={['Bezerro(a)', 'Peso', 'Idade (dias)']}
            linhas={desmames.map((d) => [d.bezerroBrinco, fmtKg1(d.peso), d.idadeDias])}
          />
        </Secao>
      )}
      {manejos.length > 0 && (
        <Secao titulo="Manejos sanitários do dia">
          <TabelaRelatorio
            cab={['Manejo', 'Alvo', 'Animais', 'Responsável']}
            linhas={manejos.map((m) => [m.produto, m.alvo, fmtNum(m.qtdAnimais), m.responsavel])}
          />
        </Secao>
      )}
      {rondas.length > 0 && (
        <Secao titulo="Rondas do dia">
          <TabelaRelatorio
            cab={['Pasto', 'Responsável', 'Ocorrências']}
            linhas={rondas.map((r) => [
              state.pastos.find((p) => p.id === r.pastoId)?.nome ?? r.pastoId,
              r.responsavel,
              r.ocorrencias.length,
            ])}
          />
        </Secao>
      )}
      {movs.length > 0 && (
        <Secao titulo="Movimentações do rebanho">
          <TabelaRelatorio
            cab={['Tipo', 'Brinco/lote', 'Qtd', 'Por']}
            linhas={movs.map((m) => [m.tipo, m.brinco, m.quantidade, nomeMembro(state, m.responsavelId)])}
          />
        </Secao>
      )}
      {estoqueDia.length > 0 && (
        <Secao titulo="Estoque do dia">
          <TabelaRelatorio
            cab={['Insumo', 'Tipo', 'Qtd', 'Por']}
            linhas={estoqueDia.map((m) => [
              state.estoque.find((i) => i.id === m.itemId)?.nome ?? m.itemId,
              m.tipo,
              fmtNum(m.quantidade),
              nomeMembro(state, m.responsavelId),
            ])}
          />
        </Secao>
      )}
      {financeiroDia.length > 0 && (
        <Secao titulo="Financeiro do dia">
          <TabelaRelatorio
            cab={['Descrição', 'Tipo', 'Valor', 'Situação']}
            linhas={financeiroDia.map((l) => [
              l.descricao,
              l.tipo,
              fmtBRL(l.valor),
              l.pagamento ? 'pago/recebido' : 'em aberto',
            ])}
          />
        </Secao>
      )}
      <Secao titulo="Conferências pendentes">
        {confPendentes.length === 0 ? (
          <LinhaDado rotulo="Lançamentos do campo aguardando visto" valor="nenhum" />
        ) : (
          <TabelaRelatorio
            cab={['Tipo', 'Lançamento', 'Por']}
            linhas={confPendentes.map((c) => [c.tipo, c.resumo, nomeMembro(state, c.responsavelId)])}
          />
        )}
      </Secao>
    </>
  )
}

function RelatorioConfinamento({ state }: { state: Store }) {
  const r = resumoConfinamento(state)
  const abates = [...state.abates].sort((a, b) => b.data.localeCompare(a.data))
  return (
    <>
      <Secao titulo="Painel geral">
        <LinhaDado rotulo="Cabeças no cocho" valor={`${fmtNum(r.cab)} em ${r.baiasOcupadas}/${r.baiasTotal} baias (${fmtPct(r.ocupacaoPct)})`} />
        <LinhaDado rotulo="GMD médio" valor={`${fmtNum2(r.gmd)} kg/dia`} />
        <LinhaDado rotulo="Conversão alimentar" valor={`${fmtNum1(r.conversaoAlimentar)} : 1 (${fmtNum1(r.msCabDia)} kg MS/cab/dia)`} />
        <LinhaDado rotulo="Custo diário por cabeça" valor={fmtBRL(r.custoDiarioCab)} />
        <LinhaDado rotulo="Custo por @ produzida × cotação" valor={`${fmtBRL(r.custoArrobaProduzida)} × ${fmtBRL(r.precoArroba)}`} />
        <LinhaDado rotulo="Margem projetada no abate" valor={fmtBRL(r.margemProjetada)} />
        <LinhaDado rotulo="Enfermaria / mortalidade" valor={`${r.naEnfermaria} animais · ${fmtPct(r.mortalidadePct)}`} />
      </Secao>
      <Secao titulo="Lotes no cocho (ordem de abate)">
        <TabelaRelatorio
          cab={['Lote', 'Baia', 'Cab', 'Dias', 'Peso', 'GMD', 'CA', 'Custo/@', 'Abate previsto', 'Margem']}
          linhas={r.lotes.map((l) => [
            l.lote.nome, l.baia?.nome ?? '—', l.cab, l.diasCocho, `${fmtNum(l.pesoAtual)} kg`, fmtNum2(l.gmd), fmtNum1(l.conversaoAlimentar),
            fmtBRL(l.custoArrobaProduzida), fmtDate(l.dataAbatePrevista), fmtBRL(l.margemProjetada),
          ])}
        />
      </Secao>
      {abates.length > 0 && (
        <Secao titulo="Abates realizados">
          <TabelaRelatorio
            cab={['Data', 'Lote', 'Cab', 'Rend. real', '@', 'R$/@', 'Receita', 'Margem']}
            linhas={abates.map((a) => [fmtDate(a.data), a.loteNome, a.qtd, fmtPct(a.rendimentoReal), fmtNum1(a.pesoCarcacaTotal / 15), fmtBRL(a.precoArroba), fmtBRL(a.receita), fmtBRL(a.margem)])}
          />
        </Secao>
      )}
    </>
  )
}

function RelatorioGerencial({ state }: { state: Store }) {
  const inv = inventarioPorCategoria(state.animais)
  const total = ativos(state.animais).length
  const pesoVivo = ativos(state.animais).reduce((s, a) => s + a.pesoAtual, 0)
  const fin = metricasFinanceiro(state)
  const mes = metricasMes(state)
  const d = dreCalc(state)
  const al = alertas(state)
  const inc = incoerencias(state)
  const pend = state.conferencias.filter((c) => c.status === 'pendente')
  const tarefasAtrasadas = state.tarefasSanitarias.filter((t) => statusTarefa(t) === 'atrasada')
  const conf = state.lotesConfinamento.length > 0 ? resumoConfinamento(state) : null
  return (
    <>
      <Secao titulo="Rebanho">
        <LinhaDado rotulo="Cabeças ativas" valor={`${fmtNum(total)} · ${fmtNum1(pesoVivo / 1000)} t de peso vivo · ${fmtNum1(pesoVivo / KG_POR_ARROBA)} @`} />
        <div className="mt-2">
          <TabelaRelatorio cab={['Categoria', 'Cabeças']} linhas={(Object.entries(inv) as [Categoria, number][]).filter(([, q]) => q > 0).map(([c, q]) => [CATEGORIA_LABEL[c], fmtNum(q)])} />
        </div>
      </Secao>
      {state.lotesRecria.length > 0 && (
        <Secao titulo="GMD por lote de recria">
          <TabelaRelatorio
            cab={['Lote', 'Cab', 'Entrada', 'Peso atual', 'GMD (3 pesos)', 'Meta', 'Situação']}
            linhas={state.lotesRecria.map((l) => {
              const g = gmdUltimos3(l)
              const ult = [...l.pesagens].sort((a, b) => a.data.localeCompare(b.data)).at(-1)
              return [l.nome, fmtNum(qtdLoteRecria(state.animais, l.id)), fmtDate(l.dataEntrada), ult ? fmtKg1(ult.peso) : '—', fmtNum2(g), fmtNum2(l.gmdMeta), g >= l.gmdMeta ? 'na meta' : 'abaixo da meta']
            })}
          />
        </Secao>
      )}
      {conf && (
        <Secao titulo="Confinamento">
          <LinhaDado rotulo="Cabeças no cocho" valor={`${fmtNum(conf.cab)} · GMD ${fmtNum2(conf.gmd)} · conversão ${fmtNum1(conf.conversaoAlimentar)}`} />
          <LinhaDado rotulo="Custo/@ produzida × cotação" valor={`${fmtBRL(conf.custoArrobaProduzida)} × ${fmtBRL(conf.precoArroba)}`} />
          <LinhaDado rotulo="Margem projetada" valor={fmtBRL(conf.margemProjetada)} />
        </Secao>
      )}
      <Secao titulo="Financeiro">
        <LinhaDado rotulo={`Resultado do mês (${fmtMesAno(mes.mes + '-01')})`} valor={`${fmtBRL(mes.resMes)} (receitas ${fmtBRL(mes.recMes)} · despesas ${fmtBRL(mes.despMes)})`} />
        <LinhaDado rotulo="Resultado 12 meses" valor={`${fmtBRL(d.resultado)} · margem ${fmtPct(d.margemPct)}`} />
        <LinhaDado rotulo="A pagar / a receber" valor={`${fmtBRL(fin.aPagar)} / ${fmtBRL(fin.aReceber)}`} />
        <LinhaDado rotulo="Contas vencidas" valor={fmtNum(fin.vencidas)} />
        <LinhaDado rotulo="Custo por @ produzida" valor={fmtBRL(custoPorArroba(state))} />
      </Secao>
      <Secao titulo="Controle">
        <LinhaDado rotulo="Alertas ativos" valor={`${fmtNum(al.length)} (${al.filter((a) => a.severidade === 'critical').length} graves)`} />
        <LinhaDado rotulo="Lançamentos aguardando conferência" valor={fmtNum(pend.length)} />
        <LinhaDado rotulo="Incoerências apontadas" valor={fmtNum(inc.length)} />
        <LinhaDado rotulo="Tarefas sanitárias atrasadas" valor={fmtNum(tarefasAtrasadas.length)} />
        {al.length > 0 && (
          <div className="mt-2">
            <TabelaRelatorio cab={['Alerta', 'Detalhe']} linhas={al.slice(0, 12).map((a) => [a.titulo, a.detalhe])} />
          </div>
        )}
      </Secao>
    </>
  )
}

const TITULOS = {
  gerencial: 'Relatório Gerencial',
  dia: 'Fechamento do Dia',
  confinamento: 'Painel do Confinamento',
  safra: 'Relatório da Safra',
  inventario: 'Inventário do Rebanho',
  financeiro: 'Resumo Financeiro',
} as const

export default function Relatorios() {
  const state = useStore()
  const [searchParams] = useSearchParams()
  const relParam = searchParams.get('rel')
  const [tipo, setTipo] = useState<keyof typeof TITULOS>(
    relParam && relParam in TITULOS ? (relParam as keyof typeof TITULOS) : 'gerencial',
  )
  const info = PERFIL_INFO[state.perfil]
  const tipos = (Object.keys(TITULOS) as (keyof typeof TITULOS)[]).filter((t) => t !== 'confinamento' || state.lotesConfinamento.length > 0)

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Relatórios"
          subtitle="Documentos prontos para imprimir ou salvar em PDF — o que está na tela é o que sai no papel"
          actions={
            <Button onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Imprimir / salvar PDF
            </Button>
          }
        />
        <div className="mb-3 inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-md border bg-secondary p-0.5">
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors touch:py-2',
                tipo === t
                  ? 'border border-border bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {TITULOS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="relatorio mx-auto max-w-3xl rounded-lg border bg-white p-6 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-foreground pb-3">
          <div>
            <div className="text-lg font-bold leading-tight">{state.fazenda.nome}</div>
            <div className="text-xs text-muted-foreground">
              {state.fazenda.areaHa} ha · {info.descricao}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold uppercase tracking-wide">{TITULOS[tipo]}</div>
            <div className="tnum text-xs text-muted-foreground">Emitido em {fmtDate(hojeISO())}</div>
          </div>
        </div>

        {tipo === 'dia' && <RelatorioDia state={state} />}
        {tipo === 'gerencial' && <RelatorioGerencial state={state} />}
        {tipo === 'confinamento' && <RelatorioConfinamento state={state} />}
        {tipo === 'safra' && <RelatorioSafra state={state} />}
        {tipo === 'inventario' && <RelatorioInventario state={state} />}
        {tipo === 'financeiro' && <RelatorioFinanceiro state={state} />}

        <div className="mt-8 grid grid-cols-2 gap-8 break-inside-avoid">
          <div className="border-t pt-1 text-center text-[11px] text-muted-foreground">Responsável técnico</div>
          <div className="border-t pt-1 text-center text-[11px] text-muted-foreground">Proprietário</div>
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Documento gerado pela demonstração — dados fictícios, criados localmente no navegador.
        </p>
      </div>
    </div>
  )
}
