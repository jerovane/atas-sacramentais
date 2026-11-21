import { COR, FONTE } from "../tema.js";
import { MESES, MOTIVO, TIPO } from "../../calendario.js";
import { FIM_DO_CORPO, L, VAO, X, faixaDoTopo, rodapeGeral } from "./ata-comum.js";

/**
 * O calendário do ano: os domingos, mês a mês, com a marca de cada um — jejum e testemunhos,
 * reunião com oradores ou sem reunião (conferência) — e o número da ata de cada um.
 *
 * Serve a quem monta o caderno e a quem procura uma folha: o número embaixo de cada domingo é o
 * mesmo que está no selo do cabeçalho da ata.
 */

const COLUNAS = 3;
const LINHAS = 4;
const ALTURA_DO_CARTAO = 102;
const FOLGA_ENTRE_CARTOES = 10;

function marcaDoDomingo(p, cx, cy, domingo) {
  const raio = 11;
  const numero = String(domingo.dia);
  const estiloDoDia = { fonte: FONTE.sansNegrito, tamanho: 10, alinhar: "center" };
  if (domingo.tipo === TIPO.TESTEMUNHOS) {
    p.circulo(cx, cy, raio, { preenchimento: COR.ouro });
    p.texto(numero, cx - 14, cy - 5.8, 28, { ...estiloDoDia, cor: COR.petroleo950 });
  } else if (domingo.tipo === TIPO.NORMAL) {
    p.circulo(cx, cy, raio, { preenchimento: COR.branco, borda: COR.petroleo700, espessura: 1 });
    p.texto(numero, cx - 14, cy - 5.8, 28, { ...estiloDoDia, cor: COR.petroleo800 });
  } else {
    p.circulo(cx, cy, raio, { borda: COR.quieto, espessura: 0.8, tracejado: [2, 1.6] });
    p.texto(numero, cx - 14, cy - 5.8, 28, { ...estiloDoDia, fonte: FONTE.sans, cor: COR.quieto });
  }
  // O número da ata é a informação que esta página existe para dar: corpo de 8 pt e cor escura.
  const legenda = domingo.ordem === null ? "—" : `nº ${domingo.ordem}`;
  p.texto(legenda, cx - 14.5, cy + raio + 3.6, 29, { fonte: FONTE.sansSemi, tamanho: 8, cor: COR.suave, alinhar: "center" });
}

/** As observações do mês: conferência e jejum remarcado, em poucas palavras. */
function notasDoMes(domingos) {
  const notas = [];
  for (const d of domingos) {
    if (d.tipo === TIPO.SEM_REUNIAO) {
      notas.push(d.motivo === MOTIVO.CONFERENCIA_GERAL ? `Conferência Geral: dia ${d.dia}.` : `Sem reunião: dia ${d.dia}.`);
    } else if (d.remarcado) {
      notas.push(`Jejum remarcado: dia ${d.dia}.`);
    }
  }
  return notas;
}

function cartaoDoMes(p, x, y, w, mes, domingos) {
  p.caixa(x, y, w, ALTURA_DO_CARTAO, { preenchimento: COR.zebra, raio: 6 });
  p.texto(MESES[mes - 1][0].toUpperCase() + MESES[mes - 1].slice(1), x + 11, y + 9, w - 22, { fonte: FONTE.serifaSemi, tamanho: 12, cor: COR.petroleo900 });
  p.caixa(x + 11, y + 26.5, 22, 1.4, { preenchimento: COR.ouro });

  const quantos = 5;
  const celula = (w - 20) / quantos;
  domingos.forEach((d, i) => marcaDoDomingo(p, x + 10 + celula * i + celula / 2, y + 47, d));

  const notas = notasDoMes(domingos);
  notas.forEach((n, i) => p.texto(n, x + 11, y + 77 + i * 10.5, w - 20, { fonte: FONTE.sansItalico, tamanho: 7.6, cor: COR.suave }));
}

function legenda(p, y) {
  const itens = [
    { rotulo: "Jejum e testemunhos", amostra: (cx, cy) => p.circulo(cx, cy, 6.2, { preenchimento: COR.ouro }) },
    { rotulo: "Reunião com oradores", amostra: (cx, cy) => p.circulo(cx, cy, 6.2, { preenchimento: COR.branco, borda: COR.petroleo700, espessura: 1 }) },
    { rotulo: "Sem reunião (conferência)", amostra: (cx, cy) => p.circulo(cx, cy, 6.2, { borda: COR.quieto, espessura: 0.8, tracejado: [1.6, 1.3] }) },
  ];
  let x = X;
  const estilo = { fonte: FONTE.sans, tamanho: 8.4, cor: COR.suave };
  for (const item of itens) {
    item.amostra(x + 6.5, y + 6);
    p.texto(item.rotulo, x + 18, y + 2, 150, estilo);
    x += 18 + p.largura(item.rotulo, estilo) + 26;
  }
}

