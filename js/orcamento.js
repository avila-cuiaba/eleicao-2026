// Página orçamento: planilha orcamento (município + colunas de orçamento).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ORCAMENTO;
const cfgPessoal = CONFIG.PESSOAL;
const cfgOrcApoiadores = cfgPessoal.ORCAMENTO_POR_LIDERANCA;
const cfgApoiadores = cfgPessoal.APOIADORES;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 8;

const ICONE_FECHADO_ORCAMENTO =
  '<i class="fa-solid fa-badge-check" aria-hidden="true"></i>';

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

const CAMPOS_APOIADOR_PLANILHA = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "pessoal", chave: "PESSOAL", aliases: ["pessoal", "contratos-distribuidos-apoiadores"] },
  {
    prop: "combustivel",
    chave: "COMBUSTIVEL",
    aliases: ["combustivel", "combustível", "orcamento-combustivel", "orcamento combustivel"],
  },
  { prop: "diversos", chave: "DIVERSOS", aliases: ["diversos", "orcamento-diversos"] },
  {
    prop: "diaD",
    chave: "DIA_D",
    aliases: ["dia d", "dia-d", "diad", "orcamento-diad", "orcamento dia d"],
  },
];

let el = {};
let linhas = [];
let linhasApoiadores = [];
let apoiadoresPorMunicipio = new Map();
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

function valorFechadoOrcamentoSim(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val == null || val === "") return false;
  const s = normalizarChave(val);
  if (s === "nao" || s === "n" || s === "false" || s === "0" || s === "no") return false;
  return s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes" || s === "x";
}

function htmlIconeFechadoOrcamento(item) {
  const ok = valorFechadoOrcamentoSim(item.fechadoOrcamento);
  const classe = ok
    ? "apoiadores-icone-fechado apoiadores-icone-fechado--sim"
    : "apoiadores-icone-fechado apoiadores-icone-fechado--nao";
  const titulo = ok ? "orçamento fechado" : "orçamento aberto";
  return `<span class="${classe}" title="${titulo}" aria-label="${titulo}">${ICONE_FECHADO_ORCAMENTO}</span>`;
}

function htmlLiderancaApoiadorComFechado(ap) {
  return (
    `<span class="apoiadores-ident-nome-linha">` +
    `${htmlIconeFechadoOrcamento(ap)}` +
    `<span class="apoiadores-ident-nome-texto">${escapeHtml(ap.lideranca)}</span>` +
    `</span>`
  );
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
  if (!s || s === "-" || s === "—") return "";
  const n = parseNumero(val);
  if (!Number.isFinite(n) || n === 0) return "";
  return fmtMoeda.format(n);
}

function exibirMoedaKpi(val) {
  const n = typeof val === "number" ? val : parseNumero(val);
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
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

function registroEhNulo(item) {
  return totalLinha(item) === 0;
}

function visualizarRegistrosNulosAtivo() {
  return !!el.visualizarRegistrosNulos?.checked;
}

function aplicarFiltroRegistrosNulos(lista) {
  if (visualizarRegistrosNulosAtivo()) return lista;
  return lista.filter((item) => !registroEhNulo(item));
}

function linhasFiltradas() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const todasMarcadas = selecionadas.length === regioes.length;
  const termo = termoBuscaMunicipio();

  const filtradas = linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }

    if (termo && !normalizarChave(item.municipio).includes(termo)) return false;
    return true;
  });

  return aplicarFiltroRegistrosNulos(filtradas);
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
  el.kpiPessoal.textContent = exibirMoedaKpi(somarNumerico(filtradas, "pessoal"));
  el.kpiCombustivel.textContent = exibirMoedaKpi(somarNumerico(filtradas, "combustivel"));
  el.kpiDiversos.textContent = exibirMoedaKpi(somarNumerico(filtradas, "diversos"));
  el.kpiDiaD.textContent = exibirMoedaKpi(somarNumerico(filtradas, "diaD"));
  el.kpiTotal.textContent = exibirMoedaKpi(somarTotalGeral(filtradas));
}

