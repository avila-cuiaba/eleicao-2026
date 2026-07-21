// Página pagamentos — por liderança (réplica de orcamento-pessoal-apoiadores).

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PESSOAL;
const cfgOrc = cfg.ORCAMENTO_POR_LIDERANCA;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 8;

const CAMPOS_PLANILHA = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "pessoal", chave: "PESSOAL", aliases: ["pessoal", "contratos-distribuidos-apoiadores"] },
  {
    prop: "combustivel",
    chave: "COMBUSTIVEL",
    aliases: ["combustivel", "combustível", "orcamento-combustivel", "orcamento combustivel"],
  },
  { prop: "diversos", chave: "DIVERSOS", aliases: ["diversos", "orcamento-diversos"] },
  { prop: "diaD", chave: "DIA_D", aliases: ["dia d", "dia-d", "diad", "orcamento-diad", "orcamento dia d"] },
];

const LINHAS_ORCAMENTO_POPOVER = [
  { rotulo: "pessoal", prop: "pessoal", marcador: "popover-marcador--orc-pessoal" },
  { rotulo: "combustível", prop: "combustivel", marcador: "popover-marcador--orc-combustivel" },
  { rotulo: "diversos", prop: "diversos", marcador: "popover-marcador--orc-diversos" },
  { rotulo: "dia D", prop: "diaD", marcador: "popover-marcador--orc-diad", preserveCase: true },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();
let nomesColunaPlanilha = {};
let opcoesMunicipio = [];
let modalCrud = null;
let modoCrud = "inserir";
let linhaCrud = null;
const popoverTabela = PopoverTabela.criar();

function atualizarMetadadosPlanilha(valores) {
  const cab = valores[0] || [];
  const indices = resolverIndices(cab);
  nomesColunaPlanilha = {};
  CAMPOS_PLANILHA.forEach((campo) => {
    const idx = indices[campo.prop];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.aliases[0];
    }
  });
}

function dadosGravacaoApoiador(item) {
  const dados = {};
  CAMPOS_PLANILHA.forEach((campo) => {
    const chave = nomesColunaPlanilha[campo.prop];
    if (chave) dados[chave] = item[campo.prop] ?? "";
  });
  return dados;
}

function itemPorLinha(numLinha) {
  return linhas.find((r) => r._linha === numLinha) || null;
}

function lerFormularioApoiador() {
  return {
    lideranca: el.campoLideranca.value.trim(),
    municipio: el.campoMunicipio.value.trim(),
    pessoal: lerCampoMoeda(el.campoPessoal),
    combustivel: lerCampoMoeda(el.campoCombustivel),
    diversos: lerCampoMoeda(el.campoDiversos),
    diaD: lerCampoMoeda(el.campoDiaD),
  };
}

function extrairOpcoesMunicipio(valoresMunicipios) {
  const mapa = new Map();
  if (!valoresMunicipios?.length) return [];

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;
    const chave = normalizarChave(municipio);
    if (!mapa.has(chave)) mapa.set(chave, municipio);
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function montarSelectMunicipio(valorSelecionado) {
  if (!el.campoMunicipio) return;
  const atual = String(valorSelecionado ?? "").trim();
  const chaves = new Set(opcoesMunicipio.map((n) => normalizarChave(n)));
  const lista = [...opcoesMunicipio];
  if (atual && !chaves.has(normalizarChave(atual))) lista.push(atual);

  lista.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  el.campoMunicipio.innerHTML =
    '<option value="">selecione</option>' +
    lista
      .map((nome) => {
        const sel = atual && normalizarChave(nome) === normalizarChave(atual) ? " selected" : "";
        return `<option value="${escapeHtml(nome)}"${sel}>${escapeHtml(nome)}</option>`;
      })
      .join("");
}

function valorParaCampoMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return fmtMoeda.format(parseNumero(val));
}

function lerCampoMoeda(input) {
  const s = String(input?.value ?? "").trim();
  if (!s) return "";
  return parseNumero(s);
}

function preencherFormularioApoiador(item) {
  const dados = item || {};
  el.campoLideranca.value = String(dados.lideranca ?? "").trim();
  montarSelectMunicipio(dados.municipio ?? "");
  el.campoPessoal.value = valorParaCampoMoeda(dados.pessoal);
  el.campoCombustivel.value = valorParaCampoMoeda(dados.combustivel);
  el.campoDiversos.value = valorParaCampoMoeda(dados.diversos);
  el.campoDiaD.value = valorParaCampoMoeda(dados.diaD);
}

