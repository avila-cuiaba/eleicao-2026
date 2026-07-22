// Dashboard: municípios da planilha "votacao" filtrados por micro-região (coluna C).

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.DASHBOARD;

const CAMPOS_DASHBOARD = [
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "regiao", chave: "REGIAO", aliases: ["regiao", "região"] },
  { prop: "populacao", chave: "POPULACAO", aliases: ["populacao", "população"] },
  { prop: "eleitores", chave: "ELEITORES", aliases: ["eleitores"] },
  { prop: "votos2022", chave: "VOTOS_2022", aliases: ["votos 2022", "votos2022", "2022"] },
  { prop: "minima", chave: "MINIMA", aliases: ["minima", "mínima", "votacao minima", "votação mínima"] },
  { prop: "ideal", chave: "IDEAL", aliases: ["ideal", "meta", "meta votacao", "meta votação"] },
];

let el = {};
let registros = [];
let regioes = [];
let nomesColunaPlanilha = {};
let modalCrud = null;
let linhaCrud = null;
const popoverTabela = PopoverTabela.criar();

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

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function normalizarRegiao(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarChave(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function atualizarMetadadosPlanilha(valores) {
  const cab = valores[0] || [];
  const normalizados = (cab || []).map((h) => normalizarChave(h));
  nomesColunaPlanilha = {};
  CAMPOS_DASHBOARD.forEach((campo) => {
    let idx = -1;
    if (campo.prop === "minima" || campo.prop === "ideal") {
      idx = cfg.COLUNAS[campo.chave];
    } else {
      idx = normalizados.findIndex((n) =>
        campo.aliases.some((alias) => normalizarChave(alias) === n)
      );
      if (idx === -1 && cfg.COLUNAS[campo.chave] != null) {
        idx = cfg.COLUNAS[campo.chave];
      }
    }
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.aliases[0];
    }
  });
}

function dadosGravacaoDashboard(item) {
  return {
    minima: item.minima ?? "",
    ideal: item.ideal ?? "",
  };
}

function itemPorLinha(numLinha) {
  return registros.find((r) => r._linha === numLinha) || null;
}

function preencherFormularioDashboard(item) {
  el.campoMunicipio.value = String(item.municipio ?? "").trim();
  el.campoRegiao.value = String(item.regiao ?? "").trim();
  el.campoPopulacao.value = item.populacao ? fmt.format(item.populacao) : "";
  el.campoEleitores.value = item.eleitores ? fmt.format(item.eleitores) : "";
  el.campo2022.value = item.votos2022 ? fmt.format(item.votos2022) : "";
  el.campoMinima.value = item.minima ? fmt.format(item.minima) : "";
  el.campoIdeal.value = item.ideal ? fmt.format(item.ideal) : "";
}

function lerFormularioDashboard() {
  return {
    minima: parseNumero(el.campoMinima.value),
    ideal: parseNumero(el.campoIdeal.value),
  };
}

function abrirModalEditarDashboard(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  linhaCrud = numLinha;
  el.modalTitulo.textContent = "editar · " + String(item.municipio ?? "").trim();
  preencherFormularioDashboard(item);
  modalCrud.show();
}

async function salvarDashboardCrud() {
  const item = itemPorLinha(linhaCrud);
  if (!item) return;

  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvar });
  try {
    const form = lerFormularioDashboard();
    await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "atualizar",
      linha: linhaCrud,
      dados: dadosGravacaoDashboard(form),
      origem: "dashboard",
    });
    modalCrud.hide();
    MasterCrud.toast("registro atualizado.", "sucesso");
    await carregarDashboard();
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvar });
  }
}

