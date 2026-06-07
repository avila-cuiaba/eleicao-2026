// Página orçamento geral: planilha orcamento-geral (item, orçamento, pagamento).

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
  };

  Object.entries(cfg.CAMPOS || {}).forEach(([prop, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx !== -1) {
      if (prop === "ITEM") indices.item = idx;
      if (prop === "ORCAMENTO") indices.orcamento = idx;
      if (prop === "PAGAMENTO") indices.pagamento = idx;
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
    const valorB = valorCampo(linha, indices.valorB);

    if (!item && !celulaPreenchida(orcamento) && !celulaPreenchida(pagamento) && !celulaPreenchida(valorB)) {
      continue;
    }
    if (!item) continue;

    const orcNum = parseNumero(orcamento);
    const pagNum = parseNumero(pagamento);

    linhas.push({
      linha1,
      item,
      valorB,
      orcamento,
      pagamento,
      orcNum,
      pagNum,
      aPagar: orcNum - pagNum,
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
    grafico: {
      agrupadas: { orcamento: somaC(agrupadas), pagamento: somaH(agrupadas) },
      estratificadas: { orcamento: somaC(estratificadas), pagamento: somaH(estratificadas) },
    },
  };
}

function atualizarKpis(totais) {
  el.kpiAgrupadas.textContent = fmtMoeda.format(totais.kpiAgrupadas);
  el.kpiEstratificadas.textContent = fmtMoeda.format(totais.kpiEstratificadas);
}

function limparKpis() {
  const vazio = "—";
  el.kpiAgrupadas.textContent = vazio;
  el.kpiEstratificadas.textContent = vazio;
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

function renderizarLinha(r) {
  const tipoLinha = r.estratificada
    ? "orcamento-geral-linha-estratificada"
    : "orcamento-geral-linha-agrupada";

  const itemHtml = `<span class="orcamento-geral-col-item-inner">${exibirTexto(r.item)}</span>`;

  return `<tr class="${tipoLinha}">
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

function initOrcamentoGeral() {
  el = {
    status: document.getElementById("status"),
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
