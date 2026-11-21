import { COR, FONTE } from "../tema.js";
import { ALTURA_DA_FILEIRA, FIM_DO_CORPO, L, PASSO, VAO, X, assinaturas, cabecalho, campo, inteiro, linhaLivre, par, rodape, tabelaDePares } from "./ata-comum.js";

/**
 * A FRENTE da ata: os mesmos campos da ata que a estaca já usa, na mesma ordem em que a reunião
 * acontece, para escrever à mão enquanto ela corre. Nada vem preenchido além da data: nem os
 * anúncios (a ata antiga trazia alguns fixos; aqui ficam em aberto).
 *
 * O que NÃO está aqui, por decisão de quem usa a ata: o término da reunião (só o horário de
 * INÍCIO), a distribuição do sacramento e as orações do pão e da água. Do sacramento consta só o
 * hino.
 *
 * Dois desenhos, conforme o domingo:
 *   - NORMAL: três oradores (com tema e tempo previsto) e o hino intermediário.
 *   - JEJUM E TESTEMUNHOS (primeiro domingo): sem oradores — só os testemunhos, que se anotam no
 *     verso — e o espaço das crianças abençoadas.
 *
 * As linhas de escrever têm passo de `PASSO` (uns 6,7 mm) e há ar entre um bloco e o seguinte:
 * quem escreve à mão durante a reunião precisa de linha larga, que dá lugar a menos linhas por
 * bloco (o domingo de jejum e o normal têm quantidades diferentes, conforme o espaço que sobra).
 *
 * A folha tem de caber em UMA página nos dois desenhos; o teste confere o fim do corpo.
 */

/** O ar entre dois blocos. */
const FOLGA = 6;

/** Quantas linhas de escrever cada bloco tem, por tipo de domingo: o espaço que sobra num desenho vai para as linhas. */
const LINHAS = {
  normal: { anuncios: 4, desobrigacoes: 3, apoios: 4, criancas: 0, confirmados: 2 },
  jejum: { anuncios: 4, desobrigacoes: 3, apoios: 4, criancas: 3, confirmados: 3 },
};

/**
 * A faixa dos testemunhos, numa linha só: num domingo de jejum os nomes de quem prestou testemunho
 * vão no VERSO, e aqui basta dizer isso (sem gastar a folha com um aviso).
 */
function faixaDeTestemunhos(p, y) {
  const altura = 24;
  p.caixa(X, y, L, altura, { preenchimento: COR.ouroPalido, raio: 4, opacidade: 0.55 });
  p.caixa(X, y, 3.2, altura, { preenchimento: COR.ouro, raio: 1.4 });
  p.texto("TESTEMUNHOS", X + 14, y + 5.4, 170, { fonte: FONTE.serifaSemi, tamanho: 11.5, cor: COR.petroleo900, espacamento: 2.2 });
  p.texto("Anote os nomes no verso desta folha.", X + 14, y + 7.4, L - 28, { fonte: FONTE.sansItalico, tamanho: 8.4, cor: COR.suave, alinhar: "right" });
  return altura;
}

function blocoDeAnuncios(p, y, linhas) {
  const altura = 17 + linhas * PASSO + 3;
  p.caixa(X, y, L, altura, { preenchimento: COR.zebra, raio: 4 });
  p.rotulo("Anúncios", X + 8, y + 5);
  for (let i = 0; i < linhas; i++) p.escrita(X + 8, y + 17 + (i + 1) * PASSO, L - 16);
  return altura;
}

function orador(p, y, ordem) {
  const w = L;
  campo(p, X, y, w - 112 - VAO, `${ordem}º discursante`);
  campo(p, X + w - 112, y, 112, "Tempo previsto");
  campo(p, X, y + ALTURA_DA_FILEIRA, w, "Tema");
  return 2 * ALTURA_DA_FILEIRA;
}

export function desenharFrente(p, ctx) {
  p.novaPagina();
  const { unidade, domingo } = ctx;
  const jejum = domingo.tipo === "testemunhos";
  const n = jejum ? LINHAS.jejum : LINHAS.normal;
  let y = cabecalho(p, ctx);

  y += par(p, y, "Horário de início", "Nº de presentes");
  y += par(p, y, "Presidida", "Dirigida");
  y += par(p, y, "Regente", "Pianista / Organista");
  y += inteiro(p, y, "Reconhecimentos");
  y += linhaLivre(p, y) + FOLGA;

  y += blocoDeAnuncios(p, y, n.anuncios) + FOLGA + 2;

  y += par(p, y, "1º Hino", "1ª Oração") + FOLGA;

  y += tabelaDePares(p, y, { esquerda: "Desobrigações", direita: "Desobrigado(a) de", linhas: n.desobrigacoes }) + FOLGA;
  y += tabelaDePares(p, y, { esquerda: "Apoios e reconhecimentos", direita: "Apoiado(a) ou reconhecido(a) como", linhas: n.apoios }) + FOLGA;
  if (n.criancas) y += tabelaDePares(p, y, { esquerda: "Crianças abençoadas", direita: "Abençoado(a) por", linhas: n.criancas }) + FOLGA;
  y += tabelaDePares(p, y, { esquerda: "Membro confirmado(a)", direita: "Confirmado(a) por", linhas: n.confirmados }) + FOLGA + 2;

  y += inteiro(p, y, "Hino sacramental") + FOLGA + 2;

  if (jejum) {
    y += faixaDeTestemunhos(p, y) + FOLGA + 2;
  } else {
    y += orador(p, y, 1) + 2;
    y += orador(p, y, 2) + 2;
    y += inteiro(p, y, "Hino intermediário") + 2;
    y += orador(p, y, 3) + FOLGA;
  }

  y += par(p, y, "Último hino", "Última oração") + FOLGA;
  y += assinaturas(p, y, unidade);

  if (y > FIM_DO_CORPO) throw new Error(`A frente da ata de ${domingo.iso} passou do fim da página (${y.toFixed(1)} > ${FIM_DO_CORPO.toFixed(1)})`);
  rodape(p, { ...ctx, face: "frente" });
  return y;
}
