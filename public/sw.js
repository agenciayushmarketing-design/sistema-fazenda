/* Service worker da demo: deixa o app abrir e navegar sem sinal.
   Estratégia: navegação = rede primeiro (cai pro cache offline);
   assets com hash = cache primeiro (são imutáveis). */
const CACHE = 'fazenda-demo-v1'
const PAGINA = 'pagina-principal'

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // guarda a página principal já na instalação (base do modo offline)
      try {
        const resposta = await fetch('./')
        await cache.put(PAGINA, resposta)
      } catch {
        /* sem rede na instalação: o runtime preenche depois */
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const chaves = await caches.keys()
      await Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        try {
          const resposta = await fetch(req)
          cache.put(PAGINA, resposta.clone())
          return resposta
        } catch {
          const guardada = await cache.match(PAGINA, { ignoreVary: true })
          if (guardada) return guardada
          return Response.error()
        }
      })(),
    )
    return
  }

  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      // ignoreVary: os scripts do app chegam com cabeçalho Origin e alguns servidores
      // respondem "Vary: Origin" — sem isso o cache não reconhece o arquivo guardado.
      // Seguro aqui: os assets têm hash no nome e nunca mudam.
      const guardada = await cache.match(req, { ignoreVary: true })
      if (guardada) return guardada
      const resposta = await fetch(req)
      if (resposta.ok) cache.put(req, resposta.clone())
      return resposta
    })(),
  )
})
