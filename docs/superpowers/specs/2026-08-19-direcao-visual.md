# Direcao visual: o instrumento de pesagem

Data: 2026-08-19
Status: plano com autocritica, anterior ao CSS

## O que a tela precisa responder

Uma pergunta so: **qual das ofertas rende mais**. Todo elemento que nao ajuda a
responder isso e ruido e sai.

O usuario e produtor rural. Ele pode estar no escritorio da fazenda ou no celular,
no sol, com o caminhao do frigorifico esperando. A tela precisa ser legivel em luz
forte, precisa alinhar digito com digito, e precisa deixar obvio quem ganhou e por
quanto.

## Conceito

**Instrumento de pesagem, nao painel de SaaS.**

A referencia nao e dashboard: e balanca de curral, paquimetro, regua graduada.
Equipamento que existe para medir com precisao e que voce confia porque ele parece
confiavel. O conceito vive em tres lugares e em nenhum outro:

1. Tipografia de sinalizacao de equipamento, larga e maiuscula nos rotulos.
2. Numeros em fonte monoespacada, como leitura de mostrador.
3. Marcas de graduacao como motivo grafico, na lateral do comparativo.

**O que o conceito nao autoriza:** nada de moldura metalica falsa, nada de gradiente
imitando aco escovado, nada de sombra fingindo relevo. Skeuomorfismo aqui viraria
brinquedo, e o produto lida com dinheiro de verdade.

## Paleta

Seis cores nomeadas. Tema claro, porque a tela vai ser lida no sol.

| Token | Hex | Papel |
|---|---|---|
| `--aco` | `#E4E8E3` | fundo da pagina, cinza esverdeado frio de aco galvanizado |
| `--papel` | `#FAFBF9` | superficie de cartao e da tabela |
| `--tinta` | `#0E1A14` | texto principal, verde quase preto |
| `--brinco` | `#C9A227` | vencedor e destaque, ouro de brinco de identificacao |
| `--sangria` | `#A03E2F` | deducoes na cascata, tijolo escuro |
| `--agua` | `#2E6B6B` | terceira serie de dados e estados neutros, verde azulado |

Distribuicao: `--aco` e `--papel` dominam quase toda a area. `--brinco` aparece em
menos de 5% da tela, sempre marcando a melhor oferta. Cor timida distribuida por igual
nao decide nada, e a tela existe para decidir.

## Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Sinalizacao | **Archivo**, eixo de largura em 112 a 125 | rotulos, cabecalho de coluna, titulos |
| Texto | **Archivo**, largura normal | frases, ajuda no ponto de uso, botoes |
| Numero | **IBM Plex Mono** | todo valor, sem excecao |

Archivo em largura expandida e a escolha distintiva: grotesca expandida le como
placa de equipamento, e quase ninguem usa o eixo de largura. IBM Plex Mono da
tabulares de verdade por construcao, o que atende a exigencia do brief sem depender
de `font-variant-numeric` funcionar em toda fonte.

Regra: largura expandida so acima de 20px. Abaixo disso ela perde legibilidade e volta
para normal.

## Layout

O brief proibe tres cartoes iguais lado a lado, e com razao: seria preguicoso num
produto que existe para comparar. A solucao e outra.

**Tudo alinha em um eixo vertical unico.** O nome interno e "a regua".

```
+---------------------+--------------------------------------------------+
|  PREMISSAS          |  VEREDITO                                        |
|  (trilho fixo)      |  Frigorifico C rende                             |
|                     |  R$ 22.400  a mais que o segundo                 |
|  lote               |                                                  |
|  40 cabecas         +--------------------------------------------------+
|  480 kg             |  COMPARATIVO                                     |
|                     |  linhas = etapas da cadeia                       |
|  taxa de desconto   |  colunas = ofertas, vencedora com espinha ouro   |
|  [====o====] 12%    |                                                  |
|                     |   preco da arroba   325,00   320,00   312,00     |
|  regime             |   quebra              -4%      -4%      -3%      |
|  PF 1,5%            |   ...                                            |
|                     |   VP por cabeca    4.812,10 4.914,03 4.980,55    |
+---------------------+--------------------------------------------------+
|  CASCATA DE DEDUCOES, largura total                                     |
|  tres ofertas sobrepostas no mesmo eixo de R$ por arroba                |
+-------------------------------------------------------------------------+
```

Assimetria: o trilho de premissas tem largura fixa de 280px, o conteudo e fluido.
O numero do veredito estoura a coluna de texto para a esquerda, quebrando a grade
de proposito, porque e o unico numero que o usuario procura primeiro.

**Por que tabela e nao cartao:** comparacao visual depende de alinhamento de digito.
Cartao lado a lado coloca o numero de cada oferta em uma altura diferente e obriga o
olho a saltar. A tabela poe `320,00` exatamente acima de `312,00`. Essa e a razao
inteira de a tabela existir aqui, e e por isso que ela e melhor que cartao neste
produto especifico.

