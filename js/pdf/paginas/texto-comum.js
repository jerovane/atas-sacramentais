import { COR, FONTE } from "../tema.js";
import { L, X } from "./ata-comum.js";

/**
 * As peças das páginas de TEXTO (a contracapa e as instruções): título, lista com destaque,
 * caixa de reverência e citação.
 *
 * Texto de leitura tem tamanho mínimo (`PISO`): uma página de instruções que só cabe em letra
 * miúda está com texto demais, e o certo é cortar o texto, não a letra. Por isso a página
 * escolhe o MAIOR corpo, entre o confortável e o piso, em que o conteúdo cabe — e, se não cabe
 * nem no piso, falha alto (o teste pega) em vez de sair apertada.
 *
 * Todo parágrafo de leitura é desenhado `semViuva`: a última linha nunca fica com uma palavra só.
 */

/** O menor corpo de letra de um texto de leitura, em pt. */
export const PISO = 8.4;

/** O corpo de letra do texto corrido que cabe: o maior de `de` a `ate` (passo de 0,2 pt) em que `cabe(corpo)` é verdade. */
export function maiorCorpoQueCabe({ de = 9.8, ate = PISO, cabe }) {
  for (let corpo = de; corpo >= ate - 1e-9; corpo = Math.round((corpo - 0.2) * 10) / 10) {
    if (cabe(corpo)) return corpo;
  }
  return null;
}

/** O título de uma página de texto: serifa grande, fio dourado e, se houver, uma linha de apoio. Devolve a altura. */
export function titulo(p, y, texto, apoio, { tamanhoDoApoio = 8.6 } = {}) {
  p.texto(texto, X, y, L, { fonte: FONTE.serifaSemi, tamanho: 21, cor: COR.petroleo900 });
  p.caixa(X, y + 29, 30, 1.8, { preenchimento: COR.ouro });
  if (!apoio) return 38;
  const altura = p.texto(apoio, X, y + 37, L, { fonte: FONTE.sansItalico, tamanho: tamanhoDoApoio, cor: COR.suave, entrelinha: 1.5, semViuva: true });
  return 37 + altura + 6;
}

/**
 * O rótulo de uma seção de texto, em caixa alta dourada, com um fio até a margem e, se houver,
 * de onde vem o trecho (`fonte`), pequeno e à direita. Devolve a altura.
 */
export function secao(p, x, y, w, texto, fonte) {
  p.caixa(x, y + 0.5, 5, 5, { preenchimento: COR.ouro, raio: 1.2 });
  const estiloDoTitulo = { fonte: FONTE.sansNegrito, tamanho: 7.4, cor: COR.ouroEscuro, espacamento: 0.8 };
  p.texto(texto.toUpperCase(), x + 10, y, w - 10, estiloDoTitulo);
  if (fonte) {
    // A origem nunca invade o título: se não couber ao lado dele, o corpo dela desce até 5,8 pt.
    const livre = w - 10 - p.largura(texto.toUpperCase(), estiloDoTitulo) - 10;
    p.textoAjustado(fonte, x + w - Math.max(livre, 40), y + 0.9, Math.max(livre, 40), { fonte: FONTE.sans, tamanho: 7, minimo: 5.8, cor: COR.suave, alinhar: "right" });
  }
  p.linha(x, y + 12.5, x + w, y + 12.5, { cor: COR.ouroClaro, espessura: 0.6 });
  return 18;
}

/**
 * Uma lista de itens, cada um com um destaque em negrito e o texto. `desenhar: false` só mede.
 * Item: { destaque?: string, texto: string }. Devolve a altura total.
 */
