export type EnneagramInfo = {
  type: string;
  name: string;
  summary: string;
  fear: string;
  desire: string;
  virtue: string;
  growth: string;
};

export const ENNEAGRAM: Record<string, EnneagramInfo> = {
  "1": { type: "1", name: "O Perfeccionista", summary: "Principiado, ético e orientado a melhorar o que existe.", fear: "Ser corrupto, defeituoso ou errado.", desire: "Ser íntegro e correto.", virtue: "Serenidade", growth: "Aceitar o inacabado e relaxar o crítico interno." },
  "2": { type: "2", name: "O Prestativo", summary: "Empático, generoso e voltado a relações.", fear: "Não ser querido ou necessário.", desire: "Ser amado.", virtue: "Humildade", growth: "Reconhecer e nomear as próprias necessidades." },
  "3": { type: "3", name: "O Realizador", summary: "Adaptável, produtivo e orientado a resultados.", fear: "Ser sem valor sem conquistas.", desire: "Sentir-se valioso.", virtue: "Autenticidade", growth: "Separar identidade de desempenho." },
  "4": { type: "4", name: "O Individualista", summary: "Sensível, introspectivo e expressivo.", fear: "Não ter identidade ou significado próprio.", desire: "Ser único e verdadeiro consigo.", virtue: "Equanimidade", growth: "Agir mesmo sem o humor perfeito." },
  "5": { type: "5", name: "O Investigador", summary: "Perceptivo, analítico e independente; acumula conhecimento antes de agir.", fear: "Ser invadido, incapaz ou dependente.", desire: "Ser competente e autossuficiente.", virtue: "Desapego", growth: "Compartilhar o que sabe e habitar o corpo e o mundo." },
  "6": { type: "6", name: "O Leal", summary: "Comprometido, precavido e orientado à segurança.", fear: "Ficar sem apoio ou orientação.", desire: "Segurança e estabilidade.", virtue: "Coragem", growth: "Confiar na própria autoridade interna." },
  "7": { type: "7", name: "O Entusiasta", summary: "Versátil, otimista e ávido por experiências.", fear: "Privação e dor.", desire: "Satisfação e liberdade.", virtue: "Sobriedade", growth: "Aprofundar em vez de dispersar." },
  "8": { type: "8", name: "O Desafiador", summary: "Poderoso, direto e protetor.", fear: "Ser controlado ou vulnerável.", desire: "Autodeterminação.", virtue: "Inocência", growth: "Permitir vulnerabilidade e ternura." },
  "9": { type: "9", name: "O Pacificador", summary: "Receptivo, estável e conciliador.", fear: "Perda e separação.", desire: "Paz interior e harmonia.", virtue: "Ação", growth: "Afirmar presença e prioridades próprias." },
};

export const MBTI_DEFAULT = {
  mbti_type: "INTJ",
  characteristics:
    "Estratégico, independente e orientado a sistemas de longo prazo. Pensa em estruturas, padrões e consequências futuras antes de agir.",
  strengths:
    "Visão de longo prazo, pensamento sistêmico, autonomia, alto padrão de qualidade e capacidade de simplificar o complexo.",
  watchouts:
    "Perfeccionismo, impaciência com processos lentos, tendência ao isolamento e excesso de análise antes da execução.",
  communication:
    "Direto, objetivo e conceitual. Prefere conversas com propósito, dados e clareza a conversas sociais amplas.",
  decision_making:
    "Decide por lógica interna e coerência com o objetivo maior; testa hipóteses mentalmente e busca a solução mais eficiente.",
};