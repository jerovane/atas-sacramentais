import { A4, ARQUIVO_DA_FONTE, COR, FONTE, MARGEM, PISO_DE_LEITURA } from "./tema.js";

/**
 * O pintor: o que as páginas do caderno usam para pôr coisas no papel.
 *
 * Ele embrulha o pdfkit por três razões:
 *
 * 1. **Mesmo código no navegador e no Node.** Quem cria o documento (e carrega fontes e
 *    imagens) é quem chama; aqui só se desenha. É o que permite gerar o PDF no navegador de
 *    quem usa e conferir o MESMO desenho no Node, nos testes.
 * 2. **Todo texto fica registrado** (página, corpo, fonte, posição): os testes conferem
 *    conteúdo, tamanho mínimo e limites sem precisar de leitor de PDF.
 * 3. **Todo texto passa por `paraOPapel`**: o que a fonte não tem não vira quadradinho no
 *    papel — vira "?" (e caractere de controle ou de direção nunca chega ao arquivo).
 *
 * As margens do documento são zero: a posição de TUDO é calculada pelas páginas, e uma margem
 * inferior faria o pdfkit abrir página sozinho no meio do desenho.
 */

// O que as fontes subsetadas (assets/fontes/LEIA-ME.md) sabem desenhar.
const DESENHAVEL = /^[ -~ -ÿĀ-ſ‐-―‘-„†-•…‰′″‹›←-↓−✓●★№\n]$/u;

/** O texto como vai ao papel. */
export function paraOPapel(texto) {
  return Array.from(String(texto ?? "").normalize("NFC").replace(/\t/g, " ").replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === "\n" ? c : "")))
    .map((c) => (DESENHAVEL.test(c) ? c : "?"))
    .join("");
}

/**
 * Cola as duas últimas palavras com um espaço sem quebra: o parágrafo nunca fecha com uma palavra
 * sozinha na última linha (uma "viúva"). As fontes do caderno têm o glifo do espaço sem quebra, com
 * a mesma largura do espaço comum, e o pdfkit não quebra a linha nele.
 */
export function colarFim(texto) {
  return texto.replace(/(\S) (\S+)$/, "$1 $2");
}

export class Pintor {
  /**
   * @param doc um PDFDocument do pdfkit (já criado por quem chama)
   * @param recursos { fontes: { [nomeDaFonte]: bytes }, imagens: { logo: bytes, templo: bytes } }
   */
  constructor(doc, recursos) {
    this.doc = doc;
    /** Cada texto desenhado, para os testes. */
    this.textos = [];
    /** Cada marcador de navegação criado (o índice do PDF), para os testes. */
    this.marcadores = [];
    /** A página em que o próximo texto cai (1 = a primeira). */
    this.pagina = 0;
    /**
     * A margem de encadernação (`ENCADERNACAO` do tema) ou `null`. Quem monta o caderno liga; as páginas
     * não sabem dela: cada `novaPagina()` aplica a grade da lombada antes de qualquer desenho.
     */
    this.encadernacao = null;
    /** Como a página atual foi deslocada e reduzida: a posição FÍSICA no papel é `dx + escala × x`. */
    this._grade = { escala: 1, dx: 0, dy: 0 };
    for (const nome of Object.keys(ARQUIVO_DA_FONTE)) {
      const bytes = recursos.fontes[nome];
      if (!bytes) throw new Error(`Falta a fonte ${nome}`);
      doc.registerFont(nome, bytes);
    }
    // Abrir uma vez e reutilizar é o que põe a imagem UMA vez no arquivo, não uma por página.
    this.imagens = {};
    for (const [nome, bytes] of Object.entries(recursos.imagens ?? {})) this.imagens[nome] = doc.openImage(bytes);
  }

  /**
   * Abre a próxima página. Com a margem de encadernação ligada, desloca e reduz tudo o que vem depois
   * nesta página, para a margem maior cair do lado da lombada: à esquerda nas páginas ímpares (a frente
   * da folha) e à direita nas pares (o verso). A capa e a quarta capa passam `encadernar: false`: são
   * desenhos de página inteira, com moldura, e não têm texto para os furos cortarem.
   */
  novaPagina({ encadernar = true } = {}) {
    this.doc.addPage();
    this.pagina += 1;
    this._grade = { escala: 1, dx: 0, dy: 0 };
    if (encadernar && this.encadernacao) {
      const { interna, escala } = this.encadernacao;
      const lombadaAEsquerda = this.pagina % 2 === 1;
      const dx = lombadaAEsquerda ? interna - MARGEM.esq * escala : A4.largura - interna - (A4.largura - MARGEM.dir) * escala;
      const dy = (A4.altura / 2) * (1 - escala);
      this._grade = { escala, dx, dy };
      this.doc.transform(escala, 0, 0, escala, dx, dy);
    }
    return this.pagina;
  }

