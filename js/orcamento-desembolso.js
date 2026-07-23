// Página desembolso: planilha orcamento-desembolso (item B, orçamento C, datas J–N).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.DESEMBOLSO;
const PERIODOS = cfg.PERIODOS || [];
const COLS_TABELA = 2 + PERIODOS.length + 3;
const STACK_MOBILE_B = ["ago30", "set30"];
const AGRUPAMENTO_MOBILE_JUL_AGO15 = {
  slug: "ago15",
  props: ["jul30", "ago15"],
};

let el = {};
let popoversTabela = [];
let handlerCliqueForaPopover = null;
let ultimasLinhas = [];

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
  };

  PERIODOS.forEach((p) => {
    indices[p.prop] = cols[p.chave];
  });

  Object.entries(cfg.CAMPOS || {}).forEach(([chave, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1) return;
    if (chave === "ITEM") indices.item = idx;
    if (chave === "ORCAMENTO") indices.orcamento = idx;
    const periodo = PERIODOS.find((p) => p.chave === chave);
    if (periodo) indices[periodo.prop] = idx;
  });

  return indices;
}

function valorCampo(linha, idx) {
  if (idx == null || idx < 0) return "";
  return linha[idx];
}

function exibirMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s || s === "-" || s === "—") return "";
  const n = parseNumero(val);
  if (!Number.isFinite(n) || n === 0) return "";
  return fmtMoeda.format(n);
}

function exibirMoedaKpi(val) {
  const n = typeof val === "number" ? val : parseNumero(val);
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function linhaVazia(linha, indices, item) {
  if (item) return false;
  const campos = [indices.orcamento, ...PERIODOS.map((p) => indices[p.prop])];
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
    const registro = {
      linha1,
      item,
      orcamento,
      orcNum: parseNumero(orcamento),
    };

    PERIODOS.forEach((p) => {
      const val = valorCampo(linha, indices[p.prop]);
      registro[p.prop] = val;
      registro[p.numProp] = parseNumero(val);
    });

    linhas.push(registro);
  }

  return { linhas, indices, cabecalho };
}

function telasMenoresDesembolso() {
  return window.matchMedia("(max-width: 991.98px)").matches;
}

function calcularTotais(linhas) {
  const totais = {};
  PERIODOS.forEach((p) => {
    totais[p.kpiId] = linhas.reduce((acc, r) => acc + (r[p.numProp] || 0), 0);
  });
  return totais;
}

function limparKpis() {
  PERIODOS.forEach((p) => {
    if (el[p.kpiId]) el[p.kpiId].textContent = "";
  });
}

function atualizarKpis(totais) {
  const mobile = telasMenoresDesembolso();
  PERIODOS.forEach((p) => {
    if (!el[p.kpiId]) return;
    let val = totais[p.kpiId] || 0;
    if (mobile && p.prop === "ago15") {
      val += totais.kpiJul30 || 0;
    }
    el[p.kpiId].textContent = exibirMoedaKpi(val);
  });
}

function triggerPopoverTabela() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "hover focus"
    : "click";
}

function htmlPopoverPrazo(periodo, valor) {
  const exibicao = exibirMoeda(valor);
  return `<div class="orcamento-desembolso-popover-subitem">
    <span class="orcamento-desembolso-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
      <span class="orcamento-geral-popover-marcador orcamento-desembolso-popover-marcador--${periodo.slug}" aria-hidden="true"></span>
      ${escapeHtml(periodo.rotulo)}
    </span>
    <span class="orcamento-geral-popover-valor">${exibicao}</span>
  </div>`;
}

