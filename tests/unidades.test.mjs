import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAVE_DAS_UNIDADES,
  LIMITE_DE_UNIDADES_CADASTRADAS,
  MENSAGEM_DO_ERRO,
  TAMANHO_MAXIMO_DO_NOME,
  TIPOS_DE_UNIDADE,
  chaveDaUnidade,
  guardarUnidadesCadastradas,
  interpretarUnidade,
  lerUnidadesCadastradas,
  linhasParaConfig,
  montarUnidade,
  todasAsUnidades,
} from "../js/unidades.js";
import { CONFIG } from "../js/config.js";

/**
 * Cadastrar unidades novas: o nome vira "Ala …" ou "Ramo …", repetida não entra, e o que vem do
 * armazenamento do navegador nunca é tomado como certo.
 */

const OFICIAIS = [
  { nome: "Ala Pacajus 1", tipo: "ala" },
  { nome: "Ramo Baturité", tipo: "ramo" },
];

function armazem(inicial) {
  const dados = new Map(inicial === undefined ? [] : [[CHAVE_DAS_UNIDADES, inicial]]);
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k), dados };
}

const ok = (entrada, contexto = {}) => {
  const r = interpretarUnidade(entrada, contexto);
  assert.equal(r.ok, true, `${JSON.stringify(entrada)} → ${r.erro}`);
  return r.unidade;
};
const erro = (entrada, contexto = {}) => {
  const r = interpretarUnidade(entrada, contexto);
  assert.equal(r.ok, false, `${JSON.stringify(entrada)} devia ser recusada`);
  return r.erro;
};

test("só o nome do lugar ganha o prefixo do tipo escolhido", () => {
  assert.deepEqual(ok({ nome: "Cascavel", tipo: "ala" }), { nome: "Ala Cascavel", tipo: "ala" });
  assert.deepEqual(ok({ nome: "Cascavel", tipo: "ramo" }), { nome: "Ramo Cascavel", tipo: "ramo" });
  assert.deepEqual(ok({ nome: "Pacajus 3" }), { nome: "Ala Pacajus 3", tipo: "ala" }, "sem tipo, é ala");
});

test("o nome que já começa com Ala ou Ramo decide o tipo, mesmo contra o que se marcou", () => {
  assert.deepEqual(ok({ nome: "Ramo Cascavel", tipo: "ala" }), { nome: "Ramo Cascavel", tipo: "ramo" });
  assert.deepEqual(ok({ nome: "ala cascavel", tipo: "ramo" }), { nome: "Ala Cascavel", tipo: "ala" });
  assert.deepEqual(ok({ nome: "RAMO   Cascavel", tipo: "ala" }), { nome: "Ramo Cascavel", tipo: "ramo" });
});

test("o tipo Grupo: o nome do lugar ganha 'Grupo', e escrever 'Grupo' no começo define o tipo", () => {
  assert.deepEqual(ok({ nome: "Beberibe", tipo: "grupo" }), { nome: "Grupo Beberibe", tipo: "grupo" });
  assert.deepEqual(ok({ nome: "grupo beberibe", tipo: "ala" }), { nome: "Grupo Beberibe", tipo: "grupo" }, "o nome decide, mesmo contra o que se marcou");
  assert.deepEqual(ok({ nome: "Ala Beberibe", tipo: "grupo" }), { nome: "Ala Beberibe", tipo: "ala" });
  assert.deepEqual(ok({ nome: "Grupos Unidos", tipo: "ala" }), { nome: "Ala Grupos Unidos", tipo: "ala" }, "'Grupos' não é o prefixo: só a palavra inteira conta");
  assert.deepEqual(Object.keys(TIPOS_DE_UNIDADE), ["ala", "ramo", "grupo"]);
});

test("um tipo desconhecido (ou um nome de propriedade do JavaScript) cai em ala, nunca vira outro tipo", () => {
  for (const tipo of ["diretoria", "constructor", "__proto__", "toString", "", undefined, null, 7]) {
    assert.deepEqual(ok({ nome: "Cascavel", tipo }), { nome: "Ala Cascavel", tipo: "ala" }, String(tipo));
  }
});

test("Ala X, Ramo X e Grupo X são três unidades diferentes", () => {
  const existentes = [{ nome: "Ala Beberibe", tipo: "ala" }, { nome: "Ramo Beberibe", tipo: "ramo" }];
  assert.deepEqual(ok({ nome: "Beberibe", tipo: "grupo" }, { existentes }), { nome: "Grupo Beberibe", tipo: "grupo" });
  assert.equal(erro({ nome: "ramo beberibe", tipo: "ala" }, { existentes }), "duplicada");
});

test("'Alameda' e 'Ramos' não são o prefixo: só a palavra inteira conta", () => {
  assert.deepEqual(ok({ nome: "Alameda Norte", tipo: "ala" }), { nome: "Ala Alameda Norte", tipo: "ala" });
  assert.deepEqual(ok({ nome: "Ramos Novos", tipo: "ala" }), { nome: "Ala Ramos Novos", tipo: "ala" });
});

