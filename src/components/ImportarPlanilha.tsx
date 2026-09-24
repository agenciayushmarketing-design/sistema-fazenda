import { useMemo, useState, type ChangeEvent } from 'react'
import { Download, FileUp, Sparkles } from 'lucide-react'
import { useStore, type LinhaImportAnimal } from '@/store/useStore'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { baixarArquivo, lerCSV, lerData, lerNumero, normalizar } from '@/lib/planilha'
import { CATEGORIA_LABEL, type Categoria } from '@/data/types'
import { fmtDate, fmtNum, hojeISO, idadeMeses } from '@/lib/format'

type Modo = 'animais' | 'pesagens'

const CABECALHO: Record<Modo, string> = {
  animais: 'brinco;sexo;categoria;raca;nascimento;lote;peso;origem',
  pesagens: 'brinco;data;peso',
}

interface LinhaValidada {
  linha: number
  valores: string[]
  erro?: string
}

/** Categoria a partir do texto da planilha (aceita rótulo, chave e sinônimos comuns) */
function lerCategoria(texto: string, nascimento: string | null): Categoria | null {
  const t = normalizar(texto)
  for (const [chave, rotulo] of Object.entries(CATEGORIA_LABEL)) {
    if (t === chave || t === normalizar(rotulo)) return chave as Categoria
  }
  if (t.startsWith('novilha')) {
    return nascimento && idadeMeses(nascimento) >= 24 ? 'novilha_24' : 'novilha_13_24'
  }
  if (t === 'boi' || t.startsWith('boi ')) return 'boi_terminacao'
  if (t === 'matriz') return 'vaca'
  return null
}

