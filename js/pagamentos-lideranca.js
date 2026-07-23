// Página pagamentos — por liderança (orçamento × pagamento).

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cfg = CONFIG.PAGAMENTOS_LIDERANCA;
const cfgPessoal = CONFIG.PESSOAL;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLUNAS_EDITAVEIS = new Set(cfg.COLUNAS_EDITAVEIS || []);
const COLS_TABELA = 7;

const CAMPOS_IDENT = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
];

const CAMPO_OBSERVACAO = {
  prop: "observacao",
  chave: "OBSERVACAO",
  aliases: ["observacao", "observação"],
};

const CAMPOS_PESSOAL = [
  {
    propOrc: "proprioValor",
    propPgto: "proprioPgto",
    chaveOrc: "PROPRIO_VALOR",
    chavePgto: "PROPRIO_PGTO",
    aliasesOrc: ["proprio-apoiador-valor"],
    aliasesPgto: ["proprio-apoiador-pgto"],
    rotulo: "próprio apoiador",
    marcador: "pessoal",
    elOrc: "campoProprioValor",
    elPgto: "campoProprioPgto",
  },
  {
    propOrc: "liderValor",
    propPgto: "liderPgto",
    chaveOrc: "LIDER_VALOR",
    chavePgto: "LIDER_PGTO",
    aliasesOrc: ["lider-valor"],
    aliasesPgto: ["lider-pgto"],
    rotulo: "líder",
    marcador: "pessoal",
    elOrc: "campoLiderValor",
    elPgto: "campoLiderPgto",
  },
  {
    propOrc: "integralValor",
    propPgto: "integralPgto",
    chaveOrc: "INTEGRAL_VALOR",
    chavePgto: "INTEGRAL_PGTO",
    aliasesOrc: ["integral-valor"],
    aliasesPgto: ["integral-pgto"],
    rotulo: "período integral",
    marcador: "pessoal",
    elOrc: "campoIntegralValor",
    elPgto: "campoIntegralPgto",
  },
  {
    propOrc: "meioValor",
    propPgto: "meioPgto",
    chaveOrc: "MEIO_VALOR",
    chavePgto: "MEIO_PGTO",
    aliasesOrc: ["meio-valor"],
    aliasesPgto: ["meio-pgto"],
    rotulo: "meio período",
    marcador: "pessoal",
    elOrc: "campoMeioValor",
    elPgto: "campoMeioPgto",
  },
  {
    propOrc: "customValor",
    propPgto: "customPgto",
    chaveOrc: "CUSTOMIZADO_VALOR",
    chavePgto: "CUSTOMIZADO_PGTO",
    aliasesOrc: ["customizado-valor"],
    aliasesPgto: ["customizado-pgto"],
    rotulo: "customizado",
    marcador: "pessoal",
    elOrc: "campoCustomValor",
    elPgto: "campoCustomPgto",
  },
];

const CAMPOS_GERAL = [
  {
    propOrc: "combustivelOrc",
    propPgto: "combustivelPgto",
    chaveOrc: "COMBUSTIVEL_ORC",
    chavePgto: "COMBUSTIVEL_PGTO",
    aliasesOrc: ["orcamento-combustivel"],
    aliasesPgto: ["combustivel-pgto"],
    rotulo: "combustível",
    marcador: "combustivel",
    elOrc: "campoCombustivelOrc",
    elPgto: "campoCombustivelPgto",
  },
  {
    propOrc: "diversosOrc",
    propPgto: "diversosPgto",
    chaveOrc: "DIVERSOS_ORC",
    chavePgto: "DIVERSOS_PGTO",
    aliasesOrc: ["orcamento-diversos"],
    aliasesPgto: ["diversos-pgto"],
    rotulo: "diversos",
    marcador: "diversos",
    elOrc: "campoDiversosOrc",
    elPgto: "campoDiversosPgto",
  },
  {
    propOrc: "diaDOrc",
    propPgto: "diaDPgto",
    chaveOrc: "DIA_D_ORC",
    chavePgto: "DIA_D_PGTO",
    aliasesOrc: ["orcamento-dia-d", "orcamento-diad", "orcamento dia d"],
    aliasesPgto: ["dia-d-pgto", "diad-pgto"],
    rotulo: "dia D",
    marcador: "diad",
    preserveCase: true,
    elOrc: "campoDiaDOrc",
    elPgto: "campoDiaDPgto",
  },
];

const CAMPOS_EDICAO = [...CAMPOS_PESSOAL, ...CAMPOS_GERAL];

