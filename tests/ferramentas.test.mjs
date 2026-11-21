import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { conferir, decodificarEndereco } from "../js/acesso.js";

/**
 * A ferramenta de trocar a senha pelo computador: o bloco que ela imprime tem de ser um acesso
 * que realmente confere com a senha digitada — e só com ela.
 */

const RAIZ = new URL("..", import.meta.url).pathname;

const rodar = (entrada, args = []) =>
  spawnSync(process.execPath, ["ferramentas/definir-senha.mjs", ...args], {
    cwd: RAIZ,
    input: entrada,
    encoding: "utf8",
    timeout: 30_000,
    env: { PATH: process.env.PATH },
  });

/** Lê de volta o bloco `acesso: { … }` do texto impresso. */
function lerAcesso(saida) {
  const bloco = /acesso: (\{[\s\S]*?\n {2}\}),/.exec(saida)?.[1];
  assert.ok(bloco, "a saída traz o bloco acesso");
  return new Function(`return (${bloco});`)();
}

test("o bloco impresso é um acesso que confere com a senha digitada, e só com ela", async () => {
  const r = rodar("uma senha bem longa e fácil\n");
  assert.equal(r.status, 0, r.stderr);
  const acesso = lerAcesso(r.stdout);
  assert.equal(acesso.login, "1411578");
  assert.equal(atob(acesso.sal).length, 16);
  assert.equal(atob(acesso.hash).length, 32);
  assert.equal(await conferir({ login: "1411578", senha: "uma senha bem longa e fácil" }, acesso), true);
  assert.equal(await conferir({ login: "1411578", senha: "uma senha bem longa e facil" }, acesso), false);
});

test("a senha não aparece em lugar nenhum da saída", () => {
  const r = rodar("segredo-muito-comprido-123\n");
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout + r.stderr, /segredo-muito-comprido/);
});

test("senha curta é recusada, com mensagem e código de saída de erro", () => {
  const r = rodar("curta\n");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /pelo menos 10 caracteres/);
  assert.doesNotMatch(r.stdout, /hash:/);
});

test("duas execuções com a mesma senha dão sal e hash diferentes", () => {
  const a = lerAcesso(rodar("mesma senha repetida\n").stdout);
  const b = lerAcesso(rodar("mesma senha repetida\n").stdout);
  assert.notEqual(a.sal, b.sal);
  assert.notEqual(a.hash, b.hash);
});

test("com --email, mostra o destino codificado, que o código desfaz no endereço", () => {
  const r = rodar("uma senha bem longa\n", ["--email=pessoa@exemplo.org"]);
  assert.equal(r.status, 0);
  const destino = /destino: "([^"]+)"/.exec(r.stdout)?.[1];
  assert.ok(destino);
  assert.equal(decodificarEndereco(destino), "pessoa@exemplo.org");
  assert.doesNotMatch(r.stdout, /pessoa@exemplo/, "o endereço não sai por extenso");
});
