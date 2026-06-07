/**
 * Backend do projeto Eleição 2026 (Google Apps Script - Web App).
 *
 * Recursos atendidos por UMA única publicação (1 WEB_APP_URL):
 *   - planilha (padrão): leitura/gravação no Google Sheets
 *   - agenda: leitura/criação de eventos no Google Agenda (Calendar)
 *   - login: valida a chave de acesso
 *
 * SEGURANÇA — Propriedades do script (Configurações > Propriedades do script):
 *   SENHA_ACESSO_SORAYA, SENHA_ACESSO_ELLEN, SENHA_ACESSO_DANI  → só contratos
 *   SENHA_ACESSO_EUGENIO  → campanha (tudo exceto contratos)
 *   SENHA_ACESSO_AVILA    → acesso total
 *   SENHA_ACESSO (legado) → acesso total, se ainda existir
 *   Se NENHUMA propriedade existir, o acesso fica ABERTO (sem proteção).
 *   O frontend envia a chave em ?chave=... (GET) ou { "chave": "..." } (POST).
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
  // Dados dos colaboradores (CRUD contratos) — gid da aba com nome-completo, cpf, etc.
  // A aba auditoria-contratos é outra aba (nomeAba abaixo); não usar o gid dela aqui.
  const planilhaColaboradoresId = "1uWHTfEsNJzdXC0uXxM3yIcQW8BIfpiBWha6wNlQpS9I";
  const abaColaboradoresGid = 1492182435;
  p["cadastro-colaboradores"] = {
    id: planilhaColaboradoresId,
    gid: abaColaboradoresGid,
  };
  p.contratos = {
    id: planilhaColaboradoresId,
    gid: abaColaboradoresGid,
  };
  // Log de inserir / atualizar / excluir (aba separada na mesma planilha).
  p["auditoria-contratos"] = {
    id: planilhaColaboradoresId,
    nomeAba: "auditoria-contratos",
  };
  // Entregas: materiais e distribuição.
  p.entregas = {
    id: "1scoDoh48XsIqHYYNdLMYcvVe-IgSRMzb6AmtRBwLWXY",
    gid: 0,
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
  // Aba parcerias: município, parceria, apoiadores, valor.
  p.parcerias = {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1242262181,
  };
  // Aba orçamento estratificado (por município).
  p.orcamento = {
    id: "1GopYyhxPe-ymQHQQtalJNYZUL6IP0jYAcVIao6gQfZo",
    gid: 1105165439,
  };
  // Orçamento geral / desembolso: mesma planilha (item, orçamento, prazos).
  p["orcamento-geral"] = {
    id: "1CsSofzZpuEx61r9VnMa9AcTq-QLk-LL3pAeujOwvEXE",
    gid: 0,
  };
  p["orcamento-desembolso"] = p["orcamento-geral"];
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
// Google Doc "modelo-contrato" (renomear no Drive não altera o ID).
const CONTRATO_TEMPLATE_DOC_ID = "1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s";
const CONTRATO_TEMPLATE_NOME = "modelo-contrato";

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

var CADASTRO_ACESSO = [
  { prop: "SENHA_ACESSO_SORAYA", perfil: "contratos", usuario: "Soraya" },
  { prop: "SENHA_ACESSO_ELLEN", perfil: "contratos", usuario: "Ellen" },
  { prop: "SENHA_ACESSO_DANI", perfil: "contratos", usuario: "Dani" },
  { prop: "SENHA_ACESSO_EUGENIO", perfil: "campanha", usuario: "Eugênio" },
  { prop: "SENHA_ACESSO_AVILA", perfil: "master", usuario: "Avila" },
];

var PLANILHAS_SOMENTE_CONTRATOS = {
  contratos: true,
  "cadastro-colaboradores": true,
  "auditoria-contratos": true,
};

function validarChave(chave) {
  const props = PropertiesService.getScriptProperties();
  const entrada = String(chave || "");
  let algumaConfigurada = false;

  const legado = props.getProperty("SENHA_ACESSO");
  if (legado) {
    algumaConfigurada = true;
    if (entrada === legado) {
      return { ok: true, perfil: "master", usuario: "Legado" };
    }
  }

  for (let i = 0; i < CADASTRO_ACESSO.length; i++) {
    const cfg = CADASTRO_ACESSO[i];
    const senha = props.getProperty(cfg.prop);
    if (senha) algumaConfigurada = true;
    if (senha && entrada === senha) {
      return { ok: true, perfil: cfg.perfil, usuario: cfg.usuario };
    }
  }

  if (!algumaConfigurada) {
    return { ok: true, perfil: "master", usuario: "" };
  }
  return { ok: false, perfil: "", usuario: "" };
}

function autorizado(chave) {
  return validarChave(chave).ok;
}

function planilhaPermitida(perfil, planilha) {
  const chave = String(planilha || "");
  if (!perfil || perfil === "master") return true;
  if (perfil === "contratos") {
    if (PLANILHAS_SOMENTE_CONTRATOS[chave]) return true;
    if (chave === "municipios" || chave === "micro-municipios") return true;
    if (chave === "apoiadores") return true;
    return false;
  }
  if (perfil === "campanha") {
    return !PLANILHAS_SOMENTE_CONTRATOS[chave];
  }
  return false;
}

function recursoPermitido(perfil, recurso, planilha) {
  if (!perfil || perfil === "master") return true;
  if (perfil === "contratos") {
    if (recurso === "agenda" || recurso === "planilhas-cadastro") return false;
    if (recurso === "planilha" || !recurso) {
      return planilhaPermitida(perfil, planilha || PLANILHA_PADRAO);
    }
    return false;
  }
  if (perfil === "campanha") {
    if (recurso === "agenda" || recurso === "planilhas-cadastro") return true;
    if (recurso === "planilha" || !recurso) {
      return planilhaPermitida(perfil, planilha || PLANILHA_PADRAO);
    }
    return true;
  }
  return false;
}

function respostaNaoAutorizado() {
  return responder({ ok: false, naoAutorizado: true, erro: "Acesso negado" });
}

// ===================== ROTEAMENTO =====================

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const recurso = p.recurso || "planilha";

    if (recurso === "login") {
      const auth = validarChave(p.chave);
      if (!auth.ok) return responder({ ok: false });
      return responder({ ok: true, perfil: auth.perfil, usuario: auth.usuario });
    }

    const auth = validarChave(p.chave);
    if (!auth.ok) return respostaNaoAutorizado();
    if (!recursoPermitido(auth.perfil, recurso, p.planilha)) {
      return respostaNaoAutorizado();
    }

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
    const auth = validarChave(corpo.chave);
    if (!auth.ok) return respostaNaoAutorizado();

    const recurso = corpo.recurso || "planilha";
    if (!recursoPermitido(auth.perfil, recurso, corpo.planilha)) {
      return respostaNaoAutorizado();
    }

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
    dados = valores.slice(1).map(function (linha, i) {
      const obj = { _linha: i + 2 };
      cabecalhos.forEach(function (col, j) {
        obj[col] = linha[j];
      });
      return obj;
    });
  }

  return responder({
    ok: true,
    valores: valores,
    dados: dados,
    meta: {
      aba: sheet.getName(),
      gid: sheet.getSheetId(),
      planilha: planilha,
    },
  });
}

function normalizarChavePlanilha(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AUDITORIA_CONTRATOS_ABA = "auditoria-contratos";

function deveAuditarContratos(planilhaKey) {
  return (
    planilhaKey === "contratos" ||
    planilhaKey === "cadastro-colaboradores" ||
    planilhaKey === "planilha-3"
  );
}

function linhaParaObjeto(cabecalhos, valores) {
  const obj = {};
  for (let i = 0; i < cabecalhos.length; i++) {
    const col = cabecalhos[i];
    if (col == null || String(col).trim() === "") continue;
    obj[String(col)] = valores[i] != null ? valores[i] : "";
  }
  return obj;
}

function diffObjetos(antes, depois) {
  const alterados = {};
  const chaves = {};
  Object.keys(antes || {}).forEach(function (k) {
    chaves[k] = true;
  });
  Object.keys(depois || {}).forEach(function (k) {
    chaves[k] = true;
  });
  Object.keys(chaves).forEach(function (k) {
    const a = antes[k];
    const d = depois[k];
    if (String(a) !== String(d)) {
      alterados[k] = { antes: a, depois: d };
    }
  });
  return alterados;
}

var CABECALHO_AUDITORIA_CONTRATOS = [
  "data-hora",
  "acao",
  "linha",
  "planilha",
  "origem",
  "usuario",
  "registro-antes",
  "registro-depois",
  "campos-alterados",
];

function obterAbaAuditoriaContratos() {
  const cfg = PLANILHAS.contratos;
  const ss = SpreadsheetApp.openById(cfg.id);
  let sheet = ss.getSheetByName(AUDITORIA_CONTRATOS_ABA);
  if (!sheet) {
    sheet = ss.insertSheet(AUDITORIA_CONTRATOS_ABA);
    sheet.getRange(1, 1, 1, CABECALHO_AUDITORIA_CONTRATOS.length).setValues([
      CABECALHO_AUDITORIA_CONTRATOS,
    ]);
    sheet.setFrozenRows(1);
  } else {
    garantirCabecalhoAuditoriaContratos(sheet);
  }
  return sheet;
}

function garantirCabecalhoAuditoriaContratos(sheet) {
  const ultimaCol = Math.max(sheet.getLastColumn(), 1);
  const cabecalho = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const temUsuario = cabecalho.some(function (col) {
    return normalizarChavePlanilha(col) === "usuario";
  });
  if (!temUsuario) {
    sheet.getRange(1, ultimaCol + 1).setValue("usuario");
  }
}

function indiceColunaAuditoria(sheet, nomeColuna) {
  const ultimaCol = sheet.getLastColumn();
  const cabecalho = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const alvo = normalizarChavePlanilha(nomeColuna);
  for (let i = 0; i < cabecalho.length; i++) {
    if (normalizarChavePlanilha(cabecalho[i]) === alvo) return i;
  }
  return -1;
}

function registrarAuditoriaContratos(planilhaKey, acao, numLinha, antes, depois, origem, usuario) {
  const sheet = obterAbaAuditoriaContratos();
  const agora = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
  const alterados = diffObjetos(antes, depois);
  const ultimaCol = sheet.getLastColumn();
  const linha = new Array(ultimaCol).fill("");

  function porNome(col, valor) {
    const idx = indiceColunaAuditoria(sheet, col);
    if (idx >= 0) linha[idx] = valor;
  }

  porNome("data-hora", agora);
  porNome("acao", acao);
  porNome("linha", numLinha || "");
  porNome("planilha", planilhaKey);
  porNome("origem", origem || "web-app");
  porNome("usuario", usuario || "");
  porNome("registro-antes", JSON.stringify(antes || {}));
  porNome("registro-depois", JSON.stringify(depois || {}));
  porNome("campos-alterados", JSON.stringify(alterados));

  sheet.appendRow(linha);
}

function usuarioDaRequisicao(corpo) {
  const auth = validarChave(corpo && corpo.chave);
  if (auth.ok && auth.usuario) return auth.usuario;
  const informado = corpo && (corpo.usuario || (corpo.auditoria && corpo.auditoria.usuario));
  if (informado) return String(informado).trim();
  return auth.ok ? "" : "desconhecido";
}

function cpfSomenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function cpfValido(valor) {
  const cpf = cpfSomenteDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(cpf.charAt(9))) return false;

  soma = 0;
  for (let j = 0; j < 10; j++) soma += Number(cpf.charAt(j)) * (11 - j);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(cpf.charAt(10));
}

function indiceColunaCabecalho(cabecalhos, aliases) {
  const lista = (aliases || []).map(function (a) {
    return normalizarChavePlanilha(a);
  });
  for (let i = 0; i < cabecalhos.length; i++) {
    if (lista.indexOf(normalizarChavePlanilha(cabecalhos[i])) !== -1) return i;
  }
  return -1;
}

function validarCpfContratos(dados, sheet, cabecalhos, numLinhaIgnorar) {
  const idxCpf = indiceColunaCabecalho(cabecalhos, ["cpf"]);
  if (idxCpf === -1) return;

  let cpfInformado = "";
  for (let i = 0; i < cabecalhos.length; i++) {
    const col = cabecalhos[i];
    if (normalizarChavePlanilha(col) !== "cpf") continue;
    const val = valorDadosColuna(dados, col);
    if (val !== undefined) cpfInformado = val;
    break;
  }

  const cpfNorm = cpfSomenteDigitos(cpfInformado);
  if (!cpfNorm) throw new Error("CPF é obrigatório.");
  if (!cpfValido(cpfNorm)) throw new Error("CPF inválido.");

  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return;

  const valores = sheet.getRange(2, 1, ultimaLinha - 1, cabecalhos.length).getValues();
  for (let linha = 0; linha < valores.length; linha++) {
    const numLinha = linha + 2;
    if (numLinhaIgnorar && numLinha === numLinhaIgnorar) continue;
    const cpfExistente = cpfSomenteDigitos(valores[linha][idxCpf]);
    if (cpfExistente && cpfExistente === cpfNorm) {
      throw new Error("CPF já cadastrado na linha " + numLinha + ".");
    }
  }
}

function escaparRegexDocs(texto) {
  return String(texto || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valorRegistroContrato(registro, chaves) {
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    if (registro[chave] != null && String(registro[chave]).trim() !== "") {
      return String(registro[chave]).trim();
    }
  }

  const lista = (chaves || []).map(function (a) {
    return normalizarChavePlanilha(a);
  });
  const chavesRegistro = Object.keys(registro);
  for (let j = 0; j < chavesRegistro.length; j++) {
    const k = chavesRegistro[j];
    if (k === "_linha") continue;
    if (lista.indexOf(normalizarChavePlanilha(k)) === -1) continue;
    const s = String(registro[k] ?? "").trim();
    if (s) return s;
  }
  return "";
}

function formatarCpfContrato(valor) {
  let digitos = String(valor ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.length < 11) digitos = digitos.padStart(11, "0");
  digitos = digitos.slice(0, 11);
  if (digitos.length !== 11) return String(valor ?? "").trim();
  return (
    digitos.slice(0, 3) +
    "." +
    digitos.slice(3, 6) +
    "." +
    digitos.slice(6, 9) +
    "-" +
    digitos.slice(9)
  );
}

function camposMarcadoresContrato() {
  return [
    { id: "nome-completo", aliases: ["nome-completo", "nome completo", "nome"] },
    { id: "nome-mae", aliases: ["nome-mae", "nome mae", "nome mãe"] },
    { id: "nome-pai", aliases: ["nome-pai", "nome pai"] },
    { id: "cpf", aliases: ["cpf"], formatar: formatarCpfContrato },
    {
      id: "titulo-eleitor",
      aliases: ["titulo-eleitor", "titulo eleitor", "título de eleitor"],
    },
    { id: "municipio", aliases: ["municipio", "município"] },
    {
      id: "vinculado-coordenador",
      aliases: [
        "vinculado-coordenador",
        "vinculado coordenador",
        "vinculo",
        "vínculo",
      ],
    },
    {
      id: "coordenador",
      aliases: [
        "vinculado-coordenador",
        "vinculado coordenador",
        "vinculo",
        "vínculo",
      ],
    },
    { id: "tipo-contrato", aliases: ["tipo-contrato", "tipo contrato"] },
    {
      id: "recebe-bolsa-familia",
      aliases: ["recebe-bolsa-familia", "recebe bolsa familia"],
    },
    { id: "lancamento-sistema", aliases: ["lancamento-sistema", "lancamento sistema"] },
    { id: "chave-pix", aliases: ["chave-pix", "chave pix", "pix"] },
  ];
}

function montarMapaSubstituicoesContrato(registro) {
  const mapa = {};
  const campos = camposMarcadoresContrato();

  campos.forEach(function (campo) {
    let valor = valorRegistroContrato(registro, campo.aliases);
    if (campo.formatar) valor = campo.formatar(valor);
    mapa[campo.id] = valor;
  });

  Object.keys(registro).forEach(function (chave) {
    if (chave === "_linha") return;
    const norm = normalizarChavePlanilha(chave);
    if (norm === "cpf") {
      mapa.cpf = formatarCpfContrato(registro[chave]);
      return;
    }
    if (mapa[norm.replace(/ /g, "-")] == null) {
      mapa[norm.replace(/ /g, "-")] = String(registro[chave] ?? "").trim();
    }
  });

  return mapa;
}

function regexMarcadorCampo(idCampo) {
  const nome = escaparRegexDocs(idCampo);
  return (
    "\\{\\{\\s*" +
    nome +
    "\\s*\\}\\}" +
    "|\\{\\s*\\{\\s*" +
    nome +
    "\\s*\\}\\s*\\}" +
    "|<<\\s*" +
    nome +
    "\\s*>>"
  );
}

function partesSubstituiveisDocumento(doc) {
  const partes = [];
  if (doc.getBody()) partes.push(doc.getBody());
  try {
    const cab = doc.getHeader();
    if (cab) partes.push(cab);
  } catch (e1) {}
  try {
    const rod = doc.getFooter();
    if (rod) partes.push(rod);
  } catch (e2) {}
  return partes;
}

function substituirMarcadoresDocumento(doc, mapa) {
  const partes = partesSubstituiveisDocumento(doc);
  const campos = camposMarcadoresContrato();

  campos.forEach(function (campo) {
    const valor = mapa[campo.id] != null ? String(mapa[campo.id]) : "";
    const regex = regexMarcadorCampo(campo.id);
    partes.forEach(function (parte) {
      parte.replaceText(regex, valor);
    });
    partes.forEach(function (parte) {
      parte.replaceText(escaparRegexDocs("{{" + campo.id + "}}"), valor);
      parte.replaceText(escaparRegexDocs("{ {" + campo.id + "} }"), valor);
      parte.replaceText(escaparRegexDocs("{{ " + campo.id + " }}"), valor);
    });
  });

  Object.keys(registroAliasesExtras(mapa)).forEach(function (marcador) {
    const valor = mapa[marcador];
    partes.forEach(function (parte) {
      parte.replaceText(escaparRegexDocs("{{" + marcador + "}}"), valor);
    });
  });
}

function registroAliasesExtras(mapa) {
  const ids = {};
  camposMarcadoresContrato().forEach(function (c) {
    ids[c.id] = true;
  });
  const extras = {};
  Object.keys(mapa).forEach(function (k) {
    if (!ids[k]) extras[k] = mapa[k];
  });
  return extras;
}

/**
 * Localiza o Google Doc modelo do contrato.
 * 1) Por ID (CONTRATO_TEMPLATE_DOC_ID)
 * 2) Por nome no Drive (CONTRATO_TEMPLATE_NOME = "modelo-contrato")
 */
