// Mídia — solicitações de produção (planilha producao-midia).

const cfg = CONFIG.PRODUCAO_MIDIA;
const cfgMat = CONFIG.MATERIAL_GRAFICO;

let el = {};
let colunas = [];
let cols = {};
let linhas = [];
let modal = null;
let filtroStatus = "todas";
let opcoesPecas = [];
let opcoesTipos = [];
let opcoesExecutores = [];

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarStatus(msg, tipo) {
  if (typeof statusPainel === "function" && el.status) statusPainel(el.status, msg, tipo);
}

function limparStatus() {
  if (typeof statusPainel === "function" && el.status) statusPainel(el.status, "", null);
}

function chaveCol(col) {
  if (!col) return "";
  return col.chavePlanilha || col.chave || "";
}

function valorRegistro(reg, col) {
  if (!col || !reg) return "";
  const v = reg[col.chave];
  return v != null ? String(v).trim() : "";
}

function termoBusca() {
  return PlanilhaApi.normalizarChave(el.busca?.value);
}

function celulaPlanilha(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function extrairValoresUnicosColuna(valores, ref) {
  const inicio = ref.LINHA_INICIO_DADOS ?? cfg.LINHA_INICIO_DADOS ?? 2;
  let idx = ref.COLUNA_INDICE;
  if (idx == null && ref.COLUNA_ALIASES) {
    const cab = valores[0] || [];
    idx = cab.findIndex((c) =>
      ref.COLUNA_ALIASES.some((a) => PlanilhaApi.normalizarChave(a) === PlanilhaApi.normalizarChave(c))
    );
    if (idx < 0) idx = ref.COLUNA_INDICE_FALLBACK ?? 0;
  }
  const mapa = new Map();
  for (let linha = inicio; linha <= valores.length; linha++) {
    const texto = String(celulaPlanilha(valores, linha, idx) ?? "").trim();
    if (!texto) continue;
    const norm = PlanilhaApi.normalizarChave(texto);
    if (!mapa.has(norm)) mapa.set(norm, texto);
  }
  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

async function carregarOpcoesPecas() {
  const ref = cfg.PECAS || {};
  const planilha = ref.PLANILHA || cfgMat.PLANILHA || "material-grafico";
  const valores = await PlanilhaApi.lerValores(planilha, ref.ABA || "").catch(() => []);
  if (!valores.length) return [];
  const cab = valores[cfgMat.LINHA_CABECALHO - 1] || valores[0] || [];
  const aliases = cfgMat.COLUNA_PECA || ["peca", "peça"];
  let idx = ref.COLUNA_INDICE;
  if (idx == null) {
    idx = cab.findIndex((c) =>
      aliases.some((a) => PlanilhaApi.normalizarChave(a) === PlanilhaApi.normalizarChave(c))
    );
    if (idx < 0) idx = 1;
  }
  return extrairValoresUnicosColuna(valores, {
    LINHA_INICIO_DADOS: ref.LINHA_INICIO_DADOS ?? cfgMat.LINHA_INICIO_DADOS,
    COLUNA_INDICE: idx,
  });
}

async function carregarOpcoesTiposMaterial() {
  const ref = cfg.TIPOS_MATERIAL || {};
  const planilha = ref.PLANILHA || cfgMat.PLANILHA || "material-grafico";
  const valores = await PlanilhaApi.lerValores(planilha, ref.ABA || "").catch(() => []);
  if (!valores.length) return [];
  const cab = valores[cfgMat.LINHA_CABECALHO - 1] || valores[0] || [];
  const aliases = cfgMat.COLUNA_MIDIA || ["midia", "mídia"];
  let idx = ref.COLUNA_INDICE;
  if (idx == null) {
    idx = cab.findIndex((c) =>
      aliases.some((a) => PlanilhaApi.normalizarChave(a) === PlanilhaApi.normalizarChave(c))
    );
    if (idx < 0) idx = 2;
  }
  return extrairValoresUnicosColuna(valores, {
    LINHA_INICIO_DADOS: ref.LINHA_INICIO_DADOS ?? cfgMat.LINHA_INICIO_DADOS,
    COLUNA_INDICE: idx,
  });
}

async function carregarOpcoesExecutores() {
  const ref = cfg.EXECUTORES || {};
  const planilha = ref.PLANILHA || "diario-bordo-veiculos";
  const aba = ref.ABA || "";
  const valores = await PlanilhaApi.lerValores(planilha, aba).catch(() => []);
  return extrairValoresUnicosColuna(valores, ref);
}

function htmlOpcoesSelect(opcoes, valorAtual, placeholder) {
  const valorNorm = PlanilhaApi.normalizarChave(valorAtual);
  let html = `<option value="">${escapeHtml(placeholder || "selecione...")}</option>`;
  (opcoes || []).forEach((opt) => {
    const sel = PlanilhaApi.normalizarChave(opt) === valorNorm ? " selected" : "";
    html += `<option value="${escapeHtml(opt)}"${sel}>${escapeHtml(opt)}</option>`;
  });
  if (
    valorAtual &&
    !(opcoes || []).some((o) => PlanilhaApi.normalizarChave(o) === valorNorm)
  ) {
    html += `<option value="${escapeHtml(valorAtual)}" selected>${escapeHtml(valorAtual)}</option>`;
  }
  return html;
}

function preencherSelect(select, opcoes, placeholder) {
  if (!select) return;
  select.innerHTML = htmlOpcoesSelect(opcoes, "", placeholder);
}

function agoraParaPlanilha() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    pad(d.getDate()) +
    "/" +
    pad(d.getMonth() + 1) +
    "/" +
    d.getFullYear() +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function parseDataHora(val) {
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const s = String(val ?? "").trim();
  if (!s) return null;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const h = br[4] != null ? Number(br[4]) : 0;
    const m = br[5] != null ? Number(br[5]) : 0;
    const dt = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), h, m);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) {
    const h = iso[4] != null ? Number(iso[4]) : 0;
    const m = iso[5] != null ? Number(iso[5]) : 0;
    const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), h, m);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatarDataHoraExibir(val) {
  const dt = parseDataHora(val);
  if (!dt) return String(val ?? "").trim();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    pad(dt.getDate()) +
    "/" +
    pad(dt.getMonth() + 1) +
    "/" +
    dt.getFullYear() +
    " " +
    pad(dt.getHours()) +
    ":" +
    pad(dt.getMinutes())
  );
}

