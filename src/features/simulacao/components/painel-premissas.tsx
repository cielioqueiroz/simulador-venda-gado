"use client";

import { useId } from "react";
import { REGIMES_INICIAIS } from "@/db/seed/regimes";
import type { RegimeTributario } from "@/features/simulacao/domain";
import { aliquotaTotal } from "@/features/simulacao/domain";
import { formatarPercentual } from "@/lib/formato";
import type { EstadoSimulacao } from "./use-simulacao";

const entrada =
  "w-full rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-2.5 py-2 numero text-[15px] focus:border-[var(--color-tinta)]";

export function PainelPremissas({
  estado,
  regime,
  atualizar,
}: {
  estado: EstadoSimulacao;
  regime: RegimeTributario;
  atualizar: (parcial: Partial<EstadoSimulacao>) => void;
}) {
  const base = useId();
  const idCabecas = `${base}-cabecas`;
  const idPeso = `${base}-peso`;
  const idTaxa = `${base}-taxa`;
  const idRegime = `${base}-regime`;
  const taxaPercentual = Number(estado.taxaDescontoAnual) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="sinal text-[22px] leading-tight">Premissas</h2>
        <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
          Valem para todas as ofertas. Mexer aqui reordena o ranking na hora.
        </p>
      </div>

      <div>
        <label htmlFor={idCabecas} className="rotulo mb-1 block">
          Cabecas no lote
        </label>
        <input
          id={idCabecas}
          type="number"
          min={1}
          value={estado.cabecas}
          onChange={(e) => atualizar({ cabecas: Number(e.target.value) })}
          className={entrada}
        />
      </div>

      <div>
        <label htmlFor={idPeso} className="rotulo mb-1 block">
          Peso vivo medio, kg
        </label>
        <input
          id={idPeso}
          type="number"
          min={1}
          step="0.1"
          value={estado.pesoVivoMedioKg}
          onChange={(e) => atualizar({ pesoVivoMedioKg: e.target.value })}
          className={entrada}
          aria-describedby={`${idPeso}-ajuda`}
        />
        <p id={`${idPeso}-ajuda`} className="mt-1 text-xs text-[var(--color-tinta-suave)]">
          Peso na balanca da fazenda, antes da quebra.
        </p>
      </div>

      <div>
        <label htmlFor={idTaxa} className="rotulo mb-1 block">
          Taxa de desconto: {taxaPercentual.toFixed(1)}% ao ano
        </label>
        <input
          id={idTaxa}
          type="range"
          min={0}
          max={40}
          step={0.5}
          value={taxaPercentual}
          onChange={(e) => atualizar({ taxaDescontoAnual: String(Number(e.target.value) / 100) })}
          className="w-full accent-[var(--color-tinta)]"
          aria-describedby={`${idTaxa}-ajuda`}
        />
        <p
          id={`${idTaxa}-ajuda`}
          className="mt-1 text-xs leading-snug text-[var(--color-tinta-suave)]"
        >
          Valor presente e quanto o dinheiro do prazo vale hoje. Use seu custo de capital: CDI, taxa
          de credito rural ou a sua propria.
        </p>
      </div>

      <div>
        <label htmlFor={idRegime} className="rotulo mb-1 block">
          Regime tributario
        </label>
        <select
          id={idRegime}
          value={estado.regimeId}
          onChange={(e) => atualizar({ regimeId: e.target.value })}
          className="w-full rounded-md border border-[var(--color-linha)] bg-[var(--color-papel)] px-2.5 py-2 text-sm focus:border-[var(--color-tinta)]"
        >
          {REGIMES_INICIAIS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--color-linha)] bg-[var(--color-papel)] p-3">
        <p className="rotulo mb-2">Composicao da aliquota</p>
        <ul className="space-y-1">
          {regime.componentes.map((c) => (
            <li key={c.nome} className="flex justify-between gap-3 text-sm">
              <span className="text-[var(--color-tinta-suave)]">{c.nome}</span>
              <span className="numero">{formatarPercentual(c.aliquota, 3)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-t border-[var(--color-linha)] pt-1 text-sm font-semibold">
            <span>Total sobre a receita bruta</span>
            <span className="numero">{formatarPercentual(aliquotaTotal(regime), 3)}</span>
          </li>
        </ul>
        <p className="mt-3 text-xs leading-snug text-[var(--color-sangria)]">
          O calculo tributario e estimativa. Ele nao substitui orientacao contabil.
        </p>
      </div>
    </div>
  );
}
