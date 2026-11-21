/**
 * O tema do caderno: cores, medidas e fontes.
 *
 * As cores são as das agendas de conferência da estaca (o petróleo do cabeçalho, o dourado do
 * templo), para que tudo que a estaca imprime pareça da mesma casa. Mudar uma cor aqui muda o
 * caderno inteiro; nenhuma página escreve um valor de cor por conta própria.
 */

/** A4 em pontos (1 pt = 1/72 pol). */
export const A4 = Object.freeze({ largura: 595.28, altura: 841.89 });

export const COR = Object.freeze({
  petroleo950: "#00272d",
  petroleo900: "#003238",
  petroleo800: "#07383e",
  petroleo700: "#07575a",
  ouro: "#c88a33",
  ouroClaro: "#e8c07c",
  ouroPalido: "#f6e7c8",
  ouroEscuro: "#8a5a12",
  texto: "#07333a",
  suave: "#425e64",
  quieto: "#5a7076",
  /**
   * A linha onde se escreve à mão: tem de aparecer na fotocópia e no modo econômico da impressora
   * (contraste de uns 2,8 para 1 com o papel), sem competir com a letra.
   */
  escrita: "#8aa0a6",
  /** Os fios que só dividem (colunas de tabela, borda de quadradinho): mais leves que a linha de escrever. */
  divisoria: "#b9c9cd",
  linha: "#d8e1e4",
  painel: "#eef3f4",
  zebra: "#f4f8f8",
  claro: "#d3e3e4",
  branco: "#ffffff",
});

/**
 * As famílias registradas no documento. O valor é o nome com que o pdfkit conhece a fonte;
 * a chave é como as páginas a pedem.
 */
export const FONTE = Object.freeze({
  sans: "Inter",
  sansItalico: "Inter-Italic",
  sansSemi: "Inter-SemiBold",
  sansNegrito: "Inter-Bold",
  sansExtra: "Inter-ExtraBold",
  serifa: "Lora",
  serifaItalico: "Lora-Italic",
  serifaSemi: "Lora-SemiBold",
  serifaNegrito: "Lora-Bold",
});

/** Arquivo de cada fonte, relativo à pasta `assets/fontes/`. */
export const ARQUIVO_DA_FONTE = Object.freeze({
  [FONTE.sans]: "Inter-Regular.ttf",
  [FONTE.sansItalico]: "Inter-Italic.ttf",
  [FONTE.sansSemi]: "Inter-SemiBold.ttf",
  [FONTE.sansNegrito]: "Inter-Bold.ttf",
  [FONTE.sansExtra]: "Inter-ExtraBold.ttf",
  [FONTE.serifa]: "Lora-Regular.ttf",
  [FONTE.serifaItalico]: "Lora-Italic.ttf",
  [FONTE.serifaSemi]: "Lora-SemiBold.ttf",
  [FONTE.serifaNegrito]: "Lora-Bold.ttf",
});

/** Imagens do caderno, relativas à pasta `assets/marca/`. */
export const ARQUIVO_DA_IMAGEM = Object.freeze({
  logo: "logo-estaca.png",
  templo: "templo.png",
});

/** Margens das páginas de ata e de texto. */
export const MARGEM = Object.freeze({ esq: 38, dir: 38, topo: 30, base: 34 });

export const LARGURA_UTIL = A4.largura - MARGEM.esq - MARGEM.dir;

/**
 * A margem de ENCADERNAÇÃO, para guardar o caderno em pasta de 2 ou 4 furos (os furos ficam a 12 mm da
 * borda e têm 6 mm: ocupam de 9 a 15 mm). Do lado da lombada o texto começa a `interna` pt da borda (18 mm);
 * do outro lado sobram uns 10,7 mm. O desenho das páginas não muda: cada página é só reduzida a `escala`
 * (1 % menor) e deslocada para o lado certo (ver `Pintor.novaPagina`). A lombada é a borda MAIOR da folha:
 * à esquerda nas páginas ímpares (frentes) e à direita nas pares (versos), que é como se imprime frente e verso.
 */
export const ENCADERNACAO = Object.freeze({ interna: 51.02, escala: 0.99 });

/** O menor corpo de letra que se lê no papel, em pt: nada que se espera que alguém leia desce disto. */
export const PISO_DE_LEITURA = 8;
