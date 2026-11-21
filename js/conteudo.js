/**
 * O TEXTO das duas páginas de orientação do caderno: a contracapa (Manual Geral) e as instruções
 * baseadas no discurso do Presidente Oaks.
 *
 * ## Como foi escrito
 *
 * São RESUMOS DE APOIO, com palavras próprias. Nada aqui é cópia de trecho das fontes. As únicas citações
 * textuais são ESCRITURAS, curtas, atribuídas e conferidas na edição oficial em português: 3 Néfi 18:11 na
 * contracapa e, na quarta capa, Lucas 22:19 e Morôni 6:6. Cada seção diz,
 * na própria página, de que parte do Manual Geral vem (MG = Manual Geral, edição de 2026 em português,
 * consultada em novembro de 2026). Toda frase foi conferida contra a fonte: o discurso lido inteiro e
 * cada seção do Manual Geral citada.
 *
 * ## O que o discurso diz, e o que não diz
 *
 * O discurso de 2008 pede reverência de líderes e membros juntos, e trata do planejamento e da
 * condução da reunião; ele NÃO fala do púlpito nem do estrado. A reverência de quem dirige, que a
 * estaca quis ver em destaque, vem do que o discurso diz sobre dirigir a reunião e do que o Manual
 * Geral acrescenta (29.2.1.3: os líderes dão o exemplo de reverência; 29.2.1.1: quem preside e os
 * sumos conselheiros visitantes são convidados ao púlpito; 38.1.1: quem preside zela pelo ambiente).
 * A página diz, no próprio texto, que a aplicação a quem está à frente da reunião é desta página, e
 * não atribui ao discurso o que ele não disse.
 *
 * Falas de OUTROS líderes que o discurso cita (Élder Nelson, Presidente Joseph Fielding Smith, Élder
 * Holland, a Primeira Presidência) levam o nome de quem as disse: não são do Presidente Oaks.
 *
 * ## Tamanho
 *
 * Cada página é UMA folha: o texto tem de caber em corpo de leitura (`texto-comum.js`). Mexeu aqui e
 * a página não coube? O desenho recusa em vez de apertar a letra: corte texto. `conteudo.test.mjs`
 * guarda o orçamento.
 */