function abrirModalIncluirApoiador() {
  modoCrud = "inserir";
  linhaCrud = null;
  el.modalTitulo.textContent = "incluir orçamento";
  preencherFormularioApoiador({});
  modalCrud.show();
}

function abrirModalEditarApoiador(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  modoCrud = "atualizar";
  linhaCrud = numLinha;
  el.modalTitulo.textContent = "editar orçamento";
  preencherFormularioApoiador(item);
  modalCrud.show();
}

async function salvarApoiadorCrud() {
  const form = lerFormularioApoiador();
  if (!form.lideranca || !form.municipio) {
    MasterCrud.toast("preencha liderança e município.", "erro");
    return;
  }

  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvarApoiador });
  try {
    const payload = {
      acao: modoCrud === "atualizar" ? "atualizar" : "inserir",
      dados: dadosGravacaoApoiador(form),
      origem: "pagamentos-lideranca",
    };
    if (modoCrud === "atualizar") payload.linha = linhaCrud;

    await PlanilhaApi.gravar(cfg.PLANILHA_APOIADORES, payload);
    modalCrud.hide();
    MasterCrud.toast(modoCrud === "atualizar" ? "registro atualizado." : "registro incluído.", "sucesso");
    await carregarApoiadores();
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvarApoiador });
  }
}

async function excluirApoiadorCrud(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item || !MasterCrud.confirmarExclusao()) return;

  try {
    await PlanilhaApi.gravar(cfg.PLANILHA_APOIADORES, {
      acao: "excluir",
      linha: numLinha,
      origem: "pagamentos-lideranca",
    });
    MasterCrud.toast("registro excluído.", "sucesso");
    await carregarApoiadores();
  } catch (e) {
    MasterCrud.toast("erro ao excluir: " + e.message, "erro");
  }
}

function aoClicarTabelaApoiador(e) {
  const btn = e.target.closest(MasterCrud.seletorAcao);
  if (!btn) return;
  e.stopPropagation();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") abrirModalEditarApoiador(numLinha);
  if (btn.dataset.acao === "excluir") excluirApoiadorCrud(numLinha);
}

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
    if (idx === -1 && cfgOrc.COLUNAS[campo.chave] != null) {
      idx = cfgOrc.COLUNAS[campo.chave];
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

function valorPopoverMoeda(val) {
  return exibirMoeda(val);
}

function badgeFinTotalHtml(r) {
  const total = parseNumero(r.finTotal);
  if (total <= 0) return "";
  return `<span class="orcamento-total-badge">${fmtMoeda.format(total)}</span>`;
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
      '<span class="text-secondary small">Nenhuma micro-região encontrada.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "ap-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function termoBuscaLideranca() {
  return normalizarChave(el.buscaLideranca?.value);
}

function linhasFiltradas() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const termo = termoBuscaLideranca();

  return linhas.filter((item) => {
    if (!item.regiaoNorm || !selecionadas.includes(item.regiaoNorm)) return false;
    if (termo && !normalizarChave(item.lideranca).includes(termo)) return false;
    return true;
  });
}