function registroFinalizado(reg) {
  return Boolean(valorRegistro(reg, cols.finalizada));
}

function resolverCols(colunasLista) {
  return {
    dtHr: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_DT_HR_SOLICITA, 0),
    peca: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_PECA, 1),
    tema: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_TEMA, 2),
    tipo: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_TIPO_MATERIAL, 3),
    solicitante: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_SOLICITANTE, 4),
    executor: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_EXECUTOR, 5),
    finalizada: PlanilhaApi.acharColuna(colunasLista, cfg.COLUNA_FINALIZADA_EM, 6),
  };
}

function linhasFiltradas() {
  const busca = termoBusca();
  return linhas.filter((reg) => {
    const fin = registroFinalizado(reg);
    if (filtroStatus === "pendentes" && fin) return false;
    if (filtroStatus === "finalizadas" && !fin) return false;
    if (!busca) return true;
    const texto = [
      valorRegistro(reg, cols.dtHr),
      valorRegistro(reg, cols.peca),
      valorRegistro(reg, cols.tema),
      valorRegistro(reg, cols.tipo),
      valorRegistro(reg, cols.solicitante),
      valorRegistro(reg, cols.executor),
      valorRegistro(reg, cols.finalizada),
    ]
      .join(" ")
      .toLowerCase();
    return PlanilhaApi.normalizarChave(texto).includes(busca);
  });
}

function atualizarKpis() {
  let pendentes = 0;
  let finalizadas = 0;
  linhas.forEach((reg) => {
    if (registroFinalizado(reg)) finalizadas += 1;
    else pendentes += 1;
  });
  if (el.kpiPendentes) el.kpiPendentes.textContent = String(pendentes);
  if (el.kpiFinalizadas) el.kpiFinalizadas.textContent = String(finalizadas);
  if (el.kpiTotal) el.kpiTotal.textContent = String(linhas.length);
}

function htmlBadgeStatus(fin) {
  if (fin) {
    return '<span class="producao-midia-badge producao-midia-badge--ok">finalizada</span>';
  }
  return '<span class="producao-midia-badge producao-midia-badge--pendente">pendente</span>';
}

