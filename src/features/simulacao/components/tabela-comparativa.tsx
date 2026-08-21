"use client";

import { useState } from "react";
import type { Ranking } from "@/features/simulacao/domain";
import { formatarArrobas, formatarBRL, formatarPercentual, formatarPeso } from "@/lib/formato";
import type { Decimal } from "@/lib/money";

type Celula = { chave: string; rotulo: string; valor: (i: number) => string; forte?: boolean };

/**
 * Linhas = etapas da cadeia, colunas = ofertas.
 *
 * Tabela e nao cartao lado a lado de proposito: comparacao visual depende de
 * alinhamento de digito. Cartao poe cada numero numa altura diferente e obriga o
 * olho a saltar. Aqui 320,00 fica exatamente acima de 312,00.
 */
export function TabelaComparativa({ ranking }: { ranking: Ranking }) {
  const [completa, setCompleta] = useState(false);
  const itens = ranking.itens;
  if (itens.length === 0) return null;

  const r = (i: number) => {
    const item = itens[i];
    if (item === undefined) throw new Error("indice fora do ranking");
    return item.resultado;
  };

  const brl = (v: Decimal) => formatarBRL(v);

  const essenciais: Celula[] = [
    {
      chave: "preco",
      rotulo: "Preco da arroba",
      valor: (i) => brl(r(i).receitaBruta.dividedBy(r(i).arrobas)),
    },
    { chave: "prazo", rotulo: "Prazo", valor: (i) => `${r(i).prazoDias} d` },
    {
      chave: "liquida",
      rotulo: "Receita liquida por cabeca",
      valor: (i) => brl(r(i).receitaLiquida),
    },
    {
      chave: "vp",
      rotulo: "Valor presente por cabeca",
      valor: (i) => brl(r(i).vpPorCabeca),
      forte: true,
    },
  ];

  const detalhe: Celula[] = [
    {
      // O resultado nao carrega o peso de fazenda nem a quebra, so o peso ja
      // descontado. Rotular esta linha como "Quebra de peso" e prefixar com menos
      // faria o numero mentir: 460,8 kg e o peso que sobra, nao o que se perdeu.
      chave: "pesovivo",
      rotulo: "Peso vivo apos a quebra",
      valor: (i) => formatarPeso(r(i).pesoVivoEfetivoKg),
    },
    {
      chave: "rendimento",
      rotulo: "Peso de carcaca",
      valor: (i) => formatarPeso(r(i).pesoCarcacaKg),
    },
    { chave: "arrobas", rotulo: "Arrobas por cabeca", valor: (i) => formatarArrobas(r(i).arrobas) },
    { chave: "bruta", rotulo: "Receita bruta", valor: (i) => brl(r(i).receitaBruta) },
    { chave: "tributos", rotulo: "Tributos", valor: (i) => `-${brl(r(i).tributos)}` },
    { chave: "frete", rotulo: "Frete por cabeca", valor: (i) => `-${brl(r(i).fretePorCabeca)}` },
    {
      chave: "deducoes",
      rotulo: "Comissao e deducoes",
      valor: (i) => `-${brl(r(i).outrasDeducoes)}`,
    },
    {
      chave: "taxadia",
      rotulo: "Taxa diaria",
      valor: (i) => formatarPercentual(r(i).taxaDiaria, 4),
    },
    { chave: "vparroba", rotulo: "Valor presente por arroba", valor: (i) => brl(r(i).vpPorArroba) },
    {
      chave: "vptotal",
      rotulo: "Valor presente do lote",
      valor: (i) => formatarBRL(r(i).vpTotalLote, 0),
      forte: true,
    },
  ];

  const linhas = completa
    ? [...essenciais.slice(0, 2), ...detalhe, ...essenciais.slice(2)]
    : essenciais;

  return (
    <section aria-labelledby="titulo-comparativo">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titulo-comparativo" className="sinal text-[22px] leading-tight">
          Comparativo
        </h2>
        <button
          type="button"
          onClick={() => setCompleta((v) => !v)}
          className="rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-3 py-1.5 text-sm font-medium hover:border-[var(--color-tinta)]"
          aria-expanded={completa}
        >
          {completa ? "Ocultar cadeia completa" : "Ver cadeia completa"}
        </button>
      </div>

      <div className="rolagem-comparativo overflow-x-auto rounded-xl border border-[var(--color-linha)] bg-[var(--color-papel)]">
        <table className="w-full min-w-[560px] border-collapse text-right">
          <caption className="sr-only">
            Etapas do calculo por oferta, ordenadas por valor presente liquido por cabeca.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-[var(--color-papel)] px-3 py-3 text-left align-bottom"
              >
                <span className="rotulo">Etapa</span>
              </th>
              {itens.map((item) => {
                const vencedor = item.posicao === 1;
                return (
                  <th
                    key={item.resultado.comprador}
                    scope="col"
                    className="coluna-oferta min-w-[132px] px-3 py-3 align-bottom"
                  >
                    <span
                      className="mb-1 block h-1 rounded-full"
                      style={{
                        background: vencedor ? "var(--color-brinco)" : "var(--color-linha)",
                      }}
                    />
                    <span className="rotulo block">
                      {vencedor ? "melhor oferta" : `${item.posicao}o lugar`}
                    </span>
                    <span className={`block text-[15px] ${vencedor ? "font-bold" : "font-medium"}`}>
                      {item.resultado.comprador}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.chave} className="border-t border-[var(--color-linha)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[var(--color-papel)] px-3 py-2 text-left text-sm font-normal text-[var(--color-tinta-suave)]"
                >
                  {linha.rotulo}
                </th>
                {itens.map((item, i) => (
                  <td
                    key={`${linha.chave}-${item.resultado.comprador}`}
                    className={`numero coluna-oferta px-3 py-2 ${
                      linha.forte ? "text-[16px] font-semibold" : "text-[14px]"
                    } ${item.posicao === 1 && linha.forte ? "bg-[color-mix(in_srgb,var(--color-brinco)_14%,transparent)]" : ""}`}
                  >
                    {linha.valor(i)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--color-tinta)]">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-[var(--color-papel)] px-3 py-2 text-left text-sm font-normal text-[var(--color-tinta-suave)]"
              >
                Deixa na mesa
              </th>
              {itens.map((item) => (
                <td
                  key={`atraso-${item.resultado.comprador}`}
                  className="numero coluna-oferta px-3 py-2 text-[14px]"
                  style={{
                    color: item.posicao === 1 ? "var(--color-tinta)" : "var(--color-sangria)",
                  }}
                >
                  {item.posicao === 1 ? "melhor" : `-${formatarBRL(item.atrasoParaMelhorTotal, 0)}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
        Valores por cabeca, salvo onde indicado. "Deixa na mesa" e a diferenca para a melhor oferta,
        em reais do lote inteiro.
      </p>
    </section>
  );
}