## Elemento assinatura: a cascata

O insight do produto e que a maior arroba costuma nao ser a melhor oferta. Escrever
isso e fraco. Mostrar e forte.

Tres linhas escalonadas descem no mesmo eixo vertical de reais por arroba. Cada uma
comeca no preco bruto negociado e desce degrau por degrau: quebra, rendimento,
tributo, frete, comissao, desconto do prazo. **As linhas se cruzam.** A que comeca
mais alto termina embaixo, e o cruzamento fica visivel no ponto exato em que acontece.

Cada serie carrega tres marcadores redundantes: cor, padrao de traco e rotulo direto
na ponta. Nunca so cor.

## Movimento

Um momento de alto impacto, nao micro interacao espalhada.

Quando o usuario mexe na taxa de desconto e o ranking muda, as colunas trocam de
posicao com transicao de 240ms, ease-out. O usuario **ve** a oferta subir. Esse e o
criterio de aceite do brief transformado em experiencia, em vez de um numero que
muda calado.

Sob `prefers-reduced-motion`, a troca e instantanea e a mudanca e anunciada por
`aria-live="polite"`.

## Piso de qualidade

- Responsivo ate 360px: trilho vira acordeao no topo, tabela rola na horizontal com
  a coluna de etapas fixada, cascata empilha.
- Foco visivel com contorno de 2px em `--tinta`, nunca `outline: none`.
- Contraste AA em todo texto.
- Tabela navegavel por teclado, com cabecalhos associados por `scope`.
- `prefers-reduced-motion` respeitado.

---

# Autocritica

O brief exige criticar o plano por escrito antes de implementar. Sete riscos, com o
que faco a respeito.

**1. O ouro `--brinco` provavelmente reprova em AA como texto.**
`#C9A227` sobre `#FAFBF9` da contraste perto de 2,3:1. Reprova para texto.
*Correcao:* ouro nunca vira cor de texto pequeno. Ele so preenche a espinha da coluna
vencedora, o traco da serie na cascata e o fundo de um selo cujo texto e `--tinta`.
O vencedor tambem e marcado por peso tipografico e posicao, nunca so por cor.

**2. "Instrumento" desliza facil para quinquilharia skeuomorfica.**
Se eu comecar a desenhar bezel e textura de metal, o produto vira brinquedo e perde
a credibilidade que ele mais precisa ter.
*Correcao:* a referencia fica restrita a tipografia e as marcas de graduacao. Zero
gradiente imitando material, zero sombra fingindo relevo.

**3. A tabela com tres ou mais ofertas em 360px e o ponto fraco real do layout.**
Nao adianta fingir que rola bem. Tres colunas de numeros de seis digitos nao cabem.
*Correcao:* coluna de etapas fixada com `position: sticky`, rolagem horizontal com
`scroll-snap` por coluna, e modo compacto que mostra quatro linhas essenciais com um
expansor "ver cadeia completa". O modo compacto e o padrao abaixo de 640px.

**4. Tres series de cor na cascata podem ser ambiguas para daltonismo.**
Ouro, tijolo e verde azulado ficam parecidos em deuteranopia.
*Correcao:* padrao de traco distinto por serie mais rotulo direto na ponta da linha.
A cor vira reforco, nunca o unico canal.

**5. A animacao de reordenacao pode virar gracinha ou desorientar.**
Se ela demorar ou saltar, o usuario perde o fio de qual coluna era qual.
*Correcao:* 240ms, so quando a posicao realmente muda, e o nome do comprador fica
preso ao topo da coluna durante o movimento para o olho ter ancora.

**6. Archivo expandida em corpo pequeno perde legibilidade.**
*Correcao:* eixo de largura so acima de 20px, ja fixado como regra.

**7. Risco de eu estar violando o proprio brief.**
Ele proibe creme perto de `#F4F1EA` com serifada de alto contraste e terracota perto
de `#D97757`. Minha paleta tem ouro e tijolo, e preciso conferir honestamente se nao
recai nisso.
*Analise:* o fundo e `#E4E8E3`, cinza esverdeado frio, nao creme quente. A tipografia
e grotesca expandida, nao serifada de alto contraste. O tijolo `#A03E2F` tem
luminosidade perto de 38%, contra 62% do terracota proibido, e e bem menos alaranjado.
Os tres eixos da combinacao proibida estao diferentes. *Ressalva honesta:* ouro mais
tijolo continua sendo uma familia quente, e se na tela renderizada isso puxar para o
territorio proibido, a correcao e esfriar o tijolo em direcao a `#8A3A3A` e reduzir a
saturacao do ouro. Decido isso olhando o resultado, nao no papel.
