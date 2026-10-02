// Página pagamentos — geral (réplica de orcamento-geral).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ORCAMENTO_GERAL;
const cfgPagLideranca = CONFIG.PAGAMENTOS_LIDERANCA;
const COLS_TABELA = 7;

let el = {};
let popoversTabela = [];

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

function urlConsultaPlanilha(planilhaKey, aba) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilhaKey);
  if (aba) url.searchParams.set("aba", aba);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function urlConsulta() {
  return urlConsultaPlanilha(cfg.PLANILHA, cfg.ABA);
}

async function fetchPlanilhaPorChave(planilhaKey, aba) {
  const resp = await fetch(urlConsultaPlanilha(planilhaKey, aba), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar planilha.");
  return json.valores || [];
}

async function fetchPlanilha() {
  return fetchPlanilhaPorChave(cfg.PLANILHA, cfg.ABA);
}

/** Soma col. V (total repasse) da aba pagamentos por liderança (gid 195528017). */
function somarTotalRepassePlanilhaLideranca(valores) {
  if (!valores?.length || !cfgPagLideranca?.COLUNAS) return 0;
  const col = cfgPagLideranca.COLUNAS.PGTO_APOIADOR;
  const colLider = cfgPagLideranca.COLUNAS.LIDERANCA;
  const colMun = cfgPagLideranca.COLUNAS.MUNICIPIO;
  const inicio = (cfgPagLideranca.LINHA_INICIO_DADOS || 2) - 1;
  let total = 0;
  for (let i = inicio; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;
    if (!String(linha[colLider] ?? "").trim() || !String(linha[colMun] ?? "").trim()) continue;
    total += parseNumero(linha[col]);
  }
  return total;
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
    if (prop === "REPASSE_PARCEIRO") indices.repasseParceiro = idx;
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

function somarColuna(linhas, prop) {
  return linhas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function itemEhDespesasPessoal(item) {
  const k = normalizarChave(item);
  const aliases = (cfg.DESPESAS_PESSOAL?.ITEM_ALIASES || ["despesas pessoal"]).map((a) =>
    normalizarChave(a)
  );
  return aliases.some((a) => k === a);
}

function apagarDespesasPessoalDePlanilha(valores) {
  const ref = cfg.DESPESAS_PESSOAL;
  if (!ref || !valores?.length) return 0;
  const linha = valores[ref.APAGAR_LINHA1 - 1];
  if (!linha) return 0;
  return parseNumero(linha[ref.APAGAR_COLUNA]);
}

function extrairDados(valores) {
  if (!valores?.length) {
    return { linhas: [], indices: null, cabecalho: [] };
  }

  const cabecalho = valores[cfg.LINHA_CABECALHO - 1] || valores[0];
  const indices = resolverIndices(cabecalho);
  const linhas = [];
  const apagarDespesasPessoalPlanilha = apagarDespesasPessoalDePlanilha(valores);

  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    const linha = valores[linha1 - 1];
    if (!linha) continue;

    const item = String(valorCampo(linha, indices.item) ?? "").trim();
    const orcamento = valorCampo(linha, indices.orcamento);
    const repasseParceiro = valorCampo(linha, indices.repasseParceiro);
    const pagamento = valorCampo(linha, indices.pagamento);
    const valorB = valorCampo(linha, indices.valorB);

    if (
      !item &&
      !celulaPreenchida(orcamento) &&
      !celulaPreenchida(valorB) &&
      !celulaPreenchida(repasseParceiro) &&
      !celulaPreenchida(pagamento)
    ) {
      continue;
    }
    if (!item) continue;

    const orcNum = parseNumero(orcamento);
    const repasseNum = parseNumero(repasseParceiro);
    const pagNum = parseNumero(pagamento);
    let aPagarNum = orcNum - (repasseNum + pagNum);
    if (itemEhDespesasPessoal(item)) {
      aPagarNum = apagarDespesasPessoalPlanilha;
    }

    linhas.push({
      linha1,
      item,
      valorB,
      orcamento,
      repasseParceiro,
      pagamento,
      orcNum,
      repasseNum,
      pagNum,
      aPagarNum,
      estratificada: linhaEstratificada(linha1),
    });
  }

  return { linhas, indices, cabecalho };
}

function calcularTotais(linhas, kpiRepasseParceiros) {
  const kpiTotal = somarColuna(linhas, "orcNum");
  const kpiRepasse = kpiRepasseParceiros ?? 0;
  const kpiPagamento = somarColuna(linhas, "pagNum");

  return {
    kpiTotal,
    kpiRepasse,
    kpiPagamento,
    kpiAPagar: somarColuna(linhas, "aPagarNum"),
  };
}

function atualizarKpis(totais) {
  el.kpiTotal.textContent = exibirMoedaKpi(totais.kpiTotal);
  el.kpiRepasse.textContent = exibirMoedaKpi(totais.kpiRepasse);
  el.kpiPagamento.textContent = exibirMoedaKpi(totais.kpiPagamento);
  el.kpiAPagar.textContent = exibirMoedaKpi(totais.kpiAPagar);
}

function limparKpis() {
  el.kpiTotal.textContent = "";
  el.kpiRepasse.textContent = "";
  el.kpiPagamento.textContent = "";
  el.kpiAPagar.textContent = "";
}

function calcularPercentualPago(orcNum, repasseNum, pagNum) {
  if (!orcNum || orcNum <= 0) return null;
  const pago = (repasseNum || 0) + (pagNum || 0);
  return Math.min(100, Math.max(0, (pago / orcNum) * 100));
}

function htmlBarraProgressoPago(orcNum, repasseNum, pagNum) {
  const pct = calcularPercentualPago(orcNum, repasseNum, pagNum);
  if (pct == null) return "";
  const pctInt = Math.round(pct);
  return `<div class="orcamento-geral-progress-pago" role="progressbar" aria-valuenow="${pctInt}" aria-valuemin="0" aria-valuemax="100" title="${pctInt}% pago">
    <div class="orcamento-geral-progress-pago-track" aria-hidden="true">
      <div class="orcamento-geral-progress-pago-fill" style="width:${pctInt}%"></div>
    </div>
  </div>`;
}

function htmlCelulaAPagar(r) {
  const aPagarExib = exibirMoeda(r.aPagarNum);
  return `<div class="orcamento-geral-celula-apagar">
    <span class="orcamento-tabela-celula-direita orcamento-geral-valor-apagar">${aPagarExib}</span>
    ${htmlBarraProgressoPago(r.orcNum, r.repasseNum, r.pagNum)}
  </div>`;
}

function htmlStackAPagar(r) {
  const aPagarExib = exibirMoeda(r.aPagarNum);
  return `<span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--apagar">${aPagarExib}</span>
    ${htmlBarraProgressoPago(r.orcNum, r.repasseNum, r.pagNum)}`;
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
  const pag = exibirMoeda(r.pagamento);
  const apagar = exibirMoeda(r.aPagarNum);

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
  const pagHtml = exibirMoeda(r.pagamento);

  return `<tr class="orcamento-geral-linha-popover ${tipoLinha}" tabindex="0" aria-label="detalhes da despesa">
    <td class="orcamento-geral-col-item">${itemHtml}</td>
    <td class="text-end orcamento-geral-col-num orcamento-geral-col-orcamento orcamento-tabela-desktop-col">${orcHtml}</td>
    <td class="text-end orcamento-geral-col-repasse orcamento-geral-col-repasse-parceiro orcamento-tabela-desktop-col">${repasseBadgeHtml}</td>
    <td class="text-end orcamento-geral-col-num orcamento-tabela-desktop-col">${pagHtml}</td>
    <td class="orcamento-geral-col-apagar orcamento-geral-a-pagar orcamento-tabela-desktop-col">${htmlCelulaAPagar(r)}</td>
    <td class="text-end pag-geral-col-stack-orc orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--orcamento">${orcHtml}</span>
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--repasse-parceiro">${repasseBadgeHtml}</span>
      </div>
    </td>
    <td class="text-end pag-geral-col-stack-pag orcamento-tabela-stack-col orcamento-geral-a-pagar">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        <span class="orcamento-tabela-stack-valor orcamento-tabela-stack-valor--pagamento">${pagHtml}</span>
        ${htmlStackAPagar(r)}
      </div>
    </td>
  </tr>`;
}

function renderizarTabela(linhas, kpiRepasseParceiros) {
  if (!linhas.length) {
    limparKpis();
    destruirPopoversTabela();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    return;
  }

  const totais = calcularTotais(linhas, kpiRepasseParceiros);
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
    requestAnimationFrame(() => {
      alinharColunasTabela();
    });
  });
}

