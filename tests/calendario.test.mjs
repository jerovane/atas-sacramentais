import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFERENCIA_GERAL,
  MOTIVO,
  TIPO,
  conferenciaGeralDoAno,
  dataCurta,
  dataPorExtenso,
  domingosDoAno,
  estimarConferenciaGeral,
  lerIso,
  planejarAno,
} from "../js/calendario.js";

/**
 * O calendário contra a prática REAL da estaca.
 *
 * O gabarito é o caderno de atas de 2024 que a estaca já usa (REUNIÃO SACRAMENTAL.docx): 52
 * domingos no ano, 48 com ata. Faltam 07/04 e 06/10 (Conferência Geral) e 02/06 e 10/11
 * (conferência de estaca). Os domingos de testemunhos são os 12 abaixo — e três deles
 * (14/04, 09/06 e 13/10) NÃO são o primeiro domingo do mês, porque o primeiro foi conferência.
 * Se uma regra do motor mudar, estes testes dizem se ela ainda é a que a estaca vive.
 */

const ATAS_DE_2024 = [
  "2024-01-07", "2024-01-14", "2024-01-21", "2024-01-28",
  "2024-02-04", "2024-02-11", "2024-02-18", "2024-02-25",
  "2024-03-03", "2024-03-10", "2024-03-17", "2024-03-24", "2024-03-31",
  "2024-04-14", "2024-04-21", "2024-04-28",
  "2024-05-05", "2024-05-12", "2024-05-19", "2024-05-26",
  "2024-06-09", "2024-06-16", "2024-06-23", "2024-06-30",
  "2024-07-07", "2024-07-14", "2024-07-21", "2024-07-28",
  "2024-08-04", "2024-08-11", "2024-08-18", "2024-08-25",
  "2024-09-01", "2024-09-08", "2024-09-15", "2024-09-22", "2024-09-29",
  "2024-10-13", "2024-10-20", "2024-10-27",
  "2024-11-03", "2024-11-17", "2024-11-24",
  "2024-12-01", "2024-12-08", "2024-12-15", "2024-12-22", "2024-12-29",
];

const TESTEMUNHOS_DE_2024 = [
  "2024-01-07", "2024-02-04", "2024-03-03", "2024-04-14", "2024-05-05", "2024-06-09",
  "2024-07-07", "2024-08-04", "2024-09-01", "2024-10-13", "2024-11-03", "2024-12-01",
];

const CONFERENCIA_DE_ESTACA_2024 = { "2024-06-02": TIPO.SEM_REUNIAO, "2024-11-10": TIPO.SEM_REUNIAO };

test("2024 sai igual ao caderno de atas da estaca: 48 atas nas datas certas", () => {
  const plano = planejarAno(2024, { ajustes: CONFERENCIA_DE_ESTACA_2024 });
  const comAta = plano.domingos.filter((d) => d.tipo !== TIPO.SEM_REUNIAO).map((d) => d.iso);
  assert.deepEqual(comAta, ATAS_DE_2024);
  assert.equal(plano.resumo.domingos, 52);
  assert.equal(plano.resumo.atas, 48);
  assert.equal(plano.resumo.semReuniao, 4);
});

test("os 12 domingos de testemunhos de 2024, inclusive os três que andaram para o domingo seguinte", () => {
  const plano = planejarAno(2024, { ajustes: CONFERENCIA_DE_ESTACA_2024 });
  const testemunhos = plano.domingos.filter((d) => d.tipo === TIPO.TESTEMUNHOS);
  assert.deepEqual(testemunhos.map((d) => d.iso), TESTEMUNHOS_DE_2024);
  assert.equal(plano.resumo.testemunhos, 12);
  assert.equal(plano.resumo.normais, 36);
  assert.deepEqual(
    testemunhos.filter((d) => d.remarcado).map((d) => d.iso),
    ["2024-04-14", "2024-06-09", "2024-10-13"],
    "só estes três foram remarcados; os outros nove são o primeiro domingo",
  );
});

test("domingo de conferência não tem ata e diz por quê", () => {
  const plano = planejarAno(2024, { ajustes: CONFERENCIA_DE_ESTACA_2024 });
  const sem = Object.fromEntries(plano.domingos.filter((d) => d.tipo === TIPO.SEM_REUNIAO).map((d) => [d.iso, d.motivo]));
  assert.deepEqual(sem, {
    "2024-04-07": MOTIVO.CONFERENCIA_GERAL,
    "2024-06-02": MOTIVO.AJUSTE,
    "2024-10-06": MOTIVO.CONFERENCIA_GERAL,
    "2024-11-10": MOTIVO.AJUSTE,
  });
});