function aoClicarTabelaDashboard(e) {
  const btn = e.target.closest(MasterCrud.seletorAcao);
  if (!btn) return;
  e.stopPropagation();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") abrirModalEditarDashboard(numLinha);
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", cfg.PLANILHA);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function extrairRegistros(valores) {
  const cols = cfg.COLUNAS;
  const itens = [];

  for (let linha = cfg.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiaoBruta = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    itens.push({
      _linha: linha,
      municipio,
      regiao: regiaoBruta,
      regiaoNorm: normalizarRegiao(regiaoBruta),
      populacao: parseNumero(celula(valores, linha, cols.POPULACAO)),
      eleitores: parseNumero(celula(valores, linha, cols.ELEITORES)),
      votos2022: parseNumero(celula(valores, linha, cols.VOTOS_2022)),
      minima: parseNumero(celula(valores, linha, cols.MINIMA)),
      ideal: parseNumero(celula(valores, linha, cols.IDEAL)),
    });
  }

  return itens;
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
      '<span class="text-secondary small">Nenhuma micro-região encontrada na planilha.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function registrosFiltrados() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];
  return registros.filter((r) => selecionadas.includes(r.regiaoNorm));
}

function atualizarResumo(filtrados) {
  const totais = filtrados.reduce(
    (acc, r) => {
      acc.populacao += r.populacao;
      acc.eleitores += r.eleitores;
      acc.votos2022 += r.votos2022;
      acc.minima += r.minima;
      acc.ideal += r.ideal;
      return acc;
    },
    { populacao: 0, eleitores: 0, votos2022: 0, minima: 0, ideal: 0 }
  );

  el.kpiMunicipios.textContent = fmt.format(filtrados.length);
  el.kpiPopulacao.textContent = fmt.format(totais.populacao);
  el.kpiEleitores.textContent = fmt.format(totais.eleitores);
  el.kpiMinima.textContent = fmt.format(totais.minima);
  el.kpiIdeal.textContent = fmt.format(totais.ideal);
}

function limparResumo() {
  el.kpiMunicipios.textContent = "—";
  el.kpiPopulacao.textContent = "—";
  el.kpiEleitores.textContent = "—";
  el.kpiMinima.textContent = "—";
  el.kpiIdeal.textContent = "—";
}

