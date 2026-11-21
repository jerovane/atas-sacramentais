import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * O que a pessoa vê FORA do site: o cartão que aparece quando o link é colado no WhatsApp e o ícone da aba.
 *
 * Esse tipo de defeito não aparece na tela de quem fez o site: aparece na conversa de outra pessoa. O
 * rastreador do WhatsApp não roda JavaScript, lê só o <head>, exige URL ABSOLUTA e desiste de imagem grande
 * (acima de uns 300 KB). Por isso estas conferências são de arquivo, e não de olho.
 */

const caminho = (relativo) => fileURLToPath(new URL(`../${relativo}`, import.meta.url));
const html = await readFile(caminho("index.html"), "utf8");
const cabeca = html.slice(0, html.indexOf("</head>"));

const conteudoDe = (propriedade) => cabeca.match(new RegExp(`<meta\\s+(?:property|name)="${propriedade}"\\s+content="([^"]*)"`))?.[1];
const linkDe = (rel, extra = "") => cabeca.match(new RegExp(`<link\\s+rel="${rel}"[^>]*${extra}[^>]*href="([^"]+)"|<link\\s+rel="${rel}"[^>]*href="([^"]+)"[^>]*${extra}`));

/** Largura e altura de um JPEG (procura o marcador de quadro, SOF). */
function dimensoesDoJpeg(bytes) {
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8, "começa como JPEG");
  let i = 2;
  while (i < bytes.length) {
    assert.equal(bytes[i], 0xff, "marcador de JPEG");
    const tipo = bytes[i + 1];
    const tamanho = bytes.readUInt16BE(i + 2);
    if (tipo >= 0xc0 && tipo <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(tipo)) return { altura: bytes.readUInt16BE(i + 5), largura: bytes.readUInt16BE(i + 7) };
    i += 2 + tamanho;
  }
  throw new Error("não achei o quadro do JPEG");
}

function dimensoesDoPng(bytes) {
  assert.equal(bytes.subarray(1, 4).toString("latin1"), "PNG", "começa como PNG");
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

test("o cartão de compartilhamento está no <head>, com URL absoluta, e a imagem é 1200×630 e leve", async () => {
  for (const chave of ["og:type", "og:title", "og:description", "og:url", "og:image", "og:image:type", "og:image:width", "og:image:height", "og:image:alt"]) {
    assert.ok(conteudoDe(chave), `falta <meta ${chave}> dentro do <head>`);
  }
  assert.equal(conteudoDe("twitter:card"), "summary_large_image");
  const url = conteudoDe("og:url");
  const imagem = conteudoDe("og:image");
  assert.match(url, /^https:\/\/[^/]+\/.*\/$/, "og:url é absoluta, em https, e termina em barra");
  assert.ok(imagem.startsWith(url), "a imagem mora no mesmo endereço do site");
  assert.equal(conteudoDe("og:image:type"), "image/jpeg");
  assert.equal(conteudoDe("og:image:width"), "1200");
  assert.equal(conteudoDe("og:image:height"), "630");
  assert.match(conteudoDe("og:description"), /^.{40,200}$/, "a descrição cabe numa prévia");

  const arquivo = caminho(imagem.slice(url.length));
  const bytes = await readFile(arquivo);
  const { largura, altura } = dimensoesDoJpeg(bytes);
  assert.deepEqual([largura, altura], [1200, 630], "a imagem tem as dimensões que a meta diz");
  assert.ok(bytes.length <= 300 * 1024, `a imagem tem ${(bytes.length / 1024).toFixed(0)} KB: o WhatsApp desiste acima de uns 300 KB`);
  // O nome do arquivo leva a versão: o WhatsApp guarda o cartão por URL, e só um nome novo o renova.
  assert.match(imagem, /og-atas-v\d+\.jpg$/);
});

test("a página não se oferece aos buscadores: é ferramenta da estaca, não vitrine", () => {
  assert.match(conteudoDe("robots"), /noindex/);
});

test("o ícone da aba: SVG, PNG de 16 e 32, .ico, ícone do iPhone e manifesto, todos existentes e com o tamanho que dizem", async () => {
  const esperados = [
    ["icon", "image/svg+xml", "assets/icones/favicon.svg"],
    ["icon", "32x32", "assets/icones/favicon-32x32.png"],
    ["icon", "16x16", "assets/icones/favicon-16x16.png"],
    ["shortcut icon", "", "assets/icones/favicon.ico"],
    ["apple-touch-icon", "", "assets/icones/apple-touch-icon.png"],
    ["manifest", "", "assets/icones/site.webmanifest"],
  ];
  for (const [, , arquivo] of esperados) assert.ok(cabeca.includes(`href="${arquivo}"`), `o <head> aponta para ${arquivo}`);
  for (const [, , arquivo] of esperados) assert.ok((await stat(caminho(arquivo))).size > 0, `${arquivo} existe`);

  for (const [arquivo, lado] of [["favicon-16x16.png", 16], ["favicon-32x32.png", 32], ["favicon-48x48.png", 48], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
    const { largura, altura } = dimensoesDoPng(await readFile(caminho(`assets/icones/${arquivo}`)));
    assert.deepEqual([largura, altura], [lado, lado], `${arquivo} tem ${lado}×${lado}`);
  }

  // O .ico traz 16, 32 e 48, em PNG.
  const ico = await readFile(caminho("assets/icones/favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1, "tipo ícone");
  assert.equal(ico.readUInt16LE(4), 3, "três tamanhos");
  assert.deepEqual([0, 1, 2].map((i) => ico.readUInt8(6 + 16 * i)), [16, 32, 48]);

  // O SVG se basta (nada de arquivo ou endereço externo) e é quadrado.
  const svg = await readFile(caminho("assets/icones/favicon.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 512 512"/);
  assert.ok(!/(href|src)\s*=\s*"(?!#)/.test(svg), "o SVG não depende de nada de fora");

  // O manifesto é JSON válido e os ícones dele existem.
  const manifesto = JSON.parse(await readFile(caminho("assets/icones/site.webmanifest"), "utf8"));
  assert.ok(manifesto.name && manifesto.short_name && manifesto.theme_color);
  for (const icone of manifesto.icons) assert.ok((await stat(caminho(`assets/icones/${icone.src}`))).size > 0, `${icone.src} do manifesto existe`);
  void linkDe;
});