function obterArquivoModeloContrato() {
  if (CONTRATO_TEMPLATE_DOC_ID) {
    try {
      const porId = DriveApp.getFileById(CONTRATO_TEMPLATE_DOC_ID);
      if (porId && porId.getMimeType() === MimeType.GOOGLE_DOCS) {
        return porId;
      }
    } catch (erroId) {
      Logger.log("Modelo por ID indisponível: " + erroId);
    }
  }

  const busca = DriveApp.getFilesByName(CONTRATO_TEMPLATE_NOME);
  while (busca.hasNext()) {
    const arquivo = busca.next();
    if (arquivo.getMimeType() === MimeType.GOOGLE_DOCS) {
      return arquivo;
    }
  }

  throw new Error(
    "Modelo de contrato não encontrado. Confira no Drive o Google Doc \"" +
      CONTRATO_TEMPLATE_NOME +
      "\" (ou o ID em CONTRATO_TEMPLATE_DOC_ID) e compartilhe com a conta do Apps Script."
  );
}

function gerarPdfContratoDeRegistro(registro) {
  const modelo = obterArquivoModeloContrato();
  const nomeBase =
    valorRegistroContrato(registro, ["nome-completo", "nome completo", "nome"]) ||
    "colaborador";

  const copia = modelo.makeCopy("Contrato - " + nomeBase);
  const doc = DocumentApp.openById(copia.getId());
  substituirMarcadoresDocumento(doc, montarMapaSubstituicoesContrato(registro));
  doc.saveAndClose();

  const pdfBlob = copia.getAs(MimeType.PDF).setName("Contrato - " + nomeBase + ".pdf");
  const pdfFile = DriveApp.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  copia.setTrashed(true);

  return {
    url: pdfFile.getUrl(),
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + pdfFile.getId(),
    nome: pdfFile.getName(),
    modeloId: modelo.getId(),
    modeloNome: modelo.getName(),
  };
}

