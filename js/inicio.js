// Página inicial: KPIs e subdivisões (mapa-voto), gráfico de votação.

const INICIO = {
  PLANILHA: "mapa-voto",
  KPI: { municipios: { linha: 2, col: 1 }, populacao: { linha: 2, col: 2 }, eleitores: { linha: 2, col: 3 } },
  SUBDIVISOES: { linhaInicio: 3, linhaFim: 7, colNome: 0, colQtd: 1 },
  GRAFICO_COLS: [4, 5, 7],
  ANOS_GRAFICO: ["2018", "2022", "2026"],
  CORES_GRAFICO: [
    { base: "#6366f1", clara: "#a5b4fc" },
    { base: "#1f4e8c", clara: "#93c5fd" },
    { base: "#14b8a6", clara: "#5eead4" },
  ],
};

let chartInicio = null;
const fmt = new Intl.NumberFormat("pt-BR");
const fmtPct = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pluginPercentuaisEntreBarras = {
  id: "percentuaisEntreBarras",
  afterDatasetsDraw(chart) {
    const barMeta = chart.getDatasetMeta(0);
    if (!barMeta || barMeta.data.length < 2) return;

    const yScale = chart.scales.y;
    if (!yScale) return;

    const yValor = chart.config.options.plugins?.percentualEntreBarrasY ?? 7500;
    const y = yScale.getPixelForValue(yValor);
    const { ctx } = chart;
    const valores = chart.data.datasets[0].data;

    ctx.save();
    ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < barMeta.data.length - 1; i++) {
      const anterior = valores[i];
      const proximo = valores[i + 1];
      if (anterior == null || proximo == null || !anterior) continue;

      const pct = ((proximo - anterior) / anterior) * 100;
      const barA = barMeta.data[i];
      const barB = barMeta.data[i + 1];
      if (!barA || !barB) continue;

      const x = (barA.x + barB.x) / 2;
      const sinal = pct >= 0 ? "+" : "";
      const texto = sinal + fmtPct.format(pct) + "%";

      ctx.fillStyle = pct >= 0 ? "#059669" : "#dc2626";
      ctx.fillText(texto, x, y);
    }
    ctx.restore();
  },
};
const pluginValoresAcima = {
  id: "valoresAcima",
  afterDatasetsDraw(chart) {
    const barMeta = chart.getDatasetMeta(0);
    if (!barMeta || !barMeta.data.length) return;

    const { ctx, data } = chart;
    const valores = data.datasets[0].data;
    const sufixo = chart.config.options.plugins?.valoresAcimaSufixo || "";

    ctx.save();
    ctx.font = "700 13px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    barMeta.data.forEach((bar, i) => {
      const val = valores[i];
      if (val == null) return;
      let texto;
      if (sufixo === "%") {
        const sinal = val >= 0 ? "+" : "";
        texto = sinal + fmtPct.format(val) + sufixo;
      } else {
        texto = fmt.format(val);
      }
      ctx.fillText(texto, bar.x, bar.y - 10);
    });
    ctx.restore();
  },
};

