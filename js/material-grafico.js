// Logística — material gráfico: previsto por município + entregas (CRUD).

const cfg = CONFIG.MATERIAL_GRAFICO;
const cfgEnt = cfg.ENTREGAS || {};
const fmt = new Intl.NumberFormat("pt-BR");

let el = {};
let municipios = [];
let itens = [];
/** registros da aba de entregas */
let entregasRegs = [];
let entregasCols = null;
/** munNorm -> itemNorm -> soma entregas */
let mapaEntregas = new Map();

/** chave: `${linha}|${munNorm}` → valor numérico editado (previsto) */
let dirty = new Map();
let salvando = false;
let primeiraCarga = true;

let modalEntregas = null;
let modalEntregaForm = null;

const ID_BACKDROP_ENTRE_MODAIS = "matGrafBackdropEntre";

function mostrarBackdropEntreModais() {
  let bd = document.getElementById(ID_BACKDROP_ENTRE_MODAIS);
  if (!bd) {
    bd = document.createElement("div");
    bd.id = ID_BACKDROP_ENTRE_MODAIS;
    bd.className = "modal-backdrop fade show mat-graf-backdrop-entre";
    bd.setAttribute("data-bs-theme", "dark");
    bd.addEventListener("click", () => modalEntregaForm?.hide());
    document.body.appendChild(bd);
    // força o fade-in no próximo frame
    requestAnimationFrame(() => bd.classList.add("show"));
  }
  const formEl = document.getElementById("modalEntregaForm");
  if (formEl) formEl.style.zIndex = "1065";
}

function removerBackdropEntreModais() {
  document.getElementById(ID_BACKDROP_ENTRE_MODAIS)?.remove();
  const formEl = document.getElementById("modalEntregaForm");
  if (formEl) formEl.style.zIndex = "";
}
let munModal = null;
/** null = todas do município; string = itemNorm filtrado */
let filtroItemModal = null;
/** lupa da linha do formulário: só consulta (sem incluir/editar/excluir) */
let modoConsultaItem = false;
let modoEntrega = null; // null | { tipo: 'lote' } | { tipo: 'editar', linha }

function podeEditarQtd() {
  // somente SENHA_ACESSO_AVILA (chave avila-master)
  return typeof AUTH !== "undefined" && AUTH.ehAvilaMaster();
}

function podeEditarEntregas() {
  // qualquer usuário autenticado com acesso à página
  return typeof AUTH !== "undefined" && !!AUTH.getChave();
}

const ICONE_LUPA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<circle cx="11" cy="11" r="7"/>' +
  '<path d="M20 20l-3.5-3.5"/>' +
  "</svg>";

const ICONE_PACOTE_ENTREGAS =
  '<i class="fa-solid fa-cart-flatbed-boxes" aria-hidden="true"></i>';

function htmlAcoesEntrega(numLinha) {
  if (!podeEditarEntregas() || !numLinha) return "";
  const iconeEditar =
    typeof MasterCrud !== "undefined"
      ? MasterCrud.ICONE_EDITAR
      : "";
  const iconeExcluir =
    typeof MasterCrud !== "undefined"
      ? MasterCrud.ICONE_EXCLUIR
      : "";
  return (
    '<span class="crud-acoes-icones" data-linha="' +
    numLinha +
    '">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--editar" data-acao="editar" data-linha="' +
    numLinha +
    '" title="editar" aria-label="editar">' +
    iconeEditar +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--excluir" data-acao="excluir" data-linha="' +
    numLinha +
    '" title="excluir" aria-label="excluir">' +
    iconeExcluir +
    "</button></span>"
  );
}

function mostrarStatus(msg, tipo) {
  statusPainel(el.status, msg, tipo);
}

function limparStatus() {
  statusPainel(el.status, "", null);
}

function escapeHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseNumero(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatarQtd(v) {
  return fmt.format(Math.max(0, Math.round(parseNumero(v))));
}

function chaveDirty(linha, munNorm) {
  return linha + "|" + munNorm;
}

function qtdAtual(item, mun) {
  const k = chaveDirty(item.linha, mun.norm);
  if (dirty.has(k)) return dirty.get(k);
  return item.qtds[mun.norm] || 0;
}

function isDirty(item, mun) {
  return dirty.has(chaveDirty(item.linha, mun.norm));
}

function totalDirty() {
  return dirty.size;
}

function itemNorm(codigo) {
  return PlanilhaApi.normalizarChave(codigo);
}

function entregasDoItemMun(item, mun) {
  const porMun = mapaEntregas.get(mun.norm);
  if (!porMun) return 0;
  return porMun.get(itemNorm(item.item)) || 0;
}

function saldoItemMun(item, mun) {
  return Math.max(0, qtdAtual(item, mun) - entregasDoItemMun(item, mun));
}

/** % entregue em relação ao previsto da linha (0–100). */
function percentualEntregaLinha(previsto, entregue) {
  const prev = Math.max(0, Math.round(parseNumero(previsto)));
  const ent = Math.max(0, Math.round(parseNumero(entregue)));
  if (prev <= 0) return 0;
  return Math.min(100, Math.max(0, (ent / prev) * 100));
}

function htmlBarraEntregaLinha(previsto, entregue) {
  const pctInt = Math.round(percentualEntregaLinha(previsto, entregue));
  const titulo = pctInt + "% entregue";
  return (
    '<div class="orcamento-geral-progress-pago mat-graf-progress mat-graf-progress-linha" role="progressbar" ' +
    'aria-valuenow="' +
    pctInt +
    '" aria-valuemin="0" aria-valuemax="100" title="' +
    escapeHtml(titulo) +
    '" aria-label="' +
    escapeHtml(titulo) +
    '">' +
    '<div class="orcamento-geral-progress-pago-track" aria-hidden="true">' +
    '<div class="orcamento-geral-progress-pago-fill" style="width:' +
    pctInt +
    '%"></div>' +
    "</div></div>"
  );
}

function atualizarBarraEntregaLinha(wrap, previsto, entregue) {
  const barra = wrap?.querySelector(".mat-graf-progress-linha");
  if (!barra) return;
  const pctInt = Math.round(percentualEntregaLinha(previsto, entregue));
  const titulo = pctInt + "% entregue";
  barra.setAttribute("aria-valuenow", String(pctInt));
  barra.setAttribute("aria-label", titulo);
  barra.title = titulo;
  const fill = barra.querySelector(".orcamento-geral-progress-pago-fill");
  if (fill) fill.style.width = pctInt + "%";
}

function acharColuna(cabecalho, aliases, indiceFallback) {
  const lista = (aliases || []).map((a) => PlanilhaApi.normalizarChave(a));
  for (let i = 0; i < cabecalho.length; i++) {
    const norm = PlanilhaApi.normalizarChave(cabecalho[i]);
    if (lista.includes(norm)) return i;
  }
  return indiceFallback != null ? indiceFallback : -1;
}

function acharColunaObj(colunas, aliases) {
  return PlanilhaApi.acharColuna(colunas, aliases, null);
}

function parsePlanilha(valores) {
  if (!valores?.length) {
    return { municipios: [], itens: [] };
  }

  const cabecalho = valores[cfg.LINHA_CABECALHO - 1] || [];
  const idxItem = acharColuna(cabecalho, cfg.COLUNA_ITEM, 0);
  const idxPeca = acharColuna(cabecalho, cfg.COLUNA_PECA, 1);
  const idxMidia = acharColuna(cabecalho, cfg.COLUNA_MIDIA, 2);
  const idxT1 = acharColuna(cabecalho, cfg.COLUNA_TIRAGEM_1, 3);
  const idxT2 = acharColuna(cabecalho, cfg.COLUNA_TIRAGEM_2, 4);
  const idxT3 = acharColuna(cabecalho, cfg.COLUNA_TIRAGEM_3, 5);
  const idxT4 = acharColuna(cabecalho, cfg.COLUNA_TIRAGEM_4, 6);
  const idxSaldo = acharColuna(cabecalho, cfg.COLUNA_SALDO, 7);
  const inicioMun = cfg.INDICE_PRIMEIRO_MUNICIPIO ?? 8;

  const listaMun = [];
  for (let c = inicioMun; c < cabecalho.length; c++) {
    const rotulo = String(cabecalho[c] ?? "").trim();
    if (!rotulo) continue;
    listaMun.push({
      indice: c,
      rotulo,
      chavePlanilha: rotulo,
      norm: PlanilhaApi.normalizarChave(rotulo),
    });
  }

  const listaItens = [];
  for (let r = cfg.LINHA_INICIO_DADOS - 1; r < valores.length; r++) {
    const row = valores[r] || [];
    const item = String(row[idxItem] ?? "").trim();
    const peca = String(row[idxPeca] ?? "").trim();
    const midia = String(row[idxMidia] ?? "").trim();
    if (!item && !peca && !midia) continue;

    const tiragem =
      parseNumero(row[idxT1]) +
      parseNumero(row[idxT2]) +
      parseNumero(row[idxT3]) +
      parseNumero(row[idxT4]);

    const qtds = {};
    listaMun.forEach((mun) => {
      qtds[mun.norm] = parseNumero(row[mun.indice]);
    });

    listaItens.push({
      linha: r + 1,
      item,
      peca,
      midia,
      tiragem,
      saldo: parseNumero(row[idxSaldo]),
      qtds,
    });
  }

  return { municipios: listaMun, itens: listaItens };
}

function valorCol(reg, col) {
  if (!col) return "";
  return reg[col.chave] != null ? reg[col.chave] : "";
}

function resolverColsEntregas(colunas) {
  return {
    data: acharColunaObj(colunas, cfgEnt.COLUNA_DATA),
    peca: acharColunaObj(colunas, cfgEnt.COLUNA_PECA),
    midia: acharColunaObj(colunas, cfgEnt.COLUNA_MIDIA),
    municipio: acharColunaObj(colunas, cfgEnt.COLUNA_MUNICIPIO),
    quantidade: acharColunaObj(colunas, cfgEnt.COLUNA_QUANTIDADE),
    recebedor: acharColunaObj(colunas, cfgEnt.COLUNA_RECEBEDOR),
    item: acharColunaObj(colunas, cfgEnt.COLUNA_ITEM),
  };
}

function colsEntregasOk(cols) {
  return Boolean(cols?.municipio && cols?.item && cols?.quantidade);
}

function montarMapaEntregas(regs, cols) {
  const mapa = new Map();
  if (!colsEntregasOk(cols)) return mapa;

  regs.forEach((reg) => {
    const munN = PlanilhaApi.normalizarChave(valorCol(reg, cols.municipio));
    const itN = itemNorm(valorCol(reg, cols.item));
    if (!munN || !itN) return;
    const qtd = parseNumero(valorCol(reg, cols.quantidade));
    if (!mapa.has(munN)) mapa.set(munN, new Map());
    const porItem = mapa.get(munN);
    porItem.set(itN, (porItem.get(itN) || 0) + qtd);
  });
  return mapa;
}

function formatarDataExibir(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-");
    return d + "/" + m + "/" + y;
  }
  if (v instanceof Date && !isNaN(v)) {
    const d = String(v.getDate()).padStart(2, "0");
    const m = String(v.getMonth() + 1).padStart(2, "0");
    return d + "/" + m + "/" + v.getFullYear();
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? "20" + m[3] : m[3];
    return m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + ano;
  }
  return s;
}

function dataHojeInput() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function dataParaInput(v) {
  if (v == null || v === "") return dataHojeInput();
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const day = String(v.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? "20" + m[3] : m[3];
    return ano + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  }
  return dataHojeInput();
}

function itensDoMunicipio(mun) {
  const ocultarZero = el.chkOcultarZero?.checked !== false;
  return itens
    .map((item) => {
      const qtd = qtdAtual(item, mun);
      const entregue = entregasDoItemMun(item, mun);
      const dirtyItem = isDirty(item, mun);
      return { item, qtd, entregue, dirtyItem };
    })
    .filter((row) => {
      if (row.dirtyItem) return true;
      if (ocultarZero && !row.qtd && !row.entregue) return false;
      return true;
    });
}

function municipiosFiltrados() {
  const busca = PlanilhaApi.normalizarChave(el.buscaMunicipio?.value || "");
  const ocultarZero = el.chkOcultarZero?.checked !== false;
  return municipios.filter((mun) => {
    if (busca && !mun.norm.includes(busca)) return false;
    if (ocultarZero && !itensDoMunicipio(mun).length) return false;
    return true;
  });
}

function atualizarBarraSalvar() {
  const n = totalDirty();
  if (!el.barraSalvar) return;
  if (!podeEditarQtd() || !n) {
    el.barraSalvar.classList.add("d-none");
    return;
  }
  el.barraSalvar.classList.remove("d-none");
  if (el.barraTexto) {
    el.barraTexto.textContent =
      n === 1 ? "1 alteração pendente" : n + " alterações pendentes";
  }
  if (el.btnSalvarTodos) el.btnSalvarTodos.disabled = salvando;
}

function htmlCelulaPrevisto(mun, row) {
  const { item, qtd, dirtyItem } = row;
  const qtdFmt = formatarQtd(qtd);

  if (!podeEditarQtd()) {
    return (
      '<td class="mat-graf-col-qtd">' +
      '<span class="mat-graf-qtd-readonly">' +
      escapeHtml(qtdFmt) +
      "</span></td>"
    );
  }

  const cls = dirtyItem ? " mat-graf-qtd-input is-dirty" : " mat-graf-qtd-input";
  return (
    '<td class="mat-graf-col-qtd">' +
    '<input type="text" inputmode="numeric" class="form-control form-control-sm' +
    cls +
    '" data-linha="' +
    item.linha +
    '" data-mun="' +
    escapeHtml(mun.norm) +
    '" value="' +
    escapeHtml(qtdFmt) +
    '" aria-label="previsto" autocomplete="off" />' +
    "</td>"
  );
}

function htmlCelulaEntregas(row) {
  const { qtd, entregue } = row;
  return (
    '<td class="mat-graf-col-entregas">' +
    '<span class="mat-graf-entregas-wrap">' +
    '<span class="mat-graf-qtd-readonly">' +
    escapeHtml(formatarQtd(entregue)) +
    "</span>" +
    htmlBarraEntregaLinha(qtd, entregue) +
    "</span></td>"
  );
}