export function desenharCalendario(p, ctx) {
  p.novaPagina();
  const { unidade, estaca, ano, plano } = ctx;
  let y = faixaDoTopo(p, { unidade, estaca, titulo: "CALENDÁRIO DAS ATAS" }) + 14;

  p.texto(`Os domingos de ${ano}`, X, y, L, { fonte: FONTE.serifaSemi, tamanho: 24, cor: COR.petroleo900 });
  // O filete dourado das outras páginas de texto, e ar para a descida das letras (o "g") não tocar nos cartões.
  p.caixa(X, y + 33, 30, 1.8, { preenchimento: COR.ouro });
  y += 44;
  const r = plano.resumo;
  const numeros = [
    [r.atas, "atas neste caderno"],
    [r.testemunhos, "de jejum e testemunhos"],
    [r.normais, "com oradores"],
    [r.semReuniao, r.semReuniao === 1 ? "domingo sem reunião" : "domingos sem reunião"],
  ];
  const larguraDoNumero = (L - 3 * 10) / 4;
  numeros.forEach(([n, rotulo], i) => {
    const x = X + i * (larguraDoNumero + 10);
    p.caixa(x, y, larguraDoNumero, 46, { preenchimento: i === 1 ? COR.ouroPalido : COR.painel, raio: 6, opacidade: i === 1 ? 0.6 : 1 });
    p.texto(String(n), x + 12, y + 6, 46, { fonte: FONTE.serifaSemi, tamanho: 25, cor: COR.petroleo900 });
    const estiloDoRotulo = { fonte: FONTE.sansNegrito, tamanho: 6.3, espacamento: 0.8, entrelinha: 1.2 };
    const alturaDoRotulo = p.altura(rotulo.toUpperCase(), larguraDoNumero - 58, estiloDoRotulo);
    p.texto(rotulo.toUpperCase(), x + 52, y + (46 - alturaDoRotulo) / 2, larguraDoNumero - 58, { ...estiloDoRotulo, cor: COR.ouroEscuro });
  });
  y += 46 + 14;

  const largura = (L - VAO * (COLUNAS - 1)) / COLUNAS;
  for (let m = 1; m <= 12; m++) {
    const coluna = (m - 1) % COLUNAS;
    const linha = Math.floor((m - 1) / COLUNAS);
    const domingos = plano.domingos.filter((d) => d.mes === m);
    cartaoDoMes(p, X + coluna * (largura + VAO), y + linha * (ALTURA_DO_CARTAO + FOLGA_ENTRE_CARTOES), largura, m, domingos);
  }
  y += LINHAS * (ALTURA_DO_CARTAO + FOLGA_ENTRE_CARTOES) + 4;

  legenda(p, y);
  y += 24;

  const avisos = [];
  if (plano.conferenciaGeral.estimado) {
    avisos.push(`As datas da Conferência Geral de ${ano} ainda não constam da tabela oficial deste motor: foram estimadas. Confira e ajuste na tela, se for o caso.`);
  }
  if (plano.domingos.some((d) => d.remarcado)) {
    avisos.push("Jejum remarcado: quando o primeiro domingo do mês tem conferência, o jejum e testemunhos vai para o domingo seguinte, como a estaca costuma fazer. O Manual Geral (38.8.17) diz que a presidência da estaca define esse domingo.");
  }
  avisos.push("O número embaixo de cada domingo é o da ata: está no selo do cabeçalho e no rodapé de cada folha.");
  for (const aviso of avisos) {
    y += p.texto(aviso, X, y, L, { fonte: FONTE.sansItalico, tamanho: 8.2, cor: COR.suave, entrelinha: 1.5, semViuva: true }) + 4;
  }

  y += 6;
  p.rotulo("Anotações do ano", X, y);
  y += 12;
  const linhasDeAnotacao = Math.floor((FIM_DO_CORPO - y - 14) / 19);
  for (let i = 1; i <= linhasDeAnotacao; i++) p.escrita(X, y + i * 19, L);
  y += linhasDeAnotacao * 19;

  if (y > FIM_DO_CORPO) throw new Error(`O calendário passou do fim da página (${y.toFixed(1)} > ${FIM_DO_CORPO.toFixed(1)})`);
  rodapeGeral(p, { unidade, estaca, ano, rotulo: "Calendário das atas" });
}
