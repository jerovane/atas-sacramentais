import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * O que vai ao ar. O fluxo de publicação copia só as partes do site, e a página de erro (404) é servida de
 * qualquer profundidade: um endereço errado como …/atas-sacramentais/a/b/c.html mostra a mesma página, então
 * ela não pode depender de caminho relativo.
 */

const caminho = (relativo) => fileURLToPath(new URL(`../${relativo}`, import.meta.url));

test("o fluxo publica exatamente as partes do site, todas existem, e nada de teste ou ferramenta vai ao ar", async () => {
  const fluxo = await readFile(caminho(".github/workflows/publicar.yml"), "utf8");
  const linha = fluxo.match(/^\s*cp -r (.+) _site\/\s*$/m)?.[1];
  assert.ok(linha, "o passo 'Montar o site' copia arquivos para _site/");
  const copiados = linha.split(/\s+/).sort();
  assert.deepEqual(copiados, ["404.html", "assets", "css", "index.html", "js", "vendor"]);
  for (const item of copiados) assert.ok((await stat(caminho(item))).size >= 0, `${item} existe`);
  for (const fora of ["tests", "ferramentas", "node_modules", "package.json", "README.md"]) {
    assert.ok(!copiados.includes(fora), `${fora} não pode ir ao ar`);
  }
});

test("a página de erro (404) serve de qualquer profundidade: só endereços absolutos, sem css nem js, e não se oferece a buscadores", async () => {
  const html = await readFile(caminho("404.html"), "utf8");
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.ok(!/<script/i.test(html), "sem JavaScript");
  assert.ok(!/<link[^>]+rel="stylesheet"/i.test(html), "sem css externo: o estilo é da própria página");

  const enderecos = [...html.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(enderecos.length >= 3, "tem o ícone, o logotipo e o botão");
  const index = await readFile(caminho("index.html"), "utf8");
  const site = index.match(/property="og:url" content="([^"]+)"/)[1];
  for (const endereco of enderecos) {
    assert.match(endereco, /^https:\/\//, `"${endereco}" tem de ser absoluto: a página é servida de qualquer pasta`);
    assert.ok(endereco.startsWith(site), `"${endereco}" tem de morar no mesmo site que o og:url do index.html (${site})`);
  }
  assert.ok(enderecos.includes(site), "o botão volta para a página inicial");
});