  /**
   * Um marcador de navegação (o índice lateral do leitor de PDF), apontando para a página em que
   * se está. Com `pai`, vira filho de outro marcador. Devolve o marcador, para ele receber filhos.
   */
  marcador(titulo, { pai = null } = {}) {
    const limpo = paraOPapel(titulo);
    this.marcadores.push({ titulo: limpo, pagina: this.pagina, nivel: pai ? 1 : 0 });
    return (pai ?? this.doc.outline).addItem(limpo);
  }

  // ── texto ──────────────────────────────────────────────────────────────────

  _fonte(fonte, tamanho, cor) {
    return this.doc.font(fonte).fontSize(tamanho).fillColor(cor);
  }

  /**
   * Um texto de uma fonte só. Devolve a altura que ocupou.
   * Opções: fonte, tamanho, cor, alinhar, espacamento (entre letras), entrelinha, opacidade e
   * `semViuva` (parágrafo que não fecha com uma palavra sozinha: ver `colarFim`).
   */
  texto(texto, x, y, largura, { fonte = FONTE.sans, tamanho = 9, cor = COR.texto, alinhar = "left", espacamento = 0, entrelinha = 0, opacidade = 1, semViuva = false } = {}) {
    const limpo = paraOPapel(texto);
    this._fonte(fonte, tamanho, cor);
    this.registrar(limpo, tamanho, fonte, x, y, largura, alinhar);
    this.doc.save();
    if (opacidade !== 1) this.doc.fillOpacity(opacidade);
    this.doc.text(semViuva ? colarFim(limpo) : limpo, x, y, { width: largura, align: alinhar, characterSpacing: espacamento, lineGap: entrelinha });
    this.doc.restore();
    return this.doc.y - y;
  }

  /**
   * Uma linha só, que CABE: reduz o corpo até o texto caber em `largura` (nunca abaixo de
   * `minimo`) e, se ainda não couber, corta com reticências. É o que protege a capa e os
   * cabeçalhos de um nome de unidade comprido.
   */
  textoAjustado(texto, x, y, largura, { tamanho = 9, minimo = 6.5, ...resto } = {}) {
    let limpo = paraOPapel(texto).replace(/\s+/g, " ").trim();
    const medir = (t, corpo) => this.largura(t, { fonte: resto.fonte, tamanho: corpo, espacamento: resto.espacamento });
    let corpo = tamanho;
    while (corpo > minimo && medir(limpo, corpo) > largura) corpo = Math.round((corpo - 0.25) * 100) / 100;
    if (medir(limpo, corpo) > largura) {
      while (limpo.length > 1 && medir(`${limpo}…`, corpo) > largura) limpo = limpo.slice(0, -1);
      limpo = `${limpo.trimEnd()}…`;
    }
    return this.texto(limpo, x, y, largura, { ...resto, tamanho: corpo });
  }

  /** A altura que o texto ocuparia, medida com a mesma fonte e a mesma largura. */
  altura(texto, largura, { fonte = FONTE.sans, tamanho = 9, espacamento = 0, entrelinha = 0, semViuva = false } = {}) {
    this._fonte(fonte, tamanho, COR.texto);
    const limpo = paraOPapel(texto);
    return this.doc.heightOfString((semViuva ? colarFim(limpo) : limpo) || " ", { width: largura, characterSpacing: espacamento, lineGap: entrelinha });
  }

  /** A largura de uma linha só. */
  largura(texto, { fonte = FONTE.sans, tamanho = 9, espacamento = 0 } = {}) {
    this._fonte(fonte, tamanho, COR.texto);
    return this.doc.widthOfString(paraOPapel(texto), { characterSpacing: espacamento });
  }

  /**
   * Corridas de fontes diferentes como UM parágrafo (um destaque em negrito seguido do texto).
   * Cada corrida: { texto, fonte, cor, tamanho? }. Devolve a altura. Com `semViuva`, o parágrafo
   * não fecha com uma palavra sozinha (o texto REGISTRADO para os testes continua sem a cola).
   */
  corridas(corridas, x, y, largura, { tamanho = 9, entrelinha = 0, alinhar = "left", semViuva = false } = {}) {
    const lista = corridas.map((c) => ({ ...c, texto: paraOPapel(c.texto) })).filter((c) => c.texto);
    if (!lista.length) return 0;
    lista.forEach((c, i) => {
      const corpo = c.tamanho ?? tamanho;
      this._fonte(c.fonte ?? FONTE.sans, corpo, c.cor ?? COR.texto);
      this.registrar(c.texto, corpo, c.fonte ?? FONTE.sans, x, y, largura, alinhar);
      const opcoes = { width: largura, continued: i < lista.length - 1, lineGap: entrelinha, align: alinhar };
      const ultima = i === lista.length - 1;
      const aDesenhar = semViuva && ultima ? colarFim(c.texto) : c.texto;
      // O primeiro trecho fixa a posição; os seguintes continuam dela.
      if (i === 0) this.doc.text(aDesenhar, x, y, opcoes);
      else this.doc.text(aDesenhar, opcoes);
    });
    return this.doc.y - y;
  }