function limparKpis() {
  el.kpiPessoal.textContent = "";
  el.kpiCombustivel.textContent = "";
  el.kpiDiversos.textContent = "";
  el.kpiDiaD.textContent = "";
  el.kpiTotal.textContent = "";
}

function zerarKpis() {
  el.kpiPessoal.textContent = "";
  el.kpiCombustivel.textContent = "";
  el.kpiDiversos.textContent = "";
  el.kpiDiaD.textContent = "";
  el.kpiTotal.textContent = "";
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

function resolverIndicesApoiador(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const indices = {};

  CAMPOS_APOIADOR_PLANILHA.forEach((campo) => {
    let idx = normalizados.findIndex((n) =>
      campo.aliases.some((alias) => normalizarChave(alias) === n)
    );
    if (idx === -1 && cfgOrcApoiadores.COLUNAS[campo.chave] != null) {
      idx = cfgOrcApoiadores.COLUNAS[campo.chave];
    }
    indices[campo.prop] = idx;
  });

  const aliasesFechado = [
    "FECHADO-ORCAMENTO",
    "fechado-orcamento",
    "fechado orcamento",
    "orcamento-fechado",
    "orcamento fechado",
    "fechado orçamento",
    "fechado-orçamento",
  ];
  let idxFechado = normalizados.findIndex((n) =>
    aliasesFechado.some((alias) => normalizarChave(alias) === n)
  );
  if (idxFechado === -1 && cfgApoiadores.COLUNAS.FECHADO_ORCAMENTO != null) {
    idxFechado = cfgApoiadores.COLUNAS.FECHADO_ORCAMENTO;
  }
  indices.fechadoOrcamento = idxFechado;

  return indices;
}

function linhaApoiadorTemConteudo(item) {
  const lideranca = String(item.lideranca ?? "").trim();
  const municipio = String(item.municipio ?? "").trim();
  if (!lideranca || !municipio) return false;
  return (
    parseNumero(item.pessoal) > 0 ||
    parseNumero(item.combustivel) > 0 ||
    parseNumero(item.diversos) > 0 ||
    parseNumero(item.diaD) > 0 ||
    celulaPreenchida(item.pessoal) ||
    celulaPreenchida(item.combustivel) ||
    celulaPreenchida(item.diversos) ||
    celulaPreenchida(item.diaD)
  );
}

function calcularTotalApoiador(item) {
  return (
    parseNumero(item.pessoal) +
    parseNumero(item.combustivel) +
    parseNumero(item.diversos) +
    parseNumero(item.diaD)
  );
}

function extrairLinhasApoiadores(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndicesApoiador(valores[0]);
  const itens = [];

  for (let i = cfgOrcApoiadores.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const lideranca = String(valorCampo(linha, indices.lideranca) ?? "").trim();
    if (!municipio || !lideranca) continue;

    const info = mapaMunicipioRegiao.get(normalizarChave(municipio));
    if (!info?.regiaoNorm) continue;

    const item = {
      lideranca,
      municipio,
      pessoal: valorCampo(linha, indices.pessoal),
      combustivel: valorCampo(linha, indices.combustivel),
      diversos: valorCampo(linha, indices.diversos),
      diaD: valorCampo(linha, indices.diaD),
      fechadoOrcamento: valorCampo(linha, indices.fechadoOrcamento),
      regiao: info.regiao,
      regiaoNorm: info.regiaoNorm,
    };
    item.finTotal = calcularTotalApoiador(item);

    if (!linhaApoiadorTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort((a, b) => {
    const cmp = String(a.municipio ?? "").localeCompare(String(b.municipio ?? ""), "pt-BR", {
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
    return String(a.lideranca ?? "").localeCompare(String(b.lideranca ?? ""), "pt-BR", {
      sensitivity: "base",
    });
  });

  return itens;
}

function montarMapaApoiadoresPorMunicipio(itens) {
  const mapa = new Map();
  itens.forEach((item) => {
    const chave = normalizarChave(item.municipio);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(item);
  });

  mapa.forEach((lista) => {
    lista.sort((a, b) =>
      String(a.lideranca ?? "").localeCompare(String(b.lideranca ?? ""), "pt-BR", {
        sensitivity: "base",
      })
    );
  });

  return mapa;
}

function apoiadoresDoMunicipio(municipio) {
  return apoiadoresPorMunicipio.get(normalizarChave(municipio)) || [];
}

function htmlLinhaApoiador(ap) {
  const totalExib = exibirMoeda(ap.finTotal);
  const colsNum = CAMPOS_NUMERICOS.map(
    (c) =>
      `<td class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop} apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(ap[c.prop])}</td>`
  ).join("");
  const stackPessoal =
    valorCampoStack("pessoal", ap.pessoal) + valorCampoStack("combustivel", ap.combustivel);
  const stackDiversos =
    valorCampoStack("diversos", ap.diversos) + valorCampoStack("diad", ap.diaD);

  return (
    `<tr class="orcamento-estratificado-linha-apoiador" hidden>` +
    `<td class="orcamento-col-municipio">` +
    `<span class="dashboard-municipio-celula">` +
    `<span class="dashboard-regiao-marcador orcamento-estratificado-apoiador-marcador-vazio" aria-hidden="true"></span>` +
    `<span class="dashboard-municipio-texto">` +
    `<span class="orcamento-estratificado-municipio-linha">` +
    `<span class="orcamento-estratificado-expansor orcamento-estratificado-expansor--vazio" aria-hidden="true"></span>` +
    `<span class="orcamento-estratificado-apoiador-ident">${htmlLiderancaApoiadorComFechado(ap)}</span>` +
    `</span>` +
    `</span>` +
    `</span>` +
    `</td>` +
    colsNum +
    `<td class="text-end orcamento-col-total apoiadores-celula-num orcamento-tabela-desktop-col">` +
    `${totalExib ? `<span class="orcamento-tabela-celula-direita">${totalExib}</span>` : ""}` +
    `</td>` +
    `<td class="text-end orcamento-col-stack-pessoal orcamento-tabela-stack-col">` +
    `<div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackPessoal}</div>` +
    `</td>` +
    `<td class="text-end orcamento-col-stack-diversos orcamento-tabela-stack-col">` +
    `<div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackDiversos}</div>` +
    `</td>` +
    `</tr>`
  );
}

function linhasApoiadorDoMaster(tr) {
  const rows = [];
  let next = tr.nextElementSibling;
  while (next?.classList.contains("orcamento-estratificado-linha-apoiador")) {
    rows.push(next);
    next = next.nextElementSibling;
  }
  return rows;
}

function fecharDetalhesAbertos() {
  el.corpo?.querySelectorAll(".orcamento-estratificado-linha-aberta").forEach((row) => {
    row.classList.remove("orcamento-estratificado-linha-aberta");
    row.setAttribute("aria-expanded", "false");
    linhasApoiadorDoMaster(row).forEach((linha) => {
      linha.hidden = true;
    });
  });
}

function aoClicarLinhaMaster(ev) {
  const tr = ev.target.closest("tr.orcamento-estratificado-linha-master");
  if (!tr || !el.corpo?.contains(tr) || tr.classList.contains("orcamento-estratificado-linha-sem-detalhe")) return;

  const apoiadorRows = linhasApoiadorDoMaster(tr);
  if (!apoiadorRows.length) return;

  const estavaAberto = tr.classList.contains("orcamento-estratificado-linha-aberta");
  fecharDetalhesAbertos();

  if (!estavaAberto) {
    tr.classList.add("orcamento-estratificado-linha-aberta");
    tr.setAttribute("aria-expanded", "true");
    apoiadorRows.forEach((linha) => {
      linha.hidden = false;
    });
  } else {
    tr.setAttribute("aria-expanded", "false");
  }

  notificarAlturaFrame();
  requestAnimationFrame(alinharColunasTabela);
}

function valorStackVisivel(val) {
  if (!celulaPreenchida(val)) return false;
  const n = parseNumero(val);
  return !Number.isFinite(n) || n !== 0;
}

function valorCampoStack(prop, valor) {
  if (!valorStackVisivel(valor)) {
    return '<span class="orcamento-estratificado-stack-valor-linha orcamento-estratificado-stack-valor-linha--vazio"></span>';
  }
  return (
    '<span class="orcamento-estratificado-stack-valor-linha">' +
    '<span class="orcamento-tabela-stack-valor">' +
    exibirMoeda(valor) +
    "</span>" +
    '<span class="orcamento-estratificado-campo-ponto orcamento-estratificado-campo-ponto--' +
    prop +
    '" aria-hidden="true"></span></span>'
  );
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const apoiadores = apoiadoresDoMunicipio(r.municipio);
  const temApoiadores = apoiadores.length > 0;
  const expansor =
    temApoiadores
      ? `<span class="orcamento-estratificado-expansor" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>`
      : "";

  const colsNum = CAMPOS_NUMERICOS.map(
    (c) =>
      `<td class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop} apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r[c.prop])}</td>`
  ).join("");

  const total = totalLinha(r);
  const totalExib = exibirMoeda(total);
  const stackPessoal =
    valorCampoStack("pessoal", r.pessoal) + valorCampoStack("combustivel", r.combustivel);
  const stackDiversos =
    valorCampoStack("diversos", r.diversos) + valorCampoStack("diad", r.diaD);

  const master =
    `<tr class="orcamento-estratificado-linha-master${temApoiadores ? "" : " orcamento-estratificado-linha-sem-detalhe"}"${temApoiadores ? " tabindex=\"0\" aria-expanded=\"false\"" : ""} aria-label="detalhes do município ${municipioHtml}">` +
    `<td class="orcamento-col-municipio">` +
    `<span class="dashboard-municipio-celula">` +
    `<span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>` +
    `<span class="dashboard-municipio-texto">` +
    `<span class="dashboard-municipio-nome orcamento-estratificado-municipio-linha">` +
    expansor +
    `<span>${municipioHtml}</span>` +
    `</span>` +
    `${totalExib ? `<span class="orcamento-municipio-total-mobile orcamento-total-badge">${totalExib}</span>` : ""}` +
    `</span>` +
    `</span>` +
    `</td>` +
    colsNum +
    `<td class="text-end orcamento-col-total apoiadores-celula-num orcamento-tabela-desktop-col">` +
    `${totalExib ? `<span class="orcamento-tabela-celula-direita">${totalExib}</span>` : ""}` +
    `</td>` +
    `<td class="text-end orcamento-col-stack-pessoal orcamento-tabela-stack-col">` +
    `<div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackPessoal}</div>` +
    `</td>` +
    `<td class="text-end orcamento-col-stack-diversos orcamento-tabela-stack-col">` +
    `<div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackDiversos}</div>` +
    `</td>` +
    `</tr>`;

  const apoiadoresHtml = apoiadores.map(htmlLinhaApoiador).join("");

  return master + apoiadoresHtml;
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

function montar(valoresOrcamento, valoresApoiadores) {
  linhas = extrairLinhas(valoresOrcamento);
  linhasApoiadores = extrairLinhasApoiadores(valoresApoiadores || []);
  apoiadoresPorMunicipio = montarMapaApoiadoresPorMunicipio(linhasApoiadores);
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
    const [valoresOrcamento, valoresMunicipios, valoresApoiadores] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
      fetchPlanilha(cfgPessoal.PLANILHA_APOIADORES).catch(() => []),
    ]);

    if (valoresOrcamento === null) {
      limparStatus();
      return;
    }

    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresOrcamento, valoresApoiadores);
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

function htmlCardsRelatorioPagina(doc) {
  const layout = (doc || document).querySelector(".orcamento-kpi-layout");
  if (!layout) return "";

  const clone = layout.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-orcamento-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function htmlRelatorioLinhaMaster(r) {
  const totalExib = exibirMoeda(totalLinha(r));
  return (
    `<tr class="orcamento-estratificado-rel-master">` +
    `<td class="orcamento-col-municipio"><strong>${escapeHtml(r.municipio)}</strong></td>` +
    CAMPOS_NUMERICOS.map(
      (c) =>
        `<td class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop}">${exibirMoeda(r[c.prop])}</td>`
    ).join("") +
    `<td class="text-end orcamento-col-total">${totalExib}</td>` +
    `</tr>`
  );
}

function htmlRelatorioLinhaApoiador(ap) {
  const totalExib = exibirMoeda(ap.finTotal);
  return (
    `<tr class="orcamento-estratificado-rel-detail">` +
    `<td class="orcamento-col-municipio orcamento-estratificado-rel-apoiador">${htmlLiderancaApoiadorComFechado(ap)}</td>` +
    CAMPOS_NUMERICOS.map(
      (c) =>
        `<td class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop}">${exibirMoeda(ap[c.prop])}</td>`
    ).join("") +
    `<td class="text-end orcamento-col-total">${totalExib}</td>` +
    `</tr>`
  );
}

function htmlTabelaRelatorioMasterDetail(filtradas) {
  const thead =
    "<thead><tr>" +
    "<th class=\"orcamento-col-municipio\">município / liderança</th>" +
    CAMPOS_NUMERICOS.map(
      (c) => `<th class="text-end orcamento-col-${c.prop === "diaD" ? "diad" : c.prop}">${escapeHtml(c.rotulo)}</th>`
    ).join("") +
    "<th class=\"text-end orcamento-col-total\">total</th>" +
    "</tr></thead>";

  const tbody =
    "<tbody>" +
    filtradas
      .map((r) => {
        const apoiadores = apoiadoresDoMunicipio(r.municipio);
        return htmlRelatorioLinhaMaster(r) + apoiadores.map(htmlRelatorioLinhaApoiador).join("");
      })
      .join("") +
    "</tbody>";

  return (
    '<table class="rel-tabela orcamento-estratificado-tabela orcamento-estratificado-rel-md">' +
    thead +
    tbody +
    "</table>"
  );
}

function coletarTabelasRelatorioPagina(doc) {
  const filtradas = [...linhasFiltradas()].sort(ordenarLinhas);
  if (!filtradas.length) return [];

  return [
    {
      titulo: "orçamento por município",
      html: htmlTabelaRelatorioMasterDetail(filtradas),
    },
  ];
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("orcamento-estratificado-tabela")) return;

  const thMun = table.querySelector("thead th.orcamento-col-municipio");
  if (thMun && !table.classList.contains("orcamento-estratificado-rel-md")) {
    thMun.className = "orcamento-col-municipio";
    thMun.textContent = "município";
  }
}

function estilosRelatorioPagina() {
  return (
    ".page-orcamento .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-orcamento .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-orcamento .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-orcamento .rel-orcamento-kpis{margin-top:0.2rem;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-layout{display:flex;flex-direction:column;gap:8px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-row-total{display:flex;justify-content:center;width:100%;margin:0;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-row-total > .col-12{flex:0 0 33%;max-width:33%;width:33%;padding:0;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-row-detalhe{display:flex;gap:8px;width:100%;margin:0;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-row-detalhe > [class*='col-']{flex:1 1 0;min-width:0;padding:0;max-width:none;width:auto;}" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-card-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.2rem;padding:0.35rem 0.3rem;}" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-rotulo," +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-valor{text-align:center;width:100%;}" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra{display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;width:28px;height:28px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra svg{width:16px;height:16px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-card-total{background:linear-gradient(155deg,#ecfeff 0%,#cffafe 50%,#a5f3fc 100%)!important;border:1px solid rgba(8,145,178,0.22)!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-card-total .dashboard-kpi-rotulo{font-weight:700;color:#0e7490;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-valor-total{font-size:10pt;font-weight:800!important;color:#0e7490;line-height:1.1;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-total{background:linear-gradient(145deg,#22d3ee,#0891b2);color:#fff;width:32px;height:32px;box-shadow:0 2px 6px rgba(8,145,178,0.22);}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-total svg{width:18px;height:18px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-row-detalhe .dashboard-kpi-card{background:#f8fafc!important;}" +
    ".page-orcamento .rel-orcamento-kpis .apoiadores-kpi-total .dashboard-kpi-card{border-left:3px solid #16a34a!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-pessoal{background:linear-gradient(145deg,#4ade80,#16a34a);color:#fff;box-shadow:0 2px 6px rgba(22,163,74,0.22);}" +
    ".page-orcamento .rel-orcamento-kpis .apoiadores-kpi-30 .dashboard-kpi-card{border-left:3px solid #1f4e8c!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-diversos{background:linear-gradient(145deg,#a78bfa,#7c3aed);color:#fff;box-shadow:0 2px 6px rgba(124,58,237,0.22);}" +
    ".page-orcamento .rel-orcamento-kpis .apoiadores-kpi-lider .dashboard-kpi-card{border-left:3px solid #4f46e5!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-combustivel{background:linear-gradient(145deg,#fbbf24,#ea580c);color:#fff;box-shadow:0 2px 6px rgba(234,88,12,0.22);}" +
    ".page-orcamento .rel-orcamento-kpis .apoiadores-kpi-custom .dashboard-kpi-card{border-left:3px solid #0f766e!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra-diad{background:linear-gradient(145deg,#f87171,#dc2626);color:#fff;box-shadow:0 2px 6px rgba(220,38,38,0.22);}" +
    ".page-orcamento table.rel-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    ".page-orcamento table.rel-tabela th.orcamento-col-municipio," +
    ".page-orcamento table.rel-tabela td.orcamento-col-municipio{text-align:left;}" +
    ".page-orcamento table.rel-tabela th.orcamento-col-pessoal," +
    ".page-orcamento table.rel-tabela td.orcamento-col-pessoal," +
    ".page-orcamento table.rel-tabela th.orcamento-col-combustivel," +
    ".page-orcamento table.rel-tabela td.orcamento-col-combustivel," +
    ".page-orcamento table.rel-tabela th.orcamento-col-diversos," +
    ".page-orcamento table.rel-tabela td.orcamento-col-diversos," +
    ".page-orcamento table.rel-tabela th.orcamento-col-diad," +
    ".page-orcamento table.rel-tabela td.orcamento-col-diad," +
    ".page-orcamento table.rel-tabela th.orcamento-col-total," +
    ".page-orcamento table.rel-tabela td.orcamento-col-total{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-orcamento table.orcamento-estratificado-rel-md .orcamento-estratificado-rel-master td{background:#f1f5f9!important;}" +
    ".page-orcamento table.orcamento-estratificado-rel-md .orcamento-estratificado-rel-master strong{font-weight:700;color:#0f172a;}" +
    ".page-orcamento table.orcamento-estratificado-rel-md .orcamento-estratificado-rel-detail td{background:#fff;}" +
    ".page-orcamento table.orcamento-estratificado-rel-md .orcamento-estratificado-rel-apoiador{padding-left:1rem!important;color:#475569;font-size:7.5pt;}" +
    ".page-orcamento table.orcamento-estratificado-rel-md .orcamento-estratificado-rel-master + .orcamento-estratificado-rel-detail td{border-top:none;}" +
    "@media print{" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-card," +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.coletarTabelasRelatorioPagina = coletarTabelasRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function initOrcamento() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    visualizarRegistrosNulos: document.getElementById("visualizarRegistrosNulos"),
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
  el.visualizarRegistrosNulos?.addEventListener("change", renderizarTabela);
  el.corpo.addEventListener("click", aoClicarLinhaMaster);
  el.corpo.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const tr = ev.target.closest("tr.orcamento-estratificado-linha-master");
    if (!tr || !el.corpo.contains(tr)) return;
    ev.preventDefault();
    aoClicarLinhaMaster({ target: tr });
  });
  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarOrcamento();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initOrcamento);
