// Página apoiadores: contratos por liderança/município + filtro por região (planilha municipios).

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PESSOAL;
const cfgAp = cfg.APOIADORES;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 6;

const MAX_CLASSIFICACAO = 5;

const CAMPOS_PLANILHA = [
  {
    prop: "tipo",
    chave: "TIPO",
    aliases: ["tipo", "classificacao", "classificação"],
  },
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "apoiadorLider", chave: "APOIADOR_LIDER", aliases: ["apoiador-lider", "apoiador lider", "lider"] },
  { prop: "apoiadorIntegral", chave: "APOIADOR_INTEGRAL", aliases: ["apoiador-integral", "apoiador integral", "integral"] },
  { prop: "apoiadorMeio", chave: "APOIADOR_MEIO", aliases: ["apoiador-meio", "apoiador meio", "meio"] },
  {
    prop: "apoiadorCustomizado",
    chave: "APOIADOR_CUSTOMIZADO",
    aliases: ["apoiador-customizado", "apoiador customizado", "apoiador-livre", "apoiador livre", "customizado"],
  },
];

const CAMPOS_FINANCEIROS = [
  { prop: "finLider", chave: "FIN_LIDER" },
  { prop: "finIntegral", chave: "FIN_INTEGRAL" },
  { prop: "finMeio", chave: "FIN_MEIO" },
  { prop: "finCustomizado", chave: "FIN_CUSTOMIZADO" },
];

const CAMPOS_FIN_MODAL = CAMPOS_FINANCEIROS;
const CAMPOS_MODAL_LOGISTICA = cfgAp.COLUNAS_LOGISTICA_MODAL || [];
const CAMPOS_MODAL_LOGISTICA_DESEMBOLSO = cfgAp.COLUNAS_LOGISTICA_DESEMBOLSO_MODAL || [];
const CAMPOS_MODAL_PARCEIRO = cfgAp.COLUNAS_PARCEIRO_MODAL || [];
const CAMPOS_MODAL_DESEMBOLSO = cfgAp.COLUNAS_DESEMBOLSO_MODAL || [];
const CAMPOS_MODAL_MOEDA_EXTRA = [
  ...CAMPOS_MODAL_LOGISTICA,
  ...CAMPOS_MODAL_LOGISTICA_DESEMBOLSO,
  ...CAMPOS_MODAL_PARCEIRO,
  ...CAMPOS_MODAL_DESEMBOLSO,
];
const CAMPOS_ORCAMENTO_BADGE = [
  { prop: "pessoal", chave: "DESP_PESSOAL", aliases: ["pessoal", "contratos-distribuidos-apoiadores"] },
  { prop: "logCombustivel", chave: "LOG_COMBUSTIVEL", aliases: ["combustivel", "combustível"] },
  { prop: "logDiversos", chave: "LOG_DIVERSOS", aliases: ["diversos"] },
  { prop: "logDiaD", chave: "LOG_DIA_D", aliases: ["dia d", "dia-d", "diad"] },
];

const LINHAS_APOIADOR_POPOVER = [
  {
    rotulo: "liderança",
    fin: "proprioApoiador",
    marcador: "popover-marcador--apoiador-proprio",
  },
  { rotulo: "lider", qtd: "apoiadorLider", fin: "finLider", marcador: "popover-marcador--apoiador-lider" },
  { rotulo: "integral", qtd: "apoiadorIntegral", fin: "finIntegral", marcador: "popover-marcador--apoiador-integral" },
  { rotulo: "meio", qtd: "apoiadorMeio", fin: "finMeio", marcador: "popover-marcador--apoiador-meio" },
  {
    rotulo: "customizado",
    qtd: "apoiadorCustomizado",
    fin: "finCustomizado",
    marcador: "popover-marcador--apoiador-custom",
  },
];

const LINHAS_POPOVER_LOGISTICA = [
  {
    rotulo: "combustível",
    prop: "logCombustivel",
    marcador: "popover-marcador--orc-combustivel",
  },
  { rotulo: "diversos", prop: "logDiversos", marcador: "popover-marcador--orc-diversos" },
  {
    rotulo: "dia D",
    prop: "logDiaD",
    marcador: "popover-marcador--orc-diad",
    preserveCase: true,
  },
];

const LINHAS_POPOVER_PARCEIRO = [
  { rotulo: "pessoal", prop: "parPessoal", marcador: "popover-marcador--orc-pessoal" },
  {
    rotulo: "combustível",
    prop: "parCombustivel",
    marcador: "popover-marcador--orc-combustivel",
  },
  { rotulo: "diversos", prop: "parDiversos", marcador: "popover-marcador--orc-diversos" },
  {
    rotulo: "dia D",
    prop: "parDiaD",
    marcador: "popover-marcador--orc-diad",
    preserveCase: true,
  },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();
let nomesColunaPlanilha = {};
let opcoesMunicipio = [];
let modalCrud = null;
let modoCrud = "inserir";
let linhaCrud = null;
let parametrosClassificacaoApoiador = [];
const ordenacaoApoiadores = { col: "lideranca", dir: "asc" };
const popoverTabela = PopoverTabela.criar();

const ICONE_FECHADO_ORCAMENTO =
  '<i class="fa-solid fa-badge-check" aria-hidden="true"></i>';

function valorCheckboxSim(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val == null) return false;
  const s = PlanilhaApi.normalizarChave(val);
  if (s === "nao" || s === "n" || s === "false" || s === "0" || s === "no") return false;
  return s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes" || s === "x";
}

function valorCheckboxGravar(marcado) {
  return marcado ? "S" : "N";
}

function atualizarMetadadosPlanilha(valores) {
  const cab = cabecalhoApoiadores(valores);
  const indices = resolverIndices(cab);
  nomesColunaPlanilha = {};
  CAMPOS_PLANILHA.forEach((campo) => {
    const idx = indices[campo.prop];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.aliases[0];
    }
  });
  CAMPOS_FINANCEIROS.forEach((campo) => {
    const idx = indices[campo.prop];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.chave;
    }
  });
  const idxProprio = indices.proprioApoiador;
  if (idxProprio != null && idxProprio >= 0) {
    const nome = String(cab[idxProprio] ?? "").trim();
    nomesColunaPlanilha.proprioApoiador = nome || "proprio-apoiador-valor";
  }
  const idxFechado = indices.fechadoOrcamento;
  if (idxFechado != null && idxFechado >= 0) {
    const nome = String(cab[idxFechado] ?? "").trim();
    nomesColunaPlanilha.fechadoOrcamento = nome || "FECHADO-ORCAMENTO";
  }
  const idxObservacao = indices.observacao;
  if (idxObservacao != null && idxObservacao >= 0) {
    const nome = String(cab[idxObservacao] ?? "").trim();
    nomesColunaPlanilha.observacao = nome || "OBSERVACAO";
  }
  CAMPOS_MODAL_MOEDA_EXTRA.forEach((campo) => {
    const idx = indices[campo.prop];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.aliases?.[0] || campo.chave;
    }
  });
}

function parsePontuacaoEstrelas(val) {
  if (val === "" || val == null) return 0;
  const n = Math.round(parseNumero(val));
  return Math.max(0, Math.min(MAX_CLASSIFICACAO, n));
}

function htmlEstrelasClassificacao(pontuacao) {
  const p = parsePontuacaoEstrelas(pontuacao);
  if (p <= 0) return "";
  let html = '<span class="apoiadores-rating apoiadores-rating--inline apoiadores-rating--somente-leitura" aria-label="';
  html += `classificação ${p} de ${MAX_CLASSIFICACAO}">`;
  for (let i = 1; i <= MAX_CLASSIFICACAO; i++) {
    const ativa = i <= p;
    html += `<span class="apoiadores-rating__estrela${ativa ? " apoiadores-rating__estrela--ativa" : ""}" aria-hidden="true">★</span>`;
  }
  html += "</span>";
  return html;
}

function montarEstrelasClassificacaoForm(valor, onChange) {
  if (!el.classificacaoEstrelas) return;
  const pontuacao = parsePontuacaoEstrelas(valor);
  const interativo = typeof onChange === "function";
  const root = el.classificacaoEstrelas;
  root.className = "apoiadores-rating" + (interativo ? "" : " apoiadores-rating--somente-leitura");
  root.setAttribute("aria-valuenow", String(pontuacao));
  root.setAttribute("aria-valuemax", String(MAX_CLASSIFICACAO));

  let markup = "";
  if (interativo) {
    markup += `<button type="button" class="apoiadores-rating__zerar" data-valor="0" aria-label="sem classificação (0)">0</button>`;
  }
  for (let i = 1; i <= MAX_CLASSIFICACAO; i++) {
    const ativa = i <= pontuacao;
    markup += `<button type="button" class="apoiadores-rating__estrela${
      ativa ? " apoiadores-rating__estrela--ativa" : ""
    }" data-valor="${i}" aria-label="${i} de ${MAX_CLASSIFICACAO} estrelas">★</button>`;
  }
  root.innerHTML = markup;

  if (!interativo) return;

  root.querySelectorAll("[data-valor]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nv = parsePontuacaoEstrelas(btn.dataset.valor);
      if (el.campoClassificacao) el.campoClassificacao.value = String(nv);
      onChange(nv);
      montarEstrelasClassificacaoForm(nv, onChange);
    });
  });
}

