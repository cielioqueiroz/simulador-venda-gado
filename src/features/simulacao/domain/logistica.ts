import { type Decimal, dec, ZERO } from "@/lib/money";
import type { FreteModo } from "./tipos";

export class ErroFrete extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroFrete";
  }
}

export interface EntradaFrete {
  readonly freteModo: FreteModo;
  readonly freteValor: Decimal;
  /** Quilometragem cobrada pela transportadora, com retorno incluso se ela cobrar. */
  readonly kmRodados: Decimal | null;
}

/**
 * Custo de frete do produtor, total do lote e por cabeca.
 * A cadeia de calculo roda por cabeca, entao o modo por_km rateia pelo lote.
 */
export function calcularFrete(
  entrada: EntradaFrete,
  cabecas: number,
): { total: Decimal; porCabeca: Decimal } {
  switch (entrada.freteModo) {
    case "isento":
      return { total: ZERO, porCabeca: ZERO };

    case "por_cabeca": {
      if (cabecas <= 0) {
        throw new ErroFrete("frete por cabeca exige lote com pelo menos uma cabeca");
      }
      return { total: entrada.freteValor.times(cabecas), porCabeca: entrada.freteValor };
    }

    case "por_km": {
      if (entrada.kmRodados === null) {
        throw new ErroFrete("frete por km exige a quilometragem rodada");
      }
      if (cabecas <= 0) {
        throw new ErroFrete("frete por km exige lote com pelo menos uma cabeca para o rateio");
      }
      const total = entrada.freteValor.times(entrada.kmRodados);
      return { total, porCabeca: total.dividedBy(dec(cabecas)) };
    }
  }
}
