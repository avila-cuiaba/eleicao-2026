// Página parcerias: aba apoiadores — parceria, orçamento; repasse = Z+AA+AB+AC (pessoal, combustível, diversos, dia D).

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PESSOAL;
const cfgPar = cfg.PARCERIAS;
const cfgAp = cfg.APOIADORES;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 6;

const CAMPOS_PLANILHA = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "parceria", chave: "PARCERIA", aliases: ["parceria"] },
  {
    prop: "orcamento",
    chave: "ORCAMENTO",
    aliases: ["orcamento", "orçamento"],
  },
];

const CAMPOS_REPASSE_PARCEIRO = [
  { prop: "parPessoal", chave: "PAR_PESSOAL", aliases: ["pessoal", "parceiro-pessoal"] },
  {
    prop: "parCombustivel",
    chave: "PAR_COMBUSTIVEL",
    aliases: ["parceiro-combustivel", "combustivel-parceiro"],
  },
  { prop: "parDiversos", chave: "PAR_DIVERSOS", aliases: ["parceiro-diversos", "diversos-parceiro"] },
  {
    prop: "parDiaD",
    chave: "PAR_DIA_D",
    aliases: ["parceiro-diad", "parceiro dia d", "dia-d-parceiro", "diad-parceiro"],
  },
];

const LINHAS_POPOVER_DESPESAS = [
  { rotulo: "pessoal", prop: "parPessoal", marcador: "popover-marcador--orc-pessoal" },
  {
    rotulo: "combustivel",
    prop: "parCombustivel",
    marcador: "popover-marcador--orc-combustivel",
  },
  { rotulo: "diversos", prop: "parDiversos", marcador: "popover-marcador--orc-diversos" },
  {
    rotulo: "dia D",
    prop: "parDiaD",
    marcador: "popover-marcador--orc-diad",
    preserveCase: true,
  },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();
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

  CAMPOS_REPASSE_PARCEIRO.forEach((campo) => {
    let idx = -1;
    if (cfgPar.COLUNAS[campo.chave] != null) {
      idx = cfgPar.COLUNAS[campo.chave];
    }
    if (idx === -1 && cfgAp.COLUNAS[campo.chave] != null) {
      idx = cfgAp.COLUNAS[campo.chave];
    }
    if (idx === -1 && campo.aliases) {
      idx = normalizados.findIndex((n) =>
        campo.aliases.some((alias) => normalizarChave(alias) === n)
      );
    }
    indices[campo.prop] = idx;
  });

  return indices;
}

function calcularRepasseParceria(linha, indices) {
  return CAMPOS_REPASSE_PARCEIRO.reduce(
    (acc, campo) => acc + parseNumero(valorCampo(linha, indices[campo.prop])),
    0
  );
}

function valorCampo(linha, idx) {
  if (idx == null || idx < 0) return "";
  return linha[idx];
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
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
      !itemCombinaBuscaMulticampo(item, termo, ["parceria"], normalizarChave)
    ) {
      return false;
    }
    return true;
  });
}

const ordenacaoParcerias = { col: "lideranca", dir: "asc" };

function cmpLiderancaParceriasOrdem(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(a.lideranca, b.lideranca);
  if (c) return c;
  return T.cmpTexto(a.municipio, b.municipio);
}

function cmpParceriaOrdem(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(a.parceria, b.parceria);
  if (c) return c;
  return T.cmpTexto(a.lideranca, b.lideranca);
}

function cmpMunicipioParceriaOrdem(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(a.municipio, b.municipio);
  if (c) return c;
  return T.cmpTexto(a.lideranca, b.lideranca);
}

const COMPARADORES_ORDENACAO_PARCERIAS = {
  lideranca: cmpLiderancaParceriasOrdem,
  parceria: cmpParceriaOrdem,
  municipio: cmpMunicipioParceriaOrdem,
};

function aplicarOrdenacaoParcerias(lista) {
  return TabelaOrdenacao.aplicar(lista, ordenacaoParcerias, COMPARADORES_ORDENACAO_PARCERIAS);
}

