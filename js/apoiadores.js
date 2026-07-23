// Página apoiadores: contratos por liderança/município + filtro por região (planilha municipios).

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PESSOAL;
const cfgAp = cfg.APOIADORES;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 6;

const CAMPOS_PLANILHA = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "apoiadorLider", chave: "APOIADOR_LIDER", aliases: ["apoiador-lider", "apoiador lider", "lider"] },
  { prop: "apoiadorIntegral", chave: "APOIADOR_INTEGRAL", aliases: ["apoiador-integral", "apoiador integral", "integral"] },
  { prop: "apoiadorMeio", chave: "APOIADOR_MEIO", aliases: ["apoiador-meio", "apoiador meio", "meio"] },
  {
    prop: "apoiadorCustomizado",
    chave: "APOIADOR_CUSTOMIZADO",
    aliases: ["apoiador-customizado", "apoiador customizado", "apoiador-livre", "apoiador livre", "customizado"],
  },
];

const CAMPOS_FINANCEIROS = [
  { prop: "finLider", chave: "FIN_LIDER" },
  { prop: "finIntegral", chave: "FIN_INTEGRAL" },
  { prop: "finMeio", chave: "FIN_MEIO" },
  { prop: "finCustomizado", chave: "FIN_CUSTOMIZADO" },
];

const CAMPOS_FIN_MODAL = CAMPOS_FINANCEIROS;

const LINHAS_APOIADOR_POPOVER = [
  {
    rotulo: "liderança",
    fin: "proprioApoiador",
    marcador: "popover-marcador--apoiador-proprio",
  },
  { rotulo: "lider", qtd: "apoiadorLider", fin: "finLider", marcador: "popover-marcador--apoiador-lider" },
  { rotulo: "integral", qtd: "apoiadorIntegral", fin: "finIntegral", marcador: "popover-marcador--apoiador-integral" },
  { rotulo: "meio", qtd: "apoiadorMeio", fin: "finMeio", marcador: "popover-marcador--apoiador-meio" },
  {
    rotulo: "customizado",
    qtd: "apoiadorCustomizado",
    fin: "finCustomizado",
    marcador: "popover-marcador--apoiador-custom",
  },
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
  CAMPOS_FINANCEIROS.forEach((campo) => {
    const idx = cfgAp.COLUNAS[campo.chave];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.chave;
    }
  });
}