function parseParametrosClassificacaoApoiador(valores) {
  const p = cfgAp.PARAMETROS_CLASSIFICACAO;
  if (!valores?.length || !p) return [];
  const out = [];
  for (let r = p.LINHA_INICIO; r <= p.LINHA_FIM; r++) {
    const row = valores[r];
    if (!row) continue;
    const tipo = parsePontuacaoEstrelas(row[p.COL_TIPO]);
    out.push({
      tipo,
      lider: row[p.COL_LIDER],
      integral: row[p.COL_INTEGRAL],
      meio: row[p.COL_MEIO],
      proprioValor: row[p.COL_PROPRIO_VALOR],
    });
  }
  return out;
}

function valoresPadraoPorClassificacao(tipo) {
  const t = parsePontuacaoEstrelas(tipo);
  const hit = parametrosClassificacaoApoiador.find((p) => p.tipo === t);
  return hit || { lider: "", integral: "", meio: "", proprioValor: "" };
}

function valoresPadraoDiferemDoItem(item) {
  const pad = valoresPadraoPorClassificacao(item.tipo);
  const diff = (a, b) => parseNumero(a) !== parseNumero(b);
  if (diff(item.apoiadorLider, pad.lider)) return true;
  if (diff(item.apoiadorIntegral, pad.integral)) return true;
  if (diff(item.apoiadorMeio, pad.meio)) return true;
  return false;
}

function usarClassificacaoLiderancaAtiva() {
  return el.chkUsarClassificacao ? el.chkUsarClassificacao.checked : true;
}

function aplicarValoresPadraoNoFormulario() {
  const pad = valoresPadraoPorClassificacao(el.campoClassificacao?.value);
  if (usarClassificacaoLiderancaAtiva()) {
    el.campoLider.value = valorParaCampoNumerico(pad.lider);
    el.campoIntegral.value = valorParaCampoNumerico(pad.integral);
    el.campoMeio.value = valorParaCampoNumerico(pad.meio);
  }
}

function aplicarModoClassificacaoApoiador() {
  const usar = usarClassificacaoLiderancaAtiva();
  [el.campoLider, el.campoIntegral, el.campoMeio].forEach((c) => {
    if (c) c.disabled = usar;
  });
  [el.campoFinLider, el.campoFinIntegral, el.campoFinMeio].forEach((c) => {
    if (c) c.disabled = true;
  });
  if (el.campoCustom) el.campoCustom.disabled = false;
  if (el.classificacaoEstrelas) {
    el.classificacaoEstrelas.classList.toggle("apoiadores-rating--esmaecido", !usar);
  }
  if (usar) aplicarValoresPadraoNoFormulario();
}

function definirClassificacaoForm(val) {
  const p = parsePontuacaoEstrelas(val);
  if (el.campoClassificacao) el.campoClassificacao.value = String(p);
  montarEstrelasClassificacaoForm(p, (nv) => {
    if (el.campoClassificacao) el.campoClassificacao.value = String(nv);
    if (usarClassificacaoLiderancaAtiva()) aplicarValoresPadraoNoFormulario();
    aplicarModoClassificacaoApoiador();
  });
  if (usarClassificacaoLiderancaAtiva()) aplicarValoresPadraoNoFormulario();
  aplicarModoClassificacaoApoiador();
}

function dadosGravacaoApoiador(item, usarClassificacao) {
  const dados = {};
  const propsPadraoBloqueados = new Set(["apoiadorLider", "apoiadorIntegral", "apoiadorMeio"]);
  const finNuncaGravar = new Set(["finLider", "finIntegral", "finMeio"]);

  CAMPOS_PLANILHA.forEach((campo) => {
    const chave = nomesColunaPlanilha[campo.prop];
    if (!chave) return;
    if (campo.prop === "tipo") {
      dados[chave] = parsePontuacaoEstrelas(item.tipo);
      return;
    }
    if (usarClassificacao && propsPadraoBloqueados.has(campo.prop)) return;
    dados[chave] = item[campo.prop] ?? "";
  });

  CAMPOS_FIN_MODAL.forEach((campo) => {
    if (finNuncaGravar.has(campo.prop)) return;
    const chave = nomesColunaPlanilha[campo.prop];
    if (chave) dados[chave] = item[campo.prop] ?? "";
  });

  const chaveProprio =
    nomesColunaPlanilha.proprioApoiador || "proprio-apoiador-valor";
  const proprio = item.proprioApoiador;
  dados[chaveProprio] =
    proprio === "" || proprio == null ? 0 : proprio;

  if (item.gravarFechadoOrcamento && nomesColunaPlanilha.fechadoOrcamento) {
    dados[nomesColunaPlanilha.fechadoOrcamento] = valorCheckboxGravar(item.fechadoOrcamento);
  }

  if (nomesColunaPlanilha.observacao) {
    dados[nomesColunaPlanilha.observacao] = item.observacao ?? "";
  }

  CAMPOS_MODAL_MOEDA_EXTRA.forEach((campo) => {
    gravarMoedaApoiadorNoDados(dados, item, campo.prop);
  });

  return dados;
}

function gravarMoedaApoiadorNoDados(dados, item, prop) {
  const chave = nomesColunaPlanilha[prop];
  if (!chave) return;
  const val = item[prop];
  dados[chave] = val === "" || val == null ? 0 : val;
}

function itemPorLinha(numLinha) {
  return linhas.find((r) => r._linha === numLinha) || null;
}

function lerFormularioApoiador() {
  return {
    tipo: parsePontuacaoEstrelas(el.campoClassificacao?.value),
    lideranca: el.campoLideranca.value.trim(),
    municipio: el.campoMunicipio.value.trim(),
    apoiadorLider: el.campoLider.value.trim(),
    apoiadorIntegral: el.campoIntegral.value.trim(),
    apoiadorMeio: el.campoMeio.value.trim(),
    apoiadorCustomizado: el.campoCustom.value.trim(),
    proprioApoiador: lerCampoMoeda(el.campoProprioValor),
    finLider: lerCampoMoeda(el.campoFinLider),
    finIntegral: lerCampoMoeda(el.campoFinIntegral),
    finMeio: lerCampoMoeda(el.campoFinMeio),
    finCustomizado: lerCampoMoeda(el.campoFinCustom),
    fechadoOrcamento: el.chkFechadoOrcamento?.checked ?? false,
    gravarFechadoOrcamento: modoCrud === "atualizar",
    observacao: el.campoObservacao?.value.trim() ?? "",
    logCombustivel: lerCampoMoeda(el.campoLogCombustivel),
    logDiversos: lerCampoMoeda(el.campoLogDiversos),
    logDiaD: lerCampoMoeda(el.campoLogDiaD),
    logDesembAgo15: lerCampoMoeda(el.campoLogDesembAgo15),
    logDesembAgo30: lerCampoMoeda(el.campoLogDesembAgo30),
    logDesembSet15: lerCampoMoeda(el.campoLogDesembSet15),
    logDesembSet30: lerCampoMoeda(el.campoLogDesembSet30),
    parPessoal: lerCampoMoeda(el.campoParPessoal),
    parCombustivel: lerCampoMoeda(el.campoParCombustivel),
    parDiversos: lerCampoMoeda(el.campoParDiversos),
    parDiaD: lerCampoMoeda(el.campoParDiaD),
    desembJul30: lerCampoMoeda(el.campoDesembJul30),
    desembAgo15: lerCampoMoeda(el.campoDesembAgo15),
    desembAgo30: lerCampoMoeda(el.campoDesembAgo30),
    desembSet15: lerCampoMoeda(el.campoDesembSet15),
    desembSet30: lerCampoMoeda(el.campoDesembSet30),
  };
}

