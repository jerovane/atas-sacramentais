import { CONTRACAPA } from "../../conteudo.js";
import { COR } from "../tema.js";
import { FIM_DO_CORPO, L, VAO, X, faixaDoTopo, rodapeGeral } from "./ata-comum.js";
import { alturaDaNota, citacao, lista, maiorCorpoQueCabe, nota, secao, titulo } from "./texto-comum.js";

/**
 * A CONTRACAPA: as orientações do Manual Geral sobre a reunião sacramental, em seções curtas, e
 * uma citação sobre o sacramento no pé da página.
 *
 * Fica no verso da capa, para quem abre o caderno ver as orientações antes de qualquer ata.
 * Uma página só: o corpo da letra é o maior em que tudo cabe (`texto-comum.js`), e as seções se
 * repartem em duas colunas de alturas parecidas.
 */

const FOLGA_ENTRE_SECOES = 9;

/**
 * Reparte as seções e a citação em duas colunas, SEM mudar a ordem de leitura das seções (a
 * primeira coluna, de cima a baixo, e depois a segunda). Escolhe o ponto de corte — e a coluna
 * em que a citação fecha — que deixam a coluna mais alta a mais baixa possível.
 */
function distribuir(p, secoes, largura, corpo, alturaDaCitacao) {
  const itens = secoes.map((s) => ({ secao: s, altura: 18 + lista(p, 0, 0, largura, s.itens, { corpo, desenhar: false }) }));
  const alturaDe = (c) => c.reduce((soma, { altura }) => soma + altura, 0) + FOLGA_ENTRE_SECOES * Math.max(0, c.length - 1);
  let melhor = null;
  for (let corte = 1; corte < itens.length; corte++) {
    for (const ladoDaCitacao of [0, 1]) {
      const colunas = [itens.slice(0, corte), itens.slice(corte)];
      const alturas = colunas.map(alturaDe);
      alturas[ladoDaCitacao] += FOLGA_ENTRE_SECOES + 4 + alturaDaCitacao;
      const altura = Math.max(...alturas);
      if (melhor === null || altura < melhor.altura) melhor = { colunas, ladoDaCitacao, altura };
    }
  }
  return melhor;
}

export function desenharContracapa(p, ctx) {
  p.novaPagina();
  const { unidade, estaca, ano } = ctx;
  const c = CONTRACAPA;
  let y = faixaDoTopo(p, { unidade, estaca, titulo: "ORIENTAÇÕES DO MANUAL GERAL" }) + 14;
  y += titulo(p, y, c.titulo, c.apoio);

  const largura = (L - VAO) / 2;
  const opcoesDaCitacao = { texto: c.citacao.texto, fonte: c.citacao.fonte, largura, recuo: 12, corpo: 13 };
  const alturaDaCitacao = citacao(p, 0, { ...opcoesDaCitacao, desenhar: false });
  // Tudo o que vem DEPOIS das colunas: o respiro e a nota (medida de verdade).
  const reserva = 12 + alturaDaNota(p, c.nota);
  const corpo = maiorCorpoQueCabe({ de: 10.2, cabe: (c2) => y + distribuir(p, c.secoes, largura, c2, alturaDaCitacao).altura + reserva <= FIM_DO_CORPO });
  if (corpo === null) throw new Error("As orientações da contracapa não cabem numa página nem no corpo mínimo de leitura: corte texto.");

  const { colunas, ladoDaCitacao, altura } = distribuir(p, c.secoes, largura, corpo, alturaDaCitacao);
  colunas.forEach((coluna, i) => {
    const x = X + i * (largura + VAO);
    let yc = y;
    for (const { secao: s } of coluna) {
      secao(p, x, yc, largura, s.titulo, s.fonte);
      yc += 18 + lista(p, x, yc + 18, largura, s.itens, { corpo }) + FOLGA_ENTRE_SECOES;
    }
    // A citação fecha a coluna e, se a outra for mais alta, se estica até ela: as duas terminam na mesma linha.
    if (i === ladoDaCitacao) citacao(p, yc + 4, { ...opcoesDaCitacao, x, alturaFinal: y + altura - (yc + 4) });
  });
  p.linha(X + largura + VAO / 2, y, X + largura + VAO / 2, y + altura, { cor: COR.ouroClaro, espessura: 0.5 });
  y += altura + 12;

  y += nota(p, y, c.nota);
  if (y > FIM_DO_CORPO) throw new Error(`A contracapa passou do fim da página (${y.toFixed(1)})`);
  rodapeGeral(p, { unidade, estaca, ano, rotulo: "Orientações do Manual Geral" });
  return { corpo, fim: y };
}
