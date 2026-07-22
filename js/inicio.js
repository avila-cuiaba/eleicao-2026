// Página inicial: KPIs e subdivisões (mapa-voto), gráfico de votação.

const INICIO = {
  PLANILHA: "mapa-voto",
  KPI: {
    populacao: { linha: 2, col: 2 },
    eleitores: { linha: 2, col: 3 },
  },
  SUBDIVISOES: { linhaInicio: 3, linhaFim: 7, colNome: 0, colQtd: 1 },
  GRAFICO_COLS: [4, 5, 7],
  ANOS_GRAFICO: ["2018", "2022", "2026"],
  CORES_GRAFICO: [
    { base: "#6366f1", clara: "#a5b4fc" },
    { base: "#1f4e8c", clara: "#93c5fd" },
    { base: "#1a6f85", clara: "#7ec8e3" },
  ],
  ANO_DESTAQUE: "2026",
  CORES_REGIAO: ["#f97316", "#3b82f6", "#14b8a6", "#a855f7", "#e11d48"],
  META_PIZZA: {
    OPACIDADE: 0.52,
    RAIO: ["32%", "80%"],
    COR_VALOR: "#334155",
  },
};

let chartInicio = null;
let chartMetaRegioes = null;
let animBarraId = null;
let animCicloId = null;
let ultimosValoresPlanilha = null;
const popoverTabela = PopoverTabela.criar();
const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FASE_DESTAQUE = {
  AGUARDANDO: "aguardando",
  OBJETIVO: "objetivo",
  FIXO: "fixo",
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

function destruirGraficosMeta() {
  if (chartMetaRegioes) {
    chartMetaRegioes.dispose();
    chartMetaRegioes = null;
  }
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
    finalizarAnimacaoObjetivo(chart);
  };

  animCicloId = requestAnimationFrame(passo);
}

function finalizarAnimacaoObjetivo(chart) {
  pararAnimCiclo();
  setFaseDestaque(chart, FASE_DESTAQUE.FIXO);
  chart.update();
}

function alphaPiscarObjetivo(tempoDesdeInicio) {
  if (tempoDesdeInicio < OBJETIVO_PISCAR_MS) {
    return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(performance.now() / 300));
  }
  return 1;
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

  ctx.font = fonteValor;
  ctx.fillStyle = "#1e293b";
  ctx.globalAlpha = alphaPiscarObjetivo(tempoDesdeInicio);
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
        (fase === FASE_DESTAQUE.AGUARDANDO ||
          fase === FASE_DESTAQUE.OBJETIVO ||
          fase === FASE_DESTAQUE.FIXO)
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

