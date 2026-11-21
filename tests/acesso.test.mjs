import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  codificarEndereco,
  conferir,
  criarCredencial,
  decodificarEndereco,
  derivar,
  encerrarSessao,
  enderecoMascarado,
  iniciarSessao,
  linkDeRecuperacao,
  sessaoValida,
} from "../js/acesso.js";
import { CONFIG } from "../js/config.js";
import { TIPOS_DE_UNIDADE } from "../js/unidades.js";

/**
 * O acesso: login pelo número da estaca e senha guardada só como hash.
 *
 * Estes testes usam voltas de menos (1000) para rodar rápido: o que importa aqui é a lógica. A
 * configuração REAL (600 mil voltas) é conferida em estrutura e contra palpites comuns, nunca
 * contra a senha verdadeira — que não está em arquivo nenhum do projeto.
 */

const VOLTAS = 1000;

function armazem() {
  const dados = new Map();
  return {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
  };
}

test("o mesmo sal e a mesma senha dão o mesmo hash; outro sal, outro hash", async () => {
  const a = await criarCredencial("uma senha", { iteracoes: VOLTAS });
  assert.equal(await derivar("uma senha", a.sal, VOLTAS), a.hash);
  const b = await criarCredencial("uma senha", { iteracoes: VOLTAS });
  assert.notEqual(a.sal, b.sal, "cada credencial tem sal próprio");
  assert.notEqual(a.hash, b.hash, "sal diferente muda o hash mesmo com a mesma senha");
});

test("entra com login e senha certos; recusa senha ou login errados", async () => {
  const acesso = { login: "1411578", ...(await criarCredencial("monte-luz-1234", { iteracoes: VOLTAS })) };
  assert.equal(await conferir({ login: "1411578", senha: "monte-luz-1234" }, acesso), true);
  assert.equal(await conferir({ login: "1411578", senha: "monte-luz-1235" }, acesso), false);
  assert.equal(await conferir({ login: "1411579", senha: "monte-luz-1234" }, acesso), false);
  assert.equal(await conferir({ login: "", senha: "" }, acesso), false);
  assert.equal(await conferir({ login: undefined, senha: undefined }, acesso), false);
});

test("espaços no login são tolerados; maiúscula e minúscula na senha NÃO", async () => {
  const acesso = { login: "1411578", ...(await criarCredencial("Monte-Luz", { iteracoes: VOLTAS })) };
  assert.equal(await conferir({ login: " 1411 578 ", senha: "Monte-Luz" }, acesso), true);
  assert.equal(await conferir({ login: "1411578", senha: "monte-luz" }, acesso), false);
});

test("a senha acentuada vale igual, seja qual for a forma como o teclado a compõe", async () => {
  const acesso = { login: "1", ...(await criarCredencial("coração", { iteracoes: VOLTAS })) };
  assert.equal(await conferir({ login: "1", senha: "coração" }, acesso), true, "composta");
  assert.equal(await conferir({ login: "1", senha: "coração" }, acesso), true, "decomposta");
});

test("a sessão: vale ao entrar, some ao sair, e é por aba a menos que se peça para lembrar", async () => {
  const acesso = { hash: "ABCDEFGHIJKLMNOPQRSTUVWX" };
  const ar = { sessao: armazem(), local: armazem() };
  assert.equal(sessaoValida(ar, acesso, { agora: 1000 }), false);
  iniciarSessao(ar, acesso, { lembrar: false, agora: 1000 });
  assert.equal(sessaoValida(ar, acesso, { agora: 2000 }), true);
  assert.equal(ar.local.getItem("atas.sessao"), null, "sem 'lembrar', nada no localStorage");
  encerrarSessao(ar);
  assert.equal(sessaoValida(ar, acesso, { agora: 2000 }), false);
});

test("lembrar neste aparelho vale por 30 dias e depois expira", () => {
  const acesso = { hash: "ABCDEFGHIJKLMNOPQRSTUVWX" };
  const ar = { sessao: armazem(), local: armazem() };
  iniciarSessao(ar, acesso, { lembrar: true, agora: 0 });
  assert.equal(ar.sessao.getItem("atas.sessao"), null);
  assert.equal(sessaoValida(ar, acesso, { agora: 29 * 86_400_000 }), true);
  assert.equal(sessaoValida(ar, acesso, { agora: 31 * 86_400_000 }), false);
});

