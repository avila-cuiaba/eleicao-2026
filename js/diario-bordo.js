// Página logística — diário de bordo (CRUD na planilha diario-bordo).

const cfg = CONFIG.DIARIO_BORDO;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;

const fmtInteiro = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

let el = {};
let colunas = [];
let colunasTabela = [];
let camposForm = [];
let linhas = [];
let modal = null;
let modoEdicao = null;
let opcoesVeiculos = [];
let opcoesMunicipio = [];

function podeEditar() {
  return typeof AUTH !== "undefined" && AUTH.ehAvilaMaster();
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarStatus(msg, tipo) {
  if (typeof statusPainel === "function" && el.status) statusPainel(el.status, msg, tipo);
}

function limparStatus() {
  if (typeof statusPainel === "function" && el.status) statusPainel(el.status, "", null);
}

function termoBusca() {
  return PlanilhaApi.normalizarChave(el.busca?.value);
}

function numeroMoeda(val) {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const s = String(val ?? "").trim();
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  if (s.includes(",")) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function valorMoedaGravar(valor) {
  const n = numeroMoeda(valor);
  if (n == null) return String(valor ?? "").trim();
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numeroInteiro(val) {
  if (typeof val === "number" && Number.isFinite(val)) return Math.trunc(val);
  const s = String(val ?? "").trim();
  if (!s) return null;
  const limpo = s.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
  if (!limpo || !/^\d+$/.test(limpo)) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return Number(limpo);
}

function valorInteiroExibir(valor) {
  const n = numeroInteiro(valor);
  if (n == null) return String(valor ?? "").trim();
  return fmtInteiro.format(n);
}

function valorInteiroGravar(valor) {
  const n = numeroInteiro(valor);
  if (n == null) return String(valor ?? "").trim();
  return fmtInteiro.format(n);
}

function celulaPlanilha(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function extrairOpcoesMunicipio(valoresMunicipios) {
  const mapa = new Map();
  if (!valoresMunicipios?.length) return [];
  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celulaPlanilha(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;
    const chave = PlanilhaApi.normalizarChave(municipio);
    if (!mapa.has(chave)) mapa.set(chave, municipio);
  }
  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

async function carregarOpcoesMunicipio() {
  const ref = cfg.MUNICIPIOS || {};
  const planilha = ref.PLANILHA || cfgMun.PLANILHA || "municipios";
  const valores = await PlanilhaApi.lerValores(planilha, ref.ABA || cfgMun.ABA || "").catch(() => []);
  return extrairOpcoesMunicipio(valores);
}

function vincularFormatacaoMoedaInput(input) {
  if (!input || input.dataset.moedaFormatada === "1") return;
  input.dataset.moedaFormatada = "1";
  input.placeholder = "0,00";
  input.setAttribute("inputmode", "decimal");
  input.addEventListener("blur", () => {
    const formatado = valorMoedaGravar(input.value);
    input.value = formatado || "";
  });
}

function vincularFormatacaoInteiroInput(input) {
  if (!input || input.dataset.inteiroFormatado === "1") return;
  input.dataset.inteiroFormatado = "1";
  input.setAttribute("inputmode", "numeric");
  input.addEventListener("blur", () => {
    const formatado = valorInteiroGravar(input.value);
    input.value = formatado || "";
  });
}

function planilhaDataParaInputDate(val) {
  if (val == null || val === "") return "";
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return `${br[3]}-${m}-${d}`;
  }
  return "";
}

function inputDateParaPlanilha(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const p = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return s;
  return `${p[3]}/${p[2]}/${p[1]}`;
}

function chaveGravacao(coluna) {
  if (!coluna) return "";
  const planilha = coluna.chavePlanilha != null ? String(coluna.chavePlanilha) : "";
  return planilha.trim() !== "" ? planilha : coluna.chave;
}

function valorItem(item, col) {
  return col ? item[col.chave] : "";
}

function inferirTipoCampo(coluna) {
  if (ehCampoVeiculo(coluna)) return "select-veiculo";
  if (ehCampoMunicipio(coluna)) return "select-municipio";
  if (ehCampoOdometro(coluna)) return "odometro";
  const n = PlanilhaApi.normalizarChave(coluna.chavePlanilha || coluna.chave);
  if (n === "data" || n.startsWith("data ") || n.includes("data-") || n === "dt") return "data";
  if (ehCampoLitros(coluna) || ehCampoValor(coluna)) return "moeda";
  if (/observ|descricao|descrição|nota|comentario|comentário|historico|histórico/.test(n)) {
    return "textarea";
  }
  return "texto";
}

function aliasesCampo(ref, padrao) {
  return (ref?.aliases || padrao).map((a) => PlanilhaApi.normalizarChave(a));
}

function colunaCombina(coluna, ref, padrao) {
  const ch = PlanilhaApi.normalizarChave(coluna.chavePlanilha || coluna.chave);
  return aliasesCampo(ref, padrao).includes(ch);
}

function ehCampoVeiculo(coluna) {
  return colunaCombina(coluna, cfg.CAMPO_VEICULO, ["veiculo", "veículo"]);
}

function ehCampoMunicipio(coluna) {
  return colunaCombina(coluna, cfg.CAMPO_MUNICIPIO, ["municipio", "município", "cidade"]);
}

function ehCampoOdometro(coluna) {
  return colunaCombina(coluna, cfg.CAMPO_ODOMETRO, ["odometro", "odômetro", "hodometro", "hodômetro"]);
}

function ehCampoLitros(coluna) {
  return colunaCombina(coluna, cfg.CAMPO_LITROS, ["litros", "litragem"]);
}

function ehCampoValor(coluna) {
  return colunaCombina(coluna, cfg.CAMPO_VALOR, ["valor"]);
}

function extrairOpcoesVeiculosLista(valores, cfgLista) {
  if (!valores?.length || !cfgLista) return [];
  const indices = cfgLista.COLUNAS_INDICES || [0, 1, 2];
  const sep = cfgLista.SEPARADOR != null ? cfgLista.SEPARADOR : " | ";
  const linhaInicial = cfgLista.LINHA_INICIAL != null ? cfgLista.LINHA_INICIAL : 2;
  const start = Math.max(0, linhaInicial - 1);
  const vistos = new Set();
  const lista = [];
  for (let i = start; i < valores.length; i++) {
    const row = valores[i] || [];
    const partes = indices.map((idx) => String(row[idx] ?? "").trim()).filter(Boolean);
    if (!partes.length) continue;
    const texto = limparTextoVeiculo(partes.join(sep));
    if (!texto) continue;
    const chave = PlanilhaApi.normalizarChave(texto);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push(texto);
  }
  lista.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  return lista;
}

async function carregarOpcoesVeiculos() {
  const ref = cfg.LISTA_VEICULOS || {};
  const planilha = ref.PLANILHA || "diario-bordo-veiculos";
  const valores = await PlanilhaApi.lerValores(planilha, ref.ABA || "").catch(() => []);
  return extrairOpcoesVeiculosLista(valores, ref);
}

function partesTextoVeiculo(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return [];
  const partes = s.split(/\s*\|\s*/).map((p) => p.trim());
  while (partes.length && !partes[partes.length - 1]) partes.pop();
  return partes;
}

function limparTextoVeiculo(texto) {
  return String(texto ?? "")
    .trim()
    .replace(/\s*\|\s*$/g, "")
    .trim();
}

function ordensExibicaoPartesVeiculo() {
  const ref = cfg.LISTA_VEICULOS || {};
  if (Array.isArray(ref.ORDENS_EXIBICAO_PARTES) && ref.ORDENS_EXIBICAO_PARTES.length) {
    return ref.ORDENS_EXIBICAO_PARTES;
  }
  if (Array.isArray(ref.ORDEM_EXIBICAO_PARTES) && ref.ORDEM_EXIBICAO_PARTES.length === 3) {
    return [ref.ORDEM_EXIBICAO_PARTES];
  }
  return [];
}

function textoVeiculoParaExibicao(valor) {
  const ref = cfg.LISTA_VEICULOS || {};
  const sep = ref.SEPARADOR != null ? ref.SEPARADOR : " | ";
  const s = limparTextoVeiculo(valor);
  if (!s) return s;

  const norm = PlanilhaApi.normalizarChave(s);
  if (opcoesVeiculos.some((o) => PlanilhaApi.normalizarChave(o) === norm)) return s;

  const partes = partesTextoVeiculo(s);
  if (partes.length !== 3) return s;

  for (const ordem of ordensExibicaoPartesVeiculo()) {
    if (!ordem || ordem.length !== 3) continue;
    const candidato = limparTextoVeiculo(ordem.map((i) => partes[i] ?? "").join(sep));
    if (
      candidato &&
      opcoesVeiculos.some((o) => PlanilhaApi.normalizarChave(o) === PlanilhaApi.normalizarChave(candidato))
    ) {
      return candidato;
    }
  }
  return s;
}

function htmlOpcoesSelect(opcoes, valorAtual, placeholderVazio) {
  const valor = textoVeiculoParaExibicao(valorAtual);
  const valorNorm = PlanilhaApi.normalizarChave(valor);
  let html = `<option value="">${escapeHtml(placeholderVazio || "selecione...")}</option>`;
  (opcoes || []).forEach((opt) => {
    const sel = PlanilhaApi.normalizarChave(opt) === valorNorm ? " selected" : "";
    html += `<option value="${escapeHtml(opt)}"${sel}>${escapeHtml(opt)}</option>`;
  });
  if (valor && !(opcoes || []).some((o) => PlanilhaApi.normalizarChave(o) === valorNorm)) {
    html += `<option value="${escapeHtml(valor)}" selected>${escapeHtml(valor)}</option>`;
  }
  return html;
}

function colunaIgnorada(col) {
  const ignorar = (cfg.COLUNAS_IGNORAR || []).map((a) => PlanilhaApi.normalizarChave(a));
  const chave = PlanilhaApi.normalizarChave(col.chavePlanilha || col.chave);
  return ignorar.includes(chave);
}

function indiceColunaInicial() {
  return cfg.INDICE_COLUNA_INICIAL != null ? cfg.INDICE_COLUNA_INICIAL : 0;
}

function indiceColunaFinal() {
  return cfg.INDICE_COLUNA_FINAL != null ? cfg.INDICE_COLUNA_FINAL : 5;
}

function colunaNoEscopo(col) {
  if (!col || col.indice == null) return false;
  return col.indice >= indiceColunaInicial() && col.indice <= indiceColunaFinal();
}

function ordenarColunas(lista) {
  const ordem = (cfg.ORDEM_COLUNAS || []).map((a) => PlanilhaApi.normalizarChave(a));
  const indice = (col) => {
    const ch = PlanilhaApi.normalizarChave(col.chavePlanilha || col.chave);
    const i = ordem.indexOf(ch);
    return i === -1 ? ordem.length + col.indice : i;
  };
  return lista.slice().sort((a, b) => indice(a) - indice(b));
}

function resolverCamposFormulario() {
  const defs = cfg.CAMPOS_FORMULARIO || [];
  if (defs.length) {
    return defs
      .map((campo) => ({
        ...campo,
        rotulo: campo.rotulo || campo.id,
        tipo: campo.tipo || "texto",
        coluna: PlanilhaApi.acharColuna(colunas, campo.aliases, campo.indice),
      }))
      .filter((c) => c.coluna && colunaNoEscopo(c.coluna));
  }
  return ordenarColunas(
    colunas.filter((c) => colunaNoEscopo(c) && !colunaIgnorada(c))
  ).map((col) => ({
    id: "col-" + col.indice,
    rotulo: col.chavePlanilha || col.chave,
    tipo: inferirTipoCampo(col),
    coluna: col,
  }));
}

function exibirCelula(col, val) {
  const s = String(val ?? "").trim();
  if (!s) return '<span class="text-muted">—</span>';
  const tipo = inferirTipoCampo(col);
  if (ehCampoVeiculo(col)) {
    return escapeHtml(textoVeiculoParaExibicao(val) || s);
  }
  if (tipo === "data") {
    const iso = planilhaDataParaInputDate(val);
    return escapeHtml(iso ? inputDateParaPlanilha(iso) : s);
  }
  if (tipo === "odometro") {
    const fmt = valorInteiroExibir(val);
    return escapeHtml(fmt || s);
  }
  if (tipo === "moeda") {
    const fmt = valorMoedaGravar(val);
    return escapeHtml(fmt || s);
  }
  return escapeHtml(s);
}

function linhasFiltradas() {
  const termo = termoBusca();
  if (!termo) return linhas.slice();
  return linhas.filter((item) =>
    colunasTabela.some((col) =>
      PlanilhaApi.normalizarChave(valorItem(item, col)).includes(termo)
    )
  );
}

function classeCelulaTabelaColuna(col) {
  const tipo = inferirTipoCampo(col);
  if (tipo === "moeda") return "text-end text-nowrap diario-bordo-col-moeda";
  if (tipo === "odometro") return "text-end text-nowrap diario-bordo-col-odometro";
  return "text-nowrap";
}

function resumoPorVeiculo(lista) {
  const colLitros = colunasTabela.find((c) => ehCampoLitros(c));
  const colValor = colunasTabela.find((c) => ehCampoValor(c));
  const colVeiculo = colunasTabela.find((c) => ehCampoVeiculo(c));
  if (!colVeiculo) return [];

  const mapa = new Map();
  (lista || []).forEach((item) => {
    const rotuloBruto = String(valorItem(item, colVeiculo) ?? "").trim() || "—";
    const rotulo = textoVeiculoParaExibicao(rotuloBruto) || rotuloBruto;
    const norm = PlanilhaApi.normalizarChave(rotulo) || "__vazio";
    if (!mapa.has(norm)) mapa.set(norm, { veiculo: rotulo, litros: 0, valor: 0 });
    const agg = mapa.get(norm);
    if (colLitros) {
      const n = numeroMoeda(valorItem(item, colLitros));
      if (n != null) agg.litros += n;
    }
    if (colValor) {
      const n = numeroMoeda(valorItem(item, colValor));
      if (n != null) agg.valor += n;
    }
  });

  return Array.from(mapa.values()).sort((a, b) =>
    a.veiculo.localeCompare(b.veiculo, "pt-BR", { sensitivity: "base" })
  );
}

function htmlTabelaResumoVeiculosRelatorio(lista) {
  const grupos = resumoPorVeiculo(lista);
  if (!grupos.length) {
    return '<p class="rel-vazio text-secondary small mb-0">nenhum lançamento para resumir.</p>';
  }

  const linhasHtml = grupos
    .map(
      (g) =>
        "<tr>" +
        `<td>${escapeHtml(textoVeiculoParaExibicao(g.veiculo) || g.veiculo)}</td>` +
        `<td class="text-end diario-bordo-col-moeda">${escapeHtml(valorMoedaGravar(g.litros) || "0,00")}</td>` +
        `<td class="text-end diario-bordo-col-moeda">${escapeHtml(valorMoedaGravar(g.valor) || "0,00")}</td>` +
        "</tr>"
    )
    .join("");

  return (
    '<table class="table table-sm rel-tabela diario-bordo-resumo-veiculos">' +
    '<thead class="table-light"><tr>' +
    '<th scope="col">veículo</th>' +
    '<th scope="col" class="text-end">litros</th>' +
    '<th scope="col" class="text-end">valor total</th>' +
    "</tr></thead>" +
    "<tbody>" +
    linhasHtml +
    "</tbody></table>"
  );
}

function totaisDiarioBordo(lista) {
  const colLitros = colunasTabela.find((c) => ehCampoLitros(c));
  const colValor = colunasTabela.find((c) => ehCampoValor(c));
  const colVeiculo = colunasTabela.find((c) => ehCampoVeiculo(c));
  let litros = 0;
  let valor = 0;
  const veiculos = new Set();

  (lista || []).forEach((item) => {
    if (colLitros) {
      const n = numeroMoeda(valorItem(item, colLitros));
      if (n != null) litros += n;
    }
    if (colValor) {
      const n = numeroMoeda(valorItem(item, colValor));
      if (n != null) valor += n;
    }
    if (colVeiculo) {
      const v = String(valorItem(item, colVeiculo) ?? "").trim();
      if (v) veiculos.add(PlanilhaApi.normalizarChave(v));
    }
  });

  return {
    lancamentos: lista?.length || 0,
    veiculos: veiculos.size,
    litros,
    valor,
  };
}

function atualizarKpisDiarioBordo() {
  const t = totaisDiarioBordo(linhasFiltradas());
  if (el.kpiLancamentos) el.kpiLancamentos.textContent = fmtInteiro.format(t.lancamentos);
  if (el.kpiVeiculos) el.kpiVeiculos.textContent = fmtInteiro.format(t.veiculos);
  if (el.kpiLitros) el.kpiLitros.textContent = valorMoedaGravar(t.litros) || "0,00";
  if (el.kpiValor) el.kpiValor.textContent = valorMoedaGravar(t.valor) || "0,00";
}

function montarCabecalhoTabela() {
  if (!el.cabecalho) return;
  el.cabecalho.innerHTML = "";
  colunasTabela.forEach((col) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = col.chavePlanilha || col.chave;
    th.className = classeCelulaTabelaColuna(col).replace("text-nowrap", "").trim();
    el.cabecalho.appendChild(th);
  });
  if (podeEditar()) {
    const thAcoes = document.createElement("th");
    thAcoes.scope = "col";
    thAcoes.className = "text-end diario-bordo-col-acoes";
    thAcoes.textContent = "ações";
    el.cabecalho.appendChild(thAcoes);
  }
}

function chaveCampoColuna(coluna) {
  return PlanilhaApi.normalizarChave(coluna.chavePlanilha || coluna.chave);
}

function slotParFormulario(coluna) {
  const ch = chaveCampoColuna(coluna);
  const pares = cfg.PARES_FORMULARIO || [];
  for (let i = 0; i < pares.length; i++) {
    const [esq, dir] = pares[i];
    const normEsq = (esq || []).map((a) => PlanilhaApi.normalizarChave(a));
    const normDir = (dir || []).map((a) => PlanilhaApi.normalizarChave(a));
    if (normEsq.includes(ch)) return { par: i, slot: 0 };
    if (normDir.includes(ch)) return { par: i, slot: 1 };
  }
  return null;
}

function montarFormulario(dados) {
  if (!el.formCampos) return;
  el.formCampos.innerHTML = "";

  const pares = cfg.PARES_FORMULARIO || [];
  const porPar = new Map();
  const foraPar = [];

  camposForm.forEach((campo) => {
    const slot = slotParFormulario(campo.coluna);
    if (!slot) {
      foraPar.push(campo);
      return;
    }
    if (!porPar.has(slot.par)) porPar.set(slot.par, [null, null]);
    porPar.get(slot.par)[slot.slot] = campo;
  });

  for (let i = 0; i < pares.length; i++) {
    const parCampos = porPar.get(i);
    if (!parCampos || (!parCampos[0] && !parCampos[1])) continue;
    const row = document.createElement("div");
    row.className = "row g-2 diario-bordo-form-linha";
    parCampos.forEach((campo) => {
      if (!campo) {
        const vazio = document.createElement("div");
        vazio.className = "col-6 col-md-6";
        vazio.setAttribute("aria-hidden", "true");
        row.appendChild(vazio);
        return;
      }
      const cell = criarCampoForm(campo, dados, "mb-2 col-6 col-md-6");
      row.appendChild(cell);
    });
    el.formCampos.appendChild(row);
  }

  foraPar.forEach((campo) => {
    const row = document.createElement("div");
    row.className = "row g-2 diario-bordo-form-linha";
    row.appendChild(criarCampoForm(campo, dados, "mb-2 col-12"));
    el.formCampos.appendChild(row);
  });
}

function criarCampoForm(campo, dados, classeColuna) {
  const col = campo.coluna;
  const id = "campo-" + campo.id;
  const valorBruto = dados && col ? dados[col.chave] : "";
  const wrap = document.createElement("div");
  wrap.className = classeColuna || "mb-2 col-12 col-md-6";

  if (campo.tipo === "textarea") {
    wrap.className = "mb-2 col-12";
    wrap.innerHTML =
      `<label class="form-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
      `<textarea class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(col))}" rows="2">${escapeHtml(String(valorBruto ?? ""))}</textarea>`;
    return wrap;
  }

  if (campo.tipo === "data") {
    const iso = planilhaDataParaInputDate(valorBruto);
    wrap.innerHTML =
      `<label class="form-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
      `<input type="date" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(col))}" value="${escapeHtml(iso)}" />`;
    return wrap;
  }

  if (campo.tipo === "select-veiculo") {
    const valorExib = textoVeiculoParaExibicao(valorBruto);
    const optionsHtml = htmlOpcoesSelect(opcoesVeiculos, valorExib);
    wrap.innerHTML =
      `<label class="form-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
      `<select class="form-select form-select-sm" id="${id}" name="${escapeHtml(chaveGravacao(col))}">${optionsHtml}</select>`;
    return wrap;
  }

  if (campo.tipo === "select-municipio") {
    const optionsHtml = htmlOpcoesSelect(opcoesMunicipio, valorBruto, "selecione");
    wrap.innerHTML =
      `<label class="form-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
      `<select class="form-select form-select-sm" id="${id}" name="${escapeHtml(chaveGravacao(col))}">${optionsHtml}</select>`;
    return wrap;
  }

  let valorExibir = String(valorBruto ?? "");
  if (campo.tipo === "moeda") valorExibir = valorMoedaGravar(valorBruto) || valorExibir;
  if (campo.tipo === "odometro") valorExibir = valorInteiroExibir(valorBruto) || valorExibir;

  wrap.innerHTML =
    `<label class="form-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<input type="text" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(col))}" value="${escapeHtml(valorExibir)}" autocomplete="off" />`;

  const input = wrap.querySelector("input");
  if (campo.tipo === "moeda") vincularFormatacaoMoedaInput(input);
  if (campo.tipo === "odometro") vincularFormatacaoInteiroInput(input);
  return wrap;
}

