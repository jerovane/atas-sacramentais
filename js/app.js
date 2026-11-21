import { CONFIG } from "./config.js";
import { conferir, criarCredencial, encerrarSessao, enderecoMascarado, iniciarSessao, linkDeRecuperacao, sessaoValida } from "./acesso.js";
import { MESES, TIPO, anoValido, dataPorExtenso, planejarAno, lerIso } from "./calendario.js";
import { contarPaginas } from "./pdf/livro.js";
import { carregarPdfkit, carregarRecursos, nomeParaArquivo } from "./navegador.js";
import { LIMITE_DE_UNIDADES_CADASTRADAS, MENSAGEM_DO_ERRO, TAMANHO_MAXIMO_DO_NOME, guardarUnidadesCadastradas, interpretarUnidade, lerUnidadesCadastradas, linhasParaConfig, montarUnidade, todasAsUnidades } from "./unidades.js";

/**
 * A tela: entrar, escolher unidade e ano, conferir os domingos e baixar o caderno.
 *
 * Duas telas só (entrar e gerar) e uma janela (trocar a senha). O que a pessoa escolhe fica em
 * `estado`; cada mudança atualiza só as regiões que dependem dela, para o foco do teclado nunca
 * pular. Todo texto que vem da pessoa (o nome de uma unidade que ela digita) entra na página por
 * `textContent` ou por `esc`, nunca como HTML.
 */

const raiz = document.getElementById("app");
const acoesDoTopo = document.getElementById("acoes-do-topo");

const esc = (texto) => String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// ── armazenamento (que pode recusar: navegação privada, bloqueio de cookies) ──

function memoria() {
  const dados = new Map();
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k) };
}

const armazens = (() => {
  try {
    return { sessao: window.sessionStorage, local: window.localStorage };
  } catch {
    return { sessao: memoria(), local: memoria() };
  }
})();

// ── o que a pessoa escolheu ───────────────────────────────────────────────────

const CHAVE_DA_ENCADERNACAO = "atas.encadernacao";

/** A margem maior do lado dos furos vem LIGADA (é o que a estaca pediu); a pessoa desliga e o aparelho lembra. */
function lerEncadernacao() {
  try {
    return armazens.local.getItem(CHAVE_DA_ENCADERNACAO) !== "nao";
  } catch {
    return true;
  }
}

/** De outubro em diante, o ano que se prepara é o próximo. */
function anoPadrao() {
  const hoje = new Date();
  return hoje.getMonth() >= 9 ? hoje.getFullYear() + 1 : hoje.getFullYear();
}

const estado = {
  unidade: "Ala Pacajus 1",
  cadastradas: lerUnidadesCadastradas(armazens.local, CONFIG.unidades),
  ano: anoPadrao(),
  ajustes: {},
  encadernacao: lerEncadernacao(),
  ocupado: false,
  tentativas: 0,
};

const NOVA_UNIDADE = "__nova";
const CICLO = [TIPO.NORMAL, TIPO.SEM_REUNIAO, TIPO.TESTEMUNHOS];

/** As unidades para escolher: as oficiais e as cadastradas neste aparelho. */
const unidadesDisponiveis = () => todasAsUnidades(CONFIG.unidades, estado.cadastradas);

function unidadeAtual() {
  const lista = unidadesDisponiveis();
  return lista.find((u) => u.nome === estado.unidade) ?? lista[0];
}

const planoAtual = () => planejarAno(estado.ano, { ajustes: estado.ajustes });

// ── a tela de entrar ──────────────────────────────────────────────────────────

function mostrarEntrada() {
  acoesDoTopo.hidden = true;
  const recuperacao = CONFIG.recuperacao;
  raiz.innerHTML = `
    <section class="entrada" aria-labelledby="titulo-da-entrada">
      <div class="entrada__apresentacao">
        <span class="entrada__selo">${esc(CONFIG.estaca.nome)}</span>
        <h1 class="entrada__titulo" id="titulo-da-entrada">Atas da Reunião Sacramental</h1>
        <p class="entrada__texto">Escolha a unidade e o ano. O caderno completo — capa, orientações, calendário e uma ata para cada domingo, frente e verso — sai pronto para imprimir.</p>
        <img class="entrada__templo" src="assets/marca/templo-web.png" alt="" width="720" height="570" />
      </div>
      <div class="cartao entrada__cartao">
        <h2>Entrar</h2>
        <p class="cartao__ajuda">Acesso das unidades da estaca.</p>
        <form id="formulario-de-entrada" novalidate>
          <div class="campo">
            <label class="rotulo" for="login">Número da estaca</label>
            <input class="entrada-de-texto" id="login" name="login" inputmode="numeric" autocomplete="username" value="${esc(CONFIG.estaca.numero)}" />
          </div>
          <div class="campo">
            <label class="rotulo" for="senha">Senha</label>
            <div class="com-botao">
              <input class="entrada-de-texto" id="senha" name="senha" type="password" autocomplete="current-password" />
              <button type="button" data-acao="ver-senha" aria-pressed="false">Mostrar</button>
            </div>
          </div>
          <label class="opcao-marcavel campo"><input type="checkbox" id="lembrar" /> Manter conectado neste aparelho</label>
          <div class="aviso aviso--erro campo" id="erro-de-entrada" role="alert" hidden></div>
          <button class="botao botao--escuro botao--largo" type="submit" id="botao-de-entrar">Entrar</button>
        </form>
        <div class="entrada__rodape">
          <a class="link" id="esqueci-a-senha" href="${esc(linkDeRecuperacao(recuperacao))}">Esqueci a senha</a>
          <span class="campo__dica">O pedido vai para ${esc(enderecoMascarado(recuperacao.destino))}</span>
        </div>
      </div>
    </section>`;
  document.getElementById("senha").focus({ preventScroll: true });
}

