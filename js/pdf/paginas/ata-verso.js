import { COR, FONTE } from "../tema.js";
import { FIM_DO_CORPO, L, X, cabecalho, rodape } from "./ata-comum.js";

/**
 * O VERSO da ata: o que acontece DEPOIS da reunião.
 *
 *   - Quem faltou (um nome por linha) e, ao lado de cada nome, o plano de ministração: quem vai
 *     e quando. Uma linha, uma pessoa: o plano é individual.
 *   - No domingo de jejum e testemunhos, antes disso, o espaço para anotar os nomes de quem
 *     prestou testemunho.
 *
 * O número de linhas não é fixo: preenche a folha. Um domingo normal tem a página inteira para
 * quem faltou; o de testemunhos divide com a lista dos testemunhos.
 */

const COLUNAS = [
  { chave: "n", titulo: "", largura: 24 },
  { chave: "nome", titulo: "Nome de quem faltou", largura: 190 },
  { chave: "quem", titulo: "Quem vai ministrar", largura: 148 },
  { chave: "quando", titulo: "Quando", largura: 103 },
  { chave: "feito", titulo: "Feito", largura: L - 24 - 190 - 148 - 103 },
];

/** O número de cada linha: escuro o bastante para se ver, pequeno e à parte, para o nome escrito não pisar nele. */
const NUMERO = { fonte: FONTE.sans, tamanho: 7.4, cor: COR.quieto };

function tituloDeSecao(p, y, titulo, legenda) {
  p.texto(titulo, X, y, L, { fonte: FONTE.serifaSemi, tamanho: 14.5, cor: COR.petroleo900 });
  p.caixa(X, y + 21, 26, 1.6, { preenchimento: COR.ouro });
  if (legenda) p.texto(legenda, X, y + 27, L, { fonte: FONTE.sansItalico, tamanho: 8.6, cor: COR.suave });
  return legenda ? 46 : 32;
}

/** A tabela de quem faltou; `linhas` fixa quantas, ou, sem ela, tantas quantas cabem até o fim da folha. */
function tabelaDeAusentes(p, y, { altura }) {
  const cabecalhoAltura = 17;
  const linhas = Math.floor((FIM_DO_CORPO - y - cabecalhoAltura) / altura);
  p.caixa(X, y, L, cabecalhoAltura, { preenchimento: COR.painel, raio: 3 });
  let x = X;
  for (const c of COLUNAS) {
    if (c.titulo) {
      p.texto(c.titulo.toUpperCase(), x + (c.chave === "feito" ? 0 : 7), y + 5.4, c.largura - (c.chave === "feito" ? 0 : 9), {
        fonte: FONTE.sansNegrito,
        tamanho: 7.2,
        cor: COR.petroleo800,
        espacamento: 0.8,
        alinhar: c.chave === "feito" ? "center" : "left",
      });
    }
    x += c.largura;
  }
  const topo = y + cabecalhoAltura;
  for (let i = 0; i < linhas; i++) {
    const base = topo + (i + 1) * altura;
    p.escrita(X, base, L);
    p.texto(String(i + 1), X, base - altura + (altura - 8) / 2 + 0.5, COLUNAS[0].largura - 7, { ...NUMERO, alinhar: "right" });
    const xFeito = X + L - COLUNAS[4].largura;
    p.quadradinho(xFeito + (COLUNAS[4].largura - 8.5) / 2, base - altura / 2 - 4.25);
  }
  // Os fios verticais entre as colunas, do cabeçalho ao fim.
  let xv = X;
  for (const c of COLUNAS.slice(0, -1)) {
    xv += c.largura;
    p.linha(xv, topo, xv, topo + linhas * altura, { cor: COR.divisoria, espessura: 0.6 });
  }
  return { fim: topo + linhas * altura, linhas };
}

/** Duas colunas numeradas para anotar quem prestou testemunho: o número tem coluna própria, e o nome vai na linha. */
function listaDeTestemunhos(p, y, { linhasPorColuna, altura }) {
  const vao = 20;
  const larguraDaColuna = (L - vao) / 2;
  const larguraDoNumero = 18;
  for (let c = 0; c < 2; c++) {
    const x0 = X + c * (larguraDaColuna + vao);
    for (let i = 0; i < linhasPorColuna; i++) {
      const base = y + (i + 1) * altura;
      p.escrita(x0 + larguraDoNumero, base, larguraDaColuna - larguraDoNumero);
      p.texto(String(c * linhasPorColuna + i + 1), x0, base - altura + (altura - 8) / 2 + 0.5, larguraDoNumero - 5, { ...NUMERO, alinhar: "right" });
    }
    // Um fio fino separa o número do nome: o nome escrito não encosta no número.
    p.linha(x0 + larguraDoNumero, y + 2, x0 + larguraDoNumero, y + linhasPorColuna * altura, { cor: COR.divisoria, espessura: 0.6 });
  }
  return linhasPorColuna * altura;
}

export function desenharVerso(p, ctx) {
  p.novaPagina();
  const jejum = ctx.domingo.tipo === "testemunhos";
  const subtitulo = jejum ? "VERSO  ·  TESTEMUNHOS, FREQUÊNCIA E MINISTRAÇÃO" : "VERSO  ·  FREQUÊNCIA E MINISTRAÇÃO";
  let y = cabecalho(p, { ...ctx, subtitulo }) + 2;

  if (jejum) {
    y += tituloDeSecao(p, y, "Testemunhos prestados", "Um nome por linha, na ordem em que as pessoas se levantaram.");
    y += listaDeTestemunhos(p, y, { linhasPorColuna: 12, altura: 19.5 }) + 14;
  }

  y += tituloDeSecao(p, y, "Quem faltou e quem vai ministrar", "Anote quem faltou hoje e combine, uma pessoa de cada vez, quem vai ministrar e quando.");
  const { fim, linhas } = tabelaDeAusentes(p, y, { altura: jejum ? 22 : 26 });

  if (fim > FIM_DO_CORPO) throw new Error(`O verso da ata de ${ctx.domingo.iso} passou do fim da página`);
  rodape(p, { ...ctx, face: "verso" });
  return { fim, linhas };
}
