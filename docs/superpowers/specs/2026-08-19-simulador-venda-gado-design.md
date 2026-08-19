# Simulador de Venda de Gado: design

Data: 2026-08-19
Origem: `03-simulador-venda-gado.md` na raiz do projeto
Status: aprovado

## Problema

Produtor rural compara propostas de compradores de gado pelo preco da arroba. Esse
numero nao decide nada sozinho. Uma oferta de R$ 320 a arroba com pagamento em 30
dias pode render menos que R$ 312 a vista, e uma de R$ 325 com rendimento de carcaca
acordado menor e frete por conta do produtor pode ser a pior das tres.

O produto compara ofertas lado a lado e ordena por valor presente liquido por cabeca.

## Decisoes desta sessao

As quatro validacoes que o documento de origem exigiu antes da modelagem, com a
resposta dada e a consequencia no codigo.

### 1. Tributacao: aliquotas confirmadas, base de calculo e a receita bruta

Regimes semeados na tabela, com vigencia:

| Regime | Previdenciaria | RAT/SAT | SENAR | Total | Vigencia inicio |
|---|---:|---:|---:|---:|---|
| PF sobre receita bruta | 1,20% | 0,10% | 0,20% | 1,50% | 2018-01-01 |
| PF sobre receita bruta (historico) | 2,00% | 0,10% | 0,20% | 2,30% | ate 2017-12-31 |
| PF optante pela folha de salarios | 0 | 0 | 0,20% | 0,20% | 2019-01-01 |
| PJ rural sobre receita bruta | 1,70% | 0,10% | 0,25% | 2,05% | 2002-01-01 |
| PJ optante pela folha | 0 | 0 | 0,25% | 0,25% | 2019-01-01 |

O documento de origem escreveu `tributos = receita_ajustada * aliquota_produtor`.
Essa linha esta trocada aqui de proposito: a contribuicao incide sobre a receita
bruta da comercializacao, antes de bonificacoes e de descontos de qualidade. A
divergencia e deliberada, e o README declara.

Consequencia: `componentes_tributo.base` fica no esquema para auditoria e exibicao,
com valor unico `receita_bruta` na carga inicial. O dominio nao ramifica por base
nesta versao.

### 2. Quebra de peso: sempre explicita, sem valor padrao

`quebra_pct` e obrigatoria em toda oferta e nasce vazia. Zod barra o envio sem ela,
e oferta sem quebra nao entra no ranking. Nao existe funcao de sugestao por
distancia, nao existe premissa global de quebra.

Motivo: a quebra muda o ranking, e um padrao invisivel e uma suposicao que o usuario
nao fez. A interface explica o termo no ponto de uso, com a faixa tipica de 2% a 5%
conforme distancia e tempo de jejum, como texto de apoio e nao como valor preenchido.

Restricao de banco preservada: `quebra_pct between 0 and 0.1`.

### 3. Frete por km: valor por quilometro rodado, rateado pelo lote

```
isento      -> frete_por_cabeca = 0
por_cabeca  -> frete_por_cabeca = frete_valor
por_km      -> frete_total      = frete_valor * km_rodados
               frete_por_cabeca = frete_total / cabecas
```

`ofertas.distancia_km` passa a se chamar `km_rodados`. O usuario informa a
quilometragem que a transportadora cobra, incluindo retorno vazio se for o caso, e a
interface rotula o campo assim. A tela mostra as duas leituras, total e por cabeca.

### 4. Parcelamento: fora desta versao

Toda oferta tem prazo unico em `ofertas.prazo_dias`. A tabela `parcelas_oferta` sai
do esquema.

Ressalva registrada: o documento de origem pedia VPL de fluxo completo. A reducao de
escopo foi decidida com a limitacao conhecida. Para que a volta atras nao vire
reescrita, `valor-presente.ts` modela o fluxo internamente e trata prazo unico como
fluxo de uma parcela de 100%.

### 5. Ambiente e escopo

- Banco: Neon Postgres, `DATABASE_URL` fornecida pelo usuario, nunca versionada.
- Auth: Auth.js v5 com provedor Credentials, senha com hash argon2id. Roda sem
  servico externo, o que mantem o Playwright viavel de ponta a ponta.
  Sessao por JWT, nao por adaptador de banco, porque Credentials nao suporta sessao
  de banco no Auth.js v5. Logo o esquema nao ganha as tabelas `accounts`,
  `sessions` e `verification_tokens`.
