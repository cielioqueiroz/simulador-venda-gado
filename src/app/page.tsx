"use client";

import { CascataDeducoes } from "@/features/simulacao/components/cascata-deducoes";
import { ListaOfertas } from "@/features/simulacao/components/lista-ofertas";
import { PainelPremissas } from "@/features/simulacao/components/painel-premissas";
import { TabelaComparativa } from "@/features/simulacao/components/tabela-comparativa";
import { useSimulacao } from "@/features/simulacao/components/use-simulacao";
import { Veredito } from "@/features/simulacao/components/veredito";

export default function Pagina() {
  const s = useSimulacao();
  const resultados = s.ranking.itens.map((i) => i.resultado);

  return (
    <div className="mx-auto min-h-full w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-linha)] pb-4">
        <div>
          <p className="rotulo">Simulador de venda de gado</p>
          <h1 className="sinal mt-0.5 text-[clamp(20px,3vw,28px)] leading-tight">
            A maior arroba costuma nao ser a melhor oferta
          </h1>
        </div>
        <button
          type="button"
          onClick={s.reiniciar}
          className="rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-3 py-1.5 text-sm hover:border-[var(--color-tinta)]"
        >
          Recomecar
        </button>
      </header>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <PainelPremissas estado={s.estado} regime={s.regime} atualizar={s.atualizar} />
        </aside>

        <main className="grade-conteudo grid min-w-0 gap-8">
          <Veredito ranking={s.ranking} cabecas={s.estado.cabecas} />

          {s.incomparaveis.length > 0 && (
            <p className="rounded-lg border border-[var(--color-sangria)] bg-[color-mix(in_srgb,var(--color-sangria)_8%,transparent)] px-3 py-2 text-sm">
              {s.incomparaveis.length === 1
                ? "1 oferta esta fora do ranking"
                : `${s.incomparaveis.length} ofertas estao fora do ranking`}
              : falta quebra de peso, ou o rendimento esta fora da faixa de 40% a 65%.
            </p>
          )}

          <TabelaComparativa ranking={s.ranking} />
          <CascataDeducoes resultados={resultados} />
          <ListaOfertas
            ofertas={s.estado.ofertas}
            atualizarOferta={s.atualizarOferta}
            adicionarOferta={s.adicionarOferta}
            removerOferta={s.removerOferta}
          />
        </main>
      </div>

      <footer className="mt-12 border-t border-[var(--color-linha)] pt-4 text-xs leading-relaxed text-[var(--color-tinta-suave)]">
        <p>
          Calculo por cabeca, com totais do lote no fim. Uma arroba equivale a 15 kg de carcaca. A
          conversao de taxa anual para diaria e composta.
        </p>
        <p className="mt-1">
          O calculo tributario e estimativa e nao substitui orientacao contabil. Sua simulacao fica
          salva apenas neste navegador.
        </p>
      </footer>
    </div>
  );
}
