import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Um servidor estático mínimo para ver o site no próprio computador, sem instalar nada.
 *
 *   npm run servir              → http://127.0.0.1:8080
 *   npm run servir -- 3000      → outra porta
 *
 * Só serve arquivos de dentro da pasta do projeto, e só escuta neste computador (127.0.0.1).
 * Em produção o site é servido pelo GitHub Pages; isto existe para desenvolver e conferir.
 */

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const PORTA = Number(process.argv[2] ?? 8080);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".md": "text/plain; charset=utf-8",
};

const servidor = createServer(async (pedido, resposta) => {
  try {
    const caminhoPedido = decodeURIComponent(new URL(pedido.url, "http://x").pathname);
    let alvo = normalize(join(RAIZ, caminhoPedido));
    // Nada fora da pasta do projeto, e nada de dentro dela que não seja do site.
    if (alvo !== RAIZ.slice(0, -1) && !alvo.startsWith(RAIZ)) throw Object.assign(new Error("fora"), { codigo: 403 });
    const relativo = alvo.slice(RAIZ.length).split(sep)[0];
    if (["node_modules", ".git", "tests", "ferramentas"].includes(relativo)) throw Object.assign(new Error("fechado"), { codigo: 404 });
    if ((await stat(alvo)).isDirectory()) alvo = join(alvo, "index.html");
    const corpo = await readFile(alvo);
    resposta.writeHead(200, { "content-type": TIPOS[extname(alvo)] ?? "application/octet-stream", "cache-control": "no-store" });
    resposta.end(corpo);
  } catch (erro) {
    resposta.writeHead(erro.codigo ?? 404, { "content-type": "text/plain; charset=utf-8" });
    resposta.end(erro.codigo === 403 ? "Proibido" : "Não encontrado");
  }
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`Servindo ${RAIZ} em http://127.0.0.1:${PORTA}`);
});