function ordenarPorLideranca(a, b) {
  const la = String(a.lideranca ?? "").trim();
  const lb = String(b.lideranca ?? "").trim();
  const cmp = la.localeCompare(lb, "pt-BR", { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return String(a.municipio ?? "").localeCompare(String(b.municipio ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

function linhaTemConteudo(item) {
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

function calcularFinTotal(item) {
  return (
    parseNumero(item.pessoal) +
    parseNumero(item.combustivel) +
    parseNumero(item.diversos) +
    parseNumero(item.diaD)
  );
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfgOrc.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const lideranca = String(valorCampo(linha, indices.lideranca) ?? "").trim();
    if (!municipio || !lideranca) continue;

    const info = mapaMunicipioRegiao.get(normalizarChave(municipio));
    if (!info?.regiaoNorm) continue;

    const item = {
      _linha: i + 1,
      lideranca,
      municipio,
      pessoal: valorCampo(linha, indices.pessoal),
      combustivel: valorCampo(linha, indices.combustivel),
      diversos: valorCampo(linha, indices.diversos),
      diaD: valorCampo(linha, indices.diaD),
      regiao: info.regiao,
      regiaoNorm: info.regiaoNorm,
    };
    item.finTotal = calcularFinTotal(item);

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(ordenarPorLideranca);
  return itens;
}

function somarMoeda(filtradas, prop) {
  return filtradas.reduce((acc, r) => acc + parseNumero(r[prop]), 0);
}

function somarTotalGeral(filtradas) {
  return filtradas.reduce((acc, r) => acc + calcularFinTotal(r), 0);
}

function atualizarKpis(filtradas) {
  el.kpiPessoal.textContent = exibirMoedaKpi(somarMoeda(filtradas, "pessoal"));
  el.kpiCombustivel.textContent = exibirMoedaKpi(somarMoeda(filtradas, "combustivel"));
  el.kpiDiversos.textContent = exibirMoedaKpi(somarMoeda(filtradas, "diversos"));
  el.kpiDiaD.textContent = exibirMoedaKpi(somarMoeda(filtradas, "diaD"));
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

function largurasColunasApoiadores() {
  const estreito = window.matchMedia("(max-width: 575.98px)").matches;
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (estreito) {
    return {
      "apoiadores-col-ident": "50%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-orc-pessoal": "0",
      "apoiadores-col-orc-combustivel": "0",
      "apoiadores-col-orc-diversos": "0",
      "apoiadores-col-orc-diad": "0",
      "apoiadores-col-orc-stack-pessoal": "25%",
      "apoiadores-col-orc-stack-diversos": "25%",
    };
  }
  if (mobile) {
    return {
      "apoiadores-col-ident": "50%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-orc-pessoal": "0",
      "apoiadores-col-orc-combustivel": "0",
      "apoiadores-col-orc-diversos": "0",
      "apoiadores-col-orc-diad": "0",
      "apoiadores-col-orc-stack-pessoal": "25%",
      "apoiadores-col-orc-stack-diversos": "25%",
    };
  }
  return {
    "apoiadores-col-ident": "22%",
    "apoiadores-col-municipio": "18%",
    "apoiadores-col-orc-pessoal": "15%",
    "apoiadores-col-orc-combustivel": "15%",
    "apoiadores-col-orc-diversos": "15%",
    "apoiadores-col-orc-diad": "15%",
    "apoiadores-col-orc-stack-pessoal": "0",
    "apoiadores-col-orc-stack-diversos": "0",
  };
}

function sincronizarLargurasColunasApoiadores(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  const larguras = largurasColunasApoiadores();
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
  const panel = document.querySelector(".apoiadores-tabela-card .dashboard-tabela-panel");
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

  sincronizarLargurasColunasApoiadores(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function tituloPopoverApoiador(r) {
  return exibirTexto(r.lideranca) || "—";
}

function badgeFinTotalPopover(r) {
  return badgeFinTotalHtml(r);
}

function itemPopoverOrcamento(r, linha) {
  const rotuloClass = linha.preserveCase
    ? "apoiadores-popover-rotulo apoiadores-popover-rotulo--case"
    : "apoiadores-popover-rotulo";
  const marcador = linha.marcador
    ? `<span class="orcamento-geral-popover-marcador ${linha.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha apoiadores-popover-linha--fin">
    <span class="${rotuloClass}">${marcador}${linha.rotulo}</span>
    <span class="apoiadores-popover-fin">${valorPopoverMoeda(r[linha.prop])}</span>
  </div>`;
}

function htmlPopoverApoiador(r) {
  const itens = LINHAS_ORCAMENTO_POPOVER.map((linha) => itemPopoverOrcamento(r, linha)).join("");
  const municipio = escapeHtml(String(r.municipio ?? "").trim());
  const badge = badgeFinTotalPopover(r);

  return `<div class="orcamento-geral-popover-corpo apoiadores-popover-corpo">
    <div class="apoiadores-popover-cabecalho">
      <div class="apoiadores-popover-topo">
        <span class="apoiadores-popover-lideranca">${tituloPopoverApoiador(r)}</span>
        ${badge}
      </div>
      ${municipio ? `<div class="apoiadores-popover-municipio-muted">${municipio}</div>` : ""}
      <hr class="apoiadores-popover-divisor" aria-hidden="true">
    </div>
    <div class="apoiadores-popover-tabela">${itens}</div>
  </div>`;
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const liderancaHtml = exibirTexto(r.lideranca);
  const acoesMaster = MasterCrud.acoesLinha(r._linha);
  const finBadge = badgeFinTotalHtml(r);
  const municipioMobile = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";
  const stackPessoal =
    valorCampoStack("pessoal", r.pessoal) + valorCampoStack("combustivel", r.combustivel);
  const stackDiversos =
    valorCampoStack("diversos", r.diversos) + valorCampoStack("diad", r.diaD);

  return `<tr class="apoiadores-linha-popover" tabindex="0" aria-label="detalhes do orçamento">
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">
        <span class="apoiadores-celula-texto-wrap">
          <span class="apoiadores-ident-stack">
            <span class="apoiadores-ident-nome">${liderancaHtml}</span>
            ${finBadge}
          </span>
          ${acoesMaster}
        </span>
      </span>
      <span class="apoiadores-celula-mobile">
        <span class="dashboard-municipio-celula">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
          <span class="dashboard-municipio-texto">
            <span class="dashboard-municipio-nome apoiadores-celula-texto-wrap">
              <span class="apoiadores-ident-stack">
                <span class="apoiadores-ident-nome">${liderancaHtml || "—"}</span>
                ${municipioMobile}
                ${finBadge}
              </span>
              ${acoesMaster}
            </span>
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
    <td class="text-end apoiadores-col-orc-pessoal apoiadores-col-orc-desk apoiadores-col-separador apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r.pessoal)}</td>
    <td class="text-end apoiadores-col-orc-combustivel apoiadores-col-orc-desk apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r.combustivel)}</td>
    <td class="text-end apoiadores-col-orc-diversos apoiadores-col-orc-desk apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r.diversos)}</td>
    <td class="text-end apoiadores-col-orc-diad apoiadores-col-orc-desk apoiadores-celula-num orcamento-tabela-desktop-col">${exibirMoeda(r.diaD)}</td>
    <td class="text-end apoiadores-col-orc-stack-pessoal orcamento-tabela-stack-col apoiadores-col-separador">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackPessoal}</div>
    </td>
    <td class="text-end apoiadores-col-orc-stack-diversos orcamento-tabela-stack-col">
      <div class="orcamento-tabela-stack orcamento-tabela-stack-valores">${stackDiversos}</div>
    </td>
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = [...linhasFiltradas()].sort(ordenarPorLideranca);

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
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  popoverTabela.inicializar({
    corpo: el.corpo,
    seletorLinha: "tr.apoiadores-linha-popover",
    linhas: filtradas,
    htmlConteudo: htmlPopoverApoiador,
  });
  aposRenderTabela();
}

function montar(valoresApoiadores) {
  atualizarMetadadosPlanilha(valoresApoiadores);
  linhas = extrairLinhas(valoresApoiadores);
  montarFiltros(extrairRegioes(linhas));
  renderizarTabela();
  requestAnimationFrame(() => {
    alinharColunasTabela();
    renderizarTabela();
  });
}

async function carregarApoiadores() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando orçamento...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valoresApoiadores, valoresMunicipios] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA_APOIADORES),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
    ]);

    if (valoresApoiadores === null) {
      limparStatus();
      return;
    }

    opcoesMunicipio = extrairOpcoesMunicipio(valoresMunicipios || []);
    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresApoiadores);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    popoverTabela.destruir();
    el.corpo.innerHTML = "";
    el.vazio.hidden = true;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarApoiadores;

function initOrcamentoPessoalApoiadores() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaLideranca: document.getElementById("buscaLideranca"),
    corpo: document.getElementById("corpoApoiadores"),
    vazio: document.getElementById("vazio"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiPessoal: document.getElementById("kpiPessoal"),
    kpiCombustivel: document.getElementById("kpiCombustivel"),
    kpiDiversos: document.getElementById("kpiDiversos"),
    kpiDiaD: document.getElementById("kpiDiaD"),
    btnIncluir: document.getElementById("btnIncluirApoiador"),
    btnSalvarApoiador: document.getElementById("btnSalvarApoiador"),
    modalTitulo: document.getElementById("modalApoiadorTitulo"),
    modalEl: document.getElementById("modalApoiadorCrud"),
    campoLideranca: document.getElementById("campoApLideranca"),
    campoMunicipio: document.getElementById("campoApMunicipio"),
    campoPessoal: document.getElementById("campoApPessoal"),
    campoCombustivel: document.getElementById("campoApCombustivel"),
    campoDiversos: document.getElementById("campoApDiversos"),
    campoDiaD: document.getElementById("campoApDiaD"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  MasterCrud.aplicarVisibilidadeIncluir("btnIncluirApoiador");
  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.btnIncluir?.addEventListener("click", abrirModalIncluirApoiador);
  el.btnSalvarApoiador?.addEventListener("click", salvarApoiadorCrud);
  el.corpo.addEventListener("click", aoClicarTabelaApoiador);

  el.buscaLideranca?.addEventListener("input", renderizarTabela);
  window.addEventListener("resize", alinharColunasTabela);
  carregarApoiadores();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initOrcamentoPessoalApoiadores);