function htmlLinhaItem(mun, row) {
  const { item } = row;

  return (
    '<tr data-linha="' +
    item.linha +
    '">' +
    '<td class="mat-graf-col-item">' +
    '<span class="mat-graf-item-badge">' +
    escapeHtml(item.item) +
    "</span></td>" +
    '<td class="mat-graf-col-peca">' +
    escapeHtml(item.peca) +
    "</td>" +
    '<td class="mat-graf-col-midia">' +
    escapeHtml(item.midia) +
    "</td>" +
    htmlCelulaPrevisto(mun, row) +
    htmlCelulaEntregas(row) +
    '<td class="mat-graf-col-lupa">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--lupa mat-graf-btn-entregas-item" data-mun="' +
    escapeHtml(mun.norm) +
    '" data-item="' +
    escapeHtml(item.item) +
    '" title="entregas deste item" aria-label="entregas deste item">' +
    ICONE_LUPA +
    "</button></td>" +
    "</tr>"
  );
}

function htmlMetaMunicipio(mun, dirtyCount) {
  const badgeDirty =
    dirtyCount > 0 && podeEditarQtd()
      ? '<span class="badge text-bg-warning">' + dirtyCount + "</span>"
      : "";
  if (!badgeDirty) return "";
  return '<span class="mat-graf-mun-meta">' + badgeDirty + "</span>";
}

function htmlBotaoEntregasCabecalho(mun) {
  // span (não button) para não aninhar botão no accordion-button; fica antes do chevron
  return (
    '<span class="mat-graf-btn-entregas" role="button" tabindex="0" data-mun="' +
    escapeHtml(mun.norm) +
    '" title="entregas" aria-label="entregas">' +
    ICONE_PACOTE_ENTREGAS +
    "</span>"
  );
}

function htmlPainelMunicipio(mun, aberto) {
  const rows = itensDoMunicipio(mun);
  const dirtyCount = itens.filter((item) => isDirty(item, mun)).length;
  const collapseId = "matGrafCollapse-" + mun.indice;
  const headingId = "matGrafHeading-" + mun.indice;
  const editar = podeEditarQtd();

  let corpo;
  if (!rows.length) {
    corpo =
      '<p class="small text-secondary mb-2 px-1">nenhum item com previsto neste município.</p>';
  } else {
    const rodapeSalvar = editar
      ? '<tfoot class="mat-graf-salvar-tfoot' +
        (dirtyCount ? "" : " d-none") +
        '"><tr class="mat-graf-salvar-row">' +
        '<td class="mat-graf-col-item"></td>' +
        '<td class="mat-graf-col-peca"></td>' +
        '<td class="mat-graf-col-midia"></td>' +
        '<td class="mat-graf-col-qtd">' +
        '<button type="button" class="btn btn-sm btn-outline-primary mat-graf-btn-salvar-mun" data-mun="' +
        escapeHtml(mun.norm) +
        '">salvar</button></td>' +
        '<td class="mat-graf-col-entregas"></td>' +
        '<td class="mat-graf-col-lupa"></td>' +
        "</tr></tfoot>"
      : "";

    corpo =
      '<div class="table-responsive">' +
      '<table class="table table-sm align-middle mb-2 mat-graf-tabela">' +
      "<thead><tr>" +
      '<th class="mat-graf-col-item">item</th>' +
      '<th class="mat-graf-col-peca">peça</th>' +
      '<th class="mat-graf-col-midia">mídia</th>' +
      '<th class="mat-graf-col-qtd">previsto</th>' +
      '<th class="mat-graf-col-entregas">entregas</th>' +
      '<th class="mat-graf-col-lupa" aria-label="entregas do item"></th>' +
      "</tr></thead><tbody>" +
      rows.map((row) => htmlLinhaItem(mun, row)).join("") +
      "</tbody>" +
      rodapeSalvar +
      "</table></div>";
  }

  return (
    '<div class="accordion-item border-0 shadow-sm mb-2 mat-graf-item" data-mun="' +
    escapeHtml(mun.norm) +
    '">' +
    '<h2 class="accordion-header mat-graf-accordion-header" id="' +
    headingId +
    '">' +
    '<button type="button" class="accordion-button mat-graf-accordion-btn py-2' +
    (aberto ? "" : " collapsed") +
    '" data-bs-toggle="collapse" data-bs-target="#' +
    collapseId +
    '" aria-expanded="' +
    (aberto ? "true" : "false") +
    '" aria-controls="' +
    collapseId +
    '">' +
    '<span class="mat-graf-mun-titulo">' +
    escapeHtml(mun.rotulo) +
    "</span>" +
    htmlMetaMunicipio(mun, dirtyCount) +
    htmlBotaoEntregasCabecalho(mun) +
    "</button></h2>" +
    '<div id="' +
    collapseId +
    '" class="accordion-collapse collapse' +
    (aberto ? " show" : "") +
    '" aria-labelledby="' +
    headingId +
    '" data-bs-parent="#matGrafAccordion">' +
    '<div class="accordion-body py-2 px-2">' +
    corpo +
    "</div></div></div>"
  );
}

function municipiosAbertos() {
  const abertos = new Set();
  el.accordion?.querySelectorAll(".accordion-collapse.show").forEach((node) => {
    const item = node.closest(".mat-graf-item");
    const mun = item?.dataset?.mun;
    if (mun) abertos.add(mun);
  });
  return abertos;
}

function renderAccordion() {
  if (!el.accordion) return;
  const lista = municipiosFiltrados();
  const abertos = municipiosAbertos();
  const abertoUnico = lista.find((mun) => abertos.has(mun.norm))?.norm || null;

  if (!lista.length) {
    el.accordion.innerHTML = "";
    el.vazio?.classList.remove("d-none");
  } else {
    el.vazio?.classList.add("d-none");
    const abrirPrimeiro = primeiraCarga && !abertoUnico;
    el.accordion.innerHTML = lista
      .map((mun, i) =>
        htmlPainelMunicipio(
          mun,
          mun.norm === abertoUnico || (abrirPrimeiro && i === 0)
        )
      )
      .join("");
    primeiraCarga = false;
  }

  atualizarBarraSalvar();
  notificarAlturaFrame();
}

function atualizarMetaPainel(painel, mun) {
  if (!painel) return;
  const dirtyCount = itens.filter((it) => isDirty(it, mun)).length;
  const meta = painel.querySelector(".mat-graf-mun-meta");
  if (meta) {
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlMetaMunicipio(mun, dirtyCount);
    const novo = tmp.firstElementChild;
    if (novo) meta.replaceWith(novo);
  }
  const tfoot = painel.querySelector(".mat-graf-salvar-tfoot");
  const btn = painel.querySelector(".mat-graf-btn-salvar-mun");
  if (tfoot) tfoot.classList.toggle("d-none", !dirtyCount);
  if (btn) btn.disabled = !dirtyCount || salvando;
}

