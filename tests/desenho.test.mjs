import { test } from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { Pintor, colarFim, paraOPapel } from "../js/pdf/desenho.js";
import { carregarRecursosDoDisco } from "../ferramentas/recursos-do-disco.mjs";

/** Pequenas garantias do pintor: a cola de palavras (sem viúvas) e o que ela deixa registrado. */

const NBSP = " ";

test("colarFim cola as duas últimas palavras e só elas", () => {
  assert.equal(colarFim("uma frase de teste"), `uma frase de${NBSP}teste`);
  assert.equal(colarFim("duas palavras"), `duas${NBSP}palavras`);
  assert.equal(colarFim("sozinha"), "sozinha");
  assert.equal(colarFim(""), "");
  assert.equal(colarFim("termina em ponto."), `termina em${NBSP}ponto.`);
});

test("o espaço sem quebra passa por paraOPapel (a fonte tem o glifo) e não vira '?'", () => {
  assert.equal(paraOPapel(`a${NBSP}b`), `a${NBSP}b`);
});

test("semViuva: o parágrafo nunca fecha com uma palavra sozinha, e o texto registrado segue sem a cola", async () => {
  const recursos = await carregarRecursosDoDisco();
  const doc = new PDFDocument({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: false });
  doc.on("data", () => {});
  const p = new Pintor(doc, recursos);
  p.novaPagina();
  // Registra cada linha que o pdfkit realmente desenha.
  const linhas = [];
  const original = doc._fragment.bind(doc);
  doc._fragment = (texto, ...resto) => {
    linhas.push(texto.replace(/ /g, " ").trim());
    return original(texto, ...resto);
  };
  const frase = "Ajude jovens e adultos a entender isso e a ser reverentes sempre.";
  // Uma largura em que, sem a cola, "sempre." ficaria sozinha na última linha.
  let largura = null;
  for (let w = 120; w <= 260 && largura === null; w += 2) {
    linhas.length = 0;
    p.texto(frase, 10, 10, w, { tamanho: 10 });
    const ultima = linhas.at(-1);
    if (linhas.length > 1 && !ultima.includes(" ")) largura = w;
  }
  assert.ok(largura !== null, "o texto de teste produz uma viúva em alguma largura");
  linhas.length = 0;
  p.texto(frase, 10, 10, largura, { tamanho: 10, semViuva: true });
  assert.ok(linhas.at(-1).includes(" "), `a última linha tem mais de uma palavra: "${linhas.at(-1)}"`);
  // O que os testes de conteúdo procuram nos textos registrados continua achando a frase como está.
  assert.equal(p.textos.at(-1).texto, frase);
});
