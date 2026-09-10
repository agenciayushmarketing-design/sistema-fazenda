import { useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  apartacoesPorMes, arrobasProduzidas, custoPorArroba, custoPorCentro, custoTotalRateado,
  inventarioPorCategoria, metricasCria, metricasFinanceiro, metricasReproducao,
  partosPrevistosPorMes, previsaoApartacao, uaPorPasto, uaTotal, ativos,
} from '@/lib/metrics'
import { CATEGORIA_LABEL, type Categoria } from '@/data/types'
import { PERFIL_INFO } from '@/data/seed'
import { fmtBRL, fmtDate, fmtKg1, fmtMesAno, fmtNum, fmtNum1, fmtNum2, fmtPct, hojeISO } from '@/lib/format'
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

const TITULOS = {
  safra: 'Relatório da Safra',
  inventario: 'Inventário do Rebanho',
  financeiro: 'Resumo Financeiro',
} as const

export default function Relatorios() {
  const state = useStore()
  const [tipo, setTipo] = useState<keyof typeof TITULOS>('safra')
  const info = PERFIL_INFO[state.perfil]

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
          {(Object.keys(TITULOS) as (keyof typeof TITULOS)[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
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
