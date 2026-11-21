import { test } from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { A4, COR, ENCADERNACAO } from "../js/pdf/tema.js";
import { PASSO } from "../js/pdf/paginas/ata-comum.js";
import { BASE_DO_TEMPLO, colarArtigos, desenharQuartaCapa } from "../js/pdf/paginas/quarta-capa.js";
import { Pintor } from "../js/pdf/desenho.js";
import { PAGINAS_FINAIS, PAGINAS_FIXAS, contarPaginas, gerarLivro } from "../js/pdf/livro.js";
import { TIPO, planejarAno } from "../js/calendario.js";
import { carregarRecursosDoDisco } from "../ferramentas/recursos-do-disco.mjs";

/**
 * O caderno inteiro, gerado de verdade (pdfkit no Node), conferido pelo que o desenhista
 * registrou e pelo próprio arquivo. O navegador roda este MESMO código de desenho — foi conferido
 * pixel a pixel contra o do Node — então o que se prova aqui vale para quem gera no site.
 */

const recursos = await carregarRecursosDoDisco();
const ESTACA = { nome: "Estaca Pacajus Brasil" };
const GERADO_EM = new Date("2026-11-20T12:00:00Z");

const gerar = (extra = {}) =>
  gerarLivro({
    PDFDocument,
    recursos,
    unidade: { nome: "Ala Pacajus 1", tipo: "ala" },
    estaca: ESTACA,
    ano: 2027,
    geradoEm: GERADO_EM,
    ...extra,
  });

const doTexto = (livro, pagina) => livro.textos.filter((t) => t.pagina === pagina).map((t) => t.texto);

const caderno2027 = await gerar();

test("o caderno de 2027 tem as páginas certas: as fixas, frente e verso de cada ata e as duas do fecho", () => {
  const plano = planejarAno(2027);
  assert.equal(caderno2027.paginas, contarPaginas(plano));
  assert.equal(caderno2027.paginas, PAGINAS_FIXAS + 2 * 50 + PAGINAS_FINAIS);
  assert.equal(caderno2027.paginas, 106);
  assert.equal(caderno2027.paginas % 2, 0, "número PAR de páginas: a impressão frente e verso fecha");
});

test("o arquivo é um PDF de verdade, com tantas páginas quantas o desenhista contou", () => {
  const texto = Buffer.from(caderno2027.bytes).toString("latin1");
  assert.ok(texto.startsWith("%PDF-1.7"));
  assert.ok(texto.trimEnd().endsWith("%%EOF"));
  assert.equal((texto.match(/\/Type \/Page\b(?!s)/g) ?? []).length, caderno2027.paginas);
  assert.match(texto, /\/Lang \(pt-BR\)/);
});

test("as páginas do começo, nessa ordem: capa, contracapa, instruções do discurso e calendário", () => {
  const capa = doTexto(caderno2027, 1).join(" | ");
  assert.match(capa, /Reunião Sacramental/);
  assert.match(capa, /Ala Pacajus 1/);
  assert.match(capa, /2027/);
  assert.match(doTexto(caderno2027, 2).join(" | "), /ORIENTAÇÕES DO MANUAL GERAL/);
  assert.match(doTexto(caderno2027, 3).join(" | "), /INSTRUÇÕES PARA A REUNIÃO/);
  assert.match(doTexto(caderno2027, 4).join(" | "), /Os domingos de 2027/);
});