function imprimirContratoPdf(corpo) {
  const planilha = corpo.planilha || "contratos";
  const nomeAba = corpo.aba || ABA_PADRAO;
  const numLinha = Number(corpo.linha);
  let registro = corpo.dados || {};

  if (numLinha >= 2) {
    const sheet = obterSheet(planilha, nomeAba);
    const ultimaColuna = sheet.getLastColumn();
    const cabecalhos = sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0];
    const existente = sheet.getRange(numLinha, 1, 1, cabecalhos.length).getValues()[0];
    registro = linhaParaObjeto(cabecalhos, existente);
  }

  const pdf = gerarPdfContratoDeRegistro(registro);
  return responder({
    ok: true,
    url: pdf.url,
    downloadUrl: pdf.downloadUrl,
    nome: pdf.nome,
    modelo: pdf.modeloNome,
  });
}

function valorDadosColuna(dados, col) {
  if (!dados || typeof dados !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(dados, col)) return dados[col];

  const colTrim = String(col || "").trim();
  if (colTrim !== col && Object.prototype.hasOwnProperty.call(dados, colTrim)) {
    return dados[colTrim];
  }

  const normCol = normalizarChavePlanilha(col);
  const chaves = Object.keys(dados);
  for (let i = 0; i < chaves.length; i++) {
    const k = chaves[i];
    if (normalizarChavePlanilha(k) === normCol) return dados[k];
  }
  return undefined;
}