function percentualCrescimento(anterior, atual) {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

function formatarPercentualCrescimento(pct) {
  if (pct == null || !Number.isFinite(pct)) return "";
  const sinal = pct > 0 ? "+" : "";
  return sinal + pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function desenharPercentualCrescimento(ctx, x, y, pct, alpha = 1) {
  ctx.save();
  ctx.font = "700 14px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = pct >= 0 ? "#15803d" : "#b91c1c";
  ctx.globalAlpha = alpha;
  ctx.fillText(formatarPercentualCrescimento(pct), x, y);
  ctx.restore();
}

const pluginCrescimentoBarras = {
  id: "crescimentoBarras",
  afterDatasetsDraw(chart) {
    const barMeta = chart.getDatasetMeta(0);
    const yScale = chart.scales.y;
    if (!barMeta?.data || barMeta.data.length < 2 || !yScale?.ticks?.length) return;

    const ticks = yScale.ticks;
    if (ticks.length < 2) return;
    const yLinha = yScale.getPixelForValue(ticks[1].value);
    const yPct = yLinha - 7;

    const valoresFinais = chart.config.options.plugins?.valoresFinaisVotos || chart.data.datasets[0].data;
    const idxDestaque = indiceAnoDestaque(chart);
    const fase = chart.config.options.plugins?.faseDestaque;
    const loopAnimacao = chart.config.options.plugins?.loopAnimacaoGrafico;
    const ctx = chart.ctx;

    for (let i = 0; i < barMeta.data.length - 1; i++) {
      const barA = barMeta.data[i];
      const barB = barMeta.data[i + 1];
      if (!barA || !barB) continue;

      const pct = percentualCrescimento(valoresFinais[i], valoresFinais[i + 1]);
      if (pct == null) continue;

      const x = (barA.x + barB.x) / 2;
      const isPar2022a2026 = idxDestaque >= 1 && i === idxDestaque - 1;

      if (isPar2022a2026 && loopAnimacao) {
        if (fase === FASE_DESTAQUE.AGUARDANDO) continue;
        if (fase === FASE_DESTAQUE.OBJETIVO) {
          const inicioEm = chart.config.options.plugins?.objetivoInicioEm ?? performance.now();
          const alpha = alphaPiscarObjetivo(performance.now() - inicioEm);
          desenharPercentualCrescimento(ctx, x, yPct, pct, alpha);
          continue;
        }
      }

      desenharPercentualCrescimento(ctx, x, yPct, pct);
    }
  },
};

const pluginDestaqueObjetivo2026 = {
  id: "destaqueObjetivo2026",
  afterDatasetsDraw(chart) {
    const fase = chart.config.options.plugins?.faseDestaque;
    if (fase !== FASE_DESTAQUE.OBJETIVO && fase !== FASE_DESTAQUE.FIXO) return;

    const idx = indiceAnoDestaque(chart);
    if (idx < 0) return;

    const bar = chart.getDatasetMeta(0)?.data[idx];
    if (!bar) return;

    const val = chart.data.datasets[0].data[idx];
    if (val == null) return;

    const tempo =
      fase === FASE_DESTAQUE.FIXO
        ? OBJETIVO_PISCAR_MS
        : performance.now() - (chart.config.options.plugins?.objetivoInicioEm ?? performance.now());
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
  document.getElementById("kpiPopulacao").textContent = fmt.format(
    parseNumero(celula(valores, k.populacao.linha, k.populacao.col))
  );
  document.getElementById("kpiEleitores").textContent = fmt.format(
    parseNumero(celula(valores, k.eleitores.linha, k.eleitores.col))
  );
}

function textoPreenchidoPessoal(v) {
  return String(v ?? "").trim() !== "";
}

function valorApoiadoresPessoal(val) {
  const n = parseNumero(val);
  if (n > 0) return n;
  return textoPreenchidoPessoal(val) ? 1 : 0;
}

function normalizarMunicipioPessoal(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function contagemApoiadoresInicio(valores) {
  const mapa = new Map();
  const cfgP = CONFIG.PESSOAL;
  if (!valores?.length) return mapa;

  const colMun = cfgP.APOIADORES.COLUNAS.MUNICIPIO;
  for (let linha = cfgP.APOIADORES.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, colMun) ?? "").trim();
    if (!municipio) continue;
    const chave = normalizarMunicipioPessoal(municipio);
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }
  return mapa;
}

function totalColunaEquipe(itens, campo) {
  return itens.reduce((acc, r) => {
    const raw = r[campo];
    const n = parseNumero(raw);
    if (n > 0) return acc + n;
    if (textoPreenchidoPessoal(raw)) return acc + 1;
    return acc;
  }, 0);
}

function extrairEquipePorMunicipio(valoresMunicipio, contagemApoiadores) {
  const cfgP = CONFIG.PESSOAL;
  const cols = cfgP.COLUNAS;
  const itens = [];

  for (let linha = cfgP.LINHA_INICIO_DADOS; linha <= valoresMunicipio.length; linha++) {
    const municipio = String(celula(valoresMunicipio, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const municipioNorm = normalizarMunicipioPessoal(municipio);
    let apoiadores = valorApoiadoresPessoal(celula(valoresMunicipio, linha, cols.APOIADORES));
    if (!apoiadores && contagemApoiadores.has(municipioNorm)) {
      apoiadores = contagemApoiadores.get(municipioNorm);
    }

    itens.push({
      prefeito: celula(valoresMunicipio, linha, cols.PREFEITO),
      vereador: celula(valoresMunicipio, linha, cols.VEREADOR),
      agentePolitico: celula(valoresMunicipio, linha, cols.AGENTE_POLITICO),
      assessor: celula(valoresMunicipio, linha, cols.ASSESSOR),
      apoiadores,
    });
  }

  return itens;
}

function totalEquipeCampanha(valoresMunicipio, valoresApoiadores) {
  const contagem = contagemApoiadoresInicio(valoresApoiadores || []);
  const itens = extrairEquipePorMunicipio(valoresMunicipio, contagem);

  return (
    totalColunaEquipe(itens, "prefeito") +
    totalColunaEquipe(itens, "vereador") +
    totalColunaEquipe(itens, "agentePolitico") +
    totalColunaEquipe(itens, "assessor") +
    itens.reduce((acc, r) => acc + r.apoiadores, 0)
  );
}

function urlConsultaPlanilha(planilha) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  if (CONFIG.ABA) url.searchParams.set("aba", CONFIG.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function fetchPlanilhaInicio(planilha) {
  const resp = await fetch(urlConsultaPlanilha(planilha), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

function preencherKpiEquipe(valoresMunicipio, valoresApoiadores) {
  const elKpi = document.getElementById("kpiEquipe");
  if (!elKpi) return;

  if (!valoresMunicipio?.length) {
    elKpi.textContent = "—";
    return;
  }

  elKpi.textContent = fmt.format(totalEquipeCampanha(valoresMunicipio, valoresApoiadores));
}

function indicesOrcamentoGeral(cabecalho) {
  const cfg = CONFIG.ORCAMENTO_GERAL;
  const cols = cfg.COLUNAS;
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const indices = {
    orcamento: cols.ORCAMENTO,
  };

  Object.entries(cfg.CAMPOS || {}).forEach(([prop, campo]) => {
    const idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx !== -1 && prop === "ORCAMENTO") indices.orcamento = idx;
  });

  return indices;
}

function totalOrcamentoGeral(valores) {
  const cfg = CONFIG.ORCAMENTO_GERAL;
  if (!valores?.length) return 0;

  const cabecalho = valores[cfg.LINHA_CABECALHO - 1] || valores[0];
  const indices = indicesOrcamentoGeral(cabecalho);
  const linhasEstrat = cfg.LINHAS_ESTRATIFICADAS || [];

  let estratificadas = 0;
  linhasEstrat.forEach((linha1) => {
    const linha = valores[linha1 - 1];
    if (linha) estratificadas += parseNumero(linha[indices.orcamento]);
  });

  let agrupadas = 0;
  for (let linha1 = cfg.LINHA_INICIO_DADOS; linha1 <= valores.length; linha1++) {
    if (linhasEstrat.includes(linha1)) continue;
    const linha = valores[linha1 - 1];
    if (!linha) continue;
    agrupadas += parseNumero(linha[indices.orcamento]);
  }

  return agrupadas + estratificadas;
}

function preencherKpiOrcamento(valoresOrcamentoGeral) {
  const elKpi = document.getElementById("kpiOrcamento");
  if (!elKpi) return;

  if (!valoresOrcamentoGeral?.length) {
    elKpi.textContent = "—";
    return;
  }

  elKpi.textContent = fmtMoeda.format(totalOrcamentoGeral(valoresOrcamentoGeral));
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizarChave(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function colsVisiveisTabela() {
  return window.matchMedia("(min-width: 992px)").matches ? 8 : 4;
}

function indiceCorRegiao(regiaoNorm) {
  const ordem = CONFIG.DASHBOARD?.ORDEM_REGIOES || [];
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function lerLinhaRegiao(valores, linha1) {
  const cols = CONFIG.REGISTROS.COLUNAS;
  return {
    regiao: String(celula(valores, linha1, cols.REGIAO) ?? "").trim(),
    municipios: parseNumero(celula(valores, linha1, cols.MUNICIPIOS)),
    habitantes: parseNumero(celula(valores, linha1, cols.HABITANTES)),
    eleitores: parseNumero(celula(valores, linha1, cols.ELEITORES)),
    votos2018: parseNumero(celula(valores, linha1, cols.VOTOS_2018)),
    votos2022: parseNumero(celula(valores, linha1, cols.VOTOS_2022)),
    minima: parseNumero(celula(valores, linha1, cols.MINIMA)),
    ideal: parseNumero(celula(valores, linha1, cols.IDEAL)),
  };
}

function extrairLinhasRegiao(valores) {
  const tab = CONFIG.REGISTROS.TABELA;
  const itens = [];

  for (let linha = tab.dataInicio; linha <= tab.dataFim; linha++) {
    const item = lerLinhaRegiao(valores, linha);
    if (!item.regiao) continue;
    if (normalizarChave(item.regiao) === "regiao") continue;
    itens.push({
      ...item,
      regiaoNorm: normalizarChave(item.regiao),
    });
  }

  return itens;
}

function htmlPopoverRegiao(r) {
  return PopoverTabela.corpo(
    escapeHtml(r.regiao),
    [
      PopoverTabela.item("municípios", fmt.format(r.municipios)),
      PopoverTabela.item("habitantes", fmt.format(r.habitantes)),
      PopoverTabela.item("eleitores", fmt.format(r.eleitores)),
      PopoverTabela.item("votos 2018", fmt.format(r.votos2018)),
      PopoverTabela.item("votos 2022", fmt.format(r.votos2022)),
      PopoverTabela.item(
        "votação mínima",
        fmt.format(r.minima),
        "popover-marcador--registros-minima"
      ),
      PopoverTabela.item(
        "meta votação",
        fmt.format(r.ideal),
        "popover-marcador--registros-ideal"
      ),
    ].join("")
  );
}

function renderizarCelulasRegiao(r, opts) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const mun = fmt.format(r.municipios);
  const hab = fmt.format(r.habitantes);
  const eleit = fmt.format(r.eleitores);
  const v18 = fmt.format(r.votos2018);
  const v22 = fmt.format(r.votos2022);
  const min = fmt.format(r.minima);
  const ideal = fmt.format(r.ideal);
  const rotuloRegiao = escapeHtml(r.regiao);

  const celulaRegiao = opts?.total
    ? `<span class="registros-regiao-stack registros-only-mobile"><span class="registros-regiao-mun">${mun}</span></span>`
    : `<span class="registros-regiao-celula">
         <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
         <span class="registros-regiao-stack">
           <span class="registros-regiao-nome">${rotuloRegiao}</span>
           <span class="registros-regiao-mun registros-only-mobile">${mun}</span>
         </span>
       </span>`;

  return `
    <td class="registros-col-regiao">
      ${celulaRegiao}
    </td>
    <td class="text-end registros-col-grupo-demografia registros-only-mobile">
      <span class="registros-celula-stack registros-celula-stack-end">
        <span class="registros-stack-linha">${hab}</span>
        <span class="registros-stack-linha">${eleit}</span>
      </span>
    </td>
    <td class="text-end registros-col-municipios registros-only-desktop">${mun}</td>
    <td class="text-end registros-col-habitantes registros-only-desktop">${hab}</td>
    <td class="text-end registros-col-eleitores registros-only-desktop">${eleit}</td>
    <td class="text-end registros-col-grupo-votos registros-only-mobile">
      <span class="registros-celula-stack registros-celula-stack-end">
        <span class="registros-stack-linha">${v18}</span>
        <span class="registros-stack-linha">${v22}</span>
      </span>
    </td>
    <td class="text-end registros-col-v2018 registros-only-desktop">${v18}</td>
    <td class="text-end registros-col-v2022 registros-only-desktop">${v22}</td>
    <td class="text-end registros-col-grupo-meta registros-only-mobile">
      <span class="registros-celula-stack registros-celula-stack-end">
        <span class="registros-stack-linha registros-val-minima">${min}</span>
        <span class="registros-stack-linha registros-val-ideal">${ideal}</span>
      </span>
    </td>
    <td class="text-end registros-col-minima registros-only-desktop">${min}</td>
    <td class="text-end registros-col-ideal registros-only-desktop">${ideal}</td>`;
}

function renderizarTotalRegiao(valores) {
  const total = lerLinhaRegiao(valores, CONFIG.REGISTROS.TABELA.totalRow);
  total.regiaoNorm = "total";
  return `<tr class="registros-linha-total">${renderizarCelulasRegiao(total, { total: true })}</tr>`;
}

function montarTabelaRegiao(valores) {
  const corpo = document.getElementById("corpoTabela");
  const rodape = document.getElementById("rodapeTabela");
  const vazio = document.getElementById("vazioTabelaRegiao");
  if (!corpo) return;

  const linhas = extrairLinhasRegiao(valores);
  if (vazio) vazio.hidden = true;

  if (!linhas.length) {
    popoverTabela.destruir();
    corpo.innerHTML =
      `<tr><td colspan="${colsVisiveisTabela()}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    if (rodape) rodape.innerHTML = "";
    notificarAlturaFrame();
    return;
  }

  corpo.innerHTML = linhas
    .map(
      (r) =>
        `<tr class="registros-linha-popover" tabindex="0" aria-label="detalhes da região">${renderizarCelulasRegiao(r)}</tr>`
    )
    .join("");
  popoverTabela.inicializar({
    corpo,
    seletorLinha: "tr.registros-linha-popover",
    linhas,
    htmlConteudo: htmlPopoverRegiao,
  });
  if (rodape) rodape.innerHTML = renderizarTotalRegiao(valores);
  notificarAlturaFrame();
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
    plugins: [pluginValoresAcima, pluginCrescimentoBarras, pluginDestaqueObjetivo2026],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: idx2026 >= 0 ? 58 : 28 } },
      animation: false,
      interaction: { mode: null },
      plugins: {
        anoDestaque: INICIO.ANO_DESTAQUE,
        faseDestaque: deveAnimar ? FASE_DESTAQUE.AGUARDANDO : null,
        valorDestaque2026: valorFinal2026,
        valoresFinaisVotos: dados,
        loopAnimacaoGrafico: deveAnimar,
        valoresAcimaSufixo: "",
        legend: { display: false },
        tooltip: { enabled: false },
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

function mapaMetaPorRegiao(valores) {
  const mapa = new Map();
  extrairLinhasRegiao(valores).forEach((r) => {
    mapa.set(r.regiaoNorm, { rotulo: r.regiao, ideal: r.ideal });
  });
  return mapa;
}

function corRegiaoComOpacidade(hex, alpha) {
  const h = String(hex).replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isRegiaoMt(norm, rotulo) {
  if (norm === "mt") return true;
  const t = normalizarChave(rotulo);
  return t === "mt" || t === "mato grosso";
}

function dadosGraficoMetaRegioes(valores) {
  const mapa = mapaMetaPorRegiao(valores);
  const ordem = CONFIG.DASHBOARD?.ORDEM_REGIOES || [];
  const rotulos = [];
  const dados = [];
  const cores = [];
  const coresBase = [];
  const normas = [];

  ordem.forEach((norm, i) => {
    const item = mapa.get(norm);
    if (!item) return;
    const cor = INICIO.CORES_REGIAO[i % INICIO.CORES_REGIAO.length];
    rotulos.push(item.rotulo || norm);
    dados.push(item.ideal);
    coresBase.push(cor);
    cores.push(corRegiaoComOpacidade(cor, INICIO.META_PIZZA.OPACIDADE));
    normas.push(norm);
  });

  return { rotulos, dados, cores, coresBase, normas };
}

function preencherLegendaMetaRegioes(dados) {
  const el = document.getElementById("legendaMetaRegioes");
  if (!el) return;

  if (!dados.rotulos.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = dados.rotulos
    .map(
      (rotulo, i) => `
    <li class="home-meta-pizza-legenda-item">
      <span class="home-meta-pizza-legenda-cor" style="background:${escapeHtml(dados.cores[i])}"></span>
      <span class="home-meta-pizza-legenda-texto">${escapeHtml(rotulo)}</span>
    </li>`
    )
    .join("");
}

function opcoesGraficoMetaEcharts(dados) {
  const seriesData = dados.rotulos.map((nome, i) => {
    const valor = dados.dados[i];
    const mt = isRegiaoMt(dados.normas[i], nome);
    const corFatia = dados.cores[i];

    return {
      name: nome,
      value: valor,
      itemStyle: {
        color: corFatia,
        borderRadius: 8,
        borderColor: "#ffffff",
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: "rgba(15, 23, 42, 0.14)",
        shadowOffsetY: 2,
      },
      label: {
        show: valor != null,
        position: mt ? "outside" : "inside",
        formatter: () => fmt.format(valor),
        color: INICIO.META_PIZZA.COR_VALOR,
        fontWeight: 700,
        fontSize: mt ? 10 : 11,
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      },
      labelLine: mt
        ? {
            show: true,
            length: 10,
            length2: 14,
            lineStyle: { color: corFatia, width: 1.5 },
          }
        : { show: false },
    };
  });

  return {
    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: { show: false },
    series: [
      {
        type: "pie",
        radius: INICIO.META_PIZZA.RAIO,
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        minAngle: 4,
        padAngle: 2,
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 16,
            shadowColor: "rgba(15, 23, 42, 0.2)",
          },
        },
        data: seriesData,
      },
    ],
  };
}

function montarGraficoMetaRegioes(dados) {
  const el = document.getElementById("graficoMetaRegioes");
  if (!el || typeof echarts === "undefined") return null;

  if (chartMetaRegioes) {
    chartMetaRegioes.dispose();
    chartMetaRegioes = null;
  }

  const total = dados.dados.reduce((a, b) => a + b, 0);
  preencherLegendaMetaRegioes(dados);
  chartMetaRegioes = echarts.init(el, null, { renderer: "canvas" });

  if (!total) {
    preencherLegendaMetaRegioes({ rotulos: [], coresBase: [] });
    chartMetaRegioes.setOption({
      animation: false,
      tooltip: { show: false },
      series: [
        {
          type: "pie",
          radius: INICIO.META_PIZZA.RAIO,
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          data: [{ value: 1, name: "sem dados", itemStyle: { color: "#e2e8f0", borderWidth: 0 } }],
        },
      ],
    });
    return chartMetaRegioes;
  }

  chartMetaRegioes.setOption(opcoesGraficoMetaEcharts(dados));
  return chartMetaRegioes;
}

function montarGraficosMeta(valores) {
  destruirGraficosMeta();
  montarGraficoMetaRegioes(dadosGraficoMetaRegioes(valores));
}

function ajustarFramePai() {
  if (window.parent && window.parent.ajustarAlturaFrame) {
    setTimeout(() => window.parent.ajustarAlturaFrame(), 150);
  }
  if (chartInicio) {
    setTimeout(() => chartInicio.resize(), 180);
  }
  if (chartMetaRegioes) setTimeout(() => chartMetaRegioes.resize(), 200);
}

window.addEventListener("resize", () => {
  if (chartInicio) chartInicio.resize();
  if (chartMetaRegioes) chartMetaRegioes.resize();
});

window.addEventListener("beforeunload", () => {
  pararAnimacoesGrafico();
  destruirGraficosMeta();
});

async function carregarInicio(animarGrafico) {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.startsWith("COLE_AQUI")) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");

  try {
    const cfgP = CONFIG.PESSOAL;
    const [jsonMapa, valoresPessoal, valoresApoiadores, valoresOrcamentoGeral] = await Promise.all([
      fetch(urlConsulta(), { method: "GET" }).then((r) => r.json()),
      fetchPlanilhaInicio(cfgP.PLANILHA).catch(() => []),
      fetchPlanilhaInicio(cfgP.PLANILHA_APOIADORES).catch(() => []),
      fetchPlanilhaInicio(CONFIG.ORCAMENTO_GERAL.PLANILHA).catch(() => []),
    ]);

    if (!AUTH.tratarResposta(jsonMapa)) return;
    if (!jsonMapa.ok) throw new Error(jsonMapa.erro || "Falha ao consultar mapa-voto.");

    const valores = jsonMapa.valores || [];
    if (!valores.length) throw new Error("Planilha mapa-voto sem dados.");

    ultimosValoresPlanilha = valores;
    preencherKpis(valores);
    preencherKpiEquipe(valoresPessoal, valoresApoiadores);
    preencherKpiOrcamento(valoresOrcamentoGeral);
    montarGraficos(valores, animarGrafico !== false);
    montarGraficosMeta(valores);
    montarTabelaRegiao(valores);
    mostrarStatus("", null);
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    popoverTabela.destruir();
    const corpo = document.getElementById("corpoTabela");
    if (corpo) {
      corpo.innerHTML =
        `<tr><td colspan="${colsVisiveisTabela()}" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>`;
      const rodape = document.getElementById("rodapeTabela");
      if (rodape) rodape.innerHTML = "";
    }
  } finally {
    ajustarFramePai();
  }
}

window.atualizarPagina = () => carregarInicio(true);

function htmlCardsRelatorioPagina(doc) {
  const grid = doc.querySelector(".home-kpi-col-dir");
  if (!grid) return "";

  const clone = grid.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  aplicarCoresSvgCardsRelatorio(clone);

  return (
    '<section class="rel-secao"><h2>indicadores</h2>' +
    '<div class="rel-inicio-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function aplicarCoresSvgCardsRelatorio(root) {
  const mapa = [
    [".home-kpi-ilustra-populacao svg", "#ffffff"],
    [".home-kpi-ilustra-eleitores svg", "#ffffff"],
    [".home-kpi-ilustra-equipe svg", "#ffffff"],
    [".home-kpi-ilustra-orcamento svg", "#ffffff"],
  ];
  mapa.forEach(([sel, cor]) => {
    root.querySelectorAll(sel).forEach((svg) => {
      svg.setAttribute("stroke", cor);
      svg.querySelectorAll("[fill='currentColor']").forEach((el) => el.setAttribute("fill", cor));
    });
  });
}

function prepararGraficosRelatorio() {
  pararAnimacoesGrafico();
  if (!chartInicio) return;
  const idx = indiceAnoDestaque(chartInicio);
  const val = valorFinalColuna2026(chartInicio);
  if (chartInicio.data?.datasets?.[0]?.data) {
    chartInicio.data.datasets[0].data[idx] = val;
  }
  setFaseDestaque(chartInicio, FASE_DESTAQUE.FIXO);
  chartInicio.update("none");
}

function imagemGraficoVotacao() {
  if (!chartInicio) return "";
  try {
    const origem = chartInicio.canvas;
    if (!origem) return "";

    const largura = origem.width || origem.clientWidth;
    const altura = origem.height || origem.clientHeight;
    if (!largura || !altura) {
      return typeof chartInicio.toBase64Image === "function"
        ? chartInicio.toBase64Image("image/png", 1)
        : "";
    }

    const destino = document.createElement("canvas");
    destino.width = largura;
    destino.height = altura;
    const ctx = destino.getContext("2d");
    const gradiente = ctx.createLinearGradient(0, 0, largura, altura);
    gradiente.addColorStop(0, "#dbeafe");
    gradiente.addColorStop(0.48, "#e0e7ff");
    gradiente.addColorStop(1, "#a5f3fc");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(origem, 0, 0, largura, altura);
    return destino.toDataURL("image/png", 1);
  } catch (e) {
    if (typeof chartInicio.toBase64Image === "function") {
      return chartInicio.toBase64Image("image/png", 1);
    }
    return "";
  }
}

function conteudoExtraRelatorioPagina() {
  prepararGraficosRelatorio();

  const imgVotos = imagemGraficoVotacao();
  if (!imgVotos) return "";

  return (
    '<section class="rel-secao rel-secao-inicio-graficos"><h2>gráficos</h2>' +
    '<div class="rel-graficos rel-graficos--inicio">' +
    '<div class="rel-grafico-bloco rel-grafico-bloco--votacao home-votacao-card rel-home-votacao-card">' +
    '<div class="home-kpi-titulo home-votacao-titulo">votação</div>' +
    '<img class="rel-grafico-img" src="' +
    imgVotos +
    '" alt="gráfico de votação" />' +
    "</div></div></section>"
  );
}

function estilosRelatorioPagina() {
  return (
    ".page-inicio .rel-inicio-kpis{margin-top:0.35rem;}" +
    ".page-inicio .home-kpi-col-dir{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:auto;gap:6px;max-width:none;}" +
    ".page-inicio .home-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;}" +
    ".page-inicio .home-kpi-card .card-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.25rem;padding:0.4rem 0.25rem;}" +
    ".page-inicio .home-kpi-titulo{font-size:7.5pt;font-weight:600;letter-spacing:0.01em;line-height:1.15;}" +
    ".page-inicio .home-kpi-ilustra{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;}" +
    ".page-inicio .home-kpi-ilustra svg{width:18px;height:18px;}" +
    ".page-inicio .home-kpi-valor{font-size:9.5pt;font-weight:700;line-height:1.1;}" +
    ".page-inicio .home-kpi-card-populacao{background-color:#dbeafe;background-image:linear-gradient(155deg,#eff6ff 0%,#dbeafe 50%,#bfdbfe 100%);border:1px solid rgba(37,99,235,0.16);box-shadow:0 2px 8px rgba(37,99,235,0.1);}" +
    ".page-inicio .home-kpi-card-populacao .home-kpi-titulo{color:#1d4ed8;}" +
    ".page-inicio .home-kpi-card-populacao .home-kpi-valor{color:#1e40af;}" +
    ".page-inicio .home-kpi-card-populacao .home-kpi-ilustra-populacao{background-color:#2563eb;background-image:linear-gradient(145deg,#60a5fa,#2563eb);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,0.3);}" +
    ".page-inicio .home-kpi-card-eleitores{background-color:#ccfbf1;background-image:linear-gradient(155deg,#f0fdfa 0%,#ccfbf1 50%,#99f6e4 100%);border:1px solid rgba(20,184,166,0.16);box-shadow:0 2px 8px rgba(20,184,166,0.1);}" +
    ".page-inicio .home-kpi-card-eleitores .home-kpi-titulo{color:#0f766e;}" +
    ".page-inicio .home-kpi-card-eleitores .home-kpi-valor{color:#115e59;}" +
    ".page-inicio .home-kpi-card-eleitores .home-kpi-ilustra-eleitores{background-color:#0d9488;background-image:linear-gradient(145deg,#2dd4bf,#0d9488);color:#fff;box-shadow:0 2px 8px rgba(13,148,136,0.3);}" +
    ".page-inicio .home-kpi-card-equipe{background-color:#e0e7ff;background-image:linear-gradient(155deg,#eef2ff 0%,#e0e7ff 50%,#c7d2fe 100%);border:1px solid rgba(99,102,241,0.16);box-shadow:0 2px 8px rgba(99,102,241,0.1);}" +
    ".page-inicio .home-kpi-card-equipe .home-kpi-titulo{color:#4338ca;}" +
    ".page-inicio .home-kpi-card-equipe .home-kpi-valor-equipe{color:#3730a3;}" +
    ".page-inicio .home-kpi-card-equipe .home-kpi-ilustra-equipe{background-color:#4f46e5;background-image:linear-gradient(145deg,#818cf8,#4f46e5);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,0.3);}" +
    ".page-inicio .home-kpi-card-orcamento{background-color:#cffafe;background-image:linear-gradient(155deg,#ecfeff 0%,#cffafe 50%,#a5f3fc 100%);border:1px solid rgba(14,116,144,0.16);box-shadow:0 2px 8px rgba(14,116,144,0.1);}" +
    ".page-inicio .home-kpi-card-orcamento .home-kpi-titulo{color:#0e7490;}" +
    ".page-inicio .home-kpi-card-orcamento .home-kpi-valor-orcamento{color:#155e75;font-size:10pt;font-weight:700;line-height:1.15;word-break:break-word;}" +
    ".page-inicio .home-kpi-card-orcamento .home-kpi-ilustra-orcamento{background-color:#0891b2;background-image:linear-gradient(145deg,#22d3ee,#0891b2);color:#fff;box-shadow:0 2px 8px rgba(8,145,178,0.3);}" +
    ".page-inicio .rel-graficos--inicio{display:block;width:100%;margin-top:0.35rem;}" +
    ".page-inicio .rel-grafico-bloco--votacao{width:100%;max-width:none;min-width:0;flex:none;margin:0;box-sizing:border-box;}" +
    ".page-inicio .rel-home-votacao-card{background-color:#dbeafe;background-image:linear-gradient(155deg,#dbeafe 0%,#e0e7ff 48%,#a5f3fc 100%);border:1px solid rgba(99,102,241,0.22);box-shadow:0 2px 10px rgba(99,102,241,0.14);padding:0.55rem 0.65rem;}" +
    ".page-inicio .rel-home-votacao-card .home-votacao-titulo{color:#4338ca;font-weight:600;margin-bottom:0.35rem;}" +
    ".page-inicio .rel-home-votacao-card .rel-grafico-img{display:block;width:100%;max-width:100%;height:auto;margin:0 auto;border-radius:6px;}" +
    "@media print{" +
    ".page-inicio h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-inicio .rel-gerado{margin-bottom:0.45rem;}" +
    ".page-inicio .rel-secao{margin:0.4rem 0 0.55rem;}" +
    ".page-inicio .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-inicio .rel-secao-inicio-graficos{page-break-inside:avoid;break-inside:avoid-page;}" +
    ".page-inicio .rel-graficos--inicio{display:flex;justify-content:center;width:100%;}" +
    ".page-inicio .rel-grafico-bloco--votacao{width:100%;max-width:100%;}" +
    ".page-inicio table.rel-tabela{margin-top:0.2rem;font-size:8pt;}" +
    ".page-inicio table.rel-tabela th,.page-inicio table.rel-tabela td{padding:0.2rem 0.28rem;}" +
    ".page-inicio .home-kpi-card,.page-inicio .home-kpi-ilustra,.page-inicio .rel-home-votacao-card{" +
    "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    ".page-inicio .home-kpi-ilustra svg{stroke:#fff!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.conteudoExtraRelatorioPagina = conteudoExtraRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;

function initInicio() {
  carregarInicio(true);
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initInicio);