test("o caderno fecha com a folha de anotações e a quarta capa (a de trás), e a quarta capa cai no verso da última folha", () => {
  const n = caderno2027.paginas;
  assert.equal(n % 2, 0, "a quarta capa é página PAR: cai no verso da última folha, por fora quando o caderno é montado");
  const anotacoes = doTexto(caderno2027, n - 1).join(" | ");
  assert.match(anotacoes, /ANOTAÇÕES/);
  assert.match(anotacoes, /Anotações do ano/);
  const quartaCapa = doTexto(caderno2027, n).join(" | ");
  assert.match(quartaCapa, /LUCAS 22:19/);
  assert.match(quartaCapa, /MORÔNI 6:6/);
  assert.match(quartaCapa, /Ala Pacajus 1\s+·\s+2027/, "a unidade e o ano, na faixa");
  // A última ata termina na página n - 2: o fecho começa logo depois dela.
  assert.ok(doTexto(caderno2027, n - 2).join(" | ").includes("50 de 50"));
});

test("a margem de encadernação: do lado dos furos o texto começa a 18 mm da borda, e nada passa dos 10 mm do lado de fora", () => {
  const n = caderno2027.paginas;
  const interna = ENCADERNACAO.interna; // 18 mm
  const externaMinima = 28; // ~10 mm: o que sobra do outro lado depois de reduzir 1 %
  for (let pagina = 2; pagina < n; pagina++) {
    const caixas = caderno2027.textos.filter((t) => t.pagina === pagina);
    const esquerda = Math.min(...caixas.map((t) => t.xFisico));
    const direita = Math.max(...caixas.map((t) => t.xFisico + t.larguraFisica));
    if (pagina % 2 === 1) {
      // Página ímpar (frente): a lombada é a borda ESQUERDA.
      assert.ok(esquerda >= interna - 0.6, `página ${pagina}: texto a ${esquerda.toFixed(1)} pt da borda esquerda (lombada); precisa de ${interna.toFixed(1)}`);
      assert.ok(direita <= A4.largura - externaMinima, `página ${pagina}: texto chega a ${(A4.largura - direita).toFixed(1)} pt da borda direita`);
    } else {
      // Página par (verso): a lombada é a borda DIREITA.
      assert.ok(direita <= A4.largura - interna + 0.6, `página ${pagina}: texto a ${(A4.largura - direita).toFixed(1)} pt da borda direita (lombada); precisa de ${interna.toFixed(1)}`);
      assert.ok(esquerda >= externaMinima, `página ${pagina}: texto chega a ${esquerda.toFixed(1)} pt da borda esquerda`);
    }
  }
});

test("sem a margem de encadernação o caderno volta ao desenho de antes (margens iguais dos dois lados)", async () => {
  const sem = await gerar({ limiteDeAtas: 1, margemDeEncadernacao: false });
  const com = await gerar({ limiteDeAtas: 1, margemDeEncadernacao: true });
  assert.equal(sem.paginas, com.paginas, "a opção só mexe nas margens, não nas páginas");
  for (const t of sem.textos) assert.equal(t.xFisico, t.x, "sem a opção a posição física é a do desenho");
  assert.ok(com.textos.some((t) => t.xFisico !== t.x), "com a opção algo se desloca");
  // A capa (página 1) e a quarta capa (a última) nunca se deslocam.
  for (const t of com.textos.filter((t) => t.pagina === 1 || t.pagina === com.paginas)) assert.equal(t.xFisico, t.x, `página ${t.pagina} sem deslocamento`);
});

test("cada ata tem frente e verso, na ordem, com o selo 'N de 50' certo", () => {
  const plano = planejarAno(2027);
  const atas = plano.domingos.filter((d) => d.tipo !== TIPO.SEM_REUNIAO);
  atas.forEach((d, i) => {
    const frente = PAGINAS_FIXAS + 1 + 2 * i;
    for (const pagina of [frente, frente + 1]) {
      assert.ok(doTexto(caderno2027, pagina).includes(`${i + 1} de 50`), `${d.iso}: selo na página ${pagina}`);
    }
    assert.ok(doTexto(caderno2027, frente).some((t) => /^(Domingo|domingo)/.test(t)), `${d.iso}: data por extenso na frente`);
  });
});

