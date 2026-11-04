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

## Banco (Supabase)

`profiles`, `diagnostics` (cada envio é uma versão; respostas em `answers`, análise em `result`), `admin_notes`, `audit_log`.
RLS: cliente só vê o que é dele; admin/analista veem tudo; cliente não altera papel nem status comercial. Senhas ficam no Supabase Auth (hash) — ninguém vê.

## Pendências recomendadas no painel do Supabase

- Authentication → Providers → Email: decidir se mantém **Confirm email** ligado (hoje o usuário precisa confirmar o e-mail antes de entrar).
- Authentication → URL Configuration: colocar a URL de produção em *Site URL* / *Redirect URLs* quando publicar.
- Authentication → Password security: ativar **Leaked password protection**.
