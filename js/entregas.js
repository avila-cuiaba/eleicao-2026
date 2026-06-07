// Página entregas: região → município (ou MT direto) → tabela filtrada.

const fmt = new Intl.NumberFormat("pt-BR");
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.ENTREGAS;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const cfgPessoal = CONFIG.PESSOAL;
const REGIAO_MT = cfg.REGIAO_MT || "mt-estadual";
const REGIOES_EXCLUIDAS = (cfg.REGIOES_EXCLUIDAS || ["baixada cuiabana", "mt"]).map((r) =>
  PlanilhaApi.normalizarChave(r)
);

let el = {};
let colunas = [];
let linhas = [];
let regioes = [];
let municipiosPorRegiao = new Map();
let mapaMunicipioRegiao = new Map();
let colunaMunicipio = null;
let colunaAno = null;
let colunaArea = null;
let colunaObjeto = null;
let colunaValor = null;
let colunasExtras = [];
let municipioSelecionado = null;
let modoMt = false;

function mostrarStatus(mensagem, tipo) {
  statusPainel(el.status, mensagem, tipo);
}

function limparStatus() {
  statusPainel(el.status, "", null);
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function mesmaColuna(a, b) {
  return a && b && a.indice === b.indice;
}

function isColunaMunicipio(col) {
  return mesmaColuna(col, colunaMunicipio);
}

function isColunaPrincipal(col) {
  return (
    mesmaColuna(col, colunaAno) ||
    mesmaColuna(col, colunaArea) ||
    mesmaColuna(col, colunaObjeto) ||
    mesmaColuna(col, colunaValor)
  );
}

function rotuloColuna(col, fallback) {
  return col ? col.chave : fallback;
}

function valorItem(item, col) {
  return col ? item[col.chave] : "";
}

function regiaoExcluidaEntregas(regiaoNorm) {
  return REGIOES_EXCLUIDAS.includes(regiaoNorm);
}

function montarCadastroMunicipios(valoresMunicipios) {
  municipiosPorRegiao = new Map();
  mapaMunicipioRegiao = new Map();
  if (!valoresMunicipios?.length) return;

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiao = String(celula(valoresMunicipios, linha, cols.REGIAO) ?? "").trim();
    const regiaoNorm = PlanilhaApi.normalizarChave(regiao);
    const municipioNorm = PlanilhaApi.normalizarChave(municipio);

    mapaMunicipioRegiao.set(municipioNorm, { regiao, regiaoNorm });

    if (regiaoExcluidaEntregas(regiaoNorm)) continue;

    if (!municipiosPorRegiao.has(regiaoNorm)) {
      municipiosPorRegiao.set(regiaoNorm, { rotulo: regiao, municipios: [] });
    }
    municipiosPorRegiao.get(regiaoNorm).municipios.push({ norm: municipioNorm, rotulo: municipio });
  }

  municipiosPorRegiao.forEach((info) => {
    info.municipios.sort((a, b) =>
      a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" })
    );
  });
}

function ordenarRegioes(a, b) {
  if (a.norm === REGIAO_MT) return 1;
  if (b.norm === REGIAO_MT) return -1;

  const ordem = (cfgPessoal.ORDEM_REGIOES || []).filter((r) => !regiaoExcluidaEntregas(r));
  const indice = (norm) => {
    const i = ordem.indexOf(norm);
    return i === -1 ? ordem.length + 1 : i;
  };
  const diff = indice(a.norm) - indice(b.norm);
  if (diff !== 0) return diff;
  return a.rotulo.localeCompare(b.rotulo, "pt-BR");
}

