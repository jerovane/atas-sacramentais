import { writeFile } from "node:fs/promises";
import PDFDocument from "pdfkit";
import { gerarLivro } from "../js/pdf/livro.js";
import { carregarRecursosDoDisco } from "./recursos-do-disco.mjs";

/**
 * Gera um caderno de exemplo no Node — o mesmo desenho que o navegador faz — para conferir o
 * resultado a olho e nos testes.
 *
 * Uso:
 *   node ferramentas/gerar-exemplo.mjs --saida=/caminho/exemplo.pdf [--ano=2027] [--unidade="Ala Pacajus 1"] [--tipo=ala]
 *                                      [--atas=2] [--sem-encadernacao]
 *
 * `--atas=N` corta o caderno nas N primeiras atas (para conferir rápido) e `--sem-encadernacao` tira a margem
 * maior do lado dos furos (para espiral ou grampo): sem ela, as margens ficam iguais dos dois lados.
 */

const arg = (nome, padrao) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? padrao;
const liga = (nome) => process.argv.includes(`--${nome}`);

const saida = arg("saida");
if (!saida) {
  console.error("Uso: node ferramentas/gerar-exemplo.mjs --saida=/caminho/exemplo.pdf [--ano=2027] [--unidade=\"Ala Pacajus 1\"]");
  process.exit(1);
}

const recursos = await carregarRecursosDoDisco();
const inicio = performance.now();
const { bytes, paginas } = await gerarLivro({
  PDFDocument,
  recursos,
  unidade: { nome: arg("unidade", "Ala Pacajus 1"), tipo: arg("tipo", "ala") },
  estaca: { nome: "Estaca Pacajus Brasil" },
  ano: Number(arg("ano", "2027")),
  geradoEm: new Date("2026-11-20T12:00:00Z"),
  limiteDeAtas: Number(arg("atas", "Infinity")),
  margemDeEncadernacao: !liga("sem-encadernacao"),
});
await writeFile(saida, bytes);
console.log(`${paginas} página(s), ${(bytes.length / 1024).toFixed(0)} KB, ${(performance.now() - inicio).toFixed(0)} ms → ${saida}`);
