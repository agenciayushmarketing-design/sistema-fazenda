# Fazenda Santa Helena — demo de gestão de rebanho bovino

Aplicação **front-end apenas** (React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts) para demonstração comercial de um sistema de gestão de rebanho de ciclo completo. **Todos os dados são fictícios**: o dataset inteiro é gerado deterministicamente em [`src/data/seed.ts`](src/data/seed.ts) a partir de parâmetros declarados no topo do arquivo, com datas relativas ao dia atual (a demo não envelhece). Não há backend nem chamadas de rede — o estado vive em memória (Zustand), é persistido no `localStorage` do navegador e pode ser restaurado a qualquer momento pelo botão **"Restaurar dados da demo"** no cabeçalho. Nenhuma informação sai do navegador.

## Rodar

```bash
npm install
npm run dev
```

## Testes de coerência

As identidades do dataset (inventário × partos × desmames × recria × estoque × compras × custo/@) são validadas por teste:

```bash
npm run test
```

## Módulos

Dashboard · Rebanho (inventário, ficha individual, livro de movimentação) · Cria (estação de monta, partos, desmame) · Recria (lotes, GMD, projeções) · Reprodução (IATF, DG, repasse) · Estoque · Compras (com rateio por centro de custo).