function dadosGravacaoApoiador(item) {
  const dados = {};
  CAMPOS_PLANILHA.forEach((campo) => {
    const chave = nomesColunaPlanilha[campo.prop];
    if (chave) dados[chave] = item[campo.prop] ?? "";
  });
  CAMPOS_FIN_MODAL.forEach((campo) => {
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
    apoiadorLider: el.campoLider.value.trim(),
    apoiadorIntegral: el.campoIntegral.value.trim(),
    apoiadorMeio: el.campoMeio.value.trim(),
    apoiadorCustomizado: el.campoCustom.value.trim(),
    finLider: lerCampoMoeda(el.campoFinLider),
    finIntegral: lerCampoMoeda(el.campoFinIntegral),
    finMeio: lerCampoMoeda(el.campoFinMeio),
    finCustomizado: lerCampoMoeda(el.campoFinCustom),
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

function valorParaCampoNumerico(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return String(parseNumero(val));
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
  el.campoLider.value = valorParaCampoNumerico(dados.apoiadorLider);
  el.campoIntegral.value = valorParaCampoNumerico(dados.apoiadorIntegral);
  el.campoMeio.value = valorParaCampoNumerico(dados.apoiadorMeio);
  el.campoCustom.value = valorParaCampoNumerico(dados.apoiadorCustomizado);
  el.campoFinLider.value = valorParaCampoMoeda(dados.finLider);
  el.campoFinIntegral.value = valorParaCampoMoeda(dados.finIntegral);
  el.campoFinMeio.value = valorParaCampoMoeda(dados.finMeio);
  el.campoFinCustom.value = valorParaCampoMoeda(dados.finCustomizado);
}

function abrirModalIncluirApoiador() {
  modoCrud = "inserir";
  linhaCrud = null;
  el.modalTitulo.textContent = "incluir apoiador";
  preencherFormularioApoiador({});
  modalCrud.show();
}

function abrirModalEditarApoiador(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  modoCrud = "atualizar";
  linhaCrud = numLinha;
  el.modalTitulo.textContent = "editar apoiador";
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
      origem: "pessoal-apoiadores",
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
      origem: "pessoal-apoiadores",
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
    if (idx === -1 && cfgAp.COLUNAS[campo.chave] != null) {
      idx = cfgAp.COLUNAS[campo.chave];
    }
    indices[campo.prop] = idx;
  });

  CAMPOS_FINANCEIROS.forEach((campo) => {
    indices[campo.prop] = cfgAp.COLUNAS[campo.chave];
  });

  const aliasesProprio = ["proprio apoiador", "próprio apoiador", "proprio-apoiador"];
  let idxProprio = normalizados.findIndex((n) => aliasesProprio.some((alias) => normalizarChave(alias) === n));
  if (idxProprio === -1 && cfgAp.COLUNAS.PROPRIO_APOIADOR != null) {
    idxProprio = cfgAp.COLUNAS.PROPRIO_APOIADOR;
  }
  indices.proprioApoiador = idxProprio;

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

function exibirCelula(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (n > 0) return fmt.format(n);
  return escapeHtml(s);
}

function exibirMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return fmtMoeda.format(parseNumero(val));
}

function subFinTotalHtml(r) {
  const fin = exibirMoeda(r.finTotal);
  return fin ? `<span class="apoiadores-sub-fin-total">${fin}</span>` : "";
}

function badgeFinTotalHtml(r) {
  const fin = exibirMoeda(r.finTotal);
  if (!fin) return "";
  return `<span class="apoiadores-fin-badge">${fin}</span>`;
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

  const todasMarcadas = selecionadas.length === regioes.length;
  const termo = termoBuscaLideranca();

  return linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }

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
  if (celulaPreenchida(item.proprioApoiador)) return true;
  return CAMPOS_PLANILHA.some((c) => celulaPreenchida(item[c.prop]));
}

function calcularFinTotal(item) {
  return (
    parseNumero(item.proprioApoiador) +
    parseNumero(item.finLider) +
    parseNumero(item.finIntegral) +
    parseNumero(item.finMeio) +
    parseNumero(item.finCustomizado)
  );
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfgAp.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      _linha: i + 1,
      lideranca: valorCampo(linha, indices.lideranca),
      municipio,
      proprioApoiador: valorCampo(linha, indices.proprioApoiador),
      apoiadorLider: valorCampo(linha, indices.apoiadorLider),
      apoiadorIntegral: valorCampo(linha, indices.apoiadorIntegral),
      apoiadorMeio: valorCampo(linha, indices.apoiadorMeio),
      apoiadorCustomizado: valorCampo(linha, indices.apoiadorCustomizado),
      finLider: valorCampo(linha, indices.finLider),
      finIntegral: valorCampo(linha, indices.finIntegral),
      finMeio: valorCampo(linha, indices.finMeio),
      finCustomizado: valorCampo(linha, indices.finCustomizado),
      regiao: info?.regiao || "",
      regiaoNorm: info?.regiaoNorm || "",
    };
    item.finTotal = calcularFinTotal(item);

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(ordenarPorLideranca);
  return itens;
}

function somarCampo(filtradas, prop) {
  return filtradas.reduce((acc, r) => {
    const n = parseNumero(r[prop]);
    if (n > 0) return acc + n;
    if (celulaPreenchida(r[prop])) return acc + 1;
    return acc;
  }, 0);
}

function somarEfetivoMobilizado(filtradas) {
  return (
    filtradas.length +
    somarCampo(filtradas, "apoiadorLider") +
    somarCampo(filtradas, "apoiadorIntegral") +
    somarCampo(filtradas, "apoiadorMeio") +
    somarCampo(filtradas, "apoiadorCustomizado")
  );
}

