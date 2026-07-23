// Página pagamentos — geral (réplica de orcamento-geral).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ORCAMENTO_GERAL;
const COLS_TABELA = 5;
const COR_GRAFICO_ORCAMENTO = "#f87171";
const COR_GRAFICO_PAGAMENTO = "#0891b2";

let el = {};
let chartComparativo = null;
let popoversTabela = [];
let rotulosGrafico = { orcamento: "orçamento", pagamento: "pagamento" };

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
    pagamento: cols.PAGAMENTO,
    aPagar: cols.A_PAGAR,
  };

  Object.entries(cfg.CAMPOS || {}).forEach(([prop, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1) return;
    if (prop === "ITEM") indices.item = idx;
    if (prop === "ORCAMENTO") indices.orcamento = idx;
    if (prop === "PAGAMENTO") indices.pagamento = idx;
    if (prop === "A_PAGAR") indices.aPagar = idx;
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

function rotuloGraficoOrcamento(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return "orçamento";
  if (normalizarChave(t) === normalizarChave("orçamento inicial")) return "orçamento";
  return t;
}

function somarColuna(linhas, prop) {
  return linhas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function extrairDados(valores) {
  if (!valores?.length) {
    return { linhas: [], indices: null, cabecalho: [] };
  }

  const cabecalho = valores[cfg.LINHA_CABECALHO - 1] || valores[0];
  const indices = resolverIndices(cabecalho);
  const linhas = [];

  rotulosGrafico = {
    orcamento: rotuloGraficoOrcamento(cabecalho[indices.orcamento]),
    pagamento: String(cabecalho[indices.pagamento] ?? "pagamento").trim() || "pagamento",
  };

  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    const linha = valores[linha1 - 1];
    if (!linha) continue;

    const item = String(valorCampo(linha, indices.item) ?? "").trim();
    const orcamento = valorCampo(linha, indices.orcamento);
    const pagamento = valorCampo(linha, indices.pagamento);
    const aPagar = valorCampo(linha, indices.aPagar);
    const valorB = valorCampo(linha, indices.valorB);

    if (
      !item &&
      !celulaPreenchida(orcamento) &&
      !celulaPreenchida(valorB) &&
      !celulaPreenchida(pagamento) &&
      !celulaPreenchida(aPagar)
    ) {
      continue;
    }
    if (!item) continue;

    const orcNum = parseNumero(orcamento);
    const pagNum = parseNumero(pagamento);
    const aPagarNum = celulaPreenchida(aPagar) ? parseNumero(aPagar) : orcNum - pagNum;

    linhas.push({
      linha1,
      item,
      valorB,
      orcamento,
      pagamento,
      aPagar,
      orcNum,
      pagNum,
      aPagarNum,
      estratificada: linhaEstratificada(linha1),
    });
  }

  return { linhas, indices, cabecalho };
}

function calcularTotais(valores, indices, linhas) {
  const estratificadas = linhas.filter((r) => r.estratificada);
  const agrupadas = linhas.filter((r) => !r.estratificada);

  let kpiEstratificadas = 0;
  (cfg.LINHAS_ESTRATIFICADAS || []).forEach((linha1) => {
    const linha = valores[linha1 - 1];
    if (linha) kpiEstratificadas += parseNumero(linha[indices.orcamento]);
  });

  let kpiAgrupadas = 0;
  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    if (linhaEstratificada(linha1)) continue;
    const linha = valores[linha1 - 1];
    if (!linha) continue;
    kpiAgrupadas += parseNumero(linha[indices.orcamento]);
  }

  const somaC = (lista) => somarColuna(lista, "orcNum");
  const somaH = (lista) => somarColuna(lista, "pagNum");

  return {
    kpiAgrupadas,
    kpiEstratificadas,
    kpiTotal: kpiAgrupadas + kpiEstratificadas,
    grafico: {
      agrupadas: { orcamento: somaC(agrupadas), pagamento: somaH(agrupadas) },
      estratificadas: { orcamento: somaC(estratificadas), pagamento: somaH(estratificadas) },
    },
  };
}

function atualizarKpis(totais) {
  el.kpiTotal.textContent = exibirMoedaKpi(totais.kpiTotal);
  el.kpiAgrupadas.textContent = exibirMoedaKpi(totais.kpiAgrupadas);
  el.kpiEstratificadas.textContent = exibirMoedaKpi(totais.kpiEstratificadas);
}

function limparKpis() {
  el.kpiTotal.textContent = "";
  el.kpiAgrupadas.textContent = "";
  el.kpiEstratificadas.textContent = "";
}

function opcoesGrafico(totais) {
  const g = totais.grafico;
  return {
    animationDuration: 600,
    grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => fmtMoeda.format(v),
    },
    legend: {
      top: 0,
      textStyle: { fontSize: 11, color: "#64748b" },
    },
    xAxis: {
      type: "category",
      data: ["despesas agrupadas", "despesas estratificadas"],
      axisLabel: { fontSize: 10, color: "#64748b", interval: 0 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        fontSize: 10,
        color: "#94a3b8",
        formatter: (v) => fmtMoeda.format(v),
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.25)" } },
    },
    series: [
      {
        name: rotulosGrafico.orcamento,
        type: "bar",
        barGap: 0,
        itemStyle: { color: COR_GRAFICO_ORCAMENTO, borderRadius: [4, 4, 0, 0] },
        data: [g.agrupadas.orcamento, g.estratificadas.orcamento],
      },
      {
        name: rotulosGrafico.pagamento,
        type: "bar",
        itemStyle: { color: COR_GRAFICO_PAGAMENTO, borderRadius: [4, 4, 0, 0] },
        data: [g.agrupadas.pagamento, g.estratificadas.pagamento],
      },
    ],
  };
}

