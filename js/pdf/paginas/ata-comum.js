import { A4, COR, FONTE, LARGURA_UTIL, MARGEM } from "../tema.js";
import { dataPorExtenso } from "../../calendario.js";

/**
 * As peças que a frente e o verso da ata têm em comum: o cabeçalho, o rodapé e os campos.
 *
 * Tudo aqui é desenhado DENTRO das margens (nada vai até a borda do papel): impressora comum
 * não imprime nos últimos milímetros, e uma faixa até a borda sairia com friso irregular.
 */

export const X = MARGEM.esq;
export const L = LARGURA_UTIL;
const DIREITA = A4.largura - MARGEM.dir;

/** O espaço entre dois campos lado a lado. */
export const VAO = 14;

/**
 * Onde começa a coluna da direita. TODA coisa que se alinha à direita da folha (campo, cabeçalho de
 * tabela, assinatura) parte daqui, para a borda esquerda da coluna ser uma só.
 */
export const X_DIREITA = X + (L + VAO) / 2;

/**
 * O passo das linhas de escrever (a distância entre duas): 19 pt, uns 6,7 mm. Menos que isso aperta
 * a letra corrida de quem escreve com pressa durante a reunião.
 */
export const PASSO = 19;

/** O quanto o rodapé ocupa: o corpo da página termina aqui. */
export const FIM_DO_CORPO = A4.altura - 36;

/** O que muda por tipo de unidade: "Bispo" numa ala, "Presidente do Ramo" num ramo, "Líder do Grupo" num grupo. */
const LIDER_POR_TIPO = { ala: "Bispo", ramo: "Presidente do Ramo", grupo: "Líder do Grupo" };

export function rotuloDoLider(unidade) {
  return LIDER_POR_TIPO[unidade.tipo] ?? LIDER_POR_TIPO.ala;
}

/**
 * A faixa petróleo do topo de toda página do caderno (menos a capa): o logotipo à esquerda, o
 * título da página e a unidade à direita. Devolve o `y` logo abaixo dela.
 */
export function faixaDoTopo(p, { unidade, estaca, titulo = "ATA DA REUNIÃO SACRAMENTAL" }) {
  const topo = MARGEM.topo - 4;
  const alturaDaFaixa = 42;
  p.caminho(`M ${X + 6} ${topo} L ${DIREITA - 6} ${topo} Q ${DIREITA} ${topo} ${DIREITA} ${topo + 6} L ${DIREITA} ${topo + alturaDaFaixa - 6} Q ${DIREITA} ${topo + alturaDaFaixa} ${DIREITA - 6} ${topo + alturaDaFaixa} L ${X + 6} ${topo + alturaDaFaixa} Q ${X} ${topo + alturaDaFaixa} ${X} ${topo + alturaDaFaixa - 6} L ${X} ${topo + 6} Q ${X} ${topo} ${X + 6} ${topo} Z`, {
    preenchimento: p.gradienteLinear(X, 0, DIREITA, 0, [[0, COR.petroleo900], [1, COR.petroleo800]]),
  });
  p.linha(X + 8, topo + alturaDaFaixa - 0.8, DIREITA - 8, topo + alturaDaFaixa - 0.8, { cor: COR.ouro, espessura: 1.2 });
  p.imagem("logo", X + 12, topo + 5, { altura: 31 });
  p.texto(titulo, X + 100, topo + 9.5, L - 112, { fonte: FONTE.sansExtra, tamanho: 11, cor: COR.branco, alinhar: "right", espacamento: 1.5 });
  p.textoAjustado(`${unidade.nome}  ·  ${estaca.nome}`, X + 100, topo + 25, L - 112, { fonte: FONTE.sans, tamanho: 8.4, minimo: 6.4, cor: COR.ouroClaro, alinhar: "right", espacamento: 0.3 });
  return topo + alturaDaFaixa;
}

/**
 * O cabeçalho da ata: a faixa e, embaixo, a data por extenso com o tipo da reunião e o número
 * da ata. Devolve o `y` onde o corpo pode começar.
 */
export function cabecalho(p, { unidade, estaca, domingo, total, subtitulo }) {
  const abaixoDaFaixa = faixaDoTopo(p, { unidade, estaca });

  // A data e o tipo da reunião.
  const yData = abaixoDaFaixa + 11;
  p.texto(dataPorExtenso(domingo.iso), X, yData, L - 110, { fonte: FONTE.serifaSemi, tamanho: 19.5, cor: COR.petroleo900 });
  const fast = domingo.tipo === "testemunhos";
  const rotulo = subtitulo ?? (fast ? "REUNIÃO DE JEJUM E TESTEMUNHOS" : "REUNIÃO SACRAMENTAL");
  const marca = fast && domingo.remarcado && !subtitulo ? "  ·  REMARCADA" : "";
  p.texto(rotulo + marca, X, yData + 25, L - 110, { fonte: FONTE.sansNegrito, tamanho: 7.4, cor: COR.ouroEscuro, espacamento: 1.3 });

  // O número da ata, num selo à direita.
  const larguraDoSelo = 74;
  const xDoSelo = DIREITA - larguraDoSelo;
  p.caixa(xDoSelo, yData - 1, larguraDoSelo, 34, { borda: COR.ouro, espessura: 0.8, raio: 5 });
  p.texto("ATA", xDoSelo, yData + 3.5, larguraDoSelo, { fonte: FONTE.sansNegrito, tamanho: 6.8, cor: COR.ouroEscuro, alinhar: "center", espacamento: 1.6 });
  p.texto(`${domingo.ordem} de ${total}`, xDoSelo, yData + 13.5, larguraDoSelo, { fonte: FONTE.serifaSemi, tamanho: 14, cor: COR.petroleo900, alinhar: "center" });

  return yData + 42;
}

