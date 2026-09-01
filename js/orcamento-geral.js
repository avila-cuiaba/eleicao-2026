// Página orçamento geral: planilha orcamento-geral (item, orçamento C).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ORCAMENTO_GERAL;
const COLS_TABELA = 4;

let el = {};
let popoversTabela = [];
let linhasAtuais = [];

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

function linhaEstratificada(linha1) {
  return (cfg.LINHAS_ESTRATIFICADAS || []).includes(linha1);
}

function resolverIndices(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const cols = cfg.COLUNAS;
  const indices = {
    item: cols.ITEM,
    valorB: cols.VALOR_B,
    orcamento: cols.ORCAMENTO,
    repasseParceiro: cols.REPASSE_PARCEIRO,
  };

  Object.entries(cfg.CAMPOS || {}).forEach(([prop, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1) return;
    if (prop === "ITEM") indices.item = idx;
    if (prop === "ORCAMENTO") indices.orcamento = idx;
    if (prop === "REPASSE_PARCEIRO") indices.repasseParceiro = idx;
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

function exibirMoedaOrcamentoProprio(orcNum, repasseNum) {
  const proprio = (orcNum || 0) - (repasseNum || 0);
  if (!orcNum && !repasseNum) return "";
  return exibirMoeda(proprio);
}

function exibirMoedaKpi(val) {
  const n = typeof val === "number" ? val : parseNumero(val);
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
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
    const orcamento = valorCampo(linha, indices.orcamento);
    const repasseParceiro = valorCampo(linha, indices.repasseParceiro);
    const valorB = valorCampo(linha, indices.valorB);

    if (
      !item &&
      !celulaPreenchida(orcamento) &&
      !celulaPreenchida(repasseParceiro) &&
      !celulaPreenchida(valorB)
    ) {
      continue;
    }
    if (!item) continue;

    linhas.push({
      linha1,
      item,
      valorB,
      orcamento,
      repasseParceiro,
      orcNum: parseNumero(orcamento),
      repasseNum: parseNumero(repasseParceiro),
      estratificada: linhaEstratificada(linha1),
    });
  }

  return { linhas, indices, cabecalho };
}

function calcularTotais(valores, indices) {
  let kpiEstratificadas = 0;
  (cfg.LINHAS_ESTRATIFICADAS || []).forEach((linha1) => {
    const linha = valores[linha1 - 1];
    if (linha) kpiEstratificadas += parseNumero(linha[indices.orcamento]);
  });

  let kpiAgrupadas = 0;
  let kpiBonus = 0;
  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    const linha = valores[linha1 - 1];
    if (!linha) continue;
    kpiBonus += parseNumero(linha[indices.repasseParceiro]);
    if (linhaEstratificada(linha1)) continue;
    kpiAgrupadas += parseNumero(linha[indices.orcamento]);
  }

  return {
    kpiAgrupadas,
    kpiEstratificadas,
    kpiBonus,
    kpiTotal: kpiAgrupadas + kpiEstratificadas,
    kpiProprio: kpiAgrupadas + kpiEstratificadas - kpiBonus,
  };
}

function atualizarKpis(totais) {
  el.kpiTotal.textContent = exibirMoedaKpi(totais.kpiTotal);
  el.kpiAgrupadas.textContent = exibirMoedaKpi(totais.kpiAgrupadas);
  el.kpiEstratificadas.textContent = exibirMoedaKpi(totais.kpiEstratificadas);
  el.kpiBonus.textContent = exibirMoedaKpi(totais.kpiBonus);
  el.kpiProprio.textContent = exibirMoedaKpi(totais.kpiProprio);
}

function limparKpis() {
  el.kpiTotal.textContent = "";
  el.kpiAgrupadas.textContent = "";
  el.kpiEstratificadas.textContent = "";
  el.kpiBonus.textContent = "";
  el.kpiProprio.textContent = "";
}

function triggerPopoverTabela() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "hover focus"
    : "click";
}

function htmlPopoverConteudo(r) {
  const item = exibirTexto(r.item) || "—";
  const orc = exibirMoeda(r.orcamento);
  const repasse = exibirMoeda(r.repasseParceiro);

  return `<div class="orcamento-geral-popover-corpo">
    <div class="orcamento-geral-popover-titulo">${item}</div>
    <div class="orcamento-geral-popover-item">
      <span class="orcamento-geral-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
        <span class="orcamento-geral-popover-marcador orcamento-geral-popover-marcador--orcamento" aria-hidden="true"></span>
        orçamento
      </span>
      <span class="orcamento-geral-popover-valor">${orc}</span>
    </div>
    <div class="orcamento-geral-popover-item">
      <span class="orcamento-geral-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
        <span class="orcamento-geral-popover-marcador orcamento-geral-popover-marcador--repasse-parceiro" aria-hidden="true"></span>
        repasse parceiro
      </span>
      <span class="orcamento-geral-popover-valor">${repasse}</span>
    </div>
  </div>`;
}

