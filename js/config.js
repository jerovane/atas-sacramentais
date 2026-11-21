/**
 * A configuração do site: a estaca, o acesso e a lista de unidades.
 *
 * ## Para trocar a senha
 *
 *   1. Entre no site e abra "Trocar senha" (no topo da página, ao lado de "Sair").
 *   2. Digite a senha nova duas vezes: a tela mostra um bloco de código (o "acesso").
 *   3. Aqui no GitHub, abra este arquivo, clique no lápis (editar), troque o bloco "acesso"
 *      abaixo pelo que a tela mostrou e salve ("Commit changes").
 *   4. Em um ou dois minutos o site publica a senha nova, e as sessões antigas deixam de valer.
 *
 * Só o HASH da senha fica aqui — nunca a senha. Ver o comentário de js/acesso.js sobre o que este
 * acesso protege e o que ele não protege.
 */
export const CONFIG = Object.freeze({
  estaca: { numero: "1411578", nome: "Estaca Pacajus Brasil" },

  // ── ACESSO ── (o login é o número da estaca; o resto é gerado pela tela "Trocar senha")
  acesso: {
    login: "1411578",
    sal: "h76cJgBFaPJhnjAv/jye/A==",
    iteracoes: 600000,
    hash: "0dejkAcvX5n0n6jFrKpQWmUlmC2k1fYxylARVfv3sLk=",
  },

  // ── RECUPERAÇÃO ── "Esqueci a senha" abre um e-mail para este endereço (guardado codificado).
  recuperacao: {
    destino: "bW9jLmxpYW1nQGtyb3dlbmF2b3Jlag==",
    assunto: "Atas Sacramentais: esqueci a senha",
    corpo: "Olá! Esqueci a senha do motor de atas sacramentais da Estaca Pacajus Brasil (estaca 1411578). Podem me ajudar a recuperar o acesso?",
  },

  // ── UNIDADES ── as da estaca; "tipo" (ala, ramo ou grupo) decide o rótulo de quem assina a ata ("Bispo", "Presidente do Ramo" ou "Líder do Grupo").
  unidades: [
    { nome: "Ala Itamaraty", tipo: "ala" },
    { nome: "Ala Pedras", tipo: "ala" },
    { nome: "Ala Horizonte", tipo: "ala" },
    { nome: "Ala Pacajus 1", tipo: "ala" },
    { nome: "Ala Pacajus 2", tipo: "ala" },
    { nome: "Ala Aracati", tipo: "ala" },
    { nome: "Ala Russas", tipo: "ala" },
    { nome: "Ramo Baturité", tipo: "ramo" },
    { nome: "Ramo Limoeiro", tipo: "ramo" },
    { nome: "Ramo Pedregal", tipo: "ramo" },
    { nome: "Grupo Fortim", tipo: "grupo" },
    { nome: "Grupo Icapuí", tipo: "grupo" },
  ],
});