function indiceCorRegiao(regiaoNorm) {
  if (regiaoNorm === REGIAO_MT) return 4;
  const ordem = (cfgPessoal.ORDEM_REGIOES || []).filter((r) => !regiaoExcluidaEntregas(r));
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function extrairRegioesDoCadastro() {
  const lista = Array.from(municipiosPorRegiao.entries())
    .filter(([norm]) => !regiaoExcluidaEntregas(norm))
    .map(([norm, info]) => ({ norm, rotulo: info.rotulo || norm, modoDireto: false }));

  lista.push({ norm: REGIAO_MT, rotulo: "MT", modoDireto: true });
  return lista.sort(ordenarRegioes);
}

function regioesSelecionadas() {
  if (!el.filtroRegioes) return [];
  return Array.from(el.filtroRegioes.querySelectorAll('input[type="checkbox"]:checked')).map(
    (cb) => cb.value
  );
}

function municipiosDasRegioesSelecionadas() {
  const selecionadas = regioesSelecionadas().filter((norm) => norm !== REGIAO_MT);
  const mapa = new Map();

  selecionadas.forEach((regiaoNorm) => {
    (municipiosPorRegiao.get(regiaoNorm)?.municipios || []).forEach((mun) => {
      if (!mapa.has(mun.norm)) {
        mapa.set(mun.norm, { ...mun, regiaoNorm });
      }
    });
  });

  return Array.from(mapa.values()).sort((a, b) =>
    a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" })
  );
}

function linhasModoMt() {
  return linhas.filter((item) => {
    const munNorm = PlanilhaApi.normalizarChave(valorItem(item, colunaMunicipio));
    if (!munNorm) return false;
    if (munNorm === "mt") return true;

    const info = mapaMunicipioRegiao.get(munNorm);
    if (!info) return false;
    return regiaoExcluidaEntregas(info.regiaoNorm);
  });
}

function montarFiltrosRegioes(listaRegioes) {
  regioes = listaRegioes;
  if (!el.filtroRegioes) return;

  el.filtroRegioes.innerHTML = "";
  if (!listaRegioes.length) {
    el.filtroRegioes.closest(".entregas-filtro-wrap")?.classList.add("d-none");
    return;
  }

  el.filtroRegioes.closest(".entregas-filtro-wrap")?.classList.remove("d-none");
  listaRegioes.forEach((reg) => {
    const id = "ent-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
    const label = document.createElement("label");
    label.className = "dashboard-filtro-item dashboard-filtro-cor--" + indiceCorRegiao(reg.norm);
    label.innerHTML =
      `<input type="checkbox" class="visually-hidden" id="${id}" value="${escapeHtml(reg.norm)}">` +
      `<span class="dashboard-filtro-badge">${escapeHtml(reg.rotulo)}</span>`;
    el.filtroRegioes.appendChild(label);
  });

  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", onRegiaoAlterada);
  });
}

function onRegiaoAlterada(evento) {
  const alvo = evento?.target;

  if (alvo?.value === REGIAO_MT && alvo.checked) {
    el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      if (input.value !== REGIAO_MT) input.checked = false;
    });
    municipioSelecionado = null;
    modoMt = true;
    montarFiltroMunicipios([]);
  } else {
    if (alvo?.value !== REGIAO_MT && alvo?.checked) {
      const mtInput = el.filtroRegioes.querySelector(`input[value="${REGIAO_MT}"]`);
      if (mtInput) mtInput.checked = false;
    }
    modoMt = regioesSelecionadas().includes(REGIAO_MT);
    const disponiveis = municipiosDasRegioesSelecionadas();
    if (municipioSelecionado && !disponiveis.some((m) => m.norm === municipioSelecionado)) {
      municipioSelecionado = null;
    }
    montarFiltroMunicipios(disponiveis);
  }

  atualizarPainelTabela();
}

function montarFiltroMunicipios(lista) {
  if (!el.filtroMunicipios || !el.municipiosWrap) return;

  el.filtroMunicipios.innerHTML = "";
  if (modoMt || !lista.length) {
    el.municipiosWrap.classList.add("d-none");
    return;
  }

  el.municipiosWrap.classList.remove("d-none");
  lista.forEach((mun) => {
    const id = "ent-mun-" + mun.norm.replace(/[^a-z0-9]+/g, "-");
    const ativo = municipioSelecionado === mun.norm;
    const corIdx = indiceCorRegiao(mun.regiaoNorm);
    const label = document.createElement("label");
    label.className =
      "entregas-municipio-item entregas-municipio-cor--" +
      corIdx +
      (ativo ? " is-active" : "");
    label.innerHTML =
      `<input type="radio" class="visually-hidden" name="entregaMunicipio" id="${id}" value="${escapeHtml(mun.norm)}"${ativo ? " checked" : ""}>` +
      `<span class="entregas-municipio-badge">${escapeHtml(mun.rotulo)}</span>`;
    el.filtroMunicipios.appendChild(label);
  });

  el.filtroMunicipios.querySelectorAll('input[type="radio"]').forEach((rb) => {
    rb.addEventListener("change", () => {
      if (!rb.checked) return;
      municipioSelecionado = rb.value;
      el.filtroMunicipios.querySelectorAll(".entregas-municipio-item").forEach((item) => {
        item.classList.toggle("is-active", item.querySelector("input")?.value === municipioSelecionado);
      });
      atualizarPainelTabela();
    });
  });
}

function selecaoAtiva() {
  return modoMt || Boolean(municipioSelecionado);
}