/** O rodapé de uma página qualquer do caderno: um fio, a unidade e o que a página é. */
export function rodapeGeral(p, { unidade, estaca, ano, rotulo }) {
  const y = A4.altura - 30;
  p.linha(X, y - 5, DIREITA, y - 5, { cor: COR.ouroClaro, espessura: 0.6 });
  const estilo = { fonte: FONTE.sans, tamanho: 7.4, cor: COR.quieto };
  p.textoAjustado(`${estaca.nome}  ·  ${unidade.nome}`, X, y, L / 2 - 8, { ...estilo, minimo: 5.5 });
  p.texto(`${rotulo}  ·  ${ano}`, X + L / 2, y, L / 2, { ...estilo, alinhar: "right" });
}

/** O rodapé da ata: o de sempre, dizendo qual ata é e a face da folha. */
export function rodape(p, { unidade, estaca, ano, domingo, total, face }) {
  rodapeGeral(p, { unidade, estaca, ano, rotulo: `Ata ${domingo.ordem} de ${total}  ·  ${face}` });
}

/**
 * Um campo com o rótulo à esquerda e a linha de escrever à direita. A altura é a da fileira
 * (`ALTURA_DA_FILEIRA`): o rótulo senta sobre a mesma linha da escrita.
 */
export const ALTURA_DA_FILEIRA = 17;

export function campo(p, x, y, w, rotulo, { larguraDoRotulo } = {}) {
  const texto = rotulo.toUpperCase();
  const estilo = { fonte: FONTE.sansNegrito, tamanho: 7.2, cor: COR.ouroEscuro, espacamento: 0.6 };
  const lw = larguraDoRotulo ?? p.largura(texto, estilo) + 6;
  p.texto(texto, x, y + 6.2, lw + 6, estilo);
  p.escrita(x + lw, y + 14.2, w - lw);
}

/** Dois campos lado a lado, de meia largura cada. Devolve a altura. */
export function par(p, y, esquerdo, direito, { proporcao = 0.5 } = {}) {
  const largura = L - VAO;
  const w1 = largura * proporcao;
  campo(p, X, y, w1, esquerdo);
  campo(p, X + w1 + VAO, y, largura - w1, direito);
  return ALTURA_DA_FILEIRA;
}

/** Um campo de largura inteira. */
export function inteiro(p, y, rotulo) {
  campo(p, X, y, L, rotulo);
  return ALTURA_DA_FILEIRA;
}

/** Uma linha de escrever sem rótulo (a continuação de um campo acima). */
export function linhaLivre(p, y, { recuo = 0 } = {}) {
  p.escrita(X + recuo, y + 14.2, L - recuo);
  return ALTURA_DA_FILEIRA;
}

/**
 * Uma tabela de duas colunas — nome e função/quem —, com o título do bloco (e a dica "nome") na
 * ponta esquerda do cabeçalho, o rótulo da segunda coluna na direita e `linhas` linhas de escrever.
 * A divisória cai uma folga antes de `X_DIREITA`, e o rótulo da direita parte de `X_DIREITA`: a mesma
 * borda dos campos e das assinaturas. Devolve a altura.
 */
export function tabelaDePares(p, y, { esquerda, direita, linhas, altura = PASSO, dica = "nome" }) {
  const cabecalho = 15;
  const xDivisoria = X_DIREITA - VAO / 2;
  p.caixa(X, y, L, cabecalho, { preenchimento: COR.painel, raio: 3 });
  p.caixa(X, y + 3.4, 2.2, cabecalho - 6.8, { preenchimento: COR.ouro });
  const estilo = { fonte: FONTE.sansNegrito, tamanho: 7.2, cor: COR.petroleo800, espacamento: 0.8 };
  const titulo = esquerda.toUpperCase();
  p.texto(titulo, X + 8, y + 4.4, xDivisoria - X - 12, estilo);
  if (dica) {
    // "· NOME" ao lado do título do bloco: a coluna da esquerda é onde se escreve o nome.
    const xDaDica = X + 8 + p.largura(titulo, estilo) + 7;
    p.texto(`·  ${dica.toUpperCase()}`, xDaDica, y + 4.4, xDivisoria - xDaDica - 4, { ...estilo, fonte: FONTE.sans, cor: COR.quieto });
  }
  p.texto(direita.toUpperCase(), X_DIREITA, y + 4.4, X + L - X_DIREITA - 4, estilo);
  const corpo = y + cabecalho;
  for (let i = 0; i < linhas; i++) p.escrita(X, corpo + (i + 1) * altura, L);
  p.linha(xDivisoria, y + 3, xDivisoria, corpo + linhas * altura, { cor: COR.divisoria, espessura: 0.6 });
  return cabecalho + linhas * altura;
}

/** O bloco das assinaturas: duas linhas com a legenda embaixo, na mesma grade de duas colunas dos campos. */
export function assinaturas(p, y, unidade) {
  const legenda = { fonte: FONTE.sansSemi, tamanho: 7, cor: COR.quieto, alinhar: "center", espacamento: 1 };
  const larguraEsquerda = X_DIREITA - X - 24;
  const larguraDireita = X + L - X_DIREITA;
  p.escrita(X, y + 18, larguraEsquerda);
  p.texto(`ASSINATURA DO ${rotuloDoLider(unidade).toUpperCase()}`, X, y + 21, larguraEsquerda, legenda);
  p.escrita(X_DIREITA, y + 18, larguraDireita);
  p.texto("ASSINATURA DO SECRETÁRIO", X_DIREITA, y + 21, larguraDireita, legenda);
  return 32;
}