function aoAlterarQtd(input) {
  if (!podeEditarQtd()) return;

  const linha = Number(input.dataset.linha);
  const munNorm = input.dataset.mun;
  const mun = municipios.find((m) => m.norm === munNorm);
  const item = itens.find((i) => i.linha === linha);
  if (!mun || !item) return;

  const digits = String(input.value).replace(/\D/g, "");
  const valor = digits === "" ? 0 : parseInt(digits, 10);
  const original = item.qtds[mun.norm] || 0;
  const k = chaveDirty(linha, munNorm);

  if (valor === original) dirty.delete(k);
  else dirty.set(k, valor);

  input.classList.toggle("is-dirty", dirty.has(k));
  input.value =
    digits === "" && document.activeElement === input ? "" : formatarQtd(valor);

  const pos = input.value.length;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(pos, pos);
    } catch (_) {
      /* sem seleção */
    }
  });

  atualizarBarraEntregaLinha(
    input.closest("tr")?.querySelector(".mat-graf-entregas-wrap"),
    valor,
    entregasDoItemMun(item, mun)
  );

  atualizarMetaPainel(input.closest(".mat-graf-item"), mun);
  atualizarBarraSalvar();
}

async function salvarAlteracoes(filtroMunNorm) {
  if (!podeEditarQtd()) {
    MasterCrud.toast("somente avila-master pode editar previstos.", "erro");
    return;
  }
  if (salvando) return;

  const entradas = Array.from(dirty.entries()).filter(([chave]) => {
    if (!filtroMunNorm) return true;
    return chave.endsWith("|" + filtroMunNorm);
  });

  if (!entradas.length) {
    MasterCrud.toast("nenhuma alteração para salvar.", "erro");
    return;
  }

  salvando = true;
  atualizarBarraSalvar();
  el.accordion
    ?.querySelectorAll(".mat-graf-btn-salvar-mun, .mat-graf-qtd-input")
    .forEach((node) => {
      node.disabled = true;
    });
  if (el.btnSalvarTodos) el.btnSalvarTodos.disabled = true;

  mostrarStatus("salvando alterações...", "carregando");

  let ok = 0;
  let falhas = 0;

  try {
    for (const [chave, valor] of entradas) {
      const sep = chave.indexOf("|");
      const linha = Number(chave.slice(0, sep));
      const munNorm = chave.slice(sep + 1);
      const mun = municipios.find((m) => m.norm === munNorm);
      if (!mun) {
        falhas += 1;
        continue;
      }

      try {
        await PlanilhaApi.gravar(cfg.PLANILHA, {
          acao: "atualizar",
          linha,
          dados: { [mun.chavePlanilha]: valor },
          origem: "material-grafico",
          aba: cfg.ABA || "",
        });
        const item = itens.find((i) => i.linha === linha);
        if (item) item.qtds[munNorm] = valor;
        dirty.delete(chave);
        ok += 1;
      } catch (e) {
        falhas += 1;
        console.error(e);
      }
    }

    if (falhas) {
      MasterCrud.toast(
        "salvos: " + ok + " · falhas: " + falhas + ". verifique e tente de novo.",
        "erro"
      );
    } else {
      MasterCrud.toast(
        ok === 1 ? "1 previsto atualizado." : ok + " previstos atualizados.",
        "sucesso"
      );
    }

    await carregar(false);
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
    mostrarStatus("erro ao salvar: " + e.message, "erro");
  } finally {
    salvando = false;
    atualizarBarraSalvar();
  }
}

function entregasDoMunicipio(mun, itemFiltroNorm) {
  if (!entregasCols?.municipio) return [];
  const filtroItem = itemFiltroNorm ? itemNorm(itemFiltroNorm) : "";
  return entregasRegs
    .filter((reg) => {
      if (
        PlanilhaApi.normalizarChave(valorCol(reg, entregasCols.municipio)) !==
        mun.norm
      ) {
        return false;
      }
      if (!filtroItem) return true;
      return itemNorm(valorCol(reg, entregasCols.item)) === filtroItem;
    })
    .sort((a, b) => {
      const da = dataParaInput(valorCol(a, entregasCols.data));
      const db = dataParaInput(valorCol(b, entregasCols.data));
      return db.localeCompare(da) || (b._linha || 0) - (a._linha || 0);
    });
}

function catalogoPorItem(codigo) {
  const n = itemNorm(codigo);
  return itens.find((i) => itemNorm(i.item) === n) || null;
}

function ocultarPopoversEntregas() {
  if (typeof bootstrap === "undefined" || !bootstrap.Popover) return;
  el.modalEntregasCorpo
    ?.querySelectorAll(".mat-graf-entrega-lupa")
    .forEach((btn) => {
      bootstrap.Popover.getInstance(btn)?.hide();
    });
}

function destruirPopoversEntregas() {
  if (typeof bootstrap === "undefined" || !bootstrap.Popover) return;
  el.modalEntregasCorpo
    ?.querySelectorAll(".mat-graf-entrega-lupa")
    .forEach((btn) => {
      bootstrap.Popover.getInstance(btn)?.dispose();
    });
}

function htmlPopoverEntrega(campos) {
  const linhas = [
    ["data", campos.data],
    ["item", campos.item],
    ["peça", campos.peca],
    ["mídia", campos.midia],
    ["quantidade", campos.quantidade],
    ["recebedor", campos.recebedor],
  ];
  return (
    '<div class="mat-graf-entrega-popover">' +
    linhas
      .map(
        ([rotulo, valor]) =>
          '<div class="mat-graf-entrega-popover-linha">' +
          '<span class="mat-graf-entrega-popover-rotulo">' +
          escapeHtml(rotulo) +
          "</span>" +
          '<span class="mat-graf-entrega-popover-valor">' +
          escapeHtml(valor || "—") +
          "</span></div>"
      )
      .join("") +
    "</div>"
  );
}

function conteudoPopoverEntrega(numLinha) {
  const reg = entregasRegs.find((r) => r._linha === numLinha);
  if (!reg) return "<span class='text-secondary'>entrega não encontrada.</span>";
  const itemCod = String(valorCol(reg, entregasCols.item) ?? "").trim();
  const cat = catalogoPorItem(itemCod);
  const peca = String(valorCol(reg, entregasCols.peca) || cat?.peca || "").trim();
  const midia = String(
    valorCol(reg, entregasCols.midia) || cat?.midia || ""
  ).trim();
  return htmlPopoverEntrega({
    data: formatarDataExibir(valorCol(reg, entregasCols.data)),
    item: itemCod,
    peca,
    midia,
    quantidade: formatarQtd(valorCol(reg, entregasCols.quantidade)),
    recebedor: String(valorCol(reg, entregasCols.recebedor) ?? "").trim(),
  });
}

function aoClicarForaPopoverEntrega(e) {
  if (e.target.closest(".mat-graf-entrega-lupa")) return;
  if (e.target.closest(".mat-graf-entrega-popover-bs")) return;
  ocultarPopoversEntregas();
}

function ligarDismissPopoverEntrega() {
  document.addEventListener("click", aoClicarForaPopoverEntrega);
}

function desligarDismissPopoverEntrega() {
  document.removeEventListener("click", aoClicarForaPopoverEntrega);
}