function linhasFiltradas() {
  if (!selecaoAtiva()) return [];

  let lista = modoMt ? linhasModoMt() : linhas.slice();

  if (!modoMt && colunaMunicipio) {
    lista = lista.filter(
      (item) =>
        PlanilhaApi.normalizarChave(valorItem(item, colunaMunicipio)) === municipioSelecionado
    );
  }

  return lista;
}

function somarValorTotal(filtradas) {
  if (!colunaValor) return 0;
  return filtradas.reduce((acc, item) => acc + parseNumero(valorItem(item, colunaValor)), 0);
}

function exibirValor(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : '<span class="text-muted">—</span>';
}

function exibirMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return '<span class="text-muted">—</span>';
  const n = parseNumero(val);
  if (Number.isFinite(n)) return fmtMoeda.format(n);
  return escapeHtml(s);
}

function exibirCelula(col, val) {
  if (mesmaColuna(col, colunaValor)) return exibirMoeda(val);
  return exibirValor(val);
}

function criarTh(texto, classes) {
  const th = document.createElement("th");
  th.scope = "col";
  th.className = classes || "";
  th.textContent = texto;
  return th;
}

function montarCabecalhoTabela() {
  const trDesktop = el.cabecalhoDesktop;
  const trMobile = el.cabecalhoMobile;
  if (!trDesktop || !trMobile) return;

  trDesktop.innerHTML = "";
  trMobile.innerHTML = "";

  if (colunaAno) {
    trDesktop.appendChild(
      criarTh(rotuloColuna(colunaAno, "ano"), "entregas-col-ano entregas-tabela-desktop-col")
    );
  }
  if (colunaArea) {
    trDesktop.appendChild(
      criarTh(rotuloColuna(colunaArea, "área"), "entregas-col-area entregas-tabela-desktop-col")
    );
  }
  if (colunaObjeto) {
    trDesktop.appendChild(
      criarTh(rotuloColuna(colunaObjeto, "objeto"), "entregas-col-objeto entregas-tabela-desktop-col")
    );
  }
  colunasExtras.forEach((col) => {
    trDesktop.appendChild(criarTh(col.chave, "entregas-col-extra entregas-tabela-desktop-col"));
  });
  if (colunaValor) {
    trDesktop.appendChild(
      criarTh(
        rotuloColuna(colunaValor, "valor"),
        "text-end entregas-col-valor entregas-tabela-desktop-col"
      )
    );
  }

  if (colunaAno) {
    trMobile.appendChild(
      criarTh(rotuloColuna(colunaAno, "ano"), "entregas-col-ano entregas-tabela-mobile-col")
    );
  }

  const thStack = criarTh("", "entregas-col-stack entregas-tabela-mobile-col");
  thStack.innerHTML =
    '<div class="entregas-th-stack-head">' +
    `<span>${escapeHtml(rotuloColuna(colunaArea, "área"))}</span>` +
    `<span>${escapeHtml(rotuloColuna(colunaObjeto, "objeto"))}</span>` +
    "</div>";
  trMobile.appendChild(thStack);

  if (colunaValor) {
    trMobile.appendChild(
      criarTh(
        rotuloColuna(colunaValor, "valor"),
        "text-end entregas-col-valor entregas-tabela-mobile-col"
      )
    );
  }
}

function criarTdHtml(html, classes) {
  const td = document.createElement("td");
  td.className = classes || "";
  td.innerHTML = html;
  return td;
}

function criarLinhaTabela(item) {
  const tr = document.createElement("tr");

  if (colunaAno) {
    tr.appendChild(
      criarTdHtml(
        exibirValor(valorItem(item, colunaAno)),
        "entregas-col-ano entregas-tabela-desktop-col"
      )
    );
  }
  if (colunaArea) {
    tr.appendChild(
      criarTdHtml(
        exibirValor(valorItem(item, colunaArea)),
        "entregas-col-area entregas-tabela-desktop-col"
      )
    );
  }
  if (colunaObjeto) {
    tr.appendChild(
      criarTdHtml(
        exibirValor(valorItem(item, colunaObjeto)),
        "entregas-col-objeto entregas-tabela-desktop-col"
      )
    );
  }
  colunasExtras.forEach((col) => {
    tr.appendChild(
      criarTdHtml(exibirCelula(col, valorItem(item, col)), "entregas-col-extra entregas-tabela-desktop-col")
    );
  });
  if (colunaValor) {
    tr.appendChild(
      criarTdHtml(
        exibirMoeda(valorItem(item, colunaValor)),
        "text-end entregas-col-valor entregas-tabela-desktop-col"
      )
    );
  }

  if (colunaAno) {
    tr.appendChild(
      criarTdHtml(
        exibirValor(valorItem(item, colunaAno)),
        "entregas-col-ano entregas-tabela-mobile-col"
      )
    );
  }

  const tdStack = criarTdHtml("", "entregas-col-stack entregas-tabela-mobile-col");
  tdStack.innerHTML =
    '<div class="entregas-celula-stack">' +
    `<span class="entregas-stack-area">${exibirValor(valorItem(item, colunaArea))}</span>` +
    `<span class="entregas-stack-objeto">${exibirValor(valorItem(item, colunaObjeto))}</span>` +
    "</div>";
  tr.appendChild(tdStack);

  if (colunaValor) {
    tr.appendChild(
      criarTdHtml(
        exibirMoeda(valorItem(item, colunaValor)),
        "text-end entregas-col-valor entregas-tabela-mobile-col"
      )
    );
  }

  return tr;
}