function extrairOpcoesMunicipio(valoresMunicipios) {
  const mapa = new Map();
  if (!valoresMunicipios?.length) return [];

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;
    const chave = normalizarChave(municipio);
    if (!mapa.has(chave)) mapa.set(chave, municipio);
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function montarSelectMunicipio(valorSelecionado) {
  if (!el.campoMunicipio) return;
  const atual = String(valorSelecionado ?? "").trim();
  const chaves = new Set(opcoesMunicipio.map((n) => normalizarChave(n)));
  const lista = [...opcoesMunicipio];
  if (atual && !chaves.has(normalizarChave(atual))) lista.push(atual);

  lista.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  el.campoMunicipio.innerHTML =
    '<option value="">selecione</option>' +
    lista
      .map((nome) => {
        const sel = atual && normalizarChave(nome) === normalizarChave(atual) ? " selected" : "";
        return `<option value="${escapeHtml(nome)}"${sel}>${escapeHtml(nome)}</option>`;
      })
      .join("");
}

function valorParaCampoNumerico(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return String(parseNumero(val));
}

function valorParaCampoMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return fmtMoeda.format(parseNumero(val));
}

function valorParaCampoMoedaPadrao(val) {
  const s = String(val ?? "").trim();
  const n = s ? parseNumero(val) : 0;
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
}

function formatarInputMoedaApoiador(input) {
  if (!input || input.disabled || input.readOnly) return;
  const digits = String(input.value ?? "").replace(/\D/g, "");
  const num = digits ? parseInt(digits, 10) / 100 : 0;
  input.value = fmtMoeda.format(num);
}

function aoDigitarMoedaApoiador(e) {
  const input = e.target.closest("[data-moeda-apoiador]");
  if (!input || input.disabled || input.readOnly) return;
  formatarInputMoedaApoiador(input);
  const pos = input.value.length;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(pos, pos);
    } catch (_) {
      /* input sem foco */
    }
  });
}

function vincularMascarasMoedaApoiador() {
  const form = document.getElementById("formApoiadorCrud");
  if (!form || form.dataset.mascaraMoedaApoiador) return;
  form.dataset.mascaraMoedaApoiador = "1";
  form.addEventListener("input", aoDigitarMoedaApoiador);
  form.addEventListener(
    "blur",
    (e) => {
      const input = e.target.closest("[data-moeda-apoiador]");
      if (input && !input.disabled && !input.readOnly) formatarInputMoedaApoiador(input);
    },
    true
  );
}

function lerCampoMoeda(input) {
  const s = String(input?.value ?? "").trim();
  if (!s) return "";
  return parseNumero(s);
}

function preencherFormularioApoiador(item) {
  const dados = item || {};
  const temItem = !!dados._linha;
  if (el.chkUsarClassificacao) {
    el.chkUsarClassificacao.checked = temItem ? !valoresPadraoDiferemDoItem(dados) : true;
  }
  el.campoLideranca.value = String(dados.lideranca ?? "").trim();
  montarSelectMunicipio(dados.municipio ?? "");
  definirClassificacaoForm(dados.tipo);
  if (el.campoProprioValor) {
    const proprio =
      temItem && dados.proprioApoiador !== "" && dados.proprioApoiador != null
        ? dados.proprioApoiador
        : 0;
    el.campoProprioValor.value = valorParaCampoMoedaPadrao(proprio);
  }
  if (!usarClassificacaoLiderancaAtiva()) {
    el.campoLider.value = valorParaCampoNumerico(dados.apoiadorLider);
    el.campoIntegral.value = valorParaCampoNumerico(dados.apoiadorIntegral);
    el.campoMeio.value = valorParaCampoNumerico(dados.apoiadorMeio);
  }
  el.campoCustom.value = valorParaCampoNumerico(dados.apoiadorCustomizado);
  el.campoFinLider.value = valorParaCampoMoeda(dados.finLider);
  el.campoFinIntegral.value = valorParaCampoMoeda(dados.finIntegral);
  el.campoFinMeio.value = valorParaCampoMoeda(dados.finMeio);
  el.campoFinCustom.value = valorParaCampoMoedaPadrao(dados.finCustomizado);
  if (el.chkFechadoOrcamento) {
    el.chkFechadoOrcamento.checked = temItem ? valorCheckboxSim(dados.fechadoOrcamento) : false;
  }
  if (el.rowFechadoOrcamento) el.rowFechadoOrcamento.hidden = !temItem;
  if (el.campoObservacao) {
    el.campoObservacao.value = String(dados.observacao ?? "").trim();
  }
  preencherCamposMoedaModalApoiador(dados, temItem);
  aplicarModoClassificacaoApoiador();
}

function preencherCamposMoedaModalApoiador(dados, temItem) {
  const mapa = [
    ["campoLogCombustivel", "logCombustivel"],
    ["campoLogDiversos", "logDiversos"],
    ["campoLogDiaD", "logDiaD"],
    ["campoLogDesembAgo15", "logDesembAgo15"],
    ["campoLogDesembAgo30", "logDesembAgo30"],
    ["campoLogDesembSet15", "logDesembSet15"],
    ["campoLogDesembSet30", "logDesembSet30"],
    ["campoParPessoal", "parPessoal"],
    ["campoParCombustivel", "parCombustivel"],
    ["campoParDiversos", "parDiversos"],
    ["campoParDiaD", "parDiaD"],
    ["campoDesembJul30", "desembJul30"],
    ["campoDesembAgo15", "desembAgo15"],
    ["campoDesembAgo30", "desembAgo30"],
    ["campoDesembSet15", "desembSet15"],
    ["campoDesembSet30", "desembSet30"],
  ];
  mapa.forEach(([elKey, prop]) => {
    const input = el[elKey];
    if (!input) return;
    const val = temItem ? dados[prop] : 0;
    input.value = valorParaCampoMoedaPadrao(val);
  });
}

function resetarTabModalApoiador() {
  const btn = document.getElementById("tabApPessoal");
  if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  const btnOrcamento = document.getElementById("tabApPessoalOrcamento");
  if (btnOrcamento) bootstrap.Tab.getOrCreateInstance(btnOrcamento).show();
  const btnLogOrcamento = document.getElementById("tabApLogisticaOrcamento");
  if (btnLogOrcamento) bootstrap.Tab.getOrCreateInstance(btnLogOrcamento).show();
}

function alternarRowFechadoOrcamentoModal(exibir) {
  if (el.rowFechadoOrcamento) el.rowFechadoOrcamento.hidden = !exibir;
}

function abrirModalIncluirApoiador() {
  modoCrud = "inserir";
  linhaCrud = null;
  el.modalTitulo.textContent = "incluir apoiador";
  if (el.chkUsarClassificacao) el.chkUsarClassificacao.checked = true;
  alternarRowFechadoOrcamentoModal(false);
  resetarTabModalApoiador();
  preencherFormularioApoiador({});
  modalCrud.show();
}

function abrirModalEditarApoiador(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  modoCrud = "atualizar";
  linhaCrud = numLinha;
  el.modalTitulo.textContent = "editar apoiador";
  alternarRowFechadoOrcamentoModal(true);
  resetarTabModalApoiador();
  preencherFormularioApoiador(item);
  modalCrud.show();
}

async function salvarApoiadorCrud() {
  const form = lerFormularioApoiador();
  if (!form.lideranca || !form.municipio) {
    MasterCrud.toast("preencha liderança e município.", "erro");
    return;
  }

  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvarApoiador });
  try {
    const usarClassificacao = usarClassificacaoLiderancaAtiva();
    const payload = {
      acao: modoCrud === "atualizar" ? "atualizar" : "inserir",
      dados: dadosGravacaoApoiador(form, usarClassificacao),
      usarClassificacaoLideranca: usarClassificacao,
      editarPadrao: !usarClassificacao,
      origem: "pessoal-apoiadores",
    };
    if (modoCrud === "atualizar") payload.linha = linhaCrud;

    await PlanilhaApi.gravar(cfg.PLANILHA_APOIADORES, payload);
    modalCrud.hide();
    MasterCrud.toast(modoCrud === "atualizar" ? "registro atualizado." : "registro incluído.", "sucesso");
    await carregarApoiadores();
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvarApoiador });
  }
}

async function excluirApoiadorCrud(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item || !(await MasterCrud.confirmarExclusao())) return;

  try {
    await PlanilhaApi.gravar(cfg.PLANILHA_APOIADORES, {
      acao: "excluir",
      linha: numLinha,
      origem: "pessoal-apoiadores",
    });
    MasterCrud.toast("registro excluído.", "sucesso");
    await carregarApoiadores();
  } catch (e) {
    MasterCrud.toast("erro ao excluir: " + e.message, "erro");
  }
}

function aoClicarTabelaApoiador(e) {
  const btn = e.target.closest(MasterCrud.seletorAcao);
  if (!btn) return;
  e.stopPropagation();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") abrirModalEditarApoiador(numLinha);
  if (btn.dataset.acao === "excluir") excluirApoiadorCrud(numLinha);
}

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function mostrarStatus(mensagem, tipo) {
  statusPainel(el.status, mensagem, tipo);
}