function inicializarPopoversEntregas() {
  if (typeof bootstrap === "undefined" || !bootstrap.Popover) return;
  el.modalEntregasCorpo
    ?.querySelectorAll(".mat-graf-entrega-lupa")
    .forEach((btn) => {
      new bootstrap.Popover(btn, {
        html: true,
        sanitize: false,
        trigger: "click",
        placement: "left",
        container: "body",
        customClass: "mat-graf-entrega-popover-bs",
        title: "detalhes da entrega",
        content: () => conteudoPopoverEntrega(Number(btn.dataset.linha)),
      });
      btn.addEventListener("show.bs.popover", () => {
        el.modalEntregasCorpo
          ?.querySelectorAll(".mat-graf-entrega-lupa")
          .forEach((outro) => {
            if (outro !== btn) {
              bootstrap.Popover.getInstance(outro)?.hide();
            }
          });
      });
      btn.addEventListener("shown.bs.popover", () => {
        // no próximo tick: o clique que abriu o popover não o fecha na hora
        setTimeout(ligarDismissPopoverEntrega, 0);
      });
      btn.addEventListener("hidden.bs.popover", () => {
        desligarDismissPopoverEntrega();
      });
    });
}

function htmlPecaMidiaEmpilhada(itemCod, peca, midia) {
  return (
    '<td class="mat-graf-entrega-peca-midia">' +
    (itemCod
      ? '<span class="mat-graf-item-badge mat-graf-entrega-item">' +
        escapeHtml(itemCod) +
        "</span>"
      : "") +
    '<span class="mat-graf-entrega-peca">' +
    escapeHtml(peca) +
    "</span>" +
    '<span class="mat-graf-entrega-midia">' +
    escapeHtml(midia) +
    "</span></td>"
  );
}

function htmlTabelaConsultaItem(lista) {
  const linhas = lista
    .map((reg) => {
      const qtd = parseNumero(valorCol(reg, entregasCols.quantidade));
      const dataTxt = formatarDataExibir(valorCol(reg, entregasCols.data));
      return (
        "<tr data-linha=\"" +
        reg._linha +
        '">' +
        "<td>" +
        escapeHtml(dataTxt) +
        "</td>" +
        '<td class="text-end mat-graf-entrega-card-qtd">' +
        escapeHtml(formatarQtd(qtd)) +
        "</td>" +
        '<td class="text-center mat-graf-consulta-lupa-td">' +
        '<button type="button" class="crud-acao-icone crud-acao-icone--lupa mat-graf-entrega-lupa" data-linha="' +
        reg._linha +
        '" title="detalhes da entrega" aria-label="detalhes da entrega">' +
        ICONE_LUPA +
        "</button></td></tr>"
      );
    })
    .join("");

  return (
    '<div class="table-responsive">' +
    '<table class="table table-sm align-middle mb-0 mat-graf-entregas-consulta-tabela">' +
    "<thead><tr>" +
    "<th>data</th>" +
    '<th class="text-end">quantidade</th>' +
    '<th class="text-center mat-graf-consulta-lupa-th" aria-label="detalhes"></th>' +
    "</tr></thead><tbody>" +
    linhas +
    "</tbody></table></div>"
  );
}

function htmlCardsEntregasCrud(lista, pode) {
  return lista
    .map((reg) => {
      const itemCod = String(valorCol(reg, entregasCols.item) ?? "").trim();
      const cat = catalogoPorItem(itemCod);
      const midia = String(
        valorCol(reg, entregasCols.midia) || cat?.midia || ""
      ).trim();
      const qtd = parseNumero(valorCol(reg, entregasCols.quantidade));
      const dataTxt = formatarDataExibir(valorCol(reg, entregasCols.data));
      const acoesCrud = pode ? htmlAcoesEntrega(reg._linha) : "";
      return (
        '<article class="mat-graf-entrega-card" data-linha="' +
        reg._linha +
        '">' +
        '<div class="mat-graf-entrega-card-col mat-graf-entrega-card-col--data">' +
        '<span class="mat-graf-entrega-card-data">' +
        escapeHtml(dataTxt) +
        "</span></div>" +
        '<div class="mat-graf-entrega-card-col mat-graf-entrega-card-col--item">' +
        '<span class="mat-graf-item-badge mat-graf-entrega-item">' +
        escapeHtml(itemCod || "—") +
        "</span>" +
        '<span class="mat-graf-entrega-midia">' +
        escapeHtml(midia || "—") +
        "</span></div>" +
        '<div class="mat-graf-entrega-card-col mat-graf-entrega-card-col--qtd">' +
        '<span class="mat-graf-entrega-card-qtd">' +
        escapeHtml(formatarQtd(qtd)) +
        "</span></div>" +
        '<div class="mat-graf-entrega-card-acoes">' +
        '<button type="button" class="crud-acao-icone crud-acao-icone--lupa mat-graf-entrega-lupa" data-linha="' +
        reg._linha +
        '" title="detalhes da entrega" aria-label="detalhes da entrega">' +
        ICONE_LUPA +
        "</button>" +
        acoesCrud +
        "</div></article>"
      );
    })
    .join("");
}

function renderListaEntregasModal() {
  if (!munModal || !el.modalEntregasCorpo) return;
  const consulta = !!(modoConsultaItem && filtroItemModal);
  const lista = entregasDoMunicipio(munModal, filtroItemModal);
  const pode = !consulta && podeEditarEntregas();

  el.modalEntregasTopoCrud?.classList.toggle("d-none", consulta);
  el.modalEntregasTopoConsulta?.classList.toggle("d-none", !consulta);

  if (el.btnEntregaNovo) {
    el.btnEntregaNovo.classList.toggle("d-none", !pode);
  }

  destruirPopoversEntregas();

  if (!lista.length) {
    el.modalEntregasCorpo.innerHTML = "";
    el.modalEntregasVazio?.classList.remove("d-none");
    return;
  }

  el.modalEntregasVazio?.classList.add("d-none");
  el.modalEntregasCorpo.innerHTML = consulta
    ? htmlTabelaConsultaItem(lista)
    : htmlCardsEntregasCrud(lista, pode);

  inicializarPopoversEntregas();
}

function preencherCabecalhoModalEntregas(mun, itemCodigo) {
  const itemTxt = String(itemCodigo || "").trim();
  filtroItemModal = itemTxt ? itemNorm(itemTxt) : null;
  const cat = itemTxt ? catalogoPorItem(itemTxt) : null;
  const peca = cat?.peca || "";
  const midia = cat?.midia || "";

  if (el.modalEntregasTitulo) {
    el.modalEntregasTitulo.textContent = modoConsultaItem
      ? "entregas do item"
      : filtroItemModal
        ? "entregas do item"
        : "entregas";
  }

  if (modoConsultaItem) {
    if (el.modalEntregasMunConsulta) {
      el.modalEntregasMunConsulta.textContent = mun.rotulo;
      el.modalEntregasMunConsulta.classList.toggle("d-none", !mun.rotulo);
    }
    if (el.modalEntregasItemConsulta) {
      el.modalEntregasItemConsulta.textContent = itemTxt || "—";
    }
    if (el.modalEntregasMidiaConsulta) {
      el.modalEntregasMidiaConsulta.textContent = midia || "—";
    }
    if (el.modalEntregasPecaConsulta) {
      el.modalEntregasPecaConsulta.textContent = peca || "—";
    }
    const previsto = cat ? qtdAtual(cat, mun) : 0;
    const entregue = cat ? entregasDoItemMun(cat, mun) : 0;
    const saldo = Math.max(0, previsto - entregue);
    if (el.modalEntregasPrevistoConsulta) {
      el.modalEntregasPrevistoConsulta.textContent = formatarQtd(previsto);
    }
    if (el.modalEntregasEntregueConsulta) {
      el.modalEntregasEntregueConsulta.textContent = formatarQtd(entregue);
    }
    if (el.modalEntregasSaldoConsulta) {
      el.modalEntregasSaldoConsulta.textContent = formatarQtd(saldo);
    }
    return;
  }

  if (el.modalEntregasMunicipio) {
    el.modalEntregasMunicipio.textContent = mun.rotulo;
    el.modalEntregasMunicipio.classList.toggle("d-none", !mun.rotulo);
  }
  if (el.modalEntregasItem) {
    const rotuloItem = itemTxt
      ? itemTxt + (peca ? " — " + peca : "")
      : "";
    el.modalEntregasItem.textContent = rotuloItem;
    el.modalEntregasItem.classList.toggle("d-none", !rotuloItem);
  }
}

