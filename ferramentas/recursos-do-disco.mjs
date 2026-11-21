import { readFile } from "node:fs/promises";
import { ARQUIVO_DA_FONTE, ARQUIVO_DA_IMAGEM } from "../js/pdf/tema.js";

const RAIZ = new URL("../", import.meta.url);

/**
 * Lê do disco as fontes e as imagens que o caderno usa — o equivalente, no Node, do que o
 * navegador busca por `fetch`. Os testes e o gerador de exemplo usam o MESMO caminho de desenho
 * que o navegador; só o carregamento dos bytes difere.
 */
export async function carregarRecursosDoDisco() {
  const fontes = {};
  for (const [nome, arquivo] of Object.entries(ARQUIVO_DA_FONTE)) {
    fontes[nome] = await readFile(new URL(`assets/fontes/${arquivo}`, RAIZ));
  }
  const imagens = {};
  for (const [nome, arquivo] of Object.entries(ARQUIVO_DA_IMAGEM)) {
    imagens[nome] = await readFile(new URL(`assets/marca/${arquivo}`, RAIZ));
  }
  return { fontes, imagens };
}