  /**
   * A altura de corridas. O caso comum — um destaque em negrito e o texto, que corre logo depois
   * dele na mesma linha — é medido como um recuo de primeira linha: exatamente como é desenhado.
   * Qualquer outro caso é medido com a fonte mais larga (o negrito), para nunca subestimar.
   */
  alturaDeCorridas(corridas, largura, { tamanho = 9, entrelinha = 0, semViuva = false } = {}) {
    const limpas = corridas.map((c) => ({ ...c, texto: paraOPapel(c.texto) })).filter((c) => c.texto);
    if (limpas.length === 2) {
      const [primeira, segunda] = limpas;
      this._fonte(primeira.fonte ?? FONTE.sans, primeira.tamanho ?? tamanho, COR.texto);
      const recuo = this.doc.widthOfString(primeira.texto);
      this._fonte(segunda.fonte ?? FONTE.sans, segunda.tamanho ?? tamanho, COR.texto);
      return this.doc.heightOfString(semViuva ? colarFim(segunda.texto) : segunda.texto, { width: largura, indent: recuo, lineGap: entrelinha });
    }
    const juntas = corridas.map((c) => paraOPapel(c.texto)).join("");
    const larga = corridas.find((c) => /Bold|Extra|Semi/.test(c.fonte ?? "")) ?? corridas[0];
    this._fonte(larga?.fonte ?? FONTE.sans, tamanho, COR.texto);
    return this.doc.heightOfString((semViuva ? colarFim(juntas) : juntas) || " ", { width: largura, lineGap: entrelinha });
  }

  registrar(texto, tamanho, fonte, x, y, largura, alinhar) {
    const r = (n) => Math.round(n * 10) / 10;
    const { escala, dx } = this._grade;
    // `x` e `largura` são as do desenho; `xFisico` e `larguraFisica`, as do papel (depois da margem de encadernação).
    this.textos.push({ pagina: this.pagina, texto, tamanho, fonte, x: r(x), y: r(y), largura: r(largura), alinhar, xFisico: r(dx + escala * x), larguraFisica: r(escala * largura) });
  }

  // ── formas ─────────────────────────────────────────────────────────────────

  linha(x1, y1, x2, y2, { cor = COR.linha, espessura = 0.7, tracejado = null, ponta = "butt", opacidade = 1 } = {}) {
    const d = this.doc.save().lineWidth(espessura).strokeColor(cor).lineCap(ponta);
    if (opacidade !== 1) d.strokeOpacity(opacidade);
    if (tracejado) d.dash(tracejado[0], { space: tracejado[1] });
    d.moveTo(x1, y1).lineTo(x2, y2).stroke();
    d.restore();
  }

  /** Retângulo, com cantos arredondados se `raio`, preenchimento e/ou borda. */
  caixa(x, y, w, h, { preenchimento = null, borda = null, espessura = 0.7, raio = 0, opacidade = 1 } = {}) {
    const d = this.doc.save();
    if (opacidade !== 1) d.fillOpacity(opacidade).strokeOpacity(opacidade);
    if (raio) d.roundedRect(x, y, w, h, raio);
    else d.rect(x, y, w, h);
    if (preenchimento && borda) d.lineWidth(espessura).fillAndStroke(preenchimento, borda);
    else if (preenchimento) d.fill(preenchimento);
    else if (borda) d.lineWidth(espessura).stroke(borda);
    d.restore();
  }

  /** Um caminho SVG (absoluto) preenchido e/ou contornado. */
  caminho(d, { preenchimento = null, borda = null, espessura = 0.7, opacidade = 1, regra = "nonzero" } = {}) {
    const doc = this.doc.save();
    if (opacidade !== 1) doc.fillOpacity(opacidade).strokeOpacity(opacidade);
    doc.path(d);
    if (preenchimento && borda) doc.lineWidth(espessura).fillAndStroke(preenchimento, borda);
    else if (preenchimento) doc.fill(preenchimento, regra);
    else if (borda) doc.lineWidth(espessura).stroke(borda);
    doc.restore();
  }

