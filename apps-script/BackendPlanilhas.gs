/**
 * Backend do projeto Eleição 2026 (Google Apps Script - Web App).
 *
 * Recursos atendidos por UMA única publicação (1 WEB_APP_URL):
 *   - planilha (padrão): leitura/gravação no Google Sheets
 *   - agenda: compromissos (Calendar) + tarefas (Google Tasks)
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
  // Mesma aba apoiadores (colunas B liderança, C município, N federal).
  p["apoiador-federal"] = p.apoiadores;
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
  // Pagamentos por liderança (orçamento × pagamento por categoria).
  p["pagamentos-lideranca"] = {
    id: "1CsSofzZpuEx61r9VnMa9AcTq-QLk-LL3pAeujOwvEXE",
    gid: 195528017,
  };
  p["pessoal-municipio-aba1"] = p["pessoal-municipio"];
  p["pessoal-municipio-aba2"] = p.apoiadores;
  p.municipios = {
    id: "18YWhOfiMa3jM2BnM3pnFeo7q3GSBB3X1uoQADEXs-Jc",
    gid: 0,
  };
  // Mobilização — estrutura de equipe e perspectiva de voto.
  const planilhaMobilizacaoId = "1QtX67qPT4eDkQ5BBD_Xe0zhs6CAplI2_aF4h-7Q3RRc";
  p["mobilizacao-estrutura"] = {
    id: planilhaMobilizacaoId,
    gid: 848441102,
  };
  p["mobilizacao-perspectiva"] = {
    id: planilhaMobilizacaoId,
    gid: 1379972691,
  };
  p.mobilizacao = p["mobilizacao-estrutura"];

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

// Dados fixos da campanha Eleição 2026 — ajuste aqui se CNPJ/endereço mudar.
const CONTRATO_CAMPANHA = {
  ANO: 2026,
  TITULO_ELEICOES: "ELEIÇÕES 2026",
  CONTRATANTE_RAZAO: "ELEICAO 2026 DR. EUGENIO DE PAIVA DEPUTADO ESTADUAL",
  CONTRATANTE_CNPJ: "47.431.376/0001-14",
  CONTRATANTE_ENDERECO: "Rua 05, 2055, LC, na cidade de Água Boa - MT",
  REPRESENTANTE_NOME: "REGINALDO MARTINS DEL COLLE",
  REPRESENTANTE_CARGO: "Administrador Financeiro",
  REPRESENTANTE_NACIONALIDADE: "brasileiro",
  REPRESENTANTE_PROFISSAO: "Contador",
  REPRESENTANTE_RG: "8118999 SSP/MG",
  REPRESENTANTE_CPF: "893.843.936-49",
  REPRESENTANTE_ENDERECO:
    "Rua Travessa 04, s/n, Centro Sul, Nova Nazaré - MT, CEP 78638-000",
  CARGO_CANDIDATO: "DEPUTADO ESTADUAL",
  DATA_FIM_CAMPANHA: "04 de outubro de 2026",
  FORO: "Cuiabá/MT",
  LOCAL_ASSINATURA: "CUIABÁ-MT",
  REMUNERACAO_PADRAO: {
    valor: "600,00",
    extenso: "SEISCENTOS REAIS",
    horas: "04:00",
    objeto: "CABO ELEITORAL",
  },
  REMUNERACAO_POR_TIPO: {
    "apoiador 30 dias": {
      valor: "600,00",
      extenso: "SEISCENTOS REAIS",
      horas: "04:00",
      objeto: "CABO ELEITORAL",
    },
    "apoiador 45 dias": {
      valor: "900,00",
      extenso: "NOVECENTOS REAIS",
      horas: "04:00",
      objeto: "CABO ELEITORAL",
    },
    "apoiador lider": {
      valor: "1.200,00",
      extenso: "MIL E DUZENTOS REAIS",
      horas: "04:00",
      objeto: "APOIADOR LÍDER",
    },
    "apoiador customizado": {
      valor: "600,00",
      extenso: "SEISCENTOS REAIS",
      horas: "04:00",
      objeto: "CABO ELEITORAL",
    },
  },
};

// ===================== AGENDA =====================

// Várias agendas alimentam o mesmo calendário na leitura.
// Novos eventos vão para a agenda indicada em corpo.origem (padrão: AGENDA_GRAVACAO).
const AGENDAS = {
  campanha: {
    id: "5022e5968413188b563f3ed7f37711c25a4ddf55dd9e05183b045c82f1a5b840@group.calendar.google.com",
    titulo: "Campanha",
  },
  gabinete: {
    id: "f9c2882b275996cd5a04681b7de07072bd6355b45820b64a0f86f5ab7b335252@group.calendar.google.com",
    titulo: "Gabinete",
  },
  eventos: {
    id: "2a2a853562b3f94514d02822e1ab1c23554f8f09cc2a16e69fcf8d24bd0553e3@group.calendar.google.com",
    titulo: "Eventos",
  },
};

const AGENDA_GRAVACAO = "campanha";

// Listas do Google Tasks (aba Tarefas) — uma por agenda.
// Se listaId estiver vazio, a lista é localizada/criada pelo tituloLista.
const TAREFAS_AGENDA = {
  campanha: { tituloLista: "Campanha", listaId: "" },
  gabinete: { tituloLista: "Gabinete", listaId: "" },
  eventos: { tituloLista: "Eventos", listaId: "" },
};

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
    if (chave === "apoiadores" || chave === "apoiador-federal") return true;
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

function formatarDataContrato(data) {
  const d = data || new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function remuneracaoPorTipoContrato(tipoContrato) {
  const chave = normalizarChavePlanilha(tipoContrato || "");
  const mapa = CONTRATO_CAMPANHA.REMUNERACAO_POR_TIPO || {};
  const chaves = Object.keys(mapa);
  for (let i = 0; i < chaves.length; i++) {
    if (normalizarChavePlanilha(chaves[i]) === chave) return mapa[chaves[i]];
  }
  return CONTRATO_CAMPANHA.REMUNERACAO_PADRAO;
}

function montarBlocoContratante() {
  const c = CONTRATO_CAMPANHA;
  return (
    c.CONTRATANTE_RAZAO +
    ", inscrito no CNPJ nº " +
    c.CONTRATANTE_CNPJ +
    ", com sede a " +
    c.CONTRATANTE_ENDERECO +
    ", neste ato representado pelo seu " +
    c.REPRESENTANTE_CARGO +
    " " +
    c.REPRESENTANTE_NOME +
    ", " +
    c.REPRESENTANTE_NACIONALIDADE +
    ", " +
    c.REPRESENTANTE_PROFISSAO +
    ", portador da cédula de identidade nº " +
    c.REPRESENTANTE_RG +
    " e cadastro de pessoa física nº " +
    c.REPRESENTANTE_CPF +
    ", residente e domiciliado à " +
    c.REPRESENTANTE_ENDERECO
  );
}

function montarBlocoContratado(registro) {
  const nome = valorRegistroContrato(registro, [
    "nome-completo",
    "nome completo",
    "nome",
  ]);
  const cpf = formatarCpfContrato(valorRegistroContrato(registro, ["cpf"]));
  const titulo = valorRegistroContrato(registro, [
    "titulo-eleitor",
    "titulo eleitor",
    "título de eleitor",
  ]);
  const municipio = valorRegistroContrato(registro, ["municipio", "município"]);

  let bloco = nome || "________________________";
  const partesDoc = [];
  if (titulo) partesDoc.push("título de eleitor nº " + titulo);
  if (cpf) partesDoc.push("cadastro de pessoa física nº " + cpf);
  if (partesDoc.length === 1) {
    bloco += ", portador(a) do " + partesDoc[0];
  } else if (partesDoc.length === 2) {
    bloco +=
      ", portador(a) do " + partesDoc[0] + " e do " + partesDoc[1];
  }
  if (municipio) bloco += ", residente e domiciliado(a) em " + municipio + "-MT";
  return bloco;
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
    { id: "titulo-eleicoes", aliases: [] },
    { id: "ano-campanha", aliases: [] },
    { id: "contratante-bloco", aliases: [] },
    { id: "contratado-bloco", aliases: [] },
    { id: "objeto-servico", aliases: [] },
    { id: "carga-horaria", aliases: [] },
    { id: "valor-remuneracao", aliases: [] },
    { id: "valor-extenso", aliases: [] },
    { id: "cargo-candidato", aliases: [] },
    { id: "data-fim-campanha", aliases: [] },
    { id: "foro", aliases: [] },
    { id: "local-assinatura", aliases: [] },
    { id: "data-contrato", aliases: [] },
  ];
}

function montarMapaSubstituicoesContrato(registro) {
  const mapa = {};
  const campos = camposMarcadoresContrato();
  const tipoContrato = valorRegistroContrato(registro, [
    "tipo-contrato",
    "tipo contrato",
  ]);
  const remuneracao = remuneracaoPorTipoContrato(tipoContrato);
  const campanha = CONTRATO_CAMPANHA;

  campos.forEach(function (campo) {
    let valor = valorRegistroContrato(registro, campo.aliases);
    if (campo.formatar) valor = campo.formatar(valor);
    mapa[campo.id] = valor;
  });

  mapa["titulo-eleicoes"] = campanha.TITULO_ELEICOES;
  mapa["ano-campanha"] = String(campanha.ANO);
  mapa["contratante-bloco"] = montarBlocoContratante();
  mapa["contratado-bloco"] = montarBlocoContratado(registro);
  mapa["objeto-servico"] = remuneracao.objeto;
  mapa["carga-horaria"] = remuneracao.horas;
  mapa["valor-remuneracao"] = remuneracao.valor;
  mapa["valor-extenso"] = remuneracao.extenso;
  mapa["cargo-candidato"] = campanha.CARGO_CANDIDATO;
  mapa["data-fim-campanha"] = campanha.DATA_FIM_CAMPANHA;
  mapa["foro"] = campanha.FORO;
  mapa["local-assinatura"] = campanha.LOCAL_ASSINATURA;
  mapa["data-contrato"] = formatarDataContrato(new Date());

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

// Dashboard (planilha votacao): somente colunas I e J — votação mínima e meta votação.
const DASHBOARD_COL_MINIMA = 9; // I (1-based)
const DASHBOARD_COL_IDEAL = 10; // J (1-based)

// Pagamentos por liderança: somente colunas D F H J L P R T U (índices 0-based).
const PAGAMENTOS_LIDERANCA_COLS_EDITAVEIS = [3, 5, 7, 9, 11, 15, 17, 19, 20];

function atualizarLinhaPagamentosLideranca(sheet, numLinha, existente, cabecalhos, dados) {
  const novaLinha = existente.slice();
  PAGAMENTOS_LIDERANCA_COLS_EDITAVEIS.forEach(function (i) {
    if (i >= cabecalhos.length) return;
    const col = cabecalhos[i];
    const val = valorDadosColuna(dados, col);
    if (val === undefined) return;
    sheet.getRange(numLinha, i + 1).setValue(val);
    novaLinha[i] = val;
  });
  return novaLinha;
}

function atualizarLinhaDashboard(sheet, numLinha, existente, dados) {
  const novaLinha = existente.slice();
  if (dados && Object.prototype.hasOwnProperty.call(dados, "minima")) {
    sheet.getRange(numLinha, DASHBOARD_COL_MINIMA).setValue(dados.minima);
    novaLinha[DASHBOARD_COL_MINIMA - 1] = dados.minima;
  }
  if (dados && Object.prototype.hasOwnProperty.call(dados, "ideal")) {
    sheet.getRange(numLinha, DASHBOARD_COL_IDEAL).setValue(dados.ideal);
    novaLinha[DASHBOARD_COL_IDEAL - 1] = dados.ideal;
  }
  return novaLinha;
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
    let novaLinha;
    if (origemAuditoria === "dashboard") {
      novaLinha = atualizarLinhaDashboard(sheet, numLinha, existente, dados);
    } else if (origemAuditoria === "pagamentos-lideranca" || planilha === "pagamentos-lideranca") {
      novaLinha = atualizarLinhaPagamentosLideranca(sheet, numLinha, existente, cabecalhos, dados);
    } else {
      novaLinha = cabecalhos.map(function (col, i) {
        const val = valorDadosColuna(dados, col);
        if (val !== undefined) return val;
        return existente[i] != null ? existente[i] : "";
      });
      sheet.getRange(numLinha, 1, 1, cabecalhos.length).setValues([novaLinha]);
    }
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

function obterSheetPorNome(ss, nome) {
  if (!nome) return null;
  const direto = ss.getSheetByName(nome);
  if (direto) return direto;
  const norm = normalizarChavePlanilha(nome);
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) {
    if (normalizarChavePlanilha(abas[i].getName()) === norm) return abas[i];
  }
  return null;
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
    const porRequisicao = obterSheetPorNome(ss, nomeAbaRequisicao);
    if (porRequisicao) return porRequisicao;
  }
  if (cfg.nomeAba) {
    const porCadastro = obterSheetPorNome(ss, cfg.nomeAba);
    if (porCadastro) return porCadastro;
    throw new Error(
      "Aba não encontrada: " + cfg.nomeAba + " (planilha " + planilhaKey + ")"
    );
  }
  if (cfg.gid != null && cfg.gid !== 0) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId() === cfg.gid) return abas[i];
    }
    throw new Error(
      "Aba gid " + cfg.gid + " não encontrada (planilha " + planilhaKey + ")"
    );
  }
  return ss.getSheets()[0];
}

// ===================== AGENDA (handlers) =====================

// ID efetivo: AGENDAS[chave].id ou propriedade AGENDA_*_ID (ver AGENDA_ID_PROP).
const AGENDA_ID_PROP = {
  gabinete: "AGENDA_GABINETE_ID",
  eventos: "AGENDA_EVENTOS_ID",
};

function idAgendaCalendario(chave) {
  const key = String(chave || "");
  const cfg = AGENDAS[key];
  if (!cfg) return "";
  const idFixo = String(cfg.id || "").trim();
  if (idFixo) return idFixo;
  const prop = AGENDA_ID_PROP[key];
  if (prop) {
    return String(
      PropertiesService.getScriptProperties().getProperty(prop) || ""
    ).trim();
  }
  return "";
}

function chaveAgenda(chave) {
  const key = String(chave || "").trim();
  if (key === "pessoal") return "gabinete";
  return key || AGENDA_GRAVACAO;
}

function resumoAgendas() {
  const out = {};
  Object.keys(AGENDAS).forEach(function (key) {
    const cfg = AGENDAS[key];
    const id = idAgendaCalendario(key);
    out[key] = {
      titulo: cfg.titulo,
      cadastrada: !!id,
      gravacao: !!id,
    };
  });
  return out;
}

function obterAgenda(chave) {
  const key = chave || AGENDA_GRAVACAO;
  const cfg = AGENDAS[key];
  const id = idAgendaCalendario(key);
  if (!cfg || !id) {
    throw new Error(
      "Agenda não cadastrada: " +
        key +
        ". Configure AGENDAS." +
        key +
        ".id" +
        (AGENDA_ID_PROP[key]
          ? " ou a propriedade " + AGENDA_ID_PROP[key]
          : "") +
        " no Apps Script e publique nova versão do Web App."
    );
  }
  const cal = CalendarApp.getCalendarById(id);
  if (!cal) {
    throw new Error(
      "Agenda sem acesso: " + key + ". Compartilhe com a conta do Apps Script."
    );
  }
  return cal;
}

function parseAgendaMeta(descricao) {
  const txt = String(descricao || "");
  const m = txt.match(/<!--agenda-app:([^>]*)-->/);
  if (!m) return { texto: txt.trim(), meta: {} };
  const meta = {};
  m[1].split(";").forEach(function (par) {
    const p = par.split("=");
    if (p[0]) meta[p[0].trim()] = (p[1] || "").trim();
  });
  return { texto: txt.replace(/<!--agenda-app:[^>]*-->/, "").trim(), meta: meta };
}

function montarDescricaoAgenda(texto, meta) {
  const base = String(texto || "").trim();
  const keys = Object.keys(meta || {});
  if (!keys.length) return base;
  const tag =
    "<!--agenda-app:" +
    keys
      .map(function (k) {
        return k + "=" + meta[k];
      })
      .join(";") +
    "-->";
  return base ? base + "\n" + tag : tag;
}

function eventoParaJson(ev, origem, origemTitulo) {
  const parsed = parseAgendaMeta(ev.getDescription() || "");
  const legadoTarefa = parsed.meta.tipo === "tarefa";
  return {
    id: ev.getId(),
    origem: origem,
    origemTitulo: origemTitulo,
    tipo: legadoTarefa ? "tarefa" : "evento",
    legadoCalendario: legadoTarefa,
    concluida: parsed.meta.concluida === "1",
    titulo: ev.getTitle(),
    inicio: ev.getStartTime().toISOString(),
    fim: ev.getEndTime().toISOString(),
    diaInteiro: ev.isAllDayEvent(),
    local: ev.getLocation() || "",
    descricao: parsed.texto,
  };
}

function ehIdTarefaGoogle(id) {
  return String(id || "").indexOf("tarefa:") === 0;
}

function idTarefaComposto(origem, taskId) {
  return "tarefa:" + chaveAgenda(origem) + ":" + taskId;
}

function parseIdTarefaGoogle(id) {
  const partes = String(id || "").split(":");
  if (partes[0] !== "tarefa" || partes.length < 3) return null;
  return {
    origem: partes[1],
    taskId: partes.slice(2).join(":"),
  };
}

function dataParaDueGoogle(valor) {
  const txt = String(valor || "").trim();
  const m = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3] + "T00:00:00.000Z";
  const d = new Date(valor);
  if (isNaN(d.getTime())) throw new Error("Data inválida.");
  return Utilities.formatDate(d, "UTC", "yyyy-MM-dd'T'00:00:00.000Z'");
}

function inicioDeDueTask(task) {
  if (!task.due) {
    return Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd'T'12:00:00.000Z'");
  }
  const m = String(task.due).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3] + "T12:00:00.000Z";
  return task.due;
}

function idListaTarefas(origem) {
  const key = chaveAgenda(origem);
  const cfg = TAREFAS_AGENDA[key];
  if (!cfg) throw new Error("Lista de tarefas não configurada: " + key);

  const idFixo = String(cfg.listaId || "").trim();
  if (idFixo) return idFixo;

  const prop = PropertiesService.getScriptProperties().getProperty(
    "AGENDA_TAREFAS_" + key.toUpperCase() + "_LIST_ID"
  );
  if (prop) return String(prop).trim();

  const titulo = cfg.tituloLista || key;
  const listas = Tasks.Tasklists.list();
  const items = listas.items || [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].title === titulo) return items[i].id;
  }

  const nova = Tasks.Tasklists.insert({ title: titulo });
  return nova.id;
}

function tarefaParaJson(task, origem, origemTitulo) {
  const parsed = parseAgendaMeta(task.notes || "");
  const inicio = inicioDeDueTask(task);
  return {
    id: idTarefaComposto(origem, task.id),
    origem: origem,
    origemTitulo: origemTitulo,
    tipo: "tarefa",
    legadoCalendario: false,
    concluida: task.status === "completed",
    titulo: task.title || "",
    inicio: inicio,
    fim: inicio,
    diaInteiro: true,
    local: "",
    descricao: parsed.texto,
  };
}

function tarefaNoPeriodo(task, inicio, fim) {
  if (!task.due) return true;

  const due = new Date(task.due);
  if (due >= inicio && due <= fim) return true;

  // Concluídas podem ter prazo fora do mês — incluir pela data de conclusão.
  if (task.status === "completed" && task.completed) {
    const concluidaEm = new Date(task.completed);
    return concluidaEm >= inicio && concluidaEm <= fim;
  }

  return false;
}

function listarTarefasGoogle(inicio, fim) {
  const todos = [];
  Object.keys(TAREFAS_AGENDA).forEach(function (key) {
    const cfgAgenda = AGENDAS[key];
    if (!cfgAgenda) return;
    let listaId;
    try {
      listaId = idListaTarefas(key);
    } catch (err) {
      Logger.log("Tarefas (" + key + "): " + err.message);
      return;
    }
    if (!listaId) return;

    let pageToken;
    do {
      const resp = Tasks.Tasks.list(listaId, {
        showCompleted: true,
        showHidden: true,
        maxResults: 100,
        pageToken: pageToken,
      });
      (resp.items || []).forEach(function (task) {
        if (tarefaNoPeriodo(task, inicio, fim)) {
          todos.push(tarefaParaJson(task, key, cfgAgenda.titulo));
        }
      });
      pageToken = resp.nextPageToken;
    } while (pageToken);
  });
  return todos;
}

function obterEventoCalendario(id, origem) {
  if (!id) return null;

  const chaves = [];
  if (origem) chaves.push(chaveAgenda(origem));
  Object.keys(AGENDAS).forEach(function (key) {
    if (chaves.indexOf(key) < 0) chaves.push(key);
  });

  const buscaInicio = new Date();
  buscaInicio.setFullYear(buscaInicio.getFullYear() - 1);
  const buscaFim = new Date();
  buscaFim.setFullYear(buscaFim.getFullYear() + 2);

  try {
    const direto = CalendarApp.getEventById(id);
    if (direto) return direto;
  } catch (err) {}

  for (let i = 0; i < chaves.length; i++) {
    try {
      const cal = obterAgenda(chaves[i]);
      const eventos = cal.getEvents(buscaInicio, buscaFim);
      for (let j = 0; j < eventos.length; j++) {
        if (eventos[j].getId() === id) return eventos[j];
      }
    } catch (err) {}
  }
  return null;
}

function listarItensAgenda(inicio, fim) {
  const compromissos = [];
  const tarefasLegado = [];

  listarEventosAgendas(inicio, fim).forEach(function (item) {
    if (item.tipo === "tarefa" && item.legadoCalendario) {
      tarefasLegado.push(item);
    } else if (item.tipo !== "tarefa") {
      compromissos.push(item);
    }
  });

  const tarefas = listarTarefasGoogle(inicio, fim).concat(tarefasLegado);
  const todos = compromissos.concat(tarefas);
  todos.sort(function (a, b) {
    return new Date(a.inicio) - new Date(b.inicio);
  });
  return todos;
}

function listarEventosAgendas(inicio, fim) {
  const todos = [];
  Object.keys(AGENDAS).forEach(function (key) {
    const cfg = AGENDAS[key];
    const id = idAgendaCalendario(key);
    if (!id) return;
    const cal = CalendarApp.getCalendarById(id);
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

  return responder({
    ok: true,
    eventos: listarItensAgenda(inicio, fim),
    agendas: resumoAgendas(),
  });
}

// Cria, atualiza ou exclui compromissos (Calendar) e tarefas (Google Tasks).
function doPostAgenda(corpo) {
  if (corpo.acao === "excluir") {
    if (ehIdTarefaGoogle(corpo.id)) return excluirTarefaGoogle(corpo);
    return excluirEventoAgenda(corpo);
  }
  if (corpo.acao === "alternar-tarefa") {
    if (ehIdTarefaGoogle(corpo.id)) return alternarTarefaGoogle(corpo);
    return alternarTarefaLegadoAgenda(corpo);
  }
  if (corpo.acao === "atualizar") {
    if (ehIdTarefaGoogle(corpo.id)) return atualizarTarefaGoogle(corpo);
    if (corpo.tipo === "tarefa" || corpo.legadoCalendario) {
      return atualizarTarefaLegadoAgenda(corpo);
    }
    return atualizarEventoAgenda(corpo);
  }
  if (corpo.tipo === "tarefa") return criarTarefaGoogle(corpo);

  const cal = obterAgenda(chaveAgenda(corpo.origem));

  if (!corpo.titulo) throw new Error("Título é obrigatório.");
  if (!corpo.inicio) throw new Error("Data/hora de início é obrigatória.");

  const inicio = new Date(corpo.inicio);
  const opcoes = {};
  if (corpo.descricao) opcoes.description = corpo.descricao;
  if (corpo.local) opcoes.location = corpo.local;

  let ev;
  if (corpo.diaInteiro) {
    const fim = corpo.fim ? new Date(corpo.fim) : null;
    if (fim && fim.getTime() > inicio.getTime()) {
      ev = cal.createAllDayEvent(corpo.titulo, inicio, fim);
      if (corpo.descricao) ev.setDescription(corpo.descricao);
      if (corpo.local) ev.setLocation(corpo.local);
    } else {
    ev = cal.createAllDayEvent(corpo.titulo, inicio, opcoes);
    }
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

function precisaTransferirAgenda(corpo) {
  if (!corpo.origemAnterior || !corpo.origem) return false;
  return chaveAgenda(corpo.origemAnterior) !== chaveAgenda(corpo.origem);
}

function transferirEventoAgenda(corpo) {
  const origemAnt = chaveAgenda(corpo.origemAnterior);
  const origemNova = chaveAgenda(corpo.origem);

  const ev = obterEventoCalendario(corpo.id, origemAnt);
  if (!ev) throw new Error("Evento não encontrado para transferir: " + corpo.id);

  const titulo = corpo.titulo || ev.getTitle();
  const inicio = corpo.inicio ? new Date(corpo.inicio) : ev.getStartTime();
  const fim = corpo.fim ? new Date(corpo.fim) : ev.getEndTime();
  const diaInteiro =
    corpo.diaInteiro != null ? !!corpo.diaInteiro : ev.isAllDayEvent();
  const local = corpo.local != null ? corpo.local : ev.getLocation();
  const descricao = corpo.descricao != null ? corpo.descricao : ev.getDescription();

  const cal = obterAgenda(origemNova);
  const opcoes = {};
  if (descricao) opcoes.description = descricao;
  if (local) opcoes.location = local;

  let novo;
  if (diaInteiro) {
    const fimExclusivo = corpo.fim ? new Date(corpo.fim) : null;
    if (fimExclusivo && fimExclusivo.getTime() > inicio.getTime()) {
      novo = cal.createAllDayEvent(titulo, inicio, fimExclusivo);
      if (descricao) novo.setDescription(descricao);
      if (local) novo.setLocation(local);
    } else {
      novo = cal.createAllDayEvent(titulo, inicio, opcoes);
    }
  } else {
    novo = cal.createEvent(titulo, inicio, fim, opcoes);
  }

  ev.deleteEvent();

  return responder({
    ok: true,
    id: novo.getId(),
    origem: origemNova,
    transferido: true,
  });
}

function transferirTarefaGoogle(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  const ref = parseIdTarefaGoogle(corpo.id);
  if (!ref) throw new Error("ID de tarefa inválido: " + corpo.id);

  const origemNova = chaveAgenda(corpo.origem);
  const listaAnt = idListaTarefas(ref.origem);
  const atual = Tasks.Tasks.get(listaAnt, ref.taskId);

  const titulo = corpo.titulo || atual.title;
  const notes = corpo.descricao != null ? corpo.descricao : atual.notes;
  const due = corpo.inicio ? dataParaDueGoogle(corpo.inicio) : atual.due;
  const status =
    corpo.concluida != null
      ? corpo.concluida
        ? "completed"
        : "needsAction"
      : atual.status;

  const listaNova = idListaTarefas(origemNova);
  const nova = Tasks.Tasks.insert(
    {
      title: titulo,
      notes: notes || "",
      due: due,
      status: status || "needsAction",
    },
    listaNova
  );
  Tasks.Tasks.remove(listaAnt, ref.taskId);

  return responder({
    ok: true,
    id: idTarefaComposto(origemNova, nova.id),
    origem: origemNova,
    transferido: true,
  });
}

function criarTarefaGoogle(corpo) {
  if (!corpo.titulo) throw new Error("Título é obrigatório.");
  if (!corpo.inicio) throw new Error("Prazo da tarefa é obrigatório.");

  const origem = chaveAgenda(corpo.origem);
  const listaId = idListaTarefas(origem);
  const task = Tasks.Tasks.insert(
    {
      title: corpo.titulo,
      notes: corpo.descricao || "",
      due: dataParaDueGoogle(corpo.inicio),
      status: "needsAction",
    },
    listaId
  );

  return responder({
    ok: true,
    id: idTarefaComposto(origem, task.id),
  });
}

function atualizarTarefaGoogle(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  const ref = parseIdTarefaGoogle(corpo.id);
  if (!ref) throw new Error("ID de tarefa inválido: " + corpo.id);

  const origemNova = corpo.origem ? chaveAgenda(corpo.origem) : ref.origem;
  if (precisaTransferirAgenda(corpo) || ref.origem !== origemNova) {
    return transferirTarefaGoogle(corpo);
  }

  const listaId = idListaTarefas(ref.origem);
  const atual = Tasks.Tasks.get(listaId, ref.taskId);
  if (corpo.titulo) atual.title = corpo.titulo;
  if (corpo.descricao != null) atual.notes = corpo.descricao;
  if (corpo.concluida != null) {
    atual.status = corpo.concluida ? "completed" : "needsAction";
  }
  if (corpo.inicio) atual.due = dataParaDueGoogle(corpo.inicio);
  Tasks.Tasks.update(atual, listaId, ref.taskId);

  return responder({ ok: true, id: corpo.id });
}

function alternarTarefaGoogle(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  const ref = parseIdTarefaGoogle(corpo.id);
  if (!ref) throw new Error("ID de tarefa inválido: " + corpo.id);

  const listaId = idListaTarefas(ref.origem);
  const atual = Tasks.Tasks.get(listaId, ref.taskId);
  atual.status = corpo.concluida ? "completed" : "needsAction";
  Tasks.Tasks.update(atual, listaId, ref.taskId);

  return responder({
    ok: true,
    id: corpo.id,
    concluida: !!corpo.concluida,
  });
}

function atualizarTarefaLegadoAgenda(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  if (precisaTransferirAgenda(corpo)) return transferirEventoAgenda(corpo);

  const ev = obterEventoCalendario(corpo.id, corpo.origemAnterior || corpo.origem);
  if (!ev) throw new Error("Tarefa não encontrada: " + corpo.id);

  const parsed = parseAgendaMeta(ev.getDescription() || "");
  if (corpo.titulo) ev.setTitle(corpo.titulo);
  const texto = corpo.descricao != null ? corpo.descricao : parsed.texto;
  if (corpo.concluida != null) parsed.meta.concluida = corpo.concluida ? "1" : "0";
  parsed.meta.tipo = "tarefa";
  ev.setDescription(montarDescricaoAgenda(texto, parsed.meta));
  if (corpo.inicio) ev.setAllDayDate(new Date(corpo.inicio));

  return responder({ ok: true, id: corpo.id });
}

function excluirTarefaGoogle(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  const ref = parseIdTarefaGoogle(corpo.id);
  if (!ref) throw new Error("ID de tarefa inválido: " + corpo.id);

  const listaId = idListaTarefas(ref.origem);
  Tasks.Tasks.remove(listaId, ref.taskId);
  return responder({ ok: true, id: corpo.id });
}

function alternarTarefaLegadoAgenda(corpo) {
  if (!corpo.id) throw new Error("ID da tarefa é obrigatório.");
  const ev = obterEventoCalendario(corpo.id, corpo.origemAnterior || corpo.origem);
  if (!ev) throw new Error("Tarefa não encontrada: " + corpo.id);

  const parsed = parseAgendaMeta(ev.getDescription() || "");
  if (parsed.meta.tipo !== "tarefa") {
    throw new Error("O item informado não é uma tarefa legada.");
  }
  parsed.meta.concluida = corpo.concluida ? "1" : "0";
  ev.setDescription(montarDescricaoAgenda(parsed.texto, parsed.meta));

  return responder({
    ok: true,
    id: corpo.id,
    concluida: !!corpo.concluida,
  });
}

function excluirEventoAgenda(corpo) {
  if (!corpo.id) throw new Error("ID do evento é obrigatório.");
  const ev = obterEventoCalendario(corpo.id, corpo.origemAnterior || corpo.origem);
  if (!ev) throw new Error("Evento não encontrado: " + corpo.id);
  ev.deleteEvent();
  return responder({ ok: true, id: corpo.id });
}

// Atualiza compromisso existente no Google Calendar.
function atualizarEventoAgenda(corpo) {
  if (!corpo.id) throw new Error("ID do evento é obrigatório.");
  if (precisaTransferirAgenda(corpo)) return transferirEventoAgenda(corpo);

  const ev = obterEventoCalendario(corpo.id, corpo.origemAnterior || corpo.origem);
  if (!ev) throw new Error("Evento não encontrado: " + corpo.id);

  if (corpo.titulo) ev.setTitle(corpo.titulo);
  if (corpo.local != null) ev.setLocation(corpo.local);
  if (corpo.descricao != null) ev.setDescription(corpo.descricao);

  if (!corpo.inicio) {
    return responder({ ok: true, id: ev.getId() });
  }

  const inicio = new Date(corpo.inicio);
  if (corpo.diaInteiro) {
    const fim = corpo.fim ? new Date(corpo.fim) : null;
    if (fim && fim.getTime() > inicio.getTime()) {
      ev.setAllDayDates(inicio, fim);
    } else {
    ev.setAllDayDate(inicio);
    }
  } else {
    const fim = corpo.fim
      ? new Date(corpo.fim)
      : new Date(inicio.getTime() + 60 * 60000);
    ev.setTime(inicio, fim);
  }

  return responder({ ok: true, id: ev.getId() });
}

// ===================== UTIL / AUTORIZAÇÃO MANUAL =====================

/**
 * Reescreve o Google Doc modelo-contrato com o texto padrão (Eleição 2026).
 * Rode no editor Apps Script após colar o BackendPlanilhas.gs atualizado.
 */
