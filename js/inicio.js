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
  ANO_DESTAQUE: "2026",
};

let chartInicio = null;
let animTrofeuId = null;
const fmt = new Intl.NumberFormat("pt-BR");

function pararAnimTrofeu() {
  if (animTrofeuId) {
    cancelAnimationFrame(animTrofeuId);
    animTrofeuId = null;
  }
}

function iniciarAnimTrofeu(chart) {
  pararAnimTrofeu();
  if (indiceAnoDestaque(chart) < 0) return;

  const loop = () => {
    if (!chartInicio || chartInicio !== chart) {
      pararAnimTrofeu();
      return;
    }
    chart.draw();
    animTrofeuId = requestAnimationFrame(loop);
  };
  animTrofeuId = requestAnimationFrame(loop);
}

function indiceAnoDestaque(chart) {
  const alvo = chart.config.options.plugins?.anoDestaque || INICIO.ANO_DESTAQUE;
  const labels = chart.data.labels || [];
  return labels.findIndex((l) => String(l).trim() === alvo);
}

function desenharRetanguloArredondado(ctx, x, y, w, h, r) {
  const raio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.lineTo(x + w - raio, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + raio);
  ctx.lineTo(x + w, y + h - raio);
  ctx.quadraticCurveTo(x + w, y + h, x + w - raio, y + h);
  ctx.lineTo(x + raio, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - raio);
  ctx.lineTo(x, y + raio);
  ctx.quadraticCurveTo(x, y, x + raio, y);
  ctx.closePath();
}

const pluginValoresAcima = {
  id: "valoresAcima",
  afterDatasetsDraw(chart) {
    const barMeta = chart.getDatasetMeta(0);
    if (!barMeta || !barMeta.data.length) return;

    const idxDestaque = indiceAnoDestaque(chart);
    const { ctx, data } = chart;
    const valores = data.datasets[0].data;
    const sufixo = chart.config.options.plugins?.valoresAcimaSufixo || "";

    ctx.save();
    ctx.font = "700 13px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    barMeta.data.forEach((bar, i) => {
      if (i === idxDestaque) return;
      const val = valores[i];
      if (val == null) return;
      const texto = fmt.format(val) + sufixo;
      ctx.fillText(texto, bar.x, bar.y - 10);
    });
    ctx.restore();
  },
};

const pluginDestaqueVitoria2026 = {
  id: "destaqueVitoria2026",
  afterDatasetsDraw(chart) {
    const idx = indiceAnoDestaque(chart);
    if (idx < 0) return;

    const barMeta = chart.getDatasetMeta(0);
    const bar = barMeta?.data[idx];
    if (!bar) return;

    const val = chart.data.datasets[0].data[idx];
    if (val == null) return;

    const { ctx } = chart;
    const textoValor = fmt.format(val);
    const trofeu = "🏆";
    const xCentro = bar.x;

    const padX = 10;
    const badgeAltura = 22;
    const gapBarra = 10;
    const alturaBarra = bar.height || 0;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const blink = 0.5 + 0.5 * Math.sin(performance.now() / 380);
    const yTrofeu = bar.y + alturaBarra * 0.3;
    ctx.font = "36px system-ui, emoji, Segoe UI Emoji, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(15, 118, 110, 0.5)";
    ctx.shadowBlur = 6;
    ctx.globalAlpha = blink;
    ctx.fillText(trofeu, xCentro, yTrofeu);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
    const valorLargura = ctx.measureText(textoValor).width;
    const badgeLargura = valorLargura + padX * 2;
    const yBadge = bar.y - gapBarra - badgeAltura;

    ctx.fillStyle = "rgba(94, 234, 212, 0.5)";
    desenharRetanguloArredondado(
      ctx,
      xCentro - badgeLargura / 2,
      yBadge,
      badgeLargura,
      badgeAltura,
      10
    );
    ctx.fill();

    ctx.fillStyle = "#0f766e";
    ctx.fillText(textoValor, xCentro, yBadge + badgeAltura / 2);
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

  pararAnimTrofeu();
  if (chartInicio) chartInicio.destroy();

  const maxVotos = Math.max(...dados, 0);
  const idx2026 = rotulos.findIndex((r) => r === INICIO.ANO_DESTAQUE);

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
    plugins: [pluginValoresAcima, pluginDestaqueVitoria2026],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: idx2026 >= 0 ? 40 : 28 } },
      plugins: {
        anoDestaque: INICIO.ANO_DESTAQUE,
        valoresAcimaSufixo: "",
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

  if (idx2026 >= 0) iniciarAnimTrofeu(chartInicio);
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

window.addEventListener("beforeunload", pararAnimTrofeu);

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
