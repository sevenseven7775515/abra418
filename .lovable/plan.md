# PERSONAL OS como painel + HERMES como camada de inteligência

Plano incremental, aditivo e reversível. Nada fora de `/personal` é tocado, nenhum dado é apagado e nenhuma migração é destrutiva.

## Estado atual verificado (consultas feitas agora)

| Área | Registros | Situação |
|---|---|---|
| `journal_entries` | 270 | histórico importado e reorganizado |
| `timeline_events` | 14.051 | acontecimentos datados |
| `practice_history` | 1.718 | práticas detectadas |
| `journal_insights` / `journal_events` | 267 / 1.671 | estruturação por dia |
| `brain_notes` | 210 | notas |
| `tasks`, `missions`, `companies`, `clients`, `business_projects`, `finance_transactions` | 0 | criadas, porém vazias |

Observação: você mencionou ~299 registros históricos; o banco tem 270 diários. A diferença (arquivos sem data reconhecida ou duplicados no momento da importação) entra como primeira tarefa de auditoria da Fase 1, antes de qualquer outra coisa.

Consequência de produto: os módulos de vida pessoal já têm memória real; o lado profissional está zerado. Então o esforço vai para captura rápida + motor comercial, e não para mais um gerenciador de tarefas.

## Princípios de arquitetura

- Lembretes do iPhone continua sendo a execução. O PERSONAL OS não replica lista de tarefas recorrentes; `tasks` fica só para o que nasce de uma decisão do Hermes (próximo passo comercial, compromisso com prazo).
- WhatsApp para si mesmo continua a captura. O sistema ganha uma entrada de colagem rápida que transforma texto bruto em registros estruturados, sem formulário.
- HERMES é memória, contexto, padrão e direção — sugere, nunca executa nem envia nada.
- Toda resposta da inteligência cita a origem (data, diário, contato, evento). Sem fonte, a resposta diz que não sabe.

## A) Modelo de dados

Reaproveitar sem alterar: `journal_entries`, `journal_events`, `journal_insights`, `timeline_events`, `practice_history`, `practices`, `practice_logs`, `brain_notes`, `books`, `finance_transactions`, `companies`, `clients`, `business_projects`, `tasks`, `missions`, `life_goals`, `personal_values`, `self_profile`, `mbti_profile`, `enneagram_profile`.

Novas tabelas (todas com `user_id`, RLS por `auth.uid()`, GRANTs, `created_at`/`updated_at` com trigger):

1. `captures` — caixa de entrada bruta. Campos: `raw_text`, `source` (whatsapp/manual/voz), `captured_at`, `status` (novo/processado/descartado), `parsed` (jsonb), `linked_journal_id`, `linked_deal_id`.
2. `deals` — oportunidades comerciais. `title`, `client_id`, `company_id`, `stage` (contato/conversa/proposta/negociação/fechado/perdido), `value`, `probability`, `expected_close`, `source`, `next_step`, `next_step_date`, `last_touch_at`, `lost_reason`.
3. `deal_events` — histórico por oportunidade: `deal_id`, `kind` (nota/contato/proposta/mudança de estágio), `content`, `occurred_at`.
4. `contacts` — pessoas, separado de `clients` (empresa/conta): `name`, `role`, `channel`, `handle`, `client_id`, `notes`, `last_touch_at`.
5. `hermes_briefs` — briefings gerados: `kind` (diário/semanal), `ref_date`, `content` (jsonb), `sources` (jsonb), `feedback`.
6. `hermes_suggestions` — sugestões acionáveis: `brief_id`, `title`, `rationale`, `evidence` (jsonb), `domain` (pessoal/comercial), `status` (pendente/aceita/recusada/adiada), `acted_at`.

Índices: `captures(user_id,status,captured_at)`, `deals(user_id,stage,next_step_date)`, `deal_events(deal_id,occurred_at)`, `contacts(user_id,last_touch_at)`, `hermes_briefs(user_id,kind,ref_date)`, mais `timeline_events(user_id,event_date)` e `journal_entries(user_id,entry_date)` se ainda não existirem.

Extensões aditivas em tabelas existentes (apenas colunas opcionais): `tasks.origin` + `tasks.origin_id` (para rastrear "veio de uma sugestão do Hermes"), `clients.deal_stage_cache` não é necessário — fica fora.

## B) Motor de contexto e priorização

Módulo determinístico `src/lib/hermes-context.ts` que monta um snapshot factual: dias desde o último contato por oportunidade, prazos vencidos, energia/humor recentes, aderência de práticas, saldo financeiro, capturas não processadas. Priorização por regras explicáveis (dinheiro em risco > prazo estourado > follow-up parado > compromisso do dia > cuidado pessoal), cada item retornando o motivo e a evidência. A IA só redige e ordena o que o motor já calculou.

## C) Motor comercial / receita

