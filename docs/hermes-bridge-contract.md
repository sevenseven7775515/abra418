# Contrato futuro — ponte Hermes local (Mac) ↔ PERSONAL OS

Status: NÃO implementado. Só será construído quando existir um cliente local real capaz de autenticar.

## Endpoint previsto
`POST /api/public/hermes/context` (server route TanStack, fora do login do site).

- Autenticação: header `X-Hermes-Signature` = HMAC-SHA256 do corpo com segredo `HERMES_BRIDGE_SECRET` (Project Secrets). Requisições sem assinatura válida → 401.
- Apenas grava em `captures` (status `novo`, source `hermes_local`). Nunca altera diário, deals ou tarefas diretamente — tudo passa pela revisão em /personal/capture.

## Corpo
```json
{ "captured_at": "2026-11-06T08:00:00-03:00", "raw_text": "...", "kind": "nota|contexto|decisao", "evidence": [{"tipo":"arquivo","ref":"..."}] }
```

## Leitura (opcional, futuro)
`GET /api/public/hermes/snapshot` com a mesma assinatura devolveria o `HermesSnapshot` de `src/lib/hermes-context.ts` (somente leitura).

## Regras
- Sem envio externo, sem cron, sem ação automática.
- Toda informação recebida exige confirmação humana antes de virar registro.