test("trocar a senha (outro hash em config.js) derruba as sessões antigas", () => {
  const velho = { hash: "ABCDEFGHIJKLMNOPQRSTUVWX" };
  const novo = { hash: "ZZZZZZZZZZZZZZZZZZZZZZZZ" };
  const ar = { sessao: armazem(), local: armazem() };
  iniciarSessao(ar, velho, { lembrar: true, agora: 0 });
  assert.equal(sessaoValida(ar, novo, { agora: 1 }), false);
});

test("marca ilegível ou armazenamento que recusa não derruba nada: só não há sessão", () => {
  const acesso = { hash: "ABCDEFGHIJKLMNOPQRSTUVWX" };
  const lixo = armazem();
  lixo.setItem("atas.sessao", "{isso não é json");
  assert.equal(sessaoValida({ sessao: lixo, local: armazem() }, acesso, { agora: 1 }), false);
  const quebrado = { getItem: () => { throw new Error("recusado"); }, setItem() {}, removeItem() { throw new Error("recusado"); } };
  assert.equal(sessaoValida({ sessao: quebrado, local: quebrado }, acesso, { agora: 1 }), false);
  assert.doesNotThrow(() => encerrarSessao({ sessao: quebrado, local: quebrado }));
});

test("o e-mail de recuperação: ida e volta, máscara e o mailto codificado", () => {
  const codificado = codificarEndereco("pessoa.exemplo@dominio.org.br");
  assert.equal(decodificarEndereco(codificado), "pessoa.exemplo@dominio.org.br");
  assert.doesNotMatch(codificado, /@|dominio/, "o endereço não fica legível no código");
  assert.equal(enderecoMascarado(codificado), "p•••••@dominio.org.br");
  const link = linkDeRecuperacao({ destino: codificado, assunto: "Esqueci a senha", corpo: "Olá & obrigado" });
  assert.equal(link, "mailto:pessoa.exemplo@dominio.org.br?subject=Esqueci%20a%20senha&body=Ol%C3%A1%20%26%20obrigado");
});

// ── a configuração que vai ao ar ─────────────────────────────────────────────

test("a configuração real: login é o número da estaca e o acesso tem a forma certa", () => {
  assert.equal(CONFIG.estaca.numero, "1411578");
  assert.equal(CONFIG.acesso.login, "1411578");
  assert.equal(atob(CONFIG.acesso.hash).length, 32, "hash de 256 bits");
  assert.equal(atob(CONFIG.acesso.sal).length, 16, "sal de 128 bits");
  assert.ok(CONFIG.acesso.iteracoes >= 210_000, "voltas suficientes para o hash publicado");
});

test("a configuração real recusa palpites comuns", async () => {
  for (const senha of ["1411578", "admin", "pacajus", ""]) {
    assert.equal(await conferir({ login: "1411578", senha }, CONFIG.acesso), false, JSON.stringify(senha));
  }
});

test("o arquivo de configuração não tem senha em texto nem o e-mail escrito por extenso", async () => {
  const texto = await readFile(new URL("../js/config.js", import.meta.url), "utf8");
  assert.doesNotMatch(texto, /senha\s*:/i, "nenhum campo 'senha' com valor");
  assert.doesNotMatch(texto, /[\w.]+@[\w.]+\.\w+/, "nenhum endereço de e-mail legível");
  assert.equal(decodificarEndereco(CONFIG.recuperacao.destino).includes("@"), true, "mas o código o desfaz num endereço");
});

test("as doze unidades da estaca (7 alas, 3 ramos e 2 grupos), e o tipo de cada uma concorda com o nome", () => {
  assert.equal(CONFIG.unidades.length, 12);
  assert.equal(new Set(CONFIG.unidades.map((u) => u.nome)).size, 12, "sem nomes repetidos");
  const porTipo = (tipo) => CONFIG.unidades.filter((u) => u.tipo === tipo).map((u) => u.nome);
  assert.equal(porTipo("ala").length, 7);
  assert.equal(porTipo("ramo").length, 3);
  assert.deepEqual(porTipo("grupo"), ["Grupo Fortim", "Grupo Icapuí"]);
  for (const u of CONFIG.unidades) {
    assert.ok(Object.hasOwn(TIPOS_DE_UNIDADE, u.tipo), u.nome);
    assert.equal(u.nome.startsWith(`${TIPOS_DE_UNIDADE[u.tipo]} `), true, `${u.nome}: o nome concorda com o tipo`);
  }
});
