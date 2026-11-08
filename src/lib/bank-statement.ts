// Parser determinístico de extratos Nubank (texto extraído do PDF). Não usa IA.
export type StatementTx = {
  date: string; // YYYY-MM-DD
  kind: "receita" | "despesa";
  amount: number;
  description: string;
  category: string;
};

const MONTHS: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
};

const MONEY = /(\d{1,3}(?:\.\d{3})*,\d{2})$/;
const DAY = /^(\d{2}) (JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ) (\d{4})\b(.*)$/;
const TOTAL = /^Total de (entradas|saídas)\s*[+-]\s*[\d.,]+$/;

export const toNumber = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/** Remove cabeçalhos/rodapés repetidos de cada página. */
function cleanLines(text: string): string[] {
  const out: string[] = [];
  let skip = false;
  let started = false;
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    if (!started) { if (l === "Movimentações") started = true; continue; }
    if (/^Extrato gerado dia|^Tem alguma dúvida\?/.test(l)) { skip = true; continue; }
    if (skip) { if (/VALORES EM R\$$/.test(l)) skip = false; continue; }
    if (/^O saldo líquido|^Saldo do dia|^Saldo final do período/.test(l)) continue;
    out.push(l);
  }
  return out;
}

export function categorize(desc: string, kind: "receita" | "despesa"): string {
  const d = desc.toLowerCase();
  if (/aplicação rdb|resgate rdb|rdb|caixinha/.test(d)) return "investimentos";
  if (kind === "receita") return "negocios";
  if (/merc|super|sacol|padaria|pao|açougue|acougue|hortifruti|emporio|ifood|restaurante|lanch/.test(d)) return "alimentacao";
  if (/drogaria|farm|saude|clinica|hospital/.test(d)) return "saude";
  if (/aluguel|energia|cemig|copasa|agua|internet|nucel|celular|telefon/.test(d)) return "moradia";
  if (/posto|uber|99|combust|onibus|transporte/.test(d)) return "transporte";
  if (/disney|netflix|spotify|cinema/.test(d)) return "lazer";
  return "outros";
}

function tidy(desc: string) {
  return desc
    .replace(/\s+/g, " ")
    .replace(/ - (?:•••|\d{2}\.\d{3}).*$/, "") // remove documento/banco/agência
    .replace(/\(Transferência (enviada|recebida)\)/, "")
    .trim()
    .slice(0, 200);
}

export function parseNubankStatement(text: string): StatementTx[] {
  const lines = cleanLines(text);
  const out: StatementTx[] = [];
  let date = "";
  let kind: "receita" | "despesa" | null = null;
  let buf: string[] = [];
  for (let l of lines) {
    const dm = l.match(DAY);
    if (dm) { date = `${dm[3]}-${MONTHS[dm[2]]}-${dm[1]}`; l = dm[4].trim(); buf = []; if (!l) continue; }
    if (TOTAL.test(l)) { kind = l.includes("entradas") ? "receita" : "despesa"; buf = []; continue; }
    const m = l.match(MONEY);
    if (m && date && kind) {
      const head = l.slice(0, l.length - m[1].length).trim();
      const desc = tidy([...buf, head].join(" "));
      buf = [];
      if (!desc) continue;
      out.push({ date, kind, amount: toNumber(m[1]), description: desc, category: categorize(desc, kind) });
      continue;
    }
    buf.push(l);
  }
  return out;
}

/** Chave estável para não duplicar o mesmo lançamento vindo de arquivos sobrepostos. */
export function txRefs(account: string, txs: StatementTx[]): string[] {
  const seen = new Map<string, number>();
  return txs.map((t) => {
    const base = `${account}|${t.date}|${t.kind}|${t.amount.toFixed(2)}|${t.description.toLowerCase()}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}|${n}`;
  });
}
