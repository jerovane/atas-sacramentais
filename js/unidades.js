/**
 * As unidades (alas e ramos): a lista oficial da estaca e as que a pessoa cadastra.
 *
 * ## De onde vêm
 *
 * - **Oficiais**: as de `js/config.js`, iguais para todo mundo.
 * - **Cadastradas**: as que a pessoa acrescenta na tela, para uma ala ou um ramo que ainda não
 *   está na lista. Como este site é estático (não tem servidor), elas ficam guardadas NESTE
 *   aparelho (localStorage) — aparecem para escolher já, mas só neste navegador. Para valerem
 *   para todos, a pessoa copia as linhas que a tela mostra para `config.js` (`linhasParaConfig`).
 *   Quando a unidade passa a constar de `config.js`, a cópia local some sozinha: a oficial manda.
 *
 * ## O nome
 *
 * Toda unidade se chama "Ala …", "Ramo …" ou "Grupo …", como as da estaca. Quem digita só
 * "Pacajus 3" e escolhe "ramo" tem "Ramo Pacajus 3"; quem digita "Ramo Pacajus 3" não precisa
 * escolher nada — o nome decide o tipo, que é o que muda o rótulo de quem assina a ata ("Bispo",
 * "Presidente do Ramo" ou "Líder do Grupo"). Letras, números e a pontuação de um nome de lugar; nada que a fonte do PDF não
 * desenhe, e nada que sirva para enganar quem lê (caractere de direção, por exemplo).
 *
 * O módulo não toca na tela nem no relógio: recebe o armazenamento por argumento, e por isso
 * roda igual nos testes e no navegador.
 */

export const CHAVE_DAS_UNIDADES = "atas.unidades";
export const TAMANHO_MAXIMO_DO_NOME = 40;
export const LIMITE_DE_UNIDADES_CADASTRADAS = 30;

/** Os tipos de unidade e a palavra que abre o nome de cada um. */
export const TIPOS_DE_UNIDADE = Object.freeze({ ala: "Ala", ramo: "Ramo", grupo: "Grupo" });

const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e"]);

// Latin-1 e Latin Estendido-A (o que as fontes do PDF têm), números e a pontuação de nome de lugar.
const LETRA = "A-Za-z0-9\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F";
const NOME_VALIDO = new RegExp(`^[${LETRA}][${LETRA} .'\\u2019\\u00BA\\u00AA()/\\u2013-]*$`);

