// Leitura de planilha CSV (Excel "Salvar como CSV") — separador ; ou , e aspas

/** Converte o texto do CSV em linhas de objetos, com cabeçalho normalizado (minúsculo, sem acento) */
export function lerCSV(texto: string): Record<string, string>[] {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (linhas.length === 0) return []
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const quebrar = (linha: string) => {
    const campos: string[] = []
    let atual = ''
    let aspas = false
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]
      if (c === '"') {
        if (aspas && linha[i + 1] === '"') {
          atual += '"'
          i++
        } else aspas = !aspas
      } else if (c === sep && !aspas) {
        campos.push(atual.trim())
        atual = ''
      } else atual += c
    }
    campos.push(atual.trim())
    return campos
  }
  const cab = quebrar(linhas[0]).map(normalizar)
  return linhas.slice(1).map((l) => {
    const valores = quebrar(l)
    return Object.fromEntries(cab.map((c, i) => [c, valores[i] ?? '']))
  })
}

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Aceita 25/03/2024, 25/03/24 e 2024-03-25 → ISO; null se inválida */
export function lerData(s: string): string | null {
  const t = s.trim()
  let y: number, m: number, d: number
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (br) {
    d = Number(br[1])
    m = Number(br[2])
    y = Number(br[3].length === 2 ? `20${br[3]}` : br[3])
  } else if (iso) {
    y = Number(iso[1])
    m = Number(iso[2])
    d = Number(iso[3])
  } else return null
  const data = new Date(Date.UTC(y, m - 1, d))
  if (data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null
  return data.toISOString().slice(0, 10)
}

/** Aceita "320,5", "320.5" e "1.320,5" → número; null se inválido */
export function lerNumero(s: string): number | null {
  const t = s.trim().replace(/\s|kg/gi, '')
  if (!t) return null
  // vírgula = decimal pt-BR (1.250,5); sem vírgula, "1.250" é milhar e "0.6" é decimal
  const n = t.includes(',')
    ? Number(t.replace(/\./g, '').replace(',', '.'))
    : /^-?\d{1,3}(\.\d{3})+$/.test(t)
      ? Number(t.replace(/\./g, ''))
      : Number(t)
  return Number.isFinite(n) ? n : null
}

/** Baixa um texto como arquivo (modelo de planilha) */
export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
