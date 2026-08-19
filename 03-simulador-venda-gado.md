# Projeto 03: Simulador de Venda de Gado

## Como usar este arquivo

Cole no Claude Code na raiz de um diretório vazio. Este é o menor dos quatro projetos em escopo e o mais denso em regra de negócio. Não subestime a segunda parte.

---

## Papel

Aja como engenheiro de software sênior construindo uma ferramenta de decisão financeira. O usuário vai comparar propostas de compradores diferentes e escolher com base no que a tela mostrar. Se o cálculo de valor presente estiver errado, ele perde dinheiro de verdade. Trate a camada de domínio com o rigor de um sistema financeiro, porque é isso que ela é.

## Skills a invocar, nesta ordem

1. `brainstorming` antes de qualquer código, com foco em validar as regras tributárias e de desconto comigo.
2. `typescript-pro` e `senior-backend` para modelagem e domínio.
3. `frontend-design` para a direção visual antes do CSS.
4. `senior-security` para revisão de superfície.
5. `code-reviewer` a cada bloco fechado.
6. `verification-before-completion` antes de declarar qualquer coisa pronta.

---

## O que o produto faz

Compara ofertas de compradores de gado lado a lado e diz qual rende mais **em valor presente líquido por cabeça**, não em preço bruto da arroba.

O problema real: um frigorífico oferece R$ 320 a arroba com pagamento em 30 dias, outro oferece R$ 312 à vista, um terceiro oferece R$ 325 mas com rendimento de carcaça acordado menor e frete por conta do produtor. Comparar pelo número do preço é errado e é o que quase todo mundo faz na mão, no papel.

### Fluxo principal

1. Cadastrar o lote a vender: cabeças, peso médio vivo, categoria.
2. Cadastrar duas ou mais ofertas, cada uma com seus parâmetros.
3. Ver o comparativo com resultado líquido por cabeça, por arroba e total, ordenado por valor presente.
4. Ajustar premissas globais (taxa de desconto, quebra de peso, custo de frete) e ver o ranking mudar ao vivo.
5. Salvar a simulação e gerar um resumo compartilhável.

---

## Regras de negócio

Esta seção é o produto. Implemente cada item como função pura testada, em `features/simulacao/domain/`.

### Cadeia de cálculo por oferta

```
peso_vivo_efetivo      = peso_vivo_fazenda * (1 - quebra_pct)
peso_carcaca           = peso_vivo_efetivo * rendimento_acordado
arrobas                = peso_carcaca / 15
receita_bruta          = arrobas * preco_arroba
bonificacoes           = soma de agios aplicaveis (precoce, rastreabilidade, cota)
descontos_qualidade    = hematoma, carrapato, idade, fora de padrao
receita_ajustada       = receita_bruta + bonificacoes - descontos_qualidade
tributos               = receita_ajustada * aliquota_produtor
frete                  = custo por cabeca ou por km, conforme a oferta
outras_deducoes        = comissao, taxa de balanca, seguro
receita_liquida        = receita_ajustada - tributos - frete - outras_deducoes
valor_presente         = receita_liquida / (1 + taxa_diaria) ^ prazo_dias
```

### Quebra de peso

Parâmetro sensível e frequentemente ignorado. O animal perde peso no embarque e no transporte, e o percentual varia com distância e tempo de jejum. Deixe configurável por oferta, com valor padrão editável e explicação na interface do que ele significa. Não esconda esse campo em um menu avançado, porque ele muda o ranking.

### Tributação

O produtor rural pessoa física tem contribuição sobre a receita bruta da comercialização, composta por parcelas distintas (previdenciária, acidente de trabalho e contribuição para o serviço de aprendizagem rural). Pessoa jurídica e produtor com opção diferente têm tratamento distinto.

Trate a alíquota como **configuração versionada com data de vigência**, nunca como constante escondida no código:

```
regimes_tributarios   id, nome, descricao, vigencia_inicio, vigencia_fim
componentes_tributo   regime_id, nome, aliquota, base
```

Motivo: alíquota muda por legislação. Constante hardcoded vira bug silencioso que só aparece no fechamento do ano. Além disso, mostre na interface a composição da alíquota aplicada, com um aviso claro de que a ferramenta não substitui orientação contábil.

### Valor presente