function htmlPopoverConteudo(r) {
  const item = exibirTexto(r.item) || "—";
  const orc = exibirMoeda(r.orcamento);
  const prazos = PERIODOS.map((p) => htmlPopoverPrazo(p, r[p.prop])).join("");

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
    ${prazos}
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

function somaJulAgo15(r) {
  return (r.numJul30 || 0) + (r.numAgo15 || 0);
}

function temValorJulAgo15(r) {
  return celulaPreenchida(r.jul30) || celulaPreenchida(r.ago15);
}

function valorPrazoStackAgrupado(slug, soma, temValor) {
  if (!temValor && soma <= 0) {
    return `<span class="orcamento-desembolso-stack-valor-linha orcamento-desembolso-stack-valor-linha--vazio"></span>`;
  }
  const exibicao = soma === 0 ? "" : fmtMoeda.format(soma);
  if (!exibicao) {
    return `<span class="orcamento-desembolso-stack-valor-linha orcamento-desembolso-stack-valor-linha--vazio"></span>`;
  }
  return `<span class="orcamento-desembolso-stack-valor-linha">
      <span class="orcamento-tabela-stack-valor">${exibicao}</span>
      <span class="orcamento-desembolso-prazo-ponto orcamento-desembolso-prazo-ponto--${slug}" aria-hidden="true"></span>
    </span>`;
}

function valorPrazoStack(periodo, valor) {
  const exibicao = exibirMoeda(valor);
  if (!exibicao) {
    return `<span class="orcamento-desembolso-stack-valor-linha orcamento-desembolso-stack-valor-linha--vazio"></span>`;
  }
  return `<span class="orcamento-desembolso-stack-valor-linha">
      <span class="orcamento-tabela-stack-valor">${exibicao}</span>
      <span class="orcamento-desembolso-prazo-ponto orcamento-desembolso-prazo-ponto--${periodo.slug}" aria-hidden="true"></span>
    </span>`;
}

function periodosStack(stack) {
  return PERIODOS.filter((p) => p.stack === stack);
}

function stackMobileProps(props, r) {
  return props
    .map((prop) => PERIODOS.find((p) => p.prop === prop))
    .filter(Boolean)
    .map((p) => valorPrazoStack(p, r[p.prop]))
    .join("");
}

function stacksMobile(r) {
  const set15 = PERIODOS.find((p) => p.prop === "set15");
  const stackA =
    valorPrazoStackAgrupado(AGRUPAMENTO_MOBILE_JUL_AGO15.slug, somaJulAgo15(r), temValorJulAgo15(r)) +
    (set15 ? valorPrazoStack(set15, r.set15) : "");
  return {
    stackA,
    stackB: stackMobileProps(STACK_MOBILE_B, r),
  };
}

function renderizarLinha(r) {
  const prazosDesktop = PERIODOS.map(
    (p) =>
      `<td class="text-end orcamento-desembolso-col-prazo apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r[p.prop])}</td>`
  ).join("");

  const stacks = telasMenoresDesembolso()
    ? stacksMobile(r)
    : {
        stackA: periodosStack("a")
          .map((p) => valorPrazoStack(p, r[p.prop]))
          .join(""),
        stackB: periodosStack("b")
          .map((p) => valorPrazoStack(p, r[p.prop]))
          .join(""),
      };
  const stackPrazoA = stacks.stackA;
  const stackPrazoB = stacks.stackB;

  const orcBadge = exibirMoeda(r.orcamento);

  return `<tr class="orcamento-desembolso-linha-popover" tabindex="0" aria-label="detalhes da despesa">
    <td class="orcamento-desembolso-col-item orcamento-tabela-desktop-col">
      <span class="orcamento-desembolso-col-item-inner">${exibirTexto(r.item)}</span>
    </td>
    <td class="text-end orcamento-desembolso-col-orcamento apoiadores-celula-num orcamento-tabela-desktop-col">${orcBadge}</td>
    ${prazosDesktop}
    <td class="orcamento-desembolso-col-stack-item orcamento-tabela-stack-col">
      <div class="orcamento-desembolso-celula-item-stack">
        <span class="orcamento-desembolso-col-item-inner">${exibirTexto(r.item)}</span>
        ${orcBadge ? `<span class="orcamento-desembolso-orcamento-badge">${orcBadge}</span>` : ""}
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
  ultimasLinhas = linhas;
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

function htmlCardsRelatorioPagina(doc) {
  const row = (doc || document).querySelector(".orcamento-desembolso-kpi-row");
  if (!row) return "";

  const clone = row.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.classList.remove("mb-3");

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-desembolso-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function estilosRelatorioPagina() {
  return (
    ".page-orcamento-desembolso .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-orcamento-desembolso .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-orcamento-desembolso .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento-desembolso .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis{margin-top:0.2rem;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-row{display:flex;flex-wrap:nowrap;gap:6px;width:100%;margin:0;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-row > [class*='col-']{flex:1 1 0;min-width:0;padding:0;max-width:none;width:auto;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-mobile-oculto{display:block!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.1rem;padding:0.25rem 0.2rem;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-rotulo," +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-valor{text-align:center;width:100%;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-rotulo{font-size:6.5pt;font-weight:700;line-height:1.1;text-transform:none;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-valor{font-size:7.5pt;font-weight:700;line-height:1.1;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-jul30{background:linear-gradient(155deg,#ecfeff 0%,#cffafe 55%,#a5f3fc 100%)!important;border:1px solid rgba(8,145,178,0.22)!important;border-left:4px solid #06b6d4!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-jul30 .dashboard-kpi-rotulo{color:#0e7490;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-jul30 .dashboard-kpi-valor{color:#0891b2;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago15{background:linear-gradient(155deg,#f0fdfa 0%,#ccfbf1 55%,#99f6e4 100%)!important;border:1px solid rgba(13,148,136,0.22)!important;border-left:4px solid #14b8a6!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago15 .dashboard-kpi-rotulo{color:#0f766e;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago15 .dashboard-kpi-valor{color:#0d9488;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago30{background:linear-gradient(155deg,#faf6f1 0%,#e8dcc8 55%,#d4b896 100%)!important;border:1px solid rgba(146,64,14,0.22)!important;border-left:4px solid #a16207!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago30 .dashboard-kpi-rotulo{color:#78350f;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-ago30 .dashboard-kpi-valor{color:#92400e;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set15{background:linear-gradient(155deg,#fff7ed 0%,#fed7aa 55%,#fdba74 100%)!important;border:1px solid rgba(234,88,12,0.24)!important;border-left:4px solid #ea580c!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set15 .dashboard-kpi-rotulo{color:#c2410c;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set15 .dashboard-kpi-valor{color:#ea580c;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set30{background:linear-gradient(155deg,#f5f3ff 0%,#ddd6fe 55%,#c4b5fd 100%)!important;border:1px solid rgba(124,58,237,0.24)!important;border-left:4px solid #7c3aed!important;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set30 .dashboard-kpi-rotulo{color:#6d28d9;}" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .orcamento-desembolso-kpi-set30 .dashboard-kpi-valor{color:#7c3aed;}" +
    ".page-orcamento-desembolso table.rel-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    "@media print{" +
    ".page-orcamento-desembolso .rel-desembolso-kpis .dashboard-kpi-card{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;

function reapresentarDesembolso() {
  if (!ultimasLinhas.length) return;
  const totais = calcularTotais(ultimasLinhas);
  atualizarKpis(totais);
  el.corpo.innerHTML = ultimasLinhas.map(renderizarLinha).join("");
  inicializarPopoversTabela(ultimasLinhas);
  aposRender();
}

function initDesembolso() {
  el = {
    status: document.getElementById("status"),
    corpo: document.getElementById("corpoDesembolso"),
  };
  PERIODOS.forEach((p) => {
    el[p.kpiId] = document.getElementById(p.kpiId);
  });
  if (!el.corpo) return;

  const mqMobile = window.matchMedia("(max-width: 991.98px)");
  const aoMudarViewport = () => reapresentarDesembolso();
  if (mqMobile.addEventListener) {
    mqMobile.addEventListener("change", aoMudarViewport);
  } else {
    mqMobile.addListener(aoMudarViewport);
  }

  window.addEventListener("resize", alinharColunasTabela);
  carregarDesembolso();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initDesembolso);