test("a conferência de estaque é marcada à mão; sem a marca, o motor só conhece a Geral", () => {
  const plano = planejarAno(2024);
  assert.equal(plano.resumo.semReuniao, 2, "só 07/04 e 06/10");
  assert.equal(plano.resumo.atas, 50);
  assert.equal(plano.domingos.find((d) => d.iso === "2024-06-02").tipo, TIPO.TESTEMUNHOS, "sem a marca, 02/06 ainda é o primeiro domingo");
});

test("os números de ordem são 1..N só nos domingos com ata", () => {
  const plano = planejarAno(2024, { ajustes: CONFERENCIA_DE_ESTACA_2024 });
  const ordens = plano.domingos.map((d) => d.ordem);
  assert.deepEqual(ordens.filter((o) => o !== null), Array.from({ length: 48 }, (_, i) => i + 1));
  assert.equal(plano.domingos.find((d) => d.iso === "2024-04-07").ordem, null);
});

test("um ano tem 52 ou 53 domingos, todos domingos, em ordem e sem repetição", () => {
  for (let ano = 2020; ano <= 2035; ano++) {
    const dom = domingosDoAno(ano);
    assert.ok(dom.length === 52 || dom.length === 53, `${ano}: ${dom.length}`);
    for (const d of dom) assert.equal(lerIso(d.iso).getUTCDay(), 0, `${d.iso} não é domingo`);
    assert.deepEqual(dom.map((d) => d.iso), [...new Set(dom.map((d) => d.iso))].sort());
  }
  // 2026 começa numa quinta e tem 52; 2028 começa num sábado e é bissexto: 52; 2023 começa num domingo: 53.
  assert.equal(domingosDoAno(2023).length, 53);
  assert.equal(domingosDoAno(2027).length, 52);
});

test("todo mês tem exatamente UM domingo de testemunhos, em qualquer ano", () => {
  for (let ano = 2024; ano <= 2035; ano++) {
    const plano = planejarAno(ano);
    for (let mes = 1; mes <= 12; mes++) {
      const t = plano.domingos.filter((d) => d.mes === mes && d.tipo === TIPO.TESTEMUNHOS);
      assert.equal(t.length, 1, `${ano}-${mes}: ${t.length} domingos de testemunhos`);
    }
    assert.equal(plano.resumo.testemunhos, 12);
  }
});

test("o domingo de testemunhos é o primeiro domingo COM reunião do mês", () => {
  const plano = planejarAno(2026); // 05/04/2026 é Conferência Geral e é o primeiro domingo de abril
  const abril = plano.domingos.filter((d) => d.mes === 4);
  assert.equal(abril[0].tipo, TIPO.SEM_REUNIAO);
  assert.equal(abril[1].iso, "2026-04-12");
  assert.equal(abril[1].tipo, TIPO.TESTEMUNHOS);
  assert.equal(abril[1].remarcado, true);
});

test("as datas da Conferência Geral da tabela são domingos e as de 2024 batem com o que a estaca viveu", () => {
  for (const [ano, datas] of Object.entries(CONFERENCIA_GERAL)) {
    assert.equal(datas.length, 2);
    for (const iso of datas) {
      assert.equal(lerIso(iso).getUTCDay(), 0, `${iso} não é domingo`);
      assert.equal(lerIso(iso).getUTCFullYear(), Number(ano));
    }
    assert.equal(lerIso(datas[0]).getUTCMonth() + 1, 4);
    assert.equal(lerIso(datas[1]).getUTCMonth() + 1, 10);
  }
  assert.deepEqual(conferenciaGeralDoAno(2024), { datas: ["2024-04-07", "2024-10-06"], estimado: false });
});

test("ano fora da tabela oficial é ESTIMADO pelo costume, e o resultado avisa", () => {
  const g = conferenciaGeralDoAno(2030);
  assert.equal(g.estimado, true);
  assert.deepEqual(g.datas, ["2030-04-07", "2030-10-06"], "domingo seguinte ao primeiro sábado de abril e de outubro");
  assert.equal(planejarAno(2030).conferenciaGeral.estimado, true);
  assert.equal(planejarAno(2027).conferenciaGeral.estimado, false);
});