function renderizarGrafico(totais) {
  if (!el.grafico || typeof echarts === "undefined") return;

  if (chartComparativo) {
    chartComparativo.dispose();
    chartComparativo = null;
  }

  chartComparativo = echarts.init(el.grafico, null, { renderer: "canvas" });
  chartComparativo.setOption(opcoesGrafico(totais));
}

function calcularPercentualPago(orcNum, pagNum) {
  if (!orcNum || orcNum <= 0) return null;
  return Math.min(100, Math.max(0, (pagNum / orcNum) * 100));
}

function htmlBarraProgressoPago(orcNum, pagNum) {
  const pct = calcularPercentualPago(orcNum, pagNum);
  if (pct == null) return "";
  const pctInt = Math.round(pct);
  return `<div class="orcamento-geral-progress-pago" role="progressbar" aria-valuenow="${pctInt}" aria-valuemin="0" aria-valuemax="100" title="${pctInt}% pago">
    <div class="orcamento-geral-progress-pago-track" aria-hidden="true">
      <div class="orcamento-geral-progress-pago-fill" style="width:${pctInt}%"></div>
    </div>
  </div>`;
}

function htmlCelulaAPagar(r) {
  return `<div class="orcamento-geral-celula-apagar">
    <span class="orcamento-tabela-celula-direita orcamento-geral-valor-apagar">${exibirMoeda(r.aPagar)}</span>
    ${htmlBarraProgressoPago(r.orcNum, r.pagNum)}
  </div>`;
}

function triggerPopoverTabela() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "hover focus"
    : "click";
}

function htmlPopoverConteudo(r) {
  const item = exibirTexto(r.item) || "—";
  const orc = exibirMoeda(r.orcamento);
  const pag = exibirMoeda(r.pagamento);
  const apagar = exibirMoeda(r.aPagar);

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
        <span class="orcamento-geral-popover-marcador orcamento-geral-popover-marcador--pagamento" aria-hidden="true"></span>
        pagamento
      </span>
      <span class="orcamento-geral-popover-valor">${pag}</span>
    </div>
    <div class="orcamento-geral-popover-item">
      <span class="orcamento-geral-popover-rotulo orcamento-geral-popover-rotulo--com-marcador">
        <span class="orcamento-geral-popover-marcador orcamento-geral-popover-marcador--apagar" aria-hidden="true"></span>
        a pagar
      </span>
      <span class="orcamento-geral-popover-valor">${apagar}</span>
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

function renderizarLinha(r) {
  const tipoLinha = r.estratificada
    ? "orcamento-geral-linha-estratificada"
    : "orcamento-geral-linha-agrupada";

  const itemHtml = `<span class="orcamento-geral-col-item-inner">${exibirTexto(r.item)}</span>`;

  return `<tr class="orcamento-geral-linha-popover ${tipoLinha}" tabindex="0" aria-label="detalhes da despesa">
    <td class="orcamento-geral-col-item">${itemHtml}</td>
    <td class="text-end orcamento-geral-col-num orcamento-geral-col-orcamento orcamento-tabela-desktop-col">${exibirMoeda(r.orcamento)}</td>
    <td class="text-end orcamento-geral-col-num orcamento-tabela-desktop-col">${exibirMoeda(r.pagamento)}</td>
    <td class="text-end orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--orcamento">${exibirMoeda(r.orcamento)}</span>
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--pagamento">${exibirMoeda(r.pagamento)}</span>
      </div>
    </td>
    <td class="orcamento-geral-col-apagar orcamento-geral-a-pagar">${htmlCelulaAPagar(r)}</td>
  </tr>`;
}

function renderizarTabela(valores, indices, linhas) {
  if (!linhas.length) {
    limparKpis();
    destruirPopoversTabela();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    if (chartComparativo) {
      chartComparativo.dispose();
      chartComparativo = null;
    }
    return;
  }

  const totais = calcularTotais(valores, indices, linhas);
  atualizarKpis(totais);
  renderizarGrafico(totais);
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
    chartComparativo?.resize();
    notificarAlturaFrame();
    requestAnimationFrame(() => {
      alinharColunasTabela();
      chartComparativo?.resize();
    });
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
    if (chartComparativo) {
      chartComparativo.dispose();
      chartComparativo = null;
    }
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarOrcamentoGeral;

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

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("orcamento-geral-tabela")) return;
  if (!table.querySelector(".orcamento-geral-col-apagar")) return;

  const thApagar = table.querySelector("thead th.orcamento-geral-col-apagar");
  if (thApagar) {
    thApagar.className = "text-end orcamento-geral-col-apagar";
    thApagar.textContent = "a pagar";
  }
}