function limparStatus() {
  statusPainel(el.status, "", null);
}

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function parseNumero(v) {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizarChave(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function celulaPreenchida(val) {
  return String(val ?? "").trim() !== "";
}

function urlConsulta(planilha) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function fetchPlanilha(planilha) {
  const resp = await fetch(urlConsulta(planilha), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

function montarMapaMunicipios(valoresMunicipios) {
  const mapa = new Map();
  if (!valoresMunicipios?.length) return mapa;

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiao = String(celula(valoresMunicipios, linha, cols.REGIAO) ?? "").trim();
    mapa.set(normalizarChave(municipio), {
      regiao,
      regiaoNorm: normalizarChave(regiao),
    });
  }

  return mapa;
}

const ALIASES_COLUNA_TIPO = ["tipo", "classificacao", "classificação"];

function indiceColunaTipo(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  return normalizados.findIndex((n) =>
    ALIASES_COLUNA_TIPO.some((alias) => normalizarChave(alias) === n)
  );
}

function temSubcabecalhoApoiadores(linha) {
  if (!linha?.length) return false;
  const norm = linha.map((h) => normalizarChave(h));
  const marcadores = ["lider", "integral", "meio", "customizado"];
  return marcadores.filter((m) => norm.includes(m)).length >= 2;
}

function cabecalhoApoiadores(valores) {
  const linha1 = valores[0] || [];
  const linha2 = valores[1];
  if (!temSubcabecalhoApoiadores(linha2)) return linha1;

  const n = Math.max(linha1.length, (linha2 || []).length);
  const cab = [];
  for (let i = 0; i < n; i++) {
    const sup = String(linha2[i] ?? "").trim();
    const grp = String(linha1[i] ?? "").trim();
    cab.push(sup || grp);
  }
  return cab;
}

function linhaInicioDadosApoiadores(valores) {
  if (temSubcabecalhoApoiadores(valores[1])) return 3;
  return cfgAp.LINHA_INICIO_DADOS;
}

function offsetPlanilhaComTipo(cabecalho) {
  const idxTipo = indiceColunaTipo(cabecalho);
  if (idxTipo < 0) return 0;
  const n0 = normalizarChave(cabecalho[0]);
  if (n0 === "lideranca" || n0 === "liderança") return 0;
  return idxTipo === 0 ? 1 : 0;
}

function distanciaColunaFinAposQtdApoiador() {
  return cfgAp.COLUNAS.FIN_LIDER - cfgAp.COLUNAS.APOIADOR_LIDER;
}

function resolverIndicesFinanceirosApoiadores(indices, offset) {
  const dist = distanciaColunaFinAposQtdApoiador();
  const pares = [
    ["apoiadorLider", "finLider", "FIN_LIDER"],
    ["apoiadorIntegral", "finIntegral", "FIN_INTEGRAL"],
    ["apoiadorMeio", "finMeio", "FIN_MEIO"],
    ["apoiadorCustomizado", "finCustomizado", "FIN_CUSTOMIZADO"],
  ];
  pares.forEach(([propQtd, propFin, chaveFin]) => {
    const iQtd = indices[propQtd];
    if (iQtd != null && iQtd >= 0) {
      indices[propFin] = iQtd + dist;
      return;
    }
    if (cfgAp.COLUNAS[chaveFin] != null) {
      indices[propFin] = cfgAp.COLUNAS[chaveFin] + offset;
    }
  });
}

function resolverIndicesCamposFixosApoiador(indices, cabecalho, campos) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  campos.forEach((campo) => {
    let idx = -1;
    if (cfgAp.COLUNAS[campo.chave] != null) {
      idx = cfgAp.COLUNAS[campo.chave];
    }
    if (idx === -1 && campo.aliases) {
      idx = normalizados.findIndex((n) =>
        campo.aliases.some((alias) => normalizarChave(alias) === n)
      );
    }
    indices[campo.prop] = idx;
  });
}

function resolverIndices(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const offset = offsetPlanilhaComTipo(cabecalho);
  const indices = {};

  const idxTipo = indiceColunaTipo(cabecalho);
  indices.tipo = idxTipo;

  CAMPOS_PLANILHA.forEach((campo) => {
    if (campo.prop === "tipo") return;
    let idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1 && cfgAp.COLUNAS[campo.chave] != null) {
      idx = cfgAp.COLUNAS[campo.chave] + offset;
    }
    indices[campo.prop] = idx;
  });

  resolverIndicesFinanceirosApoiadores(indices, offset);

  const aliasesProprio = [
    "proprio-apoiador-valor",
    "proprio apoiador",
    "próprio apoiador",
    "proprio-apoiador",
  ];
  const aliasNormProprio = aliasesProprio.map((a) => normalizarChave(a));
  const colsFormula = cfgAp.COLUNAS_SOMENTE_FORMULA || [];
  let idxProprio = -1;
  for (let i = 0; i < normalizados.length; i++) {
    if (colsFormula.includes(i)) continue;
    if (aliasNormProprio.includes(normalizados[i])) {
      idxProprio = i;
      break;
    }
  }
  if (idxProprio === -1 && cfgAp.COLUNAS.PROPRIO_APOIADOR != null) {
    idxProprio = cfgAp.COLUNAS.PROPRIO_APOIADOR;
  }
  indices.proprioApoiador = idxProprio;

  const aliasesFechado = [
    "FECHADO-ORCAMENTO",
    "fechado-orcamento",
    "fechado orcamento",
    "orcamento-fechado",
    "orcamento fechado",
    "fechado orçamento",
    "fechado-orçamento",
  ];
  let idxFechado = normalizados.findIndex((n) =>
    aliasesFechado.some((alias) => normalizarChave(alias) === n)
  );
  if (idxFechado === -1 && cfgAp.COLUNAS.FECHADO_ORCAMENTO != null) {
    idxFechado = cfgAp.COLUNAS.FECHADO_ORCAMENTO;
  }
  indices.fechadoOrcamento = idxFechado;

  const aliasesObservacao = [
    "OBSERVACAO",
    "observacao",
    "observação",
    "obs",
    "observacoes",
    "observações",
  ];
  let idxObservacao = normalizados.findIndex((n) =>
    aliasesObservacao.some((alias) => normalizarChave(alias) === n)
  );
  if (idxObservacao === -1 && cfgAp.COLUNAS.OBSERVACAO != null) {
    idxObservacao = cfgAp.COLUNAS.OBSERVACAO;
  }
  indices.observacao = idxObservacao;

  resolverIndicesCamposFixosApoiador(indices, cabecalho, CAMPOS_MODAL_LOGISTICA);
  resolverIndicesCamposFixosApoiador(indices, cabecalho, CAMPOS_MODAL_LOGISTICA_DESEMBOLSO);
  resolverIndicesCamposFixosApoiador(indices, cabecalho, CAMPOS_MODAL_PARCEIRO);
  resolverIndicesCamposFixosApoiador(indices, cabecalho, CAMPOS_MODAL_DESEMBOLSO);
  resolverIndicesCamposFixosApoiador(indices, cabecalho, CAMPOS_ORCAMENTO_BADGE.slice(0, 1));

  return indices;
}

function valorCampo(linha, idx) {
  if (idx == null || idx < 0) return "";
  return linha[idx];
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function exibirLideranca(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  if (typeof val === "number" && val >= 0 && val <= MAX_CLASSIFICACAO && Math.round(val) === val) {
    return "";
  }
  return escapeHtml(s);
}

function itemFechadoOrcamento(item) {
  return valorCheckboxSim(item.fechadoOrcamento);
}

function htmlIconeFechadoOrcamento(item) {
  const ok = itemFechadoOrcamento(item);
  const classe = ok
    ? "apoiadores-icone-fechado apoiadores-icone-fechado--sim"
    : "apoiadores-icone-fechado apoiadores-icone-fechado--nao";
  const titulo = ok ? "orçamento fechado" : "orçamento aberto";
  return `<span class="${classe}" title="${titulo}" aria-label="${titulo}">${ICONE_FECHADO_ORCAMENTO}</span>`;
}

function htmlNomeLiderancaComFechado(r) {
  const nome = exibirLideranca(r.lideranca);
  const texto = nome || "—";
  return `<span class="apoiadores-ident-nome-linha">${htmlIconeFechadoOrcamento(r)}<span class="apoiadores-ident-nome-texto">${texto}</span></span>`;
}

function exibirCelula(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (Number.isFinite(n)) {
    if (n <= 0) return "";
    return fmt.format(n);
  }
  return escapeHtml(s);
}

function exibirMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (!Number.isFinite(n) || n <= 0) return "";
  return fmtMoeda.format(n);
}

function deveExibirTotalFinanceiroApoiador(r) {
  if (calcularOrcamentoBadgeTotal(r) > 0) return true;
  return CAMPOS_ORCAMENTO_BADGE.some((c) => celulaPreenchida(r[c.prop]));
}

function calcularOrcamentoBadgeTotal(item) {
  return CAMPOS_ORCAMENTO_BADGE.reduce((acc, c) => acc + parseNumero(item[c.prop]), 0);
}

function subFinTotalHtml(r) {
  if (!deveExibirTotalFinanceiroApoiador(r)) return "";
  return `<span class="apoiadores-sub-fin-total">${exibirMoeda(calcularOrcamentoBadgeTotal(r))}</span>`;
}

function badgeFinTotalHtml(r) {
  if (!deveExibirTotalFinanceiroApoiador(r)) return "";
  return `<span class="apoiadores-fin-badge">${exibirMoeda(calcularOrcamentoBadgeTotal(r))}</span>`;
}

function ordenarRegioes(a, b) {
  const ordem = cfg.ORDEM_REGIOES || [];
  const indice = (norm) => {
    const i = ordem.indexOf(norm);
    return i === -1 ? ordem.length + 1 : i;
  };
  const diff = indice(a.norm) - indice(b.norm);
  if (diff !== 0) return diff;
  return a.rotulo.localeCompare(b.rotulo, "pt-BR");
}

function indiceCorRegiao(regiaoNorm) {
  const ordem = cfg.ORDEM_REGIOES || [];
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function extrairRegioes(itens) {
  const mapa = new Map();

  itens.forEach((item) => {
    if (!item.regiaoNorm) return;
    if (!mapa.has(item.regiaoNorm)) {
      mapa.set(item.regiaoNorm, item.regiao);
    }
  });

  return Array.from(mapa.entries())
    .map(([norm, rotulo]) => ({ norm, rotulo }))
    .sort(ordenarRegioes);
}

function regioesSelecionadas() {
  return Array.from(el.filtroRegioes.querySelectorAll('input[type="checkbox"]:checked')).map(
    (cb) => cb.value
  );
}

function montarFiltros(listaRegioes) {
  regioes = listaRegioes;
  el.filtroRegioes.innerHTML = "";

  if (!listaRegioes.length) {
    el.filtroRegioes.innerHTML =
      '<span class="text-secondary small">Nenhuma micro-região encontrada.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "ap-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
    const label = document.createElement("label");
    label.className = "dashboard-filtro-item dashboard-filtro-cor--" + indiceCorRegiao(reg.norm);
    label.innerHTML =
      `<input type="checkbox" class="visually-hidden" id="${id}" value="${escapeHtml(reg.norm)}" checked>` +
      `<span class="dashboard-filtro-badge">${escapeHtml(reg.rotulo)}</span>`;
    el.filtroRegioes.appendChild(label);
  });

  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", renderizarTabela);
  });
}

