import { describe, expect, it } from "vitest";
import { parseNubankStatement, txRefs } from "./bank-statement";

const SAMPLE = `Marcos
VALORES EM R$
Movimentações
01 NOV 2026 Total de entradas + 350,00
Transferência recebida pelo Pix HECTOR A VILCHEZ GUERRERO - 17.555.579/0001-
51 - BCO BANESTES S.A. (0021) Agência: 104
Conta: 2242589-6
350,00
Total de saídas - 1.065,50
Compra no débito FALBER MERCEARIA 30,00
Extrato gerado dia 07 de novembro de 2026 às 08:22 2 de 5
Tem alguma dúvida? Mande uma mensagem
Marcos
 a 01 DE NOVEMBRO DE 2026 06 DE NOVEMBRO DE 2026 VALORES EM R$
Aluguel casa 1.035,50`;

describe("extrato Nubank", () => {
  const txs = parseNubankStatement(SAMPLE);
  it("lê entradas e saídas com valores exatos, ignorando cabeçalhos de página", () => {
    expect(txs.map((t) => [t.date, t.kind, t.amount])).toEqual([
      ["2026-11-01", "receita", 350],
      ["2026-11-01", "despesa", 30],
      ["2026-11-01", "despesa", 1035.5],
    ]);
    expect(txs[0]!.description).toBe("Transferência recebida pelo Pix HECTOR A VILCHEZ GUERRERO");
  });
  it("gera a mesma chave para o mesmo lançamento (evita duplicar)", () => {
    expect(txRefs("pf", txs)).toEqual(txRefs("pf", parseNubankStatement(SAMPLE)));
  });
});
