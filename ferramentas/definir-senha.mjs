import { stdin, stdout, exit, argv } from "node:process";
import { codificarEndereco, criarCredencial } from "../js/acesso.js";
import { CONFIG } from "../js/config.js";

/**
 * Gera o bloco "acesso" do `js/config.js` para uma senha nova — a mesma coisa que a tela
 * "Trocar senha" do site faz, para quem prefere o computador.
 *
 *   npm run senha                          pergunta a senha duas vezes, sem mostrar o que se digita
 *   echo "uma senha longa" | npm run senha lê a senha da entrada (para scripts)
 *   npm run senha -- --email=alguem@exemplo.com   também mostra o endereço de recuperação codificado
 *
 * A senha nunca vai para a linha de comando (ficaria no histórico do terminal) nem para arquivo
 * nenhum: o que se imprime é só o sal e o hash.
 */

const MINIMO = 10;
const email = argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);

function falhar(mensagem) {
  console.error(mensagem);
  exit(1);
}

/** Lê uma linha sem eco, quando há teclado; do contrário, a primeira linha da entrada. */
function lerSenha(pergunta) {
  if (!stdin.isTTY) {
    return new Promise((resolver) => {
      let texto = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (pedaco) => (texto += pedaco));
      stdin.on("end", () => resolver(texto.split(/\r?\n/)[0] ?? ""));
    });
  }
  stdout.write(pergunta);
  return new Promise((resolver) => {
    let senha = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const aoDigitar = (tecla) => {
      for (const c of tecla) {
        if (c === "\u0003") {
          stdin.setRawMode(false);
          stdout.write("\n");
          exit(130);
        }
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", aoDigitar);
          stdout.write("\n");
          return resolver(senha);
        }
        if (c === "\u007f" || c === "\b") senha = senha.slice(0, -1);
        else senha += c;
      }
    };
    stdin.on("data", aoDigitar);
  });
}

const senha = await lerSenha("Senha nova (pelo menos 10 caracteres): ");
if (senha.length < MINIMO) falhar(`A senha precisa ter pelo menos ${MINIMO} caracteres.`);
if (stdin.isTTY && (await lerSenha("Repita a senha nova: ")) !== senha) falhar("As duas senhas não são iguais.");

const credencial = await criarCredencial(senha);

console.log(`
Troque o bloco "acesso" do arquivo js/config.js por este:

  acesso: {
    login: ${JSON.stringify(CONFIG.acesso.login)},
    sal: ${JSON.stringify(credencial.sal)},
    iteracoes: ${credencial.iteracoes},
    hash: ${JSON.stringify(credencial.hash)},
  },
`);
if (email) {
  console.log(`E, se quiser trocar o e-mail de "Esqueci a senha", o bloco "recuperacao" leva:

    destino: ${JSON.stringify(codificarEndereco(email))},
`);
}
console.log("Salve o arquivo no GitHub (Commit changes). Em um ou dois minutos a senha nova vale e as sessões antigas deixam de valer.");