function abrirModalEntregas(munNorm, itemCodigo, opcoes) {
  const mun = municipios.find((m) => m.norm === munNorm);
  if (!mun) return;

  if (!colsEntregasOk(entregasCols)) {
    MasterCrud.toast(
      "aba de entregas sem colunas esperadas (data, peça, mídia, município, quantidade, recebedor, item).",
      "erro"
    );
    return;
  }

  const opts = opcoes || {};
  modoConsultaItem = !!opts.consulta && !!String(itemCodigo || "").trim();
  munModal = mun;
  preencherCabecalhoModalEntregas(mun, itemCodigo || "");
  renderListaEntregasModal();
  modalEntregas?.show();
}

function montarSelectProdutoEdicao(itemSel) {
  if (!el.entregaProduto) return;
  const selNorm = itemNorm(itemSel);
  el.entregaProduto.innerHTML = itens
    .map((it) => {
      const sel = itemNorm(it.item) === selNorm ? " selected" : "";
      return (
        '<option value="' +
        escapeHtml(it.item) +
        '" data-item="' +
        escapeHtml(it.item) +
        '" data-peca="' +
        escapeHtml(it.peca) +
        '" data-midia="' +
        escapeHtml(it.midia) +
        '"' +
        sel +
        ">" +
        escapeHtml(it.item + " — " + it.peca + " / " + it.midia) +
        "</option>"
      );
    })
    .join("");
}

function produtoSelecionadoEdicao() {
  const opt = el.entregaProduto?.selectedOptions?.[0];
  if (!opt) return { item: "", peca: "", midia: "" };
  return {
    item: opt.dataset.item || opt.value || "",
    peca: opt.dataset.peca || "",
    midia: opt.dataset.midia || "",
  };
}

function preencherBadgeMunicipioForm() {
  if (!el.modalEntregaFormMunicipio) return;
  const rotulo = munModal?.rotulo || "";
  el.modalEntregaFormMunicipio.textContent = rotulo;
  el.modalEntregaFormMunicipio.classList.toggle("d-none", !rotulo);
}