function lerDadosFormulario() {
  const dados = {};
  camposForm.forEach((campo) => {
    const col = campo.coluna;
    const input = el.formCampos.querySelector(`[name="${CSS.escape(chaveGravacao(col))}"]`);
    if (!input) return;
    let val = input.value;
    if (campo.tipo === "data") val = inputDateParaPlanilha(val);
    else if (campo.tipo === "moeda") val = valorMoedaGravar(val) || val.trim();
    else if (campo.tipo === "odometro") val = valorInteiroGravar(val) || val.trim();
    else if (campo.tipo === "select-veiculo") val = textoVeiculoParaExibicao(val) || val.trim();
    dados[chaveGravacao(col)] = val;
  });
  return dados;
}

function abrirNovo() {
  if (!podeEditar()) return;
  modoEdicao = null;
  el.modalTitulo.textContent = "novo lançamento";
  montarFormulario(null);
  modal.show();
}

function abrirEditar(item) {
  if (!podeEditar()) return;
  modoEdicao = item._linha;
  el.modalTitulo.textContent = "editar lançamento";
  montarFormulario(item);
  modal.show();
}

async function confirmarExcluir(item) {
  if (!podeEditar()) return;
  const ok =
    typeof AppConfirm !== "undefined"
      ? await AppConfirm.confirm("excluir este lançamento?", { perigo: true, icon: "warning" })
      : window.confirm("excluir este lançamento?");
  if (!ok) return;
  try {
    await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "excluir",
      linha: item._linha,
      aba: cfg.ABA || "",
      origem: "diario-bordo",
    });
    AppToast.show("registro excluído.", "sucesso");
    await carregar(true);
  } catch (e) {
    AppToast.show(PlanilhaApi.mensagemErro(e), "erro");
  }
}

