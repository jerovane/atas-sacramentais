import { COR, FONTE } from "../tema.js";
import { INSTRUCOES } from "../../conteudo.js";
import { FIM_DO_CORPO, L, VAO, X, faixaDoTopo, rodapeGeral } from "./ata-comum.js";
import { alturaDaNota, caixaDeReverencia, lista, maiorCorpoQueCabe, nota, secao, titulo } from "./texto-comum.js";

/**
 * A página das INSTRUÇÕES do discurso: o que o discurso do Presidente Oaks pede de quem dirige
 * e de quem assiste à reunião sacramental, com a reverência dos líderes no púlpito em destaque.
 *
 * Uma página só. O conteúdo vem de `conteudo.js`; o corpo da letra é o MAIOR em que tudo cabe,
 * entre o confortável e o piso de leitura (`texto-comum.js`).
 */

const FOLGA_ENTRE_BLOCOS = 13;

export function desenharInstrucoes(p, ctx) {
  p.novaPagina();
  const { unidade, estaca, ano } = ctx;
  const c = INSTRUCOES;
  let y = faixaDoTopo(p, { unidade, estaca, titulo: "INSTRUÇÕES PARA A REUNIÃO" }) + 14;
  y += titulo(p, y, c.titulo, c.apoio);

  const larguraDaColuna = (L - VAO) / 2;
  const medir = (corpo) => {
    const reverencia = caixaDeReverencia(p, 0, { titulo: c.reverencia.titulo, apoio: c.reverencia.apoio, itens: c.reverencia.itens, corpo, desenhar: false });
    const colunas = Math.max(
      lista(p, 0, 0, larguraDaColuna, c.lideres.itens, { corpo, desenhar: false }),
      lista(p, 0, 0, larguraDaColuna, c.membros.itens, { corpo, desenhar: false }),
    );
    return reverencia + FOLGA_ENTRE_BLOCOS + 18 + colunas + FOLGA_ENTRE_BLOCOS + alturaDaNota(p, c.nota);
  };
  const corpo = maiorCorpoQueCabe({ de: 10.2, cabe: (c2) => y + medir(c2) <= FIM_DO_CORPO });
  if (corpo === null) throw new Error(`As instruções do discurso não cabem numa página nem no corpo mínimo de leitura (faltam ${(y + medir(8.4) - FIM_DO_CORPO).toFixed(0)} pt): corte texto.`);

  y += caixaDeReverencia(p, y, { titulo: c.reverencia.titulo, apoio: c.reverencia.apoio, itens: c.reverencia.itens, corpo }) + FOLGA_ENTRE_BLOCOS;

  const xDireita = X + larguraDaColuna + VAO;
  secao(p, X, y, larguraDaColuna, c.lideres.titulo);
  secao(p, xDireita, y, larguraDaColuna, c.membros.titulo);
  y += 18;
  const altura = Math.max(
    lista(p, X, y, larguraDaColuna, c.lideres.itens, { corpo }),
    lista(p, xDireita, y, larguraDaColuna, c.membros.itens, { corpo }),
  );
  // Um fio vertical entre as colunas.
  p.linha(X + larguraDaColuna + VAO / 2, y, X + larguraDaColuna + VAO / 2, y + altura, { cor: COR.ouroClaro, espessura: 0.5 });
  y += altura + FOLGA_ENTRE_BLOCOS;

  y += nota(p, y, c.nota);
  if (y > FIM_DO_CORPO) throw new Error(`As instruções passaram do fim da página (${y.toFixed(1)})`);
  rodapeGeral(p, { unidade, estaca, ano, rotulo: "Instruções do discurso" });
  return { corpo, fim: y };
}

void FONTE;