function destruirPopoversTabela() {
  popoversTabela.forEach((p) => p.dispose());
  popoversTabela = [];
}

function inicializarPopoversTabela(linhas) {
  destruirPopoversTabela();
  if (!el.corpo || typeof bootstrap === "undefined") return;

  const linhasEl = el.corpo.querySelectorAll(
    "tr.orcamento-geral-linha-agrupada, tr.orcamento-geral-linha-estratificada"
  );

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
    popoversTabela.push(pop);
  });
}

function htmlRepasseParceiroBadge(val) {
  const texto = exibirMoeda(val);
  if (!texto) return "";
  return `<span class="orcamento-geral-repasse-badge">${texto}</span>`;
}

function renderizarLinha(r) {
  const tipoLinha = r.estratificada
    ? "orcamento-geral-linha-estratificada"
    : "orcamento-geral-linha-agrupada";

  const itemHtml = `<span class="orcamento-geral-col-item-inner">${exibirTexto(r.item)}</span>`;
  const orcHtml = exibirMoeda(r.orcamento);
  const repasseBadgeHtml = htmlRepasseParceiroBadge(r.repasseParceiro);

  return `<tr class="orcamento-geral-linha-popover ${tipoLinha}" tabindex="0" aria-label="detalhes da despesa">
    <td class="orcamento-geral-col-item">${itemHtml}</td>
    <td class="text-end orcamento-geral-col-num orcamento-geral-col-orcamento orcamento-tabela-desktop-col">${orcHtml}</td>
    <td class="text-end orcamento-geral-col-repasse orcamento-geral-col-repasse-parceiro orcamento-tabela-desktop-col">${repasseBadgeHtml}</td>
    <td class="text-end orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--orcamento">${orcHtml}</span>
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--repasse-parceiro">${repasseBadgeHtml}</span>
      </div>
    </td>
  </tr>`;
}

function renderizarTabela(valores, indices, linhas) {
  linhasAtuais = linhas;

  if (!linhas.length) {
    limparKpis();
    destruirPopoversTabela();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    return;
  }

  const totais = calcularTotais(valores, indices);
  atualizarKpis(totais);
  el.corpo.innerHTML = linhas.map(renderizarLinha).join("");
  inicializarPopoversTabela(linhas);
}

function alinharColunasTabela() {
  const panel = document.querySelector(".orcamento-geral-tabela-card .dashboard-tabela-panel");
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
  const { linhas, indices } = extrairDados(valores);
  renderizarTabela(valores, indices, linhas);
  aposRender();
}

async function carregarOrcamentoGeral() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando orçamento geral...", "carregando");

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

function htmlCardsRelatorioPagina(doc) {
  const layout = (doc || document).querySelector(".orcamento-geral-kpi-layout");
  if (!layout) return "";

  const clone = layout.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-orcamento-geral-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function plainificarRepasseParceiroNoRelatorio(table) {
  table.querySelectorAll(".orcamento-geral-repasse-badge").forEach((badge) => {
    const td = badge.closest("td");
    if (!td) return;
    td.textContent = badge.textContent.trim();
  });
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("orcamento-geral-tabela")) return;
  if (table.querySelector(".orcamento-geral-col-apagar")) return;

  plainificarRepasseParceiroNoRelatorio(table);

  const theadRow = table.querySelector("thead tr");
  if (theadRow && !theadRow.querySelector("th.orcamento-geral-col-proprio")) {
    const th = document.createElement("th");
    th.scope = "col";
    th.className =
      "text-end orcamento-geral-col-num orcamento-geral-col-proprio orcamento-tabela-desktop-col";
    th.textContent = "orçamento próprio";
    theadRow.appendChild(th);
  }

  table.querySelectorAll("colgroup").forEach((cg) => {
    if (cg.querySelector("col.orcamento-geral-col-proprio")) return;
    const col = document.createElement("col");
    col.className = "orcamento-geral-col-num orcamento-geral-col-proprio orcamento-tabela-desktop-col";
    cg.appendChild(col);
  });

  table.querySelectorAll("tbody tr").forEach((tr, idx) => {
    if (tr.querySelector("td[colspan]")) return;
    if (tr.querySelector("td.orcamento-geral-col-proprio")) return;

    const r = linhasAtuais[idx];
    const td = document.createElement("td");
    td.className =
      "text-end orcamento-geral-col-num orcamento-geral-col-proprio orcamento-tabela-desktop-col";

    if (r) {
      td.textContent = exibirMoedaOrcamentoProprio(r.orcNum, r.repasseNum);
    } else {
      const orc = parseNumero(tr.querySelector("td.orcamento-geral-col-orcamento")?.textContent);
      const rep = parseNumero(
        tr.querySelector("td.orcamento-geral-col-repasse-parceiro")?.textContent
      );
      td.textContent = exibirMoedaOrcamentoProprio(orc, rep);
    }

    tr.appendChild(td);
  });
}