async function salvarFormulario(evento) {
  evento.preventDefault();
  if (!podeEditar()) return;
  const dados = lerDadosFormulario();
  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvar });
  try {
    const payload = {
      dados,
      aba: cfg.ABA || "",
      origem: "diario-bordo",
    };
    if (modoEdicao) {
      await PlanilhaApi.gravar(cfg.PLANILHA, { ...payload, acao: "atualizar", linha: modoEdicao });
      AppToast.show("registro atualizado.", "sucesso");
    } else {
      await PlanilhaApi.gravar(cfg.PLANILHA, { ...payload, acao: "inserir" });
      AppToast.show("registro incluído.", "sucesso");
    }
    modal.hide();
    await carregar(true);
  } catch (e) {
    AppToast.show(PlanilhaApi.mensagemErro(e), "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvar });
  }
}

function renderizarTabela() {
  const filtradas = linhasFiltradas();
  el.corpo.innerHTML = "";
  atualizarKpisDiarioBordo();
  if (!filtradas.length) {
    el.vazio.hidden = false;
    return;
  }
  el.vazio.hidden = true;

  filtradas.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.linha = String(item._linha);
    colunasTabela.forEach((col) => {
      const td = document.createElement("td");
      td.className = classeCelulaTabelaColuna(col);
      td.innerHTML = exibirCelula(col, valorItem(item, col));
      tr.appendChild(td);
    });
    if (podeEditar()) {
      const tdAcoes = document.createElement("td");
      tdAcoes.className = "text-end text-nowrap diario-bordo-col-acoes";
      tdAcoes.innerHTML = MasterCrud.acoesLinha(item._linha);
      MasterCrud.pararPropagacao(tdAcoes);
      tdAcoes.querySelector('[data-acao="editar"]')?.addEventListener("click", () => abrirEditar(item));
      tdAcoes.querySelector('[data-acao="excluir"]')?.addEventListener("click", () => confirmarExcluir(item));
      tr.appendChild(tdAcoes);
    }
    el.corpo.appendChild(tr);
  });
}

