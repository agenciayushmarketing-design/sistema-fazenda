# Demo de gestão de rebanho bovino — multi-perfil

**Demo online:** https://agenciayushmarketing-design.github.io/sistema-fazenda/

Aplicação **front-end apenas** (React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts) para demonstração comercial de um sistema de gestão pecuária. **Todos os dados são fictícios**: o dataset inteiro é gerado deterministicamente em [`src/data/seed.ts`](src/data/seed.ts) a partir de parâmetros declarados por perfil, com datas relativas ao dia atual (a demo não envelhece). Não há backend nem chamadas de rede — o estado vive em memória (Zustand), é persistido no `localStorage` do navegador e pode ser restaurado a qualquer momento pelo botão **"Restaurar dados da demo"**. Nenhuma informação sai do navegador.

## Perfis de demonstração

O seletor na barra lateral troca o cenário inteiro da demo:

- **Ciclo completo** — Fazenda Santa Helena, 800 ha, 1.200 cabeças (cria, recria, terminação)
- **Cria — 150 matrizes** — Sítio Boa Esperança: partos, IATF, IP por matriz e **previsão de apartação aos 8 meses**
- **Corte & Leite** — Fazenda Dois Córregos: tudo + **Financeiro**, **Máquinas e manutenção**, **Ordens de serviço** e **Leite**

## Rodar

```bash
npm install
npm run dev
```

## Testes de coerência

As identidades do dataset (inventário × partos × desmames × recria × estoque × compras × financeiro × leite) são validadas em todos os perfis:

```bash
npm run test
```

## Módulos

Dashboard · Rebanho (inventário, ficha individual, livro de movimentação) · Cria (estação de monta, partos, desmame, previsão de apartação, IP por matriz) · Recria (lotes, GMD, projeções) · Reprodução (IATF, DG, repasse) · Leite · Estoque · Compras (rateio por centro de custo) · Financeiro (fluxo de caixa, a pagar/receber) · Máquinas (horímetro, manutenções) · Ordens de serviço (abertura, acompanhamento, conclusão).