function atualizarKpis(filtradas) {
  el.kpiTotal.textContent = fmt.format(filtradas.length);
  el.kpiLider.textContent = fmt.format(somarCampo(filtradas, "apoiadorLider"));
  el.kpiIntegral.textContent = fmt.format(somarCampo(filtradas, "apoiadorIntegral"));
  el.kpiMeio.textContent = fmt.format(somarCampo(filtradas, "apoiadorMeio"));
  el.kpiCustom.textContent = fmt.format(somarCampo(filtradas, "apoiadorCustomizado"));
  el.kpiEfetivoMobilizado.textContent = fmt.format(somarEfetivoMobilizado(filtradas));
}

function limparKpis() {
  const vazio = "—";
  el.kpiTotal.textContent = vazio;
  el.kpiEfetivoMobilizado.textContent = vazio;
  el.kpiLider.textContent = vazio;
  el.kpiIntegral.textContent = vazio;
  el.kpiMeio.textContent = vazio;
  el.kpiCustom.textContent = vazio;
}

function zerarKpis() {
  el.kpiTotal.textContent = fmt.format(0);
  el.kpiEfetivoMobilizado.textContent = fmt.format(0);
  el.kpiLider.textContent = fmt.format(0);
  el.kpiIntegral.textContent = fmt.format(0);
  el.kpiMeio.textContent = fmt.format(0);
  el.kpiCustom.textContent = fmt.format(0);
}