async function entrar(evento) {
  evento.preventDefault();
  const botao = document.getElementById("botao-de-entrar");
  const erro = document.getElementById("erro-de-entrada");
  const login = document.getElementById("login").value;
  const campoSenha = document.getElementById("senha");
  botao.disabled = true;
  botao.textContent = "Conferindo…";
  erro.hidden = true;
  try {
    const certo = await conferir({ login, senha: campoSenha.value }, CONFIG.acesso);
    if (certo) {
      iniciarSessao(armazens, CONFIG.acesso, { lembrar: document.getElementById("lembrar").checked, agora: Date.now() });
      estado.tentativas = 0;
      mostrarGerador();
      return;
    }
    estado.tentativas += 1;
    // Cada erro seguido espera um pouco mais: não impede nada de verdade, mas tira a graça de tentar em série.
    await esperar(Math.min(estado.tentativas, 5) * 350);
    erro.textContent = "O número da estaca ou a senha não conferem. Confira e tente de novo; se esqueceu, use “Esqueci a senha”.";
    erro.hidden = false;
    campoSenha.value = "";
    campoSenha.focus();
  } catch {
    erro.textContent = "Não consegui conferir a senha neste navegador. Use o endereço seguro do site (começa com https) e um navegador atual.";
    erro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
}

// ── a tela de gerar ───────────────────────────────────────────────────────────

function mostrarGerador() {
  acoesDoTopo.hidden = false;
  const opcoes = CONFIG.unidades.map((u) => `<option value="${esc(u.nome)}">${esc(u.nome)}</option>`).join("");
  raiz.innerHTML = `
    <div class="gerador__abertura">
      <h1>Monte o caderno de atas</h1>
      <p>Escolha a unidade e o ano. O motor conta os domingos, separa os de jejum e testemunhos e prepara uma ata para cada um, frente e verso.</p>
    </div>
    <div class="gerador">
      <div class="gerador__principal">
        <section class="cartao" aria-labelledby="t-unidade">
          <h2 class="cartao__titulo" id="t-unidade"><span class="cartao__passo" aria-hidden="true">1</span>Unidade</h2>
          <p class="cartao__ajuda">O nome da unidade vai na capa e no cabeçalho de cada folha.</p>
          <div class="campo">
            <label class="rotulo" for="unidade">Unidade</label>
            <select class="selecao" id="unidade"></select>
            <p class="campo__dica">Falta uma ala, um ramo ou um grupo na lista? <button type="button" class="link-botao" data-acao="gerenciar-unidades">Cadastrar ou remover unidades</button></p>
          </div>
        </section>

        <section class="cartao" aria-labelledby="t-ano">
          <h2 class="cartao__titulo" id="t-ano"><span class="cartao__passo" aria-hidden="true">2</span>Ano</h2>
          <p class="cartao__ajuda">Escolha o ano do caderno. O motor descobre quantas atas são e para quais domingos.</p>
          <div class="ano">
            <button type="button" data-acao="ano-menos" aria-label="Ano anterior">−</button>
            <input class="entrada-de-texto" id="ano" inputmode="numeric" maxlength="4" aria-label="Ano" />
            <button type="button" data-acao="ano-mais" aria-label="Próximo ano">+</button>
          </div>
          <div class="aviso aviso--erro campo" id="erro-do-ano" role="alert" hidden style="margin-top: 12px"></div>
        </section>

        <section class="cartao" aria-labelledby="t-domingos">
          <h2 class="cartao__titulo" id="t-domingos"><span class="cartao__passo" aria-hidden="true">3</span>Domingos</h2>
          <p class="cartao__ajuda">Confira o que o motor encontrou. Para trocar um domingo, toque nele.</p>
          <div class="resumo" id="resumo"></div>
          <ul class="legenda" aria-label="Legenda">
            <li><span class="dom dom--testemunhos"></span> Jejum e testemunhos</li>
            <li><span class="dom dom--normal"></span> Reunião com oradores</li>
            <li><span class="dom dom--sem-reuniao"></span> Sem reunião (conferência)</li>
            <li><span class="dom dom--normal dom--ajustado"></span> Trocado por você</li>
          </ul>
          <div class="meses" id="meses"></div>
          <div class="ajustes"><span id="info-dos-ajustes"></span><button type="button" data-acao="limpar-ajustes" id="limpar-ajustes" hidden>Desfazer minhas trocas</button></div>
          <div class="aviso aviso--info" id="aviso-de-conferencia" style="margin-top: 14px"></div>
        </section>

        <section class="cartao" aria-labelledby="t-caderno">
          <h2 class="cartao__titulo" id="t-caderno"><span class="cartao__passo" aria-hidden="true">4</span>Caderno</h2>
          <p class="cartao__ajuda">O que vai no PDF:</p>
          <ul class="conteudo" id="conteudo"></ul>
          <label class="opcao" for="encadernacao">
            <input type="checkbox" id="encadernacao" ${estado.encadernacao ? "checked" : ""} />
            <span><strong>Margem maior do lado dos furos</strong> (pasta de 2 ou 4 furos). Desmarque para encadernação espiral ou grampo.</span>
          </label>
          <div class="acoes">
            <button type="button" class="botao botao--primario" id="baixar" data-acao="baixar">Baixar o PDF</button>
            <button type="button" class="botao botao--contorno" id="abrir" data-acao="abrir">Abrir para conferir</button>
          </div>
          <div class="aviso campo" id="mensagem" role="status" aria-live="polite" hidden style="margin-top: 14px; margin-bottom: 0"></div>
          <p class="acoes__nota">Para imprimir: frente e verso, virando pela borda maior (o verso de cada folha já vem na página seguinte). Papel A4.</p>
        </section>
      </div>

      <aside class="previa" aria-label="A capa do caderno">
        <div class="capa" id="capa" role="img" aria-label="Prévia da capa do caderno">
          <div class="capa__moldura"></div>
          <p class="capa__estaca">${esc(CONFIG.estaca.nome)}</p>
          <span class="capa__fio capa__fio--alto"></span>
          <img class="capa__templo" src="assets/marca/templo-web.png" alt="" />
          <p class="capa__ata">Ata da</p>
          <p class="capa__titulo">Reunião Sacramental</p>
          <span class="capa__fio capa__fio--baixo"></span>
          <p class="capa__unidade" id="capa-unidade"></p>
          <p class="capa__ano" id="capa-ano"></p>
          <div class="capa__faixa"></div>
          <img class="capa__logo" src="assets/marca/logo-estaca.png" alt="" />
          <p class="capa__igreja">A Igreja de Jesus Cristo dos Santos dos Últimos Dias</p>
        </div>
        <p class="previa__legenda">A capa deste caderno</p>
      </aside>
    </div>`;
  desenharUnidades();
  document.getElementById("ano").value = String(estado.ano);
  atualizar();
}

/** Redesenha o que depende do que a pessoa escolheu. */
function atualizar() {
  const unidade = unidadeAtual();
  const anoOk = anoValido(estado.ano);
  const anoForaDoLimite = Number.isFinite(estado.ano) && !anoOk;
  document.getElementById("erro-do-ano").hidden = !anoForaDoLimite;
  if (anoForaDoLimite) document.getElementById("erro-do-ano").textContent = "Escolha um ano entre 2000 e 2099.";

  document.getElementById("capa-unidade").textContent = unidade?.nome ?? "Nome da unidade";
  document.getElementById("capa-ano").textContent = anoOk ? String(estado.ano) : "";

  if (anoOk) {
    const plano = planoAtual();
    desenharResumo(plano);
    desenharMeses(plano);
    desenharConteudo(plano);
    desenharAvisoDeConferencia(plano);
  }
  const quantas = Object.keys(estado.ajustes).length;
  document.getElementById("limpar-ajustes").hidden = quantas === 0;
  document.getElementById("info-dos-ajustes").textContent = quantas ? `${quantas} ${quantas === 1 ? "troca sua" : "trocas suas"} em relação ao calendário do motor.` : "";

  const pronto = Boolean(unidade) && anoOk && !estado.ocupado;
  document.getElementById("baixar").disabled = !pronto;
  document.getElementById("abrir").disabled = !pronto;
}

function desenharResumo(plano) {
  const r = plano.resumo;
  const itens = [
    [r.atas, "atas neste caderno", false],
    [r.testemunhos, "de jejum e testemunhos", true],
    [r.normais, "com oradores", false],
    [r.semReuniao, r.semReuniao === 1 ? "domingo sem reunião" : "domingos sem reunião", false],
  ];
  document.getElementById("resumo").innerHTML = itens
    .map(([n, rotulo, ouro]) => `<div class="resumo__item${ouro ? " resumo__item--ouro" : ""}"><span class="resumo__numero">${n}</span><span class="resumo__rotulo">${rotulo}</span></div>`)
    .join("");
}

const ROTULO_DO_TIPO = {
  [TIPO.TESTEMUNHOS]: "jejum e testemunhos",
  [TIPO.NORMAL]: "reunião com oradores",
  [TIPO.SEM_REUNIAO]: "sem reunião",
};

function desenharMeses(plano) {
  const html = [];
  for (let mes = 1; mes <= 12; mes++) {
    const domingos = plano.domingos.filter((d) => d.mes === mes);
    const notas = [];
    const botoes = domingos
      .map((d) => {
        const ajustado = d.iso in estado.ajustes;
        if (d.tipo === TIPO.SEM_REUNIAO) notas.push(d.motivo === "conferencia-geral" ? `Conferência Geral: dia ${d.dia}.` : `Sem reunião: dia ${d.dia}.`);
        else if (d.remarcado) notas.push(`Jejum remarcado: dia ${d.dia}.`);
        const rotulo = `${dataPorExtenso(d.iso)}: ${ROTULO_DO_TIPO[d.tipo]}${d.ordem ? `, ata ${d.ordem}` : ""}${ajustado ? ", trocado por você" : ""}. Toque para alterar.`;
        return `<button type="button" class="dom dom--${d.tipo}${ajustado ? " dom--ajustado" : ""}" data-iso="${d.iso}" aria-label="${esc(rotulo)}" title="${esc(`${ROTULO_DO_TIPO[d.tipo]}${d.ordem ? ` · ata ${d.ordem}` : ""}`)}">${d.dia}</button>`;
      })
      .join("");
    html.push(`<div class="mes"><h3>${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)}</h3><div class="domingos">${botoes}</div>${notas.length ? `<p class="mes__nota">${esc(notas.join(" "))}</p>` : ""}</div>`);
  }
  document.getElementById("meses").innerHTML = html.join("");
}

function desenharConteudo(plano) {
  const r = plano.resumo;
  const paginas = contarPaginas(plano);
  document.getElementById("conteudo").innerHTML = `
    <li><span><strong>Capa</strong> com a unidade e o ano, e a <strong>contracapa</strong> com as orientações do Manual Geral e uma citação sobre o sacramento.</span></li>
    <li><span><strong>Instruções do discurso do Presidente Oaks</strong>, para líderes e membros, com a reverência de quem dirige em destaque.</span></li>
    <li><span><strong>Calendário do ano</strong>, domingo a domingo, com o número de cada ata.</span></li>
    <li><span><strong>${r.atas} atas</strong>, frente e verso: ${r.testemunhos} de jejum e testemunhos e ${r.normais} com oradores.</span></li>
    <li><span>Uma <strong>folha de anotações</strong> e a <strong>capa de trás</strong>, com uma escritura sobre o sacramento.</span></li>
    <li><span><strong>${paginas} páginas</strong> no total (${paginas / 2} folhas para imprimir frente e verso).</span></li>`;
}

function desenharAvisoDeConferencia(plano) {
  const { datas, estimado } = plano.conferenciaGeral;
  const formatar = (iso) => {
    const d = lerIso(iso);
    return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  };
  const aviso = document.getElementById("aviso-de-conferencia");
  const remarcados = plano.domingos.filter((d) => d.remarcado);
  const sobreOJejum = remarcados.length
    ? ` O jejum e testemunhos dos meses em que o primeiro domingo teve conferência foi marcado no domingo seguinte, como a estaca costuma fazer; o Manual Geral diz que a presidência da estaca define esse domingo, então, se ela definiu outro, toque nele para trocar.`
    : "";
  aviso.textContent = estimado
    ? `As datas da Conferência Geral de ${estado.ano} (${formatar(datas[0])} e ${formatar(datas[1])}) foram ESTIMADAS: ainda não constam da tabela oficial deste motor. Confira e, se preciso, toque no domingo para ajustar. Se a estaca tem conferência de estaca, toque no domingo dela e escolha “sem reunião”.`
    : `Conferência Geral de ${estado.ano}: ${formatar(datas[0])} e ${formatar(datas[1])}, sem reunião sacramental na unidade. Se a estaca tem conferência de estaca, toque no domingo dela até aparecer “sem reunião”.`;
  aviso.textContent += sobreOJejum;
}

/** Troca o tipo de um domingo: oradores → sem reunião → jejum e testemunhos → oradores. */
function alternarDomingo(iso) {
  const atual = planoAtual().domingos.find((d) => d.iso === iso)?.tipo;
  if (!atual) return;
  const proximo = CICLO[(CICLO.indexOf(atual) + 1) % CICLO.length];
  // Só vira "troca" se o resultado difere do que o motor faria SEM esta troca (com as outras valendo):
  // é o que impede uma troca de ficar presa quando o motor já remarcou o jejum para este dia.
  const outras = { ...estado.ajustes };
  delete outras[iso];
  const semEsta = planejarAno(estado.ano, { ajustes: outras }).domingos.find((d) => d.iso === iso).tipo;
  if (proximo === semEsta) delete estado.ajustes[iso];
  else estado.ajustes[iso] = proximo;
  atualizar();
  document.querySelector(`.dom[data-iso="${iso}"]`)?.focus();
}

// ── gerar o PDF ───────────────────────────────────────────────────────────────

function mostrarMensagem(tipo, texto) {
  const caixa = document.getElementById("mensagem");
  caixa.className = `aviso aviso--${tipo}`;
  caixa.textContent = texto;
  caixa.hidden = !texto;
}

/**
 * A aba nova nasce em branco e fica à frente por alguns segundos, enquanto o caderno é montado:
 * escreve nela que está andando, para quem clicou não achar que travou.
 */
function avisarNaAba(aba) {
  try {
    aba.document.title = "Preparando o caderno…";
    const corpo = aba.document.body;
    corpo.style.cssText =
      "margin:0;min-height:100vh;box-sizing:border-box;padding:24px;display:grid;place-items:center;text-align:center;background:#eef2f3;color:#07333a;font:600 17px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif";
    corpo.textContent = "Preparando o caderno… são uns segundos. Esta aba mostra o PDF em seguida.";
  } catch {
    // a aba em branco serve do mesmo jeito
  }
}

async function gerar(modo) {
  const unidade = unidadeAtual();
  if (!unidade || !anoValido(estado.ano) || estado.ocupado) return;
  // O navegador só deixa abrir uma aba nova dentro do toque; depois do `await` já seria tarde.
  const aba = modo === "abrir" ? window.open("", "_blank") : null;
  if (aba) avisarNaAba(aba);
  estado.ocupado = true;
  atualizar();
  const botao = document.getElementById(modo === "abrir" ? "abrir" : "baixar");
  const textoOriginal = botao.textContent;
  botao.innerHTML = '<span class="girando" aria-hidden="true"></span> Preparando…';
  mostrarMensagem("info", "Preparando o caderno. São uns segundos; não feche a página.");
  try {
    const [PDFDocument, recursos, { gerarLivro }] = await Promise.all([carregarPdfkit(), carregarRecursos(), import("./pdf/livro.js")]);
    const { bytes, paginas } = await gerarLivro({
      PDFDocument,
      recursos,
      unidade,
      estaca: CONFIG.estaca,
      ano: estado.ano,
      ajustes: estado.ajustes,
      geradoEm: new Date(),
      margemDeEncadernacao: estado.encadernacao,
    });
    const blob = new Blob([bytes], { type: "application/pdf" });
    const endereco = URL.createObjectURL(blob);
    const nome = `atas-sacramentais-${estado.ano}-${nomeParaArquivo(unidade.nome)}.pdf`;
    const tamanho = bytes.length > 1048576 ? `${(bytes.length / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.round(bytes.length / 1024)} KB`;
    if (modo === "abrir") {
      if (aba) aba.location.href = endereco;
      else window.open(endereco, "_blank");
      mostrarMensagem("ok", `Caderno aberto em outra aba (${paginas} páginas, ${tamanho}). Se não abriu, o navegador bloqueou a janela: use “Baixar o PDF”.`);
    } else {
      const link = document.createElement("a");
      link.href = endereco;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      mostrarMensagem("ok", `Pronto: ${nome} (${paginas} páginas, ${tamanho}). Procure na pasta de downloads.`);
    }
    setTimeout(() => URL.revokeObjectURL(endereco), 120_000);
  } catch (erro) {
    aba?.close();
    mostrarMensagem("erro", `Não consegui montar o caderno: ${erro.message}`);
  } finally {
    estado.ocupado = false;
    botao.textContent = textoOriginal;
    atualizar();
  }
}

// ── as unidades ───────────────────────────────────────────────────────────────

/** Redesenha o seletor: as oficiais, as cadastradas neste aparelho e a opção de cadastrar outra. */
function desenharUnidades() {
  const seletor = document.getElementById("unidade");
  if (!seletor) return;
  const opcao = (u) => `<option value="${esc(u.nome)}">${esc(u.nome)}</option>`;
  const cadastradas = estado.cadastradas.length ? `<optgroup label="Cadastradas neste aparelho">${estado.cadastradas.map(opcao).join("")}</optgroup>` : "";
  seletor.innerHTML = `${CONFIG.unidades.map(opcao).join("")}${cadastradas}<option value="${NOVA_UNIDADE}">＋ Cadastrar nova unidade…</option>`;
  estado.unidade = unidadeAtual().nome; // se a escolhida foi removida, cai na primeira
  seletor.value = estado.unidade;
}

/** A janela de cadastrar (e remover) unidades. */
function abrirGerenciadorDeUnidades() {
  const janela = document.createElement("dialog");
  janela.setAttribute("aria-labelledby", "t-unidades");
  janela.innerHTML = `
    <div class="janela">
      <h2 id="t-unidades">Unidades da estaca</h2>
      <p class="cartao__ajuda">Cadastre uma ala, um ramo ou um grupo que ainda não está na lista. Ela fica salva neste aparelho e já aparece para escolher.</p>
      <form id="formulario-de-unidade" novalidate>
        <div class="dupla">
          <div class="campo">
            <label class="rotulo" for="nova-unidade-nome">Nome da unidade</label>
            <input class="entrada-de-texto" id="nova-unidade-nome" maxlength="${TAMANHO_MAXIMO_DO_NOME}" autocomplete="off" placeholder="Ex.: Cascavel" />
          </div>
          <div class="campo">
            <span class="rotulo" id="r-tipo-unidade">Tipo</span>
            <div class="tipo-de-unidade" role="radiogroup" aria-labelledby="r-tipo-unidade">
              <label class="opcao-marcavel"><input type="radio" name="nova-unidade-tipo" value="ala" checked /> Ala</label>
              <label class="opcao-marcavel"><input type="radio" name="nova-unidade-tipo" value="ramo" /> Ramo</label>
              <label class="opcao-marcavel"><input type="radio" name="nova-unidade-tipo" value="grupo" /> Grupo</label>
            </div>
          </div>
        </div>
        <p class="campo__dica" id="previa-da-unidade" aria-live="polite"></p>
        <div class="aviso aviso--erro campo" id="erro-da-unidade" role="alert" hidden></div>
        <div class="aviso aviso--ok campo" id="ok-da-unidade" role="status" hidden></div>
        <button type="submit" class="botao botao--primario">Cadastrar unidade</button>
      </form>
      <h3 class="janela__subtitulo">Cadastradas neste aparelho</h3>
      <ul class="unidades-cadastradas" id="lista-de-cadastradas"></ul>
      <div id="bloco-das-linhas" hidden>
        <p class="cartao__ajuda" style="margin-top: 16px">Para a unidade aparecer em <strong>todos</strong> os aparelhos, cole as linhas abaixo em <strong>js/config.js</strong>, dentro de <strong>unidades: [ … ]</strong>, e salve no GitHub (<strong>Commit changes</strong>). Depois disso a cópia deste aparelho some sozinha.</p>
        <textarea class="codigo" id="linhas-das-unidades" readonly spellcheck="false" style="min-height: 88px"></textarea>
        <div class="janela__acoes" style="margin-top: 10px"><button type="button" class="botao botao--contorno botao--pequeno" id="copiar-linhas">Copiar as linhas</button></div>
      </div>
      <div class="janela__acoes"><button type="button" class="botao botao--contorno" id="fechar-unidades">Fechar</button></div>
    </div>`;
  document.body.append(janela);
  const por = (id) => janela.querySelector(`#${id}`);
  const tipoMarcado = () => janela.querySelector('input[name="nova-unidade-tipo"]:checked').value;

  const mostrarPrevia = () => {
    const montada = montarUnidade({ nome: por("nova-unidade-nome").value, tipo: tipoMarcado() });
    por("previa-da-unidade").innerHTML = montada
      ? `Será cadastrada como: <strong>${esc(montada.nome)}</strong>`
      : "O nome fica assim na capa e em cada folha. Se você escrever “Ala”, “Ramo” ou “Grupo” no começo, o tipo já fica definido.";
    // O nome decide o tipo: a marcação acompanha, para a pessoa ver o que vai valer.
    if (montada) janela.querySelector(`input[name="nova-unidade-tipo"][value="${montada.tipo}"]`).checked = true;
  };

  const desenharLista = () => {
    const lista = por("lista-de-cadastradas");
    lista.replaceChildren();
    if (!estado.cadastradas.length) {
      const vazio = document.createElement("li");
      vazio.className = "unidades-cadastradas__vazio";
      vazio.textContent = "Nenhuma ainda.";
      lista.append(vazio);
    }
    for (const unidade of estado.cadastradas) {
      const item = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = unidade.nome;
      const remover = document.createElement("button");
      remover.type = "button";
      remover.className = "botao botao--contorno botao--pequeno";
      remover.textContent = "Remover";
      remover.setAttribute("aria-label", `Remover ${unidade.nome}`);
      remover.addEventListener("click", () => {
        estado.cadastradas = estado.cadastradas.filter((u) => u.nome !== unidade.nome);
        guardarUnidadesCadastradas(armazens.local, estado.cadastradas);
        desenharUnidades();
        atualizar();
        desenharLista();
        por("ok-da-unidade").hidden = true;
      });
      item.append(nome, remover);
      lista.append(item);
    }
    por("bloco-das-linhas").hidden = estado.cadastradas.length === 0;
    por("linhas-das-unidades").value = linhasParaConfig(estado.cadastradas);
  };

  por("formulario-de-unidade").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const erro = por("erro-da-unidade");
    const ok = por("ok-da-unidade");
    erro.hidden = true;
    ok.hidden = true;
    const r = interpretarUnidade({ nome: por("nova-unidade-nome").value, tipo: tipoMarcado() }, { existentes: unidadesDisponiveis(), cadastradas: estado.cadastradas.length });
    if (!r.ok) {
      erro.textContent = MENSAGEM_DO_ERRO[r.erro];
      erro.hidden = false;
      por("nova-unidade-nome").focus();
      return;
    }
    estado.cadastradas = [...estado.cadastradas, r.unidade];
    const guardou = guardarUnidadesCadastradas(armazens.local, estado.cadastradas);
    estado.unidade = r.unidade.nome;
    desenharUnidades();
    atualizar();
    desenharLista();
    por("nova-unidade-nome").value = "";
    mostrarPrevia();
    ok.textContent = guardou
      ? `“${r.unidade.nome}” cadastrada e escolhida.`
      : `“${r.unidade.nome}” cadastrada e escolhida, mas este navegador não deixa guardar dados: ela vale só até fechar a página. Use as linhas abaixo para torná-la permanente.`;
    ok.hidden = false;
  });
  por("nova-unidade-nome").addEventListener("input", mostrarPrevia);
  janela.querySelectorAll('input[name="nova-unidade-tipo"]').forEach((radio) => radio.addEventListener("change", mostrarPrevia));
  por("copiar-linhas").addEventListener("click", async () => {
    const campo = por("linhas-das-unidades");
    try {
      await navigator.clipboard.writeText(campo.value);
      por("copiar-linhas").textContent = "Copiado ✓";
    } catch {
      campo.select();
      por("copiar-linhas").textContent = "Selecionado: use Ctrl+C";
    }
  });
  por("fechar-unidades").addEventListener("click", () => janela.close());
  janela.addEventListener("close", () => {
    janela.remove();
    desenharUnidades();
  });

  desenharLista();
  mostrarPrevia();
  janela.showModal();
  por("nova-unidade-nome").focus();
}