const CAMPOS_KPI = [
  {
    propOrc: "pessoalOrc",
    propPgto: "pessoalPgto",
    chaveOrc: "PESSOAL_ORC",
    chavePgto: "PESSOAL_PGTO",
    aliasesOrc: ["orcamento-pessoal", "pessoal", "contratos-distribuidos-apoiadores"],
    aliasesPgto: ["pessoal-pgto", "pessoal pgto"],
    kpi: "pessoal",
  },
  {
    propOrc: "combustivelOrc",
    propPgto: "combustivelPgto",
    chaveOrc: "COMBUSTIVEL_ORC",
    chavePgto: "COMBUSTIVEL_PGTO",
    aliasesOrc: ["orcamento-combustivel"],
    aliasesPgto: ["combustivel-pgto"],
    kpi: "combustivel",
  },
  {
    propOrc: "diversosOrc",
    propPgto: "diversosPgto",
    chaveOrc: "DIVERSOS_ORC",
    chavePgto: "DIVERSOS_PGTO",
    aliasesOrc: ["orcamento-diversos"],
    aliasesPgto: ["diversos-pgto"],
    kpi: "diversos",
  },
  {
    propOrc: "diaDOrc",
    propPgto: "diaDPgto",
    chaveOrc: "DIA_D_ORC",
    chavePgto: "DIA_D_PGTO",
    aliasesOrc: ["orcamento-dia-d", "orcamento-diad"],
    aliasesPgto: ["dia-d-pgto", "diad-pgto"],
    kpi: "diaD",
  },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();
let nomesColunaPlanilha = {};
let modalCrud = null;
let modoCrud = "atualizar";
let linhaCrud = null;
let itemOriginalCrud = null;
const popoverTabela = PopoverTabela.criar();

function atualizarMetadadosPlanilha(valores) {
  const cab = valores[0] || [];
  const indices = resolverIndices(cab);
  nomesColunaPlanilha = {};

  CAMPOS_IDENT.forEach((campo) => {
    const idx = indices[campo.prop];
    if (idx != null && idx >= 0) {
      const nome = String(cab[idx] ?? "").trim();
      nomesColunaPlanilha[campo.prop] = nome || campo.aliases[0];
    }
  });

  CAMPOS_EDICAO.forEach((par) => {
    const idxOrc = indices[par.propOrc];
    const idxPgto = indices[par.propPgto];
    if (idxOrc != null && idxOrc >= 0) {
      const nome = String(cab[idxOrc] ?? "").trim();
      nomesColunaPlanilha[par.propOrc] = nome || par.aliasesOrc[0];
    }
    if (idxPgto != null && idxPgto >= 0) {
      const nome = String(cab[idxPgto] ?? "").trim();
      nomesColunaPlanilha[par.propPgto] = nome || par.aliasesPgto[0];
    }
  });

  CAMPOS_KPI.forEach((campo) => {
    const idxOrc = indices[campo.propOrc];
    const idxPgto = indices[campo.propPgto];
    if (idxOrc != null && idxOrc >= 0 && !nomesColunaPlanilha[campo.propOrc]) {
      const nome = String(cab[idxOrc] ?? "").trim();
      nomesColunaPlanilha[campo.propOrc] = nome || campo.aliasesOrc[0];
    }
    if (idxPgto != null && idxPgto >= 0 && !nomesColunaPlanilha[campo.propPgto]) {
      const nome = String(cab[idxPgto] ?? "").trim();
      nomesColunaPlanilha[campo.propPgto] = nome || campo.aliasesPgto[0];
    }
  });

  const idxObs = indices[CAMPO_OBSERVACAO.prop];
  if (idxObs != null && idxObs >= 0) {
    const nome = String(cab[idxObs] ?? "").trim();
    nomesColunaPlanilha[CAMPO_OBSERVACAO.prop] = nome || CAMPO_OBSERVACAO.aliases[0];
  }
}

function valorMoedaIgual(a, b) {
  return parseNumero(a) === parseNumero(b);
}

function colunaEditavelPermitida(chaveConfig) {
  return COLUNAS_EDITAVEIS.has(chaveConfig);
}

function dadosGravacaoAlterados(form, original) {
  const dados = {};
  const base = original || {};

  CAMPOS_EDICAO.forEach((par) => {
    if (!colunaEditavelPermitida(par.chavePgto)) return;

    const chave = nomesColunaPlanilha[par.propPgto];
    const input = el[par.elPgto];
    if (!chave || !input || input.disabled) return;

    const novo = form[par.propPgto];
    if (valorMoedaIgual(novo, base[par.propPgto])) return;

    dados[chave] = novo === "" ? "" : novo;
  });

  if (colunaEditavelPermitida(CAMPO_OBSERVACAO.chave)) {
    const chaveObs = nomesColunaPlanilha[CAMPO_OBSERVACAO.prop];
    if (chaveObs) {
      const obsNova = String(form.observacao ?? "").trim();
      const obsAntiga = String(base.observacao ?? "").trim();
      if (obsNova !== obsAntiga) dados[chaveObs] = obsNova;
    }
  }

  return dados;
}

function itemPorLinha(numLinha) {
  return linhas.find((r) => r._linha === numLinha) || null;
}

function lerFormulario() {
  const base = itemPorLinha(linhaCrud) || {};
  const dados = {
    lideranca: String(base.lideranca ?? "").trim(),
    municipio: String(base.municipio ?? "").trim(),
    observacao: String(el.campoObservacao?.value ?? "").trim(),
  };
  CAMPOS_EDICAO.forEach((par) => {
    dados[par.propOrc] = parseNumero(el[par.elOrc]?.value);
    dados[par.propPgto] = el[par.elPgto]?.disabled ? "" : lerCampoMoeda(el[par.elPgto]);
  });
  return dados;
}

function valorParaCampoOrcModal(val) {
  const n = parseNumero(val);
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
}

function valorParaCampoMoeda(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return fmtMoeda.format(parseNumero(val));
}

function orcamentoPermitePagamento(val) {
  return parseNumero(val) > 0;
}

function atualizarEstadoCampoPagamento(par) {
  const inputOrc = el[par.elOrc];
  const inputPgto = el[par.elPgto];
  if (!inputOrc || !inputPgto) return;

  const permite = orcamentoPermitePagamento(inputOrc.value);
  inputPgto.disabled = !permite;
  inputPgto.classList.toggle("pag-lideranca-modal-pgto--bloqueado", !permite);
  if (!permite) inputPgto.value = "";
}

function atualizarEstadoCamposPagamento() {
  CAMPOS_EDICAO.forEach(atualizarEstadoCampoPagamento);
}

function validarPagamentosFormulario(form) {
  for (const par of CAMPOS_EDICAO) {
    const orc = parseNumero(form[par.propOrc]);
    const pgto = parseNumero(form[par.propPgto]);
    if (pgto > orc) return par.rotulo;
  }
  return null;
}

function lerCampoMoeda(input) {
  const s = String(input?.value ?? "").trim();
  if (!s) return "";
  return parseNumero(s);
}

function formatarInputMoeda(input) {
  if (!input || input.disabled) return;
  const digits = String(input.value ?? "").replace(/\D/g, "");
  if (!digits) {
    input.value = "";
    return;
  }
  const num = parseInt(digits, 10) / 100;
  input.value = fmtMoeda.format(num);
}

function aoDigitarMoedaPgto(e) {
  const input = e.target.closest(".pag-lideranca-modal-pgto");
  if (!input || input.disabled) return;
  formatarInputMoeda(input);
  const pos = input.value.length;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(pos, pos);
    } catch (_) {
      /* input sem foco */
    }
  });
}