function montar(valores, valoresPagLideranca) {
  const { linhas } = extrairDados(valores);
  const kpiRepasse = somarTotalRepassePlanilhaLideranca(valoresPagLideranca);
  renderizarTabela(linhas, kpiRepasse);
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
    const [valores, valoresPagLideranca] = await Promise.all([
      fetchPlanilha(),
      fetchPlanilhaPorChave(cfgPagLideranca.PLANILHA, cfgPagLideranca.ABA),
    ]);
    if (valores === null || valoresPagLideranca === null) {
      limparStatus();
      return;
    }

    montar(valores, valoresPagLideranca);
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

function plainificarRepasseParceiroNoRelatorio(table) {
  table.querySelectorAll(".orcamento-geral-repasse-badge").forEach((badge) => {
    const td = badge.closest("td");
    if (!td) return;
    td.textContent = badge.textContent.trim();
  });
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("orcamento-geral-tabela")) return;
  if (!table.querySelector(".orcamento-geral-col-apagar")) return;

  plainificarRepasseParceiroNoRelatorio(table);

  const thRepasse = table.querySelector("thead th.orcamento-geral-col-repasse");
  if (thRepasse) {
    thRepasse.className = "text-end orcamento-geral-col-repasse orcamento-tabela-desktop-col";
    thRepasse.textContent = "repasse parceiro";
  }

  const thApagar = table.querySelector("thead th.orcamento-geral-col-apagar");
  if (thApagar) {
    thApagar.className = "text-end orcamento-geral-col-apagar orcamento-tabela-desktop-col";
    thApagar.innerHTML = '<span class="orcamento-tabela-celula-direita">a pagar</span>';
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
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-apagar{display:flex;justify-content:center;width:100%;margin:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-row-apagar > .col-12{flex:0 0 40%;max-width:40%;width:40%;padding:0;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.2rem;padding:0.35rem 0.3rem;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total .dashboard-kpi-rotulo," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total .dashboard-kpi-valor," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-repasse .dashboard-kpi-rotulo," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-repasse .dashboard-kpi-valor," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-pagamento .dashboard-kpi-rotulo," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-pagamento .dashboard-kpi-valor," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-apagar .dashboard-kpi-rotulo," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-apagar .dashboard-kpi-valor{text-align:center;width:100%;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra{display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total{background:linear-gradient(155deg,#ecfdf5 0%,#bbf7d0 50%,#86efac 100%)!important;border:1px solid rgba(22,163,74,0.24)!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total .dashboard-kpi-rotulo{font-weight:700;font-size:7pt;color:#166534;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-valor-total{font-size:10pt;font-weight:800!important;line-height:1.1;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-total .orcamento-kpi-valor-total{color:#15803d;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-total{background:linear-gradient(145deg,#4ade80,#16a34a);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(22,163,74,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-total svg{width:18px;height:18px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-repasse{background:linear-gradient(155deg,#ecfdf5 0%,#bbf7d0 55%,#86efac 100%)!important;border:1px solid rgba(22,163,74,0.24)!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-repasse .dashboard-kpi-rotulo{font-weight:700;font-size:7pt;color:#166534;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-repasse .orcamento-kpi-valor-total{color:#15803d;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-repasse{background:linear-gradient(145deg,#86efac,#16a34a);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(22,163,74,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-repasse svg{width:18px;height:18px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-pagamento{background:linear-gradient(155deg,#ecfeff 0%,#cffafe 50%,#a5f3fc 100%)!important;border:1px solid rgba(8,145,178,0.22)!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-pagamento .dashboard-kpi-rotulo{font-weight:700;font-size:7pt;color:#0e7490;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-pagamento .orcamento-kpi-valor-total{color:#0891b2;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-pagamento{background:linear-gradient(145deg,#22d3ee,#0891b2);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(8,145,178,0.22);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-pagamento svg{width:18px;height:18px;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-apagar{background:linear-gradient(155deg,#fef2f2 0%,#fecaca 50%,#fca5a5 100%)!important;border:1px solid rgba(248,113,113,0.35)!important;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-apagar .dashboard-kpi-rotulo{font-weight:700;font-size:7pt;color:#b91c1c;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-card-apagar .orcamento-kpi-valor-total{color:#64748b;}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-apagar{background:linear-gradient(145deg,#f87171,#dc2626);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(248,113,113,0.28);}" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra-apagar svg{width:18px;height:18px;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-num.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-num," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-orcamento," +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-repasse.orcamento-tabela-desktop-col," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-repasse-parceiro{text-align:right;padding:0.4rem 0.5rem;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-orcamento-geral table.rel-tabela th.orcamento-geral-col-apagar," +
    ".page-orcamento-geral table.rel-tabela td.orcamento-geral-col-apagar{text-align:right!important;vertical-align:middle;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-geral-celula-apagar{display:flex;flex-direction:column;align-items:flex-end;gap:0.2rem;width:100%;}" +
    ".page-orcamento-geral table.rel-tabela .orcamento-geral-valor-apagar{display:block;width:100%;text-align:right;font-variant-numeric:tabular-nums;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-agrupada > td:first-child{border-left:4px solid #a16207;}" +
    ".page-orcamento-geral table.rel-tabela tbody tr.orcamento-geral-linha-estratificada > td:first-child{border-left:4px solid #ea580c;}" +
    "@media print{" +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .dashboard-kpi-card," +
    ".page-orcamento-geral .rel-orcamento-geral-kpis .orcamento-kpi-ilustra{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
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
    kpiRepasse: document.getElementById("kpiRepasse"),
    kpiPagamento: document.getElementById("kpiPagamento"),
    kpiAPagar: document.getElementById("kpiAPagar"),
    corpo: document.getElementById("corpoOrcamentoGeral"),
  };
  if (!el.corpo) return;

  initPageSmTabs(() => {
    alinharColunasTabela();
  });

  window.addEventListener("resize", () => {
    alinharColunasTabela();
  });

  carregarOrcamentoGeral();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initOrcamentoGeral);