export const CONTRACAPA = {
  titulo: "A reunião sacramental",
  apoio: "O que o Manual Geral orienta quem planeja, dirige e participa. Resumo de apoio, com palavras próprias.",
  secoes: [
    {
      titulo: "Planejar e dirigir",
      fonte: "MG 29.2.1 e 30.3",
      itens: [
        { destaque: "Foco.", texto: "Cabe ao bispado planejar e dirigir a reunião, que dura uma hora. O centro é o sacramento e o fortalecimento da fé em Jesus Cristo." },
        { destaque: "Quem preside.", texto: "Preside o bispo. Havendo visita de alguém da presidência da estaca, de um setenta de área ou de uma autoridade geral, preside essa pessoa. Ela e os sumos conselheiros visitantes são convidados a sentar-se ao púlpito." },
        { destaque: "Anúncios.", texto: "O menos possível: a maioria pode ser impressa, enviada ou dada em outras reuniões. Não se usam recursos audiovisuais (MG 38.8.3), exceto música gravada para acompanhar os hinos, e ninguém tira fotos nem grava vídeos (MG 29.8)." },
        { destaque: "Apoios.", texto: "Pede-se o voto a favor e depois os contrários. Nas desobrigações só se oferece agradecimento, sem perguntar se alguém se opõe (MG 30.6)." },
      ],
    },
    {
      titulo: "Antes de começar",
      fonte: "MG 29.2.1.3 e 19.3.2",
      itens: [
        { destaque: "Preparo.", texto: "Os membros se preparam em oração silenciosa e reflexão, e os líderes dão o exemplo de reverência." },
        { destaque: "Boas-vindas.", texto: "Os jovens recebem quem chega, cumprimentando pelo nome, e ajudam a encontrar lugar para se sentar." },
        { destaque: "Prelúdio.", texto: "A música tocada enquanto todos se acomodam cria um ambiente de adoração que convida o Espírito." },
      ],
    },
    {
      titulo: "O sacramento",
      fonte: "MG 29.2.1.1 e 18.9",
      itens: [
        { destaque: "Centro da reunião.", texto: "Nada deve desviar a atenção da ordenança nem diminuir a sua importância." },
        { destaque: "Quem administra.", texto: "A mesa é preparada antes do início. Quem administra representa Jesus Cristo: está limpo e bem arrumado, sem roupas ou joias que distraiam." },
        { destaque: "Hino.", texto: "O hino sacramental é cantado por toda a congregação enquanto se parte o pão. Nem solo nem música instrumental o substituem, e não se toca música na distribuição." },
        { destaque: "Orações sacramentais.", texto: "Devem sair claras, corretas e dignas. Se o erro não for corrigido por quem ora, o bispo pede, com delicadeza, que repita." },
      ],
    },
    {
      titulo: "Oradores, orações e música",
      fonte: "MG 29.2.1.4, 29.6 e 19.3.1",
      itens: [
        { destaque: "Oradores.", texto: "O bispado os escolhe, jovens e crianças inclusive, e convida com bastante antecedência. Testificam de Jesus Cristo e ensinam com as escrituras." },
        { destaque: "Mensagens.", texto: "Edificam a fé e respeitam a natureza sagrada do sacramento." },
        { destaque: "Orações.", texto: "Devem ser curtas, simples e conduzidas pelo Espírito. Em português, dirigem-se ao Pai com Tu e Teu, ou Vós e Vosso." },
        { destaque: "Música.", texto: "É adoração, e não apresentação para mostrar talento." },
      ],
    },
    {
      titulo: "Jejum e testemunhos",
      fonte: "MG 29.2.2 e 38.8.17",
      itens: [
        { destaque: "Quando.", texto: "Uma vez por mês, em geral no primeiro domingo. Havendo conferência nesse dia, a presidência da estaca define outro domingo." },
        { destaque: "Como.", texto: "Sem oradores designados nem música especial: quem dirige presta um breve testemunho e convida a congregação a fazer o mesmo." },
        { destaque: "Testemunhos.", texto: "Breves, para que muitos participem. Crianças pequenas podem prestar testemunho, mas talvez seja melhor que aprendam a fazê-lo em casa, até conseguirem sem ajuda. O nome e a bênção das crianças costumam ser dados nessa reunião." },
      ],
    },
  ],
  // A única citação textual do caderno: curta, atribuída e conferida na edição oficial em português.
  // A quebra de linha é de propósito: a frase se parte no meio do pensamento, e não deixa uma palavra sozinha.
  citacao: {
    texto: "E se vos lembrardes sempre de mim,\ntereis o meu Espírito convosco.",
    fonte: "JESUS CRISTO  ·  3 NÉFI 18:11",
  },
  nota: "MG = Manual Geral, edição de 2026, consultada em novembro de 2026. Onde se lê bispo ou bispado, entenda também presidente ou presidência do ramo (MG 0.5); no grupo, quem dirige é o líder do grupo (MG 37.7). Em caso de dúvida, vale o texto oficial.",
};