export function lista(p, x, y, w, itens, { corpo, espaco = 4.2, desenhar = true, cor = COR.texto, corDoDestaque = COR.petroleo800, marcador = COR.ouro } = {}) {
  const recuo = 10;
  const entrelinha = corpo * 0.24;
  let cursor = y;
  for (const item of itens) {
    const corridas = [];
    if (item.destaque) corridas.push({ texto: `${item.destaque} `, fonte: FONTE.sansNegrito, cor: corDoDestaque });
    corridas.push({ texto: item.texto, fonte: FONTE.sans, cor });
    let altura = p.alturaDeCorridas(corridas, w - recuo, { tamanho: corpo, entrelinha, semViuva: true });
    if (desenhar) {
      p.caixa(x, cursor + corpo * 0.36, 3.6, 3.6, { preenchimento: marcador, raio: 0.9 });
      // O que se desenhou é a medida de verdade: o próximo item começa logo depois dele.
      altura = p.corridas(corridas, x + recuo, cursor, w - recuo, { tamanho: corpo, entrelinha, semViuva: true });
    }
    cursor += altura + espaco;
  }
  return cursor - y - espaco;
}

/**
 * A caixa de destaque da reverência de quem dirige: uma tarja petróleo com o título e, embaixo, o
 * corpo em creme com os itens em DUAS colunas. O destaque vem da hierarquia (tarja, serifa, negrito),
 * e não da massa de tinta: uma caixa toda escura pesa na impressão e transparece para o outro lado
 * da folha. Devolve a altura. `desenhar: false` só mede.
 */
export function caixaDeReverencia(p, y, { titulo: cabecalho, itens, corpo, desenhar = true, apoio }) {
  const recuo = 16;
  const vao = 18;
  const interna = L - 2 * recuo;
  const larguraDaColuna = (interna - vao) / 2;
  const alturaDaFaixa = 27;
  const estiloDoApoio = { fonte: FONTE.sansItalico, tamanho: corpo - 0.4, entrelinha: 1.4, semViuva: true };
  const alturaDoApoio = apoio ? p.altura(apoio, interna, estiloDoApoio) : 0;
  const metade = Math.ceil(itens.length / 2);
  const colunas = [itens.slice(0, metade), itens.slice(metade)];
  const opcoesDaLista = { corpo, espaco: 4.4, cor: COR.texto, corDoDestaque: COR.petroleo800, marcador: COR.ouro };
  const alturaDasColunas = Math.max(...colunas.map((c) => lista(p, 0, 0, larguraDaColuna, c, { ...opcoesDaLista, desenhar: false })));
  const topoDoApoio = alturaDaFaixa + 9;
  const topoDosItens = topoDoApoio + (apoio ? alturaDoApoio + 8 : 0);
  const altura = topoDosItens + alturaDasColunas + 12;
  if (!desenhar) return altura;

  const r = 8;
  // O corpo creme, com um fio dourado em volta.
  p.caixa(X, y, L, altura, { preenchimento: COR.ouroPalido, opacidade: 0.5, raio: r });
  p.caixa(X, y, L, altura, { borda: COR.ouroClaro, espessura: 0.7, raio: r });
  // O filete dourado do lado esquerdo do corpo, seguindo o canto arredondado de baixo.
  p.caminho(`M ${X} ${y + alturaDaFaixa} L ${X + 3.6} ${y + alturaDaFaixa} L ${X + 3.6} ${y + altura} L ${X + r} ${y + altura} Q ${X} ${y + altura} ${X} ${y + altura - r} Z`, { preenchimento: COR.ouro });
  // A tarja do título: cantos de cima arredondados, fio dourado embaixo.
  p.caminho(`M ${X} ${y + r} Q ${X} ${y} ${X + r} ${y} L ${X + L - r} ${y} Q ${X + L} ${y} ${X + L} ${y + r} L ${X + L} ${y + alturaDaFaixa} L ${X} ${y + alturaDaFaixa} Z`, {
    preenchimento: p.gradienteLinear(X, 0, X + L, 0, [[0, COR.petroleo900], [1, COR.petroleo800]]),
  });
  p.linha(X, y + alturaDaFaixa, X + L, y + alturaDaFaixa, { cor: COR.ouro, espessura: 1.4 });
  p.losango(X + recuo + 4, y + alturaDaFaixa / 2, 4.2, { preenchimento: COR.ouroClaro });
  // 1 pt acima do centro: a descida do "g" e do "p" não toca o fio dourado da tarja.
  p.textoAjustado(cabecalho, X + recuo + 16, y + 5.3, interna - 16, { fonte: FONTE.serifaSemi, tamanho: 12.8, minimo: 10, cor: COR.ouroPalido });

  if (apoio) p.texto(apoio, X + recuo, y + topoDoApoio, interna, { ...estiloDoApoio, cor: COR.suave });
  const yItens = y + topoDosItens;
  colunas.forEach((coluna, i) => lista(p, X + recuo + i * (larguraDaColuna + vao), yItens, larguraDaColuna, coluna, opcoesDaLista));
  p.linha(X + recuo + larguraDaColuna + vao / 2, yItens, X + recuo + larguraDaColuna + vao / 2, yItens + alturaDasColunas, { cor: COR.ouroClaro, espessura: 0.6 });
  return altura;
}

