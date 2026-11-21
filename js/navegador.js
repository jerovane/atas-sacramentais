import { ARQUIVO_DA_FONTE, ARQUIVO_DA_IMAGEM } from "./pdf/tema.js";

/**
 * O que só o navegador faz: buscar o gerador de PDF, as fontes e as imagens.
 *
 * Tudo é carregado SOB DEMANDA — quando a pessoa pede o primeiro PDF —, e não ao abrir a página:
 * o gerador de PDF tem 1,4 MB e a tela de entrada não precisa dele. Depois do primeiro pedido
 * fica em memória, e os seguintes são imediatos.
 */

let promessaDoPdfkit = null;

/** O `PDFDocument` do pdfkit (a versão "standalone", guardada em `vendor/`). */
export function carregarPdfkit() {
  if (globalThis.PDFDocument) return Promise.resolve(globalThis.PDFDocument);
  promessaDoPdfkit ??= new Promise((resolver, recusar) => {
    const script = document.createElement("script");
    script.src = new URL("../vendor/pdfkit.standalone.js", import.meta.url).href;
    script.onload = () => (globalThis.PDFDocument ? resolver(globalThis.PDFDocument) : recusar(new Error("O gerador de PDF carregou, mas não se apresentou.")));
    script.onerror = () => {
      promessaDoPdfkit = null;
      recusar(new Error("Não consegui baixar o gerador de PDF. Confira a conexão com a internet e tente de novo."));
    };
    document.head.append(script);
  });
  return promessaDoPdfkit;
}

let promessaDosRecursos = null;

/** Os bytes das fontes e das imagens do caderno: { fontes, imagens }. */
export function carregarRecursos() {
  promessaDosRecursos ??= (async () => {
    const base = new URL("../assets/", import.meta.url);
    const buscar = async (caminho) => {
      const resposta = await fetch(new URL(caminho, base));
      if (!resposta.ok) throw new Error(`Não achei ${caminho} (${resposta.status}).`);
      return new Uint8Array(await resposta.arrayBuffer());
    };
    const fontes = {};
    const imagens = {};
    await Promise.all([
      ...Object.entries(ARQUIVO_DA_FONTE).map(async ([nome, arquivo]) => {
        fontes[nome] = await buscar(`fontes/${arquivo}`);
      }),
      ...Object.entries(ARQUIVO_DA_IMAGEM).map(async ([nome, arquivo]) => {
        imagens[nome] = await buscar(`marca/${arquivo}`);
      }),
    ]);
    return { fontes, imagens };
  })().catch((erro) => {
    promessaDosRecursos = null;
    throw erro;
  });
  return promessaDosRecursos;
}

/** "Ala Pacajus 1" → "ala-pacajus-1": nome de arquivo sem acento, espaço nem símbolo. */
export function nomeParaArquivo(texto) {
  const limpo = String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo || "unidade";
}