function termoBuscaLideranca() {
  return normalizarChave(el.buscaLideranca?.value);
}

function filtroIncluirFechadoOrcamento() {
  return el.chkFiltroFechadoOrcamento?.checked ?? true;
}

function filtroIncluirAbertoOrcamento() {
  return el.chkFiltroAbertoOrcamento?.checked ?? true;
}

function itemPassaFiltroOrcamento(item) {
  const incluirFechado = filtroIncluirFechadoOrcamento();
  const incluirAberto = filtroIncluirAbertoOrcamento();
  if (!incluirFechado && !incluirAberto) return false;

  const fechado = itemFechadoOrcamento(item);
  if (fechado && !incluirFechado) return false;
  if (!fechado && !incluirAberto) return false;
  return true;
}

function linhasFiltradas() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const todasMarcadas = selecionadas.length === regioes.length;
  const termo = termoBuscaLideranca();

  return linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }

    if (!itemPassaFiltroOrcamento(item)) return false;

    if (
      termo &&
      !itemCombinaBuscaMulticampo(item, termo, ["lideranca", "municipio"], normalizarChave)
    ) {
      return false;
    }
    return true;
  });
}

function ordenarPorLideranca(a, b) {
  const la = String(a.lideranca ?? "").trim();
  const lb = String(b.lideranca ?? "").trim();
  const cmp = la.localeCompare(lb, "pt-BR", { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return String(a.municipio ?? "").localeCompare(String(b.municipio ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

function ordenarPorMunicipio(a, b) {
  const ma = String(a.municipio ?? "").trim();
  const mb = String(b.municipio ?? "").trim();
  const cmp = ma.localeCompare(mb, "pt-BR", { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return String(a.lideranca ?? "").localeCompare(String(b.lideranca ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

function compararLinhasApoiador(a, b) {
  const base =
    ordenacaoApoiadores.col === "municipio"
      ? ordenarPorMunicipio(a, b)
      : ordenarPorLideranca(a, b);
  return ordenacaoApoiadores.dir === "desc" ? -base : base;
}

function aplicarOrdenacaoApoiadores(lista) {
  return [...lista].sort(compararLinhasApoiador);
}

function atualizarUiOrdenacaoApoiadores() {
  document.querySelectorAll(".apoiadores-tabela-card .apoiadores-th-sort-btn").forEach((btn) => {
    const ativo =
      btn.dataset.ordenarCol === ordenacaoApoiadores.col &&
      btn.dataset.ordenarDir === ordenacaoApoiadores.dir;
    btn.classList.toggle("is-ativo", ativo);
    btn.setAttribute("aria-pressed", ativo ? "true" : "false");
  });
}

function vincularOrdenacaoTabelaApoiadores() {
  const card = document.querySelector(".apoiadores-tabela-card");
  if (!card || card.dataset.ordenacaoApoiadores) return;
  card.dataset.ordenacaoApoiadores = "1";
  card.querySelectorAll(".apoiadores-th-sort-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      ordenacaoApoiadores.col = btn.dataset.ordenarCol || "lideranca";
      ordenacaoApoiadores.dir = btn.dataset.ordenarDir === "desc" ? "desc" : "asc";
      atualizarUiOrdenacaoApoiadores();
      renderizarTabela();
    });
  });
  atualizarUiOrdenacaoApoiadores();
}

function linhaTemConteudo(item) {
  if (celulaPreenchida(item.proprioApoiador)) return true;
  return CAMPOS_PLANILHA.filter((c) => c.prop !== "tipo").some((c) => celulaPreenchida(item[c.prop]));
}

function calcularFinTotal(item) {
  return (
    parseNumero(item.proprioApoiador) +
    parseNumero(item.finLider) +
    parseNumero(item.finIntegral) +
    parseNumero(item.finMeio) +
    parseNumero(item.finCustomizado)
  );
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const cab = cabecalhoApoiadores(valores);
  const indices = resolverIndices(cab);
  const inicio = linhaInicioDadosApoiadores(valores);
  const itens = [];

  for (let i = inicio - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      _linha: i + 1,
      tipo: valorCampo(linha, indices.tipo),
      lideranca: valorCampo(linha, indices.lideranca),
      municipio,
      proprioApoiador: valorCampo(linha, indices.proprioApoiador),
      pessoal: valorCampo(linha, indices.pessoal),
      apoiadorLider: valorCampo(linha, indices.apoiadorLider),
      apoiadorIntegral: valorCampo(linha, indices.apoiadorIntegral),
      apoiadorMeio: valorCampo(linha, indices.apoiadorMeio),
      apoiadorCustomizado: valorCampo(linha, indices.apoiadorCustomizado),
      finLider: valorCampo(linha, indices.finLider),
      finIntegral: valorCampo(linha, indices.finIntegral),
      finMeio: valorCampo(linha, indices.finMeio),
      finCustomizado: valorCampo(linha, indices.finCustomizado),
      fechadoOrcamento: valorCampo(linha, indices.fechadoOrcamento),
      observacao: valorCampo(linha, indices.observacao),
      logCombustivel: valorCampo(linha, indices.logCombustivel),
      logDiversos: valorCampo(linha, indices.logDiversos),
      logDiaD: valorCampo(linha, indices.logDiaD),
      logDesembAgo15: valorCampo(linha, indices.logDesembAgo15),
      logDesembAgo30: valorCampo(linha, indices.logDesembAgo30),
      logDesembSet15: valorCampo(linha, indices.logDesembSet15),
      logDesembSet30: valorCampo(linha, indices.logDesembSet30),
      parPessoal: valorCampo(linha, indices.parPessoal),
      parCombustivel: valorCampo(linha, indices.parCombustivel),
      parDiversos: valorCampo(linha, indices.parDiversos),
      parDiaD: valorCampo(linha, indices.parDiaD),
      desembJul30: valorCampo(linha, indices.desembJul30),
      desembAgo15: valorCampo(linha, indices.desembAgo15),
      desembAgo30: valorCampo(linha, indices.desembAgo30),
      desembSet15: valorCampo(linha, indices.desembSet15),
      desembSet30: valorCampo(linha, indices.desembSet30),
      regiao: info?.regiao || "",
      regiaoNorm: info?.regiaoNorm || "",
    };
    item.finTotal = calcularFinTotal(item);
    item.orcamentoTotal = calcularOrcamentoBadgeTotal(item);

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(compararLinhasApoiador);
  return itens;
}

function somarCampo(filtradas, prop) {
  return filtradas.reduce((acc, r) => {
    const n = parseNumero(r[prop]);
    if (n > 0) return acc + n;
    if (celulaPreenchida(r[prop])) return acc + 1;
    return acc;
  }, 0);
}

function somarEfetivoMobilizado(filtradas) {
  return (
    filtradas.length +
    somarCampo(filtradas, "apoiadorLider") +
    somarCampo(filtradas, "apoiadorIntegral") +
    somarCampo(filtradas, "apoiadorMeio") +
    somarCampo(filtradas, "apoiadorCustomizado")
  );
}

function exibirKpiQuantidade(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  return fmt.format(v);
}

function atualizarKpis(filtradas) {
  el.kpiTotal.textContent = fmt.format(filtradas.length);
  el.kpiLider.textContent = exibirKpiQuantidade(somarCampo(filtradas, "apoiadorLider"));
  el.kpiIntegral.textContent = exibirKpiQuantidade(somarCampo(filtradas, "apoiadorIntegral"));
  el.kpiMeio.textContent = exibirKpiQuantidade(somarCampo(filtradas, "apoiadorMeio"));
  el.kpiCustom.textContent = exibirKpiQuantidade(somarCampo(filtradas, "apoiadorCustomizado"));
  el.kpiEfetivoMobilizado.textContent = exibirKpiQuantidade(somarEfetivoMobilizado(filtradas));
}

function limparKpis() {
  const vazio = "—";
  el.kpiTotal.textContent = vazio;
  el.kpiEfetivoMobilizado.textContent = vazio;
  el.kpiLider.textContent = vazio;
  el.kpiIntegral.textContent = vazio;
  el.kpiMeio.textContent = vazio;
  el.kpiCustom.textContent = vazio;
}

function zerarKpis() {
  el.kpiTotal.textContent = fmt.format(0);
  el.kpiEfetivoMobilizado.textContent = fmt.format(0);
  el.kpiLider.textContent = fmt.format(0);
  el.kpiIntegral.textContent = fmt.format(0);
  el.kpiMeio.textContent = fmt.format(0);
  el.kpiCustom.textContent = fmt.format(0);
}

function largurasColunasApoiadores() {
  const estreito = window.matchMedia("(max-width: 575.98px)").matches;
  const mobile = window.matchMedia("(max-width: 1199.98px)").matches;
  if (estreito) {
    return {
      "apoiadores-col-ident": "58%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "10.5%",
      "apoiadores-col-integral": "10.5%",
      "apoiadores-col-meio": "10.5%",
      "apoiadores-col-custom": "10.5%",
    };
  }
  if (mobile) {
    return {
      "apoiadores-col-ident": "34%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "16.5%",
      "apoiadores-col-integral": "16.5%",
      "apoiadores-col-meio": "16.5%",
      "apoiadores-col-custom": "16.5%",
    };
  }
  return {
    "apoiadores-col-ident": "20%",
    "apoiadores-col-municipio": "20%",
    "apoiadores-col-lider": "15%",
    "apoiadores-col-integral": "15%",
    "apoiadores-col-meio": "15%",
    "apoiadores-col-custom": "15%",
  };
}

function sincronizarLargurasColunasApoiadores(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 1199.98px)").matches;
  const larguras = largurasColunasApoiadores();
  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find((c) => c.startsWith("apoiadores-col-"));
      if (mobile && cls && larguras[cls] != null) {
        col.style.width = larguras[cls];
      } else {
        col.style.width = "";
      }
    });
  });
}

function alinharColunasTabela() {
  const panel = document.querySelector(".apoiadores-tabela-card .dashboard-tabela-panel");
  const headWrap = panel?.querySelector(".dashboard-tabela-head");
  const bodyScroll = panel?.querySelector(".dashboard-tabela-body-scroll");
  const headTable = headWrap?.querySelector("table");
  const bodyTable = bodyScroll?.querySelector("table");
  if (!panel || !headWrap || !bodyScroll || !headTable || !bodyTable) return;

  const largura = bodyScroll.clientWidth;
  headTable.style.width = largura + "px";
  bodyTable.style.width = largura + "px";

  const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
  headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";

  sincronizarLargurasColunasApoiadores(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function valorPopoverQtd(val) {
  if (parseNumero(val) <= 0) return "";
  return fmt.format(parseNumero(val));
}

function valorPopoverMoeda(val) {
  if (parseNumero(val) <= 0) return "";
  return fmtMoeda.format(parseNumero(val));
}

function htmlIdentMetaApoiador(r, finHtml) {
  const fin = finHtml || "";
  if (!fin) return "";
  return `<span class="apoiadores-ident-meta">${fin}</span>`;
}

function tituloPopoverApoiador(r) {
  return exibirLideranca(r.lideranca) || exibirTexto(r.lideranca) || "—";
}

function tituloImpressaoPopoverApoiador(r) {
  const partes = [
    String(exibirLideranca(r.lideranca) || r.lideranca || "").trim(),
    String(r.municipio ?? "").trim(),
  ].filter(Boolean);
  return partes.join(" · ") || "apoiador";
}

function htmlMunicipioLinhaPopoverApoiador(r) {
  const municipio = exibirTexto(r.municipio);
  return `<div class="apoiadores-popover-municipio-linha">
    ${municipio ? `<span class="apoiadores-popover-municipio-muted">${municipio}</span>` : "<span></span>"}
    ${PopoverTabela.htmlBotaoImprimir(
      tituloImpressaoPopoverApoiador(r),
      r._popoverPrintKey || `ap-${r._linha}`
    )}
  </div>`;
}

function badgeFinTotalPopover(r) {
  return badgeFinTotalHtml(r);
}

function itemPopoverApoiador(r, linha) {
  const qtdNum = linha.qtd ? parseNumero(r[linha.qtd]) : 0;
  const finNum = linha.fin ? parseNumero(r[linha.fin]) : 0;
  if (linha.qtd) {
    if (qtdNum <= 0 && finNum <= 0) return "";
  } else if (linha.fin && finNum <= 0) {
    return "";
  }
  const qtd = linha.qtd ? valorPopoverQtd(r[linha.qtd]) : "";
  const fin = linha.fin ? valorPopoverMoeda(r[linha.fin]) : "";
  const marcador = linha.marcador
    ? `<span class="orcamento-geral-popover-marcador ${linha.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha">
    <span class="apoiadores-popover-rotulo">${marcador}${linha.rotulo}</span>
    <span class="apoiadores-popover-qtd">${qtd}</span>
    <span class="apoiadores-popover-fin">${fin}</span>
  </div>`;
}

function htmlPopoverDivisor() {
  return `<hr class="apoiadores-popover-divisor" aria-hidden="true">`;
}

function itemPopoverMoedaApoiador(r, linha, sempreExibir) {
  const val = r[linha.prop];
  const fin = sempreExibir
    ? fmtMoeda.format(parseNumero(val))
    : valorPopoverMoeda(val);
  if (!fin) return "";
  const rotuloClass = linha.preserveCase
    ? "apoiadores-popover-rotulo apoiadores-popover-rotulo--case"
    : "apoiadores-popover-rotulo";
  const marcador = linha.marcador
    ? `<span class="orcamento-geral-popover-marcador ${linha.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha apoiadores-popover-linha--fin">
    <span class="${rotuloClass}">${marcador}${linha.rotulo}</span>
    <span class="apoiadores-popover-fin">${fin}</span>
  </div>`;
}

function htmlPopoverSecaoApoiador(r, titulo, linhas) {
  const itens = linhas.map((linha) => itemPopoverApoiador(r, linha)).join("");
  return `<div class="apoiadores-popover-secao">
    <div class="apoiadores-popover-secao-titulo">${escapeHtml(titulo)}</div>
    <div class="apoiadores-popover-tabela">${itens}</div>
  </div>`;
}

function htmlPopoverSecaoMoeda(r, titulo, linhas, sempreExibir) {
  const itens = linhas
    .map((linha) => itemPopoverMoedaApoiador(r, linha, sempreExibir))
    .join("");
  if (!itens.trim()) return "";
  return `<div class="apoiadores-popover-secao">
    <div class="apoiadores-popover-secao-titulo">${escapeHtml(titulo)}</div>
    <div class="apoiadores-popover-tabela">${itens}</div>
  </div>`;
}

function htmlPopoverApoiador(r) {
  const secaoPessoal = htmlPopoverSecaoApoiador(r, "pessoal", LINHAS_APOIADOR_POPOVER);
  const secaoLogistica = htmlPopoverSecaoMoeda(r, "logística", LINHAS_POPOVER_LOGISTICA, true);
  const secaoParceiro = htmlPopoverSecaoMoeda(r, "parceiro", LINHAS_POPOVER_PARCEIRO, true);
  const observacao = escapeHtml(String(r.observacao ?? "").trim());
  const badge = badgeFinTotalPopover(r);

  return `<div class="orcamento-geral-popover-corpo apoiadores-popover-corpo">
    <div class="apoiadores-popover-cabecalho">
      <div class="apoiadores-popover-topo">
        <span class="apoiadores-popover-lideranca apoiadores-ident-nome-linha">${htmlIconeFechadoOrcamento(r)}<span class="apoiadores-ident-nome-texto">${escapeHtml(tituloPopoverApoiador(r))}</span></span>
        ${badge}
      </div>
      ${htmlMunicipioLinhaPopoverApoiador(r)}
      <hr class="apoiadores-popover-divisor" aria-hidden="true">
    </div>
    ${secaoPessoal}
    ${secaoLogistica || ""}
    ${secaoParceiro ? `${htmlPopoverDivisor()}${secaoParceiro}` : ""}
    ${observacao ? `${htmlPopoverDivisor()}<div class="apoiadores-popover-observacao">${observacao}</div>` : ""}
  </div>`;
}

function htmlGrupoApoiadorMobile(r) {
  const celulas = [
    { rotulo: "lider", valor: r.apoiadorLider },
    { rotulo: "integral", valor: r.apoiadorIntegral },
    { rotulo: "meio", valor: r.apoiadorMeio },
    { rotulo: "customizado", valor: r.apoiadorCustomizado },
  ];

  const linhas = celulas
    .map((c) => {
      const exib = exibirCelula(c.valor);
      if (!exib) return "";
      return (
        `<div class="apoiadores-grupo-linha">` +
        `<span class="apoiadores-grupo-rotulo">${c.rotulo}</span>` +
        `<strong class="apoiadores-grupo-valor">${exib}</strong>` +
        `</div>`
      );
    })
    .filter(Boolean);

  return `<td class="apoiadores-col-grupo-mobile apoiadores-col-separador apoiadores-celula-popover" colspan="4">
    <div class="apoiadores-grupo-inline" aria-label="apoiador">${linhas.length ? linhas.join("") : ""}</div>
  </td>`;
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const liderancaHtml = htmlNomeLiderancaComFechado(r);
  const acoesMaster = MasterCrud.acoesLinha(r._linha, { somenteEditar: true });
  const finBadge = badgeFinTotalHtml(r);
  const metaDesktop = htmlIdentMetaApoiador(r, finBadge);
  const metaMobile = htmlIdentMetaApoiador(r, finBadge);
  const municipioMobile = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";

  return `<tr class="apoiadores-linha-popover" tabindex="0" aria-label="detalhes do apoiador">
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">
        <span class="apoiadores-celula-texto-wrap">
          <span class="apoiadores-ident-stack">
            <span class="apoiadores-ident-nome">${liderancaHtml}</span>
            ${metaDesktop}
          </span>
          ${acoesMaster}
        </span>
      </span>
      <span class="apoiadores-celula-mobile">
        <span class="dashboard-municipio-celula">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
          <span class="dashboard-municipio-texto">
            <span class="dashboard-municipio-nome apoiadores-celula-texto-wrap">
              <span class="apoiadores-ident-stack apoiadores-ident-stack--mobile">
                <span class="apoiadores-ident-nome">${liderancaHtml}</span>
                ${municipioMobile}
                ${metaMobile}
              </span>
              ${acoesMaster}
            </span>
          </span>
        </span>
      </span>
    </td>
    <td class="apoiadores-col-municipio">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${municipioHtml}</span>
        </span>
      </span>
    </td>
    ${htmlGrupoApoiadorMobile(r)}
    <td class="text-end apoiadores-col-lider apoiadores-col-apoiador-desk apoiadores-col-separador apoiadores-celula-num apoiadores-celula-popover">${exibirCelula(r.apoiadorLider)}</td>
    <td class="text-end apoiadores-col-integral apoiadores-col-apoiador-desk apoiadores-celula-num apoiadores-celula-popover">${exibirCelula(r.apoiadorIntegral)}</td>
    <td class="text-end apoiadores-col-meio apoiadores-col-apoiador-desk apoiadores-celula-num apoiadores-celula-popover">${exibirCelula(r.apoiadorMeio)}</td>
    <td class="text-end apoiadores-col-custom apoiadores-col-apoiador-desk apoiadores-celula-num apoiadores-celula-popover">${exibirCelula(r.apoiadorCustomizado)}</td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = aplicarOrdenacaoApoiadores(linhasFiltradas());

  el.vazio.hidden = true;

  if (!linhas.length) {
    limparKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum apoiador para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  popoverTabela.inicializar({
    corpo: el.corpo,
    seletorLinha: "tr.apoiadores-linha-popover",
    seletorAlvo: ".apoiadores-celula-popover",
    linhas: filtradas,
    htmlConteudo: htmlPopoverApoiador,
    tituloImpressao: tituloImpressaoPopoverApoiador,
    printKey: (r, idx) => `ap-${r._linha ?? idx}`,
  });
  aposRenderTabela();
}

function montar(valoresApoiadores) {
  atualizarMetadadosPlanilha(valoresApoiadores);
  linhas = extrairLinhas(valoresApoiadores);
  montarFiltros(extrairRegioes(linhas));
  renderizarTabela();
}

async function carregarApoiadores() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando apoiadores...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const planilhaParam = cfgAp.PARAMETROS_CLASSIFICACAO?.PLANILHA;
    const [valoresApoiadores, valoresMunicipios, valoresParam] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA_APOIADORES),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
      planilhaParam ? fetchPlanilha(planilhaParam).catch(() => []) : Promise.resolve([]),
    ]);

    if (valoresApoiadores === null) {
      limparStatus();
      return;
    }

    parametrosClassificacaoApoiador = parseParametrosClassificacaoApoiador(valoresParam || []);
    opcoesMunicipio = extrairOpcoesMunicipio(valoresMunicipios || []);
    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresApoiadores);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    popoverTabela.destruir();
    el.corpo.innerHTML = "";
    el.vazio.hidden = true;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarApoiadores;

function initApoiadores() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaLideranca: document.getElementById("buscaLideranca"),
    chkFiltroFechadoOrcamento: document.getElementById("chkFiltroFechadoOrcamento"),
    chkFiltroAbertoOrcamento: document.getElementById("chkFiltroAbertoOrcamento"),
    corpo: document.getElementById("corpoApoiadores"),
    vazio: document.getElementById("vazio"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiEfetivoMobilizado: document.getElementById("kpiEfetivoMobilizado"),
    kpiLider: document.getElementById("kpiLider"),
    kpiIntegral: document.getElementById("kpiIntegral"),
    kpiMeio: document.getElementById("kpiMeio"),
    kpiCustom: document.getElementById("kpiCustom"),
    btnIncluir: document.getElementById("btnIncluirApoiador"),
    btnSalvarApoiador: document.getElementById("btnSalvarApoiador"),
    modalTitulo: document.getElementById("modalApoiadorTitulo"),
    modalEl: document.getElementById("modalApoiadorCrud"),
    campoClassificacao: document.getElementById("campoApClassificacao"),
    classificacaoEstrelas: document.getElementById("campoApClassificacaoEstrelas"),
    chkUsarClassificacao: document.getElementById("chkApUsarClassificacao"),
    rowFechadoOrcamento: document.getElementById("rowApFechadoOrcamento"),
    chkFechadoOrcamento: document.getElementById("chkApFechadoOrcamento"),
    campoProprioValor: document.getElementById("campoApProprioValor"),
    campoLideranca: document.getElementById("campoApLideranca"),
    campoMunicipio: document.getElementById("campoApMunicipio"),
    campoLider: document.getElementById("campoApLider"),
    campoIntegral: document.getElementById("campoApIntegral"),
    campoMeio: document.getElementById("campoApMeio"),
    campoCustom: document.getElementById("campoApCustom"),
    campoFinLider: document.getElementById("campoApFinLider"),
    campoFinIntegral: document.getElementById("campoApFinIntegral"),
    campoFinMeio: document.getElementById("campoApFinMeio"),
    campoFinCustom: document.getElementById("campoApFinCustom"),
    campoObservacao: document.getElementById("campoApObservacao"),
    campoLogCombustivel: document.getElementById("campoApLogCombustivel"),
    campoLogDiversos: document.getElementById("campoApLogDiversos"),
    campoLogDiaD: document.getElementById("campoApLogDiaD"),
    campoLogDesembAgo15: document.getElementById("campoApLogDesembAgo15"),
    campoLogDesembAgo30: document.getElementById("campoApLogDesembAgo30"),
    campoLogDesembSet15: document.getElementById("campoApLogDesembSet15"),
    campoLogDesembSet30: document.getElementById("campoApLogDesembSet30"),
    campoParPessoal: document.getElementById("campoApParPessoal"),
    campoParCombustivel: document.getElementById("campoApParCombustivel"),
    campoParDiversos: document.getElementById("campoApParDiversos"),
    campoParDiaD: document.getElementById("campoApParDiaD"),
    campoDesembJul30: document.getElementById("campoApDesembJul30"),
    campoDesembAgo15: document.getElementById("campoApDesembAgo15"),
    campoDesembAgo30: document.getElementById("campoApDesembAgo30"),
    campoDesembSet15: document.getElementById("campoApDesembSet15"),
    campoDesembSet30: document.getElementById("campoApDesembSet30"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  MasterCrud.aplicarVisibilidadeIncluir("btnIncluirApoiador");
  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.btnIncluir?.addEventListener("click", abrirModalIncluirApoiador);
  el.btnSalvarApoiador?.addEventListener("click", salvarApoiadorCrud);
  vincularMascarasMoedaApoiador();
  vincularOrdenacaoTabelaApoiadores();
  el.chkUsarClassificacao?.addEventListener("change", () => {
    if (!usarClassificacaoLiderancaAtiva() && linhaCrud) {
      const item = itemPorLinha(linhaCrud);
      if (item) {
        el.campoLider.value = valorParaCampoNumerico(item.apoiadorLider);
        el.campoIntegral.value = valorParaCampoNumerico(item.apoiadorIntegral);
        el.campoMeio.value = valorParaCampoNumerico(item.apoiadorMeio);
        if (el.campoProprioValor) {
          el.campoProprioValor.value = valorParaCampoMoedaPadrao(item.proprioApoiador);
        }
      }
    }
    aplicarModoClassificacaoApoiador();
  });
  el.corpo.addEventListener("click", aoClicarTabelaApoiador);

  el.buscaLideranca?.addEventListener("input", renderizarTabela);
  el.chkFiltroFechadoOrcamento?.addEventListener("change", renderizarTabela);
  el.chkFiltroAbertoOrcamento?.addEventListener("change", renderizarTabela);
  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarApoiadores();
}

function htmlIdentRelatorioApoiador(r) {
  const liderRaw = exibirLideranca(r.lideranca) || exibirTexto(r.lideranca);
  const lider = liderRaw || "—";
  const mun = escapeHtml(String(r.municipio ?? "").trim());
  let html = `<span class="apoiadores-rel-ident-nome">${lider}</span>`;
  if (mun) {
    html += `<span class="apoiadores-rel-ident-municipio">${mun}</span>`;
  }
  return html;
}

function ajustarTabelaRelatorioPagina(table) {
  const ehApoiadores =
    table?.classList?.contains("apoiadores-tabela") ||
    table?.querySelector(".apoiadores-col-ident, .apoiadores-col-lider");
  if (!ehApoiadores) return;

  table.querySelectorAll(".apoiadores-rating").forEach((el) => el.remove());

  let colgroups = table.querySelectorAll("colgroup");
  if (!colgroups.length) {
    const cg = document.createElement("colgroup");
    for (let i = 0; i < 6; i++) cg.appendChild(document.createElement("col"));
    table.insertBefore(cg, table.firstElementChild);
    colgroups = table.querySelectorAll("colgroup");
  }

  colgroups.forEach((cg) => {
    cg.querySelector("col.apoiadores-col-municipio")?.remove();
    const col = document.createElement("col");
    col.className = "apoiadores-col-valor";
    cg.appendChild(col);
  });

  table.querySelectorAll("th.apoiadores-col-municipio").forEach((th) => th.remove());

  const thIdent = table.querySelector("thead th.apoiadores-col-ident");
  if (thIdent) {
    const rotulo = thIdent.querySelector(".apoiadores-th-desktop");
    if (rotulo) {
      rotulo.innerHTML =
        '<span class="dashboard-th-principal">liderança</span>' +
        '<span class="dashboard-th-sub text-muted apoiadores-th-sub-municipio">município</span>';
    }
    thIdent.querySelector(".apoiadores-busca-campo")?.remove();
    thIdent.querySelector(".apoiadores-th-mobile")?.remove();
  }

  const row1 = table.querySelector("thead tr.apoiadores-thead-row1");
  if (row1) {
    const th = document.createElement("th");
    th.scope = "col";
    th.rowSpan = 2;
    th.className = "text-end apoiadores-col-valor dashboard-th-base";
    th.textContent = "valor";
    row1.appendChild(th);
  }

  const dados = aplicarOrdenacaoApoiadores(linhasFiltradas());
  table.querySelectorAll("tbody tr").forEach((tr, i) => {
    const r = dados[i];
    const identTd = tr.querySelector("td.apoiadores-col-ident");
    if (identTd && r) {
      identTd.innerHTML = htmlIdentRelatorioApoiador(r);
      identTd.classList.add("apoiadores-col-ident--rel");
    }
    tr.querySelector("td.apoiadores-col-municipio")?.remove();

    const td = document.createElement("td");
    td.className = "text-end apoiadores-col-valor apoiadores-celula-num";
    const valor =
      r && deveExibirTotalFinanceiroApoiador(r) ? exibirMoeda(r.orcamentoTotal) : "";
    td.textContent = valor;
    tr.appendChild(td);
  });
}

function htmlCardsRelatorioPagina(doc) {
  const painel = doc.querySelector(".apoiadores-kpi-painel");
  if (!painel) return "";

  const clone = painel.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-apoiadores-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function estilosRelatorioPagina() {
  return (
    ".page-apoiadores .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-apoiadores .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-apoiadores .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-apoiadores .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis{margin-top:0.2rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis > .apoiadores-kpi-painel{display:flex;flex-direction:column;gap:8px;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-painel-linha{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot{min-width:0;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.3rem;text-align:center;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--principal{border:1px solid rgba(13,148,136,0.32)!important;border-left:5px solid #0d9488!important;background:linear-gradient(135deg,rgba(13,148,136,0.16),rgba(13,148,136,0.05))!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--principal .dashboard-kpi-rotulo{font-weight:700;color:#0f766e;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--principal .dashboard-kpi-valor{font-size:10pt;color:#0d5f56;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--destaque{border:1px solid rgba(31,78,140,0.2)!important;border-left:4px solid #1f4e8c!important;background:rgba(31,78,140,0.08)!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--destaque .dashboard-kpi-rotulo{color:#1e3a5f;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--destaque .dashboard-kpi-valor{font-size:9.5pt;color:#0f172a;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador{border:1px solid rgba(31,78,140,0.28)!important;border-left:3px solid #1f4e8c!important;background:rgba(31,78,140,0.1)!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador .dashboard-kpi-valor{color:#1f4e8c;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-ident,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-ident{text-align:left;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-ident .apoiadores-th-sub-municipio{display:block;font-size:6.5pt;font-weight:500;margin-top:0.05rem;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-ident--rel .apoiadores-rel-ident-nome{display:block;font-weight:600;line-height:1.25;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-ident--rel .apoiadores-rel-ident-municipio{display:block;margin-top:0.12rem;font-size:7pt;line-height:1.2;color:#64748b;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela .apoiadores-rating{display:none!important;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-lider,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-lider," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-integral,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-integral," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-meio,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-meio," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-custom,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-custom{text-align:center;padding-top:0.4rem;padding-bottom:0.4rem;padding-left:1.5rem;padding-right:1.5rem;font-variant-numeric:tabular-nums;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-valor,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-valor{text-align:right;padding-top:0.4rem;padding-bottom:0.4rem;padding-left:2.4rem;padding-right:2.4rem;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela{margin-top:0.15rem;}" +
    "@media print{" +
    ".page-apoiadores h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-apoiadores .rel-gerado{margin-bottom:0.35rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--principal," +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--destaque," +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador{" +
    "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela{font-size:8pt;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initApoiadores);
