// Página desembolso: planilha orcamento-desembolso (item B, orçamento C, prazos J–M).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.DESEMBOLSO;
const COLS_TABELA = 9;
const CAMPOS_PRAZO = [
  { prop: "dias5", idxKey: "dias5" },
  { prop: "dias15", idxKey: "dias15" },
  { prop: "dias30", idxKey: "dias30" },
  { prop: "dias45", idxKey: "dias45" },
];

let el = {};
let popoversTabela = [];
let handlerCliqueForaPopover = null;

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function mostrarStatus(mensagem, tipo) {
  statusPainel(el.status, mensagem, tipo);
}

function limparStatus() {
  statusPainel(el.status, "", null);
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

function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", cfg.PLANILHA);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function fetchPlanilha() {
  const resp = await fetch(urlConsulta(), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar planilha.");
  return json.valores || [];
}

function resolverIndices(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const cols = cfg.COLUNAS;
  const indices = {
    item: cols.ITEM,
    orcamento: cols.ORCAMENTO,
    dias5: cols.DIAS_5,
    dias15: cols.DIAS_15,
    dias30: cols.DIAS_30,
    dias45: cols.DIAS_45,
  };

  Object.entries(cfg.CAMPOS || {}).forEach(([prop, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx !== -1) {
      if (prop === "ITEM") indices.item = idx;
      if (prop === "ORCAMENTO") indices.orcamento = idx;
      if (prop === "DIAS_5") indices.dias5 = idx;
      if (prop === "DIAS_15") indices.dias15 = idx;
      if (prop === "DIAS_30") indices.dias30 = idx;
      if (prop === "DIAS_45") indices.dias45 = idx;
    }
  });

  return indices;
}

function valorCampo(linha, idx) {
  if (idx == null || idx < 0) return "";
  return linha[idx];
}

function exibirMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (Number.isFinite(n)) return fmtMoeda.format(n);
  return escapeHtml(s);
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function linhaVazia(linha, indices, item) {
  if (item) return false;
  const campos = [
    indices.orcamento,
    indices.dias5,
    indices.dias15,
    indices.dias30,
    indices.dias45,
  ];
  return !campos.some((idx) => celulaPreenchida(valorCampo(linha, idx)));
}

function extrairDados(valores) {
  if (!valores?.length) {
    return { linhas: [], indices: null, cabecalho: [] };
  }

  const cabecalho = valores[cfg.LINHA_CABECALHO - 1] || valores[0];
  const indices = resolverIndices(cabecalho);
  const linhas = [];

  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    const linha = valores[linha1 - 1];
    if (!linha) continue;

    const item = String(valorCampo(linha, indices.item) ?? "").trim();
    if (linhaVazia(linha, indices, item)) continue;
    if (!item) continue;

    const orcamento = valorCampo(linha, indices.orcamento);
    const dias5 = valorCampo(linha, indices.dias5);
    const dias15 = valorCampo(linha, indices.dias15);
    const dias30 = valorCampo(linha, indices.dias30);
    const dias45 = valorCampo(linha, indices.dias45);

    linhas.push({
      linha1,
      item,
      orcamento,
      orcNum: parseNumero(orcamento),
      dias5,
      num5: parseNumero(dias5),
      dias15,
      num15: parseNumero(dias15),
      dias30,
      num30: parseNumero(dias30),
      dias45,
      num45: parseNumero(dias45),
    });
  }

  return { linhas, indices, cabecalho };
}

function somarProp(linhas, prop) {
  return linhas.reduce((acc, r) => acc + (r[prop] || 0), 0);
}

function calcularTotais(linhas) {
  return {
    kpi5: somarProp(linhas, "num5"),
    kpi15: somarProp(linhas, "num15"),
    kpi30: somarProp(linhas, "num30"),
    kpi45: somarProp(linhas, "num45"),
  };
}

function limparKpis() {
  el.kpi5.textContent = "—";
  el.kpi15.textContent = "—";
  el.kpi30.textContent = "—";
  el.kpi45.textContent = "—";
}

function atualizarKpis(totais) {
  el.kpi5.textContent = fmtMoeda.format(totais.kpi5);
  el.kpi15.textContent = fmtMoeda.format(totais.kpi15);
  el.kpi30.textContent = fmtMoeda.format(totais.kpi30);
  el.kpi45.textContent = fmtMoeda.format(totais.kpi45);
}

function triggerPopoverTabela() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "hover focus"
    : "click";
}

function htmlPopoverPrazo(prazo, rotulo, valor) {
  const exibicao = exibirMoeda(valor) || "—";
  return `<div class="orcamento-desembolso-popover-subitem">
    <span class="orcamento-desembolso-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
      <span class="orcamento-geral-popover-marcador orcamento-desembolso-popover-marcador--${prazo}" aria-hidden="true"></span>
      ${rotulo}
    </span>
    <span class="orcamento-geral-popover-valor">${exibicao}</span>
  </div>`;
}

function htmlPopoverConteudo(r) {
  const item = exibirTexto(r.item) || "—";
  const orc = exibirMoeda(r.orcamento) || "—";

  return `<div class="orcamento-desembolso-popover-corpo">
    <div class="orcamento-desembolso-popover-titulo">${item}</div>
    <div class="orcamento-geral-popover-item">
      <span class="orcamento-geral-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
        <span class="orcamento-geral-popover-marcador orcamento-desembolso-popover-marcador--orcamento" aria-hidden="true"></span>
        orçamento
      </span>
      <span class="orcamento-geral-popover-valor">${orc}</span>
    </div>
    <div class="orcamento-desembolso-popover-secao">desembolso</div>
    ${htmlPopoverPrazo("5", "5 dias", r.dias5)}
    ${htmlPopoverPrazo("15", "15 dias", r.dias15)}
    ${htmlPopoverPrazo("30", "30 dias", r.dias30)}
    ${htmlPopoverPrazo("45", "45 dias", r.dias45)}
  </div>`;
}