/**
 * Uma citação em destaque: aspas grandes, texto em serifa itálica e a fonte embaixo. Ocupa a
 * largura toda ou só uma coluna (`x` e `largura`). Devolve a altura. `desenhar: false` só mede.
 *
 * `alturaFinal` estica a caixa até essa altura (para fechar na mesma linha da coluna ao lado) e
 * centra o conjunto nela. A quebra de linha do texto (`\n`) vale se cada linha couber na largura;
 * se não couber, a frase corre sozinha.
 */
export function citacao(p, y, { texto, fonte, desenhar = true, x = X, largura = L, recuo = 34, corpo = 14, alturaFinal = 0 }) {
  const interna = largura - 2 * recuo;
  const estilo = { fonte: FONTE.serifaItalico, tamanho: corpo, entrelinha: corpo * 0.23 };
  // Com folga de 6 pt: uma linha que só "quase" cabe seria quebrada pelo pdfkit e deixaria uma palavra sozinha.
  const cabeEmLinhas = texto.split("\n").every((linha) => p.largura(linha, estilo) <= interna - 6);
  const frase = cabeEmLinhas ? texto : texto.replace(/\s*\n\s*/g, " ");
  const alturaDoTexto = p.altura(frase, interna, estilo);
  // Em coluna estreita a aspa é menor e o texto começa mais abaixo, para um não pisar no outro.
  const estreita = largura < 300;
  const topoDoTexto = estreita ? 40 : 30;
  const natural = alturaDoTexto + topoDoTexto + 40;
  if (!desenhar) return natural;
  const altura = Math.max(natural, alturaFinal);
  const deslocamento = (altura - natural) / 2;
  p.caixa(x, y, largura, altura, { preenchimento: COR.ouroPalido, raio: 8, opacidade: 0.5 });
  p.caixa(x, y, largura, altura, { borda: COR.ouroClaro, raio: 8, espessura: 0.7 });
  p.texto("“", x + (estreita ? 12 : 14), y + deslocamento + (estreita ? 3 : 4), 40, { fonte: FONTE.serifaNegrito, tamanho: estreita ? 38 : 54, cor: COR.ouro, opacidade: 0.85 });
  p.texto(frase, x + recuo, y + deslocamento + topoDoTexto, interna, { ...estilo, cor: COR.petroleo900, alinhar: "center" });
  p.ornamento(x + largura / 2, y + deslocamento + topoDoTexto + alturaDoTexto + 14, 60, { vao: 8, espessura: 0.6 });
  p.texto(fonte, x + recuo, y + deslocamento + topoDoTexto + alturaDoTexto + 24, interna, { fonte: FONTE.sansSemi, tamanho: 8, cor: COR.ouroEscuro, alinhar: "center", espacamento: 0.8 });
  return altura;
}

const ESTILO_DA_NOTA = { fonte: FONTE.sansItalico, tamanho: 7.6, entrelinha: 1.4, semViuva: true };

/** A altura que a nota de rodapé ocupa — medida com o mesmo estilo com que é desenhada. */
export function alturaDaNota(p, texto) {
  return p.altura(texto, L, ESTILO_DA_NOTA);
}

/** Uma nota de rodapé de página: pequena, em itálico, no pé do corpo. */
export function nota(p, y, texto) {
  return p.texto(texto, X, y, L, { ...ESTILO_DA_NOTA, cor: COR.quieto });
}