test("domingo de jejum e testemunhos: sem oradores, com testemunhos e crianças abençoadas", () => {
  const frente = doTexto(caderno2027, PAGINAS_FIXAS + 1).join(" | ");
  assert.match(frente, /REUNIÃO DE JEJUM E TESTEMUNHOS/);
  assert.match(frente, /TESTEMUNHOS/);
  assert.match(frente, /CRIANÇAS ABENÇOADAS/);
  assert.doesNotMatch(frente, /DISCURSANTE|TEMPO PREVISTO|HINO INTERMEDIÁRIO/);
  assert.match(frente, /Anote os nomes no verso desta folha/, "a frente manda anotar os testemunhos no verso");
  const verso = doTexto(caderno2027, PAGINAS_FIXAS + 2).join(" | ");
  assert.match(verso, /Testemunhos prestados/);
  assert.match(verso, /Quem faltou e quem vai ministrar/);
  assert.match(verso, /VERSO  ·  TESTEMUNHOS, FREQUÊNCIA E MINISTRAÇÃO/, "o subtítulo do verso cita os testemunhos");
});

test("a linha de escrever é de verdade para escrever: passo largo e traço que aparece na fotocópia", () => {
  // Passo de 19 pt (uns 6,7 mm): menos que isso aperta a letra corrida de quem escreve com pressa.
  assert.ok(PASSO >= 18, `passo de ${PASSO} pt`);
  // Contraste do traço com o papel branco (a razão de luminância, como nas regras de acessibilidade).
  const luminancia = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (hex) => 1.05 / (luminancia(hex) + 0.05);
  assert.ok(contraste(COR.escrita) >= 2.5, `a linha de escrever tem contraste ${contraste(COR.escrita).toFixed(2)}:1 (mínimo 2,5:1)`);
  assert.ok(contraste(COR.divisoria) < contraste(COR.escrita), "os fios que só dividem são mais leves que a linha de escrever");
});

test("domingo normal: três oradores com tema e tempo, hino intermediário, sem testemunhos", () => {
  const frente = doTexto(caderno2027, PAGINAS_FIXAS + 3).join(" | ");
  assert.match(frente, /REUNIÃO SACRAMENTAL/);
  for (const n of [1, 2, 3]) assert.match(frente, new RegExp(`${n}º DISCURSANTE`));
  assert.equal((frente.match(/TEMPO PREVISTO/g) ?? []).length, 3);
  assert.match(frente, /HINO INTERMEDIÁRIO/);
  assert.doesNotMatch(frente, /CRIANÇAS ABENÇOADAS|Anote os nomes no verso/);
  const verso = doTexto(caderno2027, PAGINAS_FIXAS + 4).join(" | ");
  assert.doesNotMatch(verso, /Testemunhos prestados/);
  assert.match(verso, /Quem faltou e quem vai ministrar/);
});

test("o PDF tem índice de navegação: as partes do começo, um marcador por mês e um por ata", () => {
  const m = caderno2027.marcadores;
  assert.deepEqual(m.slice(0, 4).map((x) => x.titulo), ["Capa", "Orientações do Manual Geral", "Instruções do discurso", "Calendário de 2027"]);
  assert.deepEqual(m.slice(0, 4).map((x) => x.pagina), [1, 2, 3, 4]);
  const topo = m.filter((x) => x.nivel === 0);
  const meses = topo.slice(4, -PAGINAS_FINAIS);
  assert.equal(meses.length, 12);
  assert.equal(meses[0].titulo, "Janeiro");
  // O fecho: anotações (a frente da última folha) e a capa de trás (o verso dela).
  assert.deepEqual(topo.slice(-PAGINAS_FINAIS).map((x) => [x.titulo, x.pagina]), [["Anotações", caderno2027.paginas - 1], ["Capa de trás", caderno2027.paginas]]);
  assert.equal(meses[0].pagina, PAGINAS_FIXAS + 1, "o mês aponta para a frente da primeira ata dele");
  const atas = m.filter((x) => x.nivel === 1);
  assert.equal(atas.length, 50);
  assert.equal(atas[0].titulo, "03 JAN 2027 · ata 1 · jejum e testemunhos");
  assert.equal(atas[1].titulo, "10 JAN 2027 · ata 2");
  atas.forEach((a, i) => assert.equal(a.pagina, PAGINAS_FIXAS + 1 + 2 * i, `a ata ${i + 1} aponta para a própria frente`));
  const texto = Buffer.from(caderno2027.bytes).toString("latin1");
  // `ok` com mensagem: um `match` falho despejaria o PDF inteiro na tela.
  assert.ok(/\/Outlines \d+ 0 R/.test(texto), "o catálogo do PDF aponta para o índice");
  assert.ok(/\/PageMode \/UseOutlines/.test(texto), "o leitor abre com o índice à vista");
  assert.ok((texto.match(/\/Title\b/g) ?? []).length >= 4 + 12 + 50, "um título por entrada do índice");
});

