"use client";

import type { ResultadoOferta } from "@/features/simulacao/domain";
import { formatarBRL } from "@/lib/formato";
import type { Decimal } from "@/lib/money";

const SERIES = [
  { cor: "var(--color-brinco)", traco: "0" },
  { cor: "var(--color-agua)", traco: "7 4" },
  { cor: "var(--color-sangria)", traco: "2 3" },
] as const;

const DEGRAUS = [
  "receita bruta",
  "apos o tributo",
  "apos o frete",
  "apos a comissao",
  "valor presente",
] as const;

/**
 * Valores por cabeca em cada degrau, na mesma unidade do ranking.
 *
 * Plotar por arroba seria enganoso: uma oferta com rendimento menor rende bem por
 * arroba e mal por cabeca, e o grafico terminaria contradizendo o veredito.
 *
 * A escala comeca na receita bruta por cabeca, que ja embute quebra e rendimento.
 * E ali que o insight aparece: uma oferta de arroba mais cara pode comecar a
 * cascata mais embaixo, porque acordou rendimento pior ou quebra maior.
 * Comecar antes disso, no preco cru da arroba sobre o peso vivo, criaria um
 * degrau de conversao de unidade que esmagaria a escala e esconderia justamente
 * as diferencas que decidem a venda.
 */
function degrausPorCabeca(r: ResultadoOferta): Decimal[] {
  const aposTributo = r.receitaBruta.minus(r.tributos);
  return [
    r.receitaBruta,
    aposTributo,
    aposTributo.minus(r.fretePorCabeca),
    r.receitaLiquida,
    r.vpPorCabeca,
  ];
}

/**
 * Elemento assinatura. Tres ofertas descem no mesmo eixo de reais por cabeca,
 * da receita bruta ate o valor presente. As linhas se cruzam, e o cruzamento
 * e o insight do produto: a maior arroba costuma nao ser a melhor oferta.
 *
 * Cada serie carrega cor, padrao de traco e rotulo direto na ponta. Nunca so cor.
 */
export function CascataDeducoes({ resultados }: { resultados: readonly ResultadoOferta[] }) {
  if (resultados.length === 0) return null;

  const series = resultados.slice(0, 3).map((r) => ({ r, valores: degrausPorCabeca(r) }));
  const todos = series.flatMap((s) => s.valores.map((v) => v.toNumber()));
  const maximo = Math.max(...todos);
  const minimo = Math.min(...todos);
  const folga = (maximo - minimo) * 0.14 || 10;
  const topo = maximo + folga;
  const base = minimo - folga;

  const L = 78;
  const R = 156;
  const T = 26;
  const B = 48;
  const largura = 940;
  const altura = 360;
  const areaX = largura - L - R;
  const areaY = altura - T - B;

  const x = (i: number) => L + (areaX * i) / (DEGRAUS.length - 1);
  const y = (v: number) => T + areaY * (1 - (v - base) / (topo - base));

  const linhasGrade = [0, 0.25, 0.5, 0.75, 1].map((f) => base + (topo - base) * f);

  // Os rotulos da ponta colidem quando os valores finais ficam proximos.
  // Empurra cada um para baixo ate garantir um vao minimo, preservando a ordem.
  const VAO_MINIMO = 34;
  const yRotulos: number[] = [];
  for (const { valores } of series) {
    const ultimo = valores[valores.length - 1];
    const bruto = ultimo === undefined ? T : y(ultimo.toNumber());
    const anterior = yRotulos[yRotulos.length - 1];
    yRotulos.push(anterior === undefined ? bruto : Math.max(bruto, anterior + VAO_MINIMO));
  }

  const melhor = series[0];
  const pior = series[series.length - 1];
  const cruzam =
    melhor !== undefined &&
    pior !== undefined &&
    (melhor.valores[0]?.lessThan(pior.valores[0] ?? 0) ?? false);

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="sinal text-[22px] leading-tight">Cascata de deducoes</h2>
        <p className="max-w-xl text-sm text-[var(--color-tinta-suave)]">
          Reais por cabeca, da receita bruta ate o valor presente.
          {cruzam
            ? " As linhas se cruzam: a oferta que comeca embaixo termina em cima."
            : " Onde as linhas se cruzam, a oferta mais cara deixou de ser a melhor."}
        </p>
      </figcaption>

      <div className="rolagem-comparativo overflow-x-auto rounded-xl border border-[var(--color-linha)] bg-[var(--color-papel)] p-2">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-auto w-full min-w-[660px]"
          role="img"
          aria-label={`Cascata de deducoes de ${series.length} ofertas, em reais por cabeca, da receita bruta ate o valor presente.`}
        >
          <title>Cascata de deducoes por cabeca</title>

          {linhasGrade.map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={largura - R}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--color-linha)"
                strokeWidth="1"
              />
              <text
                x={L - 10}
                y={y(v) + 4}
                textAnchor="end"
                className="numero"
                fontSize="12"
                fill="var(--color-tinta-suave)"
              >
                {v.toFixed(0)}
              </text>
            </g>
          ))}

          {DEGRAUS.map((rotulo, i) => (
            <g key={rotulo}>
              <line
                x1={x(i)}
                x2={x(i)}
                y1={T}
                y2={altura - B}
                stroke="var(--color-linha)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={x(i)}
                y={altura - B + 20}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--color-tinta-suave)"
                style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                {rotulo}
              </text>
            </g>
          ))}

          <text
            x={L - 10}
            y={T - 9}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-tinta-suave)"
            style={{ letterSpacing: "0.08em" }}
          >
            R$/cab
          </text>

          {series.map(({ r, valores }, indice) => {
            const s = SERIES[indice % SERIES.length];
            const ultimo = valores[valores.length - 1];
            if (s === undefined || ultimo === undefined) return null;
            const pontos = valores.map((v, i) => `${x(i)},${y(v.toNumber())}`).join(" L ");
            return (
              <g key={r.comprador}>
                <path
                  d={`M ${pontos}`}
                  fill="none"
                  stroke={s.cor}
                  strokeWidth="2.5"
                  strokeDasharray={s.traco}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {valores.map((v, i) => (
                  <circle
                    key={`${r.comprador}-${DEGRAUS[i]}`}
                    cx={x(i)}
                    cy={y(v.toNumber())}
                    r="3"
                    fill="var(--color-papel)"
                    stroke={s.cor}
                    strokeWidth="2"
                  />
                ))}
                <line
                  x1={x(DEGRAUS.length - 1)}
                  y1={y(ultimo.toNumber())}
                  x2={largura - R + 6}
                  y2={(yRotulos[indice] ?? 0) - 4}
                  stroke={s.cor}
                  strokeWidth="1"
                />
                <text
                  x={largura - R + 12}
                  y={yRotulos[indice] ?? 0}
                  fontSize="12.5"
                  fontWeight={indice === 0 ? "700" : "500"}
                  fill="var(--color-tinta)"
                >
                  {indice + 1}. {r.comprador.replace("Frigorifico ", "")}
                </text>
                <text
                  x={largura - R + 12}
                  y={(yRotulos[indice] ?? 0) + 15}
                  className="numero"
                  fontSize="12"
                  fill="var(--color-tinta-suave)"
                >
                  {formatarBRL(ultimo)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
