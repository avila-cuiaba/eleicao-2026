// Página orçamento: planilha orcamento (município + colunas de orçamento).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ORCAMENTO;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 8;

const CAMPOS_NUMERICOS = [
  { prop: "pessoal", rotulo: "pessoal" },
  { prop: "combustivel", rotulo: "combustível" },
  { prop: "diversos", rotulo: "diversos" },
  { prop: "diaD", rotulo: "dia D" },
];

const CAMPOS_PLANILHA = [
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município", "municipios", "municípios"] },
  {
    prop: "pessoal",
    chave: "PESSOAL",
    aliases: [
      "contratos-distribuidos-apoiadores",
      "contratos distribuidos apoiadores",
      "pessoal",
    ],
  },
  {
    prop: "combustivel",
    chave: "COMBUSTIVEL",
    aliases: ["orcamento-combustivel", "orcamento combustivel", "combustivel", "combustível"],
  },
  {
    prop: "diversos",
    chave: "DIVERSOS",
    aliases: ["orcamento-diversos", "orcamento diversos", "diversos"],
  },
  {
    prop: "diaD",
    chave: "DIA_D",
    aliases: ["orcamento-diad", "orcamento-dia d", "orcamento dia d", "dia d", "diad"],
  },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function mostrarStatus(mensagem, tipo) {
  statusPainel(el.status, mensagem, tipo);
}

function limparStatus() {
  statusPainel(el.status, "", null);
}

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
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

function urlConsulta(planilha) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function fetchPlanilha(planilha) {
  const resp = await fetch(urlConsulta(planilha), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

function montarMapaMunicipios(valoresMunicipios) {
  const mapa = new Map();
  if (!valoresMunicipios?.length) return mapa;

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiao = String(celula(valoresMunicipios, linha, cols.REGIAO) ?? "").trim();
    mapa.set(normalizarChave(municipio), {
      regiao,
      regiaoNorm: normalizarChave(regiao),
    });
  }

  return mapa;
}

function resolverIndices(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const indices = {};

  CAMPOS_PLANILHA.forEach((campo) => {
    let idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1 && cfg.COLUNAS[campo.chave] != null) {
      idx = cfg.COLUNAS[campo.chave];
    }
    indices[campo.prop] = idx;
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

function ordenarRegioes(a, b) {
  const ordem = cfg.ORDEM_REGIOES || [];
  const indice = (norm) => {
    const i = ordem.indexOf(norm);
    return i === -1 ? ordem.length + 1 : i;
  };
  const diff = indice(a.norm) - indice(b.norm);
  if (diff !== 0) return diff;
  return a.rotulo.localeCompare(b.rotulo, "pt-BR");
}

function indiceCorRegiao(regiaoNorm) {
  const ordem = cfg.ORDEM_REGIOES || [];
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function extrairRegioes(itens) {
  const mapa = new Map();

  itens.forEach((item) => {
    if (!item.regiaoNorm) return;
    if (!mapa.has(item.regiaoNorm)) {
      mapa.set(item.regiaoNorm, item.regiao);
    }
  });

  return Array.from(mapa.entries())
    .map(([norm, rotulo]) => ({ norm, rotulo }))
    .sort(ordenarRegioes);
}

function regioesSelecionadas() {
  return Array.from(el.filtroRegioes.querySelectorAll('input[type="checkbox"]:checked')).map(
    (cb) => cb.value
  );
}

function montarFiltros(listaRegioes) {
  regioes = listaRegioes;
  el.filtroRegioes.innerHTML = "";

  if (!listaRegioes.length) {
    el.filtroRegioes.innerHTML =
      '<span class="text-secondary small">Nenhuma região encontrada.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "orc-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
    const label = document.createElement("label");
    label.className = "dashboard-filtro-item dashboard-filtro-cor--" + indiceCorRegiao(reg.norm);
    label.innerHTML =
      `<input type="checkbox" class="visually-hidden" id="${id}" value="${escapeHtml(reg.norm)}" checked>` +
      `<span class="dashboard-filtro-badge">${escapeHtml(reg.rotulo)}</span>`;
    el.filtroRegioes.appendChild(label);
  });

  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", renderizarTabela);
  });
}

function termoBuscaMunicipio() {
  return normalizarChave(el.buscaMunicipio?.value);
}

function linhasFiltradas() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const todasMarcadas = selecionadas.length === regioes.length;
  const termo = termoBuscaMunicipio();

  return linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }

    if (termo && !normalizarChave(item.municipio).includes(termo)) return false;
    return true;
  });
}

