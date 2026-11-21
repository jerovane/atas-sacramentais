// O cartão de compartilhamento (WhatsApp, Telegram, Facebook): 1200 × 630, no molde do cartão do Álbum Digital.
// Desenha com o MESMO pintor do caderno (fontes, cores e imagens da estaca) e grava um PDF de uma página;
// quem rasteriza é um passo à parte. O caderno que aparece à direita é o de verdade: a capa e uma ata,
// geradas pelo próprio motor com o nome "Sua Unidade".
//
// Passo a passo (macOS; precisa de Ghostscript, `brew install ghostscript`):
//
//   node ferramentas/gerar-exemplo.mjs --saida=/tmp/amostra.pdf --ano=2027 --atas=2 --unidade="Sua Unidade" --tipo=ala
//   gs -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=1 -dLastPage=1 -sOutputFile=/tmp/capa.png /tmp/amostra.pdf
//   gs -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=7 -dLastPage=7 -sOutputFile=/tmp/ata.png /tmp/amostra.pdf
//   node ferramentas/gerar-cartao.mjs /tmp/cartao.pdf /tmp/capa.png /tmp/ata.png assets/icones/icon-512.png
//   gs -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r144 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -sOutputFile=/tmp/cartao.png /tmp/cartao.pdf
//   sips -z 630 1200 -s format jpeg -s formatOptions 90 /tmp/cartao.png --out assets/compartilhar/og-atas-v2.jpg
//
// O WhatsApp guarda o cartão por endereço: ao trocar a arte, dê um NOME novo ao arquivo (v2, v3…) e mude
// o og:image no index.html. O teste `tests/compartilhar.test.mjs` confere tamanho (1200×630, até 300 KB) e endereço.
//
// uso: node gerar-cartao.mjs <saida.pdf> <capa.png> <ata.png> <icone.png>
import { readFile, writeFile } from "node:fs/promises";
import PDFDocument from "pdfkit";
import { Pintor } from "../js/pdf/desenho.js";
import { COR, FONTE } from "../js/pdf/tema.js";
import { carregarRecursosDoDisco } from "./recursos-do-disco.mjs";

const [saida, caminhoCapa, caminhoAta, caminhoIcone] = process.argv.slice(2);
const W = 1200;
const H = 630;
const OURO_ESCURO = "#b0761a"; // ouro que se lê sobre fundo claro
const TINTA = COR.petroleo900;

const recursos = await carregarRecursosDoDisco();
recursos.imagens = { ...recursos.imagens, capa: await readFile(caminhoCapa), ata: await readFile(caminhoAta), icone: await readFile(caminhoIcone) };

const doc = new PDFDocument({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: false, info: { Title: "Cartão de compartilhamento: Atas da Reunião Sacramental" } });
const pedacos = [];
doc.on("data", (c) => pedacos.push(c));
const p = new Pintor(doc, recursos);
p.novaPagina();

// ── o fundo: frio no canto de cima à direita, quente embaixo à esquerda (como o do Álbum) ──
p.preencher(0, 0, W, H, p.gradienteLinear(W, 0, 0, H, [[0, "#d3e8eb"], [0.48, "#f2f6f4"], [1, "#fcf1dc"]]));
p.preencher(0, 0, W, H, p.gradienteRadial(1080, 40, 560, [[0, "#bfe1e5", 0.6], [1, "#bfe1e5", 0]]));
p.preencher(0, 0, W, H, p.gradienteRadial(40, 640, 500, [[0, "#ffe3b3", 0.7], [1, "#ffe3b3", 0]]));

// Uma sombra suave: camadas translúcidas, cada uma um pouco maior que a anterior (sem desfoque no pdfkit).
function sombra(x, y, w, h, { camadas = 16, espalha = 1.7, desloca = 18, opacidade = 0.0175, raio = 5 } = {}) {
  for (let i = 0; i < camadas; i++) {
    const e = i * espalha;
    p.caixa(x - e, y - e + desloca + i * 0.4, w + 2 * e, h + 2 * e, { preenchimento: "#08323a", raio: raio + e, opacidade });
  }
}