/** A "chave" de uma unidade: o nome sem acento, caixa nem pontuação — para saber se duas são a mesma. */
export function chaveDaUnidade(nome) {
  return String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Palavras que vieram em minúscula ganham a inicial maiúscula, exceto "de", "da", "do"…; o resto fica como a pessoa escreveu. */
function capitalizarPalavras(texto) {
  return texto
    .split(" ")
    .map((palavra) => {
      if (!palavra || palavra !== palavra.toLowerCase() || !/[a-zà-ÿ]/.test(palavra)) return palavra;
      if (CONECTORES.has(palavra)) return palavra;
      return palavra[0].toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

/**
 * O nome e o tipo que sairiam do que a pessoa digitou — sem validar. Serve também para mostrar,
 * enquanto ela digita, "Será cadastrada como: …". `nome` vazio dá `null`.
 *
 * @param {{ nome?: string, tipo?: string }} entrada  `tipo` é o que ela marcou ("ala" ou "ramo")
 */
export function montarUnidade(entrada) {
  // Só texto vale como nome: um número vindo do armazenamento não vira "Ala 42".
  const digitado = typeof entrada?.nome === "string" ? entrada.nome.replace(/\s+/g, " ").trim() : "";
  if (!digitado) return null;
  const comPrefixo = /^(ala|ramo|grupo)(?=\s|$)\s*(.*)$/i.exec(digitado);
  const marcado = Object.hasOwn(TIPOS_DE_UNIDADE, entrada?.tipo) ? entrada.tipo : "ala";
  const tipo = comPrefixo ? comPrefixo[1].toLowerCase() : marcado;
  const resto = capitalizarPalavras((comPrefixo ? comPrefixo[2] : digitado).trim());
  return { nome: `${TIPOS_DE_UNIDADE[tipo]} ${resto}`.trim(), tipo, resto };
}

export const MENSAGEM_DO_ERRO = Object.freeze({
  vazio: "Digite o nome da unidade.",
  curto: "O nome está curto demais: coloque o nome do lugar, como em “Ala Cascavel” ou “Grupo Beberibe”.",
  longo: `O nome passa de ${TAMANHO_MAXIMO_DO_NOME} caracteres.`,
  caracteres: "Use só letras, números, espaços e os sinais - . ' ( ) / º ª.",
  duplicada: "Essa unidade já está na lista.",
  limite: `Já há ${LIMITE_DE_UNIDADES_CADASTRADAS} unidades cadastradas neste aparelho: remova alguma antes de cadastrar outra.`,
});

/**
 * Confere o que a pessoa digitou. `existentes` são TODAS as unidades já na lista (oficiais e
 * cadastradas); `cadastradas`, quantas ela já cadastrou. Devolve { ok: true, unidade } ou
 * { ok: false, erro } com o código do erro (chave de `MENSAGEM_DO_ERRO`).
 */
export function interpretarUnidade(entrada, { existentes = [], cadastradas = 0 } = {}) {
  const montada = montarUnidade(entrada);
  if (!montada) return { ok: false, erro: "vazio" };
  if (montada.resto.length < 2) return { ok: false, erro: "curto" };
  if (montada.nome.length > TAMANHO_MAXIMO_DO_NOME) return { ok: false, erro: "longo" };
  if (!NOME_VALIDO.test(montada.nome)) return { ok: false, erro: "caracteres" };
  const chave = chaveDaUnidade(montada.nome);
  if (existentes.some((u) => chaveDaUnidade(u.nome) === chave)) return { ok: false, erro: "duplicada" };
  if (cadastradas >= LIMITE_DE_UNIDADES_CADASTRADAS) return { ok: false, erro: "limite" };
  return { ok: true, unidade: { nome: montada.nome, tipo: montada.tipo } };
}

/**
 * As unidades cadastradas neste aparelho, lidas do armazenamento. O que estiver ilegível, fora
 * das regras ou repetido é descartado (e as que já constam das oficiais, também): o
 * armazenamento é de quem tem acesso ao navegador, e a tela não confia no que lê dele.
 */
export function lerUnidadesCadastradas(armazem, oficiais = []) {
  let bruto;
  try {
    bruto = JSON.parse(armazem.getItem(CHAVE_DAS_UNIDADES) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(bruto)) return [];
  const aceitas = [];
  for (const item of bruto) {
    const r = interpretarUnidade({ nome: item?.nome, tipo: item?.tipo }, { existentes: [...oficiais, ...aceitas], cadastradas: aceitas.length });
    if (r.ok) aceitas.push(r.unidade);
  }
  return aceitas;
}

/** Guarda as cadastradas. Devolve se conseguiu (navegação privada e bloqueio de dados podem recusar). */
export function guardarUnidadesCadastradas(armazem, unidades) {
  try {
    armazem.setItem(CHAVE_DAS_UNIDADES, JSON.stringify(unidades.map(({ nome, tipo }) => ({ nome, tipo }))));
    return true;
  } catch {
    return false;
  }
}

/** A lista completa para escolher: as oficiais, na ordem da configuração, e depois as cadastradas. */
export function todasAsUnidades(oficiais, cadastradas) {
  return [...oficiais.map((u) => ({ ...u, origem: "oficial" })), ...cadastradas.map((u) => ({ ...u, origem: "cadastrada" }))];
}

/**
 * As linhas que a pessoa cola em `js/config.js`, dentro de `unidades: [ … ]`, para a unidade
 * valer em todos os aparelhos. O nome passa por `JSON.stringify`: é sempre um texto JavaScript
 * bem formado, qualquer que seja a unidade.
 */
export function linhasParaConfig(unidades) {
  return unidades.map((u) => `    { nome: ${JSON.stringify(u.nome)}, tipo: ${JSON.stringify(u.tipo)} },`).join("\n");
}