function fecharOutrosPopovers(trAtivo) {
  popoversTabela.forEach((p) => {
    if (p._element !== trAtivo) p.hide();
  });
}

function removerCliqueForaPopover() {
  if (!handlerCliqueForaPopover) return;
  document.removeEventListener("click", handlerCliqueForaPopover, true);
  handlerCliqueForaPopover = null;
}

function destruirPopoversTabela() {
  removerCliqueForaPopover();
  popoversTabela.forEach((p) => p.dispose());
  popoversTabela = [];
}

function inicializarPopoversTabela(linhas) {
  destruirPopoversTabela();
  if (!el.corpo || typeof bootstrap === "undefined") return;

  const linhasEl = el.corpo.querySelectorAll("tr.orcamento-desembolso-linha-popover");
  linhasEl.forEach((tr, idx) => {
    const r = linhas[idx];
    if (!r) return;

    const pop = new bootstrap.Popover(tr, {
      trigger: triggerPopoverTabela(),
      html: true,
      sanitize: false,
      placement: "auto",
      container: "body",
      customClass: "orcamento-geral-popover-bs",
      content: htmlPopoverConteudo(r),
    });

    tr.addEventListener("show.bs.popover", () => fecharOutrosPopovers(tr));
    popoversTabela.push(pop);
  });

  handlerCliqueForaPopover = (e) => {
    const emLinha = e.target.closest("tr.orcamento-desembolso-linha-popover");
    const emPopover = e.target.closest(".popover.orcamento-geral-popover-bs");
    if (!emLinha && !emPopover) {
      popoversTabela.forEach((p) => p.hide());
    }
  };
  document.addEventListener("click", handlerCliqueForaPopover, true);
}

function valorPrazoStack(prazo, valor) {
  if (!celulaPreenchida(valor)) {
    return `<span class="orcamento-desembolso-stack-valor-linha orcamento-desembolso-stack-valor-linha--vazio"></span>`;
  }
  return `<span class="orcamento-desembolso-stack-valor-linha">
      <span class="orcamento-tabela-stack-valor">${exibirMoeda(valor)}</span>
      <span class="orcamento-desembolso-prazo-ponto orcamento-desembolso-prazo-ponto--${prazo}" aria-hidden="true"></span>
    </span>`;
}

function renderizarLinha(r) {
  const prazosDesktop = CAMPOS_PRAZO.map(
    (c) =>
      `<td class="text-end orcamento-desembolso-col-prazo apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r[c.prop])}</td>`
  ).join("");

  const stackPrazoA = `${valorPrazoStack("5", r.dias5)}
        ${valorPrazoStack("30", r.dias30)}`;
  const stackPrazoB = `${valorPrazoStack("15", r.dias15)}
        ${valorPrazoStack("45", r.dias45)}`;

  return `<tr class="orcamento-desembolso-linha-popover" tabindex="0" aria-label="detalhes da despesa">
    <td class="orcamento-desembolso-col-item orcamento-tabela-desktop-col">
      <span class="orcamento-desembolso-col-item-inner">${exibirTexto(r.item)}</span>
    </td>
    <td class="text-end orcamento-desembolso-col-orcamento apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r.orcamento)}</td>
    ${prazosDesktop}
    <td class="orcamento-desembolso-col-stack-item orcamento-tabela-stack-col">
      <div class="orcamento-desembolso-celula-item-stack">
        <span class="orcamento-desembolso-col-item-inner">${exibirTexto(r.item)}</span>
        <span class="orcamento-desembolso-orcamento-badge">${exibirMoeda(r.orcamento)}</span>
      </div>
    </td>
    <td class="text-end orcamento-desembolso-col-stack-prazo-a orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        ${stackPrazoA}
      </div>
    </td>
    <td class="text-end orcamento-desembolso-col-stack-prazo-b orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        ${stackPrazoB}
      </div>
    </td>
  </tr>`;
}

function renderizarTabela(linhas) {
  if (!linhas.length) {
    limparKpis();
    destruirPopoversTabela();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    return;
  }

  const totais = calcularTotais(linhas);
  atualizarKpis(totais);
  el.corpo.innerHTML = linhas.map(renderizarLinha).join("");
  inicializarPopoversTabela(linhas);
}

function alinharColunasTabela() {
  const panel = document.querySelector(".orcamento-desembolso-tabela-card .dashboard-tabela-panel");
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
}

function aposRender() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function montar(valores) {
  const { linhas } = extrairDados(valores);
  renderizarTabela(linhas);
  aposRender();
}

async function carregarDesembolso() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando desembolso...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const valores = await fetchPlanilha();
    if (valores === null) {
      limparStatus();
      return;
    }

    montar(valores);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    destruirPopoversTabela();
    el.corpo.innerHTML = "";
    limparKpis();
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarDesembolso;

function initDesembolso() {
  el = {
    status: document.getElementById("status"),
    kpi5: document.getElementById("kpi5"),
    kpi15: document.getElementById("kpi15"),
    kpi30: document.getElementById("kpi30"),
    kpi45: document.getElementById("kpi45"),
    corpo: document.getElementById("corpoDesembolso"),
  };
  if (!el.corpo) return;

  window.addEventListener("resize", alinharColunasTabela);
  carregarDesembolso();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initDesembolso);