// ── o selo e o nome, no alto à esquerda ──
const ICONE = 72;
sombra(76, 64, ICONE, ICONE, { camadas: 9, espalha: 1.3, desloca: 7, opacidade: 0.02, raio: 17 });
p.imagem("icone", 76, 64, { largura: ICONE });
p.texto("Atas da Reunião Sacramental", 172, 66, 560, { fonte: FONTE.sansExtra, tamanho: 30, cor: TINTA });
p.texto("Estaca Pacajus Brasil", 172, 104, 560, { fonte: FONTE.sansNegrito, tamanho: 27, cor: COR.petroleo700 });

// ── o título: três linhas, com o destaque em ouro ──
const TITULO = { fonte: FONTE.serifaSemi, tamanho: 60 };
const passo = 66;
const topo = 170;
p.texto("O caderno de atas", 76, topo, 700, { ...TITULO, cor: TINTA });
p.corridas([{ texto: "do ano, ", fonte: TITULO.fonte, cor: TINTA }, { texto: "pronto", fonte: TITULO.fonte, cor: OURO_ESCURO }], 76, topo + passo, 700, { tamanho: TITULO.tamanho });
p.texto("para imprimir.", 76, topo + 2 * passo, 700, { ...TITULO, cor: OURO_ESCURO });

// ── o subtítulo e a pílula ──
// Letras grandes: na prévia do WhatsApp o cartão aparece com uns 320 px de largura (um quarto do tamanho),
// e o que tem menos de uns 28 px aqui vira mancha lá. Por isso o subtítulo é curto e a pílula diz só o essencial.
p.texto("Escolha a unidade e o ano\ne baixe o PDF.", 76, 404, 640, {
  fonte: FONTE.sans,
  tamanho: 34,
  cor: "#4a666c",
  entrelinha: 8,
});

const textoDaPilula = "Não é material oficial da Igreja";
const estiloDaPilula = { fonte: FONTE.sansNegrito, tamanho: 29 };
const larguraDoTexto = p.largura(textoDaPilula, estiloDaPilula);
const pilula = { x: 76, y: 522, w: larguraDoTexto + 78, h: 60 };
p.caixa(pilula.x, pilula.y, pilula.w, pilula.h, { preenchimento: "#fdf1d6", borda: "#ecc982", espessura: 1.6, raio: 30 });
p.circulo(pilula.x + 31, pilula.y + 30, 7, { preenchimento: COR.ouro });
p.texto(textoDaPilula, pilula.x + 52, pilula.y + 15, larguraDoTexto + 12, { ...estiloDaPilula, cor: "#7a5412" });

// ── o caderno, à direita: uma ata atrás e a capa na frente, com sombra suave ──
function folha(nome, cx, cy, largura, angulo) {
  const altura = (largura * 1754) / 1240;
  const x = cx - largura / 2;
  const y = cy - altura / 2;
  p.doc.save();
  p.doc.rotate(angulo, { origin: [cx, cy] });
  sombra(x, y, largura, altura);
  p.caixa(x - 0.8, y - 0.8, largura + 1.6, altura + 1.6, { preenchimento: "#ffffff", borda: "#c9d6d9", espessura: 1.2 });
  p.imagem(nome, x, y, { largura });
  p.doc.restore();
}
// O conjunto é reduzido (ESCALA) em torno de ANCORA, o x onde ele começa à esquerda: assim nenhuma folha,
// nem a girada, encosta na borda direita do cartão (sobram uns 55 px).
const ESCALA = 0.86;
const ANCORA = 752;
const gx = (x) => ANCORA + (x - 768) * ESCALA;
folha("ata", gx(1062), 306, 262 * ESCALA, 8);
folha("capa", gx(934), 330, 300 * ESCALA, -4.5);

// ── dois brilhos, como as estrelinhas do Álbum, longe das bordas do cartão e dos cantos das folhas ──
p.estrela(738, 128, 17, { cor: COR.ouro });
p.estrela(1110, 578, 11, { cor: COR.ouroClaro });

doc.end();
await new Promise((resolver) => doc.on("end", resolver));
await writeFile(saida, Buffer.concat(pedacos));
console.log("cartão desenhado:", saida);