function atualizarKpis(filtradas) {
  if (el.kpiEntregas) el.kpiEntregas.textContent = fmt.format(filtradas.length);
  if (el.kpiValorTotal) {
    el.kpiValorTotal.textContent = colunaValor ? fmtMoeda.format(somarValorTotal(filtradas)) : "—";
  }
}

function renderizarTabela() {
  const filtradas = linhasFiltradas();
  atualizarKpis(filtradas);
  el.corpo.innerHTML = "";

  if (!selecaoAtiva()) {
    el.vazio.hidden = false;
    el.vazio.textContent = "selecione uma região e um município para ver as entregas.";
    notificarAlturaFrame();
    return;
  }

  if (!filtradas.length) {
    el.vazio.hidden = false;
    el.vazio.textContent = modoMt
      ? "nenhuma entrega encontrada para MT."
      : "nenhuma entrega encontrada para este município.";
    notificarAlturaFrame();
    return;
  }

  el.vazio.hidden = true;
  filtradas.forEach((item) => {
    el.corpo.appendChild(criarLinhaTabela(item));
  });

  notificarAlturaFrame();
}

function atualizarPainelTabela() {
  const mostrar = selecaoAtiva();
  el.tabelaCard?.classList.toggle("d-none", !mostrar);
  el.entregasKpis?.classList.toggle("d-none", !mostrar);
  el.selecioneMsg?.classList.toggle("d-none", mostrar);
  renderizarTabela();
}

function resolverColunas() {
  colunaMunicipio = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_MUNICIPIO);
  colunaAno = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_ANO);
  colunaArea = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_AREA);
  colunaObjeto = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_OBJETO);
  colunaValor = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_VALOR);
  colunasExtras = colunas.filter((col) => !isColunaMunicipio(col) && !isColunaPrincipal(col));
}

async function carregarEntregas() {
  if (!PlanilhaApi.configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando entregas...", "carregando");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const dadosEntregas = await PlanilhaApi.ler(cfg.PLANILHA, cfg.ABA, cfg.LINHA_INICIO_DADOS);
    if (!dadosEntregas) return;

    try {
      const respMun = await fetch(PlanilhaApi.urlGet(cfgMun.PLANILHA, cfgMun.ABA));
      const jsonMun = await respMun.json();
      if (AUTH.tratarResposta(jsonMun) && jsonMun.ok && jsonMun.valores) {
        montarCadastroMunicipios(jsonMun.valores);
      }
    } catch (e) {
      municipiosPorRegiao = new Map();
      mapaMunicipioRegiao = new Map();
    }

    colunas = dadosEntregas.colunas;
    linhas = dadosEntregas.linhas;
    resolverColunas();

    modoMt = false;
    municipioSelecionado = null;
    montarCabecalhoTabela();
    montarFiltrosRegioes(extrairRegioesDoCadastro());
    montarFiltroMunicipios([]);

    atualizarPainelTabela();
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  }
}

function init() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    municipiosWrap: document.getElementById("municipiosWrap"),
    filtroMunicipios: document.getElementById("filtroMunicipios"),
    entregasKpis: document.getElementById("entregasKpis"),
    kpiEntregas: document.getElementById("kpiEntregas"),
    kpiValorTotal: document.getElementById("kpiValorTotal"),
    selecioneMsg: document.getElementById("entregasSelecione"),
    tabelaCard: document.getElementById("tabelaCard"),
    cabecalhoDesktop: document.getElementById("cabecalhoDesktop"),
    cabecalhoMobile: document.getElementById("cabecalhoMobile"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
  };

  window.atualizarPagina = carregarEntregas;
  carregarEntregas();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