function doPostPlanilha(corpo) {
  const planilha = corpo.planilha || PLANILHA_PADRAO;
  const nomeAba = corpo.aba || ABA_PADRAO;
  const sheet = obterSheet(planilha, nomeAba);
  const acao = String(corpo.acao || "inserir").toLowerCase();

  const ultimaColuna = sheet.getLastColumn();
  const cabecalhos =
    ultimaColuna > 0
      ? sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0]
      : CABECALHOS.slice();

  if (acao === "imprimir-contrato") {
    return imprimirContratoPdf(corpo);
  }

  const auditar = deveAuditarContratos(planilha);
  const origemAuditoria = corpo.origem || (corpo.auditoria && corpo.auditoria.origem) || "web-app";
  const usuarioAuditoria = usuarioDaRequisicao(corpo);

  if (acao === "excluir") {
    const numLinha = Number(corpo.linha);
    if (!numLinha || numLinha < 2) {
      throw new Error("Linha inválida para excluir.");
    }
    const existente = sheet.getRange(numLinha, 1, 1, cabecalhos.length).getValues()[0];
    const antes = linhaParaObjeto(cabecalhos, existente);
    sheet.deleteRow(numLinha);
    if (auditar) {
      registrarAuditoriaContratos(
        planilha,
        "excluir",
        numLinha,
        antes,
        {},
        origemAuditoria,
        usuarioAuditoria
      );
    }
    return responder({ ok: true });
  }

  const dados = corpo.dados || corpo;

  if (acao === "atualizar") {
    const numLinha = Number(corpo.linha);
    if (!numLinha || numLinha < 2) {
      throw new Error("Linha inválida para atualizar.");
    }
    if (deveAuditarContratos(planilha)) {
      validarCpfContratos(dados, sheet, cabecalhos, numLinha);
    }
    const existente = sheet.getRange(numLinha, 1, 1, cabecalhos.length).getValues()[0];
    const antes = linhaParaObjeto(cabecalhos, existente);
    const novaLinha = cabecalhos.map(function (col, i) {
      const val = valorDadosColuna(dados, col);
      if (val !== undefined) return val;
      return existente[i] != null ? existente[i] : "";
    });
    sheet.getRange(numLinha, 1, 1, cabecalhos.length).setValues([novaLinha]);
    const depois = linhaParaObjeto(cabecalhos, novaLinha);
    if (auditar) {
      registrarAuditoriaContratos(
        planilha,
        "atualizar",
        numLinha,
        antes,
        depois,
        origemAuditoria,
        usuarioAuditoria
      );
    }
    return responder({ ok: true, linha: numLinha });
  }

  if (deveAuditarContratos(planilha)) {
    validarCpfContratos(dados, sheet, cabecalhos, null);
  }

  const agora = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );

  const linha = cabecalhos.map(function (col) {
    if (col === "data" && dados[col] == null && corpo[col] == null) return agora;
    const val = valorDadosColuna(dados, col);
    if (val !== undefined) return val;
    if (corpo[col] != null) return corpo[col];
    return "";
  });

  sheet.appendRow(linha);
  const numLinhaInserida = sheet.getLastRow();
  if (auditar) {
    registrarAuditoriaContratos(
      planilha,
      "inserir",
      numLinhaInserida,
      {},
      linhaParaObjeto(cabecalhos, linha),
      origemAuditoria,
      usuarioAuditoria
    );
  }
  return responder({ ok: true, linha: numLinhaInserida });
}