function parseNumero(v) {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", INICIO.PLANILHA);
  if (CONFIG.ABA) url.searchParams.set("aba", CONFIG.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function mostrarStatus(msg, tipo) {
  const el = document.getElementById("statusInicio");
  statusPainel(el, msg, tipo);
}

function preencherKpis(valores) {
  const k = INICIO.KPI;
  document.getElementById("kpiMunicipios").textContent = fmt.format(
    parseNumero(celula(valores, k.municipios.linha, k.municipios.col))
  );
  document.getElementById("kpiPopulacao").textContent = fmt.format(
    parseNumero(celula(valores, k.populacao.linha, k.populacao.col))
  );
  document.getElementById("kpiEleitores").textContent = fmt.format(
    parseNumero(celula(valores, k.eleitores.linha, k.eleitores.col))
  );
  preencherSubdivisoesMunicipios(valores);
}

function preencherSubdivisoesMunicipios(valores) {
  const lista = document.getElementById("listaSubdivisoesMunicipios");
  if (!lista) return;

  const { linhaInicio, linhaFim, colNome, colQtd } = INICIO.SUBDIVISOES;
  const itens = [];

  for (let linha = linhaInicio; linha <= linhaFim; linha++) {
    const nome = String(celula(valores, linha, colNome) ?? "").trim();
    const qtd = parseNumero(celula(valores, linha, colQtd));
    if (!nome && qtd === 0) continue;
    itens.push({ nome: nome || "—", qtd });
  }

  lista.innerHTML = itens.length
    ? itens
        .map(
          (item, i) =>
            `<li class="home-kpi-subdivisao home-kpi-subdivisao--${i % 5}">
              <span class="home-kpi-subdivisao-nome">${escapeHtml(item.nome)}</span>
              <span class="badge rounded-pill home-kpi-subdivisao-badge">${fmt.format(item.qtd)}</span>
            </li>`
        )
        .join("")
    : '<li class="home-kpi-subdivisao home-kpi-subdivisao-vazio text-muted">Sem subdivisões</li>';
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extrairDadosVotos(valores) {
  const rotulos = [];
  const dados = [];

  INICIO.GRAFICO_COLS.forEach((col, i) => {
    const valor = parseNumero(celula(valores, 2, col));
    const ano = INICIO.ANOS_GRAFICO[i];
    if (!ano && valor === 0) return;
    rotulos.push(ano || "—");
    dados.push(valor);
  });

  return { rotulos, dados };
}

function coresBarras(ctx, chartArea, qtd) {
  const cores = INICIO.CORES_GRAFICO;
  return cores.slice(0, qtd).map((par) => {
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, par.base);
    g.addColorStop(1, par.clara);
    return g;
  });
}

function montarGraficoVotos(rotulos, dados) {
  const canvas = document.getElementById("graficoInicioVotos");
  if (!canvas) return;

  if (chartInicio) chartInicio.destroy();

  const maxVotos = Math.max(...dados, 0);

  chartInicio = new Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [
        {
          label: "Votos",
          data: dados,
          backgroundColor(context) {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) return INICIO.CORES_GRAFICO[0].base;
            const palette = coresBarras(ctx, chartArea, dados.length);
            return palette[context.dataIndex] || palette[0];
          },
          borderRadius: { topLeft: 12, topRight: 12 },
          borderSkipped: false,
        },
      ],
    },
    plugins: [pluginValoresAcima, pluginPercentuaisEntreBarras],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 28 } },
      plugins: {
        valoresAcimaSufixo: "",
        percentualEntreBarrasY: 7500,
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items) => (items[0] ? "Ano " + items[0].label : ""),
            label: (c) => fmt.format(c.parsed.y) + " votos",
          },
        },
      },
      datasets: {
        bar: {
          maxBarThickness: 120,
          categoryPercentage: 0.48,
          barPercentage: 0.98,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#334155",
            font: { size: 13, weight: "600" },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(maxVotos * 1.08, 10000),
          grace: "8%",
          grid: { color: "rgba(148, 163, 184, 0.25)" },
          ticks: {
            color: "#94a3b8",
            callback: (v) => fmt.format(v),
            stepSize: 5000,
          },
        },
      },
    },
  });
}

function montarGraficos(valores) {
  const { rotulos, dados } = extrairDadosVotos(valores);
  montarGraficoVotos(rotulos, dados);
}

function ajustarFramePai() {
  if (window.parent && window.parent.ajustarAlturaFrame) {
    setTimeout(() => window.parent.ajustarAlturaFrame(), 150);
  }
  if (chartInicio) {
    setTimeout(() => chartInicio.resize(), 180);
  }
}

window.addEventListener("resize", () => {
  if (chartInicio) chartInicio.resize();
});

async function carregarInicio() {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.startsWith("COLE_AQUI")) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return;
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar mapa-voto.");

    const valores = json.valores || [];
    if (!valores.length) throw new Error("Planilha mapa-voto sem dados.");

    preencherKpis(valores);
    montarGraficos(valores);
    mostrarStatus("", null);
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  } finally {
    ajustarFramePai();
  }
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", carregarInicio);