- Compartilhamento publico: dentro do escopo, com token opaco.

## Arquitetura

Abordagem escolhida: dominio isomorfico, calculo no cliente, persistencia de snapshot.

As funcoes de `features/simulacao/domain/` sao TypeScript puro, sem import de Next,
de Drizzle ou de React. Rodam no navegador e no servidor. O cliente recalcula o
ranking inteiro em memoria a cada ajuste de premissa, sem ida a rede. O servidor
executa as mesmas funcoes ao salvar e grava `resultados` com `versao_calculo`.

Isso satisfaz o criterio de aceite da reordenacao ao vivo e elimina a classe de bug
em que tela e servidor calculam diferente, porque existe uma implementacao so.

Custo aceito: `decimal.js` entra no bundle do cliente, cerca de 32 KB minificado
antes do gzip.

### Camadas

```
domain/     numero entra, numero sai. Sem IO, sem framework.
schemas/    Zod. Fronteira de validacao de toda Server Action.
data/       repositorios Drizzle. Todo metodo recebe orgId obrigatorio.
actions/    Server Actions com next-safe-action. Orquestram, nao calculam.
components/ React. Consomem dominio direto para o calculo ao vivo.
```

Nenhum componente importa de `db/`. O dominio nao importa de lugar nenhum do projeto
alem de `lib/money.ts` e `lib/units.ts`.

### Modulos do dominio

| Arquivo | Responsabilidade | Entrada e saida |
|---|---|---|
| `peso.ts` | quebra, rendimento, conversao para arrobas | kg e percentuais, devolve arrobas |
| `receita.ts` | bruta, bonificacoes, descontos de qualidade | arrobas e preco, devolve receita ajustada |
| `tributos.ts` | composicao por regime vigente na data | receita bruta e regime, devolve tributo e memoria de calculo |
| `logistica.ts` | frete por cabeca, por km e isento | modo, valor, km, cabecas, devolve custo por cabeca |
| `valor-presente.ts` | conversao de taxa anual para diaria e VP | liquida, taxa, prazo, devolve VP |
| `comparador.ts` | ranking e diferenca entre ofertas | lista de resultados, devolve ordenada com delta |
| `index.ts` | superficie publica do dominio | reexporta |

## Cadeia de calculo

Tudo por cabeca. Totais do lote sao multiplicacao no fim, nunca no meio, para que o
arredondamento nao se acumule.

```
peso_vivo_efetivo   = peso_vivo_medio_kg * (1 - quebra_pct)
peso_carcaca        = peso_vivo_efetivo * rendimento_acordado
arrobas             = peso_carcaca / 15
receita_bruta       = arrobas * preco_arroba
bonificacoes        = soma dos ajustes tipo bonificacao
descontos_qualidade = soma dos ajustes tipo desconto_qualidade
receita_ajustada    = receita_bruta + bonificacoes - descontos_qualidade
tributos            = receita_bruta * aliquota_total_do_regime_vigente
frete_por_cabeca    = conforme frete_modo
comissao            = receita_bruta * comissao_pct
outras_deducoes     = comissao + soma dos ajustes tipo outra_deducao
receita_liquida     = receita_ajustada - tributos - frete_por_cabeca - outras_deducoes
taxa_diaria         = (1 + taxa_desconto_anual) ^ (1/365) - 1
valor_presente      = receita_liquida / (1 + taxa_diaria) ^ prazo_dias

vp_por_cabeca       = valor_presente
vp_por_arroba       = valor_presente / arrobas
vp_total_lote       = valor_presente * cabecas
```

Modos de ajuste em `ajustes_oferta.modo`:

- `percentual`: incide sobre `receita_bruta`
- `valor_por_cabeca`: soma direta
- `valor_por_arroba`: multiplica por `arrobas`

### Precisao

`decimal.js` em toda a cadeia, `numeric(14,4)` no banco. Arredondamento so na
exibicao, nunca em passo intermediario. A constante 15 kg por arroba vive em
`lib/units.ts` e toda conversao passa por `kgParaArrobas`.

### Casos de borda cobertos por teste

- `prazo_dias = 0`: valor presente igual a receita liquida
- `taxa_desconto_anual = 0`: taxa diaria zero, sem desconto, sem divisao por zero
- oferta unica: ranking de um elemento, diferenca para a segunda inexistente e
  reportada como ausente, nao como zero