function estilosRelatorioPagina() {
  return (
    ".page-orcamento-geral .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-orcamento-geral .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-orcamento-geral .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento-geral .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis{margin-top:0.2rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-layout{display:flex;flex-direction:column;gap:8px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-total{display:flex;justify-content:center;width:100%;margin:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-total > .col-12{flex:0 0 40%;max-width:40%;width:40%;padding:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-detalhe{display:flex;gap:8px;width:60%;max-width:60%;margin:0 auto;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-detalhe > .col-6{flex:1 1 0;min-width:0;padding:0;max-width:none;width:auto;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-body," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.2rem;padding:0.35rem 0.3rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-rotulo," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-valor{text-align:center;width:100%;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra{display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total{background:linear-gradient(155deg,#ecfeff 0%,#cffafe 50%,#a5f3fc 100%)!important;border:1px solid rgba(8,145,178,0.22)!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total .dashboard-kpi-rotulo{font-weight:700;font-size:7pt;color:#0e7490;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-valor-total{font-size:10pt;font-weight:800!important;color:#0e7490;line-height:1.1;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-total{background:linear-gradient(145deg,#22d3ee,#0891b2);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(8,145,178,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-total svg{width:18px;height:18px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-agrupadas{background:linear-gradient(155deg,#faf6f1 0%,#e8dcc8 55%,#d4b896 100%)!important;border:1px solid rgba(146,64,14,0.22)!important;border-left:4px solid #a16207!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-agrupadas .dashboard-kpi-rotulo{color:#78350f;font-weight:700;font-size:7pt;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-agrupadas .dashboard-kpi-valor{color:#92400e;font-size:9pt;font-weight:700;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra-agrupadas{background:linear-gradient(145deg,#d4b896,#a16207);color:#fff;width:28px;height:28px;box-shadow:0 2px 6px rgba(146,64,14,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra-agrupadas svg{width:16px;height:16px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-estratificadas{background:linear-gradient(155deg,#fff7ed 0%,#fed7aa 55%,#fdba74 100%)!important;border:1px solid rgba(234,88,12,0.26)!important;border-left:4px solid #ea580c!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-estratificadas .dashboard-kpi-rotulo{color:#c2410c;font-weight:700;font-size:7pt;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-estratificadas .dashboard-kpi-valor{color:#ea580c;font-size:9pt;font-weight:700;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra-estratificadas{background:linear-gradient(145deg,#fdba74,#ea580c);color:#fff;width:28px;height:28px;box-shadow:0 2px 6px rgba(234,88,12,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra-estratificadas svg{width:16px;height:16px;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-num.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-num," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-orcamento{text-align:right;padding:0.4rem 0.5rem;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-apagar," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-apagar{text-align:right!important;vertical-align:middle;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-geral-celula-apagar{display:flex;flex-direction:column;align-items:flex-end;gap:0.2rem;width:100%;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-geral-valor-apagar{display:block;width:100%;text-align:right;font-variant-numeric:tabular-nums;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-agrupada > td:first-child{border-left:4px solid #a16207;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-estratificada > td:first-child{border-left:4px solid #ea580c;}" +
    "@media print{" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-geral-kpi-ilustra{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function initOrcamentoGeral() {
  el = {
    status: document.getElementById("status"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiAgrupadas: document.getElementById("kpiAgrupadas"),
    kpiEstratificadas: document.getElementById("kpiEstratificadas"),
    grafico: document.getElementById("graficoComparativo"),
    corpo: document.getElementById("corpoOrcamentoGeral"),
  };
  if (!el.corpo) return;

  window.addEventListener("resize", () => {
    alinharColunasTabela();
    chartComparativo?.resize();
  });

  carregarOrcamentoGeral();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initOrcamentoGeral);
