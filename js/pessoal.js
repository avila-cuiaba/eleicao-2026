// Página pessoal: equipe por município (planilha pessoal-municipio).

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.PESSOAL;

let el = {};
let registros = [];
let regioes = [];
const popoverTabela = PopoverTabela.criar();

const COLS_TABELA = 6;

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

function normalizarMunicipio(texto) {
  return normalizarRegiao(texto);
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlConsulta(planilha) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function textoPreenchido(v) {
  return String(v ?? "").trim() !== "";
}

function celulaEhNumerica(val) {
  if (typeof val === "number" && !isNaN(val)) return true;
  const s = String(val ?? "").trim();
  if (!s) return false;
  return /^-?[\d.,]+$/.test(s);
}

function valorColunaPessoal(raw) {
  if (!textoPreenchido(raw)) return 0;
  if (celulaEhNumerica(raw)) {
    const n = parseNumero(raw);
    return n > 0 ? n : 0;
  }
  return 1;
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function exibirApoiadores(r) {
  if (r.apoiadores > 0) return fmt.format(r.apoiadores);
  const s = String(r.apoiadoresTexto ?? "").trim();
  if (!s) return "";
  if (celulaEhNumerica(r.apoiadoresTexto)) return "";
  return exibirTexto(r.apoiadoresTexto);
}

function exibirCelulaPessoal(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  if (celulaEhNumerica(val)) {
    const n = parseNumero(val);
    return n > 0 ? fmt.format(n) : "";
  }
  return escapeHtml(s);
}

function valorApoiadores(val) {
  return valorColunaPessoal(val);
}

function extrairRegistros(valores) {
  const cols = cfg.COLUNAS;
  const itens = [];

  for (let linha = cfg.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiaoBruta = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    const apoiadores = valorApoiadores(celula(valores, linha, cols.APOIADORES));

    itens.push({
      municipio,
      municipioNorm: normalizarMunicipio(municipio),
      regiao: regiaoBruta,
      regiaoNorm: normalizarRegiao(regiaoBruta),
      prefeito: celula(valores, linha, cols.PREFEITO),
      vereador: celula(valores, linha, cols.VEREADOR),
      agentePolitico: celula(valores, linha, cols.AGENTE_POLITICO),
      apoiadores,
      apoiadoresTexto: celula(valores, linha, cols.APOIADORES),
      parceiros: celula(valores, linha, cols.PARCEIROS),
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

function registroEhNulo(r) {
  return totalLinhaPessoal(r) === 0;
}

function visualizarRegistrosNulosAtivo() {
  return !!el.visualizarRegistrosNulos?.checked;
}

function aplicarFiltroRegistrosNulos(lista) {
  if (visualizarRegistrosNulosAtivo()) return lista;
  return lista.filter((r) => !registroEhNulo(r));
}

function registrosFiltrados() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];
  const porRegiao = registros.filter((r) => selecionadas.includes(r.regiaoNorm));
  return aplicarFiltroRegistrosNulos(porRegiao);
}

function totalColunaPessoal(filtrados, campo) {
  return filtrados.reduce((acc, r) => acc + valorColunaPessoal(r[campo]), 0);
}

function totalApoiadores(filtrados) {
  return filtrados.reduce((acc, r) => acc + r.apoiadores, 0);
}

function totalGeralColunas(filtrados) {
  return (
    totalColunaPessoal(filtrados, "prefeito") +
    totalColunaPessoal(filtrados, "vereador") +
    totalColunaPessoal(filtrados, "agentePolitico") +
    totalApoiadores(filtrados) +
    totalColunaPessoal(filtrados, "parceiros")
  );
}

function atualizarResumo(filtrados) {
  const totalPrefeito = totalColunaPessoal(filtrados, "prefeito");
  const totalVereador = totalColunaPessoal(filtrados, "vereador");
  const totalAgente = totalColunaPessoal(filtrados, "agentePolitico");
  const totalApoiad = totalApoiadores(filtrados);
  const totalParceiros = totalColunaPessoal(filtrados, "parceiros");

  el.kpiEfetivoMobilizado.textContent = fmt.format(totalGeralColunas(filtrados));
  el.kpiMunicipios.textContent = fmt.format(filtrados.length);
  el.kpiPrefeito.textContent = fmt.format(totalPrefeito);
  el.kpiVereador.textContent = fmt.format(totalVereador);
  el.kpiAgente.textContent = fmt.format(totalAgente);
  el.kpiApoioParceiros.textContent = fmt.format(totalApoiad + totalParceiros);
}

function limparResumo() {
  const vazio = "—";
  el.kpiEfetivoMobilizado.textContent = vazio;
  el.kpiMunicipios.textContent = vazio;
  el.kpiPrefeito.textContent = vazio;
  el.kpiVereador.textContent = vazio;
  el.kpiAgente.textContent = vazio;
  el.kpiApoioParceiros.textContent = vazio;
}

function alinharColunasTabela() {
  const headWrap = document.querySelector(".dashboard-tabela-head");
  const bodyScroll = document.querySelector(".dashboard-tabela-body-scroll");
  const headTable = headWrap?.querySelector("table");
  const bodyTable = bodyScroll?.querySelector("table");
  if (!headWrap || !bodyScroll || !headTable || !bodyTable) return;

  headTable.style.width = "100%";
  bodyTable.style.width = "100%";

  const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
  headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";

  sincronizarLargurasColunasPessoal(headTable, bodyTable);
}

function sincronizarLargurasColunasPessoal(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  const largurasMobile = {
    "pessoal-col-municipio": "22%",
    "pessoal-col-prefeito": "13%",
    "pessoal-col-vereador": "13%",
    "pessoal-col-agente": "13%",
    "pessoal-col-apoiadores": "20%",
    "pessoal-col-parceiros": "19%",
  };

  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find((c) => c.startsWith("pessoal-col-"));
      if (mobile && cls && largurasMobile[cls] != null) {
        col.style.width = largurasMobile[cls];
      } else {
        col.style.width = "";
      }
    });
  });
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function valorPopoverPessoal(val) {
  return exibirCelulaPessoal(val);
}

function itemPopoverPessoal(rotulo, valor, marcadorClass) {
  return PopoverTabela.item(rotulo, valor, marcadorClass, true);
}

function totalLinhaPessoal(r) {
  return (
    valorColunaPessoal(r.prefeito) +
    valorColunaPessoal(r.vereador) +
    valorColunaPessoal(r.agentePolitico) +
    (r.apoiadores || 0) +
    valorColunaPessoal(r.parceiros)
  );
}

function htmlPopoverPessoal(r) {
  const titulo =
    `<div class="pessoal-popover-titulo-linha">` +
    `<span class="pessoal-popover-municipio">${escapeHtml(r.municipio)}</span>` +
    `<span class="pessoal-popover-total">${fmt.format(totalLinhaPessoal(r))}</span>` +
    `</div>`;

  return (
    `<div class="orcamento-geral-popover-corpo pessoal-popover-corpo">` +
    titulo +
    [
      itemPopoverPessoal("prefeito", valorPopoverPessoal(r.prefeito), "popover-marcador--pessoal-prefeito"),
      itemPopoverPessoal("vereador", valorPopoverPessoal(r.vereador), "popover-marcador--pessoal-vereador"),
      itemPopoverPessoal(
        "agente politico",
        valorPopoverPessoal(r.agentePolitico),
        "popover-marcador--pessoal-agente"
      ),
      itemPopoverPessoal(
        "apoiadores",
        exibirApoiadores(r),
        "popover-marcador--pessoal-apoiadores"
      ),
      itemPopoverPessoal("parceiros", valorPopoverPessoal(r.parceiros), "popover-marcador--pessoal-parceiros"),
    ].join("") +
    `</div>`
  );
}

function renderizarLinhaPessoal(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";

  return `<tr class="pessoal-linha-popover" tabindex="0" aria-label="detalhes do município">
    <td class="pessoal-col-municipio">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${escapeHtml(r.municipio)}</span>
        </span>
      </span>
    </td>
    <td class="text-end pessoal-col-prefeito pessoal-celula-num">${exibirCelulaPessoal(r.prefeito)}</td>
    <td class="text-end pessoal-col-vereador pessoal-celula-num">${exibirCelulaPessoal(r.vereador)}</td>
    <td class="text-end pessoal-col-agente pessoal-celula-num">${exibirCelulaPessoal(r.agentePolitico)}</td>
    <td class="text-end pessoal-col-apoiadores pessoal-celula-num">${exibirApoiadores(r)}</td>
    <td class="text-end pessoal-col-parceiros pessoal-celula-num">${exibirCelulaPessoal(r.parceiros)}</td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtrados = registrosFiltrados();

  if (!registros.length) {
    limparResumo();
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum município na planilha.</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    limparResumo();
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarResumo(filtrados);

  if (!filtrados.length) {
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum município para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  el.corpoTabela.innerHTML = filtrados.map(renderizarLinhaPessoal).join("");
  popoverTabela.inicializar({
    corpo: el.corpoTabela,
    seletorLinha: "tr.pessoal-linha-popover",
    linhas: filtrados,
    htmlConteudo: htmlPopoverPessoal,
  });
  aposRenderTabela();
}

function montar(valoresMunicipio) {
  registros = extrairRegistros(valoresMunicipio);
  montarFiltros(extrairRegioes(registros));
  renderizarTabela();
}

async function fetchPlanilha(planilha) {
  const resp = await fetch(urlConsulta(planilha), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

async function carregarPessoal() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const valoresMunicipio = await fetchPlanilha(cfg.PLANILHA);

    if (valoresMunicipio === null) {
      limparStatus();
      return;
    }

    montar(valoresMunicipio);
    limparStatus();
    aposRenderTabela();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    popoverTabela.destruir();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>`;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarPessoal;

function initPessoal() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    visualizarRegistrosNulos: document.getElementById("visualizarRegistrosNulos"),
    corpoTabela: document.getElementById("corpoTabela"),
    kpiEfetivoMobilizado: document.getElementById("kpiEfetivoMobilizado"),
    kpiMunicipios: document.getElementById("kpiMunicipios"),
    kpiPrefeito: document.getElementById("kpiPrefeito"),
    kpiVereador: document.getElementById("kpiVereador"),
    kpiAgente: document.getElementById("kpiAgente"),
    kpiApoioParceiros: document.getElementById("kpiApoioParceiros"),
  };
  if (!el.corpoTabela) return;

  el.visualizarRegistrosNulos?.addEventListener("change", renderizarTabela);

  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  requestAnimationFrame(() => notificarAlturaFrame());
  carregarPessoal();
}

