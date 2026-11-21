/**
 * O acesso: login (o número da estaca) e senha.
 *
 * ## O que isto é, e o que não é
 *
 * Este site é ESTÁTICO (GitHub Pages não tem servidor), então a conferência da senha acontece no
 * navegador de quem entra. Serve para o site não ser usado por engano ou por curiosidade, e para
 * que a senha nunca apareça em texto: o que fica publicado é só um hash (PBKDF2-SHA256, com sal
 * e centenas de milhares de voltas), de que não se volta à senha.
 *
 * Não é uma tranca contra quem sabe ler o código-fonte da página: o código é público, e quem o
 * lê pode contornar qualquer conferência feita no navegador. Por isso este site NÃO guarda dado
 * pessoal nenhum — as atas saem em branco, para escrever à mão.
 *
 * ## Trocar a senha
 *
 * Como não há servidor, a senha nova só vale depois de publicada: a tela "Trocar senha" gera o
 * bloco novo (sal + hash) e a pessoa o cola em `js/config.js` e salva no GitHub.
 *
 * O módulo não toca na tela nem em `window`: recebe tudo que precisa por argumento, e por isso
 * roda igual nos testes (Node) e no navegador.
 */

export const ITERACOES_PADRAO = 600_000;

const paraBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

/** O hash (base64) de uma senha com este sal e este número de voltas. */
export async function derivar(senha, sal, iteracoes) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(senha).normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deBase64(sal), iterations: iteracoes }, material, 256);
  return paraBase64(new Uint8Array(bits));
}

/** Uma credencial nova para uma senha: { sal, iteracoes, hash } — o que vai para `config.js`. */
export async function criarCredencial(senha, { iteracoes = ITERACOES_PADRAO } = {}) {
  const sal = paraBase64(crypto.getRandomValues(new Uint8Array(16)));
  return { sal, iteracoes, hash: await derivar(senha, sal, iteracoes) };
}

/** Comparação que não para no primeiro byte diferente. */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

const soDigitos = (texto) => String(texto ?? "").replace(/\s+/g, "");

/**
 * O login e a senha conferem com o `acesso` da configuração? Sempre calcula o hash, mesmo com o
 * login errado: errar o login não pode ser mais rápido que errar a senha.
 */
export async function conferir({ login, senha }, acesso) {
  const hash = await derivar(senha ?? "", acesso.sal, acesso.iteracoes);
  const loginCerto = iguais(soDigitos(login), acesso.login);
  const senhaCerta = iguais(hash, acesso.hash);
  return loginCerto && senhaCerta;
}

// ── a sessão ─────────────────────────────────────────────────────────────────

const CHAVE_DA_SESSAO = "atas.sessao";
const DURACAO_LEMBRADA_MS = 30 * 86_400_000;

/**
 * Marca esta pessoa como entrada. Sem `lembrar`, vale só até fechar a aba (sessionStorage); com
 * ele, por 30 dias neste aparelho (localStorage). `agora` entra de fora: nada aqui lê o relógio.
 */
export function iniciarSessao({ sessao, local }, acesso, { lembrar = false, agora }) {
  const marca = JSON.stringify({ hash: acesso.hash.slice(0, 16), ate: lembrar ? agora + DURACAO_LEMBRADA_MS : null });
  (lembrar ? local : sessao).setItem(CHAVE_DA_SESSAO, marca);
  (lembrar ? sessao : local).removeItem(CHAVE_DA_SESSAO);
}

/**
 * Há sessão válida? A marca leva o começo do hash vigente: ao trocar a senha em `config.js`, toda
 * sessão antiga deixa de valer, e quem estava dentro entra de novo com a senha nova.
 */
export function sessaoValida({ sessao, local }, acesso, { agora }) {
  for (const armazem of [sessao, local]) {
    try {
      const lida = JSON.parse(armazem.getItem(CHAVE_DA_SESSAO) ?? "null");
      if (!lida || lida.hash !== acesso.hash.slice(0, 16)) continue;
      if (lida.ate !== null && lida.ate < agora) continue;
      return true;
    } catch {
      // armazenamento recusado ou marca ilegível: não há sessão
    }
  }
  return false;
}

export function encerrarSessao({ sessao, local }) {
  for (const armazem of [sessao, local]) {
    try {
      armazem.removeItem(CHAVE_DA_SESSAO);
    } catch {
      // nada a limpar
    }
  }
}

// ── o e-mail de recuperação ──────────────────────────────────────────────────

/**
 * O endereço de recuperação não fica escrito por extenso no código (para não ser colhido por
 * robôs de spam): guarda-se invertido e em base64. Isto NÃO o esconde de quem quer vê-lo — só de
 * quem varre a internet atrás de e-mails. É o botão "Esqueci a senha" que o desfaz, ao clicar.
 */
export function codificarEndereco(email) {
  return btoa(Array.from(String(email).trim()).reverse().join(""));
}

export function decodificarEndereco(codificado) {
  return Array.from(atob(codificado)).reverse().join("");
}

/** O `mailto:` do "Esqueci a senha". */
export function linkDeRecuperacao({ destino, assunto, corpo }) {
  const endereco = decodificarEndereco(destino);
  return `mailto:${endereco}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/** O endereço com o miolo escondido, para mostrar na tela: "j•••••@gmail.com". */
export function enderecoMascarado(codificado) {
  const [usuario, dominio] = decodificarEndereco(codificado).split("@");
  return `${usuario[0]}${"•".repeat(Math.min(5, Math.max(3, usuario.length - 1)))}@${dominio}`;
}
