import { test } from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { CONTRACAPA, INSTRUCOES, QUARTA_CAPA } from "../js/conteudo.js";
import { paraOPapel } from "../js/pdf/desenho.js";
import { gerarLivro } from "../js/pdf/livro.js";
import { carregarRecursosDoDisco } from "../ferramentas/recursos-do-disco.mjs";

/**
 * O texto das páginas de orientação: as regras que o fazem digno de ir impresso.
 *
 * São resumos de apoio de fontes da Igreja, e três coisas importam mais que o estilo: que nada
 * seja cópia (a única citação literal é uma, curta e atribuída), que cada número de seção do Manual
 * Geral citado tenha sido conferido na fonte, e que o texto caiba em UMA folha em letra de leitura.
 */

const palavras = (t) => t.trim().split(/\s+/).filter(Boolean);

const itensDaContracapa = CONTRACAPA.secoes.flatMap((s) => s.itens);
const itensDasInstrucoes = [...INSTRUCOES.reverencia.itens, ...INSTRUCOES.lideres.itens, ...INSTRUCOES.membros.itens];
const todosOsItens = [...itensDaContracapa, ...itensDasInstrucoes];

/** Todo texto que vai impresso nas duas páginas. */
const todosOsTextos = [
  CONTRACAPA.titulo, CONTRACAPA.apoio, CONTRACAPA.nota, CONTRACAPA.citacao.texto, CONTRACAPA.citacao.fonte,
  INSTRUCOES.titulo, INSTRUCOES.apoio, INSTRUCOES.nota, INSTRUCOES.reverencia.titulo, INSTRUCOES.reverencia.apoio,
  INSTRUCOES.lideres.titulo, INSTRUCOES.membros.titulo,
  ...CONTRACAPA.secoes.flatMap((s) => [s.titulo, s.fonte]),
  ...todosOsItens.flatMap((i) => [i.destaque, i.texto]),
];

test("não sobrou nada do texto provisório", () => {
  for (const t of todosOsTextos) assert.doesNotMatch(t, /provis[óo]rio|lorem|todo\b|xxx/i, t.slice(0, 50));
});

test("todo caractere do texto sai no papel: a fonte tem todos, e nenhum vira '?'", () => {
  for (const t of todosOsTextos) assert.equal(paraOPapel(t), t.normalize("NFC"), t.slice(0, 50));
});

test("cada item tem um destaque curto (que termina em ponto) e um texto de frase completa", () => {
  for (const i of todosOsItens) {
    assert.match(i.destaque, /^[^.]{3,32}\.$/, `destaque: ${i.destaque}`);
    assert.match(i.texto, /[.)]$/, `o texto de "${i.destaque}" termina em ponto`);
    assert.doesNotMatch(i.texto, /\s{2,}/, `espaço duplicado em "${i.destaque}"`);
    assert.ok(palavras(i.texto).length <= 40, `"${i.destaque}" tem ${palavras(i.texto).length} palavras: resuma`);
  }
});

