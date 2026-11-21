import { A4, ENCADERNACAO } from "./tema.js";
import { Pintor, paraOPapel } from "./desenho.js";
import { MESES, dataCurta, planejarAno, TIPO } from "../calendario.js";
import { desenharCapa } from "./paginas/capa.js";
import { desenharFrente } from "./paginas/ata-frente.js";
import { desenharVerso } from "./paginas/ata-verso.js";
import { desenharCalendario } from "./paginas/calendario-do-ano.js";
import { desenharContracapa } from "./paginas/contracapa.js";
import { desenharInstrucoes } from "./paginas/instrucoes.js";
import { desenharAnotacoes } from "./paginas/anotacoes.js";
import { desenharQuartaCapa } from "./paginas/quarta-capa.js";

/**
 * O caderno inteiro: monta as páginas, na ordem, e devolve os bytes do PDF.
 *
 * Quem chama passa o `PDFDocument` (o do pdfkit no Node, o global no navegador) e os recursos
 * (bytes das fontes e das imagens): este módulo não lê arquivo, não usa `window` nem `process`.
 *
 * ## A ordem das folhas (cada folha = frente e verso, para imprimir dos dois lados)
 *
 *   folha 1     capa                      | contracapa (orientações do Manual Geral + citação)
 *   folha 2     instruções do discurso    | calendário do ano
 *   folha 3…    ata do domingo (frente)   | frequência e ministração (verso)
 *   última      anotações                 | quarta capa (a capa de trás, com uma escritura sobre o sacramento)
 *
 * Toda parte tem número PAR de páginas, então a impressão frente e verso nunca desencontra. A quarta capa
 * fica no verso da última folha, por fora quando o caderno é montado; a folha de anotações é a "irmã"
 * dela, na frente.
 *
 * ## Margem de encadernação
 *
 * Por padrão a margem do lado da lombada é de 18 mm (`ENCADERNACAO`), para guardar em pasta de furos: ver
 * `Pintor.novaPagina`.
 *
 * ## Determinístico
 *
 * "Quando foi gerado" entra por argumento (`geradoEm`): os mesmos dados dão os mesmos bytes.
 * Este módulo não lê o relógio.
 */

/** As páginas que vêm antes da primeira ata (capa, contracapa, instruções e calendário). */
export const PAGINAS_FIXAS = 4;

/** As páginas que fecham o caderno, depois da última ata: a folha de anotações e a quarta capa. */
export const PAGINAS_FINAIS = 2;

/** Quantas páginas tem o caderno de um plano: as fixas, frente e verso de cada ata e as finais. */
export function contarPaginas(plano) {
  return PAGINAS_FIXAS + 2 * plano.resumo.atas + PAGINAS_FINAIS;
}

/**
 * @param {object} entrada
 * @param {Function} entrada.PDFDocument
 * @param {{ fontes: Record<string, Uint8Array|ArrayBuffer>, imagens: Record<string, Uint8Array|ArrayBuffer> }} entrada.recursos
 * @param {{ nome: string, tipo: "ala"|"ramo" }} entrada.unidade
 * @param {{ nome: string }} entrada.estaca
 * @param {number} entrada.ano
 * @param {Record<string, string>} [entrada.ajustes]  o que a pessoa decidiu na lista de domingos
 * @param {Date} entrada.geradoEm
 * @param {number} [entrada.limiteDeAtas]  só para conferência: corta o caderno nas N primeiras atas
 * @param {boolean} [entrada.margemDeEncadernacao]  margem maior do lado dos furos (pasta de 2 ou 4 furos); padrão: sim
 */
export async function gerarLivro({ PDFDocument, recursos, unidade: unidadeBruta, estaca, ano, ajustes = {}, geradoEm, limiteDeAtas = Infinity, margemDeEncadernacao = true }) {
  // O nome da unidade vem de quem digita: uma linha só, sem espaço sobrando e de tamanho razoável.
  const nome = String(unidadeBruta?.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!nome) throw new Error("Falta o nome da unidade.");
  const unidade = { nome, tipo: ["ala", "ramo", "grupo"].includes(unidadeBruta.tipo) ? unidadeBruta.tipo : "ala" };
  const plano = planejarAno(ano, { ajustes });
  const doc = new PDFDocument({
    size: [A4.largura, A4.altura],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
    compress: true,
    pdfVersion: "1.7",
    lang: "pt-BR",
    displayTitle: true,
    info: {
      Title: paraOPapel(`Atas da Reunião Sacramental ${ano} — ${unidade.nome}`),
      Author: paraOPapel(estaca.nome),
      Subject: paraOPapel(`Caderno de atas da reunião sacramental, ${ano}`),
      Creator: "Atas Sacramentais",
      CreationDate: geradoEm,
      ModDate: geradoEm,
    },
  });

  const pedacos = [];
  doc.on("data", (c) => pedacos.push(c));
  const terminou = new Promise((resolver, recusar) => {
    doc.on("end", resolver);
    doc.on("error", recusar);
  });

  const pintor = new Pintor(doc, recursos);
  pintor.encadernacao = margemDeEncadernacao ? ENCADERNACAO : null;
  const base = { unidade, estaca, ano, plano };
  desenharCapa(pintor, { unidade, ano, estaca });
  pintor.marcador("Capa");
  desenharContracapa(pintor, base);
  pintor.marcador("Orientações do Manual Geral");
  desenharInstrucoes(pintor, base);
  pintor.marcador("Instruções do discurso");
  desenharCalendario(pintor, base);
  pintor.marcador(`Calendário de ${ano}`);

  const atas = plano.domingos.filter((d) => d.tipo !== TIPO.SEM_REUNIAO).slice(0, limiteDeAtas);
  const total = plano.resumo.atas;
  // Um marcador por mês e, dentro dele, um por ata: cada um aponta para a FRENTE da ata.
  let mesAtual = null;
  let marcadorDoMes = null;
  for (const domingo of atas) {
    const ctx = { unidade, estaca, ano, domingo, total };
    desenharFrente(pintor, ctx);
    if (domingo.mes !== mesAtual) {
      mesAtual = domingo.mes;
      marcadorDoMes = pintor.marcador(`${MESES[mesAtual - 1][0].toUpperCase()}${MESES[mesAtual - 1].slice(1)}`);
    }
    const tipo = domingo.tipo === TIPO.TESTEMUNHOS ? " · jejum e testemunhos" : "";
    pintor.marcador(`${dataCurta(domingo.iso)} · ata ${domingo.ordem}${tipo}`, { pai: marcadorDoMes });
    desenharVerso(pintor, ctx);
  }

  // O fecho: a folha de anotações (frente) e a quarta capa (verso, por fora quando o caderno é montado).
  desenharAnotacoes(pintor, base);
  pintor.marcador("Anotações");
  desenharQuartaCapa(pintor, base);
  pintor.marcador("Capa de trás");

  doc.end();
  await terminou;

  const bytes = new Uint8Array(pedacos.reduce((soma, c) => soma + c.length, 0));
  let posicao = 0;
  for (const c of pedacos) {
    bytes.set(c, posicao);
    posicao += c.length;
  }
  return { bytes, paginas: pintor.pagina, textos: pintor.textos, marcadores: pintor.marcadores, plano };
}