test("os anúncios saem em branco: nenhum aviso fixo da ata antiga", () => {
  const todos = caderno2027.textos.map((t) => t.texto).join(" | ");
  assert.doesNotMatch(todos, /Reunião Familiar|Vem e segue|Segunda-Feira Noite/i);
  assert.match(todos, /ANÚNCIOS/);
});

test("a frente tem os campos da ata que a estaca usa, e NENHUM dos que ela mandou tirar", () => {
  for (const pagina of [PAGINAS_FIXAS + 1, PAGINAS_FIXAS + 3]) {
    const frente = doTexto(caderno2027, pagina).join(" | ").toUpperCase();
    for (const campo of [
      "HORÁRIO DE INÍCIO", "Nº DE PRESENTES", "PRESIDIDA", "DIRIGIDA", "REGENTE", "PIANISTA / ORGANISTA", "RECONHECIMENTOS", "ANÚNCIOS",
      "1º HINO", "1ª ORAÇÃO", "DESOBRIGAÇÕES", "DESOBRIGADO(A) DE", "APOIOS E RECONHECIMENTOS", "APOIADO(A) OU RECONHECIDO(A) COMO",
      "MEMBRO CONFIRMADO(A)", "CONFIRMADO(A) POR", "HINO SACRAMENTAL", "ÚLTIMO HINO", "ÚLTIMA ORAÇÃO", "ASSINATURA DO BISPO", "ASSINATURA DO SECRETÁRIO",
    ]) {
      assert.ok(frente.includes(campo), `página ${pagina}: falta o campo ${campo}`);
    }
    // O cabeçalho que terminava em "À" (palavra pendurada, sem o que vem depois) não pode voltar.
    assert.ok(!/RECONHECIDO\(A\) À(\s|$|\|)/.test(frente), `página ${pagina}: cabeçalho terminando em "À"`);
    // A coluna da esquerda de cada tabela é onde se escreve o NOME: o título do bloco diz isso.
    assert.ok(/DESOBRIGAÇÕES \| ·\s+NOME/.test(frente), `página ${pagina}: a tabela de desobrigações diz "nome"`);
    // Decisões de quem usa a ata: só o horário de INÍCIO (sem término), e do sacramento só o hino.
    assert.doesNotMatch(frente, /TÉRMINO/, "a reunião não tem campo de término");
    assert.doesNotMatch(frente, /DISTRIBUIÇÃO DO SACRAMENTO/, "sem a distribuição do sacramento");
    assert.doesNotMatch(frente, /ORAÇÃO SACRAMENTAL|\bPÃO\b|\bÁGUA\b/, "sem as orações sacramentais do pão e da água");
    assert.equal((frente.match(/INÍCIO/g) ?? []).length, 1, "um espaço só para o início");
  }
});