async function carregar(silencioso) {
  if (!PlanilhaApi.configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }
  if (!silencioso) mostrarStatus("Carregando diário de bordo...", "carregando");
  try {
    const [dados, listaVeiculos, listaMunicipios] = await Promise.all([
      PlanilhaApi.ler(cfg.PLANILHA, cfg.ABA || "", cfg.LINHA_INICIO_DADOS || 2),
      carregarOpcoesVeiculos(),
      carregarOpcoesMunicipio(),
    ]);
    if (!dados) return;
    opcoesVeiculos = listaVeiculos;
    opcoesMunicipio = listaMunicipios;
    colunas = dados.colunas;
    linhas = dados.linhas;
    camposForm = resolverCamposFormulario();
    colunasTabela = camposForm.map((c) => c.coluna);
    montarCabecalhoTabela();
    renderizarTabela();
    if (!silencioso) limparStatus();
  } catch (e) {
    mostrarStatus(PlanilhaApi.mensagemErro(e), "erro");
  }
}

function init() {
  el = {
    status: document.getElementById("status"),
    busca: document.getElementById("buscaDiarioBordo"),
    cabecalho: document.getElementById("cabecalhoTabela"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
    btnNovo: document.getElementById("btnNovo"),
    form: document.getElementById("formDiarioBordo"),
    formCampos: document.getElementById("formCampos"),
    modalEl: document.getElementById("modalDiarioBordo"),
    modalTitulo: document.getElementById("modalTitulo"),
    btnSalvar: document.getElementById("btnSalvar"),
    kpiLancamentos: document.getElementById("kpiDiarioLancamentos"),
    kpiVeiculos: document.getElementById("kpiDiarioVeiculos"),
    kpiLitros: document.getElementById("kpiDiarioLitros"),
    kpiValor: document.getElementById("kpiDiarioValor"),
  };

  if (el.btnNovo) {
    el.btnNovo.classList.toggle("d-none", !podeEditar());
    el.btnNovo.addEventListener("click", abrirNovo);
  }
  el.busca?.addEventListener("input", renderizarTabela);
  el.form?.addEventListener("submit", salvarFormulario);
  modal = bootstrap.Modal.getOrCreateInstance(el.modalEl);

  window.atualizarPagina = () => carregar(false);
  AUTH.exigir();
  carregar(false);
}

function htmlCardsRelatorioPagina() {
  const htmlTabela = htmlTabelaResumoVeiculosRelatorio(linhasFiltradas());
  if (!htmlTabela) return "";
  return (
    '<section class="rel-secao rel-secao-resumo-veiculos"><h2>resumo</h2>' + htmlTabela + "</section>"
  );
}

function coletarTabelasRelatorioPagina(doc) {
  const Rel = window.Relatorio;
  if (!Rel) return [];
  const root = doc || document;
  const table = root.querySelector("table.diario-bordo-tabela");
  if (!table) return [];
  return [
    {
      titulo: "lançamentos",
      html: Rel.htmlTabelaClonada(table),
    },
  ];
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("diario-bordo-tabela")) return;
  table.querySelectorAll(".diario-bordo-col-acoes").forEach((el) => el.remove());
}

