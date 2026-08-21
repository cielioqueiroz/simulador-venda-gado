"use client";

import type { Ranking } from "@/features/simulacao/domain";
import { formatarBRL } from "@/lib/formato";

/**
 * O numero que o usuario procura primeiro. Ele estoura a coluna de texto de
 * proposito: e a unica quebra de grade da tela, e ela e o veredito.
 *
 * aria-live polite anuncia a mudanca de ranking para leitor de tela, porque a
 * reordenacao visual sozinha nao comunica nada a quem nao ve.
 */
export function Veredito({ ranking, cabecas }: { ranking: Ranking; cabecas: number }) {
  const melhor = ranking.itens[0];
  const vantagem = ranking.vantagemDoPrimeiroTotal;

  if (melhor === undefined) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-linha)] px-5 py-8">
        <p className="text-[var(--color-tinta-suave)]">
          Preencha a quebra de peso e o rendimento de cada oferta para ver o comparativo.
        </p>
      </div>
    );
  }

  const soUma = vantagem === null;

  return (
    <div aria-live="polite" className="py-2">
      <p className="rotulo mb-2">Melhor oferta por valor presente</p>
      <p className="sinal text-[clamp(26px,4.4vw,44px)] leading-[1.05]">
        {melhor.resultado.comprador}
      </p>

      {soUma ? (
        <p className="mt-3 max-w-lg text-[var(--color-tinta-suave)]">
          Cadastre uma segunda oferta para comparar. Com uma so, nao ha o que ranquear.
        </p>
      ) : (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="numero text-[clamp(30px,6vw,56px)] font-semibold leading-none">
            R$ {formatarBRL(vantagem, 0)}
          </span>
          <span className="max-w-xs text-sm text-[var(--color-tinta-suave)]">
            a mais que a segunda colocada, no lote de {cabecas} cabecas
          </span>
        </p>
      )}

      <p className="numero mt-3 text-sm text-[var(--color-tinta-suave)]">
        R$ {formatarBRL(melhor.resultado.vpPorCabeca)} por cabeca
        <span className="mx-2 text-[var(--color-linha)]">|</span>
        R$ {formatarBRL(melhor.resultado.vpPorArroba)} por arroba
        <span className="mx-2 text-[var(--color-linha)]">|</span>
        R$ {formatarBRL(melhor.resultado.vpTotalLote, 0)} no lote
      </p>
    </div>
  );
}