function vincularMascarasMoedaPagamento() {
  const form = document.getElementById("formApoiadorCrud");
  if (!form || form.dataset.mascaraMoedaPgto) return;
  form.dataset.mascaraMoedaPgto = "1";
  form.addEventListener("input", aoDigitarMoedaPgto);
  form.addEventListener("blur", (e) => {
    const input = e.target.closest(".pag-lideranca-modal-pgto");
    if (input && !input.disabled) formatarInputMoeda(input);
  }, true);
}

function preencherFormulario(item) {
  const dados = item || {};
  if (el.modalLiderancaNome) el.modalLiderancaNome.textContent = String(dados.lideranca ?? "").trim() || "—";
  if (el.modalMunicipioNome) el.modalMunicipioNome.textContent = String(dados.municipio ?? "").trim();
  if (el.campoObservacao) el.campoObservacao.value = String(dados.observacao ?? "").trim();

  CAMPOS_EDICAO.forEach((par) => {
    const inputOrc = el[par.elOrc];
    const inputPgto = el[par.elPgto];
    const orc = dados[par.propOrc];
    if (inputOrc) inputOrc.value = valorParaCampoOrcModal(orc);
    if (inputPgto) {
      inputPgto.value = orcamentoPermitePagamento(orc)
        ? valorParaCampoMoeda(dados[par.propPgto])
        : "";
    }
  });
  atualizarEstadoCamposPagamento();
}

function abrirModalEditar(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  modoCrud = "atualizar";
  linhaCrud = numLinha;
  itemOriginalCrud = { ...item };
  el.modalTitulo.textContent = "editar pagamentos";
  preencherFormulario(item);
  document.getElementById("tabPagPessoalBtn")?.click();
  modalCrud.show();
}

function capturarFiltrosTabela() {
  return {
    buscaLideranca: el.buscaLideranca?.value ?? "",
    regioes: regioesSelecionadas(),
  };
}

function restaurarFiltrosTabela(filtros) {
  if (!filtros) return;

  if (el.buscaLideranca && el.buscaLideranca.value !== filtros.buscaLideranca) {
    el.buscaLideranca.value = filtros.buscaLideranca;
  }

  if (!el.filtroRegioes || !filtros.regioes?.length) return;

  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = filtros.regioes.includes(cb.value);
  });
}

function sincronizarTotaisPessoalExibicao(item) {
  const campo = CAMPOS_KPI.find((c) => c.kpi === "pessoal");
  if (!campo) return;

  item[campo.propOrc] = CAMPOS_PESSOAL.reduce((acc, par) => acc + parseNumero(item[par.propOrc]), 0);
  item[campo.propPgto] = CAMPOS_PESSOAL.reduce((acc, par) => acc + parseNumero(item[par.propPgto]), 0);
}

function aplicarAlteracoesLinhaLocal(numLinha, form) {
  const idx = linhas.findIndex((r) => r._linha === numLinha);
  if (idx < 0) return null;

  const item = { ...linhas[idx] };

  CAMPOS_EDICAO.forEach((par) => {
    item[par.propOrc] = form[par.propOrc];
    if (!colunaEditavelPermitida(par.chavePgto)) return;
    const input = el[par.elPgto];
    if (!input || input.disabled) return;
    item[par.propPgto] = form[par.propPgto];
  });

  if (colunaEditavelPermitida(CAMPO_OBSERVACAO.chave)) {
    item.observacao = form.observacao;
  }

  sincronizarTotaisPessoalExibicao(item);
  item.finTotal = calcularTotaisPagamento(item);
  linhas[idx] = item;
  return item;
}

function atualizarInterfaceAposSalvar(numLinha, filtros) {
  restaurarFiltrosTabela(filtros);
  renderizarTabela();
  requestAnimationFrame(() => {
    alinharColunasTabela();
    const btn = el.corpo?.querySelector(`.crud-acao-icone[data-linha="${numLinha}"]`);
    btn?.closest("tr")?.scrollIntoView({ block: "nearest" });
    notificarAlturaFrame();
  });
}

async function salvarCrud() {
  const form = lerFormulario();
  if (!form.lideranca || !form.municipio) {
    MasterCrud.toast("registro sem liderança ou município.", "erro");
    return;
  }

  const rotuloInvalido = validarPagamentosFormulario(form);
  if (rotuloInvalido) {
    MasterCrud.toast(
      `o pagamento de "${rotuloInvalido}" não pode ser maior que o orçamento.`,
      "erro"
    );
    return;
  }

  const dadosAlterados = dadosGravacaoAlterados(form, itemOriginalCrud);
  if (!Object.keys(dadosAlterados).length) {
    MasterCrud.toast("nenhuma alteração para salvar.", "erro");
    return;
  }

  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvar });
  const filtros = capturarFiltrosTabela();
  const linhaSalva = linhaCrud;

  try {
    const payload = {
      acao: "atualizar",
      dados: dadosAlterados,
      origem: "pagamentos-lideranca",
      linha: linhaSalva,
    };

    await PlanilhaApi.gravar(cfg.PLANILHA, payload);
    aplicarAlteracoesLinhaLocal(linhaSalva, form);
    modalCrud.hide();
    MasterCrud.toast("pagamentos atualizados.", "sucesso");
    atualizarInterfaceAposSalvar(linhaSalva, filtros);
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvar });
  }
}

function aoClicarTabela(e) {
  const btn = e.target.closest(MasterCrud.seletorAcao);
  if (!btn) return;
  e.stopPropagation();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") abrirModalEditar(numLinha);
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
    const municipio = String(valoresMunicipios[linha - 1]?.[cols.MUNICIPIO] ?? "").trim();
    if (!municipio) continue;

    const regiao = String(valoresMunicipios[linha - 1]?.[cols.REGIAO] ?? "").trim();
    mapa.set(normalizarChave(municipio), {
      regiao,
      regiaoNorm: normalizarChave(regiao),
    });
  }

  return mapa;
}

