// Gera os PNG e o .ico do ícone do site a partir de assets/icones/favicon.svg (a fonte, que se edita à mão).
//
//   npm i --no-save sharp        # só para esta ferramenta: não entra no package.json
//   node ferramentas/gerar-icones.mjs
//
// Três detalhes de desenho:
//   - 16, 32 e 48 px saem de uma variante SEM os brilhos e com o templo 14 % maior: na aba do navegador os
//     brilhos viram ruído e a silhueta tem de pesar;
//   - o ícone do iPhone (180 px) sai SEM cantos arredondados: o iOS arredonda sozinho e não quer pontas transparentes;
//   - o .ico leva 16, 32 e 48 em PNG (o formato aceito por qualquer navegador de hoje).
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("Falta o sharp. Rode:  npm i --no-save sharp   e tente de novo.");
  process.exit(1);
}

const pasta = process.argv[2] ?? fileURLToPath(new URL("../assets/icones/", import.meta.url));
const svg = await readFile(`${pasta}/favicon.svg`, "utf8");

const quadrado = svg.replace('rx="116"', 'rx="0"');
const pequeno = svg
  .replace(/<path d="M404 96[^>]*\/>\s*/, "")
  .replace(/<path d="M110 178[^>]*\/>\s*/, "")
  .replace('<g transform="translate(0 21)">', '<g transform="translate(256 256) scale(1.14) translate(-256 -256) translate(0 21)">');
if (pequeno === svg) throw new Error("A variante pequena não mudou nada: o favicon.svg foi editado? Ajuste os trechos que ela troca.");

const png = (xml, lado) =>
  sharp(Buffer.from(xml), { density: Math.max(72, Math.round((lado / 512) * 72 * 8)) })
    .resize(lado, lado)
    .png({ compressionLevel: 9 })
    .toBuffer();

const alvos = [
  ["favicon-16x16.png", pequeno, 16],
  ["favicon-32x32.png", pequeno, 32],
  ["favicon-48x48.png", pequeno, 48],
  ["apple-touch-icon.png", quadrado, 180],
  ["icon-192.png", svg, 192],
  ["icon-512.png", svg, 512],
];
const gerados = {};
for (const [nome, xml, lado] of alvos) {
  gerados[nome] = await png(xml, lado);
  await writeFile(`${pasta}/${nome}`, gerados[nome]);
  console.log(nome.padEnd(22), `${lado}×${lado}`, `${gerados[nome].length} bytes`);
}

// O .ico: cabeçalho, uma entrada de 16 bytes por tamanho e depois os PNGs.
const tamanhos = [16, 32, 48];
const imagens = tamanhos.map((t) => gerados[`favicon-${t}x${t}.png`]);
const cabecalho = Buffer.alloc(6);
cabecalho.writeUInt16LE(1, 2); // tipo: ícone
cabecalho.writeUInt16LE(tamanhos.length, 4);
let deslocamento = 6 + 16 * tamanhos.length;
const entradas = tamanhos.map((t, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(t, 0);
  e.writeUInt8(t, 1);
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por pixel
  e.writeUInt32LE(imagens[i].length, 8);
  e.writeUInt32LE(deslocamento, 12);
  deslocamento += imagens[i].length;
  return e;
});
await writeFile(`${pasta}/favicon.ico`, Buffer.concat([cabecalho, ...entradas, ...imagens]));
console.log("favicon.ico".padEnd(22), "16+32+48");
