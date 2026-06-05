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
// Após alterar: Implantar > Gerenciar implantações > Editar > Nova versão.
function criarCadastroPlanilhas() {
  const p = {};

  p["mapa-voto"] = {
    id: "1taZumjanEoFXxRO7RArrDY5DDjR8rzzYQxT5w6CxEeU",
    gid: 0,
  };
  p.votacao = {
    id: "1tFJ54zDjwvzqvPwwfSH0OpgxkGygSXkF4pSqIhtImOE",
    gid: 0,
  };
  p["cadastro-colaboradores"] = {
    id: "1uWHTfEsNJzdXC0uXxM3yIcQW8BIfpiBWha6wNlQpS9I",
    gid: 1492182435,
  };
  // Planilha pessoal (equipe por município + apoiadores).
  p["pessoal-municipio"] = {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1105165439,
  };
  // Aba apoiadores: liderança, município, apoiador-lider, apoiador-30, apoiador-45, apoiador-customizado.
  p.apoiadores = {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1856813297,
  };
  p["pessoal-municipio-aba1"] = p["pessoal-municipio"];
  p["pessoal-municipio-aba2"] = p.apoiadores;
  p.municipios = {
    id: "18YWhOfiMa3jM2BnM3pnFeo7q3GSBB3X1uoQADEXs-Jc",
    gid: 0,
  };

  // Aliases (nomes antigos — compatibilidade).
  p["planilha-2"] = p.votacao;
  p["planilha-3"] = p["cadastro-colaboradores"];
  p["planilha-4-aba1"] = p["pessoal-municipio"];
  p["planilha-4-aba2"] = p.apoiadores;
  p["micro-municipios"] = p.municipios;

  return p;
}

const PLANILHAS = criarCadastroPlanilhas();

const PLANILHA_PADRAO = "mapa-voto";
const ABA_PADRAO = "";
const CABECALHOS = ["data", "nome", "cidade", "observacao"];

// ===================== AGENDA =====================

// Várias agendas podem alimentar o mesmo calendário (leitura).
// Novos eventos pelo app vão para AGENDA_GRAVACAO (campanha).
const AGENDAS = {
  campanha: {
    id: "5022e5968413188b563f3ed7f37711c25a4ddf55dd9e05183b045c82f1a5b840@group.calendar.google.com",
    titulo: "Campanha",
    gravar: true,
  },
  pessoal: {
    id: "", // cole o ID da agenda pessoal (Settings > Integrate calendar)
    titulo: "Pessoal",
    gravar: false,
  },
};

const AGENDA_GRAVACAO = "campanha";

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
    if (recurso === "planilhas-cadastro") {
      return responder({ ok: true, chaves: Object.keys(PLANILHAS).sort() });
    }
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

function obterAgenda(chave) {
  const key = chave || AGENDA_GRAVACAO;
  const cfg = AGENDAS[key];
  if (!cfg || !cfg.id) {
    throw new Error("Agenda não cadastrada: " + key);
  }
  const cal = CalendarApp.getCalendarById(cfg.id);
  if (!cal) {
    throw new Error(
      "Agenda sem acesso: " + key + ". Compartilhe com a conta do Apps Script."
    );
  }
  return cal;
}

function eventoParaJson(ev, origem, origemTitulo) {
  return {
    id: ev.getId(),
    origem: origem,
    origemTitulo: origemTitulo,
    titulo: ev.getTitle(),
    inicio: ev.getStartTime().toISOString(),
    fim: ev.getEndTime().toISOString(),
    diaInteiro: ev.isAllDayEvent(),
    local: ev.getLocation() || "",
    descricao: ev.getDescription() || "",
  };
}

function listarEventosAgendas(inicio, fim) {
  const todos = [];
  Object.keys(AGENDAS).forEach(function (key) {
    const cfg = AGENDAS[key];
    if (!cfg.id) return;
    const cal = CalendarApp.getCalendarById(cfg.id);
    if (!cal) return;
    cal.getEvents(inicio, fim).forEach(function (ev) {
      todos.push(eventoParaJson(ev, key, cfg.titulo));
    });
  });
  todos.sort(function (a, b) {
    return new Date(a.inicio) - new Date(b.inicio);
  });
  return todos;
}

// Lista eventos de todas as agendas cadastradas.
function doGetAgenda(p) {
  const agora = new Date();
  const inicio = p.inicio ? new Date(p.inicio) : agora;
  const fim = p.fim
    ? new Date(p.fim)
    : new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000);

  return responder({ ok: true, eventos: listarEventosAgendas(inicio, fim) });
}

// Cria ou atualiza um evento na agenda.
function doPostAgenda(corpo) {
  if (corpo.acao === "atualizar") {
    return atualizarEventoAgenda(corpo);
  }

  const cal = obterAgenda(corpo.origem || AGENDA_GRAVACAO);

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

// Atualiza horário de um evento (arrastar no Toast UI Calendar).
function atualizarEventoAgenda(corpo) {
  if (!corpo.id) throw new Error("ID do evento é obrigatório.");
  if (!corpo.inicio) throw new Error("Data/hora de início é obrigatória.");

  const ev = CalendarApp.getEventById(corpo.id);
  if (!ev) throw new Error("Evento não encontrado: " + corpo.id);

  const inicio = new Date(corpo.inicio);
  const fim = corpo.fim
    ? new Date(corpo.fim)
    : new Date(inicio.getTime() + 60 * 60000);

  if (corpo.diaInteiro) {
    ev.setAllDayDate(inicio);
  } else {
    ev.setTime(inicio, fim);
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

  // Toca em cada agenda cadastrada (pede permissão do Calendar).
  Object.keys(AGENDAS).forEach(function (key) {
    const cfg = AGENDAS[key];
    if (!cfg.id) return;
    const cal = CalendarApp.getCalendarById(cfg.id);
    if (cal) Logger.log("Agenda OK (" + key + "): " + cal.getName());
  });
}

function responder(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
