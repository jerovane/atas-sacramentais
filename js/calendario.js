/**
 * O calendário das atas: dado um ano, quais domingos pedem ata e de que tipo.
 *
 * ## As regras (tiradas das atas reais de 2024 da estaca — ver tests/calendario.test.mjs — e
 * conferidas com o Manual Geral, 29.2.2 e 38.8.17)
 *
 * 1. Toda ata é de um DOMINGO. Um ano tem 52 ou 53.
 * 2. O primeiro domingo do mês é de JEJUM E TESTEMUNHOS: a página não tem oradores, só
 *    testemunhos (e as crianças abençoadas), e o verso ganha o espaço para anotar quem
 *    prestou testemunho.
 * 3. Domingo de CONFERÊNCIA — a Geral (abril e outubro) e a de estaca — NÃO tem reunião
 *    sacramental na unidade, então não tem ata. Em 2024 foram quatro domingos sem ata:
 *    07/04, 02/06, 06/10 e 10/11.
 * 4. Se o primeiro domingo cai em conferência, o jejum e testemunho PASSA PARA O DOMINGO
 *    SEGUINTE (2024: 14/04, 09/06 e 13/10). Por isso a regra é "o primeiro domingo do mês
 *    que tem reunião", e não "o dia 1 a 7". O Manual Geral (38.8.17) diz que, nesse caso, a
 *    PRESIDÊNCIA DA ESTAQUE determina o domingo alternativo: o motor segue o costume da
 *    estaca (o seguinte), e quem usa pode trocar na lista se a presidência definiu outro.
 *
 * ## Datas da Conferência Geral
 *
 * Não há fórmula confiável (em 2023 a de outubro foi no 2º domingo, e a de abril de 2018 no
 * dia 1º). Por isso as datas OFICIAIS ficam numa tabela (`CONFERENCIA_GERAL`) e, para um ano
 * que ainda não está nela, o motor ESTIMA pelo costume — o domingo seguinte ao primeiro
 * sábado do mês — e marca o resultado como `estimado`, para a tela avisar. A conferência de
 * ESTAQUE não é calculável: quem usa a marca na lista (`ajustes`).
 *
 * ## O que este módulo não faz
 *
 * Não lê o relógio, não toca na tela e não conhece o PDF: recebe o ano, devolve dados.
 * As datas são sempre (ano, mês, dia) puros, em UTC, para que o fuso do computador de quem
 * usa nunca empurre um domingo para o sábado.
 */

export const TIPO = Object.freeze({
  NORMAL: "normal",
  TESTEMUNHOS: "testemunhos",
  SEM_REUNIAO: "sem-reuniao",
});

export const MOTIVO = Object.freeze({
  CONFERENCIA_GERAL: "conferencia-geral",
  AJUSTE: "ajuste",
});

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/**
 * Datas OFICIAIS da Conferência Geral (o DOMINGO), em ISO.
 * 2023 a 2026 são as já realizadas (2024 conferida nas atas da estaca); 2027 vem do calendário
 * oficial da Igreja (Church Newsroom: conferência em 3 e 4 de abril e em 2 e 3 de outubro de 2027).
 * Fora desta tabela o motor estima (`estimado: true`) — acrescente o ano novo quando a Igreja o divulgar.
 */
export const CONFERENCIA_GERAL = Object.freeze({
  2023: ["2023-04-02", "2023-10-08"],
  2024: ["2024-04-07", "2024-10-06"],
  2025: ["2025-04-06", "2025-10-05"],
  2026: ["2026-04-05", "2026-10-04"],
  2027: ["2027-04-04", "2027-10-03"],
});

const DIA_MS = 86_400_000;

const utc = (ano, mes, dia) => new Date(Date.UTC(ano, mes - 1, dia));

/** "2027-01-03" a partir de uma data UTC. */
export function paraIso(data) {
  return data.toISOString().slice(0, 10);
}

/** Lê "AAAA-MM-DD" como data UTC; devolve null se não for uma data de verdade (30/02 não existe). */
export function lerIso(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? ""));
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = utc(ano, mes, dia);
  return paraIso(d) === texto ? d : null;
}

export function anoValido(ano) {
  return Number.isInteger(ano) && ano >= 2000 && ano <= 2099;
}

/** Todos os domingos do ano, em ordem: [{ iso, ano, mes, dia }]. */
export function domingosDoAno(ano) {
  if (!anoValido(ano)) throw new RangeError(`Ano inválido: ${ano}`);
  const dom = [];
  let d = utc(ano, 1, 1);
  d = new Date(d.getTime() + ((7 - d.getUTCDay()) % 7) * DIA_MS);
  while (d.getUTCFullYear() === ano) {
    dom.push({ iso: paraIso(d), ano, mes: d.getUTCMonth() + 1, dia: d.getUTCDate() });
    d = new Date(d.getTime() + 7 * DIA_MS);
  }
  return dom;
}

/**
 * O costume: o domingo seguinte ao primeiro sábado do mês. Reproduz todas as datas da tabela
 * oficial de 2023 a 2027; falha em exceções como abril de 2018 (conferência na Páscoa, dia 1º) —
 * por isso a tabela manda e a estimativa só cobre o que ainda não foi divulgado.
 */