test("a ÚNICA citação literal é uma, curta, e é escritura atribuída", () => {
  assert.ok(palavras(CONTRACAPA.citacao.texto).length <= 15, "até 15 palavras");
  assert.match(CONTRACAPA.citacao.fonte, /3 NÉFI 18:11/);
  // Nenhum item traz trecho entre aspas: o resto do caderno é paráfrase.
  for (const i of todosOsItens) assert.doesNotMatch(`${i.destaque} ${i.texto}`, /["“”«»]/, `aspas em "${i.destaque}"`);
});

test("os números de seção do Manual Geral são só os que foram conferidos na fonte", () => {
  // Cada um foi lido na edição de 2026 em português. Número novo? Confira na fonte e ACRESCENTE aqui.
  const CONFERIDAS = new Set([
    "0.5", "18.9", "18.9.3", "19.3.1", "19.3.2", "29.2.1", "29.2.1.1", "29.2.1.3", "29.2.1.4", "29.2.2", "29.6", "29.8",
    "30.3", "30.6", "37.7", "38.1.1", "38.8.3", "38.8.15", "38.8.17",
  ]);
  const citadas = new Set();
  // Um ou dois dígitos antes do primeiro ponto: "0.5" (termos do manual) conta como "29.2.1.3".
  for (const t of todosOsTextos) for (const m of t.matchAll(/\b\d{1,2}(?:\.\d+)+\b/g)) citadas.add(m[0]);
  for (const s of CONTRACAPA.secoes) for (const m of s.fonte.matchAll(/\b\d{2}(?:\.\d+)*\b/g)) citadas.add(m[0]);
  assert.ok(citadas.size >= 8, "as páginas citam as seções");
  for (const numero of citadas) assert.ok(CONFERIDAS.has(numero), `a seção ${numero} não foi conferida na fonte`);
});

test("a página do discurso é honesta sobre a origem: o que vem do Manual Geral diz que vem do Manual Geral", () => {
  const caixa = INSTRUCOES.reverencia;
  assert.match(caixa.titulo, /Reverência/);
  assert.match(caixa.titulo, /púlpito/, "a reverência de quem está no púlpito está em destaque, como pedido");
  assert.match(caixa.apoio, /discurso pede reverência de todos/);
  assert.match(caixa.apoio, /Manual Geral \(29\.2\.1\.3\)/, "o exemplo dos líderes é do Manual, e a página diz");
  assert.match(INSTRUCOES.nota, /Manual Geral acrescenta/);
  assert.match(INSTRUCOES.apoio, /Oaks/);
  assert.match(INSTRUCOES.apoio, /outubro de 2008/);
  assert.match(INSTRUCOES.nota, /vale o texto oficial/);
  assert.match(CONTRACAPA.nota, /vale o texto oficial/);
  // O que o discurso não diz (a aplicação a quem está à frente da reunião) é declarado como da página.
  assert.match(caixa.apoio, /Esta página aplica isso a quem está à frente/);
  assert.match(caixa.apoio, /antes da reunião, os líderes dão o exemplo de reverência/, "MG 29.2.1.3 trata do tempo que precede a reunião: o escopo vai na frase");
});

test("fala de outro líder, citada no discurso, leva o nome de quem a disse (não é do Presidente Oaks)", () => {
  const dito = (itens, destaque) => itens.find((i) => i.destaque === destaque)?.texto ?? "";
  assert.match(dito(INSTRUCOES.reverencia.itens, "Quietude no prelúdio."), /Élder Nelson/);
  assert.match(dito(INSTRUCOES.reverencia.itens, "Sem leviandade."), /Presidente Joseph Fielding Smith/);
  assert.match(dito(INSTRUCOES.lideres.itens, "Discursos espirituais."), /Presidente Joseph Fielding Smith/);
  assert.match(dito(INSTRUCOES.lideres.itens, "Música para adorar."), /Primeira Presidência/);
  assert.match(dito(INSTRUCOES.lideres.itens, "Aparência discreta."), /Élder Holland/);
  assert.match(dito(INSTRUCOES.membros.itens, "Venha preparado."), /Élder Nelson/, "'cada um responde pelo crescimento espiritual' é do Élder Nelson");
  assert.match(INSTRUCOES.nota, /Falas de outros líderes citadas no discurso levam o nome de quem as disse/);
  // Quem já era Élder quando falou (Nelson em 2003, Holland em 1995, Oaks em 2008) leva "então Élder": hoje têm outros títulos.
  for (const [lista, destaque, nome] of [["reverencia", "Quietude no prelúdio.", "Nelson"], ["membros", "Venha preparado.", "Nelson"], ["lideres", "Aparência discreta.", "Holland"]]) {
    assert.match(dito(INSTRUCOES[lista].itens, destaque), new RegExp(`então Élder ${nome}`), `${nome}: título da época`);
  }
  assert.match(INSTRUCOES.apoio, /então Élder/);
  // O que o Manual Geral diz sobre a camisa branca: sugestão, nunca exigência (18.9.3).
  assert.match(dito(INSTRUCOES.lideres.itens, "Aparência discreta."), /não se deve exigir roupa igual \(MG 18\.9\.3\)/);
});

test("o que o discurso diz só a jovens, ou só sobre leitura, não vira proibição geral", () => {
  // "ler livros ou revistas" e "mensagens de texto" são as palavras do discurso; "sem leitura, sem celular" proibiria até as escrituras e o hinário.
  const texto = (i) => `${i.destaque} ${i.texto}`;
  const nada = INSTRUCOES.reverencia.itens.find((i) => i.destaque === "Nada que distraia.");
  assert.match(nada.texto, /ler livros ou revistas/);
  const adore = INSTRUCOES.membros.itens.find((i) => i.destaque === "No sacramento, adore.");
  assert.match(adore.texto, /ler livros ou revistas/);
  // O celular e as mensagens de texto o discurso dirige aos JOVENS ("Jovens, essa não é uma ocasião..."): só aparecem junto de "jovens".
  for (const i of itensDasInstrucoes) {
    if (/celular|mensagens de texto/i.test(texto(i))) assert.match(texto(i), /jovens/, `"${i.destaque}" fala de celular sem dizer que é aos jovens`);
  }
  assert.match(adore.texto, /no caso dos jovens, falar ao celular ou mandar mensagens de texto/);
  for (const i of itensDasInstrucoes) assert.doesNotMatch(texto(i), /sem leitura|sem celular/i);
});

test("as afirmações do Manual Geral ficam com a força que ele tem (nada de 'sempre' onde o manual diz 'talvez')", () => {
  const testemunhos = CONTRACAPA.secoes.flatMap((s) => s.itens).find((i) => i.destaque === "Testemunhos.");
  assert.match(testemunhos.texto, /talvez seja melhor/, "MG 29.2.2: 'Talvez seja melhor que elas aprendam em casa'");
  assert.doesNotMatch(testemunhos.texto, /aprendem melhor em casa/);
});

test("as escrituras da quarta capa são o texto LITERAL da edição oficial em português", () => {
  // Lidos em churchofjesuschrist.org (?lang=por) em 21/11/2026, com o script da skill igreja-fontes.
  const OFICIAL = {
    "LUCAS 22:19": "E tomando o pão, e havendo dado graças, partiu-o, e deu-lho, dizendo: Isto é o meu corpo, que por vós é dado; fazei isto em memória de mim.",
    "MORÔNI 6:6": "E reuniam-se frequentemente para partilhar o pão e o vinho, em lembrança do Senhor Jesus.",
  };
  for (const e of [QUARTA_CAPA.principal, QUARTA_CAPA.secundaria]) {
    assert.ok(OFICIAL[e.referencia], `a referência ${e.referencia} tem texto oficial conferido`);
    const corrido = e.texto.replace(/\s*\n\s*/g, " ");
    assert.ok(OFICIAL[e.referencia].includes(corrido), `${e.referencia}: o que a página imprime tem de estar, letra por letra, no versículo`);
    assert.equal(paraOPapel(e.texto), e.texto.normalize("NFC"), `${e.referencia}: todo caractere sai no papel`);
  }
  // O destaque é a fala do Salvador: começa no começo de uma frase do versículo, e não no meio de uma palavra.
  assert.ok(QUARTA_CAPA.principal.texto.startsWith("Isto é o meu corpo"));
  assert.ok(OFICIAL["LUCAS 22:19"].endsWith(QUARTA_CAPA.principal.texto.replace(/\s*\n\s*/g, " ")), "termina onde o versículo termina");
  // A segunda é o versículo INTEIRO.
  assert.equal(QUARTA_CAPA.secundaria.texto, OFICIAL["MORÔNI 6:6"]);
});

test("há as duas colunas e a caixa, com conteúdo", () => {
  assert.ok(INSTRUCOES.reverencia.itens.length >= 5);
  assert.ok(INSTRUCOES.lideres.itens.length >= 5);
  assert.ok(INSTRUCOES.membros.itens.length >= 5);
  assert.equal(CONTRACAPA.secoes.length, 5);
  for (const s of CONTRACAPA.secoes) assert.ok(s.itens.length >= 3, s.titulo);
});

test("o orçamento de texto de cada página, que a mantém em UMA folha com letra de leitura", () => {
  const contar = (itens) => itens.reduce((soma, i) => soma + palavras(`${i.destaque} ${i.texto}`).length, 0);
  assert.ok(contar(itensDaContracapa) <= 420, `contracapa: ${contar(itensDaContracapa)} palavras`);
  assert.ok(contar(itensDasInstrucoes) <= 540, `instruções: ${contar(itensDasInstrucoes)} palavras`);
});

test("no PDF, as duas páginas saem em letra de leitura (9,5 pt ou mais) e dentro da página", async () => {
  const recursos = await carregarRecursosDoDisco();
  const livro = await gerarLivro({
    PDFDocument,
    recursos,
    unidade: { nome: "Ala Pacajus 1", tipo: "ala" },
    estaca: { nome: "Estaca Pacajus Brasil" },
    ano: 2027,
    geradoEm: new Date("2026-11-20T12:00:00Z"),
    limiteDeAtas: 1,
  });
  for (const pagina of [2, 3]) {
    // O texto corrido do corpo da página: a faixa do topo (y < 110) e o rodapé (y > 790) são pequenos por desenho,
    // e o rótulo de origem de cada seção ("MG 29.2.1 e 30.3") é referência, não texto de leitura.
    const corrido = livro.textos.filter((t) => t.pagina === pagina && t.fonte === "Inter" && t.texto.length > 30 && t.y > 110 && t.y < 790 && !/^MG \d/.test(t.texto));
    assert.ok(corrido.length >= 10, `página ${pagina}: texto corrido encontrado`);
    // 9,5 pt: abaixo disso cansa quem lê no púlpito. As duas páginas hoje saem em 9,6 e 9,8 pt.
    assert.ok(Math.min(...corrido.map((t) => t.tamanho)) >= 9.5, `página ${pagina}: letra de ${Math.min(...corrido.map((t) => t.tamanho))} pt`);
  }
});
