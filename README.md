# VTX.GROW — Sistema de diagnóstico e planejamento da Vortex Company

Vite + React + TypeScript + Supabase (projeto **VTX.GROW**, `jhtlbxerjaqhbtltqvxj`).

## Rodar

```bash
corepack pnpm install
corepack pnpm dev
```

> O `npm` desta máquina está corrompido ("Class extends value undefined"), por isso o projeto usa **pnpm via corepack**.

## Configuração (`.env`)

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — já preenchidos (chave publicável, segura no frontend).
- `VITE_VORTEX_WHATSAPP` — **troque pelo número real da Vortex** (só dígitos, com 55). É para onde vão os botões "Falar com a Vortex".

## Admin

Quem se cadastrar com `contato@mateusgestor7.com.br` vira **admin** automaticamente e vê o menu "Painel admin" (`/admin`):
todos os leads, respostas, diagnóstico completo, fit comercial (só a Vortex vê), status comercial, notas internas, versões, exportação e log de auditoria.
Para dar acesso a outra pessoa: `update public.profiles set role = 'admin' where email = '...';` (ou `'analyst'`).

## Estrutura

- `src/lib/questions.ts` — as 30 perguntas e as 7 etapas do questionário.
- `src/lib/engine.ts` — motor **determinístico**: scores (4 pilares + 5 etapas da jornada), GAP, funil reverso, CAC máximo, cenários, fit de canais (Google/Meta), gargalos, plano 7/30/90 dias/12 meses, auditoria de comunicação, fit comercial.
- `src/components/Report.tsx` — telas do relatório (compartilhadas entre cliente e admin).
- `src/pages/` — Auth, Questionário, Cliente, Admin.

- `src/lib/projects.ts` — catálogo de projetos (box, janelas, portas, guarda-corpo…) e cálculo das peças de vidro.
- `src/lib/quotes.ts` — cálculo do orçamento (área, totais, PIX, parcelas).
- `src/lib/quotePdf.tsx` — PDF de vendas (carregado só quando usado).
- `supabase/functions/simulate` — função que gera a imagem com IA.

## Simulador de IA

Usa o modelo de imagem do Google (`gemini-nano-banana-2.1`). A chave nunca vai para o navegador: fica nos Secrets da função.

No Supabase: **Edge Functions → Secrets**, adicione:

- `GEMINI_API_KEY` — chave criada em aistudio.google.com/apikey (obrigatória; o projeto do Google precisa ter faturamento ativo).
- `AI_MONTHLY_LIMIT` — limite de imagens por conta em 30 dias (opcional, padrão 60).
- `GEMINI_IMAGE_MODEL` — troca o modelo sem mexer no código (opcional).

Para republicar a função: `supabase functions deploy simulate --no-verify-jwt` (ela valida o login internamente).

## Banco (Supabase)

`profiles`, `diagnostics` (cada envio é uma versão; respostas em `answers`, análise em `result`), `admin_notes`, `audit_log`, `business_profiles`, `simulations`, `quotes` e o bucket privado `project-images`. Simulações, orçamentos e imagens são visíveis só para o dono da conta.
RLS: cliente só vê o que é dele; admin/analista veem tudo; cliente não altera papel nem status comercial. Senhas ficam no Supabase Auth (hash) — ninguém vê.

## Pendências recomendadas no painel do Supabase

- Authentication → Providers → Email: decidir se mantém **Confirm email** ligado (hoje o usuário precisa confirmar o e-mail antes de entrar).
- Authentication → URL Configuration: colocar a URL de produção em *Site URL* / *Redirect URLs* quando publicar.
- Authentication → Password security: ativar **Leaked password protection**.
