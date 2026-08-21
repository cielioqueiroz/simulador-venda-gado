"use client";

import type { OfertaBruta } from "./use-simulacao";

const entrada =
  "w-full rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-2.5 py-1.5 numero text-[14px] focus:border-[var(--color-tinta)]";

const entradaTexto =
  "w-full rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-2.5 py-1.5 text-[14px] font-medium focus:border-[var(--color-tinta)]";

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="rotulo mb-1 block">{children}</span>;
}

export function ListaOfertas({
  ofertas,
  atualizarOferta,
  adicionarOferta,
  removerOferta,
}: {
  ofertas: readonly OfertaBruta[];
  atualizarOferta: (id: string, parcial: Partial<OfertaBruta>) => void;
  adicionarOferta: () => void;
  removerOferta: (id: string) => void;
}) {
  return (
    <section aria-labelledby="titulo-ofertas">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titulo-ofertas" className="sinal text-[22px] leading-tight">
          Ofertas
        </h2>
        <button
          type="button"
          onClick={adicionarOferta}
          className="rounded-md bg-[var(--color-tinta)] px-3 py-1.5 text-sm font-semibold text-[var(--color-papel)] hover:opacity-90"
        >
          Adicionar oferta
        </button>
      </div>

      <div className="grid gap-3">
        {ofertas.map((o) => {
          const semQuebra = o.quebraPct.trim() === "";
          return (
            <article
              key={o.id}
              className="rounded-xl border border-[var(--color-linha)] bg-[var(--color-papel)] p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="graduacao h-8 w-1 rounded-full" aria-hidden="true" />
                <input
                  value={o.comprador}
                  onChange={(e) => atualizarOferta(o.id, { comprador: e.target.value })}
                  className={entradaTexto}
                  aria-label="Nome do comprador"
                />
                <button
                  type="button"
                  onClick={() => removerOferta(o.id)}
                  className="shrink-0 rounded-md border border-[var(--color-linha)] px-2.5 py-1.5 text-sm hover:border-[var(--color-sangria)] hover:text-[var(--color-sangria)]"
                  aria-label={`Remover a oferta de ${o.comprador}`}
                >
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <Rotulo>R$ por arroba</Rotulo>
                  <input
                    type="number"
                    step="0.01"
                    value={o.precoArroba}
                    onChange={(e) => atualizarOferta(o.id, { precoArroba: e.target.value })}
                    className={entrada}
                  />
                </label>

                <label className="block">
                  <Rotulo>Prazo em dias</Rotulo>
                  <input
                    type="number"
                    min={0}
                    value={o.prazoDias}
                    onChange={(e) => atualizarOferta(o.id, { prazoDias: Number(e.target.value) })}
                    className={entrada}
                  />
                </label>

                <label className="block">
                  <Rotulo>Rendimento</Rotulo>
                  <input
                    type="number"
                    step="0.01"
                    min={0.4}
                    max={0.65}
                    value={o.rendimentoAcordado}
                    onChange={(e) => atualizarOferta(o.id, { rendimentoAcordado: e.target.value })}
                    className={entrada}
                  />
                </label>

                <label className="block">
                  <Rotulo>Quebra de peso</Rotulo>
                  <input
                    type="number"
                    step="0.005"
                    min={0}
                    max={0.1}
                    placeholder="obrigatoria"
                    value={o.quebraPct}
                    onChange={(e) => atualizarOferta(o.id, { quebraPct: e.target.value })}
                    className={`${entrada} ${semQuebra ? "border-[var(--color-sangria)]" : ""}`}
                    aria-describedby={`ajuda-quebra-${o.id}`}
                  />
                </label>
              </div>

              <p
                id={`ajuda-quebra-${o.id}`}
                className={`mt-1.5 text-xs leading-snug ${
                  semQuebra ? "text-[var(--color-sangria)]" : "text-[var(--color-tinta-suave)]"
                }`}
              >
                Quebra de peso e a perda no embarque e no transporte. Tipico de 2% a 5% conforme
                distancia e jejum. {semQuebra && "Sem ela a oferta nao entra no ranking."}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <Rotulo>Frete</Rotulo>
                  <select
                    value={o.freteModo}
                    onChange={(e) =>
                      atualizarOferta(o.id, {
                        freteModo: e.target.value as OfertaBruta["freteModo"],
                        ...(e.target.value === "isento" ? { freteValor: "0" } : {}),
                      })
                    }
                    className="w-full rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-2.5 py-1.5 text-[14px] focus:border-[var(--color-tinta)]"
                  >
                    <option value="isento">Por conta do comprador</option>
                    <option value="por_cabeca">R$ por cabeca</option>
                    <option value="por_km">R$ por km rodado</option>
                  </select>
                </label>

                {o.freteModo !== "isento" && (
                  <label className="block">
                    <Rotulo>{o.freteModo === "por_km" ? "R$ por km" : "R$ por cabeca"}</Rotulo>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={o.freteValor}
                      onChange={(e) => atualizarOferta(o.id, { freteValor: e.target.value })}
                      className={entrada}
                    />
                  </label>
                )}

                {o.freteModo === "por_km" && (
                  <label className="block">
                    <Rotulo>Km rodados</Rotulo>
                    <input
                      type="number"
                      step="1"
                      min={0}
                      value={o.kmRodados}
                      onChange={(e) => atualizarOferta(o.id, { kmRodados: e.target.value })}
                      className={entrada}
                    />
                  </label>
                )}

                <label className="block">
                  <Rotulo>Comissao</Rotulo>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    max={1}
                    value={o.comissaoPct}
                    onChange={(e) => atualizarOferta(o.id, { comissaoPct: e.target.value })}
                    className={entrada}
                  />
                </label>
              </div>

              {o.freteModo === "por_km" && (
                <p className="mt-1.5 text-xs leading-snug text-[var(--color-tinta-suave)]">
                  Informe a quilometragem que a transportadora cobra. Inclua o retorno vazio se ela
                  cobrar o retorno. O custo e rateado pelo lote.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