/**
 * Resolve a planilha (pela chave) e retorna a aba.
 * Ordem: 1) aba explícita na requisição; 2) nomeAba do cadastro; 3) gid; 4) primeira aba.
 */
function obterSheet(planilhaKey, nomeAbaRequisicao) {
  const cfg = PLANILHAS[planilhaKey];
  if (!cfg) throw new Error("Planilha não cadastrada: " + planilhaKey);

  const ss = SpreadsheetApp.openById(cfg.id);

  if (nomeAbaRequisicao) {
    const porRequisicao = ss.getSheetByName(nomeAbaRequisicao);
    if (porRequisicao) return porRequisicao;
  }
  if (cfg.nomeAba) {
    const porCadastro = ss.getSheetByName(cfg.nomeAba);
    if (porCadastro) return porCadastro;
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
 * Testa só a impressão (Drive + Docs). Rode no editor ANTES de usar o Web App.
 * Veja o link do PDF em: Exibir > Registros de execução.
 */
function testarImpressaoContrato() {
  const registroTeste = {
    "nome-completo": "Teste Autorização",
    cpf: "123.456.789-09",
    municipio: "Teste",
    "vinculado-coordenador": "Coordenador Teste",
    "tipo-contrato": "apoiador 30 dias",
  };

  const pdf = gerarPdfContratoDeRegistro(registroTeste);
  Logger.log("OK — modelo: " + pdf.modeloNome + " (id " + pdf.modeloId + ")");
  Logger.log("PDF: " + pdf.url);
  Logger.log("Download: " + pdf.downloadUrl);
  return pdf;
}

/**
 * Autoriza apenas Drive + Docs + modelo-contrato.
 * Use se o erro for só na impressão.
 */
function autorizarImpressaoContrato() {
  const modelo = obterArquivoModeloContrato();
  Logger.log("Modelo encontrado: " + modelo.getName() + " | id: " + modelo.getId());
  DocumentApp.openById(modelo.getId());
  DriveApp.createFile("autorizacao-impressao-teste.txt", "ok", MimeType.PLAIN_TEXT).setTrashed(true);
  Logger.log("Drive + Docs autorizados. Rode testarImpressaoContrato() em seguida.");
}

/**
 * Rode no editor para conceder Planilhas + Drive + Docs + Agenda.
 * Guia completo: apps-script/AUTORIZAR-IMPRESSAO.md
 */
function autorizar() {
  SpreadsheetApp.openById(PLANILHAS[PLANILHA_PADRAO].id);
  SpreadsheetApp.openById(PLANILHAS.contratos.id);
  autorizarImpressaoContrato();

  Object.keys(AGENDAS).forEach(function (key) {
    const cfg = AGENDAS[key];
    if (!cfg.id) return;
    const cal = CalendarApp.getCalendarById(cfg.id);
    if (cal) Logger.log("Agenda OK (" + key + "): " + cal.getName());
  });

  Logger.log("Concluído. Se a impressão falhar no site, republique o Web App (nova versão).");
}

function responder(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