- empate de valor presente: desempate estavel por menor prazo, depois por comprador
- `cabecas = 0`: rejeitado na validacao, nunca chega ao dominio
- receita liquida negativa: permitida e exibida, porque frete alto pode inverter o sinal
- quebra no limite 0 e 0,1, rendimento no limite 0,4 e 0,65

### Caso de conferencia manual

Um teste com numeros redondos, conferivel na calculadora, exigido pelos criterios de
aceite. Lote de 40 cabecas, 480 kg de peso vivo medio, quebra 4%, rendimento 52%,
R$ 320 a arroba, regime PF 1,5%, comissao 1%, frete por km a R$ 4,00 por 240 km,
prazo 30 dias, taxa anual 12%. O resultado esperado fica escrito no teste e no README.

## Modelo de dados

```
organizations         id, nome
users                 id, email, nome, senha_hash
memberships           user_id, org_id, papel

simulacoes            id, org_id, nome, criada_em, atualizada_em,
                      cabecas, peso_vivo_medio_kg, categoria_animal,
                      taxa_desconto_anual, regime_tributario_id

ofertas               id, org_id, simulacao_id, comprador,
                      preco_arroba, rendimento_acordado, quebra_pct,
                      prazo_dias, frete_modo (por_cabeca | por_km | isento),
                      frete_valor, km_rodados, comissao_pct,
                      observacao, criada_em

ajustes_oferta        id, org_id, oferta_id,
                      tipo (bonificacao | desconto_qualidade | outra_deducao),
                      nome, modo (percentual | valor_por_cabeca | valor_por_arroba),
                      valor

regimes_tributarios   id, nome, descricao, vigencia_inicio, vigencia_fim
componentes_tributo   id, regime_id, nome, aliquota, base

resultados            id, org_id, oferta_id, calculado_em, versao_calculo,
                      receita_bruta, tributos, frete, deducoes,
                      receita_liquida, valor_presente, vp_por_cabeca, vp_por_arroba

compartilhamentos     id, org_id, simulacao_id, token_hash, criado_em,
                      expira_em, revogado_em, acessos

rate_limit_hits       id, chave, janela_inicio, contagem
```

Diferencas em relacao ao documento de origem, todas justificadas nas decisoes acima:

1. `parcelas_oferta` removida, com o check de soma 100 junto.
2. `ajustes_oferta.tipo` ganhou o terceiro valor `outra_deducao`, separando o que
   entra em `receita_ajustada` do que e deduzido depois. Sem isso a cascata visual
   perde degraus e `receita_ajustada` deixa de ter significado.
3. `distancia_km` renomeada para `km_rodados`.
4. `users.senha_hash` adicionada, consequencia do provedor Credentials.
5. `compartilhamentos` adicionada, consequencia do escopo de link publico.
6. `rate_limit_hits` adicionada, sem `org_id` de proposito: ela protege rotas nao
   autenticadas, onde ainda nao existe organizacao conhecida. E a unica tabela do
   esquema fora da regra de escopo por organizacao, e a excecao esta registrada aqui
   para nao parecer descuido em revisao.

Restricoes:

- check `rendimento_acordado between 0.4 and 0.65`
- check `quebra_pct between 0 and 0.1`
- check `frete_modo = 'por_km'` implica `km_rodados not null and km_rodados > 0`
- check `frete_modo = 'isento'` implica `frete_valor = 0`
- check `cabecas > 0` e `peso_vivo_medio_kg > 0`
- indice `(org_id, simulacao_id)` em `ofertas`
- indice unico em `compartilhamentos.token_hash`
- `versao_calculo` obrigatoria em `resultados`

`versao_calculo` e uma string semver exportada pelo dominio como constante
`VERSAO_CALCULO`, comecando em `1.0.0`. Ela sobe sempre que uma formula muda de
resultado para a mesma entrada, e nunca por refatoracao sem efeito numerico. Snapshot
gravado com versao diferente da atual e exibido com aviso de que foi calculado por
outra versao da formula, em vez de ser recalculado silenciosamente.

## Isolamento multi-tenant

Todo metodo de repositorio recebe `orgId` como primeiro parametro obrigatorio, tipado
como branded type `OrgId` para que uma string solta nao compile no lugar errado.
Nenhuma query sem filtro de organizacao.

Teste exigido: usuario da organizacao A tenta ler, editar e apagar simulacao da
organizacao B, e as tres operacoes falham. Falham como nao encontrado, nunca como
proibido, para nao confirmar a existencia do registro.

