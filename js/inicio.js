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
    { base: "#1a6f85", clara: "#7ec8e3" },
  ],
  ANO_DESTAQUE: "2026",
};

let chartInicio = null;
let animBarraId = null;
let animCicloId = null;
let ultimosValoresPlanilha = null;
const fmt = new Intl.NumberFormat("pt-BR");

const FASE_DESTAQUE = {
  AGUARDANDO: "aguardando",
  OBJETIVO: "objetivo",
};

const BARRA_DURACAO_MS = 2800;
const OBJETIVO_EXIBICAO_MS = 10000;
const OBJETIVO_PISCAR_MS = 5000;

function pararAnimBarra() {
  if (animBarraId) {
    cancelAnimationFrame(animBarraId);
    animBarraId = null;
  }
}

function pararAnimCiclo() {
  if (animCicloId) {
    cancelAnimationFrame(animCicloId);
    animCicloId = null;
  }
}

function pararAnimacoesGrafico() {
  pararAnimBarra();
  pararAnimCiclo();
}

function setFaseDestaque(chart, fase) {
  if (chart?.options?.plugins) {
    chart.options.plugins.faseDestaque = fase;
  }
}

function valorFinalColuna2026(chart) {
  const idx = indiceAnoDestaque(chart);
  if (idx < 0) return 0;
  const salvo = chart.config.options.plugins?.valorDestaque2026;
  if (salvo != null) return Number(salvo) || 0;
  return Number(chart.data.datasets[0].data[idx]) || 0;
}

function animarCrescimentoColuna2026(chart, valorFinal) {
  pararAnimBarra();
  setFaseDestaque(chart, FASE_DESTAQUE.AGUARDANDO);

  const idx = indiceAnoDestaque(chart);
  if (idx < 0) return;

  const alvo = Number(valorFinal) || 0;
  if (chart.options?.plugins) {
    chart.options.plugins.valorDestaque2026 = alvo;
  }
  chart.data.datasets[0].data[idx] = 0;
  chart.update("none");

  const duracao = BARRA_DURACAO_MS;
  const t0 = performance.now();

  const passo = (agora) => {
    if (!chartInicio || chartInicio !== chart) {
      pararAnimBarra();
      return;
    }

    const t = Math.min(1, (agora - t0) / duracao);
    const ease = 1 - Math.pow(1 - t, 3);
    chart.data.datasets[0].data[idx] = alvo * ease;
    chart.update("none");

    if (t < 1) {
      animBarraId = requestAnimationFrame(passo);
      return;
    }

    animBarraId = null;
    chart.data.datasets[0].data[idx] = alvo;
    chart.update("none");
    iniciarExibicaoObjetivo(chart);
  };

  animBarraId = requestAnimationFrame(passo);
}

function iniciarExibicaoObjetivo(chart) {
  pararAnimCiclo();
  setFaseDestaque(chart, FASE_DESTAQUE.OBJETIVO);

  const t0 = performance.now();
  if (chart.options?.plugins) {
    chart.options.plugins.objetivoInicioEm = t0;
  }

  const passo = (agora) => {
    if (!chartInicio || chartInicio !== chart) {
      pararAnimCiclo();
      return;
    }

    chart.draw();

    if (agora - t0 < OBJETIVO_EXIBICAO_MS) {
      animCicloId = requestAnimationFrame(passo);
      return;
    }

    animCicloId = null;
    animarCrescimentoColuna2026(chart, valorFinalColuna2026(chart));
  };

  animCicloId = requestAnimationFrame(passo);
}

function desenharValorObjetivo2026(ctx, bar, val, tempoDesdeInicio) {
  const textoValor = fmt.format(val);
  const emoji = "🎯";
  const gapBarra = 4;
  const yValor = bar.y - gapBarra;
  const gapEmojiValor = 4;
  const alturaValor = 22;
  const fonteValor = "800 22px system-ui, -apple-system, Segoe UI, sans-serif";
  const fonteEmoji = "36px system-ui, emoji, Segoe UI Emoji, sans-serif";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const yEmoji = yValor - alturaValor - gapEmojiValor;
  ctx.font = fonteEmoji;
  ctx.fillText(emoji, bar.x, yEmoji);

  let alphaValor = 1;
  if (tempoDesdeInicio < OBJETIVO_PISCAR_MS) {
    alphaValor = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(performance.now() / 300));
  }

  ctx.font = fonteValor;
  ctx.fillStyle = "#1e293b";
  ctx.globalAlpha = alphaValor;
  ctx.fillText(textoValor, bar.x, yValor);
  ctx.restore();
}