// ── trocar a senha ────────────────────────────────────────────────────────────

function abrirTrocaDeSenha() {
  const janela = document.createElement("dialog");
  janela.setAttribute("aria-labelledby", "t-senha");
  janela.innerHTML = `
    <form class="janela" method="dialog" id="formulario-de-senha" novalidate>
      <h2 id="t-senha">Trocar a senha</h2>
      <p class="cartao__ajuda">Este site não tem servidor, então a senha nova só vale depois de ser publicada. Digite a nova senha para gerar o código que vai no arquivo <strong>js/config.js</strong>.</p>
      <div class="campo">
        <label class="rotulo" for="senha-nova">Senha nova (pelo menos 10 caracteres)</label>
        <input class="entrada-de-texto" id="senha-nova" type="password" autocomplete="new-password" />
      </div>
      <div class="campo">
        <label class="rotulo" for="senha-repetida">Repita a senha nova</label>
        <input class="entrada-de-texto" id="senha-repetida" type="password" autocomplete="new-password" />
      </div>
      <div class="aviso aviso--erro" id="erro-da-senha" role="alert" hidden></div>
      <div id="resultado-da-senha" hidden>
        <p class="rotulo" style="margin-top: 6px">Código gerado</p>
        <textarea class="codigo" id="codigo" readonly spellcheck="false"></textarea>
        <ol class="passos">
          <li>Copie o código acima.</li>
          <li>No GitHub, abra o arquivo <strong>js/config.js</strong> e clique no lápis (editar).</li>
          <li>Troque o bloco <strong>acesso: { … }</strong> inteiro pelo código copiado e clique em <strong>Commit changes</strong>.</li>
          <li>Em um ou dois minutos a senha nova vale, e todos entram de novo com ela.</li>
        </ol>
      </div>
      <div class="janela__acoes">
        <button type="button" class="botao botao--primario" id="gerar-codigo">Gerar o código</button>
        <button type="button" class="botao botao--contorno" id="copiar-codigo" hidden>Copiar</button>
        <button type="button" class="botao botao--contorno" id="fechar-janela">Fechar</button>
      </div>
    </form>`;
  document.body.append(janela);
  const por = (id) => janela.querySelector(`#${id}`);
  por("fechar-janela").addEventListener("click", () => janela.close());
  janela.addEventListener("close", () => janela.remove());
  por("gerar-codigo").addEventListener("click", async () => {
    const nova = por("senha-nova").value;
    const erro = por("erro-da-senha");
    erro.hidden = true;
    if (nova.length < 10) {
      erro.textContent = "Use pelo menos 10 caracteres. Uma frase curta e fácil de lembrar serve.";
      erro.hidden = false;
      return;
    }
    if (nova !== por("senha-repetida").value) {
      erro.textContent = "As duas senhas não são iguais.";
      erro.hidden = false;
      return;
    }
    por("gerar-codigo").disabled = true;
    const credencial = await criarCredencial(nova);
    por("codigo").value = `  acesso: {\n    login: ${JSON.stringify(CONFIG.acesso.login)},\n    sal: ${JSON.stringify(credencial.sal)},\n    iteracoes: ${credencial.iteracoes},\n    hash: ${JSON.stringify(credencial.hash)},\n  },`;
    por("resultado-da-senha").hidden = false;
    por("copiar-codigo").hidden = false;
    por("gerar-codigo").disabled = false;
    por("gerar-codigo").textContent = "Gerar de novo";
  });
  por("copiar-codigo").addEventListener("click", async () => {
    const campo = por("codigo");
    try {
      await navigator.clipboard.writeText(campo.value);
      por("copiar-codigo").textContent = "Copiado ✓";
    } catch {
      campo.select();
      por("copiar-codigo").textContent = "Selecionado: use Ctrl+C";
    }
  });
  janela.showModal();
  por("senha-nova").focus();
}

