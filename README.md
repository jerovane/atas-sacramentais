# Atas da Reunião Sacramental

Motor de atas da reunião sacramental das unidades da **Estaca Pacajus Brasil**.

A pessoa escolhe a **unidade** e o **ano**. O site descobre quantas atas são necessárias e para quais domingos, e entrega o **caderno completo em PDF**, pronto para imprimir frente e verso: capa, contracapa com as orientações do Manual Geral, instruções baseadas no discurso do Presidente Oaks, calendário do ano e uma ata para cada domingo.

Roda inteiro no navegador, no **GitHub Pages**. Não tem servidor nem banco de dados, e as atas saem em branco (para escrever à mão): o site não guarda nome nem dado de ninguém.

---

## Como usar

1. Abra o site e entre com o **número da estaca** e a senha.
2. Escolha a **unidade** (ou cadastre uma nova) e o **ano**.
3. Confira os **domingos**. O motor já separa os de jejum e testemunhos e tira os de conferência; para trocar um domingo, toque nele.
4. Toque em **Baixar o PDF** (ou **Abrir para conferir**) e imprima: **A4, frente e verso, virando pela borda maior**. O verso de cada folha já vem na página seguinte.

## O que tem no caderno

Cada folha é frente e verso. Toda parte tem número **par** de páginas, então a impressão frente e verso nunca desencontra.

| Folha | Frente | Verso |
|---|---|---|
| 1 | Capa | Contracapa: orientações do Manual Geral e uma citação |
| 2 | Instruções do discurso do Presidente Oaks (a reverência dos líderes em destaque) | Calendário do ano, com o número de cada ata |
| 3 em diante | **Ata** do domingo | **Frequência e ministração**: quem faltou, quem vai ministrar e quando; no domingo de jejum e testemunhos, também quem prestou testemunho |
| Última | **Anotações**: linhas para o que a ata não comporta | **Quarta capa** (a capa de trás): Lucas 22:19 em destaque e Morôni 6:6, sobre o sacramento |

Em 2027, com 50 atas, são 106 páginas (53 folhas). A folha de anotações existe também por uma razão de impressão: a quarta capa tem de cair no **verso da última folha**, por fora quando o caderno é montado, e por isso precisa de uma página irmã na frente dela. As duas escrituras são o texto **literal** da edição oficial em português, e o teste confere letra por letra.

A ata (frente) tem os campos da ata que a estaca já usava, na ordem em que a reunião acontece: horário de início, nº de presentes, presidida, dirigida, regente, pianista/organista, reconhecimentos, anúncios (em branco), hinos e orações, desobrigações, apoios e reconhecimentos, membro confirmado(a), hino sacramental, oradores com tema e tempo (ou os testemunhos), último hino e última oração, e as assinaturas.

As linhas de escrever têm passo de uns 6,7 mm e traço visível na fotocópia: é por isso que cada bloco tem poucas linhas (o espaço da folha é o que limita). No domingo de jejum e testemunhos, a faixa **Testemunhos** da frente manda anotar os nomes no verso, e é lá que ficam as duas colunas numeradas.

### Margem de encadernação (pasta de 2 ou 4 furos)

Na tela, a caixinha **Margem maior do lado dos furos** vem **marcada**. Com ela, o texto começa a **18 mm** da borda do lado da lombada, onde ficam os furos (que ocupam de 9 a 15 mm), e sobram uns 10,7 mm do outro lado. A lombada é a borda **maior** da folha, então a margem maior fica à **esquerda** nas páginas ímpares (a frente) e à **direita** nas pares (o verso): é o que o PDF faz sozinho, desde que se imprima **frente e verso, virando pela borda maior**. Por baixo, cada página é só reduzida em 1 % e deslocada; o desenho não muda. A capa e a quarta capa ficam como são. Para **espiral** ou **grampo**, desmarque a caixinha: o aparelho lembra a escolha. (Na linha de comando, `npm run exemplo -- --sem-encadernacao`.)

## Como o motor decide os domingos

As regras vêm das atas reais de 2024 da estaca, e os testes (`tests/calendario.test.mjs`) conferem que 2024 sai **idêntico** ao caderno que a estaca já usou:

- Toda ata é de um **domingo** (52 ou 53 por ano).
- O **primeiro domingo do mês** é de **jejum e testemunhos**: sem oradores, com testemunhos e crianças abençoadas.
- Domingo de **conferência** (Geral, em abril e outubro, e a de estaca) **não tem reunião sacramental**, então não tem ata.
- Se o primeiro domingo cai em conferência, o jejum e testemunhos **passa para o domingo seguinte** (em 2024: 14/04, 09/06 e 13/10). O Manual Geral (38.8.17) diz que, nesse caso, **a presidência da estaca define o domingo alternativo**: o motor segue o costume da estaca, e quem usa troca o domingo na lista se a presidência definiu outro.

**Conferência Geral:** as datas oficiais estão na tabela `CONFERENCIA_GERAL` em `js/calendario.js` (2023 a 2027). Para um ano fora da tabela o motor **estima** (domingo seguinte ao primeiro sábado de abril e de outubro) e a tela avisa que é estimativa. Acrescente o ano novo à tabela quando a Igreja divulgar as datas.

**Conferência de estaca:** não dá para calcular; a pessoa toca no domingo dela e escolhe “sem reunião”.

## Unidades

A lista oficial fica em `js/config.js` (alas, ramos e grupos da estaca). O tipo (ala, ramo ou grupo) decide quem assina a ata: o **Bispo**, o **Presidente do Ramo** ou o **Líder do Grupo**.

