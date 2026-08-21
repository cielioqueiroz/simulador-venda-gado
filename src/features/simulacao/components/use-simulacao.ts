"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { REGIMES_INICIAIS, regimesParaDominio } from "@/db/seed/regimes";
import {
  calcularOferta,
  type OfertaEntrada,
  type Ranking,
  type RegimeTributario,
  ranquear,
  regimeVigenteEm,
} from "@/features/simulacao/domain";
import { dec } from "@/lib/money";

const CHAVE_RASCUNHO = "simulador-gado:rascunho:v1";

/** Forma serializavel do estado. Decimal nao sobrevive a JSON, entao guardamos string. */
export interface OfertaBruta {
  readonly id: string;
  readonly comprador: string;
  readonly precoArroba: string;
  readonly rendimentoAcordado: string;
  readonly quebraPct: string;
  readonly prazoDias: number;
  readonly freteModo: "por_cabeca" | "por_km" | "isento";
  readonly freteValor: string;
  readonly kmRodados: string;
  readonly comissaoPct: string;
}

export interface EstadoSimulacao {
  readonly nome: string;
  readonly cabecas: number;
  readonly pesoVivoMedioKg: string;
  readonly taxaDescontoAnual: string;
  readonly regimeId: string;
  readonly ofertas: readonly OfertaBruta[];
}

/**
 * Estado inicial com tres ofertas que reproduzem o problema do brief: a de maior
 * preco por arroba nao e a que rende mais. O usuario ve o insight antes de digitar
 * qualquer coisa.
 */
export const ESTADO_INICIAL: EstadoSimulacao = {
  nome: "Boiada de setembro",
  cabecas: 40,
  pesoVivoMedioKg: "480",
  taxaDescontoAnual: "0.12",
  regimeId: "pf-receita-bruta",
  ofertas: [
    {
      id: "a",
      comprador: "Frigorifico Aurora",
      precoArroba: "325",
      rendimentoAcordado: "0.50",
      quebraPct: "0.05",
      prazoDias: 45,
      freteModo: "por_km",
      freteValor: "4",
      kmRodados: "240",
      comissaoPct: "0.01",
    },
    {
      id: "b",
      comprador: "Frigorifico Boi Forte",
      precoArroba: "320",
      rendimentoAcordado: "0.52",
      quebraPct: "0.04",
      prazoDias: 30,
      freteModo: "por_km",
      freteValor: "4",
      kmRodados: "240",
      comissaoPct: "0.01",
    },
    {
      id: "c",
      comprador: "Frigorifico Campo Novo",
      precoArroba: "312",
      rendimentoAcordado: "0.52",
      quebraPct: "0.03",
      prazoDias: 0,
      freteModo: "isento",
      freteValor: "0",
      kmRodados: "0",
      comissaoPct: "0.01",
    },
  ],
};

const REGIMES = regimesParaDominio(REGIMES_INICIAIS);

function paraOfertaDominio(bruta: OfertaBruta): OfertaEntrada {
  return {
    comprador: bruta.comprador,
    precoArroba: dec(bruta.precoArroba || "0"),
    rendimentoAcordado: dec(bruta.rendimentoAcordado || "0"),
    quebraPct: dec(bruta.quebraPct || "0"),
    prazoDias: bruta.prazoDias,
    freteModo: bruta.freteModo,
    freteValor: dec(bruta.freteValor || "0"),
    kmRodados: bruta.freteModo === "por_km" ? dec(bruta.kmRodados || "0") : null,
    comissaoPct: dec(bruta.comissaoPct || "0"),
    ajustes: [],
  };
}

/**
 * Uma oferta so entra no ranking com quebra e rendimento dentro da faixa valida.
 * A quebra e obrigatoria por decisao registrada na spec: o simulador nao adivinha.
 */
function ofertaComparavel(bruta: OfertaBruta): boolean {
  if (bruta.quebraPct.trim() === "" || bruta.rendimentoAcordado.trim() === "") return false;
  const quebra = dec(bruta.quebraPct);
  const rendimento = dec(bruta.rendimentoAcordado);
  if (quebra.lessThan(0) || quebra.greaterThan("0.1")) return false;
  if (rendimento.lessThan("0.4") || rendimento.greaterThan("0.65")) return false;
  if (dec(bruta.precoArroba || "0").lessThanOrEqualTo(0)) return false;
  if (bruta.freteModo === "por_km" && dec(bruta.kmRodados || "0").lessThanOrEqualTo(0))
    return false;
  return true;
}