function indicePorAliases(normalizados, aliases) {
  return normalizados.findIndex((n) =>
    aliases.some((alias) => normalizarChave(alias) === n)
  );
}

function resolverIndices(cabecalho) {
  const normalizados = (cabecalho || []).map((h) => normalizarChave(h));
  const indices = {};
  const cols = cfg.COLUNAS || {};

  CAMPOS_IDENT.forEach((campo) => {
    let idx = indicePorAliases(normalizados, campo.aliases);
    if (idx === -1 && cols[campo.chave] != null) idx = cols[campo.chave];
    indices[campo.prop] = idx;
  });

  CAMPOS_EDICAO.forEach((par) => {
    let idxOrc = indicePorAliases(normalizados, par.aliasesOrc);
    let idxPgto = indicePorAliases(normalizados, par.aliasesPgto);
    if (idxOrc === -1 && cols[par.chaveOrc] != null) idxOrc = cols[par.chaveOrc];
    if (idxPgto === -1 && cols[par.chavePgto] != null) idxPgto = cols[par.chavePgto];
    indices[par.propOrc] = idxOrc;
    indices[par.propPgto] = idxPgto;
  });

  CAMPOS_KPI.forEach((campo) => {
    let idxOrc = indicePorAliases(normalizados, campo.aliasesOrc);
    let idxPgto = indicePorAliases(normalizados, campo.aliasesPgto);
    if (idxOrc === -1 && cols[campo.chaveOrc] != null) idxOrc = cols[campo.chaveOrc];
    if (idxPgto === -1 && cols[campo.chavePgto] != null) idxPgto = cols[campo.chavePgto];
    indices[campo.propOrc] = idxOrc;
    indices[campo.propPgto] = idxPgto;
  });

  let idxObs = indicePorAliases(normalizados, CAMPO_OBSERVACAO.aliases);
  if (idxObs === -1 && cols[CAMPO_OBSERVACAO.chave] != null) idxObs = cols[CAMPO_OBSERVACAO.chave];
  indices[CAMPO_OBSERVACAO.prop] = idxObs;

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

function exibirMoedaCelula(val, { zero = false } = {}) {
  const s = String(val ?? "").trim();
  if (!s || s === "-" || s === "—") {
    return zero ? fmtMoeda.format(0) : "";
  }
  const n = parseNumero(val);
  if (!Number.isFinite(n)) return "";
  if (n === 0 && !zero) return "";
  return fmtMoeda.format(n);
}

function exibirMoedaKpi(val) {
  const n = typeof val === "number" ? val : parseNumero(val);
  return fmtMoeda.format(Number.isFinite(n) ? n : 0);
}

function ordenarRegioes(a, b) {
  const ordem = cfgPessoal.ORDEM_REGIOES || [];
  const indice = (norm) => {
    const i = ordem.indexOf(norm);
    return i === -1 ? ordem.length + 1 : i;
  };
  const diff = indice(a.norm) - indice(b.norm);
  if (diff !== 0) return diff;
  return a.rotulo.localeCompare(b.rotulo, "pt-BR");
}

function indiceCorRegiao(regiaoNorm) {
  const ordem = cfgPessoal.ORDEM_REGIOES || [];
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function extrairRegioes(itens) {
  const mapa = new Map();
  itens.forEach((item) => {
    if (!item.regiaoNorm) return;
    if (!mapa.has(item.regiaoNorm)) mapa.set(item.regiaoNorm, item.regiao);
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
    const id = "pl-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function ordenarPorMunicipio(a, b) {
  const ma = String(a.municipio ?? "").trim();
  const mb = String(b.municipio ?? "").trim();
  const cmp = ma.localeCompare(mb, "pt-BR", { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return String(a.lideranca ?? "").localeCompare(String(b.lideranca ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

function linhaTemConteudo(item) {
  const lideranca = String(item.lideranca ?? "").trim();
  const municipio = String(item.municipio ?? "").trim();
  if (!lideranca || !municipio) return false;

  return (
    CAMPOS_EDICAO.some(
      (par) =>
        parseNumero(item[par.propOrc]) > 0 ||
        parseNumero(item[par.propPgto]) > 0 ||
        celulaPreenchida(item[par.propOrc]) ||
        celulaPreenchida(item[par.propPgto])
    ) ||
    CAMPOS_KPI.some(
      (campo) =>
        parseNumero(item[campo.propOrc]) > 0 ||
        parseNumero(item[campo.propPgto]) > 0 ||
        celulaPreenchida(item[campo.propOrc]) ||
        celulaPreenchida(item[campo.propPgto])
    ) ||
    celulaPreenchida(item.observacao)
  );
}

function calcularTotaisPagamento(item) {
  return CAMPOS_KPI.reduce((acc, campo) => acc + parseNumero(item[campo.propPgto]), 0);
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfg.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
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
      regiao: info.regiao,
      regiaoNorm: info.regiaoNorm,
    };

    CAMPOS_EDICAO.forEach((par) => {
      item[par.propOrc] = valorCampo(linha, indices[par.propOrc]);
      item[par.propPgto] = valorCampo(linha, indices[par.propPgto]);
    });

    CAMPOS_KPI.forEach((campo) => {
      item[campo.propOrc] = valorCampo(linha, indices[campo.propOrc]);
      item[campo.propPgto] = valorCampo(linha, indices[campo.propPgto]);
    });

    item.observacao = valorCampo(linha, indices[CAMPO_OBSERVACAO.prop]);

    item.finTotal = calcularTotaisPagamento(item);
    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(ordenarPorMunicipio);
  return itens;
}

function somarKpi(filtradas, propOrc, propPgto) {
  return filtradas.reduce(
    (acc, r) => ({
      orc: acc.orc + parseNumero(r[propOrc]),
      pgto: acc.pgto + parseNumero(r[propPgto]),
    }),
    { orc: 0, pgto: 0 }
  );
}

function calcularPercentualPago(orcNum, pagNum) {
  if (!orcNum || orcNum <= 0) return null;
  return Math.min(100, Math.max(0, (pagNum / orcNum) * 100));
}

function htmlBarraProgressoPago(orcNum, pagNum) {
  const pct = calcularPercentualPago(orcNum, pagNum);
  if (pct == null) return "";
  const pctInt = Math.round(pct);
  return `<div class="orcamento-geral-progress-pago" role="progressbar" aria-valuenow="${pctInt}" aria-valuemin="0" aria-valuemax="100" title="${pctInt}% pago">
    <div class="orcamento-geral-progress-pago-track" aria-hidden="true">
      <div class="orcamento-geral-progress-pago-fill" style="width:${pctInt}%"></div>
    </div>
  </div>`;
}

function atualizarKpiCard(elOrc, elPgto, elProgress, orc, pgto) {
  if (elOrc) elOrc.textContent = exibirMoedaKpi(orc);
  if (elPgto) elPgto.textContent = exibirMoedaKpi(pgto);
  if (elProgress) {
    elProgress.innerHTML = htmlBarraProgressoPago(orc, pgto);
    elProgress.setAttribute("aria-hidden", elProgress.innerHTML ? "false" : "true");
  }
}

function atualizarKpis(filtradas) {
  const total = { orc: 0, pgto: 0 };
  CAMPOS_KPI.forEach((campo) => {
    const soma = somarKpi(filtradas, campo.propOrc, campo.propPgto);
    total.orc += soma.orc;
    total.pgto += soma.pgto;

    atualizarKpiCard(
      el["kpi" + capitalizar(campo.kpi) + "Orc"],
      el["kpi" + capitalizar(campo.kpi) + "Pgto"],
      el["kpi" + capitalizar(campo.kpi) + "Progress"],
      soma.orc,
      soma.pgto
    );
  });

  atualizarKpiCard(el.kpiTotalOrc, el.kpiTotalPgto, el.kpiTotalProgress, total.orc, total.pgto);
}

function capitalizar(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function zerarKpis() {
  [
    "kpiTotalOrc",
    "kpiTotalPgto",
    "kpiTotalProgress",
    "kpiPessoalOrc",
    "kpiPessoalPgto",
    "kpiPessoalProgress",
    "kpiCombustivelOrc",
    "kpiCombustivelPgto",
    "kpiCombustivelProgress",
    "kpiDiversosOrc",
    "kpiDiversosPgto",
    "kpiDiversosProgress",
    "kpiDiaDOrc",
    "kpiDiaDPgto",
    "kpiDiaDProgress",
  ].forEach((id) => {
    const node = el[id];
    if (!node) return;
    if (id.endsWith("Progress")) {
      node.innerHTML = "";
      node.setAttribute("aria-hidden", "true");
      return;
    }
    node.textContent = "";
  });
}

function htmlCelulaPar(r, par, { destaque = false } = {}) {
  const orcNum = parseNumero(r[par.propOrc]);
  const pgtoNum = parseNumero(r[par.propPgto]);
  const orc = exibirMoedaCelula(r[par.propOrc], { zero: destaque });
  const pgto = exibirMoedaCelula(r[par.propPgto], {
    zero: destaque || orcNum > 0 || pgtoNum > 0,
  });
  if (!orc && !pgto) return "";
  return (
    '<div class="pag-lideranca-celula-par' +
    (destaque ? " pag-lideranca-celula-par--total" : "") +
    '">' +
    '<span class="pag-lideranca-celula-orc">' +
    (orc || '<span class="pag-lideranca-celula-vazio" aria-hidden="true"></span>') +
    "</span>" +
    '<span class="pag-lideranca-celula-pgto">' +
    (pgto || '<span class="pag-lideranca-celula-vazio" aria-hidden="true"></span>') +
    "</span>" +
    "</div>"
  );
}

const PAR_COLUNA_TOTAL = { propOrc: "colunaTotalOrc", propPgto: "colunaTotalPgto" };

function calcularTotaisColuna(r) {
  return CAMPOS_KPI.reduce(
    (acc, campo) => ({
      orc: acc.orc + parseNumero(r[campo.propOrc]),
      pgto: acc.pgto + parseNumero(r[campo.propPgto]),
    }),
    { orc: 0, pgto: 0 }
  );
}

function objetoColunaTotal(r) {
  const { orc, pgto } = calcularTotaisColuna(r);
  return { colunaTotalOrc: orc, colunaTotalPgto: pgto };
}

function htmlCelulaColunaTotal(r, { destaque = false } = {}) {
  return htmlCelulaPar(objetoColunaTotal(r), PAR_COLUNA_TOTAL, { destaque });
}

function badgeFinTotalHtml(r) {
  const total = parseNumero(r.finTotal);
  if (total <= 0) return "";
  return `<span class="orcamento-total-badge">${fmtMoeda.format(total)}</span>`;
}

function largurasColunas() {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (mobile) {
    return {
      "apoiadores-col-ident": "138px",
      "apoiadores-col-municipio": "0",
      "pag-lideranca-col-par": "88px",
      "pag-lideranca-col-total": "96px",
    };
  }
  return {
    "apoiadores-col-ident": "24%",
    "apoiadores-col-municipio": "18%",
    "pag-lideranca-col-par": "10%",
    "pag-lideranca-col-total": "18%",
  };
}

const LARGURA_MINIMA_TABELA_MOBILE = 138 + 88 * 4 + 96;

function vincularScrollCabecalhoTabela() {
  if (el.scrollCabecalhoVinculado) return;
  const panel = document.querySelector(".apoiadores-tabela-card .dashboard-tabela-panel");
  const headWrap = panel?.querySelector(".dashboard-tabela-head");
  const bodyScroll = panel?.querySelector(".dashboard-tabela-body-scroll");
  if (!headWrap || !bodyScroll) return;
  bodyScroll.addEventListener("scroll", () => {
    headWrap.scrollLeft = bodyScroll.scrollLeft;
  });
  el.scrollCabecalhoVinculado = true;
}

function sincronizarLargurasColunas(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  const larguras = largurasColunas();
  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find(
        (c) => c.startsWith("apoiadores-col-") || c.startsWith("pag-lideranca-col-")
      );
      if (!cls) return;
      if (mobile && larguras[cls] != null) {
        col.style.setProperty("width", larguras[cls], "important");
      } else if (!mobile) {
        col.style.width = larguras[cls] != null ? larguras[cls] : "";
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

  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (mobile) {
    const largura = LARGURA_MINIMA_TABELA_MOBILE;
    headTable.style.setProperty("width", largura + "px", "important");
    bodyTable.style.setProperty("width", largura + "px", "important");
    headTable.style.minWidth = largura + "px";
    bodyTable.style.minWidth = largura + "px";
    headWrap.style.paddingRight = "0px";
    vincularScrollCabecalhoTabela();
  } else {
    const largura = bodyScroll.clientWidth;
    headTable.style.removeProperty("width");
    bodyTable.style.removeProperty("width");
    headTable.style.width = largura + "px";
    bodyTable.style.width = largura + "px";
    headTable.style.minWidth = "";
    bodyTable.style.minWidth = "";
    const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
    headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";
  }

  sincronizarLargurasColunas(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function itemPopoverPar(r, par) {
  const rotuloClass = par.preserveCase
    ? "apoiadores-popover-rotulo apoiadores-popover-rotulo--case"
    : "apoiadores-popover-rotulo";
  const marcador = par.marcador
    ? `<span class="orcamento-geral-popover-marcador popover-marcador--orc-${par.marcador}" aria-hidden="true"></span>`
    : "";
  return `<div class="apoiadores-popover-linha apoiadores-popover-linha--fin pag-lideranca-popover-linha">
    <span class="${rotuloClass}">${marcador}${par.rotulo}</span>
    <span class="pag-lideranca-popover-orc">${exibirMoeda(r[par.propOrc]) || "—"}</span>
    <span class="pag-lideranca-popover-pgto">${exibirMoeda(r[par.propPgto]) || "—"}</span>
  </div>`;
}

function htmlPopoverSecao(titulo, pares, r) {
  const itens = pares.map((par) => itemPopoverPar(r, par)).join("");
  return `<div class="pag-lideranca-popover-secao">
    <div class="pag-lideranca-popover-secao-titulo">${titulo}</div>
    ${itens}
  </div>`;
}

function htmlPopover(r) {
  const municipio = escapeHtml(String(r.municipio ?? "").trim());

  return `<div class="orcamento-geral-popover-corpo apoiadores-popover-corpo">
    <div class="apoiadores-popover-cabecalho">
      <div class="apoiadores-popover-topo">
        <span class="apoiadores-popover-lideranca">${exibirTexto(r.lideranca) || "—"}</span>
      </div>
      ${municipio ? `<div class="apoiadores-popover-municipio-muted">${municipio}</div>` : ""}
      <div class="pag-lideranca-popover-legenda">
        <span></span>
        <span>orçamento</span>
        <span>pagamento</span>
      </div>
      <hr class="apoiadores-popover-divisor" aria-hidden="true">
    </div>
    <div class="apoiadores-popover-tabela">
      ${htmlPopoverSecao("pessoal", CAMPOS_PESSOAL, r)}
      ${htmlPopoverSecao("geral", CAMPOS_GERAL, r)}
    </div>
  </div>`;
}

function montarTotaisKpi(filtradas) {
  const total = {};
  CAMPOS_KPI.forEach((campo) => {
    const soma = somarKpi(filtradas, campo.propOrc, campo.propPgto);
    total[campo.propOrc] = soma.orc;
    total[campo.propPgto] = soma.pgto;
  });
  return total;
}

function renderizarRodapeTabela(filtradas) {
  const total = montarTotaisKpi(filtradas);
  const cols = CAMPOS_KPI.map((campo) => {
    return `<td class="text-end pag-lideranca-col-par pag-lideranca-col-desk apoiadores-celula-num orcamento-tabela-desktop-col">${htmlCelulaPar(total, campo, { destaque: true })}</td>`;
  }).join("");
  const colTotal = `<td class="text-end pag-lideranca-col-total pag-lideranca-col-desk apoiadores-celula-num orcamento-tabela-desktop-col">${htmlCelulaColunaTotal(total, { destaque: true })}</td>`;

  return `<tr class="pag-lideranca-linha-total">
    <td class="apoiadores-col-ident">
      <span class="pag-lideranca-total-rotulo">total</span>
    </td>
    <td class="apoiadores-col-municipio"></td>
    ${cols}
    ${colTotal}
  </tr>`;
}

function atualizarRodapeTabela(filtradas) {
  if (!el.rodape) return;
  if (!filtradas.length) {
    el.rodape.innerHTML = "";
    return;
  }
  el.rodape.innerHTML = renderizarRodapeTabela(filtradas);
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

  const colsPares = CAMPOS_KPI.map(
    (par) =>
      `<td class="text-end pag-lideranca-col-par pag-lideranca-col-desk apoiadores-celula-num orcamento-tabela-desktop-col">${htmlCelulaPar(r, par)}</td>`
  ).join("");
  const colTotal = `<td class="text-end pag-lideranca-col-total pag-lideranca-col-desk apoiadores-celula-num orcamento-tabela-desktop-col">${htmlCelulaColunaTotal(r)}</td>`;

  return `<tr class="apoiadores-linha-popover" tabindex="0" aria-label="detalhes dos pagamentos">
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
    ${colsPares}
    ${colTotal}
  </tr>`;
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = [...linhasFiltradas()].sort(ordenarPorMunicipio);

  el.vazio.hidden = true;

  if (!linhas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro na planilha.</td></tr>`;
    atualizarRodapeTabela([]);
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    atualizarRodapeTabela([]);
    aposRenderTabela();
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    popoverTabela.destruir();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum registro para os filtros selecionados.</td></tr>`;
    atualizarRodapeTabela([]);
    aposRenderTabela();
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
  atualizarRodapeTabela(filtradas);
  popoverTabela.inicializar({
    corpo: el.corpo,
    seletorLinha: "tr.apoiadores-linha-popover",
    linhas: filtradas,
    htmlConteudo: htmlPopover,
  });
  aposRenderTabela();
}

function montar(valores, filtrosPreservar) {
  const filtros = filtrosPreservar || capturarFiltrosTabela();
  atualizarMetadadosPlanilha(valores);
  linhas = extrairLinhas(valores);
  montarFiltros(extrairRegioes(linhas));
  restaurarFiltrosTabela(filtros);
  renderizarTabela();
  requestAnimationFrame(() => {
    alinharColunasTabela();
    renderizarTabela();
  });
}

async function carregarDados(opcoes = {}) {
  const preservarFiltros = opcoes.preservarFiltros !== false;
  const filtros = preservarFiltros ? capturarFiltrosTabela() : null;
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando pagamentos...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valoresPagamentos, valoresMunicipios] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
    ]);

    if (valoresPagamentos === null) {
      limparStatus();
      return;
    }

    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valoresPagamentos, filtros);
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

window.atualizarPagina = carregarDados;

function htmlCardsRelatorioPagina(doc) {
  const layout = (doc || document).querySelector(".orcamento-kpi-layout");
  if (!layout) return "";

  const clone = layout.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-orcamento-kpis rel-pag-lideranca-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function conteudoExtraRelatorioPagina() {
  return (
    '<section class="rel-secao rel-secao-legenda-pag-lideranca">' +
    '<p class="rel-pag-lideranca-legenda">' +
    '<span class="rel-pag-lideranca-legenda-orc">orçamento</span>' +
    '<span class="rel-pag-lideranca-legenda-pgto">pagamento</span>' +
    '<span class="rel-pag-lideranca-legenda-dica">— em cada célula, orçamento acima e pagamento abaixo</span>' +
    "</p></section>"
  );
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("pag-lideranca-tabela")) return;

  table
    .querySelectorAll(
      ".orcamento-total-badge, .apoiadores-sub-fin-total, .apoiadores-fin-badge, .crud-acoes, .dashboard-regiao-marcador"
    )
    .forEach((el) => el.remove());

  const thIdent = table.querySelector("thead th.apoiadores-col-ident");
  if (thIdent) {
    thIdent.className = "apoiadores-col-ident";
    thIdent.textContent = "liderança";
  }

  const thMunicipio = table.querySelector("thead th.apoiadores-col-municipio");
  if (thMunicipio) {
    thMunicipio.className = "apoiadores-col-municipio";
    thMunicipio.textContent = "município";
  }

  table.querySelectorAll("tbody td.apoiadores-col-ident").forEach((td) => {
    const nome = td.querySelector(".apoiadores-ident-nome");
    const texto = nome?.textContent?.trim() || "—";
    td.className = "apoiadores-col-ident";
    td.textContent = texto;
  });

  table.querySelectorAll("tbody td.apoiadores-col-municipio").forEach((td) => {
    const nome = td.querySelector(".dashboard-municipio-nome");
    const texto = nome?.textContent?.trim() || td.textContent?.trim() || "—";
    td.className = "apoiadores-col-municipio";
    td.textContent = texto;
  });

  table.querySelectorAll("th.pag-lideranca-col-par, td.pag-lideranca-col-par").forEach((cel) => {
    cel.className = "text-end pag-lideranca-col-par apoiadores-celula-num";
  });

  table.querySelectorAll("th.pag-lideranca-col-total, td.pag-lideranca-col-total").forEach((cel) => {
    cel.className = "text-end pag-lideranca-col-total apoiadores-celula-num";
  });

  const tfoot = table.querySelector("tfoot");
  const tbody = table.querySelector("tbody");
  if (tfoot && tbody) {
    tfoot.querySelectorAll("tr").forEach((tr) => tbody.appendChild(tr));
    tfoot.remove();
  }
}

function estilosRelatorioPagina() {
  return (
    ".page-orcamento .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-orcamento .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-orcamento .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento .rel-secao-legenda-pag-lideranca{margin:0.15rem 0 0.35rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-orcamento .rel-secao + .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-orcamento .rel-pag-lideranca-legenda{display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem 0.75rem;margin:0;font-size:8pt;color:#64748b;}" +
    ".page-orcamento .rel-pag-lideranca-legenda-orc{font-weight:700;color:#b91c1c;}" +
    ".page-orcamento .rel-pag-lideranca-legenda-pgto{font-weight:700;color:#0e7490;}" +
    ".page-orcamento .rel-pag-lideranca-legenda-dica{color:#94a3b8;font-size:7.5pt;}" +
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
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-valor{font-size:8.5pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-duplo{display:flex;flex-direction:column;align-items:center;gap:0.12rem;width:100%;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-linha{display:flex;flex-direction:column;align-items:center;width:100%;line-height:1.1;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-orc .dashboard-kpi-valor{color:#b91c1c!important;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-pgto .dashboard-kpi-valor{color:#0e7490!important;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-progress{width:100%;margin-top:0.15rem;}" +
    ".page-orcamento .rel-orcamento-kpis .pag-lideranca-kpi-progress .orcamento-geral-progress-pago{max-width:none;width:100%;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-geral-progress-pago-track{height:0.32rem;border-radius:999px;background:rgba(248,113,113,0.22);overflow:hidden;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-geral-progress-pago-fill{height:100%;border-radius:999px;background:#0891b2;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra{display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;width:28px;height:28px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra svg{width:16px;height:16px;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-card-total{background:#f8fafc!important;border:1px solid rgba(31,78,140,0.14)!important;box-shadow:none!important;border-left:3px solid #0891b2!important;}" +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-card-total .dashboard-kpi-rotulo{font-weight:600;color:#64748b;}" +
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
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .orcamento-tabela-stack-col{display:none!important;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .orcamento-total-badge{display:none!important;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela{table-layout:fixed;width:100%;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela th.apoiadores-col-ident," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela td.apoiadores-col-ident," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela th.apoiadores-col-municipio," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela td.apoiadores-col-municipio{text-align:left;vertical-align:middle;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela th.pag-lideranca-col-par," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela td.pag-lideranca-col-par{width:10%;text-align:right;padding:0.4rem 0.35rem;font-variant-numeric:tabular-nums;vertical-align:middle;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela th.pag-lideranca-col-total," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela td.pag-lideranca-col-total{width:12%;text-align:right;padding:0.4rem 0.5rem;font-variant-numeric:tabular-nums;vertical-align:middle;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-th-titulo{display:inline-block;font-size:7pt;font-weight:700;color:#475569;text-transform:lowercase;line-height:1.2;white-space:nowrap;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-th-titulo--case{text-transform:none;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-celula-par{display:flex;flex-direction:column;align-items:flex-end;gap:0.1rem;line-height:1.15;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-celula-orc{color:#b91c1c;font-size:7pt;font-weight:500;font-variant-numeric:tabular-nums;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-celula-pgto{color:#0e7490;font-size:7.5pt;font-weight:600;font-variant-numeric:tabular-nums;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-celula-par--total .pag-lideranca-celula-orc," +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-celula-par--total .pag-lideranca-celula-pgto{font-weight:700;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-linha-total td{border-top:2px solid rgba(148,163,184,0.45);vertical-align:top;}" +
    ".page-orcamento table.rel-tabela.pag-lideranca-tabela .pag-lideranca-total-rotulo{display:inline-block;font-size:7.5pt;font-weight:700;text-transform:lowercase;color:#334155;}" +
    "@media print{" +
    ".page-orcamento .rel-orcamento-kpis .dashboard-kpi-card," +
    ".page-orcamento .rel-orcamento-kpis .orcamento-kpi-ilustra," +
    ".page-orcamento .rel-orcamento-kpis .orcamento-geral-progress-pago-fill," +
    ".page-orcamento .rel-orcamento-kpis .orcamento-geral-progress-pago-track{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
    "}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.conteudoExtraRelatorioPagina = conteudoExtraRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;
window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function initPagamentosLideranca() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaLideranca: document.getElementById("buscaLideranca"),
    corpo: document.getElementById("corpoApoiadores"),
    rodape: document.getElementById("rodapePagamentosLideranca"),
    vazio: document.getElementById("vazio"),
    kpiTotalOrc: document.getElementById("kpiTotalOrc"),
    kpiTotalPgto: document.getElementById("kpiTotalPgto"),
    kpiTotalProgress: document.getElementById("kpiTotalProgress"),
    kpiPessoalOrc: document.getElementById("kpiPessoalOrc"),
    kpiPessoalPgto: document.getElementById("kpiPessoalPgto"),
    kpiPessoalProgress: document.getElementById("kpiPessoalProgress"),
    kpiCombustivelOrc: document.getElementById("kpiCombustivelOrc"),
    kpiCombustivelPgto: document.getElementById("kpiCombustivelPgto"),
    kpiCombustivelProgress: document.getElementById("kpiCombustivelProgress"),
    kpiDiversosOrc: document.getElementById("kpiDiversosOrc"),
    kpiDiversosPgto: document.getElementById("kpiDiversosPgto"),
    kpiDiversosProgress: document.getElementById("kpiDiversosProgress"),
    kpiDiaDOrc: document.getElementById("kpiDiaDOrc"),
    kpiDiaDPgto: document.getElementById("kpiDiaDPgto"),
    kpiDiaDProgress: document.getElementById("kpiDiaDProgress"),
    btnSalvar: document.getElementById("btnSalvarApoiador"),
    modalTitulo: document.getElementById("modalApoiadorTitulo"),
    modalEl: document.getElementById("modalApoiadorCrud"),
    modalLiderancaNome: document.getElementById("modalLiderancaNome"),
    modalMunicipioNome: document.getElementById("modalMunicipioNome"),
    campoObservacao: document.getElementById("campoApObservacao"),
    campoProprioValor: document.getElementById("campoApProprioValor"),
    campoProprioPgto: document.getElementById("campoApProprioPgto"),
    campoLiderValor: document.getElementById("campoApLiderValor"),
    campoLiderPgto: document.getElementById("campoApLiderPgto"),
    campoIntegralValor: document.getElementById("campoApIntegralValor"),
    campoIntegralPgto: document.getElementById("campoApIntegralPgto"),
    campoMeioValor: document.getElementById("campoApMeioValor"),
    campoMeioPgto: document.getElementById("campoApMeioPgto"),
    campoCustomValor: document.getElementById("campoApCustomValor"),
    campoCustomPgto: document.getElementById("campoApCustomPgto"),
    campoCombustivelOrc: document.getElementById("campoApCombustivelOrc"),
    campoCombustivelPgto: document.getElementById("campoApCombustivelPgto"),
    campoDiversosOrc: document.getElementById("campoApDiversosOrc"),
    campoDiversosPgto: document.getElementById("campoApDiversosPgto"),
    campoDiaDOrc: document.getElementById("campoApDiaDOrc"),
    campoDiaDPgto: document.getElementById("campoApDiaDPgto"),
  };

  if (!el.corpo || !el.filtroRegioes) return;

  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  vincularMascarasMoedaPagamento();
  el.btnSalvar?.addEventListener("click", salvarCrud);
  el.corpo.addEventListener("click", aoClicarTabela);
  el.buscaLideranca?.addEventListener("input", renderizarTabela);
  window.addEventListener("resize", alinharColunasTabela);
  carregarDados();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initPagamentosLideranca);