test("a estimativa pelo costume reproduz TODAS as datas oficiais da tabela, de 2023 a 2027", () => {
  for (const [ano, [abril, outubro]] of Object.entries(CONFERENCIA_GERAL)) {
    assert.equal(estimarConferenciaGeral(Number(ano), 4), abril, `abril de ${ano}`);
    assert.equal(estimarConferenciaGeral(Number(ano), 10), outubro, `outubro de ${ano}`);
  }
  // A exceção conhecida: abril de 2018 foi no dia 1º (Páscoa) e o costume dá 8 — é para isso que a tabela manda.
  assert.equal(estimarConferenciaGeral(2018, 4), "2018-04-08");
});

test("o que a pessoa decide na lista vale: tirar um domingo, forçar outro, devolver uma conferência", () => {
  const plano = planejarAno(2027, {
    ajustes: {
      "2027-12-26": TIPO.SEM_REUNIAO, // domingo do Natal, sem reunião
      "2027-01-10": TIPO.TESTEMUNHOS, // um segundo domingo de testemunhos forçado
      "2027-04-04": TIPO.NORMAL, // devolve a Conferência Geral ao jogo (a unidade teve reunião)
    },
  });
  const por = (iso) => plano.domingos.find((d) => d.iso === iso);
  assert.equal(por("2027-12-26").tipo, TIPO.SEM_REUNIAO);
  assert.equal(por("2027-01-10").tipo, TIPO.TESTEMUNHOS);
  assert.equal(por("2027-01-03").tipo, TIPO.TESTEMUNHOS, "o automático continua: forçar não tira o primeiro domingo");
  assert.equal(por("2027-04-04").tipo, TIPO.NORMAL);
  assert.equal(por("2027-04-04").motivo, MOTIVO.AJUSTE);
  assert.equal(por("2027-04-04").ordem !== null, true);
});

test("ajuste para data que não é domingo do ano, ou com tipo inventado, é ignorado", () => {
  const base = planejarAno(2027);
  const plano = planejarAno(2027, { ajustes: { "2027-01-04": TIPO.SEM_REUNIAO, "2026-01-04": TIPO.SEM_REUNIAO, "2027-01-03": "qualquer-coisa", lixo: TIPO.NORMAL } });
  assert.deepEqual(plano.domingos, base.domingos);
});

test("2027, o ano que se vai gerar primeiro: 52 domingos, 50 atas, 12 de testemunhos", () => {
  const plano = planejarAno(2027);
  assert.equal(plano.resumo.domingos, 52);
  assert.equal(plano.resumo.atas, 50);
  assert.equal(plano.resumo.testemunhos, 12);
  assert.equal(plano.resumo.normais, 38);
  assert.equal(plano.domingos[0].iso, "2027-01-03");
  assert.equal(plano.domingos[0].tipo, TIPO.TESTEMUNHOS);
  assert.equal(plano.domingos.at(-1).iso, "2027-12-26");
});

test("ano inválido é recusado com um erro claro", () => {
  for (const ruim of [1999, 2100, 2027.5, "2027", NaN, null]) {
    assert.throws(() => domingosDoAno(ruim), RangeError, String(ruim));
    assert.throws(() => planejarAno(ruim), RangeError, String(ruim));
  }
});

test("lerIso só aceita datas que existem", () => {
  assert.ok(lerIso("2024-02-29"));
  assert.equal(lerIso("2023-02-29"), null);
  assert.equal(lerIso("2027-13-01"), null);
  assert.equal(lerIso("27-01-03"), null);
  assert.equal(lerIso(undefined), null);
});

test("a data por extenso e a curta, em português", () => {
  assert.equal(dataPorExtenso("2027-01-03"), "Domingo, 3 de janeiro de 2027");
  assert.equal(dataPorExtenso("2024-03-31"), "Domingo, 31 de março de 2024");
  assert.equal(dataCurta("2027-01-03"), "03 JAN 2027");
  assert.equal(dataCurta("2027-12-26"), "26 DEZ 2027");
  assert.throws(() => dataPorExtenso("2027-02-30"), RangeError);
});

test("o fuso do computador não muda nenhum domingo", () => {
  const original = process.env.TZ;
  try {
    for (const tz of ["America/Fortaleza", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
      process.env.TZ = tz;
      assert.equal(domingosDoAno(2027)[0].iso, "2027-01-03", tz);
      assert.equal(dataPorExtenso("2027-01-03"), "Domingo, 3 de janeiro de 2027", tz);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