function estilosRelatorioPagina() {
  return (
    ".page-orcamento-geral .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-orcamento-geral .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-orcamento-geral .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento-geral .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis{margin-top:0.2rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-layout{display:flex;flex-direction:column;gap:8px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-row-principal{display:flex;justify-content:center;gap:8px;width:100%;max-width:100%;margin:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-row-principal > .col-4{flex:1 1 0;min-width:0;max-width:none;width:auto;padding:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.2rem;padding:0.35rem 0.3rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal-ilustra{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;flex-shrink:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal-ilustra svg{width:18px;height:18px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal-valor{font-size:10pt;font-weight:800!important;line-height:1.1;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--total{background:linear-gradient(155deg,#ecfeff 0%,#cffafe 50%,#a5f3fc 100%)!important;border:1px solid rgba(8,145,178,0.22)!important;border-left:4px solid #0891b2!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--total .dashboard-kpi-rotulo{color:#0e7490;font-weight:700;font-size:7pt;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--total .orcamento-geral-kpi-principal-valor{color:#0e7490;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--total .orcamento-geral-kpi-principal-ilustra{background:linear-gradient(145deg,#22d3ee,#0891b2);color:#fff;box-shadow:0 2px 6px rgba(8,145,178,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--repasse{background:linear-gradient(155deg,#ecfdf5 0%,#bbf7d0 55%,#86efac 100%)!important;border:1px solid rgba(22,163,74,0.24)!important;border-left:4px solid #16a34a!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--repasse .dashboard-kpi-rotulo{color:#166534;font-weight:700;font-size:7pt;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--repasse .orcamento-geral-kpi-principal-valor{color:#15803d;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--repasse .orcamento-geral-kpi-principal-ilustra{background:linear-gradient(145deg,#86efac,#16a34a);color:#fff;box-shadow:0 2px 6px rgba(22,163,74,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--proprio{background:linear-gradient(155deg,#eff6ff 0%,#dbeafe 55%,#bfdbfe 100%)!important;border:1px solid rgba(31,78,140,0.22)!important;border-left:4px solid #1f4e8c!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--proprio .dashboard-kpi-rotulo{color:#1e40af;font-weight:700;font-size:7pt;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--proprio .orcamento-geral-kpi-principal-valor{color:#1f4e8c;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal--proprio .orcamento-geral-kpi-principal-ilustra{background:linear-gradient(145deg,#60a5fa,#1f4e8c);color:#fff;box-shadow:0 2px 6px rgba(31,78,140,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-row-detalhe{display:flex;gap:8px;width:72%;max-width:72%;margin:0 auto;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-row-detalhe > .col-6{flex:1 1 0;min-width:0;padding:0;max-width:none;width:auto;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe{background:#fff!important;border:1px solid rgba(15,23,42,0.1)!important;box-shadow:none!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe-body{display:flex;align-items:center;gap:0.45rem;padding:0.35rem 0.45rem;text-align:left;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe-ilustra{width:26px;height:26px;border-radius:6px;flex-shrink:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe-ilustra svg{width:14px;height:14px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe-texto{min-width:0;flex:1;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.05rem;text-align:left;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe .dashboard-kpi-valor{font-size:9pt;font-weight:700;text-align:left;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--agrupadas{border-left:3px solid #a16207!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--agrupadas .dashboard-kpi-valor{color:#92400e;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--agrupadas .orcamento-geral-kpi-detalhe-ilustra{background:#f5efe6;color:#a16207;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--estratificadas{border-left:3px solid #ea580c!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--estratificadas .dashboard-kpi-valor{color:#ea580c;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe--estratificadas .orcamento-geral-kpi-detalhe-ilustra{background:#fff7ed;color:#ea580c;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-num.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-orcamento," +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-repasse.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-repasse-parceiro," +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-proprio.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-proprio{text-align:right;padding-top:0.4rem;padding-bottom:0.4rem;padding-left:1.2rem;padding-right:1.2rem;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-agrupada > td:first-child{border-left:4px solid #a16207;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-estratificada > td:first-child{border-left:4px solid #ea580c;}" +
    "@media print{" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-principal-ilustra," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-detalhe-ilustra{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

window.atualizarPagina = carregarOrcamentoGeral;

function initOrcamentoGeral() {
  el = {
    status: document.getElementById("status"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiAgrupadas: document.getElementById("kpiAgrupadas"),
    kpiEstratificadas: document.getElementById("kpiEstratificadas"),
    kpiBonus: document.getElementById("kpiBonus"),
    kpiProprio: document.getElementById("kpiProprio"),
    corpo: document.getElementById("corpoOrcamentoGeral"),
  };
  if (!el.corpo) return;

  window.addEventListener("resize", alinharColunasTabela);
  carregarOrcamentoGeral();
}

AUTH.exigir();
PageLoader.init();
if (configValida()) PageLoader.show();
document.addEventListener("DOMContentLoaded", initOrcamentoGeral);