test("as iniciais ficam maiúsculas, menos 'de', 'da', 'do'…; o que a pessoa já escreveu em maiúscula não se mexe", () => {
  assert.equal(ok({ nome: "são josé do vale", tipo: "ala" }).nome, "Ala São José do Vale");
  assert.equal(ok({ nome: "ala de são josé", tipo: "ala" }).nome, "Ala de São José");
  assert.equal(ok({ nome: "Pacajus 1º Barrio", tipo: "ala" }).nome, "Ala Pacajus 1º Barrio");
  assert.equal(ok({ nome: "McDonald Park", tipo: "ala" }).nome, "Ala McDonald Park");
  assert.equal(ok({ nome: "CE 10", tipo: "ala" }).nome, "Ala CE 10", "sigla em maiúscula continua sigla");
});

test("espaços e quebras de linha viram um espaço só", () => {
  assert.equal(ok({ nome: "  Ala \n  Santa\t Rita  ", tipo: "ala" }).nome, "Ala Santa Rita");
});

test("recusa o vazio, o curto, o comprido e o que tem caractere estranho", () => {
  assert.equal(erro({ nome: "", tipo: "ala" }), "vazio");
  assert.equal(erro({ nome: "   ", tipo: "ala" }), "vazio");
  assert.equal(erro({ nome: undefined }), "vazio");
  assert.equal(erro({ nome: "Ala", tipo: "ala" }), "curto", "só o prefixo não é nome de unidade");
  assert.equal(erro({ nome: "Ala A", tipo: "ala" }), "curto");
  assert.equal(erro({ nome: "x".repeat(TAMANHO_MAXIMO_DO_NOME), tipo: "ala" }), "longo", "o prefixo entra na conta");
  for (const ruim of ['Cascavel "Norte"', "Cascavel<br>", "<img src=x onerror=1>", "Cascavel; DROP", "Cascavel‮oir", "Casca​vel", "Cascavel \u{1F600}", "Касцавел", "Casca`vel", "Cascavel {1}"]) {
    assert.equal(erro({ nome: ruim, tipo: "ala" }), "caracteres", JSON.stringify(ruim));
  }
});

test("aceita a pontuação de nome de lugar: hífen, ponto, apóstrofo, parênteses, barra, º e ª", () => {
  for (const bom of ["Santa Rita-Sul", "S. José", "D'Ávila", "Centro (Norte)", "Vila 1/2", "Pacajus 1º", "Fortaleza 2ª"]) {
    assert.equal(interpretarUnidade({ nome: bom, tipo: "ala" }).ok, true, bom);
  }
});

test("a mesma unidade com outro jeito de escrever é duplicada: acento, caixa e pontuação não distinguem", () => {
  const existentes = [...OFICIAIS, { nome: "Ala São José", tipo: "ala" }];
  assert.equal(erro({ nome: "Pacajus 1", tipo: "ala" }, { existentes }), "duplicada");
  assert.equal(erro({ nome: "ala pacajus 1", tipo: "ala" }, { existentes }), "duplicada");
  assert.equal(erro({ nome: "Ramo Baturite", tipo: "ramo" }, { existentes }), "duplicada", "sem o acento");
  assert.equal(erro({ nome: "sao jose", tipo: "ala" }, { existentes }), "duplicada");
  assert.equal(interpretarUnidade({ nome: "S.ão-José", tipo: "ala" }, { existentes }).ok, true, "pontuação separa palavras: 'S.ão' não é 'São', então não é duplicata");
});

test("Ala X e Ramo X são unidades diferentes", () => {
  assert.deepEqual(ok({ nome: "Baturité", tipo: "ala" }, { existentes: OFICIAIS }), { nome: "Ala Baturité", tipo: "ala" });
});

test("o limite de unidades cadastradas protege o armazenamento", () => {
  assert.equal(erro({ nome: "Cascavel", tipo: "ala" }, { cadastradas: LIMITE_DE_UNIDADES_CADASTRADAS }), "limite");
  assert.equal(interpretarUnidade({ nome: "Cascavel", tipo: "ala" }, { cadastradas: LIMITE_DE_UNIDADES_CADASTRADAS - 1 }).ok, true);
});

test("toda mensagem de erro existe e está em português", () => {
  for (const codigo of ["vazio", "curto", "longo", "caracteres", "duplicada", "limite"]) {
    assert.equal(typeof MENSAGEM_DO_ERRO[codigo], "string", codigo);
    assert.ok(MENSAGEM_DO_ERRO[codigo].length > 10, codigo);
  }
});

test("a prévia 'será cadastrada como' funciona mesmo com nome ainda inválido", () => {
  assert.equal(montarUnidade({ nome: "casca", tipo: "ramo" }).nome, "Ramo Casca");
  assert.equal(montarUnidade({ nome: "", tipo: "ala" }), null);
  assert.equal(montarUnidade({ nome: "Ala" }).nome, "Ala");
});

test("guardar e ler: ida e volta, na ordem", () => {
  const a = armazem();
  const lista = [{ nome: "Ala Cascavel", tipo: "ala" }, { nome: "Ramo Beberibe", tipo: "ramo" }, { nome: "Grupo Horizonte Norte", tipo: "grupo" }];
  assert.equal(guardarUnidadesCadastradas(a, lista), true);
  assert.deepEqual(lerUnidadesCadastradas(a, OFICIAIS), lista);
});