test("o verso tem quem faltou, quem vai ministrar e quando", () => {
  const verso = doTexto(caderno2027, PAGINAS_FIXAS + 4).join(" | ").toUpperCase();
  for (const campo of ["NOME DE QUEM FALTOU", "QUEM VAI MINISTRAR", "QUANDO", "FEITO"]) assert.ok(verso.includes(campo), campo);
});

test("nenhum texto sai da página nem fica miúdo demais", () => {
  for (const t of caderno2027.textos) {
    assert.ok(t.x >= 0 && t.x + t.largura <= A4.largura + 0.5, `fora na horizontal: "${t.texto.slice(0, 30)}" x=${t.x} larg=${t.largura}`);
    assert.ok(t.y >= 0 && t.y <= A4.altura - 12, `fora na vertical: "${t.texto.slice(0, 30)}" y=${t.y}`);
    assert.ok(t.tamanho >= 5.5, `letra miúda (${t.tamanho} pt): "${t.texto.slice(0, 30)}"`);
  }
});

test("os mesmos dados dão os MESMOS bytes: nada no desenho lê o relógio nem sorteia", async () => {
  const a = await gerar({ limiteDeAtas: 3 });
  const b = await gerar({ limiteDeAtas: 3 });
  assert.deepEqual(a.bytes, b.bytes);
  const c = await gerar({ limiteDeAtas: 3, geradoEm: new Date("2030-01-01T00:00:00Z") });
  assert.notDeepEqual(a.bytes, c.bytes, "a data de geração está nos metadados, e só nela");
});

test("a unidade de tipo ramo troca o rótulo do líder na assinatura", async () => {
  const ramo = await gerar({ unidade: { nome: "Ramo Baturité", tipo: "ramo" }, limiteDeAtas: 1 });
  const frente = doTexto(ramo, PAGINAS_FIXAS + 1).join(" | ");
  assert.match(frente, /ASSINATURA DO PRESIDENTE DO RAMO/);
  assert.doesNotMatch(frente, /ASSINATURA DO BISPO/);
});

test("a unidade de tipo grupo assina como Líder do Grupo; tipo desconhecido cai em Bispo", async () => {
  const grupo = await gerar({ unidade: { nome: "Grupo Beberibe", tipo: "grupo" }, limiteDeAtas: 1 });
  const frente = doTexto(grupo, PAGINAS_FIXAS + 1).join(" | ");
  assert.match(frente, /ASSINATURA DO LÍDER DO GRUPO/);
  assert.doesNotMatch(frente, /ASSINATURA DO BISPO|PRESIDENTE DO RAMO/);
  const estranho = await gerar({ unidade: { nome: "Ala X1", tipo: "diretoria" }, limiteDeAtas: 1 });
  assert.match(doTexto(estranho, PAGINAS_FIXAS + 1).join(" | "), /ASSINATURA DO BISPO/);
});

test("um nome de unidade enorme, com espaços e quebras, vira uma linha que cabe", async () => {
  const nome = "  Ala   Comunidade\nCristã de Bairro Vizinho Número Doze Grande Demais Para Qualquer Capa  ";
  const livro = await gerar({ unidade: { nome, tipo: "ala" }, limiteDeAtas: 1 });
  const naCapa = livro.textos.find((t) => t.pagina === 1 && t.texto.startsWith("Ala Comunidade"));
  assert.ok(naCapa, "o nome aparece na capa");
  assert.doesNotMatch(naCapa.texto, /\n/);
  assert.ok(naCapa.tamanho < 25, "o corpo encolheu para caber");
  assert.ok(naCapa.tamanho >= 13);
});

test("texto estranho no nome vira texto, nunca desenho quebrado: emoji e controle somem ou viram '?'", async () => {
  const livro = await gerar({ unidade: { nome: "Ala ‮atnamor‬ \u{1F600} <b>X</b>", tipo: "ala" }, limiteDeAtas: 1 });
  const naCapa = livro.textos.find((t) => t.pagina === 1 && t.texto.includes("Ala"));
  assert.ok(naCapa);
  assert.doesNotMatch(naCapa.texto, /[‪-‮⁦-⁩]/, "caractere de direção nunca chega ao arquivo");
  assert.match(naCapa.texto, /\?/, "o emoji vira ?");
  assert.match(naCapa.texto, /<b>X<\/b>/, "o que parece HTML é só texto");
});