function largurasColunasApoiadores() {
  const estreito = window.matchMedia("(max-width: 575.98px)").matches;
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (estreito) {
    return {
      "apoiadores-col-ident": "58%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "10.5%",
      "apoiadores-col-integral": "10.5%",
      "apoiadores-col-meio": "10.5%",
      "apoiadores-col-custom": "10.5%",
    };
  }
  if (mobile) {
    return {
      "apoiadores-col-ident": "34%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "16.5%",
      "apoiadores-col-integral": "16.5%",
      "apoiadores-col-meio": "16.5%",
      "apoiadores-col-custom": "16.5%",
    };
  }
  return {
    "apoiadores-col-ident": "20%",
    "apoiadores-col-municipio": "20%",
    "apoiadores-col-lider": "15%",
    "apoiadores-col-integral": "15%",
    "apoiadores-col-meio": "15%",
    "apoiadores-col-custom": "15%",
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

function valorPopoverQtd(val) {
  return fmt.format(parseNumero(val));
}

function valorPopoverMoeda(val) {
  return fmtMoeda.format(parseNumero(val));
}

function tituloPopoverApoiador(r) {
  return exibirTexto(r.lideranca) || "—";
}

function badgeFinTotalPopover(r) {
  return badgeFinTotalHtml(r);
}

function itemPopoverApoiador(r, linha) {
  const qtd = linha.qtd ? valorPopoverQtd(r[linha.qtd]) : valorPopoverQtd(0);
  const fin = linha.fin ? valorPopoverMoeda(r[linha.fin]) : valorPopoverMoeda(0);
  const marcador = linha.marcador
    ? `<span class="orcamento-geral-popover-marcador ${linha.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha">
    <span class="apoiadores-popover-rotulo">${marcador}${linha.rotulo}</span>
    <span class="apoiadores-popover-qtd">${qtd}</span>
    <span class="apoiadores-popover-fin">${fin}</span>
  </div>`;
}

function htmlPopoverApoiador(r) {
  const itens = LINHAS_APOIADOR_POPOVER.map((linha) => itemPopoverApoiador(r, linha)).join("");
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

function montarLinhasGrupoApoiador(partes) {
  if (!partes.length) return "—";

  const sep = '<span class="apoiadores-grupo-sep"> ; </span>';
  const sepFim = '<span class="apoiadores-grupo-sep"> ;</span>';
  const linhas = [];

  for (let i = 0; i < partes.length; i += 3) {
    const chunk = partes.slice(i, i + 3);
    const ultima = i + 3 >= partes.length;
    const texto = chunk.join(sep) + (ultima ? "" : sepFim);
    linhas.push(`<div class="apoiadores-grupo-linha">${texto}</div>`);
  }

  return linhas.join("");
}

function htmlGrupoApoiadorMobile(r) {
  const celulas = [
    { rotulo: "lider", valor: r.apoiadorLider },
    { rotulo: "integral", valor: r.apoiadorIntegral },
    { rotulo: "meio", valor: r.apoiadorMeio },
    { rotulo: "customizado", valor: r.apoiadorCustomizado },
  ];

  const partes = celulas
    .map((c) => {
      const exib = exibirCelula(c.valor);
      if (!exib) return "";
      return `${c.rotulo} <span class="apoiadores-grupo-par-valor">(<strong class="apoiadores-grupo-valor">${exib}</strong>)</span>`;
    })
    .filter(Boolean);

  return `<td class="apoiadores-col-grupo-mobile apoiadores-col-separador" colspan="4">
    <div class="apoiadores-grupo-inline" aria-label="apoiador">${montarLinhasGrupoApoiador(partes)}</div>
  </td>`;
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const liderancaHtml = exibirTexto(r.lideranca);
  const acoesMaster = MasterCrud.acoesLinha(r._linha);
  const finTotalSub = subFinTotalHtml(r);
  const finBadgeMobile = badgeFinTotalHtml(r);
  const municipioMobile = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";

  return `<tr class="apoiadores-linha-popover" tabindex="0" aria-label="detalhes do apoiador">
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">
        <span class="apoiadores-celula-texto-wrap">
          <span class="apoiadores-ident-stack">
            <span class="apoiadores-ident-nome">${liderancaHtml}</span>
            ${finTotalSub}
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
                ${finBadgeMobile}
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
    ${htmlGrupoApoiadorMobile(r)}
    <td class="text-end apoiadores-col-lider apoiadores-col-apoiador-desk apoiadores-col-separador apoiadores-celula-num">${exibirCelula(r.apoiadorLider)}</td>
    <td class="text-end apoiadores-col-integral apoiadores-col-apoiador-desk apoiadores-celula-num">${exibirCelula(r.apoiadorIntegral)}</td>
    <td class="text-end apoiadores-col-meio apoiadores-col-apoiador-desk apoiadores-celula-num">${exibirCelula(r.apoiadorMeio)}</td>
    <td class="text-end apoiadores-col-custom apoiadores-col-apoiador-desk apoiadores-celula-num">${exibirCelula(r.apoiadorCustomizado)}</td>
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
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum apoiador para os filtros selecionados.</td></tr>`;
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
}

async function carregarApoiadores() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando apoiadores...", "carregando");
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

function initApoiadores() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaLideranca: document.getElementById("buscaLideranca"),
    corpo: document.getElementById("corpoApoiadores"),
    vazio: document.getElementById("vazio"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiEfetivoMobilizado: document.getElementById("kpiEfetivoMobilizado"),
    kpiLider: document.getElementById("kpiLider"),
    kpiIntegral: document.getElementById("kpiIntegral"),
    kpiMeio: document.getElementById("kpiMeio"),
    kpiCustom: document.getElementById("kpiCustom"),
    btnIncluir: document.getElementById("btnIncluirApoiador"),
    btnSalvarApoiador: document.getElementById("btnSalvarApoiador"),
    modalTitulo: document.getElementById("modalApoiadorTitulo"),
    modalEl: document.getElementById("modalApoiadorCrud"),
    campoLideranca: document.getElementById("campoApLideranca"),
    campoMunicipio: document.getElementById("campoApMunicipio"),
    campoLider: document.getElementById("campoApLider"),
    campoIntegral: document.getElementById("campoApIntegral"),
    campoMeio: document.getElementById("campoApMeio"),
    campoCustom: document.getElementById("campoApCustom"),
    campoFinLider: document.getElementById("campoApFinLider"),
    campoFinIntegral: document.getElementById("campoApFinIntegral"),
    campoFinMeio: document.getElementById("campoApFinMeio"),
    campoFinCustom: document.getElementById("campoApFinCustom"),
  };
  if (!el.corpo || !el.filtroRegioes) return;

  MasterCrud.aplicarVisibilidadeIncluir("btnIncluirApoiador");
  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.btnIncluir?.addEventListener("click", abrirModalIncluirApoiador);
  el.btnSalvarApoiador?.addEventListener("click", salvarApoiadorCrud);
  el.corpo.addEventListener("click", aoClicarTabelaApoiador);

  el.buscaLideranca?.addEventListener("input", renderizarTabela);
  initPageSmTabs(alinharColunasTabela);
  window.addEventListener("resize", alinharColunasTabela);
  alinharColunasTabela();
  carregarApoiadores();
}

function ajustarTabelaRelatorioPagina(table) {
  const ehApoiadores =
    table?.classList?.contains("apoiadores-tabela") ||
    table?.querySelector(".apoiadores-col-ident, .apoiadores-col-lider");
  if (!ehApoiadores) return;

  let colgroups = table.querySelectorAll("colgroup");
  if (!colgroups.length) {
    const cg = document.createElement("colgroup");
    for (let i = 0; i < 6; i++) cg.appendChild(document.createElement("col"));
    table.insertBefore(cg, table.firstElementChild);
    colgroups = table.querySelectorAll("colgroup");
  }

  colgroups.forEach((cg) => {
    const col = document.createElement("col");
    col.className = "apoiadores-col-valor";
    cg.appendChild(col);
  });

  const row1 = table.querySelector("thead tr.apoiadores-thead-row1");
  if (row1) {
    const th = document.createElement("th");
    th.scope = "col";
    th.rowSpan = 2;
    th.className = "text-end apoiadores-col-valor dashboard-th-base";
    th.textContent = "valor";
    row1.appendChild(th);
  }

  const dados = [...linhasFiltradas()].sort(ordenarPorLideranca);
  table.querySelectorAll("tbody tr").forEach((tr, i) => {
    const r = dados[i];
    const td = document.createElement("td");
    td.className = "text-end apoiadores-col-valor apoiadores-celula-num";
    const valor = r ? exibirMoeda(r.finTotal) : "";
    td.textContent = valor || "—";
    tr.appendChild(td);
  });
}

function htmlCardsRelatorioPagina(doc) {
  const painel = doc.querySelector(".apoiadores-kpi-painel");
  if (!painel) return "";

  const clone = painel.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-apoiadores-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function estilosRelatorioPagina() {
  return (
    ".page-apoiadores .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-apoiadores .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-apoiadores .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-apoiadores .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis{margin-top:0.2rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis > .apoiadores-kpi-painel{display:flex;flex-direction:column;gap:8px;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-painel-linha{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot{min-width:0;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.3rem;text-align:center;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--principal{border:1px solid rgba(13,148,136,0.32)!important;border-left:5px solid #0d9488!important;background:linear-gradient(135deg,rgba(13,148,136,0.16),rgba(13,148,136,0.05))!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--principal .dashboard-kpi-rotulo{font-weight:700;color:#0f766e;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--principal .dashboard-kpi-valor{font-size:10pt;color:#0d5f56;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--destaque{border:1px solid rgba(31,78,140,0.2)!important;border-left:4px solid #1f4e8c!important;background:rgba(31,78,140,0.08)!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--destaque .dashboard-kpi-rotulo{color:#1e3a5f;}" +
    ".page-apoiadores .rel-apoiadores-kpis .apoiadores-kpi-slot--destaque .dashboard-kpi-valor{font-size:9.5pt;color:#0f172a;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador{border:1px solid rgba(31,78,140,0.28)!important;border-left:3px solid #1f4e8c!important;background:rgba(31,78,140,0.1)!important;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador .dashboard-kpi-valor{color:#1f4e8c;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-ident,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-ident," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-municipio,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-municipio{text-align:left;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-lider,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-lider," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-integral,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-integral," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-meio,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-meio," +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-custom,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-custom{text-align:center;padding-top:0.4rem;padding-bottom:0.4rem;padding-left:1.5rem;padding-right:1.5rem;font-variant-numeric:tabular-nums;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela th.apoiadores-col-valor,.page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-valor{text-align:right;padding-top:0.4rem;padding-bottom:0.4rem;padding-left:2.4rem;padding-right:2.4rem;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela td.apoiadores-col-ident .apoiadores-ident-nome{display:block;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela{margin-top:0.15rem;}" +
    "@media print{" +
    ".page-apoiadores h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-apoiadores .rel-gerado{margin-bottom:0.35rem;}" +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--principal," +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-card--destaque," +
    ".page-apoiadores .rel-apoiadores-kpis .dashboard-kpi-card.apoiadores-kpi-apoiador{" +
    "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    ".page-apoiadores table.rel-tabela.apoiadores-tabela{font-size:8pt;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initApoiadores);
