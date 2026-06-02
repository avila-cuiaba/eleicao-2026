/**
 * Backend do projeto Eleição 2026 (Google Apps Script - Web App).
 *
 * UMA ÚNICA publicação (1 WEB_APP_URL) atende TODAS as planilhas abaixo.
 * Para adicionar uma planilha/aba nova, inclua uma linha em PLANILHAS
 * (chave curta -> { id, gid }) e reimplante (Nova versão).
 *
 * O frontend escolhe a planilha pelo parâmetro:
 *   GET  -> ?planilha=mapa-voto
 *   POST -> { "planilha": "mapa-voto", ... }
 *
 * Na URL da planilha:
 *   https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>
 *   - <ID>  = identificador da planilha
 *   - <GID> = identificador da aba (0 = primeira aba)
 */

// >>> Planilhas/abas permitidas (chave curta -> { id, gid }).
// OBS: as chaves abaixo são provisórias — renomeie para algo significativo.
const PLANILHAS = {
  "mapa-voto": {
    id: "1taZumjanEoFXxRO7RArrDY5DDjR8rzzYQxT5w6CxEeU",
    gid: 0,
  },
  "planilha-2": {
    id: "1tFJ54zDjwvzqvPwwfSH0OpgxkGygSXkF4pSqIhtImOE",
    gid: 0,
  },
  "planilha-3": {
    id: "1uWHTfEsNJzdXC0uXxM3yIcQW8BIfpiBWha6wNlQpS9I",
    gid: 1492182435,
  },
  // As duas abaixo são a MESMA planilha (mesmo id), em abas (gid) diferentes:
  "planilha-4-aba1": {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1105165439,
  },
  "planilha-4-aba2": {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1856813297,
  },
};

// Planilha usada quando nenhum parâmetro "planilha" é informado.
const PLANILHA_PADRAO = "mapa-voto";

// Nome de aba opcional. Vazio = usa o gid do cadastro (ou a primeira aba).
const ABA_PADRAO = "";

// Cabeçalhos padrão (usado só na gravação quando a aba está vazia).
// A coluna "data" é preenchida automaticamente no doPost.
const CABECALHOS = ["data", "nome", "cidade", "observacao"];

/**
 * GET: retorna os dados de uma aba como JSON.
 * Parâmetros opcionais: ?planilha=chave&aba=NomeDaAba
 *
 * Retorna:
 *  - valores: matriz crua (linhas x colunas) — usada pelo dashboard, pois a
 *    planilha pode ter imagens nos cabeçalhos e tabelas empilhadas.
 *  - dados: lista de objetos chaveados pelo cabeçalho (compatibilidade).
 */
function doGet(e) {
  try {
    const planilha = (e && e.parameter && e.parameter.planilha) || PLANILHA_PADRAO;
    const nomeAba = (e && e.parameter && e.parameter.aba) || ABA_PADRAO;
    const sheet = obterSheet(planilha, nomeAba);
    const valores = sheet.getDataRange().getValues();

    let dados = [];
    if (valores.length >= 2) {
      const cabecalhos = valores[0];
      dados = valores.slice(1).map(function (linha) {
        const obj = {};
        cabecalhos.forEach(function (col, i) {
          obj[col] = linha[i];
        });
        return obj;
      });
    }

    return responder({ ok: true, valores: valores, dados: dados });
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  }
}

/**
 * POST: grava uma nova linha na aba.
 * Corpo esperado (JSON em text/plain):
 *   { "planilha": "chave", "aba": "Dados", "nome": "...", ... }
 */
function doPost(e) {
  try {
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const planilha = corpo.planilha || PLANILHA_PADRAO;
    const nomeAba = corpo.aba || ABA_PADRAO;
    const sheet = obterSheet(planilha, nomeAba);

    // Lê o cabeçalho atual da planilha para montar a linha na ordem correta.
    const ultimaColuna = sheet.getLastColumn();
    const cabecalhos =
      ultimaColuna > 0
        ? sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0]
        : CABECALHOS;

    const agora = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm:ss"
    );

    const linha = cabecalhos.map(function (col) {
      if (col === "data") return agora;
      return corpo[col] != null ? corpo[col] : "";
    });

    sheet.appendRow(linha);
    return responder({ ok: true });
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  }
}

/**
 * Resolve a planilha (pela chave) e retorna a aba.
 * Ordem de seleção da aba:
 *   1) por nome (se "aba" for informado e existir);
 *   2) por gid (definido no cadastro da planilha);
 *   3) primeira aba.
 */
function obterSheet(planilhaKey, nomeAba) {
  const cfg = PLANILHAS[planilhaKey];
  if (!cfg) {
    throw new Error("Planilha não cadastrada: " + planilhaKey);
  }

  const ss = SpreadsheetApp.openById(cfg.id);

  if (nomeAba) {
    const porNome = ss.getSheetByName(nomeAba);
    if (porNome) return porNome;
  }

  if (cfg.gid != null) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId() === cfg.gid) return abas[i];
    }
  }

  return ss.getSheets()[0];
}

/** Resposta JSON padrão do Web App. */
function responder(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