function renderTabela() {
  const lista = linhasFiltradas();
  if (!el.corpo) return;

  if (!lista.length) {
    el.corpo.innerHTML = "";
    if (el.vazio) {
      el.vazio.hidden = false;
      el.vazio.textContent =
        linhas.length && (filtroStatus !== "todas" || termoBusca())
          ? "Nenhum registro encontrado com o filtro atual."
          : "Nenhuma solicitação registrada.";
    }
    return;
  }

  if (el.vazio) el.vazio.hidden = true;

  el.corpo.innerHTML = lista
    .map((reg) => {
      const fin = registroFinalizado(reg);
      const cls = fin
        ? "producao-midia-linha producao-midia-linha--finalizada"
        : "producao-midia-linha producao-midia-linha--pendente";
      const titulo = fin
        ? "Solicitação finalizada"
        : "Clique para marcar como finalizada";
      return (
        "<tr class=\"" +
        cls +
        "\" data-linha=\"" +
        reg._linha +
        "\" title=\"" +
        escapeHtml(titulo) +
        "\">" +
        "<td>" +
        escapeHtml(formatarDataHoraExibir(valorRegistro(reg, cols.dtHr))) +
        "</td>" +
        "<td>" +
        escapeHtml(valorRegistro(reg, cols.peca)) +
        "</td>" +
        "<td class=\"producao-midia-col-tema\">" +
        escapeHtml(valorRegistro(reg, cols.tema)) +
        "</td>" +
        "<td>" +
        escapeHtml(valorRegistro(reg, cols.tipo)) +
        "</td>" +
        "<td>" +
        escapeHtml(valorRegistro(reg, cols.solicitante)) +
        "</td>" +
        "<td>" +
        escapeHtml(valorRegistro(reg, cols.executor)) +
        "</td>" +
        "<td>" +
        escapeHtml(formatarDataHoraExibir(valorRegistro(reg, cols.finalizada)) || "—") +
        "</td>" +
        "<td class=\"text-center\">" +
        htmlBadgeStatus(fin) +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

async function carregarRegistros() {
  if (!PlanilhaApi.configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("", "carregando");
  try {
    const parsed = await PlanilhaApi.ler(
      cfg.PLANILHA,
      cfg.ABA || "",
      cfg.LINHA_INICIO_DADOS
    );
    if (!parsed) return;
    colunas = parsed.colunas || [];
    cols = resolverCols(colunas);
    linhas = parsed.linhas || [];
    atualizarKpis();
    renderTabela();
    limparStatus();
  } catch (err) {
    mostrarStatus("Erro ao carregar: " + err.message, "erro");
  }
}

function abrirModalNova() {
  if (!modal) return;
  el.form?.reset();
  if (el.campoSolicitante) {
    el.campoSolicitante.textContent = AUTH.getUsuario() || "—";
  }
  preencherSelect(el.campoPeca, opcoesPecas);
  preencherSelect(el.campoTipoMaterial, opcoesTipos);
  preencherSelect(el.campoExecutor, opcoesExecutores);
  if (el.modalTitulo) el.modalTitulo.textContent = "nova solicitação";
  modal.show();
}

async function salvarNova(ev) {
  ev.preventDefault();
  const peca = el.campoPeca?.value?.trim();
  const tema = el.campoTema?.value?.trim();
  const tipo = el.campoTipoMaterial?.value?.trim();
  const executor = el.campoExecutor?.value?.trim();
  const solicitante = AUTH.getUsuario() || "";

  if (!peca || !tema || !tipo || !executor) {
    mostrarStatus("Preencha peça, tema, tipo de material e executor.", "erro");
    return;
  }

  const dados = {};
  if (cols.dtHr) dados[chaveCol(cols.dtHr)] = agoraParaPlanilha();
  if (cols.peca) dados[chaveCol(cols.peca)] = peca;
  if (cols.tema) dados[chaveCol(cols.tema)] = tema;
  if (cols.tipo) dados[chaveCol(cols.tipo)] = tipo;
  if (cols.solicitante) dados[chaveCol(cols.solicitante)] = solicitante;
  if (cols.executor) dados[chaveCol(cols.executor)] = executor;

  el.btnSalvar.disabled = true;
  try {
    await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "inserir",
      aba: cfg.ABA || "",
      dados,
      origem: "producao-midia",
    });
    modal.hide();
    if (typeof AppToast !== "undefined") AppToast.show("solicitação registrada", "sucesso");
    await carregarRegistros();
  } catch (err) {
    mostrarStatus("Erro ao salvar: " + err.message, "erro");
  } finally {
    el.btnSalvar.disabled = false;
  }
}

async function finalizarRegistro(numLinha) {
  const reg = linhas.find((r) => r._linha === numLinha);
  if (!reg) return;
  if (registroFinalizado(reg)) {
    if (typeof AppToast !== "undefined") AppToast.show("solicitação já finalizada", "info");
    return;
  }

  const peca = valorRegistro(reg, cols.peca);
  const tema = valorRegistro(reg, cols.tema);
  const msg = "marcar como finalizada a solicitação \"" + (tema || peca || "sem tema") + "\"?";
  let ok = true;
  if (typeof AppConfirm !== "undefined") {
    ok = await AppConfirm.confirm(msg, { icon: "question" });
  } else {
    ok = window.confirm(msg);
  }
  if (!ok) return;

  if (!cols.finalizada) {
    mostrarStatus("Coluna finalizada-em não encontrada na planilha.", "erro");
    return;
  }

  mostrarStatus("", "carregando");
  try {
    await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "atualizar",
      linha: numLinha,
      aba: cfg.ABA || "",
      dados: { [chaveCol(cols.finalizada)]: agoraParaPlanilha() },
      origem: "producao-midia",
    });
    if (typeof AppToast !== "undefined") AppToast.show("solicitação finalizada", "sucesso");
    await carregarRegistros();
  } catch (err) {
    mostrarStatus("Erro ao finalizar: " + err.message, "erro");
  }
}

function definirFiltroStatus(novo) {
  filtroStatus = novo || "todas";
  el.filtroBtns?.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filtro === filtroStatus);
  });
  renderTabela();
}