test("sem nome de unidade, recusa em vez de gerar um caderno sem dono", async () => {
  await assert.rejects(() => gerar({ unidade: { nome: "   ", tipo: "ala" } }), /Falta o nome da unidade/);
  await assert.rejects(() => gerar({ unidade: undefined }), /Falta o nome da unidade/);
});

test("as trocas da pessoa chegam ao caderno: sem reunião tira a ata, e o total acompanha", async () => {
  const livro = await gerar({ ajustes: { "2027-06-13": TIPO.SEM_REUNIAO } });
  assert.equal(livro.plano.resumo.atas, 49);
  assert.equal(livro.paginas, PAGINAS_FIXAS + 2 * 49 + PAGINAS_FINAIS);
  const todos = livro.textos.map((t) => t.texto);
  assert.ok(todos.includes("1 de 49"), "o total no selo é o novo");
  assert.ok(!todos.some((t) => t === "1 de 50"));
  assert.ok(!todos.some((t) => t === "Domingo, 13 de junho de 2027"), "a data tirada não tem folha");
});

test("anos de 52 e de 53 domingos geram, e um ano bissexto também", async () => {
  for (const ano of [2023, 2024, 2028, 2031]) {
    const livro = await gerar({ ano });
    assert.equal(livro.paginas, contarPaginas(livro.plano), String(ano));
  }
});

test("a quarta capa: o templo fica ACIMA da escritura (nada passa por trás das letras) e nenhum artigo fica sozinho no fim da linha", () => {
  // O desenho de verdade, linha por linha: intercepta o que o pdfkit realmente escreve.
  const doc = new PDFDocument({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: false });
  doc.on("data", () => {});
  const p = new Pintor(doc, recursos);
  const linhas = [];
  const original = doc._fragment.bind(doc);
  doc._fragment = (texto, ...resto) => {
    linhas.push(texto.replace(/ /g, " ").trim());
    return original(texto, ...resto);
  };
  desenharQuartaCapa(p, { unidade: { nome: "Ala Pacajus 1", tipo: "ala" }, ano: 2027 });

  const principal = p.textos.find((t) => t.texto.startsWith("Isto é o meu corpo"));
  assert.ok(principal, "a escritura principal está na página");
  assert.ok(principal.y >= BASE_DO_TEMPLO + 20, `a escritura começa em ${principal.y} pt; a base do templo está em ${BASE_DO_TEMPLO.toFixed(0)} pt: o templo não pode passar por trás das letras`);

  assert.ok(linhas.some((l) => l.startsWith("o pão e o vinho") || l.includes("partilhar")), "a escritura de Morôni foi desenhada");
  for (const linha of linhas) assert.doesNotMatch(linha, /(^|\s)[aeoAEO]$/, `a linha "${linha}" termina com um artigo sozinho`);
});

test("colarArtigos cola o artigo de uma letra à palavra seguinte e não muda uma letra do texto", () => {
  const original = "E reuniam-se frequentemente para partilhar o pão e o vinho, em lembrança do Senhor Jesus.";
  const colado = colarArtigos(original);
  assert.equal(colado.replace(/ /g, " "), original, "só os espaços mudam de tipo");
  assert.ok(colado.includes("o pão") && colado.includes("e o vinho"), "o artigo gruda na palavra que ele acompanha");
  assert.ok(colado.includes("lembrança do Senhor Jesus."), "palavras maiores não são coladas");
  assert.equal(colarArtigos("sem artigos"), "sem artigos");
  assert.equal(colarArtigos(""), "");
});