// ── os cliques e o começo ─────────────────────────────────────────────────────

function mudarAno(novo) {
  if (novo === estado.ano) return;
  estado.ano = novo;
  estado.ajustes = {}; // as trocas valem para um ano só
  atualizar();
}

document.addEventListener("click", (evento) => {
  const alvo = evento.target instanceof Element ? evento.target.closest("[data-acao], .dom[data-iso]") : null;
  if (!alvo) return;
  const dom = alvo.closest(".dom[data-iso]");
  if (dom) return alternarDomingo(dom.dataset.iso);
  switch (alvo.dataset.acao) {
    case "ver-senha": {
      const campo = document.getElementById("senha");
      const mostrar = campo.type === "password";
      campo.type = mostrar ? "text" : "password";
      alvo.textContent = mostrar ? "Ocultar" : "Mostrar";
      alvo.setAttribute("aria-pressed", String(mostrar));
      break;
    }
    case "ano-menos":
    case "ano-mais": {
      const base = Number.isFinite(estado.ano) ? estado.ano : anoPadrao();
      mudarAno(alvo.dataset.acao === "ano-menos" ? Math.max(2000, base - 1) : Math.min(2099, base + 1));
      document.getElementById("ano").value = String(estado.ano);
      break;
    }
    case "limpar-ajustes": estado.ajustes = {}; return atualizar();
    case "baixar": return gerar("baixar");
    case "abrir": return gerar("abrir");
    case "sair": encerrarSessao(armazens); return mostrarEntrada();
    case "trocar-senha": return abrirTrocaDeSenha();
    case "gerenciar-unidades": return abrirGerenciadorDeUnidades();
  }
});