function alinharColunasTabela() {
  const headWrap = document.querySelector(".dashboard-tabela-head");
  const bodyScroll = document.querySelector(".dashboard-tabela-body-scroll");
  const headTable = headWrap?.querySelector("table");
  const bodyTable = bodyScroll?.querySelector("table");
  if (!headWrap || !bodyScroll || !headTable || !bodyTable) return;

  const largura = bodyScroll.clientWidth;
  headTable.style.width = largura + "px";
  bodyTable.style.width = largura + "px";

  const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
  headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function htmlPopoverDashboard(r) {
  return PopoverTabela.corpo(
    escapeHtml(r.municipio),
    [
      PopoverTabela.item("eleitores", fmt.format(r.eleitores)),
      PopoverTabela.item("votos 2022", fmt.format(r.votos2022)),
      PopoverTabela.item(
        "votação mínima",
        fmt.format(r.minima),
        "popover-marcador--dashboard-minima"
      ),
      PopoverTabela.item(
        "meta votação",
        fmt.format(r.ideal),
        "popover-marcador--dashboard-ideal"
      ),
    ].join("")
  );
}

function renderizarLinhaDashboard(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  return `<tr class="dashboard-linha-popover" tabindex="0" aria-label="detalhes do município">
    <td class="dashboard-col-municipio">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${escapeHtml(r.municipio)}</span>
          <span class="dashboard-municipio-eleitores text-muted">${fmt.format(r.eleitores)}</span>
        </span>
      </span>
    </td>
    <td class="text-end dashboard-col-eleitores">${fmt.format(r.eleitores)}</td>
    <td class="text-end dashboard-col-2022">${fmt.format(r.votos2022)}</td>
    <td class="text-end dashboard-col-minima">${fmt.format(r.minima)}</td>
    <td class="text-end dashboard-col-ideal">
      <span class="dashboard-valor-celula-wrap">
        <span>${fmt.format(r.ideal)}</span>
        ${MasterCrud.acoesLinha(r._linha, { somenteEditar: true })}
      </span>
    </td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtrados = registrosFiltrados();

  if (!registros.length) {
    limparResumo();
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum município na planilha.</td></tr>';
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    limparResumo();
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>';
    aposRenderTabela();
    return;
  }

  atualizarResumo(filtrados);

  if (!filtrados.length) {
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum município para os filtros selecionados.</td></tr>';
    aposRenderTabela();
    return;
  }

  el.corpoTabela.innerHTML = filtrados.map(renderizarLinhaDashboard).join("");
  popoverTabela.inicializar({
    corpo: el.corpoTabela,
    seletorLinha: "tr.dashboard-linha-popover",
    linhas: filtrados,
    htmlConteudo: htmlPopoverDashboard,
  });
  aposRenderTabela();
}

function montar(valores) {
  atualizarMetadadosPlanilha(valores);
  registros = extrairRegistros(valores);
  montarFiltros(extrairRegioes(registros));
  renderizarTabela();
}

async function carregarDashboard() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) {
      limparStatus();
      return;
    }
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar planilha.");

    montar(json.valores || []);
    limparStatus();
    aposRenderTabela();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>';
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarDashboard;

function initDashboard() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    corpoTabela: document.getElementById("corpoTabela"),
    kpiMunicipios: document.getElementById("kpiMunicipios"),
    kpiPopulacao: document.getElementById("kpiPopulacao"),
    kpiEleitores: document.getElementById("kpiEleitores"),
    kpiMinima: document.getElementById("kpiMinima"),
    kpiIdeal: document.getElementById("kpiIdeal"),
    btnSalvar: document.getElementById("btnSalvarDashboard"),
    modalTitulo: document.getElementById("modalDashboardTitulo"),
    modalEl: document.getElementById("modalDashboardCrud"),
    campoMunicipio: document.getElementById("campoDashMunicipio"),
    campoRegiao: document.getElementById("campoDashRegiao"),
    campoPopulacao: document.getElementById("campoDashPopulacao"),
    campoEleitores: document.getElementById("campoDashEleitores"),
    campo2022: document.getElementById("campoDash2022"),
    campoMinima: document.getElementById("campoDashMinima"),
    campoIdeal: document.getElementById("campoDashIdeal"),
  };
  if (!el.corpoTabela) return;

  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.btnSalvar?.addEventListener("click", salvarDashboardCrud);
  el.corpoTabela.addEventListener("click", aoClicarTabelaDashboard);

  window.addEventListener("resize", alinharColunasTabela);
  requestAnimationFrame(() => notificarAlturaFrame());
  carregarDashboard();
}

function normalizarRotuloKpiRelatorio(rotuloEl) {
  if (!rotuloEl) return;
  const desktop =
    rotuloEl.querySelector(".d-none.d-lg-inline, .d-none.d-lg-block") ||
    rotuloEl.querySelector("span:not(.d-lg-none)");
  if (desktop) rotuloEl.textContent = desktop.textContent.trim();
}

function htmlCardsRelatorioPagina(doc) {
  const grid = doc.querySelector(".dashboard-resumo-kpis");
  if (!grid) return "";

  function prepararCelula(seletor) {
    const el = grid.querySelector(seletor);
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    clone
      .querySelectorAll(".dashboard-kpi-votacao-titulo, .d-lg-none, .d-md-none, .d-sm-none")
      .forEach((node) => node.remove());
    clone.querySelectorAll(".dashboard-kpi-rotulo").forEach(normalizarRotuloKpiRelatorio);
    return clone.outerHTML;
  }

  const linhaResumo =
    prepararCelula(".dashboard-kpi-municipios") +
    prepararCelula(".dashboard-kpi-populacao") +
    prepararCelula(".dashboard-kpi-eleitores");
  const linhaVotacao =
    prepararCelula(".dashboard-kpi-minima") + prepararCelula(".dashboard-kpi-ideal");

  if (!linhaResumo && !linhaVotacao) return "";

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-dashboard-kpis">' +
    (linhaResumo
      ? '<div class="rel-dashboard-kpis-linha rel-dashboard-kpis-linha--resumo">' + linhaResumo + "</div>"
      : "") +
    (linhaVotacao
      ? '<div class="rel-dashboard-kpis-linha rel-dashboard-kpis-linha--votacao">' + linhaVotacao + "</div>"
      : "") +
    "</div></section>"
  );
}

function estilosRelatorioPagina() {
  return (
    ".page-dashboard .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-dashboard .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-dashboard .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-dashboard .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-dashboard .rel-dashboard-kpis{margin-top:0.2rem;display:flex;flex-direction:column;align-items:center;gap:8px;}" +
    ".page-dashboard .rel-dashboard-kpis-linha{display:flex;flex-wrap:nowrap;gap:8px;width:98%;max-width:100%;}" +
    ".page-dashboard .rel-dashboard-kpis-linha--resumo .dashboard-kpi-cell{flex:1 1 0;min-width:0;padding:0;}" +
    ".page-dashboard .rel-dashboard-kpis-linha--votacao{justify-content:center;}" +
    ".page-dashboard .rel-dashboard-kpis-linha--votacao .dashboard-kpi-cell{flex:0 0 30%;max-width:30%;min-width:0;padding:0;}" +
    ".page-dashboard .rel-dashboard-kpis-linha .dashboard-kpi-card{width:100%;height:100%;border-radius:8px;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.3rem;text-align:center;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card{background-color:rgba(31,78,140,0.07);background-image:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card.kpi-minima{background-color:rgba(202,161,74,0.22);border-color:rgba(202,161,74,0.32);}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card.kpi-minima .dashboard-kpi-valor{color:#7a5c1a;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card.kpi-ideal{background-color:rgba(27,122,67,0.18);border-color:rgba(27,122,67,0.28);}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card.kpi-ideal .dashboard-kpi-valor{color:#145a32;}" +
    ".page-dashboard table.rel-tabela .dashboard-municipio-eleitores{display:none!important;}" +
    ".page-dashboard table.rel-tabela .dashboard-col-eleitores{display:table-cell!important;}" +
    ".page-dashboard table.rel-tabela .dashboard-th-desktop-only{display:table-cell!important;}" +
    ".page-dashboard table.rel-tabela .dashboard-th-sub-eleitores{display:none!important;}" +
    ".page-dashboard table.rel-tabela th.dashboard-col-municipio,.page-dashboard table.rel-tabela td.dashboard-col-municipio{text-align:left;}" +
    ".page-dashboard table.rel-tabela th.dashboard-col-eleitores,.page-dashboard table.rel-tabela td.dashboard-col-eleitores," +
    ".page-dashboard table.rel-tabela th.dashboard-col-2022,.page-dashboard table.rel-tabela td.dashboard-col-2022," +
    ".page-dashboard table.rel-tabela th.dashboard-col-minima,.page-dashboard table.rel-tabela td.dashboard-col-minima," +
    ".page-dashboard table.rel-tabela th.dashboard-col-ideal,.page-dashboard table.rel-tabela td.dashboard-col-ideal{text-align:right;font-variant-numeric:tabular-nums;}" +
    ".page-dashboard table.rel-tabela th.dashboard-th-votacao{text-align:center;}" +
    ".page-dashboard table.rel-tabela td.dashboard-col-2022{border-left:2px solid rgba(100,116,139,0.35);}" +
    ".page-dashboard table.rel-tabela{margin-top:0.15rem;}" +
    "@media print{" +
    ".page-dashboard h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-dashboard .rel-gerado{margin-bottom:0.35rem;}" +
    ".page-dashboard .rel-dashboard-kpis .dashboard-kpi-card{" +
    "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    ".page-dashboard table.rel-tabela{font-size:8pt;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initDashboard);