Prazo de pagamento é a variável que mais engana. Use taxa de desconto configurável pelo usuário, com sugestão baseada no custo de capital dele (CDI, taxa de crédito rural, ou taxa própria). Converta taxa anual para diária de forma composta, não linear:

```
taxa_diaria = (1 + taxa_anual) ^ (1/365) - 1
```

Se a oferta tiver pagamento parcelado, calcule o VPL do fluxo completo, não a média dos prazos.

### Precisão

- `numeric(14,4)` no banco, `decimal.js` no JavaScript.
- Arredondamento só na exibição.
- Toda conversão kg para arroba passa pela mesma função testada.
- Exiba a diferença entre a melhor e a segunda melhor oferta em reais totais, porque é isso que o usuário quer saber.

---

## Stack

**Base**
- Next.js 15, App Router, TypeScript estrito com `noUncheckedIndexedAccess`
- Neon Postgres com Drizzle ORM e `@neondatabase/serverless`
- Zod com `next-safe-action` nas Server Actions
- `decimal.js`

**UI**
- Tailwind CSS v4 e shadcn/ui
- `@tanstack/react-table` para a tabela comparativa, que precisa de ordenação, colunas fixadas e destaque de melhor valor por linha
- Recharts para a cascata de deduções
- `lucide-react`, `sonner`

**Autenticação**
- Auth.js v5. Simulação anônima permitida com estado local, mas salvar exige conta. Isso reduz atrito e ainda demonstra o fluxo de auth.

**Qualidade**
- Vitest com cobertura obrigatória no domínio
- Playwright para o fluxo de comparar três ofertas
- Biome ou ESLint com Prettier

**Deploy**
- Vercel, variáveis validadas com `@t3-oss/env-nextjs`

---

## Arquitetura de pastas

```
src/
  app/
    (marketing)/
    (app)/
      simulacoes/
        nova/
        [id]/
    api/health/
    icon.tsx
    opengraph-image.tsx
  features/
    simulacao/
      domain/
        peso.ts              quebra, rendimento, arrobas
        receita.ts           bruta, bonificacao, desconto
        tributos.ts          composicao por regime vigente
        logistica.ts         frete por cabeca e por km
        valor-presente.ts    conversao de taxa e VPL de fluxo
        comparador.ts        ranking e diferenca entre ofertas
        index.ts
      data/
      actions/
      components/
      schemas/
    oferta/
    auth/
  db/
    schema/
    migrations/
  lib/
    money.ts
    units.ts
    env.ts
  components/ui/
tests/
  unit/
  e2e/
```

Nenhum componente importa de `db/`. Todo repositório recebe `orgId` obrigatório. O domínio não conhece Next, banco nem React: só entra número e sai número.

---

## Modelo de dados

```
organizations         id, nome
users                 id, email, nome
memberships           user_id, org_id, papel

simulacoes            id, org_id, nome, criada_em, atualizada_em,
                      cabecas, peso_vivo_medio_kg, categoria_animal,
                      taxa_desconto_anual, regime_tributario_id

ofertas               id, org_id, simulacao_id, comprador,
                      preco_arroba, rendimento_acordado, quebra_pct,
                      prazo_dias, frete_modo (por_cabeca | por_km | isento),
                      frete_valor, distancia_km, comissao_pct,
                      observacao, criada_em

ajustes_oferta        id, org_id, oferta_id, tipo (bonificacao | desconto),
                      nome, modo (percentual | valor_por_cabeca | valor_por_arroba),
                      valor

parcelas_oferta       id, org_id, oferta_id, dias, percentual

regimes_tributarios   id, nome, descricao, vigencia_inicio, vigencia_fim
componentes_tributo   id, regime_id, nome, aliquota, base

resultados            id, org_id, oferta_id, calculado_em, versao_calculo,
                      receita_bruta, tributos, frete, deducoes,
                      receita_liquida, valor_presente, vp_por_cabeca, vp_por_arroba
```

Exigências:
- `check` garantindo `rendimento_acordado between 0.4 and 0.65` e `quebra_pct between 0 and 0.1`.
- `check` garantindo que a soma de `parcelas_oferta.percentual` por oferta seja 100.
- `versao_calculo` em `resultados` para que uma mudança de fórmula não corrompa comparação histórica.
- Índice `(org_id, simulacao_id)`.

---

## Segurança