export const INSTRUCOES = {
  titulo: "A reunião sacramental e o sacramento",
  apoio: "Com base no discurso do Presidente Dallin H. Oaks (então Élder) na Conferência Geral de outubro de 2008.",
  reverencia: {
    titulo: "Reverência no púlpito: o exemplo de quem dirige",
    apoio: "O discurso pede reverência de todos, e o Manual Geral (29.2.1.3) diz que, antes da reunião, os líderes dão o exemplo de reverência. Esta página aplica isso a quem está à frente: quem preside, dirige, fala ou rege.",
    itens: [
      { destaque: "Chegue cedo.", texto: "Todos devem estar sentados com folga antes da hora. Quem preside, dirige ou fala dá o exemplo, já no seu lugar." },
      { destaque: "Quietude no prelúdio.", texto: "O então Élder Nelson ensinou que não é hora de conversar nem de passar recados, e sim de meditar em espírito de oração, líderes e membros juntos." },
      { destaque: "Nada que distraia.", texto: "No sacramento, a atenção é toda de adoração: deixe de lado outras atividades, como ler livros ou revistas, sobretudo as que atrapalham os outros." },
      { destaque: "Sem leviandade.", texto: "Para o Presidente Joseph Fielding Smith, diversão, risos e leviandade são inoportunos aqui: a reunião pede oração, humildade e coração devoto." },
      { destaque: "Dirigir com dignidade.", texto: "Conduza com brevidade, inclusive os assuntos administrativos, e planeje o restante da reunião para voltar a atenção à Expiação e a Jesus Cristo." },
      { destaque: "Quem preside zela.", texto: "Quem preside garante que todos respeitem o ambiente sagrado, sem distúrbios nem distrações (MG 38.1.1)." },
    ],
  },
  lideres: {
    titulo: "Para os líderes",
    itens: [
      { destaque: "Aponte para o Salvador.", texto: "Hinos, orações e discursos são planejados para voltar a atenção de todos à Expiação e aos ensinamentos de Jesus Cristo." },
      { destaque: "Discursos espirituais.", texto: "Devem ser espirituais na forma e no conteúdo. Segundo o Presidente Joseph Fielding Smith, a reunião é para expor o evangelho, exortar à fé e refletir na missão do Redentor." },
      { destaque: "Música para adorar.", texto: "Planeje-a com cuidado: é para adorar, e não para se exibir. Segundo a Primeira Presidência, alguns dos maiores sermões são pregados pelo canto dos hinos." },
      { destaque: "Quem oficia.", texto: "Os rapazes devem estar dignos e receber a incumbência do bispado ou da presidência do quórum. Os sacerdotes dizem as orações devagar e com clareza." },
      { destaque: "Aparência discreta.", texto: "Quem oficia fica bem arrumado, em roupas discretas, sem nada que atraia olhares. O então Élder Holland sugeriu camisa branca; não se deve exigir roupa igual (MG 18.9.3)." },
      { destaque: "Ensine o valor da reunião.", texto: "É a reunião mais importante e sagrada da Igreja e a única de domingo que reúne a família toda. Ajude os que ainda não entendem isso, jovens e adultos." },
    ],
  },
  membros: {
    titulo: "Para os membros",
    itens: [
      { destaque: "Venha preparado.", texto: "Traga coração quebrantado e espírito contrito. O então Élder Nelson ensinou que cada um responde pelo crescimento espiritual que a reunião pode trazer." },
      { destaque: "Vista-se com respeito.", texto: "A roupa mostra o quanto se compreende a ordenança, como ao ir ao templo. Vale a melhor roupa de domingo disponível, sem julgar ninguém pelo que veste (MG 38.8.15)." },
      { destaque: "Cante.", texto: "A música é elemento essencial da adoração, e o canto dos justos é prece ao Senhor (D&C 25:12). Participe do canto, em especial do hino que prepara para o sacramento." },
      { destaque: "No sacramento, adore.", texto: "Concentre-se em adorar e deixe de lado outras atividades, como ler livros ou revistas e, no caso dos jovens, falar ao celular ou mandar mensagens de texto." },
      { destaque: "Renove o convênio.", texto: "Ao tomar o sacramento você faz o sagrado convênio de lembrar-se sempre do Salvador e recebe a promessa de ter sempre o Seu Espírito." },
      { destaque: "Seja constante.", texto: "Quem participa devidamente, toda semana, faz jus a essa promessa. O alicerce do testemunho é esse Espírito." },
    ],
  },
  nota: "Resumo de apoio do discurso “A Reunião Sacramental e o Sacramento” (conferência geral de outubro de 2008), com o que o Manual Geral acrescenta onde indicado. Falas de outros líderes citadas no discurso levam o nome de quem as disse. Em caso de dúvida, vale o texto oficial.",
};

/**
 * A QUARTA CAPA (a capa de trás, a última folha do caderno): uma escritura em destaque e outra, menor, sobre
 * o sacramento. O texto é LITERAL, da edição oficial em português (lido em churchofjesuschrist.org em
 * 21/11/2026; `tests/conteudo.test.mjs` guarda a grafia). As quebras de linha (`\n`) são só de diagramação.
 *
 *   Lucas 22:19  https://www.churchofjesuschrist.org/study/scriptures/nt/luke/22?lang=por&id=p19#p19
 *   Morôni 6:6   https://www.churchofjesuschrist.org/study/scriptures/bofm/moro/6?lang=por&id=p6#p6
 *
 * Lucas 22:19 começa em "E tomando o pão, e havendo dado graças, partiu-o, e deu-lho, dizendo:": o destaque
 * é a fala do Salvador, a partir de "Isto é o meu corpo".
 */
export const QUARTA_CAPA = {
  principal: {
    texto: "Isto é o meu corpo,\nque por vós é dado;\nfazei isto em memória de mim.",
    referencia: "LUCAS 22:19",
  },
  secundaria: {
    texto: "E reuniam-se frequentemente para partilhar o pão e o vinho, em lembrança do Senhor Jesus.",
    referencia: "MORÔNI 6:6",
  },
};
