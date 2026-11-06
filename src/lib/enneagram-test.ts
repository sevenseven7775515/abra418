/** Teste rápido de Eneagrama: 2 afirmações por tipo, escala 1–5. Cálculo determinístico. */
export const ENNEAGRAM_QUESTIONS: { type: string; text: string }[] = [
  { type: "1", text: "Percebo rapidamente o que está errado e sinto necessidade de corrigir." },
  { type: "1", text: "Tenho um crítico interno exigente que raramente se cala." },
  { type: "2", text: "Costumo perceber o que os outros precisam antes deles pedirem." },
  { type: "2", text: "Tenho dificuldade em dizer não e pedir ajuda para mim." },
  { type: "3", text: "Sinto que meu valor depende do que eu conquisto." },
  { type: "3", text: "Adapto minha imagem para causar boa impressão e alcançar metas." },
  { type: "4", text: "Sinto que sou diferente e que algo essencial me falta." },
  { type: "4", text: "Minhas emoções intensas guiam muito do que faço." },
  { type: "5", text: "Prefiro observar e entender a fundo antes de agir." },
  { type: "5", text: "Protejo meu tempo, energia e privacidade com cuidado." },
  { type: "6", text: "Antecipo riscos e penso no que pode dar errado." },
  { type: "6", text: "Busco segurança e confiança antes de me comprometer." },
  { type: "7", text: "Fico entediado facilmente e busco novas experiências e ideias." },
  { type: "7", text: "Evito sentir dor ou tristeza mantendo a mente ocupada com planos." },
  { type: "8", text: "Assumo o controle naturalmente e enfrento conflitos de frente." },
  { type: "8", text: "Detesto me sentir vulnerável ou controlado por alguém." },
  { type: "9", text: "Evito conflitos e acabo cedendo para manter a paz." },
  { type: "9", text: "Adio minhas próprias prioridades e me distraio com tarefas menores." },
];

export const ENNEAGRAM_ASPECTS: Record<string, { positivos: string[]; negativos: string[] }> = {
  "1": { positivos: ["Ética e integridade", "Organização e padrão alto", "Senso de responsabilidade"], negativos: ["Rigidez e perfeccionismo", "Raiva reprimida e crítica", "Dificuldade de relaxar"] },
  "2": { positivos: ["Empatia e generosidade", "Calor humano", "Capacidade de apoiar"], negativos: ["Esquecer as próprias necessidades", "Busca de aprovação", "Ressentimento quando não reconhecido"] },
  "3": { positivos: ["Foco em resultado", "Energia e eficiência", "Capacidade de inspirar"], negativos: ["Identidade presa ao desempenho", "Workaholismo", "Desconexão dos sentimentos"] },
  "4": { positivos: ["Profundidade emocional", "Criatividade e autenticidade", "Sensibilidade estética"], negativos: ["Melancolia e comparação", "Oscilação de humor", "Sensação de inadequação"] },
  "5": { positivos: ["Análise profunda", "Independência intelectual", "Calma sob pressão"], negativos: ["Isolamento e distanciamento", "Excesso de análise antes de agir", "Acúmulo em vez de execução"] },
  "6": { positivos: ["Lealdade e comprometimento", "Prevenção de riscos", "Trabalho em equipe"], negativos: ["Ansiedade e dúvida", "Desconfiança", "Procrastinação por medo"] },
  "7": { positivos: ["Otimismo e entusiasmo", "Versatilidade", "Geração de ideias"], negativos: ["Dispersão e impulsividade", "Fuga da dor", "Dificuldade de concluir"] },
  "8": { positivos: ["Força e coragem", "Proteção dos seus", "Decisão rápida"], negativos: ["Dominação e excesso", "Impaciência", "Dificuldade com vulnerabilidade"] },
  "9": { positivos: ["Calma e aceitação", "Mediação de conflitos", "Estabilidade"], negativos: ["Inércia e procrastinação", "Autoesquecimento", "Evitar posicionamento"] },
};

export function scoreEnneagram(answers: number[]) {
  const scores: Record<string, number> = {};
  ENNEAGRAM_QUESTIONS.forEach((q, i) => { scores[q.type] = (scores[q.type] ?? 0) + (answers[i] ?? 0); });
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const main = ranked[0][0];
  const n = Number(main);
  const left = String(n === 1 ? 9 : n - 1);
  const right = String(n === 9 ? 1 : n + 1);
  const wing = (scores[left] ?? 0) >= (scores[right] ?? 0) ? left : right;
  return { main, wing, scores, ranked };
}