  circulo(cx, cy, r, { preenchimento = null, borda = null, espessura = 0.7, tracejado = null, opacidade = 1 } = {}) {
    const d = this.doc.save();
    if (opacidade !== 1) d.fillOpacity(opacidade).strokeOpacity(opacidade);
    if (tracejado) d.dash(tracejado[0], { space: tracejado[1] });
    d.circle(cx, cy, r);
    if (preenchimento && borda) d.lineWidth(espessura).fillAndStroke(preenchimento, borda);
    else if (preenchimento) d.fill(preenchimento);
    else if (borda) d.lineWidth(espessura).stroke(borda);
    d.restore();
  }

  /** Uma estrela de quatro pontas (as do desenho do templo). */
  estrela(cx, cy, r, { cor = COR.ouro, opacidade = 1 } = {}) {
    const k = r * 0.2;
    this.caminho(
      `M ${cx} ${cy - r} L ${cx + k} ${cy - k} L ${cx + r} ${cy} L ${cx + k} ${cy + k} L ${cx} ${cy + r} L ${cx - k} ${cy + k} L ${cx - r} ${cy} L ${cx - k} ${cy - k} Z`,
      { preenchimento: cor, opacidade },
    );
  }

  losango(cx, cy, r, { preenchimento = COR.ouro, borda = null, opacidade = 1 } = {}) {
    this.caminho(`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`, { preenchimento, borda, opacidade });
  }

  /** Um fio com um losango no meio, centrado em `cx`. */
  ornamento(cx, y, largura, { cor = COR.ouro, vao = 14, espessura = 0.8 } = {}) {
    const meia = largura / 2;
    this.linha(cx - meia, y, cx - vao, y, { cor, espessura });
    this.linha(cx + vao, y, cx + meia, y, { cor, espessura });
    this.losango(cx, y, 3.2, { preenchimento: cor });
  }

  /** Janela em arco (base reta, topo em meia-volta): o arco do templo. */
  caminhoDoArco(x, y, w, h) {
    const r = w / 2;
    return `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
  }

  gradienteLinear(x1, y1, x2, y2, paradas) {
    const g = this.doc.linearGradient(x1, y1, x2, y2);
    for (const [pos, cor, opacidade] of paradas) g.stop(pos, cor, opacidade ?? 1);
    return g;
  }

  gradienteRadial(cx, cy, r, paradas) {
    const g = this.doc.radialGradient(cx, cy, 0, cx, cy, r);
    for (const [pos, cor, opacidade] of paradas) g.stop(pos, cor, opacidade ?? 1);
    return g;
  }

  /** Preenche um retângulo com um gradiente já montado. */
  preencher(x, y, w, h, gradiente) {
    this.doc.save().rect(x, y, w, h).fill(gradiente).restore();
  }

  /** Desenha a imagem pelo nome (`logo`, `templo`), pela largura OU pela altura. */
  imagem(nome, x, y, { largura, altura, opacidade = 1 } = {}) {
    const img = this.imagens[nome];
    if (!img) throw new Error(`Imagem desconhecida: ${nome}`);
    const d = this.doc.save();
    if (opacidade !== 1) d.opacity(opacidade);
    d.image(img, x, y, largura ? { width: largura } : { height: altura });
    d.restore();
    const proporcao = img.width / img.height;
    return largura ? { largura, altura: largura / proporcao } : { largura: altura * proporcao, altura };
  }

  /** Dentro de `desenhar`, tudo que se pinta é recortado pelo caminho. */
  recortado(caminhoSvg, desenhar) {
    this.doc.save();
    this.doc.path(caminhoSvg).clip();
    desenhar();
    this.doc.restore();
  }

  // ── peças da casa ──────────────────────────────────────────────────────────

  /** O rótulo de uma seção: quadradinho dourado e título em caixa alta, como nas agendas. */
  rotulo(texto, x, y, { cor = COR.ouroEscuro, tamanho = 7.6 } = {}) {
    this.caixa(x, y + 0.4, 5, 5, { preenchimento: COR.ouro, raio: 1.2 });
    return this.texto(texto.toUpperCase(), x + 10, y, 360, { fonte: FONTE.sansNegrito, tamanho, cor, espacamento: 0.9 });
  }

  /** A linha onde se escreve à mão. */
  escrita(x, y, w) {
    this.linha(x, y, x + w, y, { cor: COR.escrita, espessura: 0.6 });
  }

  /** Um quadradinho de marcar. */
  quadradinho(x, y, lado = 8.5) {
    this.caixa(x, y, lado, lado, { borda: COR.escrita, espessura: 0.9, raio: 1.6 });
  }

  /** O tamanho mínimo que o desenhista admite para texto de leitura (para os testes). */
  static get PISO() {
    return PISO_DE_LEITURA;
  }

  get largura_da_pagina() {
    return A4.largura;
  }
}