export interface SimulacaoViva {
  readonly estado: EstadoSimulacao;
  readonly ranking: Ranking;
  readonly regime: RegimeTributario;
  readonly incomparaveis: readonly OfertaBruta[];
  readonly hidratado: boolean;
  atualizar: (parcial: Partial<EstadoSimulacao>) => void;
  atualizarOferta: (id: string, parcial: Partial<OfertaBruta>) => void;
  adicionarOferta: () => void;
  removerOferta: (id: string) => void;
  reiniciar: () => void;
}

/**
 * O dominio roda aqui, no cliente. Mexer na taxa de desconto recalcula o ranking
 * inteiro em memoria, sem ida a rede, que e o criterio de aceite do brief.
 * Sao as mesmas funcoes que o servidor usa ao salvar, entao tela e banco nao
 * podem divergir.
 */
export function useSimulacao(): SimulacaoViva {
  const [estado, setEstado] = useState<EstadoSimulacao>(ESTADO_INICIAL);
  const [hidratado, setHidratado] = useState(false);

  // Hidratacao adiada: ler localStorage no primeiro render divergiria do servidor.
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
      if (salvo !== null) setEstado(JSON.parse(salvo) as EstadoSimulacao);
    } catch {
      // Rascunho corrompido nao pode impedir o uso da ferramenta.
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
    } catch {
      // Armazenamento cheio ou bloqueado nao pode quebrar a simulacao.
    }
  }, [estado, hidratado]);

  const regime = useMemo<RegimeTributario>(() => {
    const escolhido = REGIMES.find((r) => r.id === estado.regimeId);
    if (escolhido !== undefined) return escolhido;
    const vigente = regimeVigenteEm(REGIMES, new Date());
    if (vigente !== null) return vigente;
    const primeiro = REGIMES[0];
    if (primeiro === undefined) throw new Error("carga de regimes tributarios esta vazia");
    return primeiro;
  }, [estado.regimeId]);

  const { ranking, incomparaveis } = useMemo(() => {
    const lote = { cabecas: estado.cabecas, pesoVivoMedioKg: dec(estado.pesoVivoMedioKg || "0") };
    const taxa = dec(estado.taxaDescontoAnual || "0");
    const validas = estado.ofertas.filter(ofertaComparavel);
    const invalidas = estado.ofertas.filter((o) => !ofertaComparavel(o));
    if (lote.cabecas <= 0 || lote.pesoVivoMedioKg.lessThanOrEqualTo(0)) {
      return { ranking: ranquear([]), incomparaveis: estado.ofertas };
    }
    const resultados = validas.map((o) =>
      calcularOferta({ lote, oferta: paraOfertaDominio(o), regime, taxaDescontoAnual: taxa }),
    );
    return { ranking: ranquear(resultados), incomparaveis: invalidas };
  }, [estado, regime]);

  const atualizar = useCallback((parcial: Partial<EstadoSimulacao>) => {
    setEstado((anterior) => ({ ...anterior, ...parcial }));
  }, []);

  const atualizarOferta = useCallback((id: string, parcial: Partial<OfertaBruta>) => {
    setEstado((anterior) => ({
      ...anterior,
      ofertas: anterior.ofertas.map((o) => (o.id === id ? { ...o, ...parcial } : o)),
    }));
  }, []);

  const adicionarOferta = useCallback(() => {
    setEstado((anterior) => ({
      ...anterior,
      ofertas: [
        ...anterior.ofertas,
        {
          id: crypto.randomUUID(),
          comprador: "Novo comprador",
          precoArroba: "320",
          rendimentoAcordado: "0.52",
          quebraPct: "",
          prazoDias: 30,
          freteModo: "isento",
          freteValor: "0",
          kmRodados: "0",
          comissaoPct: "0.01",
        },
      ],
    }));
  }, []);

  const removerOferta = useCallback((id: string) => {
    setEstado((anterior) => ({
      ...anterior,
      ofertas: anterior.ofertas.filter((o) => o.id !== id),
    }));
  }, []);

  const reiniciar = useCallback(() => setEstado(ESTADO_INICIAL), []);

  return {
    estado,
    ranking,
    regime,
    incomparaveis,
    hidratado,
    atualizar,
    atualizarOferta,
    adicionarOferta,
    removerOferta,
    reiniciar,
  };
}