function htmlCardsRelatorioPagina(doc) {
  const grid = doc.querySelector(".pessoal-kpi-grid");
  if (!grid) return "";

  const clone = grid.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-pessoal-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("pessoal-tabela")) return;

  const larguras = ["35%", "13%", "13%", "13%", "13%", "13%"];
  table.style.tableLayout = "fixed";
  table.style.width = "100%";

  table.querySelectorAll("colgroup").forEach((cg) => cg.remove());
  const colgroup = document.createElement("colgroup");
  larguras.forEach((w) => {
    const col = document.createElement("col");
    col.style.width = w;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, table.firstChild);

  const primeiraLinha = table.querySelector("thead tr, tbody tr");
  if (!primeiraLinha) return;
  Array.from(primeiraLinha.children).forEach((celula, i) => {
    if (larguras[i]) celula.style.width = larguras[i];
  });
}

function estilosRelatorioPagina() {
  return (
    ".page-pessoal .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-pessoal .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-pessoal .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-pessoal .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-pessoal .rel-pessoal-kpis{margin-top:0.2rem;}" +
    ".page-pessoal .rel-pessoal-kpis > .pessoal-kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto auto;gap:8px;align-items:stretch;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot{min-width:0;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--efetivo{grid-column:1;grid-row:1;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--prefeito{grid-column:2;grid-row:1;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--vereador{grid-column:3;grid-row:1;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--municipios{grid-column:1;grid-row:2;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--agente{grid-column:2;grid-row:2;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--apoio{grid-column:3;grid-row:2;}" +
    ".page-pessoal .rel-pessoal-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;background-color:rgba(31,78,140,0.07);border:1px solid rgba(31,78,140,0.14);}" +
    ".page-pessoal .rel-pessoal-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.3rem;text-align:center;}" +
    ".page-pessoal .rel-pessoal-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-pessoal .rel-pessoal-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-card--principal{background:linear-gradient(135deg,rgba(13,148,136,0.16),rgba(13,148,136,0.05));border:1px solid rgba(13,148,136,0.32);border-left:5px solid #0d9488;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--efetivo .dashboard-kpi-rotulo{color:#0f766e;font-weight:700;font-size:8pt;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--efetivo .dashboard-kpi-valor{color:#0d5f56;font-size:12pt;font-weight:700;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-card--destaque{background:rgba(31,78,140,0.08);border:1px solid rgba(31,78,140,0.2);border-left:4px solid #1f4e8c;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--municipios .dashboard-kpi-rotulo{color:#1e3a5f;font-weight:600;font-size:8pt;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-slot--municipios .dashboard-kpi-valor{color:#0f172a;font-size:11pt;font-weight:600;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-prefeito.dashboard-kpi-card{border-left:3px solid #6366f1;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-vereador.dashboard-kpi-card{border-left:3px solid #1f4e8c;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-agente.dashboard-kpi-card{border-left:3px solid #1a6f85;}" +
    ".page-pessoal .rel-pessoal-kpis .pessoal-kpi-apoio.dashboard-kpi-card{border-left:3px solid #0f766e;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela{table-layout:fixed!important;width:100%!important;margin-top:0.15rem;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela col:first-child," +
    ".page-pessoal table.rel-tabela.pessoal-tabela th:first-child," +
    ".page-pessoal table.rel-tabela.pessoal-tabela td:first-child{width:35%!important;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela col:not(:first-child)," +
    ".page-pessoal table.rel-tabela.pessoal-tabela th:not(:first-child)," +
    ".page-pessoal table.rel-tabela.pessoal-tabela td:not(:first-child){width:13%!important;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela th.pessoal-col-municipio,.page-pessoal table.rel-tabela.pessoal-tabela td.pessoal-col-municipio{text-align:left;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela th:not(.pessoal-col-municipio),.page-pessoal table.rel-tabela.pessoal-tabela td:not(.pessoal-col-municipio){text-align:right;padding:0.3rem 0.25rem;font-variant-numeric:tabular-nums;white-space:normal;overflow:hidden;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela td:not(.pessoal-col-municipio){white-space:nowrap;}" +
    "@media print{" +
    ".page-pessoal h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-pessoal .rel-gerado{margin-bottom:0.35rem;}" +
    ".page-pessoal .rel-pessoal-kpis .dashboard-kpi-card{" +
    "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    ".page-pessoal table.rel-tabela.pessoal-tabela{font-size:8pt;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initPessoal);
