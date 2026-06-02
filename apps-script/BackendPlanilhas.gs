/**
 * Backend do projeto Eleição 2026 (Google Apps Script - Web App).
 *
 * Recursos atendidos por UMA única publicação (1 WEB_APP_URL):
 *   - planilha (padrão): leitura/gravação no Google Sheets
 *   - agenda: leitura/criação de eventos no Google Agenda (Calendar)
 *   - login: valida a chave de acesso
 *
 * SEGURANÇA (Opção A):
 *   Defina a senha em: Configurações do projeto > Propriedades do script
 *   Propriedade:  SENHA_ACESSO = a_senha_desejada
 *   - Se a propriedade NÃO existir, o acesso fica ABERTO (sem proteção).
 *   - O frontend envia a chave em ?chave=... (GET) ou { "chave": "..." } (POST).
 *   A senha fica só aqui no Google, NUNCA no repositório.
 *
 * Roteamento:
 *   GET  ?recurso=planilha|agenda|login & ...
 *   POST { "recurso": "planilha|agenda", ... }
 */

// ===================== PLANILHAS =====================

// Planilhas/abas permitidas (chave curta -> { id, gid }).
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
  "planilha-4-aba1": {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1105165439,
  },
  "planilha-4-aba2": {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1856813297,
  },
};

const PLANILHA_PADRAO = "mapa-voto";
const ABA_PADRAO = "";
const CABECALHOS = ["data", "nome", "cidade", "observacao"];

// ===================== AGENDA =====================

// Agenda (Google Calendar) usada pela campanha.
const AGENDA_ID =
  "5022e5968413188b563f3ed7f37711c25a4ddf55dd9e05183b045c82f1a5b840@group.calendar.google.com";

// ===================== AUTORIZAÇÃO =====================

function autorizado(chave) {
  const segredo = PropertiesService.getScriptProperties().getProperty("SENHA_ACESSO");
  if (!segredo) return true; // sem segredo configurado = acesso aberto
  return String(chave || "") === segredo;
}

function respostaNaoAutorizado() {
  return responder({ ok: false, naoAutorizado: true, erro: "Acesso negado" });
}

// ===================== ROTEAMENTO =====================

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (!autorizado(p.chave)) return respostaNaoAutorizado();

    const recurso = p.recurso || "planilha";
    if (recurso === "login") return responder({ ok: true });
    if (recurso === "agenda") return doGetAgenda(p);
    return doGetPlanilha(p);
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  }
}

function doPost(e) {
  try {
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!autorizado(corpo.chave)) return respostaNaoAutorizado();

    const recurso = corpo.recurso || "planilha";
    if (recurso === "agenda") return doPostAgenda(corpo);
    return doPostPlanilha(corpo);
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  }
}

// ===================== PLANILHA (handlers) =====================

function doGetPlanilha(p) {
  const planilha = p.planilha || PLANILHA_PADRAO;
  const nomeAba = p.aba || ABA_PADRAO;
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
}

function doPostPlanilha(corpo) {
  const planilha = corpo.planilha || PLANILHA_PADRAO;
  const nomeAba = corpo.aba || ABA_PADRAO;
  const sheet = obterSheet(planilha, nomeAba);

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
}

/**
 * Resolve a planilha (pela chave) e retorna a aba.
 * Ordem: 1) por nome; 2) por gid do cadastro; 3) primeira aba.
 */
function obterSheet(planilhaKey, nomeAba) {
  const cfg = PLANILHAS[planilhaKey];
  if (!cfg) throw new Error("Planilha não cadastrada: " + planilhaKey);

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

// ===================== AGENDA (handlers) =====================

function obterAgenda() {
  const cal = CalendarApp.getCalendarById(AGENDA_ID);
  if (!cal) {
    throw new Error(
      "Agenda não encontrada ou sem acesso. Verifique o AGENDA_ID e o compartilhamento."
    );
  }
  return cal;
}

// Lista eventos no período (?inicio=ISO&fim=ISO).
function doGetAgenda(p) {
  const cal = obterAgenda();

  const agora = new Date();
  const inicio = p.inicio ? new Date(p.inicio) : agora;
  const fim = p.fim
    ? new Date(p.fim)
    : new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000);

  const eventos = cal.getEvents(inicio, fim).map(function (ev) {
    return {
      id: ev.getId(),
      titulo: ev.getTitle(),
      inicio: ev.getStartTime().toISOString(),
      fim: ev.getEndTime().toISOString(),
      diaInteiro: ev.isAllDayEvent(),
      local: ev.getLocation() || "",
      descricao: ev.getDescription() || "",
    };
  });

  return responder({ ok: true, eventos: eventos });
}

// Cria um evento na agenda.
function doPostAgenda(corpo) {
  const cal = obterAgenda();

  if (!corpo.titulo) throw new Error("Título é obrigatório.");
  if (!corpo.inicio) throw new Error("Data/hora de início é obrigatória.");

  const inicio = new Date(corpo.inicio);
  const opcoes = {};
  if (corpo.descricao) opcoes.description = corpo.descricao;
  if (corpo.local) opcoes.location = corpo.local;

  let ev;
  if (corpo.diaInteiro) {
    ev = cal.createAllDayEvent(corpo.titulo, inicio, opcoes);
  } else {
    const duracaoMin = Number(corpo.duracaoMin) || 60;
    const fim = corpo.fim
      ? new Date(corpo.fim)
      : new Date(inicio.getTime() + duracaoMin * 60000);
    ev = cal.createEvent(corpo.titulo, inicio, fim, opcoes);

    if (corpo.lembreteMin != null && corpo.lembreteMin !== "") {
      ev.addPopupReminder(Number(corpo.lembreteMin));
    }
  }

  return responder({ ok: true, id: ev.getId() });
}

// ===================== UTIL / AUTORIZAÇÃO MANUAL =====================

/**
 * Rode esta função no editor (Executar) para conceder TODAS as permissões
 * de uma vez (Planilhas + Agenda) e testar o acesso à agenda.
 * Veja o resultado em "Registro de execução" (Logs).
 */
function autorizar() {
  // Toca na planilha padrão (pede permissão do Sheets).
  SpreadsheetApp.openById(PLANILHAS[PLANILHA_PADRAO].id);

  // Toca na agenda (pede permissão do Calendar) e testa o acesso.
  const cal = CalendarApp.getCalendarById(AGENDA_ID);
  if (cal) {
    Logger.log("Agenda OK: " + cal.getName());
  } else {
    Logger.log(
      "ATENCAO: agenda nao acessivel. Compartilhe a agenda com esta conta " +
        "(permissao 'Fazer alteracoes em eventos') e rode de novo."
    );
  }
}

function responder(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