function indiceAnoDestaque(chart) {
  const alvo = chart.config.options.plugins?.anoDestaque || INICIO.ANO_DESTAQUE;
  const labels = chart.data.labels || [];
  return labels.findIndex((l) => String(l).trim() === alvo);
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

    const fase = chart.config.options.plugins?.faseDestaque;

    barMeta.data.forEach((bar, i) => {
      if (
        i === idxDestaque &&
        (fase === FASE_DESTAQUE.AGUARDANDO || fase === FASE_DESTAQUE.OBJETIVO)
      ) {
        return;
      }
      const val = valores[i];
      if (val == null) return;
      const texto = fmt.format(val) + sufixo;
      ctx.fillText(texto, bar.x, bar.y - 10);
    });
    ctx.restore();
  },
};

const pluginDestaqueObjetivo2026 = {
  id: "destaqueObjetivo2026",
  afterDatasetsDraw(chart) {
    const fase = chart.config.options.plugins?.faseDestaque;
    if (fase !== FASE_DESTAQUE.OBJETIVO) return;

    const idx = indiceAnoDestaque(chart);
    if (idx < 0) return;

    const bar = chart.getDatasetMeta(0)?.data[idx];
    if (!bar) return;

    const val = chart.data.datasets[0].data[idx];
    if (val == null) return;

    const inicioEm = chart.config.options.plugins?.objetivoInicioEm ?? performance.now();
    const tempo = performance.now() - inicioEm;
    desenharValorObjetivo2026(chart.ctx, bar, val, tempo);
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

function montarGraficoVotos(rotulos, dados, animarColuna2026) {
  const canvas = document.getElementById("graficoInicioVotos");
  if (!canvas) return;

  pararAnimacoesGrafico();
  if (chartInicio) chartInicio.destroy();

  const maxVotos = Math.max(...dados, 0);
  const idx2026 = rotulos.findIndex((r) => r === INICIO.ANO_DESTAQUE);
  const deveAnimar = animarColuna2026 && idx2026 >= 0;
  const dadosExibidos = [...dados];
  const valorFinal2026 = idx2026 >= 0 ? dados[idx2026] : 0;

  if (deveAnimar) dadosExibidos[idx2026] = 0;

  chartInicio = new Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [
        {
          label: "Votos",
          data: dadosExibidos,
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
    plugins: [pluginValoresAcima, pluginDestaqueObjetivo2026],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: idx2026 >= 0 ? 58 : 28 } },
      animation: false,
      plugins: {
        anoDestaque: INICIO.ANO_DESTAQUE,
        faseDestaque: deveAnimar ? FASE_DESTAQUE.AGUARDANDO : null,
        valorDestaque2026: valorFinal2026,
        loopAnimacaoGrafico: deveAnimar,
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

  if (deveAnimar) {
    animarCrescimentoColuna2026(chartInicio, valorFinal2026);
  }
}

function montarGraficos(valores, animarColuna2026) {
  const { rotulos, dados } = extrairDadosVotos(valores);
  montarGraficoVotos(rotulos, dados, animarColuna2026 !== false);
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

window.addEventListener("beforeunload", pararAnimacoesGrafico);

async function carregarInicio(animarGrafico) {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.startsWith("COLE_AQUI")) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  const btn = document.getElementById("btnAtualizarInicio");
  if (btn) btn.disabled = true;

  mostrarStatus("Carregando dados...", "carregando");

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return;
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar mapa-voto.");

    const valores = json.valores || [];
    if (!valores.length) throw new Error("Planilha mapa-voto sem dados.");

    ultimosValoresPlanilha = valores;
    preencherKpis(valores);
    montarGraficos(valores, animarGrafico !== false);
    mostrarStatus("", null);
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  } finally {
    if (btn) btn.disabled = false;
    ajustarFramePai();
  }
}

function initInicio() {
  const btn = document.getElementById("btnAtualizarInicio");
  btn?.addEventListener("click", () => carregarInicio(true));
  carregarInicio(true);
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initInicio);
