import { A4, COR, FONTE } from "../tema.js";

/**
 * A capa do caderno.
 *
 * Fundo claro, para imprimir leve e pedir silêncio: o templo em linha dourada no centro, o título
 * em serifa, e embaixo uma faixa petróleo em arco — a colina do desenho — onde o logotipo da
 * estaca aparece com as letras brancas que ele foi feito para ter.
 *
 * Este módulo também guarda as duas peças que a capa e a quarta capa (a de trás) dividem: a faixa
 * em arco e a moldura. Assim as duas pontas do caderno são claramente do mesmo livro.
 */

/**
 * A faixa petróleo em arco no pé da página. Fica DENTRO da moldura (e não vai até a borda do papel): as
 * impressoras comuns não imprimem nos últimos milímetros, e uma faixa até a borda sairia com um friso
 * branco irregular. Dentro da moldura ela sai igual em qualquer impressora. `topoDosLados` é o `y` onde
 * a curva toca as laterais e `controle`, o ponto que a faz subir no meio.
 */
export function faixaEmArco(p, { topoDosLados, controle }) {
  const W = A4.largura;
  const H = A4.altura;
  const cx = W / 2;
  const ESQ = 22;
  const DIR = W - 22;
  const BASE = H - 22;
  const arco = (dy) => `M ${ESQ} ${topoDosLados + dy} Q ${cx} ${controle + dy} ${DIR} ${topoDosLados + dy}`;
  p.caminho(`${arco(0)} L ${DIR} ${BASE} L ${ESQ} ${BASE} Z`, { preenchimento: p.gradienteLinear(0, topoDosLados - 28, 0, BASE, [[0, COR.petroleo800], [1, COR.petroleo950]]) });
  // Os fios dourados do arco ficam entre as bordas da moldura.
  p.recortado(`M 28 0 L ${W - 28} 0 L ${W - 28} ${H} L 28 ${H} Z`, () => {
    p.caminho(arco(-9), { borda: COR.ouro, espessura: 0.9 });
    p.caminho(arco(-14), { borda: COR.ouroClaro, espessura: 0.4, opacidade: 0.7 });
  });
}

/**
 * A moldura, por cima de tudo: dois fios dourados (o de dentro mais fino) que contornam a página
 * inteira, faixa incluída, como a borda de um livro, com um losango em cada canto.
 */
export function moldura(p) {
  const W = A4.largura;
  const H = A4.altura;
  p.caixa(22, 22, W - 44, H - 44, { borda: COR.ouro, espessura: 0.9 });
  p.caixa(28, 28, W - 56, H - 56, { borda: COR.ouroClaro, espessura: 0.45 });
  for (const [x, y] of [[28, 28], [W - 28, 28], [28, H - 28], [W - 28, H - 28]]) p.losango(x, y, 3.4, { preenchimento: COR.ouro });
}

export function desenharCapa(p, { unidade, ano, estaca }) {
  p.novaPagina({ encadernar: false });
  const W = A4.largura;
  const cx = W / 2;

  // O halo dourado atrás do templo: só um calor no papel.
  p.preencher(0, 0, W, 560, p.gradienteRadial(cx, 262, 270, [[0, "#fff1cf", 0.7], [0.55, "#fff8e8", 0.35], [1, "#ffffff", 0]]));

  // O nome da estaca no alto, em caixa alta espaçada.
  p.texto("ESTACA PACAJUS BRASIL", 0, 66, W, { fonte: FONTE.sansSemi, tamanho: 9.2, cor: COR.petroleo700, alinhar: "center", espacamento: 3.4 });
  p.ornamento(cx, 90, 96, { vao: 10 });

  // O templo.
  p.imagem("templo", cx - 215, 96, { largura: 430 });

  // O título.
  p.texto("Ata da", 0, 428, W, { fonte: FONTE.serifaItalico, tamanho: 17, cor: COR.ouroEscuro, alinhar: "center", espacamento: 0.6 });
  p.texto("Reunião Sacramental", 0, 450, W, { fonte: FONTE.serifaSemi, tamanho: 37, cor: COR.petroleo900, alinhar: "center" });
  p.ornamento(cx, 514, 150, { vao: 12 });

  // A unidade e o ano.
  p.textoAjustado(unidade.nome, 38, 532, W - 76, { fonte: FONTE.serifa, tamanho: 25, minimo: 13, cor: COR.petroleo700, alinhar: "center" });
  p.texto(String(ano), 0, 568, W, { fonte: FONTE.serifa, tamanho: 58, cor: COR.ouro, alinhar: "center", espacamento: 4 });

  // A faixa petróleo em arco: a colina do desenho.
  faixaEmArco(p, { topoDosLados: 704, controle: 652 });

  // O logotipo (as letras são brancas: só aparecem no petróleo) e o nome da Igreja.
  const alturaDoLogo = 70;
  p.imagem("logo", cx - 78, 718, { altura: alturaDoLogo });
  // Letra clara sobre petróleo "empasta" numa impressora a laser simples: por isso 8 pt, e não os 6 pt de antes.
  p.texto("A IGREJA DE JESUS CRISTO DOS SANTOS DOS ÚLTIMOS DIAS", 0, 794, W, {
    fonte: FONTE.sansSemi,
    tamanho: 8,
    cor: COR.branco,
    alinhar: "center",
    espacamento: 1.3,
  });

  // A moldura, por cima de tudo.
  moldura(p);
  void estaca;
}