export function ImportarPlanilha({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore()
  const importarAnimais = useStore((s) => s.importarAnimais)
  const importarPesagens = useStore((s) => s.importarPesagens)
  const [modo, setModo] = useState<Modo>('animais')
  const [texto, setTexto] = useState('')

  const ativos = useMemo(() => state.animais.filter((a) => a.status === 'ativo'), [state.animais])

  const exemplo = (m: Modo) => {
    const lotes = state.lotes
    const l0 = lotes[0]?.nome ?? ''
    const l1 = lotes.find((l) => l.finalidade === 'reproducao')?.nome ?? l0
    if (m === 'animais') {
      const existente = ativos.find((a) => a.categoria === 'vaca')?.brinco ?? 'V-0001'
      return [
        CABECALHO.animais,
        `IMP-001;F;Vaca;Nelore;15/03/2019;${l0};455;compra`,
        `IMP-002;F;Novilha;Nelore PO;10/08/2024;${l1};310;compra`,
        `IMP-003;M;Touro;Nelore PO;02/01/2020;${l0};820;compra`,
        `IMP-004;F;Vaca;Nelore;;${l0};440;compra`,
        `${existente};F;Vaca;Nelore;01/01/2018;${l0};450;compra`,
      ].join('\n')
    }
    const alvo = ativos.filter((a) => a.categoria === 'garrote' || a.categoria === 'novilha_13_24').slice(0, 4)
    const base = alvo.length > 0 ? alvo : ativos.slice(0, 4)
    const hoje = fmtDate(hojeISO())
    return [
      CABECALHO.pesagens,
      ...base.map((a) => `${a.brinco};${hoje};${String(Math.round(a.pesoAtual + 8)).replace('.', ',')}`),
      `XX-999;${hoje};300`,
    ].join('\n')
  }

  const validadas = useMemo<{ linhas: LinhaValidada[]; animais: LinhaImportAnimal[]; pesagens: { animalId: string; data: string; peso: number }[] }>(() => {
    const registros = lerCSV(texto)
    const linhas: LinhaValidada[] = []
    const animais: LinhaImportAnimal[] = []
    const pesagens: { animalId: string; data: string; peso: number }[] = []
    const brincosAtivos = new Set(ativos.map((a) => a.brinco.toLowerCase()))
    const vistos = new Set<string>()
    registros.forEach((r, i) => {
      const n = i + 2 // linha na planilha (1 = cabeçalho)
      if (modo === 'animais') {
        const valores = [r.brinco, r.sexo, r.categoria, r.raca, r.nascimento, r.lote, r.peso, r.origem].map((v) => v ?? '')
        const brinco = (r.brinco ?? '').trim()
        const nascimento = lerData(r.nascimento ?? '')
        const categoria = lerCategoria(r.categoria ?? '', nascimento)
        const lote = state.lotes.find((l) => normalizar(l.nome) === normalizar(r.lote ?? '') || l.id.toLowerCase() === (r.lote ?? '').trim().toLowerCase())
        const peso = lerNumero(r.peso ?? '')
        const sexoTxt = normalizar(r.sexo ?? '')
        const sexoLido: 'M' | 'F' | null = ['m', 'macho'].includes(sexoTxt) ? 'M' : ['f', 'femea'].includes(sexoTxt) ? 'F' : null
        const sexoCat: 'M' | 'F' | null = categoria
          ? (['bezerra', 'novilha_13_24', 'novilha_24', 'vaca'] as Categoria[]).includes(categoria) ? 'F' : 'M'
          : null
        const racaTxt = normalizar(r.raca ?? '')
        const raca = racaTxt.includes('girolando') ? 'Girolando' : racaTxt.includes('po') ? 'Nelore PO' : 'Nelore'
        const origem = normalizar(r.origem ?? '') === 'nascimento' ? 'nascimento' : 'compra'

        let erro: string | undefined
        if (!brinco) erro = 'Sem brinco'
        else if (brincosAtivos.has(brinco.toLowerCase())) erro = 'Brinco já existe no rebanho'
        else if (vistos.has(brinco.toLowerCase())) erro = 'Brinco repetido na planilha'
        else if (!categoria) erro = `Categoria "${r.categoria ?? ''}" não reconhecida`
        else if (!nascimento) erro = 'Nascimento ausente ou inválido'
        else if (nascimento > hojeISO()) erro = 'Nascimento no futuro'
        else if (!lote) erro = `Lote "${r.lote ?? ''}" não existe nesta fazenda`
        else if (!peso || peso <= 0) erro = 'Peso inválido'
        else if (sexoLido && sexoCat && sexoLido !== sexoCat) erro = 'Sexo não bate com a categoria'
        vistos.add(brinco.toLowerCase())
        linhas.push({ linha: n, valores, erro })
        if (!erro) {
          animais.push({
            brinco,
            sexo: sexoCat!,
            categoria: categoria!,
            raca,
            nascimento: nascimento!,
            loteId: lote!.id,
            peso: peso!,
            origem,
          })
        }
      } else {
        const valores = [r.brinco, r.data, r.peso].map((v) => v ?? '')
        const animal = ativos.find((a) => a.brinco.toLowerCase() === (r.brinco ?? '').trim().toLowerCase())
        const data = lerData(r.data ?? '')
        const peso = lerNumero(r.peso ?? '')
        let erro: string | undefined
        if (!animal) erro = `Brinco "${r.brinco ?? ''}" não encontrado`
        else if (!data) erro = 'Data inválida'
        else if (data > hojeISO()) erro = 'Data no futuro'
        else if (!peso || peso <= 0) erro = 'Peso inválido'
        else if (Math.abs(peso - animal.pesoAtual) > animal.pesoAtual * 0.35) {
          erro = `Peso fora da curva (atual ${fmtNum(animal.pesoAtual)} kg) — confira`
        }
        linhas.push({ linha: n, valores, erro })
        if (!erro) pesagens.push({ animalId: animal!.id, data: data!, peso: peso! })
      }
    })
    return { linhas, animais, pesagens }
  }, [texto, modo, ativos, state.lotes])

  const validas = modo === 'animais' ? validadas.animais.length : validadas.pesagens.length
  const comErro = validadas.linhas.filter((l) => l.erro).length

  const abrirArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    if (/\.xlsx?$/i.test(arq.name)) {
      toast('No Excel, use "Salvar como → CSV" e abra o arquivo .csv aqui.', 'error')
      return
    }
    setTexto(await arq.text())
  }

  const importar = () => {
    const n = modo === 'animais' ? importarAnimais(validadas.animais) : importarPesagens(validadas.pesagens)
    toast(
      modo === 'animais'
        ? `${n} animal(is) importado(s) para o rebanho${comErro ? ` — ${comErro} linha(s) com erro ficaram de fora` : ''}.`
        : `${n} pesagem(ns) importada(s)${comErro ? ` — ${comErro} linha(s) com erro ficaram de fora` : ''}.`,
    )
    setTexto('')
    onClose()
  }

  const colunas = CABECALHO[modo].split(';')

  return (
    <Dialog open={open} onClose={onClose} title="Importar planilha" className="max-w-3xl">
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-md border bg-secondary p-0.5">
        {(['animais', 'pesagens'] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setModo(m)
              setTexto('')
            }}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium',
              modo === m ? 'border border-border bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'animais' ? 'Cadastro de animais' : 'Pesagens'}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[12px] text-muted-foreground">
        Colunas: <span className="font-mono text-[11px]">{CABECALHO[modo]}</span> — separadas por ponto e vírgula
        (padrão do Excel em português). Datas como 25/03/2024, pesos com vírgula.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-secondary">
          <FileUp className="h-3.5 w-3.5" /> Abrir arquivo .csv
          <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={abrirArquivo} />
        </label>
        <Button size="sm" variant="outline" onClick={() => setTexto(exemplo(modo))}>
          <Sparkles className="h-3 w-3" /> Usar planilha de exemplo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => baixarArquivo(`modelo-${modo}.csv`, `${CABECALHO[modo]}\n`)}
        >
          <Download className="h-3 w-3" /> Baixar modelo
        </Button>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="…ou cole aqui as linhas copiadas do Excel (com o cabeçalho)"
        className="mt-2 h-24 w-full rounded-md border border-input bg-white px-2.5 py-1.5 font-mono text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        spellCheck={false}
      />

      {validadas.linhas.length > 0 && (
        <>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            <Badge variant="good">{validas} linha(s) prontas</Badge>
            {comErro > 0 && <Badge variant="critical">{comErro} com erro — ficam de fora</Badge>}
          </div>
          <div className="mt-2 max-h-56 overflow-auto rounded-md border">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  {colunas.map((c) => (
                    <th key={c} className="px-2 py-1 text-left">{c}</th>
                  ))}
                  <th className="px-2 py-1 text-left">Situação</th>
                </tr>
              </thead>
              <tbody>
                {validadas.linhas.map((l) => (
                  <tr key={l.linha} className={cn('border-t', l.erro && 'bg-red-50')}>
                    <td className="px-2 py-1 text-muted-foreground">{l.linha}</td>
                    {l.valores.map((v, i) => (
                      <td key={i} className="whitespace-nowrap px-2 py-1">{v || '—'}</td>
                    ))}
                    <td className={cn('whitespace-nowrap px-2 py-1', l.erro ? 'text-red-700' : 'text-green-700')}>
                      {l.erro ?? 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={importar} disabled={validas === 0}>
          Importar {validas > 0 ? `${validas} linha(s)` : ''}
        </Button>
      </div>
    </Dialog>
  )
}
