import { FIM_DO_CORPO, L, PASSO, X, faixaDoTopo, rodapeGeral } from "./ata-comum.js";
import { titulo } from "./texto-comum.js";

/**
 * A folha de ANOTAÇÕES: linhas para o que a ata não comporta — lembretes, decisões do ano, nomes a procurar,
 * datas a não esquecer.
 *
 * Ela existe também por uma razão de impressão: a quarta capa (a de trás) tem de cair no VERSO da última
 * folha, e para isso precisa de uma página "irmã" na frente da mesma folha. Em vez de uma página em branco,
 * o caderno fecha com um lugar útil para escrever.
 */
export function desenharAnotacoes(p, { unidade, estaca, ano }) {
  p.novaPagina();
  let y = faixaDoTopo(p, { unidade, estaca, titulo: "ANOTAÇÕES" }) + 14;
  // A legenda em 9,6 pt (e não os 8,6 das páginas de orientação): aqui não há texto denso disputando a folha.
  y += titulo(p, y, "Anotações do ano", "Para o que a folha da ata não comporta: lembretes, decisões, nomes a procurar e datas a não esquecer.", { tamanhoDoApoio: 9.6 });
  y += 8;
  const linhas = Math.floor((FIM_DO_CORPO - 8 - y) / PASSO);
  for (let i = 1; i <= linhas; i++) p.escrita(X, y + i * PASSO, L);
  rodapeGeral(p, { unidade, estaca, ano, rotulo: "Anotações" });
  return { linhas };
}