document.addEventListener("submit", (evento) => {
  if (evento.target.id === "formulario-de-entrada") entrar(evento);
});

document.addEventListener("change", (evento) => {
  const alvo = evento.target;
  if (alvo.id === "unidade") {
    if (alvo.value === NOVA_UNIDADE) {
      desenharUnidades(); // volta para a unidade de antes; se cadastrar uma, ela passa a ser a escolhida
      abrirGerenciadorDeUnidades();
      return;
    }
    estado.unidade = alvo.value;
    atualizar();
  }
  if (alvo.id === "encadernacao") {
    estado.encadernacao = alvo.checked;
    try {
      armazens.local.setItem(CHAVE_DA_ENCADERNACAO, alvo.checked ? "sim" : "nao");
    } catch {
      // o aparelho não guarda: vale só para esta visita
    }
  }
});

document.addEventListener("input", (evento) => {
  const alvo = evento.target;
  if (alvo.id === "ano") {
    const digitos = alvo.value.replace(/\D/g, "").slice(0, 4);
    if (digitos !== alvo.value) alvo.value = digitos;
    if (digitos.length === 4) mudarAno(Number(digitos));
    else if (digitos.length < 4) {
      estado.ano = NaN;
      atualizar();
    }
  }
});

if (location.protocol === "file:") {
  raiz.innerHTML = `<div class="aviso aviso--erro">Este site precisa ser aberto por um endereço (https://…), e não direto do arquivo. No computador, rode <strong>npm run servir</strong> e abra http://127.0.0.1:8080.</div>`;
} else if (sessaoValida(armazens, CONFIG.acesso, { agora: Date.now() })) {
  mostrarGerador();
} else {
  mostrarEntrada();
}