function linhaTemConteudo(item) {
  return ["lideranca", "municipio", "parceria", "orcamento", "repasseParceria"].some((prop) =>
    celulaPreenchida(item[prop])
  );
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfgPar.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const repasseParceria = calcularRepasseParceria(linha, indices);
    if (repasseParceria <= 0) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      _linha: i + 1,
      lideranca: valorCampo(linha, indices.lideranca),
      municipio,
      parceria: valorCampo(linha, indices.parceria),
      orcamento: valorCampo(linha, indices.orcamento),
      parPessoal: valorCampo(linha, indices.parPessoal),
      parCombustivel: valorCampo(linha, indices.parCombustivel),
      parDiversos: valorCampo(linha, indices.parDiversos),
      parDiaD: valorCampo(linha, indices.parDiaD),
      repasseParceria,
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

function quantidadeParceriasDistinct(filtradas) {
  const set = new Set();
  filtradas.forEach((r) => {
    const parceria = String(r.parceria ?? "").trim();
    if (!parceria) return;
    set.add(normalizarChave(parceria));
  });
  return set.size;
}

function agruparPorParceria(filtradas) {
  const mapa = new Map();

  filtradas.forEach((r) => {
    const parceria = String(r.parceria ?? "").trim();
    if (!parceria) return;

    const chave = normalizarChave(parceria);
    if (!mapa.has(chave)) {
      mapa.set(chave, { parceria, total: 0 });
    }
    mapa.get(chave).total += parseNumero(r.repasseParceria);
  });

  return Array.from(mapa.values()).sort((a, b) =>
    a.parceria.localeCompare(b.parceria, "pt-BR", { sensitivity: "base" })
  );
}

const PARCEIROS_KPI_TONOS = 6;

function htmlCardParceria(grupo, indice) {
  const tono = indice % PARCEIROS_KPI_TONOS;
  return (
    `<div class="apoiadores-kpi-slot parcerias-kpi-parceiro-tono--${tono}">` +
    `<div class="card h-100 shadow-sm border-0 dashboard-kpi-card parcerias-kpi-parceiro-card">` +
    `<div class="card-body py-2 px-2 px-sm-3">` +
    `<div class="dashboard-kpi-rotulo parcerias-kpi-parceiro-nome">${escapeHtml(grupo.parceria)}</div>` +
    `<strong class="dashboard-kpi-valor parcerias-kpi-parceiro-valor">${fmtMoeda.format(grupo.total)}</strong>` +
    `</div></div></div>`
  );
}

function atualizarKpisPorParceria(filtradas) {
  if (!el.kpiPorParceria) return;
  const grupos = agruparPorParceria(filtradas);
  if (!grupos.length) {
    el.kpiPorParceria.innerHTML = `<span class="text-secondary small parcerias-kpi-parceiros-vazio">—</span>`;
    return;
  }
  el.kpiPorParceria.innerHTML = grupos.map((grupo, indice) => htmlCardParceria(grupo, indice)).join("");
}

function limparKpisPorParceria() {
  if (el.kpiPorParceria) el.kpiPorParceria.innerHTML = "";
}

function zerarKpisPorParceria() {
  if (el.kpiPorParceria) el.kpiPorParceria.innerHTML = "";
}

function somarNumerico(filtradas, prop) {
  return filtradas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function atualizarKpis(filtradas) {
  el.kpiFederal.textContent = fmt.format(quantidadeParceriasDistinct(filtradas));
  el.kpiParcerias.textContent = fmt.format(filtradas.length);
  el.kpiMunicipios.textContent = fmt.format(quantidadeMunicipiosDistinct(filtradas));
  el.kpiRepasseParceria.textContent = fmtMoeda.format(somarNumerico(filtradas, "repasseParceria"));
  atualizarKpisPorParceria(filtradas);
}

function limparKpis() {
  const vazio = "—";
  el.kpiFederal.textContent = vazio;
  el.kpiParcerias.textContent = vazio;
  el.kpiMunicipios.textContent = vazio;
  el.kpiRepasseParceria.textContent = vazio;
  limparKpisPorParceria();
}

function zerarKpis() {
  el.kpiFederal.textContent = fmt.format(0);
  el.kpiParcerias.textContent = fmt.format(0);
  el.kpiMunicipios.textContent = fmt.format(0);
  el.kpiRepasseParceria.textContent = fmtMoeda.format(0);
  zerarKpisPorParceria();
}

function largurasColunasParcerias() {
  const mobile = window.matchMedia("(max-width: 1199.98px)").matches;
  if (mobile) {
    return {
      "apoiadores-col-ident": "38%",
      "apoiadores-col-lider": "28%",
      "apoiadores-col-parcerias-stack": "34%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-integral": "0",
      "apoiadores-col-30": "0",
    };
  }
  return {
    "apoiadores-col-ident": "22%",
    "apoiadores-col-integral": "19%",
    "apoiadores-col-parcerias-stack": "0",
    "apoiadores-col-municipio": "20%",
    "apoiadores-col-lider": "20%",
    "apoiadores-col-30": "19%",
  };
}

const ORDEM_COLUNAS_PARCERIAS_MOBILE = [
  "apoiadores-col-ident",
  "apoiadores-col-lider",
  "apoiadores-col-parcerias-stack",
  "apoiadores-col-municipio",
  "apoiadores-col-integral",
  "apoiadores-col-30",
];

const ORDEM_COLUNAS_PARCERIAS_DESKTOP = [
  "apoiadores-col-ident",
  "apoiadores-col-municipio",
  "apoiadores-col-lider",
  "apoiadores-col-integral",
  "apoiadores-col-30",
  "apoiadores-col-parcerias-stack",
];

function classeColunaApoiadores(el) {
  return Array.from(el?.classList || []).find((c) => c.startsWith("apoiadores-col-"));
}

function reordenarColunasTabelaParcerias(table, ordem) {
  if (!table?.classList?.contains("parcerias-tabela")) return;

  const colgroup = table.querySelector("colgroup");
  if (colgroup) {
    const mapCol = new Map(
      [...colgroup.children].map((col) => [classeColunaApoiadores(col), col])
    );
    ordem.forEach((cls) => {
      const col = mapCol.get(cls);
      if (col) colgroup.appendChild(col);
    });
  }

  table.querySelectorAll("thead tr, tbody tr").forEach((tr) => {
    const mapCell = new Map(
      [...tr.children].map((cell) => [classeColunaApoiadores(cell), cell])
    );
    ordem.forEach((cls) => {
      const cell = mapCell.get(cls);
      if (cell) tr.appendChild(cell);
    });
  });
}

function sincronizarLargurasColunasParcerias(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 1199.98px)").matches;
  const larguras = largurasColunasParcerias();
  const colsMobile = new Set([
    "apoiadores-col-ident",
    "apoiadores-col-lider",
    "apoiadores-col-parcerias-stack",
  ]);
  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find((c) => c.startsWith("apoiadores-col-"));
      if (mobile) {
        if (!cls || !colsMobile.has(cls)) {
          col.style.width = "0";
        } else if (larguras[cls] != null) {
          col.style.width = larguras[cls];
        }
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

  const mobile = window.matchMedia("(max-width: 1199.98px)").matches;
  const ordem = mobile
    ? ORDEM_COLUNAS_PARCERIAS_MOBILE
    : ORDEM_COLUNAS_PARCERIAS_DESKTOP;
  reordenarColunasTabelaParcerias(headTable, ordem);
  reordenarColunasTabelaParcerias(bodyTable, ordem);

  sincronizarLargurasColunasParcerias(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function badgeOrcamentoHtml(r) {
  const s = String(r.orcamento ?? "").trim();
  if (!s && parseNumero(r.orcamento) <= 0) return "";
  return `<span class="apoiadores-fin-badge">${exibirMoeda(r.orcamento)}</span>`;
}

function badgeRepasseHtml(r) {
  if (parseNumero(r.repasseParceria) <= 0) return "";
  return `<span class="apoiadores-fin-badge">${exibirMoeda(r.repasseParceria)}</span>`;
}

function htmlPopoverRepasseParceria(r) {
  const badge = badgeRepasseHtml(r);
  if (!badge) return "";
  return `<div class="apoiadores-popover-linha apoiadores-popover-linha--fin apoiadores-popover-linha--repasse-parceria">
    <span class="apoiadores-popover-rotulo">repasse parceria</span>
    <span class="apoiadores-popover-fin apoiadores-popover-fin--badge">${badge}</span>
  </div>`;
}

function tituloPopoverParceria(r) {
  return String(r.lideranca ?? "").trim() || "—";
}

function itemPopoverMoedaParceria(r, linha) {
  const fin = fmtMoeda.format(parseNumero(r[linha.prop]));
  const temMarcador = Boolean(linha.marcador);
  let rotuloClass = temMarcador
    ? "apoiadores-popover-rotulo apoiadores-popover-rotulo--com-marcador"
    : "apoiadores-popover-rotulo";
  if (linha.preserveCase) rotuloClass += " apoiadores-popover-rotulo--case";
  const marcador = temMarcador
    ? `<span class="orcamento-geral-popover-marcador ${linha.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha apoiadores-popover-linha--fin">
    <span class="${rotuloClass}">${marcador}${linha.rotulo}</span>
    <span class="apoiadores-popover-fin">${fin}</span>
  </div>`;
}

function tituloImpressaoPopoverParceria(r) {
  const partes = [
    String(r.lideranca ?? "").trim(),
    String(r.municipio ?? "").trim(),
    String(r.parceria ?? "").trim(),
  ].filter(Boolean);
  return partes.join(" · ") || "parceria";
}

function htmlPopoverParceria(r) {
  const lideranca = exibirTexto(r.lideranca) || "—";
  const parceria = exibirTexto(r.parceria) || "—";
  const municipio = exibirTexto(r.municipio);
  const badgeOrcamento = badgeOrcamentoHtml(r);
  const despesas = LINHAS_POPOVER_DESPESAS
    .map((linha) => itemPopoverMoedaParceria(r, linha))
    .join("");

  return `<div class="orcamento-geral-popover-corpo apoiadores-popover-corpo">
    <div class="apoiadores-popover-cabecalho">
      <div class="apoiadores-popover-topo">
        <span class="apoiadores-popover-lideranca apoiadores-ident-nome-linha">
          <span class="apoiadores-ident-nome-texto">${lideranca}</span>
        </span>
        ${badgeOrcamento}
      </div>
      <div class="apoiadores-popover-municipio-linha">
        ${municipio ? `<span class="apoiadores-popover-municipio-muted">${municipio}</span>` : "<span></span>"}
        ${PopoverTabela.htmlBotaoImprimir(
          tituloImpressaoPopoverParceria(r),
          r._popoverPrintKey || `par-${r._linha}`
        )}
      </div>
      <hr class="apoiadores-popover-divisor" aria-hidden="true">
    </div>
    <div class="apoiadores-popover-tabela">
      <div class="apoiadores-popover-linha apoiadores-popover-linha--fin apoiadores-popover-linha--parceria-nome">
        <span class="apoiadores-popover-rotulo">parceria</span>
        <span class="apoiadores-popover-fin apoiadores-popover-parceria-nome">${parceria}</span>
      </div>
      ${htmlPopoverRepasseParceria(r)}
      ${despesas}
    </div>
  </div>`;
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const liderancaHtml = exibirTexto(r.lideranca);
  const parceriaHtml = exibirTexto(r.parceria);
  const orcamentoHtml = exibirMoeda(r.orcamento);
  const repasseHtml = exibirMoeda(r.repasseParceria);
  const municipioSub = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";

  return `<tr class="apoiadores-linha-popover" tabindex="0" aria-label="detalhes da parceria">
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">${liderancaHtml}</span>
      <span class="apoiadores-celula-mobile">
        <span class="dashboard-municipio-celula">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
          <span class="dashboard-municipio-texto">
            <span class="dashboard-municipio-nome apoiadores-celula-texto-wrap">
              <span class="apoiadores-ident-stack apoiadores-ident-stack--mobile">
                <span class="apoiadores-ident-nome">${liderancaHtml || municipioHtml}</span>
                ${municipioSub}
              </span>
            </span>
          </span>
        </span>
      </span>
    </td>
    <td class="apoiadores-col-lider apoiadores-celula-texto">${parceriaHtml}</td>
    <td class="text-end apoiadores-col-parcerias-stack orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">
        <span class="orcamento-tabela-stack-valor parcerias-stack-orcamento apoiadores-celula-num">${orcamentoHtml}</span>
        <span class="orcamento-tabela-stack-valor parcerias-stack-repasse apoiadores-celula-num">${repasseHtml}</span>
      </div>
    </td>
    <td class="apoiadores-col-municipio parcerias-col-desk orcamento-tabela-desktop-col">
      <span class="dashboard-municipio-celula">
        <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
        <span class="dashboard-municipio-texto">
          <span class="dashboard-municipio-nome">${municipioHtml}</span>
        </span>
      </span>
    </td>
    <td class="text-end apoiadores-col-integral apoiadores-celula-num parcerias-col-desk orcamento-tabela-desktop-col parcerias-col-orcamento-desk">${orcamentoHtml}</td>
    <td class="text-end apoiadores-col-30 apoiadores-celula-num parcerias-col-desk orcamento-tabela-desktop-col">${repasseHtml}</td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = aplicarOrdenacaoParcerias(linhasFiltradas());

  el.vazio.hidden = true;

  if (!linhas.length) {
    limparKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma região</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhuma parceria para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  popoverTabela.inicializar({
    corpo: el.corpo,
    seletorLinha: "tr.apoiadores-linha-popover",
    linhas: filtradas,
    htmlConteudo: htmlPopoverParceria,
    tituloImpressao: tituloImpressaoPopoverParceria,
    printKey: (r, idx) => `par-${r._linha ?? idx}`,
  });
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

function htmlCardsRelatorioPagina(doc) {
  const root = doc || document;
  const mainGrid = root.querySelector(".parcerias-kpi-grid");
  const parceiros = root.querySelector(".parcerias-kpi-parceiros-section");
  if (!mainGrid && !parceiros) return "";

  let html =
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2><div class="rel-parcerias-kpis">';

  if (mainGrid) {
    const clone = mainGrid.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone.querySelectorAll(".apoiadores-th-sort").forEach((el) => el.remove());
    html += '<div class="rel-parcerias-kpis-principais">' + clone.outerHTML + "</div>";
  }

  if (parceiros) {
    const clone = parceiros.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    html += clone.outerHTML;
  }

  html += "</div></section>";
  return html;
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("parcerias-tabela")) return;

  table.querySelectorAll(".apoiadores-th-sort, .apoiadores-th-ordenavel-rotulo").forEach((el) => {
    if (el.classList.contains("apoiadores-th-ordenavel-rotulo")) return;
    el.remove();
  });
  table.querySelectorAll(".apoiadores-th-ordenavel").forEach((el) => {
    const rotulo = el.querySelector(".apoiadores-th-ordenavel-rotulo");
    if (rotulo) {
      el.replaceWith(rotulo.cloneNode(true));
    }
  });

  const thIdent = table.querySelector("thead th.apoiadores-col-ident");
  if (thIdent) {
    thIdent.className = "apoiadores-col-ident dashboard-th-base";
    thIdent.innerHTML =
      '<span class="dashboard-th-principal">liderança</span>' +
      '<span class="dashboard-th-sub text-muted apoiadores-th-sub-municipio">município</span>';
  }

  const thParceria = table.querySelector("thead th.parcerias-th-parceria");
  if (thParceria) {
    thParceria.className = "apoiadores-col-lider";
    thParceria.textContent = "parceria";
  }

  table.querySelectorAll("tbody tr").forEach((tr) => {
    const identTd = tr.querySelector("td.apoiadores-col-ident");
    const munTd = tr.querySelector("td.apoiadores-col-municipio");
    const liderancaHtml =
      identTd?.querySelector(".apoiadores-celula-desktop")?.innerHTML?.trim() || "";
    const municipioTexto =
      munTd?.querySelector(".dashboard-municipio-nome")?.textContent?.trim() || "";

    if (identTd) {
      identTd.className = "apoiadores-col-ident apoiadores-col-ident--rel";
      identTd.innerHTML =
        `<span class="apoiadores-rel-ident-nome">${liderancaHtml || escapeHtml(municipioTexto)}</span>` +
        (municipioTexto && liderancaHtml
          ? `<span class="apoiadores-rel-ident-municipio">${escapeHtml(municipioTexto)}</span>`
          : "");
    }

    munTd?.remove();
    identTd?.querySelectorAll(".apoiadores-celula-mobile").forEach((el) => el.remove());
  });

  table.querySelectorAll("th.apoiadores-col-municipio, td.apoiadores-col-municipio").forEach((el) =>
    el.remove()
  );
  table.querySelectorAll("th.orcamento-tabela-stack-col, td.orcamento-tabela-stack-col").forEach((el) =>
    el.remove()
  );
}

function estilosRelatorioPagina() {
  const coresParceiros =
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--0 .parcerias-kpi-parceiro-card{background:#eef2ff!important;border-left:3px solid #4f46e5!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--0 .parcerias-kpi-parceiro-valor{color:#4338ca!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--1 .parcerias-kpi-parceiro-card{background:#ccfbf1!important;border-left:3px solid #0f766e!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--1 .parcerias-kpi-parceiro-valor{color:#0f766e!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--2 .parcerias-kpi-parceiro-card{background:#fef3c7!important;border-left:3px solid #b45309!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--2 .parcerias-kpi-parceiro-valor{color:#b45309!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--3 .parcerias-kpi-parceiro-card{background:#ede9fe!important;border-left:3px solid #7c3aed!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--3 .parcerias-kpi-parceiro-valor{color:#6d28d9!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--4 .parcerias-kpi-parceiro-card{background:#dbeafe!important;border-left:3px solid #1f4e8c!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--4 .parcerias-kpi-parceiro-valor{color:#1e40af!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--5 .parcerias-kpi-parceiro-card{background:#ffe4e6!important;border-left:3px solid #e11d48!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-tono--5 .parcerias-kpi-parceiro-valor{color:#be123c!important;}";

  return (
    ".page-parcerias .rel-secao{margin:0.35rem 0 0.45rem;page-break-inside:auto!important;break-inside:auto!important;}" +
    ".page-parcerias .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-parcerias .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:auto!important;break-after:auto!important;}" +
    ".page-parcerias .rel-secao + .rel-secao{margin-top:0.35rem;page-break-before:auto!important;break-before:auto!important;}" +
    ".page-parcerias .rel-parcerias-kpis{margin-top:0.2rem;}" +
    ".page-parcerias .rel-parcerias-kpis-principais .parcerias-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:8px;}" +
    ".page-parcerias .rel-parcerias-kpis .apoiadores-kpi-slot{min-width:0;}" +
    ".page-parcerias .rel-parcerias-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-parcerias .rel-parcerias-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.45rem;min-width:0;}" +
    ".page-parcerias .rel-parcerias-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-parcerias .rel-parcerias-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-parcerias .rel-parcerias-kpis .apoiadores-kpi-total .dashboard-kpi-card{border-left:3px solid #1f4e8c!important;}" +
    ".page-parcerias .rel-parcerias-kpis .apoiadores-kpi-lider .dashboard-kpi-card{border-left:3px solid #4f46e5!important;}" +
    ".page-parcerias .rel-parcerias-kpis .apoiadores-kpi-30 .dashboard-kpi-card{border-left:3px solid #1f4e8c!important;}" +
    ".page-parcerias .rel-parcerias-kpis .apoiadores-kpi-custom .dashboard-kpi-card{border-left:3px solid #0f766e!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiros-section{margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(15,23,42,0.08);page-break-inside:auto!important;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiros-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,10.5rem));gap:0.35rem;justify-content:start;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiros-grid .apoiadores-kpi-slot{max-width:10.5rem;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-nome{white-space:normal;word-break:break-word;line-height:1.2;}" +
    ".page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-valor{white-space:nowrap;}" +
    coresParceiros +
    ".page-parcerias table.rel-tabela.parcerias-tabela{font-size:8pt;margin-top:0.15rem;}" +
    ".page-parcerias table.rel-tabela.parcerias-tabela td.apoiadores-col-ident--rel .apoiadores-rel-ident-nome{display:block;font-weight:600;line-height:1.25;}" +
    ".page-parcerias table.rel-tabela.parcerias-tabela td.apoiadores-col-ident--rel .apoiadores-rel-ident-municipio{display:block;margin-top:0.12rem;font-size:7pt;line-height:1.2;color:#64748b;}" +
    ".page-parcerias table.rel-tabela.parcerias-tabela th.apoiadores-col-lider,.page-parcerias table.rel-tabela.parcerias-tabela td.apoiadores-col-lider{text-align:left;}" +
    ".page-parcerias table.rel-tabela.parcerias-tabela th.apoiadores-col-integral,.page-parcerias table.rel-tabela.parcerias-tabela td.apoiadores-col-integral," +
    ".page-parcerias table.rel-tabela.parcerias-tabela th.apoiadores-col-30,.page-parcerias table.rel-tabela.parcerias-tabela td.apoiadores-col-30{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    "@media print{" +
    ".page-parcerias .rel-secao,.page-parcerias .rel-secao-indicadores,.page-parcerias .rel-secao + .rel-secao,.page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiros-section{page-break-before:auto!important;break-before:auto!important;page-break-after:auto!important;break-after:auto!important;page-break-inside:auto!important;break-inside:auto!important;}" +
    ".page-parcerias .rel-parcerias-kpis .dashboard-kpi-card,.page-parcerias .rel-parcerias-kpis .parcerias-kpi-parceiro-card{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function montarCabecalhoOrdenacaoParcerias(card) {
  if (!card) return;
  TabelaOrdenacao.montarCabecalhoLiderancaMunicipio(card);
  const thParceria = card.querySelector(".parcerias-th-parceria");
  if (thParceria) {
    const desk = thParceria.querySelector(".apoiadores-th-desktop");
    if (desk && !desk.classList.contains("apoiadores-th-ordenavel")) {
      desk.outerHTML = TabelaOrdenacao.htmlCabecalhoOrdenavel(
        "parceria",
        "parceria",
        "apoiadores-th-desktop"
      );
    }
    const mobile = thParceria.querySelector(".apoiadores-th-mobile");
    if (mobile && !mobile.querySelector(`.${TabelaOrdenacao.SORT_BTN_CLASS}`)) {
      mobile.innerHTML = TabelaOrdenacao.htmlMobileLinhaOrdenavel(
        "parceria",
        "parceria",
        "dashboard-th-principal"
      );
    }
  }
}

function initParcerias() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaParceria: document.getElementById("buscaParceria"),
    corpo: document.getElementById("corpoParcerias"),
    vazio: document.getElementById("vazio"),
    kpiFederal: document.getElementById("kpiFederal"),
    kpiParcerias: document.getElementById("kpiParcerias"),
    kpiMunicipios: document.getElementById("kpiMunicipios"),
    kpiRepasseParceria: document.getElementById("kpiRepasseParceria"),
    kpiPorParceria: document.getElementById("kpiPorParceria"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  const cardOrdenacao = document.querySelector(".parcerias-tabela-card");
  montarCabecalhoOrdenacaoParcerias(cardOrdenacao);
  TabelaOrdenacao.vincular(cardOrdenacao, ordenacaoParcerias, renderizarTabela, "ordenacaoParcerias");

  el.buscaParceria?.addEventListener("input", renderizarTabela);
  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarParcerias();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initParcerias);