- Escopo por organização em toda query, com teste que tenta acessar simulação de outra org e espera falha. Proposta comercial de frigorífico é informação sensível e competitiva.
- Zod em toda Server Action, sem exceção.
- Cuidado específico com o link de compartilhamento: se existir, use token opaco com expiração e escopo de leitura, gerado no servidor, nunca id sequencial ou uuid da simulação exposto direto. Documente o modelo de ameaça dessa rota.
- Nenhum dado sensível em `NEXT_PUBLIC_`.
- `.env*` no `.gitignore` desde o primeiro commit, com `.env.example` sem valores.
- Cabeçalhos de segurança no middleware, CSP com nonce.
- Rate limit em autenticação e na rota de compartilhamento pública.
- Erro de usuário não vaza detalhe de banco.
- `npm audit` limpo, dependências travadas.

---

## Direção visual

O assunto é comparação e decisão. A tela inteira existe para responder "qual das três". Todo elemento que não ajuda a decidir é ruído e deve sair.

Produza o plano de design antes de codar (paleta com 4 a 6 hex nomeados, tipografia com papéis, layout, elemento assinatura), e critique o plano por escrito antes de implementar.

**Proibido**, por serem assinatura de interface gerada por IA:
- creme perto de `#F4F1EA` com serifada de alto contraste e terracota perto de `#D97757`
- fundo quase preto com acento verde ácido ou vermelhão
- layout de jornal com fios de um pixel e raio zero
- gradiente roxo ou índigo
- três cards iguais lado a lado, que aqui seria especialmente preguiçoso porque o produto é literalmente sobre comparar três coisas e merece uma solução melhor que cards

Números tabulares são obrigatórios na tabela e nos indicadores. Alinhamento de dígito é o que torna comparação visual possível.

Elemento assinatura sugerido: a cascata de deduções mostrando o preço bruto da arroba descendo até o valor presente líquido, com as três ofertas sobrepostas no mesmo eixo. O insight do produto é que a oferta com maior preço bruto costuma não ser a melhor, então mostre isso graficamente em vez de apenas escrever.

Piso de qualidade: responsivo até 360px, foco visível, `prefers-reduced-motion`, contraste AA, tabela navegável por teclado.

## Favicon e card de compartilhamento

- `app/icon.tsx` gerado em código, derivado da forma da balança ou da cascata.
- `app/opengraph-image.tsx` 1200x630. Se a simulação for compartilhada, gere OG dinâmico por rota com o resultado (comprador vencedor e diferença em reais), respeitando a regra de token opaco.
- `metadata` completo com `metadataBase`.

---

## Copy

Fale a língua do curral: cabeça, arroba, quebra, rendimento, prazo, frete. Nada de "entidade" ou "registro". O botão diz o que faz: "Comparar ofertas", "Salvar simulação". Explique quebra de peso e valor presente em uma linha cada, no ponto de uso, porque nem todo usuário conhece os termos. Inclua aviso claro de que o cálculo tributário é estimativa e não substitui o contador.

**Restrição de escrita, válida para código, README, comentários e interface: não use travessão.**

---

## Ordem de execução

1. `brainstorming`: valide comigo alíquotas, faixas de quebra, modos de frete e como tratar parcelamento antes de modelar.
2. Domínio puro com testes, começando por peso e receita. Nenhuma UI ainda.
3. Valor presente e comparador, com casos de borda (prazo zero, taxa zero, oferta única).
4. Esquema de banco e migrations, incluindo regimes tributários com vigência.
5. Plano de design com autocrítica.
6. Autenticação e isolamento multi-tenant, com teste passando.
7. Formulário de oferta e tabela comparativa.
8. Cascata de deduções.
9. Compartilhamento com token opaco, se entrar no escopo.
10. Segurança, favicon, OG, README, deploy.

## Critérios de aceite

- Domínio 100% testado, incluindo um caso montado à mão cujo resultado eu possa conferir na calculadora.
- Teste de isolamento entre organizações passando.
- Mudança de taxa de desconto reordena o ranking na tela sem recarregar a página.
- `npm run build` limpo, sem `any` implícito.
- Lighthouse acima de 90 em performance e acessibilidade.
- README com as fórmulas escritas, as premissas e as limitações declaradas.
- Nenhum segredo no histórico do Git.

Use `verification-before-completion` e cole a saída dos comandos antes de declarar pronto.
