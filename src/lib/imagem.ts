/**
 * Reduz a foto do celular para caber no aparelho (localStorage tem ~5 MB por site):
 * lado maior de até `max` px, JPEG — uma foto de 4 MB vira ~20 KB.
 */
export async function reduzirFoto(arquivo: File, max = 360, qualidade = 0.65): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error('Não foi possível ler a imagem.'))
      i.src = url
    })
    const escala = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * escala)
    canvas.height = Math.round(img.height * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Sem suporte a imagem neste navegador.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}