**Cadastrar uma unidade nova:** na tela, “Cadastrar ou remover unidades”. Ela fica salva **neste aparelho** e já aparece para escolher. Como o site não tem servidor, para valer em **todos** os aparelhos a tela mostra as linhas para colar em `js/config.js`, dentro de `unidades: [ … ]`; depois disso a cópia local some sozinha.

## Acesso e senha

O login é o **número da estaca** (1411578). A senha **não está escrita em lugar nenhum do código**: só o seu *hash* (PBKDF2-SHA256, com sal e 600 mil voltas).

> **O que isto protege, e o que não.** O site é estático, então a conferência da senha acontece no navegador. Ela evita o uso por engano ou por curiosidade e nunca expõe a senha, mas **não é uma tranca contra quem sabe ler o código da página**: o código é público. Por isso o site não guarda dado pessoal nenhum.

**Trocar a senha** (a senha nova só vale depois de publicada):

1. No site, abra **Trocar senha**, digite a senha nova duas vezes e copie o código gerado. (Ou, no computador, `npm run senha`.)
2. No GitHub, abra `js/config.js`, clique no lápis e troque o bloco `acesso: { … }` pelo código copiado.
3. Salve (**Commit changes**). Em um ou dois minutos a senha nova vale, e as sessões antigas deixam de valer.

**Esqueci a senha:** o botão abre um e-mail para o endereço de recuperação (guardado codificado em `js/config.js`, em `recuperacao.destino`). Quem tem acesso ao repositório troca a senha pelo passo a passo acima. Para trocar o endereço: `npm run senha -- --email=novo@exemplo.com` mostra o valor codificado.

## Publicar no GitHub Pages

O site está em **https://jerovane.github.io/atas-sacramentais/** (repositório público `jerovane/atas-sacramentais`: no plano gratuito do GitHub, o Pages só publica repositório público).

Como foi montado, para refazer em outro repositório:

1. Crie o repositório no GitHub e envie estes arquivos (branch `main`).
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions** (ou `gh api -X POST repos/DONO/REPO/pages -f build_type=workflow`). Faça isto **antes** do primeiro envio: o passo `configure-pages` do fluxo falha se o Pages ainda não existe.
3. A cada alteração em `main`, o fluxo `.github/workflows/publicar.yml` **roda os testes** e, se todos passarem, publica só o que é do site (`index.html`, `css`, `js`, `assets`, `vendor`). Se um teste falhar, nada vai ao ar.
4. Em outro endereço (outro usuário, outro nome, domínio próprio), troque as URLs absolutas `og:url` e `og:image` do `index.html`: é o único lugar do site que não usa caminho relativo.

Os caminhos do site são **relativos**, então funciona em qualquer subpasta do `github.io`.

## Para mexer no código

```bash
npm install        # só o pdfkit, para os testes
npm test           # todos os testes
npm run servir     # o site em http://127.0.0.1:8080 (precisa de endereço http; file:// não funciona)
npm run exemplo -- --saida=/caminho/exemplo.pdf --ano=2027 --unidade="Ala Pacajus 1"
npm run senha      # gera o bloco de acesso para uma senha nova
```

```
index.html, css/        a página
js/
  config.js             estaca, acesso, e-mail de recuperação e unidades oficiais
  calendario.js         quais domingos pedem ata, e de que tipo (regras acima)
  unidades.js           nome, tipo e cadastro de unidades
  acesso.js             login, sessão e e-mail de recuperação
  conteudo.js           o TEXTO das páginas de orientação
  app.js, navegador.js  a tela e o que só o navegador faz (buscar fontes e gerador de PDF)
  pdf/                  o desenho do caderno (roda igual no navegador e no Node)
assets/                 fontes (Inter e Lora), logotipo e templo da estaca, ícones e cartão de compartilhamento
vendor/                 o pdfkit, versão para navegador
ferramentas/            servidor local, gerador de exemplo, troca de senha, cartão e ícones
tests/                  testes
```

O desenho do PDF é o **mesmo código** no navegador e no Node: os testes geram o caderno de verdade com o pdfkit, e foi conferido que o PDF gerado no navegador renderiza **pixel a pixel igual** ao do Node.

## Sobre o conteúdo

As páginas de orientação são **resumos de apoio, escritos com palavras próprias**, baseados no Manual Geral e no discurso citado; as fontes estão indicadas nas próprias páginas. Em caso de dúvida, vale o texto oficial. Este site é uma ferramenta de apoio preparada pela estaca; **não é material oficial** de A Igreja de Jesus Cristo dos Santos dos Últimos Dias.

## Compartilhar o link no WhatsApp

O `index.html` traz o cartão de pré-visualização (`og:*`) e o ícone da aba. O cartão é `assets/compartilhar/og-atas-v1.jpg` (1200 × 630, uns 130 KB): no molde do cartão do Álbum Digital, com o caderno de verdade à direita. O WhatsApp **guarda o cartão por endereço**: ao trocar a arte, dê um nome novo ao arquivo (`og-atas-v2.jpg`) e mude o `og:image` do `index.html`. O endereço da imagem tem de ser **absoluto** (o rastreador do WhatsApp não lê caminho relativo), e `tests/compartilhar.test.mjs` confere endereço, dimensões e peso (até 300 KB).

- Refazer o cartão: o passo a passo está no comentário de `ferramentas/gerar-cartao.mjs`.
- Refazer os ícones: edite `assets/icones/favicon.svg` e rode `node ferramentas/gerar-icones.mjs` (precisa de `npm i --no-save sharp`).

## Licenças

- **pdfkit** (MIT): `vendor/pdfkit.LICENSE`.
- **Inter** e **Lora** (SIL Open Font License 1.1): `assets/fontes/OFL.txt`. Os arquivos são subconjuntos (Latin) das fontes originais.
- O logotipo e a ilustração do templo são da Estaca Pacajus Brasil.