export function estimarConferenciaGeral(ano, mes) {
  const primeiro = utc(ano, mes, 1);
  const sabado = new Date(primeiro.getTime() + ((6 - primeiro.getUTCDay() + 7) % 7) * DIA_MS);
  return paraIso(new Date(sabado.getTime() + DIA_MS));
}

/**
 * Os domingos de Conferência Geral do ano: { datas: [iso, iso], estimado }.
 * `estimado` é verdadeiro quando o ano não está na tabela oficial.
 */
export function conferenciaGeralDoAno(ano) {
  if (!anoValido(ano)) throw new RangeError(`Ano inválido: ${ano}`);
  const oficial = CONFERENCIA_GERAL[ano];
  if (oficial) return { datas: [...oficial], estimado: false };
  return { datas: [estimarConferenciaGeral(ano, 4), estimarConferenciaGeral(ano, 10)], estimado: true };
}

const TIPOS_VALIDOS = new Set(Object.values(TIPO));

/**
 * Planeja o ano: um registro por domingo.
 *
 * @param {number} ano
 * @param {{ ajustes?: Record<string, "normal"|"testemunhos"|"sem-reuniao"> }} [opcoes]
 *   `ajustes` é o que a pessoa decidiu na lista, por data ISO — a conferência de estaque entra
 *   aqui como "sem-reuniao". Ajuste para uma data que não é domingo do ano é ignorado.
 * @returns {{
 *   ano: number,
 *   domingos: Array<{ iso: string, ano: number, mes: number, dia: number,
 *     tipo: string, motivo: string|null, remarcado: boolean, ordem: number|null }>,
 *   resumo: { domingos: number, atas: number, testemunhos: number, normais: number, semReuniao: number },
 *   conferenciaGeral: { datas: string[], estimado: boolean },
 * }}
 *
 * Ordem das decisões — e é ela que faz o jejum "andar" para o domingo seguinte:
 *   1. quem não tem reunião (conferência geral + o que a pessoa marcou) sai do jogo;
 *   2. em cada mês, o primeiro domingo que sobrou é o de testemunhos;
 *   3. o que a pessoa forçou (normal/testemunhos) vale por último.
 */
export function planejarAno(ano, opcoes = {}) {
  const ajustes = opcoes.ajustes ?? {};
  const todos = domingosDoAno(ano);
  const doAno = new Set(todos.map((d) => d.iso));
  const geral = conferenciaGeralDoAno(ano);

  const semReuniao = new Map();
  for (const iso of geral.datas) if (doAno.has(iso)) semReuniao.set(iso, MOTIVO.CONFERENCIA_GERAL);

  const forcados = new Map();
  for (const [iso, tipo] of Object.entries(ajustes)) {
    if (!doAno.has(iso) || !TIPOS_VALIDOS.has(tipo)) continue;
    if (tipo === TIPO.SEM_REUNIAO) semReuniao.set(iso, MOTIVO.AJUSTE);
    else {
      // Forçar "com reunião" numa data que era conferência a devolve ao jogo.
      semReuniao.delete(iso);
      forcados.set(iso, tipo);
    }
  }

  // O primeiro domingo COM reunião de cada mês é o de jejum e testemunhos.
  const jejum = new Map();
  for (const d of todos) {
    if (!jejum.has(d.mes) && !semReuniao.has(d.iso)) jejum.set(d.mes, d.iso);
  }

  let ordem = 0;
  const domingos = todos.map((d) => {
    if (semReuniao.has(d.iso)) {
      return { ...d, tipo: TIPO.SEM_REUNIAO, motivo: semReuniao.get(d.iso), remarcado: false, ordem: null };
    }
    const automatico = jejum.get(d.mes) === d.iso ? TIPO.TESTEMUNHOS : TIPO.NORMAL;
    const tipo = forcados.get(d.iso) ?? automatico;
    // "Remarcado": é o domingo de testemunhos, mas não é o primeiro domingo do mês.
    const remarcado = tipo === TIPO.TESTEMUNHOS && d.dia > 7;
    ordem += 1;
    return { ...d, tipo, motivo: forcados.has(d.iso) ? MOTIVO.AJUSTE : null, remarcado, ordem };
  });

  const contar = (tipo) => domingos.filter((d) => d.tipo === tipo).length;
  return {
    ano,
    domingos,
    resumo: {
      domingos: domingos.length,
      atas: domingos.length - contar(TIPO.SEM_REUNIAO),
      testemunhos: contar(TIPO.TESTEMUNHOS),
      normais: contar(TIPO.NORMAL),
      semReuniao: contar(TIPO.SEM_REUNIAO),
    },
    conferenciaGeral: geral,
  };
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** "Domingo, 3 de janeiro de 2027". */
export function dataPorExtenso(iso) {
  const d = lerIso(iso);
  if (!d) throw new RangeError(`Data inválida: ${iso}`);
  const dia = DIAS[d.getUTCDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** "03 JAN 2027". */
export function dataCurta(iso) {
  const d = lerIso(iso);
  if (!d) throw new RangeError(`Data inválida: ${iso}`);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES_CURTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