function abrirFormNovoLote() {
  if (!munModal || !podeEditarEntregas()) return;
  modoEntrega = { tipo: "lote" };
  ocultarPopoversEntregas();
  if (el.modalEntregaFormTitulo) {
    el.modalEntregaFormTitulo.textContent = "incluir entregas";
  }
  preencherBadgeMunicipioForm();

  if (el.entregaData) el.entregaData.value = dataHojeInput();
  if (el.entregaRecebedor) el.entregaRecebedor.value = "";
  el.entregaFormAjuda?.classList.add("d-none");

  el.entregaFormLote?.classList.remove("d-none");
  el.entregaFormUnico?.classList.add("d-none");
  setCamposEntregaSomenteLeitura(false);

  const linhas = itens
    .map((item) => {
      const previsto = qtdAtual(item, munModal);
      const entregue = entregasDoItemMun(item, munModal);
      const saldo = Math.max(0, previsto - entregue);
      if (!previsto && !entregue && !saldo) return null;
      return { item, previsto, entregue, saldo };
    })
    .filter(Boolean);

  if (!el.entregaFormLoteCorpo) return;

  if (!linhas.length) {
    el.entregaFormLoteCorpo.innerHTML =
      '<tr><td colspan="4" class="small text-secondary">nenhum produto para este município.</td></tr>';
  } else {
    el.entregaFormLoteCorpo.innerHTML = linhas
      .map(({ item, saldo }) => {
        return (
          '<tr data-item="' +
          escapeHtml(item.item) +
          '" class="mat-graf-entrega-linha is-off">' +
          htmlPecaMidiaEmpilhada(item.item, item.peca, item.midia) +
          '<td class="text-end text-muted">' +
          escapeHtml(formatarQtd(saldo)) +
          "</td>" +
          '<td class="text-end">' +
          '<input type="text" inputmode="numeric" class="form-control form-control-sm mat-graf-entrega-qtd-input" data-item="' +
          escapeHtml(item.item) +
          '" data-peca="' +
          escapeHtml(item.peca) +
          '" data-midia="' +
          escapeHtml(item.midia) +
          '" data-sugerido="' +
          escapeHtml(String(saldo)) +
          '" value="" disabled autocomplete="off" aria-label="quantidade entrega" />' +
          "</td>" +
          '<td class="text-center">' +
          '<button type="button" class="mat-graf-entrega-toggle" aria-pressed="false" title="confirmar quantidade sugerida" aria-label="confirmar quantidade">' +
          '<span class="mat-graf-entrega-toggle-x" aria-hidden="true">✕</span>' +
          '<span class="mat-graf-entrega-toggle-ok" aria-hidden="true">✓</span>' +
          "</button></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  modalEntregaForm?.show();
}

function alternarConfirmacaoEntrega(btn) {
  const tr = btn.closest("tr");
  const input = tr?.querySelector(".mat-graf-entrega-qtd-input");
  if (!tr || !input) return;

  const ativar = !tr.classList.contains("is-on");
  tr.classList.toggle("is-on", ativar);
  tr.classList.toggle("is-off", !ativar);
  btn.setAttribute("aria-pressed", ativar ? "true" : "false");
  btn.title = ativar ? "remover quantidade" : "confirmar quantidade sugerida";

  if (ativar) {
    const sugerido = parseNumero(input.dataset.sugerido);
    input.disabled = false;
    input.value = formatarQtd(sugerido);
    input.focus();
  } else {
    input.value = "";
    input.disabled = true;
  }
}

function setCamposEntregaSomenteLeitura(somenteLeitura) {
  const campos = [
    el.entregaData,
    el.entregaRecebedor,
    el.entregaProduto,
    el.entregaQtd,
  ];
  campos.forEach((campo) => {
    if (!campo) return;
    campo.disabled = !!somenteLeitura;
  });
  el.btnEntregaSalvar?.classList.toggle("d-none", !!somenteLeitura);
  if (el.btnEntregaCancelar) {
    el.btnEntregaCancelar.textContent = somenteLeitura ? "fechar" : "cancelar";
  }
}

function abrirFormEditar(numLinha) {
  const reg = entregasRegs.find((r) => r._linha === numLinha);
  if (!reg || !munModal) return;

  const pode = podeEditarEntregas();
  modoEntrega = { tipo: "editar", linha: numLinha };
  ocultarPopoversEntregas();
  if (el.modalEntregaFormTitulo) {
    el.modalEntregaFormTitulo.textContent = "editar entregas";
  }
  preencherBadgeMunicipioForm();

  el.entregaFormAjuda?.classList.add("d-none");

  el.entregaFormLote?.classList.add("d-none");
  el.entregaFormUnico?.classList.remove("d-none");

  if (el.entregaData) {
    el.entregaData.value = dataParaInput(valorCol(reg, entregasCols.data));
  }
  montarSelectProdutoEdicao(valorCol(reg, entregasCols.item));
  if (el.entregaQtd) {
    el.entregaQtd.value = formatarQtd(valorCol(reg, entregasCols.quantidade));
  }
  if (el.entregaRecebedor) {
    el.entregaRecebedor.value = String(
      valorCol(reg, entregasCols.recebedor) ?? ""
    ).trim();
  }

  setCamposEntregaSomenteLeitura(!pode);
  modalEntregaForm?.show();
}

function chavePlanilhaCol(col) {
  return col?.chavePlanilha || col?.chave || "";
}

function dadosEntregaBase(dataStr, municipioRotulo, item, peca, midia, qtd, recebedor) {
  const dados = {};
  if (entregasCols.data) {
    dados[chavePlanilhaCol(entregasCols.data)] = dataStr;
  }
  if (entregasCols.peca) {
    dados[chavePlanilhaCol(entregasCols.peca)] = peca || "";
  }
  if (entregasCols.midia) {
    dados[chavePlanilhaCol(entregasCols.midia)] = midia || "";
  }
  if (entregasCols.municipio) {
    dados[chavePlanilhaCol(entregasCols.municipio)] = municipioRotulo;
  }
  if (entregasCols.quantidade) {
    dados[chavePlanilhaCol(entregasCols.quantidade)] = qtd;
  }
  if (entregasCols.recebedor) {
    dados[chavePlanilhaCol(entregasCols.recebedor)] = recebedor || "";
  }
  if (entregasCols.item) {
    dados[chavePlanilhaCol(entregasCols.item)] = item || "";
  }
  return dados;
}

async function salvarFormEntrega(evento) {
  evento.preventDefault();
  if (!munModal || !modoEntrega || !podeEditarEntregas()) return;

  const dataStr = el.entregaData?.value || dataHojeInput();
  const recebedor = String(el.entregaRecebedor?.value || "").trim();
  if (!recebedor) {
    MasterCrud.toast("informe o recebedor.", "erro");
    el.entregaRecebedor?.focus();
    return;
  }

  MasterCrud.salvando(el.modalEntregaFormEl, true, { btnSalvar: el.btnEntregaSalvar });

  try {
    if (modoEntrega.tipo === "editar") {
      const prod = produtoSelecionadoEdicao();
      const qtd = parseNumero(el.entregaQtd?.value);
      const dados = dadosEntregaBase(
        dataStr,
        munModal.rotulo,
        prod.item,
        prod.peca,
        prod.midia,
        qtd,
        recebedor
      );
      await PlanilhaApi.gravar(cfgEnt.PLANILHA, {
        acao: "atualizar",
        linha: modoEntrega.linha,
        dados,
        aba: cfgEnt.ABA || "",
        origem: "material-grafico-entregas",
      });
      MasterCrud.toast("entrega atualizada.", "sucesso");
    } else {
      const inputs = el.entregaFormLoteCorpo?.querySelectorAll(
        "tr.is-on .mat-graf-entrega-qtd-input"
      );
      let gravados = 0;
      for (const input of inputs || []) {
        const qtd = parseNumero(input.value);
        if (!qtd) continue;
        const itemCod = input.dataset.item || "";
        const peca = input.dataset.peca || "";
        const midia = input.dataset.midia || "";
        if (!itemCod) continue;
        const dados = dadosEntregaBase(
          dataStr,
          munModal.rotulo,
          itemCod,
          peca,
          midia,
          qtd,
          recebedor
        );
        await PlanilhaApi.gravar(cfgEnt.PLANILHA, {
          acao: "inserir",
          dados,
          aba: cfgEnt.ABA || "",
          origem: "material-grafico-entregas",
        });
        gravados += 1;
      }
      if (!gravados) {
        MasterCrud.toast(
          "marque ✓ em ao menos um item e informe a quantidade.",
          "erro"
        );
        return;
      }
      MasterCrud.toast(
        gravados === 1 ? "1 entrega incluída." : gravados + " entregas incluídas.",
        "sucesso"
      );
    }

    modalEntregaForm?.hide();
    await carregar(false);
    if (munModal) renderListaEntregasModal();
  } catch (e) {
    MasterCrud.toast("erro ao salvar entrega: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEntregaFormEl, false, {
      btnSalvar: el.btnEntregaSalvar,
    });
  }
}

async function excluirEntrega(numLinha) {
  if (!podeEditarEntregas()) return false;
  if (!(await MasterCrud.confirmarExclusao())) return false;

  try {
    await PlanilhaApi.gravar(cfgEnt.PLANILHA, {
      acao: "excluir",
      linha: numLinha,
      aba: cfgEnt.ABA || "",
      origem: "material-grafico-entregas",
    });
    MasterCrud.toast("entrega excluída.", "sucesso");
    await carregar(false);
    renderListaEntregasModal();
    return true;
  } catch (e) {
    MasterCrud.toast("erro ao excluir: " + e.message, "erro");
    return false;
  }
}

async function carregar(mostrarLoader) {
  if (!PlanilhaApi.configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  if (mostrarLoader !== false) {
    mostrarStatus("carregando material gráfico...", "carregando");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  try {
    const [valores, dadosEnt] = await Promise.all([
      PlanilhaApi.lerValores(cfg.PLANILHA, cfg.ABA || ""),
      PlanilhaApi.ler(cfgEnt.PLANILHA, cfgEnt.ABA || "", cfgEnt.LINHA_INICIO_DADOS || 2),
    ]);
    if (!valores) return;

    const parseado = parsePlanilha(valores);
    municipios = parseado.municipios;
    itens = parseado.itens;

    if (dadosEnt) {
      entregasCols = resolverColsEntregas(dadosEnt.colunas || []);
      entregasRegs = dadosEnt.linhas || [];
      mapaEntregas = montarMapaEntregas(entregasRegs, entregasCols);
    } else {
      entregasCols = null;
      entregasRegs = [];
      mapaEntregas = new Map();
    }

    if (mostrarLoader !== false) dirty = new Map();

    renderAccordion();
    if (munModal) {
      munModal = municipios.find((m) => m.norm === munModal.norm) || munModal;
      renderListaEntregasModal();
    }
    limparStatus();
  } catch (e) {
    mostrarStatus("erro ao carregar: " + e.message, "erro");
  }
}

function formatarInputQtdEvento(input) {
  const digits = String(input.value).replace(/\D/g, "");
  input.value =
    digits === "" && document.activeElement === input ? "" : formatarQtd(digits || 0);
  const pos = input.value.length;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(pos, pos);
    } catch (_) {
      /* ignore */
    }
  });
}

function aoClicarAccordion(e) {
  const btnMun = e.target.closest(".mat-graf-btn-salvar-mun");
  if (btnMun) {
    e.preventDefault();
    salvarAlteracoes(btnMun.dataset.mun);
    return;
  }
  const btnItem = e.target.closest(".mat-graf-btn-entregas-item");
  if (btnItem) {
    e.preventDefault();
    e.stopPropagation();
    abrirModalEntregas(btnItem.dataset.mun, btnItem.dataset.item, {
      consulta: true,
    });
    return;
  }
  const btnEnt = e.target.closest(".mat-graf-btn-entregas");
  if (btnEnt) {
    e.preventDefault();
    e.stopPropagation();
    abrirModalEntregas(btnEnt.dataset.mun);
    return;
  }
}

function aoTeclaEntregasCabecalho(e) {
  const btnEnt = e.target.closest(".mat-graf-btn-entregas");
  if (!btnEnt) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  e.stopPropagation();
  abrirModalEntregas(btnEnt.dataset.mun);
}

function aoInputAccordion(e) {
  const input = e.target.closest(".mat-graf-qtd-input");
  if (!input) return;
  aoAlterarQtd(input);
}

function aoClicarListaEntregas(e) {
  if (e.target.closest(".mat-graf-entrega-lupa")) return;
  if (modoConsultaItem) return;
  const btn = e.target.closest("[data-acao]");
  if (!btn) return;
  desligarDismissPopoverEntrega();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") {
    ocultarPopoversEntregas();
    abrirFormEditar(numLinha);
  }
  if (btn.dataset.acao === "excluir") {
    ocultarPopoversEntregas();
    excluirEntrega(numLinha);
  }
}

function init() {
  el = {
    status: document.getElementById("status"),
    accordion: document.getElementById("matGrafAccordion"),
    vazio: document.getElementById("matGrafVazio"),
    buscaMunicipio: document.getElementById("buscaMunicipio"),
    chkOcultarZero: document.getElementById("chkOcultarZero"),
    barraSalvar: document.getElementById("matGrafBarraSalvar"),
    barraTexto: document.getElementById("matGrafBarraTexto"),
    btnSalvarTodos: document.getElementById("btnSalvarTodos"),
    modalEntregasTitulo: document.getElementById("modalEntregasTitulo"),
    modalEntregasMunicipio: document.getElementById("modalEntregasMunicipio"),
    modalEntregasItem: document.getElementById("modalEntregasItem"),
    modalEntregasTopoCrud: document.getElementById("modalEntregasTopoCrud"),
    modalEntregasTopoConsulta: document.getElementById("modalEntregasTopoConsulta"),
    modalEntregasMunConsulta: document.getElementById("modalEntregasMunConsulta"),
    modalEntregasItemConsulta: document.getElementById("modalEntregasItemConsulta"),
    modalEntregasMidiaConsulta: document.getElementById("modalEntregasMidiaConsulta"),
    modalEntregasPecaConsulta: document.getElementById("modalEntregasPecaConsulta"),
    modalEntregasPrevistoConsulta: document.getElementById("modalEntregasPrevistoConsulta"),
    modalEntregasEntregueConsulta: document.getElementById("modalEntregasEntregueConsulta"),
    modalEntregasSaldoConsulta: document.getElementById("modalEntregasSaldoConsulta"),
    modalEntregasCorpo: document.getElementById("modalEntregasCorpo"),
    modalEntregasVazio: document.getElementById("modalEntregasVazio"),
    btnEntregaNovo: document.getElementById("btnEntregaNovo"),
    modalEntregaFormEl: document.getElementById("modalEntregaForm"),
    modalEntregaFormTitulo: document.getElementById("modalEntregaFormTitulo"),
    modalEntregaFormMunicipio: document.getElementById("modalEntregaFormMunicipio"),
    formEntrega: document.getElementById("formEntrega"),
    entregaData: document.getElementById("entregaData"),
    entregaFormAjuda: document.getElementById("entregaFormAjuda"),
    entregaFormLote: document.getElementById("entregaFormLote"),
    entregaFormLoteCorpo: document.getElementById("entregaFormLoteCorpo"),
    entregaFormUnico: document.getElementById("entregaFormUnico"),
    entregaProduto: document.getElementById("entregaProduto"),
    entregaQtd: document.getElementById("entregaQtd"),
    entregaRecebedor: document.getElementById("entregaRecebedor"),
    btnEntregaSalvar: document.getElementById("btnEntregaSalvar"),
    btnEntregaCancelar: document.getElementById("btnEntregaCancelar"),
  };

  const modalEntregasEl = document.getElementById("modalEntregas");
  const modalEntregaFormEl = document.getElementById("modalEntregaForm");
  if (modalEntregasEl && typeof bootstrap !== "undefined") {
    modalEntregas = new bootstrap.Modal(modalEntregasEl);
    modalEntregasEl.addEventListener("hide.bs.modal", () => {
      desligarDismissPopoverEntrega();
      destruirPopoversEntregas();
    });
  }
  if (modalEntregaFormEl && typeof bootstrap !== "undefined") {
    // backdrop próprio entre os dois modais (Bootstrap só coloca atrás do primeiro)
    modalEntregaForm = new bootstrap.Modal(modalEntregaFormEl, {
      backdrop: false,
    });
    modalEntregaFormEl.addEventListener("show.bs.modal", () => {
      mostrarBackdropEntreModais();
    });
    modalEntregaFormEl.addEventListener("hidden.bs.modal", () => {
      removerBackdropEntreModais();
      if (modalEntregasEl?.classList.contains("show")) {
        document.body.classList.add("modal-open");
      }
    });
  }

  if (cfg.OCULTAR_ZERO_PADRAO === false && el.chkOcultarZero) {
    el.chkOcultarZero.checked = false;
  }

  if (!podeEditarQtd()) {
    el.barraSalvar?.classList.add("d-none");
  }

  el.buscaMunicipio?.addEventListener("input", () => renderAccordion());
  el.chkOcultarZero?.addEventListener("change", () => renderAccordion());
  el.btnSalvarTodos?.addEventListener("click", () => salvarAlteracoes(null));
  el.accordion?.addEventListener("click", aoClicarAccordion);
  el.accordion?.addEventListener("keydown", aoTeclaEntregasCabecalho);
  el.accordion?.addEventListener("input", aoInputAccordion);
  el.accordion?.addEventListener("blur", aoInputAccordion, true);
  el.accordion?.addEventListener("shown.bs.collapse", () => notificarAlturaFrame());
  el.accordion?.addEventListener("hidden.bs.collapse", () => notificarAlturaFrame());

  el.btnEntregaNovo?.addEventListener("click", abrirFormNovoLote);
  el.modalEntregasCorpo?.addEventListener("click", aoClicarListaEntregas);
  el.formEntrega?.addEventListener("submit", salvarFormEntrega);
  el.entregaQtd?.addEventListener("input", (e) => formatarInputQtdEvento(e.target));
  el.entregaFormLoteCorpo?.addEventListener("input", (e) => {
    const input = e.target.closest(".mat-graf-entrega-qtd-input");
    if (input) formatarInputQtdEvento(input);
  });
  el.entregaFormLoteCorpo?.addEventListener("click", (e) => {
    const btn = e.target.closest(".mat-graf-entrega-toggle");
    if (btn) {
      e.preventDefault();
      alternarConfirmacaoEntrega(btn);
    }
  });

  window.atualizarPagina = () => carregar(true);
  carregar(true);
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