Página `/personal/business` ganha uma aba "Pipeline": oportunidades por estágio, valor ponderado, follow-ups atrasados, contatos esfriando (sem toque há N dias) e receita prevista no mês. Sem automação de envio — cada follow-up é uma sugestão com botão "marcar como feito".

## D) Captura rápida

Novo módulo `/personal/capture`: um campo grande para colar o texto do dia (WhatsApp), botão "Interpretar". O parser determinístico reaproveita `journal-parse.ts` e `journal-reorg.ts` para extrair data, horários e práticas; a IA apenas classifica o que sobrou. Resultado vira uma tela de confirmação com os registros propostos (diário, eventos, práticas, oportunidades, contatos) e caixas de seleção. Nada grava sem confirmação.

## E) Assistente com dados reais

`assistant.functions.ts` passa a receber o snapshot do motor de contexto e a exigir citação de fonte. Regras no prompt: se a evidência não estiver no snapshot, responder "não tenho esse dado registrado". As respostas guardam `sources` para auditoria.

## F) Dashboard como centro de comando

Reorganizar em três faixas, preservando os painéis atuais mais abaixo: (1) Direção do Hermes — brief do dia com 3 sugestões e evidências; (2) Comercial — pipeline, follow-ups vencidos, receita prevista; (3) Estado pessoal — o bloco atual de energia/humor/disciplina e base histórica.

## G) Rotina diária e revisão semanal

Brief diário gerado sob demanda (botão, sem cron): o que aconteceu ontem, o que exige decisão hoje, o que está parado. Revisão semanal: evolução do pipeline, padrões do diário, aderência de práticas, e uma pergunta de direção. Ambos salvos em `hermes_briefs` para comparar semanas.

## H) Integração com o HERMES local

Não existe API do Mac disponível, então nada será inventado. O Hermes é implementado como camada lógica dentro do próprio PERSONAL OS (motor de contexto + briefs + sugestões). Ponto de extensão previsto: um endpoint público autenticado por segredo em `src/routes/api/public/` para, no futuro, receber contexto do Hermes local. Só será construído quando você confirmar que existe um cliente capaz de chamá-lo.

## I) Compatibilidade com o histórico

Nenhuma tabela de diário é alterada. O motor de contexto e o assistente leem `journal_entries`, `journal_events`, `journal_insights`, `timeline_events` e `practice_history` como estão. A reorganização e o backup existentes continuam funcionando.

## J) Proteção contra alucinação e duplicação

- Toda sugestão carrega `evidence` com ids e datas de origem; sem evidência, não é exibida.
- Captura sempre passa por confirmação humana.
- Deduplicação por chave natural antes de inserir: diário por `entry_date`, evento por (data, hora, descrição), oportunidade por (cliente, título).
- Conflito de data entre nome de arquivo e conteúdo mantém a regra atual e marca o registro para revisão.

## K) Fases e testes de aceitação

**Fase 0 — auditoria** (sem migração): conferir 270 × ~299, listar diários sem data e duplicados. Aceite: relatório na tela da Linha do Tempo.

**Fase 1 — dados**: migração aditiva com as 6 tabelas novas + índices + colunas opcionais em `tasks`. Aceite: tabelas criadas, RLS ativa, nada existente alterado.

**Fase 2 — captura**: módulo `/personal/capture` com confirmação. Aceite: colar um dia de WhatsApp gera diário + eventos + práticas corretos, sem duplicar se colado duas vezes.

**Fase 3 — comercial**: pipeline, contatos, follow-ups. Aceite: cadastrar uma oportunidade e ver follow-up atrasado aparecer no dashboard.

**Fase 4 — Hermes**: motor de contexto, brief diário, sugestões com evidência. Aceite: cada sugestão exibe a fonte; pergunta sem dado responde "não registrado".

**Fase 5 — revisão semanal e ajustes de dashboard**. Aceite: brief semanal comparável com a semana anterior.

Reversibilidade: cada fase é isolada; as tabelas novas podem ficar vazias sem afetar nada existente, e o dashboard antigo permanece funcional em todas as etapas.

## Arquivos envolvidos

Reutilizados: `src/lib/journal-parse.ts`, `journal-reorg.ts`, `personal-insights.ts`, `patterns.functions.ts`, `assistant.functions.ts`, `astro.ts`, `src/components/personal/kit.tsx`, `PersonalShell.tsx`, `personal-nav.ts`.

Novos: `src/lib/hermes-context.ts`, `src/lib/hermes.functions.ts`, `src/lib/capture.functions.ts`, `src/lib/pipeline.ts`, `src/routes/personal._app.capture.tsx`, `src/routes/personal._app.hermes.tsx`, `src/components/personal/HermesBrief.tsx`, `src/components/personal/CaptureReview.tsx`, `src/components/personal/Pipeline.tsx`.

Alterados: `personal._app.dashboard.tsx` (faixas novas acima do conteúdo atual), `personal._app.business.tsx` (aba Pipeline), `personal._app.ai.tsx` (respostas com fonte), `personal-nav.ts` (dois itens).