test("o armazenamento não é de confiança: lixo, repetidas, fora das regras e já oficiais são descartadas", () => {
  const sujo = JSON.stringify([
    { nome: "Grupo Beberibe", tipo: "ala" }, // o nome decide o tipo
    { nome: "Ala Cascavel", tipo: "ala" },
    { nome: "ala cascavel", tipo: "ala" }, // repetida
    { nome: "Ala Pacajus 1", tipo: "ala" }, // já é oficial
    { nome: "<script>alert(1)</script>", tipo: "ala" }, // caracteres
    { nome: "", tipo: "ala" },
    { nome: 42 },
    null,
    "texto solto",
    { nome: "Ramo Beberibe", tipo: "ala" }, // o nome decide o tipo
  ]);
  assert.deepEqual(lerUnidadesCadastradas(armazem(sujo), OFICIAIS), [
    { nome: "Grupo Beberibe", tipo: "grupo" },
    { nome: "Ala Cascavel", tipo: "ala" },
    { nome: "Ramo Beberibe", tipo: "ramo" },
  ]);
});

test("armazenamento vazio, com JSON quebrado ou com outro formato dá lista vazia, sem erro", () => {
  assert.deepEqual(lerUnidadesCadastradas(armazem(), OFICIAIS), []);
  assert.deepEqual(lerUnidadesCadastradas(armazem("{isso não é json"), OFICIAIS), []);
  assert.deepEqual(lerUnidadesCadastradas(armazem('{"nome":"Ala X"}'), OFICIAIS), []);
  const quebrado = { getItem() { throw new Error("recusado"); } };
  assert.deepEqual(lerUnidadesCadastradas(quebrado, OFICIAIS), []);
});

test("uma lista gigante no armazenamento é cortada no limite", () => {
  const muitas = Array.from({ length: 200 }, (_, i) => ({ nome: `Ala Lugar ${i + 1}`, tipo: "ala" }));
  const lidas = lerUnidadesCadastradas(armazem(JSON.stringify(muitas)), []);
  assert.equal(lidas.length, LIMITE_DE_UNIDADES_CADASTRADAS);
});

test("guardar num armazenamento que recusa devolve falso, sem derrubar a tela", () => {
  const recusa = { setItem() { throw new Error("cota"); } };
  assert.equal(guardarUnidadesCadastradas(recusa, [{ nome: "Ala X1", tipo: "ala" }]), false);
});

test("quando a unidade passa para a configuração oficial, a cópia local some sozinha", () => {
  const a = armazem();
  guardarUnidadesCadastradas(a, [{ nome: "Ala Cascavel", tipo: "ala" }]);
  assert.equal(lerUnidadesCadastradas(a, OFICIAIS).length, 1);
  const depois = [...OFICIAIS, { nome: "Ala Cascavel", tipo: "ala" }];
  assert.deepEqual(lerUnidadesCadastradas(a, depois), []);
});

test("a lista para escolher traz as oficiais na ordem e depois as cadastradas, marcando a origem", () => {
  const lista = todasAsUnidades(OFICIAIS, [{ nome: "Ala Cascavel", tipo: "ala" }]);
  assert.deepEqual(lista.map((u) => [u.nome, u.origem]), [["Ala Pacajus 1", "oficial"], ["Ramo Baturité", "oficial"], ["Ala Cascavel", "cadastrada"]]);
});

test("as linhas para o config.js são JavaScript bem formado, qualquer que seja o nome", () => {
  const unidades = [{ nome: "Ala Cascavel", tipo: "ala" }, { nome: 'Ala Dona "Zeca"\\', tipo: "ala" }];
  const texto = linhasParaConfig(unidades);
  const avaliado = new Function(`return [${texto}];`)();
  assert.deepEqual(avaliado, unidades, "o que se cola é lido de volta idêntico, inclusive com aspas e barra");
  assert.equal(texto.split("\n").length, 2);
  assert.match(texto.split("\n")[0], /^ {4}\{ nome: "Ala Cascavel", tipo: "ala" \},$/);
});

test("as unidades oficiais da configuração passam nas MESMAS regras do cadastro", () => {
  for (const u of CONFIG.unidades) {
    assert.ok(Object.hasOwn(TIPOS_DE_UNIDADE, u.tipo), `${u.nome}: tipo ${u.tipo}`);
    const r = interpretarUnidade({ nome: u.nome, tipo: u.tipo });
    assert.equal(r.ok, true, `${u.nome}: ${r.erro}`);
    assert.equal(r.unidade.nome, u.nome, `${u.nome} já está na forma que o cadastro daria`);
    assert.equal(r.unidade.tipo, u.tipo);
  }
});

test("a chave ignora acento, caixa e pontuação", () => {
  assert.equal(chaveDaUnidade("Ala  São-José"), "ala sao jose");
  assert.equal(chaveDaUnidade("ALA SAO JOSE"), "ala sao jose");
  assert.equal(chaveDaUnidade(null), "");
});