function montarUi() {
  el = {
    status: document.getElementById("status"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
    busca: document.getElementById("buscaProducaoMidia"),
    btnNova: document.getElementById("btnNova"),
    form: document.getElementById("formProducaoMidia"),
    btnSalvar: document.getElementById("btnSalvar"),
    modalEl: document.getElementById("modalProducaoMidia"),
    modalTitulo: document.getElementById("modalTitulo"),
    campoPeca: document.getElementById("campoPeca"),
    campoTema: document.getElementById("campoTema"),
    campoTipoMaterial: document.getElementById("campoTipoMaterial"),
    campoExecutor: document.getElementById("campoExecutor"),
    campoSolicitante: document.getElementById("campoSolicitante"),
    kpiPendentes: document.getElementById("kpiPendentes"),
    kpiFinalizadas: document.getElementById("kpiFinalizadas"),
    kpiTotal: document.getElementById("kpiTotal"),
    filtroBtns: document.querySelectorAll(".producao-midia-filtro-status [data-filtro]"),
  };

  if (el.modalEl) modal = new bootstrap.Modal(el.modalEl);
}

async function init() {
  montarUi();
  AUTH.exigir();

  el.btnNova?.addEventListener("click", () => abrirModalNova());
  el.form?.addEventListener("submit", salvarNova);
  el.busca?.addEventListener("input", () => renderTabela());

  el.filtroBtns?.forEach((btn) => {
    btn.addEventListener("click", () => definirFiltroStatus(btn.dataset.filtro));
  });

  el.corpo?.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-linha]");
    if (!tr || tr.classList.contains("producao-midia-linha--finalizada")) return;
    const numLinha = Number(tr.dataset.linha);
    if (numLinha) finalizarRegistro(numLinha);
  });

  mostrarStatus("", "carregando");
  try {
    opcoesPecas = await carregarOpcoesPecas();
    opcoesTipos = await carregarOpcoesTiposMaterial();
    opcoesExecutores = await carregarOpcoesExecutores();
    await carregarRegistros();
  } catch (err) {
    mostrarStatus("Erro ao iniciar: " + err.message, "erro");
  }
}

document.addEventListener("DOMContentLoaded", init);

window.atualizarPagina = () => carregarRegistros();
