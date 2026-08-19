# Simulador de Venda de Gado

Compara ofertas de compradores de gado e ordena por valor presente liquido por cabeca,
nao por preco bruto da arroba.

O preco da arroba sozinho nao decide nada. R$ 320 com pagamento em 30 dias pode render
menos que R$ 312 a vista, e R$ 325 com rendimento acordado menor e frete por conta do
produtor pode ser a pior das tres.

## Estado

Dominio de calculo pronto e testado. Persistencia, autenticacao e interface ainda nao.

## Cadeia de calculo

Tudo por cabeca. Os totais do lote sao multiplicacao no fim, para que o arredondamento
nao se acumule.

```
peso_vivo_efetivo   = peso_vivo_medio_kg * (1 - quebra_pct)
peso_carcaca        = peso_vivo_efetivo * rendimento_acordado
arrobas             = peso_carcaca / 15
receita_bruta       = arrobas * preco_arroba
receita_ajustada    = receita_bruta + bonificacoes - descontos_qualidade
tributos            = receita_bruta * aliquota_do_regime_vigente
frete_por_cabeca    = isento     -> 0
                      por_cabeca -> frete_valor
                      por_km     -> (frete_valor * km_rodados) / cabecas
outras_deducoes     = receita_bruta * comissao_pct + outros ajustes
receita_liquida     = receita_ajustada - tributos - frete_por_cabeca - outras_deducoes
taxa_diaria         = (1 + taxa_desconto_anual) ^ (1/365) - 1
valor_presente      = receita_liquida / (1 + taxa_diaria) ^ prazo_dias
```

## Caso de conferencia

Este caso esta em `tests/unit/domain/calculo.test.ts` e pode ser refeito na calculadora.

Lote de 40 cabecas, 480 kg de peso vivo medio. Oferta a R$ 320 a arroba, quebra de 4%,
rendimento de 52%, prazo de 30 dias, frete por km a R$ 4,00 por 240 km rodados,
comissao de 1%, regime de pessoa fisica a 1,5%, taxa de desconto de 12% ao ano.

```
peso_vivo_efetivo = 480 * 0,96          = 460,8 kg
peso_carcaca      = 460,8 * 0,52        = 239,616 kg
arrobas           = 239,616 / 15        = 15,9744 @
receita_bruta     = 15,9744 * 320       = R$ 5.111,808
tributos          = 5.111,808 * 0,015   = R$    76,67712
frete             = 4,00 * 240 / 40     = R$    24,00
comissao          = 5.111,808 * 0,01    = R$    51,11808
receita_liquida                         = R$ 4.960,0128
valor_presente    = 4.960,0128 / 1,12^(30/365) ~ R$ 4.914,03 por cabeca
```

## Premissas declaradas

- Uma arroba equivale a 15 kg de carcaca.
- A contribuicao sobre a comercializacao incide sobre a receita bruta, antes de
  bonificacao e de desconto de qualidade.
- A comissao do corretor incide sobre a receita bruta.
- No modo por km, `km_rodados` e a quilometragem que a transportadora cobra. Inclua o
  retorno vazio ali se ela cobrar o retorno.
- A conversao de taxa anual para diaria e composta, `(1+i)^(1/365)-1`. Dividir por 365
  subestima o desconto.
- A quebra de peso e sempre informada pelo usuario. O simulador nao adivinha.

## Regimes tributarios

Aliquota muda por legislacao, entao ela e dado com data de vigencia, nunca constante no
codigo. Os regimes previstos para a carga inicial:

| Regime | Previdenciaria | RAT/SAT | SENAR | Total | Vigencia |
|---|---:|---:|---:|---:|---|
| PF sobre receita bruta | 1,20% | 0,10% | 0,20% | 1,50% | desde 2018 |
| PF sobre receita bruta | 2,00% | 0,10% | 0,20% | 2,30% | ate 2017 |
| PF optante pela folha | 0 | 0 | 0,20% | 0,20% | desde 2019 |
| PJ rural sobre receita bruta | 1,70% | 0,10% | 0,25% | 2,05% | desde 2002 |
| PJ optante pela folha | 0 | 0 | 0,25% | 0,25% | desde 2019 |

## Limitacoes

- O calculo tributario e estimativa. Ele nao substitui orientacao contabil.
- Nesta versao cada oferta tem um prazo unico. Pagamento parcelado nao entra no
  comparativo.
- ICMS e diferimento estadual estao fora do escopo.
- Um lote por simulacao.

## Divergencias em relacao ao documento de origem

O documento de origem esta em `docs/03-simulador-venda-gado.md`. Duas decisoes desta
implementacao divergem dele, ambas deliberadas:

1. Ele escreve `tributos = receita_ajustada * aliquota_produtor`. Aqui a base e a
   receita bruta, porque e sobre ela que incide a contribuicao sobre a comercializacao
   da producao rural.
2. Ele pede Next.js 15. O projeto usa Next 16.3.1, que foi o que o scaffold atual
   entregou. O dominio nao depende de Next, entao a diferenca nao o afeta.

## Verificacao

```bash
npm run test:cov   # testes com cobertura de 100% no dominio
npm run typecheck  # tipos
npm run check      # lint e formatacao
npm run build      # build de producao
```

## Convencoes

Vocabulario de curral em codigo e interface: cabeca, arroba, quebra, rendimento, prazo,
frete. Identificadores em portugues sem acento. Nao usar travessao em texto algum do
projeto.

O dominio nao conhece Next, banco nem React. Essa regra e verificada por
`tests/unit/domain/isolamento.test.ts`, que le os imports de cada arquivo do dominio e
falha se algum sair da lista permitida.
