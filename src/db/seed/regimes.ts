import type { RegimeTributario } from "@/features/simulacao/domain";
import { dec } from "@/lib/money";

export interface ComponenteSemente {
  readonly nome: string;
  readonly aliquota: string;
  readonly base: "receita_bruta";
}

export interface RegimeSemente {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string | null;
  readonly componentes: readonly ComponenteSemente[];
}

function comp(nome: string, aliquota: string): ComponenteSemente {
  return { nome, aliquota, base: "receita_bruta" };
}

/**
 * Contribuicao sobre a comercializacao da producao rural, o chamado Funrural.
 * Aliquota muda por legislacao, por isso ela e dado com vigencia e nao constante.
 * Estimativa: a ferramenta nao substitui orientacao contabil.
 */
export const REGIMES_INICIAIS: readonly RegimeSemente[] = [
  {
    id: "pf-receita-bruta-ate-2017",
    nome: "Pessoa fisica sobre a receita bruta, ate 2017",
    descricao: "Vigencia anterior a reducao da aliquota previdenciaria.",
    vigenciaInicio: "2001-01-01",
    vigenciaFim: "2017-12-31",
    componentes: [comp("Previdenciaria", "0.02"), comp("RAT", "0.001"), comp("SENAR", "0.002")],
  },
  {
    id: "pf-receita-bruta",
    nome: "Pessoa fisica sobre a receita bruta",
    descricao: "Produtor rural pessoa fisica que contribui sobre a comercializacao.",
    vigenciaInicio: "2018-01-01",
    vigenciaFim: null,
    componentes: [comp("Previdenciaria", "0.012"), comp("RAT", "0.001"), comp("SENAR", "0.002")],
  },
  {
    id: "pf-folha",
    nome: "Pessoa fisica optante pela folha de salarios",
    descricao: "Optou por contribuir sobre a folha. Sobre a venda resta apenas o SENAR.",
    vigenciaInicio: "2019-01-01",
    vigenciaFim: null,
    componentes: [comp("SENAR", "0.002")],
  },
  {
    id: "pj-receita-bruta",
    nome: "Pessoa juridica rural sobre a receita bruta",
    descricao: "Produtor rural pessoa juridica que contribui sobre a comercializacao.",
    vigenciaInicio: "2002-01-01",
    vigenciaFim: null,
    componentes: [comp("Previdenciaria", "0.017"), comp("RAT", "0.001"), comp("SENAR", "0.0025")],
  },
  {
    id: "pj-folha",
    nome: "Pessoa juridica optante pela folha de salarios",
    descricao: "Optou por contribuir sobre a folha. Sobre a venda resta apenas o SENAR.",
    vigenciaInicio: "2019-01-01",
    vigenciaFim: null,
    componentes: [comp("SENAR", "0.0025")],
  },
];

/** Converte a carga para o tipo que o dominio consome. */
export function regimesParaDominio(regimes: readonly RegimeSemente[]): RegimeTributario[] {
  return regimes.map((r) => ({
    id: r.id,
    nome: r.nome,
    vigenciaInicio: new Date(`${r.vigenciaInicio}T00:00:00Z`),
    vigenciaFim: r.vigenciaFim === null ? null : new Date(`${r.vigenciaFim}T00:00:00Z`),
    componentes: r.componentes.map((c) => ({
      nome: c.nome,
      aliquota: dec(c.aliquota),
      base: c.base,
    })),
  }));
}
