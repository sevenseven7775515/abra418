// Fluxo mensal fixo: entradas e saídas recorrentes + dívidas. Cálculo determinístico.

export type FlowItem = {
  id?: string;
  kind: string; // receita | despesa | divida
  description: string;
  amount: number;
  recurrence: string; // mensal | semanal | anual | unica
  due_date: string | null;
  category: string;
};

/** Semanas médias por mês (52 / 12). */
export const WEEKS_PER_MONTH = 52 / 12;

export function monthlyAmount(i: Pick<FlowItem, "amount" | "recurrence">) {
  if (i.recurrence === "semanal") return i.amount * WEEKS_PER_MONTH;
  if (i.recurrence === "anual") return i.amount / 12;
  if (i.recurrence === "mensal") return i.amount;
  return 0;
}

/** Receitas encerradas pelo usuário: ignoradas mesmo se já salvas no banco. */
export const ENDED_INCOME = ["zanfer"];
export const isEnded = (i: Pick<FlowItem, "kind" | "description">) =>
  i.kind === "receita" && ENDED_INCOME.some((n) => i.description.toLowerCase().includes(n));

export function analyzeFlow(items: FlowItem[]) {
  const recurring = items.filter((i) => i.recurrence !== "unica" && !isEnded(i));
  const entradas = recurring.filter((i) => i.kind === "receita");
  const saidas = recurring.filter((i) => i.kind === "despesa");
  const dividas = items.filter((i) => i.kind === "divida");
  const totalIn = entradas.reduce((s, i) => s + monthlyAmount(i), 0);
  const totalOut = saidas.reduce((s, i) => s + monthlyAmount(i), 0);
  const totalDebt = dividas.reduce((s, i) => s + i.amount, 0);
  const sobra = totalIn - totalOut;
  return {
    entradas: [...entradas].sort((a, b) => dayOf(a) - dayOf(b)),
    saidas: [...saidas].sort((a, b) => monthlyAmount(b) - monthlyAmount(a)),
    dividas,
    totalIn,
    totalOut,
    sobra,
    totalDebt,
    /** Meses para quitar todas as dívidas usando 100% da sobra (null se não sobra nada). */
    mesesParaQuitar: sobra > 0 && totalDebt > 0 ? Math.ceil(totalDebt / sobra) : null,
  };
}

export function dayOf(i: Pick<FlowItem, "due_date">) {
  return i.due_date ? Number(i.due_date.slice(8, 10)) : 99;
}

function dateForDay(day: number, base = new Date()) {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(day).padStart(2, "0")}`;
}

/** Lista informada pelo usuário em 06/11/2026. */
export function userFlowSeed(base = new Date()): FlowItem[] {
  const inc = (day: number, amount: number, who: string): FlowItem => ({
    kind: "receita", description: who, amount, recurrence: "mensal", due_date: dateForDay(day, base), category: "negocios",
  });
  const out = (description: string, amount: number, category: string, recurrence = "mensal"): FlowItem => ({
    kind: "despesa", description, amount, recurrence, due_date: null, category,
  });
  const debt = (description: string, amount: number): FlowItem => ({
    kind: "divida", description, amount, recurrence: "unica", due_date: null, category: "outros",
  });
  return [
    inc(27, 400, "Juliano"),
    inc(5, 1500, "Leonardo Chaves"),
    inc(15, 500, "Hector"),
    inc(25, 300, "Mari Ismera"),
    inc(25, 200, "Cirlei"),
    inc(5, 100, "Thiago"),
    inc(27, 300, "CMA Imóveis"),
    out("Alimentação e compras da casa", 300, "alimentacao", "semanal"),
    out("Aluguel", 850, "moradia"),
    out("Pensão", 729.45, "outros"),
    out("Água (aprox.)", 200, "moradia"),
    out("Internet (aprox.)", 249.9, "moradia"),
    out("Energia elétrica (aprox.)", 200, "moradia"),
    out("Plano de celular (aprox.)", 30, "outros"),
    out("Seguro de vida (aprox.)", 25, "saude"),
    out("Seguro Pix (aprox.)", 10, "outros"),
    out("Disney+", 9.9, "lazer"),
    debt("Dívidas no meu CPF (aprox.)", 5000),
    debt("Dívidas no CPF da esposa (aprox.)", 15000),
  ];
}

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type BankTx = { kind: string; description: string; amount: number; tx_date: string | null };

/** Confronta as entradas/saídas fixas com o extrato do mês (determinístico, por nome ou valor). */
export function reconcileMonth(flow: FlowItem[], bank: BankTx[], today = new Date()) {
  const ym = today.toISOString().slice(0, 7);
  const day = today.getDate();
  const month = bank.filter((t) => t.tx_date?.startsWith(ym));
  const used = new Set<BankTx>();
  const a = analyzeFlow(flow);
  const incomes = a.entradas.map((e) => {
    const key = norm(e.description).split(/\s+/)[0] ?? "";
    const hit = month.find((t) => !used.has(t) && t.kind === "receita" && key.length > 2 && norm(t.description).includes(key));
    if (hit) used.add(hit);
    const d = dayOf(e);
    return { item: e, hit: hit ?? null, status: hit ? "recebido" : d < day ? "atrasado" : "previsto" } as const;
  });
  const bills = a.saidas.filter((s) => s.recurrence === "mensal" && s.amount >= 100).map((s) => {
    const key = norm(s.description).split(/[\s(]+/)[0] ?? "";
    const hit = month.find((t) => !used.has(t) && t.kind === "despesa" &&
      (norm(t.description).includes(key) || Math.abs(t.amount - s.amount) < 0.01));
    if (hit) used.add(hit);
    return { item: s, hit: hit ?? null };
  });
  const spent = month.filter((t) => t.kind === "despesa").reduce((x, t) => x + t.amount, 0);
  const received = month.filter((t) => t.kind === "receita").reduce((x, t) => x + t.amount, 0);
  return { incomes, bills, spent, received, expectedIn: a.totalIn, hasStatement: month.length > 0 };
}