function estilosRelatorioPagina() {
  return (
    ".page-diario-bordo .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-diario-bordo .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-diario-bordo .rel-secao-resumo-veiculos{margin-bottom:0.35rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-diario-bordo .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-diario-bordo table.rel-tabela.diario-bordo-resumo-veiculos{width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:0.1rem;}" +
    ".page-diario-bordo table.rel-tabela.diario-bordo-resumo-veiculos th," +
    ".page-diario-bordo table.rel-tabela.diario-bordo-resumo-veiculos td{padding:0.35rem 0.5rem;border:1px solid #e2e8f0;}" +
    ".page-diario-bordo table.rel-tabela.diario-bordo-resumo-veiculos th.diario-bordo-col-moeda," +
    ".page-diario-bordo table.rel-tabela.diario-bordo-resumo-veiculos td.diario-bordo-col-moeda{" +
    "text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".page-diario-bordo table.rel-tabela.diario-bordo-tabela th.diario-bordo-col-moeda," +
    ".page-diario-bordo table.rel-tabela.diario-bordo-tabela td.diario-bordo-col-moeda," +
    ".page-diario-bordo table.rel-tabela.diario-bordo-tabela th.diario-bordo-col-odometro," +
    ".page-diario-bordo table.rel-tabela.diario-bordo-tabela td.diario-bordo-col-odometro{" +
    "text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:1rem;padding-right:1rem;}" +
    ".page-diario-bordo table.rel-tabela.diario-bordo-tabela{font-size:8.5pt;margin-top:0.15rem;}" +
    "@media print{" +
    ".page-diario-bordo h1{font-size:14pt;margin-bottom:0.1rem;}" +
    ".page-diario-bordo .rel-gerado{margin-bottom:0.35rem;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.coletarTabelasRelatorioPagina = coletarTabelasRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;

document.addEventListener("DOMContentLoaded", init);