function ordenarLinhas(a, b) {
  return String(a.municipio ?? "").localeCompare(String(b.municipio ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

function linhaTemConteudo(item) {
  return CAMPOS_PLANILHA.some((c) => celulaPreenchida(item[c.prop]));
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfg.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      municipio,
      pessoal: valorCampo(linha, indices.pessoal),
      combustivel: valorCampo(linha, indices.combustivel),
      diversos: valorCampo(linha, indices.diversos),
      diaD: valorCampo(linha, indices.diaD),
      regiao: info?.regiao || "",
      regiaoNorm: info?.regiaoNorm || "",
    };

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(ordenarLinhas);
  return itens;
}

function somarNumerico(filtradas, prop) {
  return filtradas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function totalLinha(item) {
  return CAMPOS_NUMERICOS.reduce((acc, c) => acc + parseNumero(item[c.prop]), 0);
}

function somarTotalGeral(filtradas) {
  return filtradas.reduce((acc, r) => acc + totalLinha(r), 0);
}

function atualizarKpis(filtradas) {
  el.kpiPessoal.textContent = fmtMoeda.format(somarNumerico(filtradas, "pessoal"));
  el.kpiCombustivel.textContent = fmtMoeda.format(somarNumerico(filtradas, "combustivel"));
  el.kpiDiversos.textContent = fmtMoeda.format(somarNumerico(filtradas, "diversos"));
  el.kpiDiaD.textContent = fmtMoeda.format(somarNumerico(filtradas, "diaD"));
  el.kpiTotal.textContent = fmtMoeda.format(somarTotalGeral(filtradas));
}

function limparKpis() {
  const vazio = "—";
  el.kpiPessoal.textContent = vazio;
  el.kpiCombustivel.textContent = vazio;
  el.kpiDiversos.textContent = vazio;
  el.kpiDiaD.textContent = vazio;
  el.kpiTotal.textContent = vazio;
}

function zerarKpis() {
  el.kpiPessoal.textContent = fmtMoeda.format(0);
  el.kpiCombustivel.textContent = fmtMoeda.format(0);
  el.kpiDiversos.textContent = fmtMoeda.format(0);
  el.kpiDiaD.textContent = fmtMoeda.format(0);
  el.kpiTotal.textContent = fmtMoeda.format(0);
}

function sincronizarLargurasColunasOrcamento(headTable, bodyTable) {
  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      col.style.width = "";
    });
  });
}

function alinharColunasTabela() {
  const panel = document.querySelector(".orcamento-tabela-card .dashboard-tabela-panel");
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

  sincronizarLargurasColunasOrcamento(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);

  const colsNum = CAMPOS_NUMERICOS.map(
    (c) =>
      `<td class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop} apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r[c.prop])}</td>`
  ).join("");

  const total = totalLinha(r);
  const stackPessoal = `<span class="orcamento-tabela-stack-valor">${exibirMoeda(r.pessoal)}</span>
        <span class="orcamento-tabela-stack-valor">${exibirMoeda(r.combustivel)}</span>`;
  const stackDiversos = `<span class="orcamento-tabela-stack-valor">${exibirMoeda(r.diversos)}</span>
        <span class="orcamento-tabela-stack-valor">${exibirMoeda(r.diaD)}</span>`;

  return `<tr>
    <td class="orcamento-col-municipio">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${municipioHtml}</span>
          <span class="orcamento-municipio-total-mobile orcamento-total-badge">${fmtMoeda.format(total)}</span>
        </span>
      </span>
    </td>
    ${colsNum}
    <td class="text-end orcamento-col-total apoiadores-celula-num orcamento-tabela-desktop-col">
      <span class="orcamento-tabela-celula-direita">${fmtMoeda.format(total)}</span>
    </td>
    <td class="text-end orcamento-col-stack-pessoal orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        ${stackPessoal}
      </div>
    </td>
    <td class="text-end orcamento-col-stack-diversos orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        ${stackDiversos}
      </div>
    </td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = [...linhasFiltradas()].sort(ordenarLinhas);

  el.vazio.hidden = true;

  if (!linhas.length) {
    limparKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    zerarKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma região</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum município para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  aposRenderTabela();
}

function montar(valoresOrcamento) {
  linhas = extrairLinhas(valoresOrcamento);
  montarFiltros(extrairRegioes(linhas));
  renderizarTabela();
}

async function carregarOrcamento() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando orçamento...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valoresOrcamento, valoresMunicipios] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
    ]);

    if (valoresOrcamento === null) {
      limparStatus();
      return;
    }

    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresOrcamento);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    el.corpo.innerHTML = "";
    el.vazio.hidden = true;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarOrcamento;

function initOrcamento() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaMunicipio: document.getElementById("buscaMunicipio"),
    corpo: document.getElementById("corpoOrcamento"),
    vazio: document.getElementById("vazio"),
    kpiPessoal: document.getElementById("kpiPessoal"),
    kpiCombustivel: document.getElementById("kpiCombustivel"),
    kpiDiversos: document.getElementById("kpiDiversos"),
    kpiDiaD: document.getElementById("kpiDiaD"),
    kpiTotal: document.getElementById("kpiTotal"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  el.buscaMunicipio?.addEventListener("input", renderizarTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarOrcamento();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initOrcamento);
