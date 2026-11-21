import { QUARTA_CAPA } from "../../conteudo.js";
import { A4, COR, FONTE } from "../tema.js";
import { faixaEmArco, moldura } from "./capa.js";

/**
 * A QUARTA CAPA: a capa de trás, a última folha do caderno (o verso da última folha, que fica por fora
 * quando o caderno é montado).
 *
 * Mais simples que a capa e do mesmo livro: o mesmo fundo claro, a mesma moldura dourada e a faixa
 * petróleo em arco, mais baixa. No alto, o templo, menor, como um selo; no meio, uma escritura sobre o
 * sacramento em destaque (Lucas 22:19) e, menor, outra (Morôni 6:6), a que descreve os santos reunindo-se
 * para o sacramento — o que as atas deste caderno registram, semana a semana.
 *
 * Nada passa por trás das letras: o templo fica ACIMA do texto. (Um templo bem claro atrás da citação
 * parecia bonito na tela, mas numa impressora que escurece o fundo as linhas do desenho riscariam as letras.)
 *
 * Sem rodapé e sem margem de encadernação, como a capa: é um desenho de página inteira, com moldura.
 */

/** O templo: largura do desenho e onde ele senta. A arte ocupa de 10,3 % a 89,6 % da altura da imagem. */
const TEMPLO = { largura: 280, topo: 100, opacidade: 0.6 };
const ALTURA_DA_IMAGEM_DO_TEMPLO = (TEMPLO.largura * 760) / 960;
export const BASE_DO_TEMPLO = TEMPLO.topo + 0.896 * ALTURA_DA_IMAGEM_DO_TEMPLO;

/**
 * Cola cada palavra de uma letra só (o, a, e) à seguinte com espaço sem quebra, para que o artigo nunca
 * fique sozinho no fim de uma linha ("partilhar o / pão"). O texto da escritura não muda; só a quebra.
 */
export function colarArtigos(texto) {
  const palavras = texto.split(" ");
  return palavras.map((palavra, i) => (i === palavras.length - 1 ? palavra : palavra + (/^[aeoAEO]$/.test(palavra) ? " " : " "))).join("");
}

export function desenharQuartaCapa(p, { unidade, ano }) {
  p.novaPagina({ encadernar: false });
  const W = A4.largura;
  const cx = W / 2;
  const c = QUARTA_CAPA;

  // O halo dourado, no meio da página, atrás da escritura.
  p.preencher(0, 0, W, A4.altura, p.gradienteRadial(cx, 350, 360, [[0, "#fff1cf", 0.62], [0.55, "#fff8e8", 0.3], [1, "#ffffff", 0]]));

  // O templo, no alto, menor que o da capa.
  p.imagem("templo", cx - TEMPLO.largura / 2, TEMPLO.topo, { largura: TEMPLO.largura, opacidade: TEMPLO.opacidade });

  // A escritura principal, por oração.
  const estiloDaPrincipal = { fonte: FONTE.serifaItalico, tamanho: 28, entrelinha: 9 };
  const larguraDoTexto = 400;
  const topoDoTexto = BASE_DO_TEMPLO + 36;
  const alturaDoTexto = p.altura(c.principal.texto, larguraDoTexto, estiloDaPrincipal);
  p.texto(c.principal.texto, cx - larguraDoTexto / 2, topoDoTexto, larguraDoTexto, { ...estiloDaPrincipal, cor: COR.petroleo900, alinhar: "center" });

  // A referência, abaixo de um fio: o único separador da página.
  const yDoFio = topoDoTexto + alturaDoTexto + 26;
  p.ornamento(cx, yDoFio, 70, { vao: 8, espessura: 0.6 });
  p.texto(c.principal.referencia, 0, yDoFio + 14, W, { fonte: FONTE.sansSemi, tamanho: 10.5, cor: COR.ouroEscuro, alinhar: "center", espacamento: 2.6 });

  // A segunda escritura, menor e mais quieta, separada só pelo espaço.
  const yDaSegunda = yDoFio + 64;
  const estiloDaSegunda = { fonte: FONTE.serifaItalico, tamanho: 14, entrelinha: 4.5 };
  const larguraDaSegunda = 320;
  const textoDaSegunda = colarArtigos(c.secundaria.texto);
  const alturaDaSegunda = p.altura(textoDaSegunda, larguraDaSegunda, estiloDaSegunda);
  p.texto(textoDaSegunda, cx - larguraDaSegunda / 2, yDaSegunda, larguraDaSegunda, { ...estiloDaSegunda, cor: COR.suave, alinhar: "center" });
  p.texto(c.secundaria.referencia, 0, yDaSegunda + alturaDaSegunda + 10, W, { fonte: FONTE.sansSemi, tamanho: 8.4, cor: COR.ouroEscuro, alinhar: "center", espacamento: 2.2 });

  // A faixa petróleo em arco, mais baixa que a da capa, com o logotipo e a unidade centrados nela.
  faixaEmArco(p, { topoDosLados: 736, controle: 692 });
  p.imagem("logo", cx - 45, 744, { altura: 40 });
  p.textoAjustado(`${unidade.nome}  ·  ${ano}`, 60, 788, W - 120, { fonte: FONTE.sansSemi, tamanho: 8, minimo: 6, cor: COR.claro, alinhar: "center", espacamento: 1.3 });

  // A moldura, por cima de tudo.
  moldura(p);
}