function atualizarModeloContratoNoDrive() {
  const modelo = obterArquivoModeloContrato();
  const doc = DocumentApp.openById(modelo.getId());
  const corpo = doc.getBody();
  corpo.clear();

  const linhas = [
    "CONTRATO DE PRESTAÇÃO DE SERVIÇO PARA CAMPANHA ELEITORAL – {{titulo-eleicoes}}",
    "",
    "CONTRATANTE: {{contratante-bloco}}",
    "",
    "CONTRATADO: {{contratado-bloco}}. As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços por Prazo Determinado para fins da Campanha Eleitoral {{ano-campanha}}, com base no Artigo 100 da Lei nº 9.504/1997 e mediante as seguintes cláusulas e condições:",
    "",
    "DO OBJETO DO CONTRATO",
    "Cláusula Primeira: É objeto do presente contrato a prestação de serviços {{objeto-servico}} para a Campanha Eleitoral {{ano-campanha}}. Parágrafo Único: A prestação de serviços consistirá na realização de tarefas ou atividades mencionadas no caput deste artigo, por {{carga-horaria}} horas diárias, de segunda a sábado, sob a supervisão da coordenação – comitê.",
    "",
    "DAS OBRIGAÇÕES DO CONTRATADO",
    "Cláusula Segunda: O CONTRATADO obriga-se a prestar os serviços respeitando os bons modos e costumes, adotando uma conduta ética e moral e respeitando as regras sociais e legais de modo a não denegrir, sob qualquer pretexto, o nome e a imagem do CONTRATANTE. §1º. Se, a qualquer título, a conduta do CONTRATADO deixar a desejar ou ferir os preceitos, não limitados, mencionados no caput desta cláusula, fica facultado ao CONTRATANTE rescindir o presente contrato de prestação de serviços, sem que seja devido ao CONTRATADO qualquer espécie de indenização.",
    "§2º. Qualquer prejuízo que, eventualmente, venha a ser causado ao CONTRATANTE em face de conduta inadequada do CONTRATADO, facultará ao CONTRATANTE cobrá-lo do CONTRATADO ou descontar-lhe da remuneração que este tiver a receber, independentemente da faculdade de rescindir o contrato de prestação de serviços.",
    "",
    "DAS OBRIGAÇÕES DO CONTRATANTE",
    "Cláusula Terceira: O CONTRATANTE obriga-se a dar o suporte físico, técnico e pessoal necessário para que o CONTRATADO possa bem exercer seus serviços, tarefas e atividades.",
    "Cláusula Quarta: O CONTRATANTE obriga-se a pagar dentro do prazo ajustado pelas partes a remuneração devida ao CONTRATADO em face de sua prestação de serviços.",
    "",
    "DA REMUNERAÇÃO PELOS SERVIÇOS PRESTADOS",
    "Cláusula Quinta: Pela prestação dos serviços ajustados neste instrumento, o CONTRATANTE pagará ao CONTRATADO a quantia mensal de R$ {{valor-remuneracao}} ({{valor-extenso}}), a serem pagos em 01 parcela. Parágrafo Único: Na eventualidade de ocorrer a rescisão do contrato antes de cumprida a carga horária semanal da prestação de serviços, a remuneração será paga pro-rata tempore pelo CONTRATANTE ao CONTRATADO.",
    "",
    "DO PRAZO DA PRESTAÇÃO DE SERVIÇOS",
    "Cláusula Sexta: Como a prestação de serviços é contratada para a CAMPANHA ELEITORAL DE {{ano-campanha}}, da qual o CONTRATANTE participa como candidato à {{cargo-candidato}} seu prazo de duração está diretamente relacionado ao prazo de duração da Campanha Eleitoral, iniciando-se a partir da assinatura deste instrumento e terminado em {{data-fim-campanha}}.",
    "",
    "DAS CONDIÇÕES GERAIS",
    "Cláusula Sétima: O presente contrato é ajustado pelas partes sem que haja ou gere vínculo empregatício, sendo regulado pela Lei nº 9.504, de 30 de setembro de 1997 e pelo Código Civil Brasileiro.",
    "",
    "DO FORO",
    "Cláusula Oitava: Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {{foro}}, renunciando a qualquer outro.",
    "E, por estarem justas e acordadas, as partes assinam o presente Contrato de Prestação de Serviços por Prazo Determinado para fins de Campanha Eleitoral {{ano-campanha}}, em 02 (duas) vias de iguais teor e forma, na presença de testemunhas.",
    "",
    "{{local-assinatura}}, {{data-contrato}}.",
    "",
    "_____________________                                        ______________________",
    "CONTRATANTE                                                  CONTRATADO",
    "",
    "TESTEMUNHAS:    1:________________________                    2:_____________________",
  ];

  linhas.forEach(function (texto, indice) {
    const par = corpo.appendParagraph(texto);
    if (indice === 0) {
      par.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      par.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } else if (
      texto.indexOf("DO OBJETO") === 0 ||
      texto.indexOf("DAS OBRIGAÇÕES DO CONTRATADO") === 0 ||
      texto.indexOf("DAS OBRIGAÇÕES DO CONTRATANTE") === 0 ||
      texto.indexOf("DA REMUNERAÇÃO") === 0 ||
      texto.indexOf("DO PRAZO") === 0 ||
      texto.indexOf("DAS CONDIÇÕES") === 0 ||
      texto.indexOf("DO FORO") === 0
    ) {
      par.setBold(true);
    }
  });

  doc.saveAndClose();
  Logger.log(
    "Modelo atualizado: " + modelo.getName() + " (id " + modelo.getId() + ")"
  );
  return modelo.getUrl();
}

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
    const id = idAgendaCalendario(key);
    if (!id) {
      Logger.log("Agenda sem ID (" + key + ")");
      return;
    }
    const cal = CalendarApp.getCalendarById(id);
    if (cal) Logger.log("Agenda OK (" + key + "): " + cal.getName() + " => " + id);
  });

  Object.keys(TAREFAS_AGENDA).forEach(function (key) {
    try {
      const listaId = idListaTarefas(key);
      Logger.log("Tarefas OK (" + key + "): lista " + listaId);
    } catch (err) {
      Logger.log("Tarefas (" + key + "): " + err.message);
    }
  });

  Logger.log("Concluído. Se a impressão falhar no site, republique o Web App (nova versão).");
}

/** Rode no editor e veja o log para copiar IDs das listas de tarefas. */
function descobrirListasTarefas() {
  const listas = Tasks.Tasklists.list();
  (listas.items || []).forEach(function (lista) {
    Logger.log(lista.title + " => " + lista.id);
  });
}

/** Rode no editor e veja o log para copiar IDs das agendas. */
function descobrirAgendas() {
  CalendarApp.getAllCalendars().forEach(function (cal) {
    Logger.log(cal.getName() + " => " + cal.getId());
  });
}

function responder(obj) {
  return ContentService.createTextOutput(
    JSON.stringify(obj)
  ).setMimeType(ContentService.MimeType.JSON);
}
