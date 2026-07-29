// Página parcerias: planilha parcerias (A município, B parceria, C apoiadores, D valor).

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PESSOAL;
const cfgPar = cfg.PARCERIAS;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 4;

const CAMPOS_PLANILHA = [
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "parceria", chave: "PARCERIA", aliases: ["parceria"] },
  { prop: "apoiadores", chave: "APOIADORES", aliases: ["apoiadores", "apoiador"] },
  {
    prop: "valorParceria",
    chave: "VALOR_PARCERIA",
    aliases: ["valor parceria", "valor-parceria", "valor", "orcamento", "orçamento"],
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
    if (idx === -1 && cfgPar.COLUNAS[campo.chave] != null) {
      idx = cfgPar.COLUNAS[campo.chave];
    }
    indices[campo.prop] = idx;
  });

  return indices;
}

function valorCampo(linha, idx) {
  if (idx == null || idx < 0) return "";
  return linha[idx];
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function exibirNumero(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (n > 0 || s === "0") return fmt.format(n);
  return escapeHtml(s);
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
    const id = "par-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function termoBuscaParceria() {
  return normalizarChave(el.buscaParceria?.value);
}

function linhasFiltradas() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const todasMarcadas = selecionadas.length === regioes.length;
  const termo = termoBuscaParceria();

  return linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }

    if (
      termo &&
      !itemCombinaBuscaMulticampo(item, termo, ["parceria", "municipio"], normalizarChave)
    ) {
      return false;
    }
    return true;
  });
}

const ordenacaoParcerias = { col: "parceria", dir: "asc" };

function cmpParceriaOrdem(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(a.parceria, b.parceria);
  if (c) return c;
  return T.cmpTexto(a.municipio, b.municipio);
}

function cmpMunicipioParceriaOrdem(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(a.municipio, b.municipio);
  if (c) return c;
  return T.cmpTexto(a.parceria, b.parceria);
}

const COMPARADORES_ORDENACAO_PARCERIAS = {
  parceria: cmpParceriaOrdem,
  municipio: cmpMunicipioParceriaOrdem,
};

function aplicarOrdenacaoParcerias(lista) {
  return TabelaOrdenacao.aplicar(lista, ordenacaoParcerias, COMPARADORES_ORDENACAO_PARCERIAS);
}

function linhaTemConteudo(item) {
  return CAMPOS_PLANILHA.some((c) => celulaPreenchida(item[c.prop]));
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfgPar.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      municipio,
      parceria: valorCampo(linha, indices.parceria),
      apoiadores: valorCampo(linha, indices.apoiadores),
      valorParceria: valorCampo(linha, indices.valorParceria),
      regiao: info?.regiao || "",
      regiaoNorm: info?.regiaoNorm || "",
    };

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  return itens;
}

function quantidadeMunicipiosDistinct(filtradas) {
  const set = new Set();
  filtradas.forEach((r) => {
    const chave = normalizarChave(r.municipio);
    if (chave) set.add(chave);
  });
  return set.size;
}

function somarNumerico(filtradas, prop) {
  return filtradas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function atualizarKpis(filtradas) {
  el.kpiParcerias.textContent = fmt.format(filtradas.length);
  el.kpiMunicipios.textContent = fmt.format(quantidadeMunicipiosDistinct(filtradas));
  el.kpiApoiadores.textContent = fmt.format(somarNumerico(filtradas, "apoiadores"));
  el.kpiOrcamento.textContent = fmtMoeda.format(somarNumerico(filtradas, "valorParceria"));
}

function limparKpis() {
  const vazio = "—";
  el.kpiParcerias.textContent = vazio;
  el.kpiMunicipios.textContent = vazio;
  el.kpiApoiadores.textContent = vazio;
  el.kpiOrcamento.textContent = vazio;
}

function zerarKpis() {
  el.kpiParcerias.textContent = fmt.format(0);
  el.kpiMunicipios.textContent = fmt.format(0);
  el.kpiApoiadores.textContent = fmt.format(0);
  el.kpiOrcamento.textContent = fmtMoeda.format(0);
}

function largurasColunasParcerias() {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (mobile) {
    return {
      "apoiadores-col-ident": "40%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "30%",
      "apoiadores-col-30": "30%",
    };
  }
  return {
    "apoiadores-col-ident": "26%",
    "apoiadores-col-municipio": "26%",
    "apoiadores-col-lider": "24%",
    "apoiadores-col-30": "24%",
  };
}

function sincronizarLargurasColunasParcerias(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  const larguras = largurasColunasParcerias();
  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find((c) => c.startsWith("apoiadores-col-"));
      if (mobile && cls && larguras[cls] != null) {
        col.style.width = larguras[cls];
      } else {
        col.style.width = "";
      }
    });
  });
}

function alinharColunasTabela() {
  const panel = document.querySelector(".parcerias-tabela-card .dashboard-tabela-panel");
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

  sincronizarLargurasColunasParcerias(headTable, bodyTable);
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
  const parceriaHtml = exibirTexto(r.parceria);
  const municipioSub = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";

  return `<tr>
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">${parceriaHtml}</span>
      <span class="apoiadores-celula-mobile">
        <span class="dashboard-municipio-celula">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
          <span class="dashboard-municipio-texto">
            <span class="dashboard-municipio-nome">${parceriaHtml || municipioHtml}</span>
            ${municipioSub}
          </span>
        </span>
      </span>
    </td>
    <td class="apoiadores-col-municipio">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${municipioHtml}</span>
        </span>
      </span>
    </td>
    <td class="text-end apoiadores-col-lider apoiadores-celula-num">${exibirNumero(r.apoiadores)}</td>
    <td class="text-end apoiadores-col-30 apoiadores-celula-num">${exibirMoeda(r.valorParceria)}</td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = aplicarOrdenacaoParcerias(linhasFiltradas());

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
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhuma parceria para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  aposRenderTabela();
}

function montar(valoresParcerias) {
  linhas = extrairLinhas(valoresParcerias);
  montarFiltros(extrairRegioes(linhas));
  renderizarTabela();
}

async function carregarParcerias() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando parcerias...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valoresParcerias, valoresMunicipios] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA_PARCERIAS),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
    ]);

    if (valoresParcerias === null) {
      limparStatus();
      return;
    }

    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresParcerias);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    el.corpo.innerHTML = "";
    el.vazio.hidden = true;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarParcerias;

function initParcerias() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaParceria: document.getElementById("buscaParceria"),
    corpo: document.getElementById("corpoParcerias"),
    vazio: document.getElementById("vazio"),
    kpiParcerias: document.getElementById("kpiParcerias"),
    kpiMunicipios: document.getElementById("kpiMunicipios"),
    kpiApoiadores: document.getElementById("kpiApoiadores"),
    kpiOrcamento: document.getElementById("kpiOrcamento"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  const cardOrdenacao = document.querySelector(".parcerias-tabela-card");
  TabelaOrdenacao.montarCabecalhoParceriaMunicipio(cardOrdenacao);
  TabelaOrdenacao.vincular(cardOrdenacao, ordenacaoParcerias, renderizarTabela, "ordenacaoParcerias");

  el.buscaParceria?.addEventListener("input", renderizarTabela);
  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarParcerias();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initParcerias);