## Compartilhamento publico

Modelo de ameaca da rota `/s/[token]`:

- Ativo: concorrente ou comprador que queira ler propostas comerciais alheias.
- Superficie: uma rota GET publica, sem sessao.
- Ameaca principal: enumeracao de tokens e vazamento de proposta de frigorifico, que
  e informacao competitiva.

Controles:

- Token de 32 bytes aleatorios de fonte criptografica, codificado em base64url.
  Nunca id sequencial, nunca o uuid da simulacao.
- O banco guarda apenas `sha256(token)`. Vazamento da tabela nao produz links validos.
- Expiracao obrigatoria, padrao de 30 dias, com revogacao manual pelo dono.
- Escopo somente leitura. A rota nao expoe id de organizacao, email, nem qualquer
  campo fora do comparativo.
- Rate limit por IP na rota publica e na autenticacao, com contador de janela
  deslizante gravado no proprio Postgres. Memoria de processo nao serve porque a
  Vercel roda funcoes sem estado compartilhado, e um servico de Redis externo seria
  uma dependencia e um segredo a mais para um volume que o banco aguenta.
- Resposta identica para token inexistente, expirado e revogado.
- `noindex` na rota compartilhada.

O OG dinamico por token respeita as mesmas regras e mostra comprador vencedor e
diferenca em reais.

## Seguranca geral

- Zod em toda Server Action, sem excecao, via `next-safe-action`.
- Nenhum dado sensivel em `NEXT_PUBLIC_`.
- `.env*` no `.gitignore` desde o primeiro commit, com `.env.example` sem valores.
- Cabecalhos de seguranca no middleware, CSP com nonce.
- Erro de usuario nunca carrega detalhe de banco.
- `npm audit` limpo, dependencias travadas com lockfile versionado.
- Variaveis validadas com `@t3-oss/env-nextjs`.

## Estado da simulacao anonima

Simulacao anonima permitida, persistida em `localStorage` com hidratacao adiada para
evitar divergencia de renderizacao entre servidor e cliente. Salvar exige conta. Ao
autenticar, o rascunho local e oferecido para importacao em vez de descartado.

## Testes

- Vitest com cobertura obrigatoria no dominio, incluindo o caso de conferencia manual
  e todos os casos de borda listados.
- Teste de isolamento entre organizacoes contra o banco real.
- Playwright no fluxo de comparar tres ofertas e ver o ranking mudar ao ajustar a taxa.

## Direcao visual

Plano produzido antes do CSS, com autocritica escrita, na etapa 5 da ordem de
execucao. Restricoes ja fixadas pelo documento de origem:

Proibido, por ser assinatura de interface gerada por IA: creme perto de `#F4F1EA` com
serifada de alto contraste e terracota perto de `#D97757`; fundo quase preto com
acento verde acido ou vermelhao; layout de jornal com fios de um pixel e raio zero;
gradiente roxo ou indigo; tres cards iguais lado a lado.

Obrigatorio: numeros tabulares na tabela e nos indicadores, responsivo ate 360px,
foco visivel, `prefers-reduced-motion`, contraste AA, tabela navegavel por teclado.

Elemento assinatura: cascata de deducoes com as tres ofertas sobrepostas no mesmo
eixo, mostrando graficamente que a maior arroba costuma nao ser a melhor oferta.

## Copy

Lingua de curral: cabeca, arroba, quebra, rendimento, prazo, frete. Botao diz o que
faz. Quebra de peso e valor presente explicados em uma linha cada, no ponto de uso.
Aviso claro de que o calculo tributario e estimativa e nao substitui o contador.

Restricao de escrita valida para codigo, README, comentarios e interface: nao usar
travessao.

## Fora de escopo

- Parcelamento e VPL de fluxo com multiplas parcelas
- ICMS e diferimento estadual
- Sugestao automatica de quebra por distancia
- Base de calculo tributaria configuravel por componente
- Multiplos lotes por simulacao

## Criterios de aceite

- Dominio 100% testado, com caso de conferencia manual
- Teste de isolamento entre organizacoes passando
- Mudanca de taxa de desconto reordena o ranking sem recarregar a pagina
- `npm run build` limpo, sem `any` implicito, `noUncheckedIndexedAccess` ativo
- Lighthouse acima de 90 em performance e acessibilidade
- README com formulas, premissas e limitacoes declaradas
- Nenhum segredo no historico do Git
