// Página contratos: CRUD na planilha contratos (colunas dinâmicas).

const cfg = CONFIG.CONTRATOS;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const cfgPessoal = CONFIG.PESSOAL;
const cfgAp = cfgPessoal.APOIADORES;

const ICONE_EDITAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' +
  "</svg>";
const ICONE_EXCLUIR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>' +
  "</svg>";
const ICONE_IMPRIMIR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>' +
  '<path d="M6 14h12v8H6z"/>' +
  "</svg>";
const ICONE_BANCO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M3 21h18M3 10h18M5 6l7-4 7 4M6 10v8M10 10v8M14 10v8M18 10v8"/>' +
  "</svg>";
const ICONE_NAO_LANCAR_SISTEMA =
  '<i class="fa-solid fa-hand-holding-circle-dollar" aria-hidden="true"></i>';
const ICONE_ASSINADO_SIM =
  '<i class="fa-solid fa-file-signature" aria-hidden="true"></i>';
const ICONE_ASSINADO_NAO =
  '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
const ICONE_ARQUIVOS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>' +
  "</svg>";

let el = {};
let colunas = [];
let linhas = [];
let modal = null;
let modalArquivos = null;
let itemArquivosEdicao = null;
let modoEdicao = null;
let itemEdicao = null;
let colunaNome = null;
let colunaNomeMae = null;
let colunaCpf = null;
let colunaCelular = null;
let colunaDataNascimento = null;
let colunaMunicipio = null;
let colunaVinculo = null;
let colunaLancarSistema = null;
let colunaValorContrato = null;
let colunaTipoContrato = null;
let colunaAssinado = null;
let listaMunicipiosForm = [];
let coordenadoresPorMunicipio = new Map();
let apoiadorPorMunLider = new Map();
let cacheValoresReferenciaContrato = null;
let promessaValoresReferenciaContrato = null;
let linhaParaDestaqueSalvo = null;
let paginaAtualTabela = 1;
let arquivosContratoCarregando = false;

function tamanhoPaginaTabela() {
  const n = cfg.TAMANHO_PAGINA_TABELA;
  return typeof n === "number" && n > 0 ? n : 20;
}

function totalPaginasTabela(totalItens) {
  if (!totalItens) return 1;
  return Math.ceil(totalItens / tamanhoPaginaTabela());
}

function ajustarPaginaTabela(totalItens) {
  const max = totalPaginasTabela(totalItens);
  if (paginaAtualTabela > max) paginaAtualTabela = max;
  if (paginaAtualTabela < 1) paginaAtualTabela = 1;
}

function ajustarPaginaParaLinhaDestaque(filtradas) {
  if (!linhaParaDestaqueSalvo || !filtradas?.length) return;
  const idx = filtradas.findIndex((item) => item._linha === linhaParaDestaqueSalvo);
  if (idx >= 0) {
    paginaAtualTabela = Math.floor(idx / tamanhoPaginaTabela()) + 1;
  }
}

function atualizarBarraPaginacao(totalItens) {
  const nav = el.paginacaoTabela;
  if (!nav) return;

  const tam = tamanhoPaginaTabela();
  if (totalItens <= tam) {
    nav.hidden = true;
    return;
  }

  nav.hidden = false;
  const maxPag = totalPaginasTabela(totalItens);
  const inicio = (paginaAtualTabela - 1) * tam + 1;
  const fim = Math.min(paginaAtualTabela * tam, totalItens);

  if (el.paginacaoInfo) {
    el.paginacaoInfo.textContent = `exibindo ${inicio}–${fim} de ${totalItens} registros`;
  }
  if (el.paginacaoPaginaAtual) {
    el.paginacaoPaginaAtual.textContent = `página ${paginaAtualTabela} / ${maxPag}`;
  }

  const desabilitarAnterior = paginaAtualTabela <= 1;
  if (el.paginacaoPrimeira) el.paginacaoPrimeira.disabled = desabilitarAnterior;
  if (el.paginacaoAnterior) el.paginacaoAnterior.disabled = desabilitarAnterior;

  const desabilitarProxima = paginaAtualTabela >= maxPag;
  if (el.paginacaoProxima) el.paginacaoProxima.disabled = desabilitarProxima;
  if (el.paginacaoUltima) el.paginacaoUltima.disabled = desabilitarProxima;
}

function irParaPaginaTabela(pagina) {
  paginaAtualTabela = pagina;
  renderizarTabela({ preservarPagina: true });
}

function mostrarStatus(mensagem, tipo) {
  if (tipo === "carregando") {
    PageLoader.show();
    return;
  }
  PageLoader.hide();
  const msg = String(mensagem ?? "").trim();
  if (!msg) return;
  if (tipo === "erro") AppToast.show(msg, "erro");
  else if (tipo === "sucesso") AppToast.show(msg, "sucesso");
  else AppToast.show(msg, "info");
}

function limparStatus() {
  PageLoader.hide();
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exibirValor(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : '<span class="text-muted">—</span>';
}

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function numeroMoeda(val) {
  if (val == null || val === "") return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  let s = String(val).trim();
  if (!s) return null;
  s = s.replace(/[^\d,.-]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function formatarValorContratoExibir(val) {
  const bruto = String(val ?? "").trim();
  if (!bruto) return '<span class="text-muted">—</span>';
  const n = numeroMoeda(val);
  if (n == null) return escapeHtml(bruto);
  return escapeHtml(
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  );
}

function valorMoedaGravar(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return "";
  const n = numeroMoeda(s);
  if (n == null) return s;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function municipioEhMt(municipioNorm) {
  return municipioNorm === "mt";
}

function termoBusca() {
  return PlanilhaApi.normalizarChave(el.busca?.value);
}

function aplicarBusca(lista) {
  const termo = termoBusca();
  if (!termo) return lista;

  const preferidas = (cfg.COLUNA_BUSCA || []).map((a) => PlanilhaApi.normalizarChave(a));
  const colsBusca = colunas.filter((col) => {
    const n = PlanilhaApi.normalizarChave(col.chave);
    return preferidas.includes(n);
  });

  const alvo = colsBusca.length ? colsBusca : colunas;
  return lista.filter((item) =>
    alvo.some((col) => PlanilhaApi.normalizarChave(item[col.chave]).includes(termo))
  );
}

const ordenacaoContratos = { col: "nome", dir: "asc" };

function cmpContratoNome(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(valorItem(a, colunaNome), valorItem(b, colunaNome));
  if (c) return c;
  c = T.cmpTexto(valorItem(a, colunaMunicipio), valorItem(b, colunaMunicipio));
  if (c) return c;
  return T.cmpTexto(valorItem(a, colunaVinculo), valorItem(b, colunaVinculo));
}

function cmpContratoMunicipio(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(valorItem(a, colunaMunicipio), valorItem(b, colunaMunicipio));
  if (c) return c;
  c = T.cmpTexto(valorItem(a, colunaNome), valorItem(b, colunaNome));
  if (c) return c;
  return T.cmpTexto(valorItem(a, colunaVinculo), valorItem(b, colunaVinculo));
}

function cmpContratoLideranca(a, b) {
  const T = TabelaOrdenacao;
  let c = T.cmpTexto(valorItem(a, colunaVinculo), valorItem(b, colunaVinculo));
  if (c) return c;
  c = T.cmpTexto(valorItem(a, colunaNome), valorItem(b, colunaNome));
  if (c) return c;
  return T.cmpTexto(valorItem(a, colunaMunicipio), valorItem(b, colunaMunicipio));
}

const COMPARADORES_ORDENACAO_CONTRATOS = {
  nome: cmpContratoNome,
  municipio: cmpContratoMunicipio,
  lideranca: cmpContratoLideranca,
};

function aplicarOrdenacaoContratos(lista) {
  return TabelaOrdenacao.aplicar(lista, ordenacaoContratos, COMPARADORES_ORDENACAO_CONTRATOS);
}

function linhasFiltradas() {
  return aplicarOrdenacaoContratos(aplicarBusca(linhas.slice()));
}

function cpfSomenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function cpfValido(valor) {
  const cpf = cpfSomenteDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(cpf[9])) return false;

  soma = 0;
  for (let j = 0; j < 10; j++) soma += Number(cpf[j]) * (11 - j);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(cpf[10]);
}

function cpfDuplicado(cpf, linhaIgnorar) {
  if (!colunaCpf) return false;
  const alvo = cpfSomenteDigitos(cpf);
  if (!alvo) return false;
  return linhas.some((item) => {
    if (linhaIgnorar && item._linha === linhaIgnorar) return false;
    return cpfSomenteDigitos(valorItem(item, colunaCpf)) === alvo;
  });
}

function validarCpfFormulario(cpf, linhaIgnorar) {
  const digitos = cpfSomenteDigitos(cpf);
  if (!digitos) return "informe o CPF.";
  if (digitos.length !== 11) return "CPF deve ter 11 dígitos.";
  if (!cpfValido(digitos)) return "CPF inválido.";
  if (cpfDuplicado(digitos, linhaIgnorar)) return "este CPF já está cadastrado.";
  return "";
}

function formatarCpf(valor) {
  const digitos = cpfSomenteDigitos(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return digitos.slice(0, 3) + "." + digitos.slice(3);
  if (digitos.length <= 9) {
    return digitos.slice(0, 3) + "." + digitos.slice(3, 6) + "." + digitos.slice(6);
  }
  return (
    digitos.slice(0, 3) +
    "." +
    digitos.slice(3, 6) +
    "." +
    digitos.slice(6, 9) +
    "-" +
    digitos.slice(9)
  );
}

function celularSomenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function formatarCelular(valor) {
  const digitos = celularSomenteDigitos(valor).slice(0, 11);
  if (!digitos) return "";
  if (digitos.length <= 2) return "(" + digitos;
  if (digitos.length <= 6) {
    return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2);
  }
  if (digitos.length <= 10) {
    return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 6) + "-" + digitos.slice(6);
  }
  return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 7) + "-" + digitos.slice(7);
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

function valorCheckboxSim(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val == null) return false;
  const s = PlanilhaApi.normalizarChave(val);
  if (s === "nao" || s === "n" || s === "false" || s === "0" || s === "no") return false;
  return (
    s === "sim" ||
    s === "s" ||
    s === "true" ||
    s === "1" ||
    s === "yes" ||
    s === "x"
  );
}

function extrairListaMunicipios(valoresMunicipios) {
  if (!valoresMunicipios?.length) return [];
  const cols = cfgMun.COLUNAS;
  const mapa = new Map();

  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;
    const norm = PlanilhaApi.normalizarChave(municipio);
    if (municipioEhMt(norm)) continue;
    if (!mapa.has(norm)) mapa.set(norm, municipio);
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function indiceColunaApoiadores(cabecalho, aliases, fallback) {
  const lista = (aliases || []).map((a) => PlanilhaApi.normalizarChave(a));
  for (let i = 0; i < cabecalho.length; i++) {
    if (lista.includes(PlanilhaApi.normalizarChave(cabecalho[i]))) return i;
  }
  return fallback;
}

function parseNumeroPlanilha(v) {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function orcamentoFechadoApoiador(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val == null) return false;
  const s = PlanilhaApi.normalizarChave(val);
  if (s === "nao" || s === "n" || s === "false" || s === "0" || s === "no") return false;
  return s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes" || s === "x";
}

const CATEGORIAS_TIPO_CONTRATO = [
  {
    id: "lider",
    rotulo: "líder",
    tipoNorm: "apoiador lider",
    fin: "finLider",
    qtd: "apoiadorLider",
  },
  {
    id: "integral",
    rotulo: "integral",
    tipoNorm: "apoiador periodo integral",
    fin: "finIntegral",
    qtd: "apoiadorIntegral",
  },
  {
    id: "meio",
    rotulo: "meio período",
    tipoNorm: "apoiador meio periodo",
    fin: "finMeio",
    qtd: "apoiadorMeio",
  },
  {
    id: "customizado",
    rotulo: "customizado",
    tipoNorm: "apoiador customizado",
    fin: "finCustomizado",
    qtd: "apoiadorCustomizado",
  },
];

function chaveMunLider(municipio, lideranca) {
  return (
    PlanilhaApi.normalizarChave(municipio) + "|" + PlanilhaApi.normalizarChave(lideranca)
  );
}

function categoriaTipoContrato(tipo) {
  const n = PlanilhaApi.normalizarChave(tipo);
  const cat = CATEGORIAS_TIPO_CONTRATO.find((c) => c.tipoNorm === n);
  return cat ? cat.id : null;
}

function indicesLinhaApoiadores(cab) {
  return {
    lideranca: indiceColunaApoiadores(
      cab,
      ["lideranca", "liderança"],
      cfgAp.COLUNAS.LIDERANCA
    ),
    municipio: indiceColunaApoiadores(
      cab,
      ["municipio", "município"],
      cfgAp.COLUNAS.MUNICIPIO
    ),
    proprioApoiador: indiceColunaApoiadores(
      cab,
      ["proprio-apoiador", "proprio apoiador", "próprio apoiador"],
      cfgAp.COLUNAS.PROPRIO_APOIADOR
    ),
    apoiadorLider: indiceColunaApoiadores(
      cab,
      ["apoiador-lider", "apoiador lider", "lider"],
      cfgAp.COLUNAS.APOIADOR_LIDER
    ),
    apoiadorIntegral: indiceColunaApoiadores(
      cab,
      ["apoiador-integral", "apoiador integral", "integral"],
      cfgAp.COLUNAS.APOIADOR_INTEGRAL
    ),
    apoiadorMeio: indiceColunaApoiadores(
      cab,
      ["apoiador-meio", "apoiador meio", "meio"],
      cfgAp.COLUNAS.APOIADOR_MEIO
    ),
    apoiadorCustomizado: indiceColunaApoiadores(
      cab,
      ["apoiador-customizado", "apoiador customizado", "customizado"],
      cfgAp.COLUNAS.APOIADOR_CUSTOMIZADO
    ),
    fechadoOrcamento: indiceColunaApoiadores(
      cab,
      [
        "FECHADO-ORCAMENTO",
        "orcamento-fechado",
        "orcamento fechado",
        "fechado-orcamento",
        "fechado orcamento",
        "fechado orçamento",
        "fechado-orçamento",
      ],
      cfgAp.COLUNAS.FECHADO_ORCAMENTO
    ),
    finLider: cfgAp.COLUNAS.FIN_LIDER,
    finIntegral: cfgAp.COLUNAS.FIN_INTEGRAL,
    finMeio: cfgAp.COLUNAS.FIN_MEIO,
    finCustomizado: cfgAp.COLUNAS.FIN_CUSTOMIZADO,
  };
}

function extrairItemApoiadores(valores, linha, idx) {
  const row = valores[linha - 1];
  if (!row) return null;
  const lideranca = String(celula(valores, linha, idx.lideranca) ?? "").trim();
  const municipio = String(celula(valores, linha, idx.municipio) ?? "").trim();
  if (!lideranca || !municipio) return null;
  const fechadoOrcamento = celula(valores, linha, idx.fechadoOrcamento);
  if (!orcamentoFechadoApoiador(fechadoOrcamento)) return null;
  const item = {
    lideranca,
    municipio,
    proprioApoiador: celula(valores, linha, idx.proprioApoiador),
    fechadoOrcamento,
  };
  CATEGORIAS_TIPO_CONTRATO.forEach((cat) => {
    item[cat.fin] = celula(valores, linha, idx[cat.fin]);
    item[cat.qtd] = celula(valores, linha, idx[cat.qtd]);
  });
  return item;
}

function montarMapaLiderancasPorMunicipio(valoresApoiadores) {
  coordenadoresPorMunicipio = new Map();
  apoiadorPorMunLider = new Map();
  if (!valoresApoiadores?.length) return;

  const cab = valoresApoiadores[0] || [];
  const idx = indicesLinhaApoiadores(cab);

  for (let linha = cfgAp.LINHA_INICIO_DADOS; linha <= valoresApoiadores.length; linha++) {
    const item = extrairItemApoiadores(valoresApoiadores, linha, idx);
    if (!item) continue;

    const munNorm = PlanilhaApi.normalizarChave(item.municipio);
    if (!coordenadoresPorMunicipio.has(munNorm)) {
      coordenadoresPorMunicipio.set(munNorm, new Map());
    }
    const mapaLider = coordenadoresPorMunicipio.get(munNorm);
    const lidNorm = PlanilhaApi.normalizarChave(item.lideranca);
    if (!mapaLider.has(lidNorm)) mapaLider.set(lidNorm, item.lideranca);

    apoiadorPorMunLider.set(chaveMunLider(item.municipio, item.lideranca), item);
  }
}

function apoiadorPlanilhaPara(municipio, lideranca) {
  if (!municipio || !lideranca) return null;
  return apoiadorPorMunLider.get(chaveMunLider(municipio, lideranca)) || null;
}

function agregarContratosLideranca(municipio, lideranca, excluirLinha) {
  const out = {
    lider: { qtd: 0, valor: 0 },
    integral: { qtd: 0, valor: 0 },
    meio: { qtd: 0, valor: 0 },
    customizado: { qtd: 0, valor: 0 },
    valorTotal: 0,
  };
  if (!municipio || !lideranca || !colunaMunicipio || !colunaVinculo) return out;

  const munN = PlanilhaApi.normalizarChave(municipio);
  const lidN = PlanilhaApi.normalizarChave(lideranca);

  for (const item of linhas) {
    if (excluirLinha && Number(item._linha) === Number(excluirLinha)) continue;
    const m = PlanilhaApi.normalizarChave(valorItem(item, colunaMunicipio));
    const l = PlanilhaApi.normalizarChave(valorItem(item, colunaVinculo));
    if (m !== munN || l !== lidN) continue;
    const v = numeroMoeda(valorItem(item, colunaValorContrato)) || 0;
    out.valorTotal += v;
    const cat = colunaTipoContrato
      ? categoriaTipoContrato(valorItem(item, colunaTipoContrato))
      : null;
    if (cat && out[cat]) {
      out[cat].qtd += 1;
      out[cat].valor += v;
    }
  }
  return out;
}

function agregarContratosLiderancaComFormulario(municipio, lideranca) {
  const base = agregarContratosLideranca(municipio, lideranca, modoEdicao);
  const tipo = document.getElementById("campo-tipo-contrato")?.value?.trim() || "";
  const valor = numeroMoeda(document.getElementById("campo-valor-contrato")?.value) || 0;
  const cat = categoriaTipoContrato(tipo);
  if (cat && valor > 0 && base[cat]) {
    base[cat].qtd += 1;
    base[cat].valor += valor;
    base.valorTotal += valor;
  }
  return base;
}

function orcamentoFinApoiador(item, propFin) {
  return parseNumeroPlanilha(item[propFin]);
}

function orcamentoFinTotalApoiador(item) {
  if (!item) return 0;
  let t = parseNumeroPlanilha(item.proprioApoiador);
  CATEGORIAS_TIPO_CONTRATO.forEach((cat) => {
    t += orcamentoFinApoiador(item, cat.fin);
  });
  return t;
}

function obterAlertasLimiteLideranca(municipio, lideranca) {
  const alertas = [];
  const ap = apoiadorPlanilhaPara(municipio, lideranca);
  if (!ap) {
    if (municipio && lideranca) {
      alertas.push(
        "liderança não encontrada na planilha apoiadores para este município com orçamento fechado (S)."
      );
    }
    return alertas;
  }
  const uso = agregarContratosLiderancaComFormulario(municipio, lideranca);
  CATEGORIAS_TIPO_CONTRATO.forEach((cat) => {
    const orc = orcamentoFinApoiador(ap, cat.fin);
    const usado = uso[cat.id].valor;
    if (orc > 0 && usado > orc + 0.009) {
      alertas.push(
        `${cat.rotulo}: soma dos contratos (${valorMoedaGravar(usado)}) ultrapassa o orçamento (${valorMoedaGravar(orc)}).`
      );
    }
    const metaQtd = Math.floor(parseNumeroPlanilha(ap[cat.qtd]));
    const qtd = uso[cat.id].qtd;
    if (metaQtd > 0 && qtd > metaQtd) {
      alertas.push(
        `${cat.rotulo}: quantidade de contratos (${qtd}) ultrapassa a meta (${metaQtd}) na planilha apoiadores.`
      );
    }
  });
  const orcTotal = orcamentoFinTotalApoiador(ap);
  if (orcTotal > 0 && uso.valorTotal > orcTotal + 0.009) {
    alertas.push(
      `total dos contratos (${valorMoedaGravar(uso.valorTotal)}) ultrapassa o orçamento da liderança (${valorMoedaGravar(orcTotal)}).`
    );
  }
  return alertas;
}

function validarPrevisaoSaldoInclusaoContrato(municipio, lideranca, tipo, valorContrato, excluirLinha) {
  if (!municipio || !lideranca) {
    return { ok: false, mensagem: "informe município e liderança." };
  }
  if (!tipo) {
    return { ok: false, mensagem: "selecione o tipo de contrato." };
  }

  const ap = apoiadorPlanilhaPara(municipio, lideranca);
  if (!ap) {
    return {
      ok: false,
      mensagem:
        "liderança não encontrada na planilha apoiadores para este município com orçamento fechado (S). cadastre em pessoal → apoiadores.",
    };
  }

  const catId = categoriaTipoContrato(tipo);
  const catDef = CATEGORIAS_TIPO_CONTRATO.find((c) => c.id === catId);
  if (!catDef) {
    return { ok: true };
  }

  const orc = orcamentoFinApoiador(ap, catDef.fin);
  const metaQtd = Math.floor(parseNumeroPlanilha(ap[catDef.qtd]));
  const temPrevisaoOrcamento = orc > 0;
  const temPrevisaoQtd = metaQtd > 0;

  if (!temPrevisaoOrcamento && !temPrevisaoQtd) {
    return {
      ok: false,
      mensagem: "sem previsão para este tipo de contrato",
    };
  }

  const uso = agregarContratosLideranca(municipio, lideranca, excluirLinha || null);
  const usadoValor = uso[catId].valor;
  const qtdContratos = uso[catId].qtd;
  const valorNovo = numeroMoeda(valorContrato) || 0;

  if (temPrevisaoOrcamento) {
    const saldoOrc = orc - usadoValor;
    if (saldoOrc <= 0.009) {
      return {
        ok: false,
        mensagem: `não há saldo de orçamento para «${catDef.rotulo}» (orçamento ${valorMoedaGravar(orc)}, já usado ${valorMoedaGravar(usadoValor)}).`,
      };
    }
    if (valorNovo > saldoOrc + 0.009) {
      return {
        ok: false,
        mensagem: `valor do contrato ultrapassa o saldo de orçamento para «${catDef.rotulo}» (saldo ${valorMoedaGravar(saldoOrc)}).`,
      };
    }
  }

  if (temPrevisaoQtd) {
    const saldoQtd = metaQtd - qtdContratos;
    if (saldoQtd <= 0) {
      return {
        ok: false,
        mensagem: `não há saldo de quantidade para «${catDef.rotulo}» (meta ${metaQtd}, já ${qtdContratos} contrato(s)).`,
      };
    }
  }

  return { ok: true };
}

function htmlPainelLimiteLideranca(municipio, lideranca) {
  const ap = apoiadorPlanilhaPara(municipio, lideranca);
  if (!municipio || !lideranca) {
    return '<p class="contratos-painel-lideranca-vazio small text-muted mb-0">selecione município e liderança para conferir com a planilha apoiadores.</p>';
  }
  if (!ap) {
    return (
      '<div class="contratos-painel-lideranca-alerta alert alert-warning py-2 px-2 small mb-0" role="status">' +
      "liderança não encontrada na planilha <strong>apoiadores</strong> para este município com <strong>orçamento fechado (S)</strong>. " +
      'marque em <span class="text-nowrap">pessoal → apoiadores</span> antes de distribuir contratos.' +
      "</div>"
    );
  }

  const uso = agregarContratosLiderancaComFormulario(municipio, lideranca);
  const orcTotal = orcamentoFinTotalApoiador(ap);
  const extrapolaTotal = orcTotal > 0 && uso.valorTotal > orcTotal + 0.009;

  let linhasHtml = "";
  let totalQtde = 0;
  let totalOrcamento = 0;
  let totalContratos = 0;
  let totalValores = 0;
  let totalSaldo = 0;
  let temQtde = false;
  let temOrcamento = false;

  CATEGORIAS_TIPO_CONTRATO.forEach((cat) => {
    const orc = orcamentoFinApoiador(ap, cat.fin);
    const metaQtd = Math.floor(parseNumeroPlanilha(ap[cat.qtd]));
    const usado = uso[cat.id].valor;
    const qtd = uso[cat.id].qtd;
    const saldo = orc > 0 ? Math.max(0, orc - usado) : null;
    const extrapolaValor = orc > 0 && usado > orc + 0.009;
    const extrapolaQtd = metaQtd > 0 && qtd > metaQtd;
    const cls =
      extrapolaValor || extrapolaQtd
        ? " contratos-painel-lideranca-linha--alerta"
        : "";

    if (metaQtd > 0) {
      totalQtde += metaQtd;
      temQtde = true;
    }
    if (orc > 0) {
      totalOrcamento += orc;
      temOrcamento = true;
      totalSaldo += saldo;
    }
    totalContratos += qtd;
    totalValores += usado;

    linhasHtml +=
      `<tr class="${cls.trim()}">` +
      `<td class="contratos-painel-col-tipo">${escapeHtml(cat.rotulo)}</td>` +
      `<td class="text-center contratos-painel-col-meta">${metaQtd > 0 ? metaQtd : ""}</td>` +
      `<td class="text-end contratos-painel-col-meta">${
        orc > 0 ? escapeHtml(valorMoedaGravar(orc)) : ""
      }</td>` +
      `<td class="text-center contratos-painel-col-uso">${qtd > 0 ? qtd : ""}</td>` +
      `<td class="text-end contratos-painel-col-uso">${
        usado > 0 ? escapeHtml(valorMoedaGravar(usado)) : ""
      }</td>` +
      `<td class="text-end contratos-painel-col-saldo">${
        saldo != null ? escapeHtml(valorMoedaGravar(saldo)) : ""
      }</td>` +
      "</tr>";
  });

  const badgeExtrapola = extrapolaTotal
    ? '<span class="contratos-painel-lideranca-badge">acima do orçamento</span>'
    : "";

  const linhaTotal =
    "<tr class=\"contratos-painel-lideranca-linha-total\">" +
    '<td class="contratos-painel-col-tipo"><strong>total</strong></td>' +
    `<td class="text-center contratos-painel-col-meta"><strong>${
      temQtde ? totalQtde : ""
    }</strong></td>` +
    `<td class="text-end contratos-painel-col-meta"><strong>${
      temOrcamento ? escapeHtml(valorMoedaGravar(totalOrcamento)) : ""
    }</strong></td>` +
    `<td class="text-center contratos-painel-col-uso"><strong>${
      totalContratos > 0 ? totalContratos : ""
    }</strong></td>` +
    `<td class="text-end contratos-painel-col-uso"><strong>${
      totalValores > 0 ? escapeHtml(valorMoedaGravar(totalValores)) : ""
    }</strong></td>` +
    `<td class="text-end contratos-painel-col-saldo"><strong>${
      temOrcamento ? escapeHtml(valorMoedaGravar(totalSaldo)) : ""
    }</strong></td>` +
    "</tr>";

  return (
    '<div class="contratos-painel-lideranca-inner">' +
    '<div class="contratos-painel-lideranca-cab">' +
    '<div class="contratos-painel-lideranca-ident">' +
    `<div class="contratos-painel-lideranca-nome">${escapeHtml(lideranca)}</div>` +
    `<div class="contratos-painel-lideranca-municipio text-muted">${escapeHtml(municipio)}</div>` +
    "</div>" +
    badgeExtrapola +
    "</div>" +
    '<div class="table-responsive">' +
    '<table class="table table-sm table-bordered mb-0 contratos-painel-lideranca-tabela">' +
    "<thead><tr>" +
    '<th class="contratos-painel-col-tipo">tipo apoiador</th>' +
    '<th class="text-center contratos-painel-col-meta">qtde</th>' +
    '<th class="text-end contratos-painel-col-meta">orçamento</th>' +
    '<th class="text-center contratos-painel-col-uso">contratos</th>' +
    '<th class="text-end contratos-painel-col-uso">valores</th>' +
    '<th class="text-end contratos-painel-col-saldo">saldo</th>' +
    "</tr></thead><tbody>" +
    linhasHtml +
    "</tbody><tfoot>" +
    linhaTotal +
    "</tfoot></table></div></div>"
  );
}

function garantirPainelLimiteLideranca() {
  return document.getElementById("contratosPainelLideranca");
}

function inserirPainelLimiteLiderancaAposCoordenador() {
  const existente = document.getElementById("contratosPainelLideranca");
  if (existente) existente.remove();

  const painelRow = document.createElement("div");
  painelRow.className = "row g-2 mb-2 contratos-painel-lideranca-row";
  const col = document.createElement("div");
  col.className = "col-12";
  const painel = document.createElement("div");
  painel.id = "contratosPainelLideranca";
  painel.className = "contratos-painel-lideranca";
  painel.setAttribute("aria-live", "polite");
  col.appendChild(painel);
  painelRow.appendChild(col);

  const coord = document.getElementById("campo-coordenador");
  const rowCoord = coord?.closest(".row");
  if (rowCoord?.parentNode) {
    rowCoord.parentNode.insertBefore(painelRow, rowCoord.nextSibling);
    return;
  }
  el.formCampos?.appendChild(painelRow);
}

function atualizarPainelLimiteLideranca() {
  const painel = garantirPainelLimiteLideranca();
  if (!painel) return;
  const municipio = document.getElementById("campo-municipio")?.value?.trim() || "";
  const lideranca = document.getElementById("campo-coordenador")?.value?.trim() || "";
  painel.innerHTML = htmlPainelLimiteLideranca(municipio, lideranca);
  const alertas = obterAlertasLimiteLideranca(municipio, lideranca);
  painel.classList.toggle("contratos-painel-lideranca--extrapolado", alertas.length > 0);
}

function vincularVerificacaoLideranca() {
  const campos = [
    { id: "campo-municipio", evt: "change" },
    { id: "campo-coordenador", evt: "change" },
    { id: "campo-tipo-contrato", evt: "change" },
    { id: "campo-valor-contrato", evt: "input" },
  ];
  campos.forEach(({ id, evt }) => {
    const node = document.getElementById(id);
    if (!node) return;
    if (node._contratosPainelLider) {
      node.removeEventListener(evt, node._contratosPainelLider);
    }
    node._contratosPainelLider = () => atualizarPainelLimiteLideranca();
    node.addEventListener(evt, node._contratosPainelLider);
  });
  atualizarPainelLimiteLideranca();
}

function coordenadoresDoMunicipio(municipioRotulo) {
  const norm = PlanilhaApi.normalizarChave(municipioRotulo);
  const mapa = coordenadoresPorMunicipio.get(norm);
  if (!mapa) return [];
  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function municipioSelecionadoNoForm(dados) {
  const sel = document.getElementById("campo-municipio");
  if (sel?.value?.trim()) return sel.value.trim();
  if (dados && colunaMunicipio) return String(dados[colunaMunicipio.chave] ?? "").trim();
  return "";
}

function opcoesCampoSelect(campo, dados) {
  if (campo.origem === "tipo-contrato") return cfg.OPCOES_TIPO_CONTRATO || [];
  if (campo.origem === "municipios") return listaMunicipiosForm;
  if (campo.origem === "liderancas") {
    const municipio = municipioSelecionadoNoForm(dados);
    return municipio ? coordenadoresDoMunicipio(municipio) : [];
  }
  return [];
}

function htmlOpcoesSelect(opcoes, valorAtual, placeholderVazio) {
  const valor = String(valorAtual ?? "").trim();
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

function repopularSelectCoordenador(valorAtual, limparSelecao) {
  const selMun = document.getElementById("campo-municipio");
  const selCoord = document.getElementById("campo-coordenador");
  if (!selCoord) return;

  const municipio = selMun?.value?.trim() || "";
  const opcoes = municipio ? coordenadoresDoMunicipio(municipio) : [];
  const valor =
    limparSelecao ? "" : valorAtual != null ? String(valorAtual).trim() : selCoord.value.trim();
  const placeholder = municipio ? "selecione..." : "selecione o município primeiro";

  selCoord.innerHTML = htmlOpcoesSelect(opcoes, valor, placeholder);
  selCoord.disabled = !municipio;
  if (limparSelecao) selCoord.value = "";
}

function linhaValorReferenciaPorTipo(tipo) {
  const ref = cfg.REFERENCIA_VALOR_CONTRATO;
  if (!ref?.LINHA_POR_TIPO) return null;
  const chave = PlanilhaApi.normalizarChave(tipo);
  const linha = ref.LINHA_POR_TIPO[chave];
  return linha == null ? null : linha;
}

async function obterValoresReferenciaContrato() {
  const ref = cfg.REFERENCIA_VALOR_CONTRATO;
  if (!ref?.PLANILHA) return null;
  if (cacheValoresReferenciaContrato) return cacheValoresReferenciaContrato;
  if (!promessaValoresReferenciaContrato) {
    promessaValoresReferenciaContrato = PlanilhaApi.lerValores(ref.PLANILHA, ref.ABA)
      .then((valores) => {
        cacheValoresReferenciaContrato = valores || [];
        return cacheValoresReferenciaContrato;
      })
      .catch(() => {
        promessaValoresReferenciaContrato = null;
        return null;
      });
  }
  return promessaValoresReferenciaContrato;
}

function valorReferenciaContrato(tipo, valores) {
  const ref = cfg.REFERENCIA_VALOR_CONTRATO;
  const linha = linhaValorReferenciaPorTipo(tipo);
  if (linha == null || !valores?.length) return "";
  const col = ref.COLUNA_VALOR != null ? ref.COLUNA_VALOR : 3;
  const bruto = valores[linha]?.[col];
  return bruto != null ? bruto : "";
}

function aplicarValorSugeridoContrato(valorBruto) {
  const input = document.getElementById("campo-valor-contrato");
  if (!input) return;
  const formatado = valorMoedaGravar(valorBruto) || String(valorBruto ?? "").trim();
  input.value = formatado;
}

function tipoContratoEhCustomizado(tipo) {
  return (
    PlanilhaApi.normalizarChave(tipo) ===
    PlanilhaApi.normalizarChave("apoiador customizado")
  );
}

function definirValorContratoSomenteLeitura(somenteLeitura) {
  const input = document.getElementById("campo-valor-contrato");
  if (!input) return;
  input.readOnly = somenteLeitura;
  input.classList.toggle("contratos-valor-contrato--somente-leitura", somenteLeitura);
  if (somenteLeitura) input.setAttribute("aria-readonly", "true");
  else input.removeAttribute("aria-readonly");
}

async function aplicarValorContratoPorTipoSelecionado() {
  const selTipo = document.getElementById("campo-tipo-contrato");
  const tipo = selTipo?.value?.trim() || "";
  if (!tipo) {
    definirValorContratoSomenteLeitura(true);
    return;
  }
  if (tipoContratoEhCustomizado(tipo)) {
    definirValorContratoSomenteLeitura(false);
    return;
  }
  definirValorContratoSomenteLeitura(true);
  const valores = await obterValoresReferenciaContrato();
  if (!valores) return;
  const sugerido = valorReferenciaContrato(tipo, valores);
  if (sugerido !== "" && sugerido != null) {
    aplicarValorSugeridoContrato(sugerido);
  }
}

function vincularFormatacaoValorContrato() {
  const input = document.getElementById("campo-valor-contrato");
  if (!input || input.dataset.moedaFormatada === "1") return;
  input.dataset.moedaFormatada = "1";
  input.addEventListener("blur", () => {
    if (input.readOnly) return;
    const formatado = valorMoedaGravar(input.value);
    input.value = formatado || "";
  });
}

function vincularSugestaoValorContrato() {
  const selTipo = document.getElementById("campo-tipo-contrato");
  const inputValor = document.getElementById("campo-valor-contrato");
  if (!selTipo || !inputValor) return;

  vincularFormatacaoValorContrato();

  if (selTipo._contratosMudouTipo) {
    selTipo.removeEventListener("change", selTipo._contratosMudouTipo);
  }

  selTipo._contratosMudouTipo = async () => {
    await aplicarValorContratoPorTipoSelecionado();
    atualizarPainelLimiteLideranca();
  };

  selTipo.addEventListener("change", selTipo._contratosMudouTipo);
  aplicarValorContratoPorTipoSelecionado();
}

function vincularFiltroCoordenador(dados) {
  const selMun = document.getElementById("campo-municipio");
  if (!selMun) return;

  const valorCoord =
    dados && colunaVinculo ? String(dados[colunaVinculo.chave] ?? "").trim() : "";

  if (selMun._contratosMudouMun) {
    selMun.removeEventListener("change", selMun._contratosMudouMun);
  }
  selMun._contratosMudouMun = () => {
    repopularSelectCoordenador("", true);
    atualizarPainelLimiteLideranca();
  };
  selMun.addEventListener("change", selMun._contratosMudouMun);

  repopularSelectCoordenador(valorCoord, false);
}

function resolverCamposFormulario() {
  return (cfg.CAMPOS_FORMULARIO || [])
    .map((campo) => ({
      ...campo,
      coluna: PlanilhaApi.acharColuna(colunas, campo.aliases, campo.indice),
    }))
    .filter((campo) => campo.coluna)
    .filter((campo) => {
      if (campo.id === "lancar-sistema" && cfg.EXIBIR_CAMPO_LANCAR_SISTEMA_FORMULARIO === false) {
        return false;
      }
      return true;
    });
}

function resolverCampoFormularioContrato(id) {
  const campo = (cfg.CAMPOS_FORMULARIO || []).find((c) => c.id === id);
  if (!campo) return null;
  const coluna = PlanilhaApi.acharColuna(colunas, campo.aliases, campo.indice);
  if (!coluna) return null;
  return { ...campo, coluna };
}

/** Campo oculto no modal — envia valor padrão na inserção e preserva na edição. */
function dadosLancamentoSistemaAoSalvar() {
  if (cfg.EXIBIR_CAMPO_LANCAR_SISTEMA_FORMULARIO !== false) return {};
  const campo = resolverCampoFormularioContrato("lancar-sistema");
  if (!campo?.coluna) return {};
  const chave = chaveGravacao(campo.coluna);
  if (modoEdicao && itemEdicao) {
    const val = itemEdicao[campo.coluna.chave];
    if (val != null && String(val).trim() !== "") {
      return { [chave]: String(val).trim() };
    }
  }
  return { [chave]: campo.valorNao ?? "N" };
}

function chaveGravacao(coluna) {
  if (!coluna) return "";
  const planilha = coluna.chavePlanilha != null ? String(coluna.chavePlanilha) : "";
  return planilha.trim() !== "" ? planilha : coluna.chave;
}

function valorCampoFormulario(dados, campo) {
  if (!dados || !campo?.coluna) return "";
  const col = campo.coluna;
  const candidatos = [col.chave, col.chavePlanilha, chaveGravacao(col)];
  for (let i = 0; i < candidatos.length; i++) {
    const k = candidatos[i];
    if (k == null || String(k).trim() === "") continue;
    const v = dados[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function gravarValorCampoFormulario(dados, coluna, valor) {
  if (!coluna) return;
  const chave = chaveGravacao(coluna);
  dados[chave] = valor;
  if (coluna.chavePlanilha && coluna.chavePlanilha !== chave) {
    dados[coluna.chavePlanilha] = valor;
  }
  if (coluna.chave && coluna.chave !== chave) {
    dados[coluna.chave] = valor;
  }
}

function classeRotulo(campo) {
  return campo.rotuloUpper ? "form-label contratos-label-upper" : "form-label";
}

function valorCheckboxGravar(campo, marcado) {
  const valorAtual =
    itemEdicao && campo.coluna ? itemEdicao[campo.coluna.chave] : undefined;
  if (valorAtual === true || valorAtual === false) return marcado;
  const norm = PlanilhaApi.normalizarChave(valorAtual);
  if (norm === "true" || norm === "false") return marcado;
  if (campo.valorSim != null || campo.valorNao != null) {
    return marcado ? campo.valorSim ?? "S" : campo.valorNao ?? "N";
  }
  if (norm === "s" || norm === "n") return marcado ? "S" : "N";
  return marcado ? "sim" : "não";
}

function valorExibicaoCampoTexto(campo, valorBruto) {
  const s = String(valorBruto ?? "").trim();
  if (!campo.uppercase) return String(valorBruto ?? "");
  return s.toLocaleUpperCase("pt-BR");
}

function vincularUppercaseCampoTexto(campo, input) {
  if (!campo.uppercase || !input || input.dataset.uppercaseVinculado === "1") return;
  input.dataset.uppercaseVinculado = "1";
  input.addEventListener("input", () => {
    const pos = input.selectionStart;
    input.value = input.value.toLocaleUpperCase("pt-BR");
    if (pos != null) input.setSelectionRange(pos, pos);
  });
  input.addEventListener("blur", () => {
    input.value = String(input.value || "")
      .trim()
      .toLocaleUpperCase("pt-BR");
  });
}

function criarCampoTexto(campo, dados, attrs) {
  const id = "campo-" + campo.id;
  const valorBruto = valorCampoFormulario(dados, campo);
  const valor = valorExibicaoCampoTexto(campo, valorBruto);
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<input type="text" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}" value="${escapeHtml(String(valor ?? ""))}" autocomplete="off"${attrs || ""}>`;
  const input = wrap.querySelector("input");
  vincularUppercaseCampoTexto(campo, input);
  return wrap;
}

function criarCampoCpf(campo, dados) {
  const wrap = criarCampoTexto(campo, dados, ' inputmode="numeric" maxlength="14"');
  const input = wrap.querySelector("input");
  if (input) {
    input.value = formatarCpf(input.value);
    input.addEventListener("input", () => {
      const pos = input.selectionStart;
      const antes = input.value.length;
      input.value = formatarCpf(input.value);
      const depois = input.value.length;
      const novaPos = Math.max(0, (pos || 0) + (depois - antes));
      input.setSelectionRange(novaPos, novaPos);
    });
  }
  return wrap;
}

function criarCampoCelular(campo, dados) {
  const wrap = criarCampoTexto(campo, dados, ' inputmode="tel" maxlength="15"');
  const input = wrap.querySelector("input");
  if (input) {
    input.value = formatarCelular(input.value);
    input.addEventListener("input", () => {
      const pos = input.selectionStart;
      const antes = input.value.length;
      input.value = formatarCelular(input.value);
      const depois = input.value.length;
      const novaPos = Math.max(0, (pos || 0) + (depois - antes));
      input.setSelectionRange(novaPos, novaPos);
    });
  }
  return wrap;
}

function criarCampoData(campo, dados) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? planilhaDataParaInputDate(valorCampoFormulario(dados, campo)) : "";
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<input type="date" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}" value="${escapeHtml(valor)}" autocomplete="off">`;
  return wrap;
}

function criarCampoMoeda(campo, dados) {
  const valor = valorCampoFormulario(dados, campo);
  const exibicao = valorMoedaGravar(valor) || String(valor ?? "").trim();
  const dadosExibicao = dados ? { ...dados } : {};
  if (campo.coluna) dadosExibicao[campo.coluna.chave] = exibicao;
  return criarCampoTexto(campo, dadosExibicao, ' inputmode="decimal"');
}

function criarCampoSelect(campo, dados, opcoes) {
  const id = "campo-" + campo.id;
  const valor = valorCampoFormulario(dados, campo);
  const placeholder =
    campo.origem === "liderancas" && !municipioSelecionadoNoForm(dados)
      ? "selecione o município primeiro"
      : "selecione...";
  const optionsHtml = htmlOpcoesSelect(opcoes, valor, placeholder);
  const desabilitado = campo.origem === "liderancas" && !municipioSelecionadoNoForm(dados);

  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<select class="form-select form-select-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}"${desabilitado ? " disabled" : ""}>${optionsHtml}</select>`;
  return wrap;
}

function criarCampoCheckbox(campo, dados) {
  const id = "campo-" + campo.id;
  const valor = valorCampoFormulario(dados, campo);
  const marcado = valorCheckboxSim(valor);
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<div class="form-check contratos-form-check">` +
    `<input type="checkbox" class="form-check-input" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}"${marcado ? " checked" : ""}>` +
    `<label class="form-check-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `</div>`;
  return wrap;
}

function classeColunaFormularioContratos(campo, chaveGrupo) {
  if (chaveGrupo === "nome-assinado") {
    return campo.id === "nome"
      ? "col-9 col-lg-10 contratos-col-nome-assinado-nome"
      : "col-3 col-lg-2 contratos-col-nome-assinado-assinado";
  }
  if (
    chaveGrupo === "documentos-cpf-titulo" ||
    chaveGrupo === "documentos-nascimento-celular"
  ) {
    return "col-6 contratos-col-documentos-par";
  }
  const largura = campo.largura || 12;
  return largura >= 12 ? "col-12" : "col-12 col-md-" + largura;
}

function classeRowFormularioContratos(chaveGrupo) {
  if (chaveGrupo === "nome-assinado") {
    return "row g-2 mb-2 contratos-row-nome-assinado";
  }
  if (
    chaveGrupo === "documentos-cpf-titulo" ||
    chaveGrupo === "documentos-nascimento-celular"
  ) {
    return "row g-2 mb-2 contratos-row-documentos-dupla";
  }
  return "row g-2 mb-2";
}

function montarFormulario(dados) {
  el.formCampos.innerHTML = "";
  const campos = resolverCamposFormulario();
  if (!campos.length) {
    el.formCampos.innerHTML =
      '<p class="text-danger small mb-0">' +
      "Nenhum campo do formulário foi encontrado na planilha de contratos. " +
      "Confira em <strong>?p=planilhas</strong> se a aba exibida é a de colaboradores " +
      "(cabeçalhos como nome-completo, cpf, municipio), não a de auditoria." +
      "</p>";
    return;
  }
  const ordem = [];
  const grupos = new Map();

  campos.forEach((campo) => {
    const chaveGrupo = campo.grupo || "__solo_" + campo.id;
    if (!grupos.has(chaveGrupo)) {
      grupos.set(chaveGrupo, []);
      ordem.push(chaveGrupo);
    }
    grupos.get(chaveGrupo).push(campo);
  });

  ordem.forEach((chaveGrupo) => {
    const row = document.createElement("div");
    row.className = classeRowFormularioContratos(chaveGrupo);
    grupos.get(chaveGrupo).forEach((campo) => {
      const col = document.createElement("div");
      col.className = classeColunaFormularioContratos(campo, chaveGrupo);

      if (campo.tipo === "checkbox") {
        col.appendChild(criarCampoCheckbox(campo, dados));
      } else if (campo.tipo === "cpf") {
        col.appendChild(criarCampoCpf(campo, dados));
      } else if (campo.tipo === "celular") {
        col.appendChild(criarCampoCelular(campo, dados));
      } else if (campo.tipo === "data") {
        col.appendChild(criarCampoData(campo, dados));
      } else if (campo.tipo === "moeda") {
        col.appendChild(criarCampoMoeda(campo, dados));
      } else if (campo.tipo === "select") {
        col.appendChild(criarCampoSelect(campo, dados, opcoesCampoSelect(campo, dados)));
      } else {
        col.appendChild(criarCampoTexto(campo, dados));
      }

      row.appendChild(col);
    });
    el.formCampos.appendChild(row);
  });

  inserirPainelLimiteLiderancaAposCoordenador();

  vincularFiltroCoordenador(dados);
  vincularSugestaoValorContrato();
  vincularChavePixComCpf();
  vincularVerificacaoLideranca();
  obterValoresReferenciaContrato();
}

function linhaArquivosContrato() {
  return itemArquivosEdicao?._linha;
}

function documentosObrigatoriosContrato() {
  return cfg.DOCUMENTOS_OBRIGATORIOS || [];
}

function documentosOpcionaisContrato() {
  return cfg.DOCUMENTOS_OPCIONAIS || [];
}

function documentosTodosTiposContrato() {
  return [...documentosObrigatoriosContrato(), ...documentosOpcionaisContrato()];
}

function rotuloTipoDocumento(chave) {
  const doc = documentosTodosTiposContrato().find((d) => d.chave === chave);
  if (!doc) return chave;
  return doc.rotuloSelect || doc.rotulo || chave;
}

function abrirModalArquivos(item) {
  itemArquivosEdicao = item;
  const nome = exibirValor(valorItem(item, colunaNome));
  const cpf = exibirValor(valorItem(item, colunaCpf));
  const municipio = exibirValor(valorItem(item, colunaMunicipio));
  if (el.modalArquivosTitulo) el.modalArquivosTitulo.textContent = "documentos";
  if (el.modalArquivosIdent) el.modalArquivosIdent.textContent = nome || "colaborador";
  if (el.modalArquivosCpf) {
    el.modalArquivosCpf.textContent = cpf || "";
    el.modalArquivosCpf.hidden = !cpf;
  }
  if (el.modalArquivosMunicipio) {
    el.modalArquivosMunicipio.textContent = municipio || "";
    el.modalArquivosMunicipio.hidden = !municipio;
  }
  if (el.contratosInputArquivos) {
    el.contratosInputArquivos.value = "";
    el.contratosInputArquivos.disabled = false;
  }
  const tabObr = document.getElementById("tabDocObrigatorios");
  if (tabObr) bootstrap.Tab.getOrCreateInstance(tabObr).show();
  if (el.contratosListaObrigatorios) el.contratosListaObrigatorios.innerHTML = "";
  if (el.contratosListaOpcionais) el.contratosListaOpcionais.innerHTML = "";
  definirCarregandoListaDocumentos(true);
  modalArquivos?.show();
  popularSelectTipoDocumento({});
  carregarListaArquivosContrato();
}

function popularSelectTipoDocumento(statusTipos) {
  const sel = el.contratosSelectTipoDocumento;
  if (!sel) return;
  const valorAtual = sel.value;
  const obr = documentosObrigatoriosContrato();
  const opc = documentosOpcionaisContrato();
  let html = obr
    .map((doc) => {
      const ok = statusTipos[doc.chave];
      const suffix = ok ? " (substituir)" : "";
      const label = rotuloTipoDocumento(doc.chave);
      return (
        '<option value="' +
        escapeHtml(doc.chave) +
        '">' +
        escapeHtml(label + suffix) +
        "</option>"
      );
    })
    .join("");
  if (opc.length) {
    html +=
      '<option value="" disabled>— opcionais —</option>' +
      opc
        .map((doc) => {
          const ok = statusTipos[doc.chave];
          const suffix = ok ? " (substituir)" : "";
          const label = rotuloTipoDocumento(doc.chave);
          return (
            '<option value="' +
            escapeHtml(doc.chave) +
            '">' +
            escapeHtml(label + suffix) +
            "</option>"
          );
        })
        .join("");
  }
  sel.innerHTML = html;
  if (valorAtual && sel.querySelector(`option[value="${valorAtual}"]`)) {
    sel.value = valorAtual;
  } else {
    const pendente = obr.find((d) => !statusTipos[d.chave]);
    if (pendente) sel.value = pendente.chave;
  }
}

function htmlItemDocumentoLista(doc, statusTipos, arquivosPorTipo, opcional) {
  const ok = statusTipos[doc.chave];
  const arq = arquivosPorTipo[doc.chave];
  const estado = opcional ? (ok ? "carregado" : "opcional") : ok ? "carregado" : "pendente";
  const icone = ok
    ? '<i class="fa-solid fa-circle-check contratos-doc-icone--ok" aria-hidden="true"></i>'
    : opcional
      ? '<i class="fa-solid fa-triangle-exclamation contratos-doc-icone--opcional" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-circle-xmark contratos-doc-icone--pendente" aria-hidden="true"></i>';
  let arquivoHtml = "";
  if (arq) {
    const tam = formatarTamanhoArquivo(arq.tamanho);
    const meta = tam ? `<span class="contratos-doc-arquivo-meta">${escapeHtml(tam)}</span>` : "";
    arquivoHtml =
      '<a class="contratos-doc-arquivo-link" href="' +
      escapeHtml(arq.url) +
      '" target="_blank" rel="noopener">' +
      escapeHtml(arq.nome) +
      "</a>" +
      meta +
      '<button type="button" class="btn btn-sm btn-link text-danger contratos-doc-btn-excluir" data-id="' +
      escapeHtml(arq.id) +
      '" title="excluir"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>';
  }
  const estadoTexto = opcional ? (ok ? "carregado" : "opcional") : ok ? "carregado" : "pendente";
  return (
    '<li class="contratos-doc-item contratos-doc-item--' +
    estado +
    '">' +
    '<span class="contratos-doc-icone" aria-hidden="true">' +
    icone +
    "</span>" +
    '<span class="contratos-doc-rotulo">' +
    escapeHtml(doc.rotulo) +
    "</span>" +
    '<span class="contratos-doc-estado">' +
    estadoTexto +
    "</span>" +
    '<span class="contratos-doc-arquivo">' +
    arquivoHtml +
    "</span>" +
    "</li>"
  );
}

function vincularBotoesExcluirDocumento(container) {
  container?.querySelectorAll(".contratos-doc-btn-excluir").forEach((btn) => {
    btn.addEventListener("click", () => excluirArquivoContrato(btn.dataset.id));
  });
}

function atualizarTabsDocumentos(docsObr, docsOpc, statusTipos) {
  const obrCarregados = docsObr.filter((d) => statusTipos[d.chave]).length;
  const opcCarregados = docsOpc.filter((d) => statusTipos[d.chave]).length;
  if (el.tabDocObrigatoriosLabel) {
    el.tabDocObrigatoriosLabel.textContent =
      docsObr.length ? `obrigatórios (${obrCarregados}/${docsObr.length})` : "obrigatórios";
  }
  if (el.tabDocOpcionaisLabel) {
    el.tabDocOpcionaisLabel.textContent =
      docsOpc.length ? `opcionais (${opcCarregados}/${docsOpc.length})` : "opcionais";
  }
}

function renderizarDocumentosObrigatorios(json) {
  const listaObr = el.contratosListaObrigatorios;
  const listaOpc = el.contratosListaOpcionais;
  const resumo = el.contratosArquivosResumo;
  if (!listaObr) return;

  const docsObr = documentosObrigatoriosContrato();
  const docsOpc = documentosOpcionaisContrato();
  const statusTipos = json.documentosObrigatorios?.tipos || {};
  const arquivosPorTipo = {};
  (json.arquivos || []).forEach((a) => {
    if (a.tipoDocumento) arquivosPorTipo[a.tipoDocumento] = a;
  });

  const total = docsObr.length;
  const carregados =
    json.documentosObrigatorios?.carregados ??
    docsObr.filter((d) => statusTipos[d.chave]).length;
  const todos =
    json.documentosObrigatorios?.todosObrigatorios ?? carregados === total;

  if (resumo) {
    resumo.className =
      "contratos-arquivos-resumo small mb-2" +
      (todos ? " contratos-arquivos-resumo--ok" : " contratos-arquivos-resumo--pendente");
    resumo.textContent = todos
      ? "todos os documentos obrigatórios foram enviados"
      : `${carregados} de ${total} documentos obrigatórios enviados`;
  }

  listaObr.innerHTML = docsObr
    .map((doc) => htmlItemDocumentoLista(doc, statusTipos, arquivosPorTipo, false))
    .join("");
  vincularBotoesExcluirDocumento(listaObr);

  if (listaOpc) {
    listaOpc.innerHTML = docsOpc
      .map((doc) => htmlItemDocumentoLista(doc, statusTipos, arquivosPorTipo, true))
      .join("");
    vincularBotoesExcluirDocumento(listaOpc);
  }

  atualizarTabsDocumentos(docsObr, docsOpc, statusTipos);
  popularSelectTipoDocumento(statusTipos);
}

function formatarTamanhoArquivo(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

function lerArquivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

async function carregarListaArquivosContrato() {
  const lista = el.contratosListaObrigatorios;
  const linha = linhaArquivosContrato();
  if (!lista || !linha) return;

  if (!arquivosContratoCarregando) definirCarregandoListaDocumentos(true, "carregando documentos...");
  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "listar-arquivos-contrato",
      linha,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json) return;
    renderizarDocumentosObrigatorios(json);
  } catch (e) {
    lista.innerHTML =
      '<li class="text-danger small">erro ao listar: ' + escapeHtml(e.message) + "</li>";
  } finally {
    if (!arquivosContratoCarregando) definirCarregandoListaDocumentos(false);
  }
}

function definirCarregandoListaDocumentos(ativo, texto) {
  const overlay = el.contratosDocCarregando;
  if (!overlay) return;
  overlay.classList.toggle("d-none", !ativo);
  overlay.setAttribute("aria-hidden", ativo ? "false" : "true");
  overlay.setAttribute("aria-busy", ativo ? "true" : "false");
  const txt = overlay.querySelector(".contratos-doc-carregando-texto");
  if (txt && texto) txt.textContent = texto;
  else if (txt && ativo) txt.textContent = "carregando documentos...";
}

function definirEstadoUploadArquivos(ativo, texto) {
  arquivosContratoCarregando = ativo;

  const overlay = el.modalArquivosEnviando;
  if (overlay) {
    overlay.classList.toggle("d-none", !ativo);
    overlay.setAttribute("aria-hidden", ativo ? "false" : "true");
    overlay.setAttribute("aria-busy", ativo ? "true" : "false");
  }
  if (el.modalArquivosEnviandoTexto) {
    el.modalArquivosEnviandoTexto.textContent = texto || "enviando...";
  }

  const btnEnviar = el.contratosBtnEnviarArquivo;
  const btnIcone = btnEnviar?.querySelector(".contratos-arquivos-btn-icone");
  const btnTexto = btnEnviar?.querySelector(".contratos-arquivos-btn-texto");
  const btnSpinner = btnEnviar?.querySelector(".contratos-arquivos-btn-spinner");
  if (btnEnviar) {
    btnEnviar.classList.toggle("contratos-arquivos-btn-enviar--carregando", ativo);
    if (ativo) btnEnviar.setAttribute("aria-disabled", "true");
    else btnEnviar.removeAttribute("aria-disabled");
  }
  if (btnIcone) btnIcone.classList.toggle("d-none", ativo);
  if (btnTexto) btnTexto.textContent = ativo ? "enviando..." : "selecionar arquivo";
  if (btnSpinner) btnSpinner.classList.toggle("d-none", !ativo);

  if (el.contratosInputArquivos) el.contratosInputArquivos.disabled = ativo;
  if (el.contratosSelectTipoDocumento) el.contratosSelectTipoDocumento.disabled = ativo;
  if (el.btnArquivosFechar) el.btnArquivosFechar.disabled = ativo;
  if (el.btnArquivosFecharHeader) {
    el.btnArquivosFecharHeader.disabled = ativo;
    el.btnArquivosFecharHeader.setAttribute("aria-disabled", ativo ? "true" : "false");
  }
}

async function enviarArquivosSelecionados(input) {
  const file = input?.files?.[0];
  const linha = linhaArquivosContrato();
  const tipoDocumento = el.contratosSelectTipoDocumento?.value?.trim() || "";
  if (!file || !linha) return;
  if (!tipoDocumento) {
    AppToast.show("selecione o tipo de documento", "erro");
    return;
  }
  if (arquivosContratoCarregando) return;

  const rotulo = rotuloTipoDocumento(tipoDocumento);
  definirEstadoUploadArquivos(true, `enviando ${rotulo}...`);

  try {
    const base64 = await lerArquivoComoBase64(file);
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "upload-arquivo-contrato",
      linha,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
      dados: {
        nomeArquivo: file.name,
        mimeType: file.type || "application/octet-stream",
        conteudoBase64: base64,
        tipoDocumento,
      },
    });
    if (!json) return;
    await carregarListaArquivosContrato();
    const ehOpcional = documentosOpcionaisContrato().some((d) => d.chave === tipoDocumento);
    const tabBtn = ehOpcional
      ? document.getElementById("tabDocOpcionais")
      : document.getElementById("tabDocObrigatorios");
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
    AppToast.show(rotulo + " enviado", "sucesso");
  } catch (e) {
    AppToast.show("erro ao enviar: " + e.message, "erro");
  } finally {
    definirEstadoUploadArquivos(false);
    if (input) input.value = "";
  }
}

async function excluirArquivoContrato(fileId) {
  const linha = linhaArquivosContrato();
  if (!fileId || !linha) return;
  if (!(await AppConfirm.confirm("Excluir este arquivo?", { perigo: true, icon: "warning" }))) return;

  definirCarregandoListaDocumentos(true, "excluindo...");
  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "excluir-arquivo-contrato",
      linha,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
      dados: { fileId },
    });
    if (!json) {
      definirCarregandoListaDocumentos(false);
      return;
    }
    await carregarListaArquivosContrato();
    AppToast.show("arquivo excluído", "sucesso");
  } catch (e) {
    definirCarregandoListaDocumentos(false);
    AppToast.show("erro ao excluir: " + e.message, "erro");
  }
}

function vincularChavePixComCpf() {
  const cpfInput = document.getElementById("campo-cpf");
  const pixInput = document.getElementById("campo-chave-pix");
  if (!cpfInput || !pixInput) return;

  if (cpfInput._contratosSyncPix) {
    cpfInput.removeEventListener("input", cpfInput._contratosSyncPix);
  }
  cpfInput._contratosSyncPix = () => {
    pixInput.value = cpfInput.value;
  };
  cpfInput.addEventListener("input", cpfInput._contratosSyncPix);
}

function lerFormulario() {
  const dados = {};
  resolverCamposFormulario().forEach((campo) => {
    const input = document.getElementById("campo-" + campo.id);
    if (!input) return;

    if (campo.tipo === "checkbox") {
      gravarValorCampoFormulario(dados, campo.coluna, valorCheckboxGravar(campo, input.checked));
    } else if (campo.tipo === "cpf") {
      gravarValorCampoFormulario(dados, campo.coluna, formatarCpf(input.value));
    } else if (campo.tipo === "celular") {
      gravarValorCampoFormulario(dados, campo.coluna, formatarCelular(input.value));
    } else if (campo.tipo === "data") {
      gravarValorCampoFormulario(dados, campo.coluna, inputDateParaPlanilha(input.value));
    } else if (campo.tipo === "moeda") {
      gravarValorCampoFormulario(dados, campo.coluna, valorMoedaGravar(input.value));
    } else {
      let v = input.value.trim();
      if (campo.uppercase) v = v.toLocaleUpperCase("pt-BR");
      gravarValorCampoFormulario(dados, campo.coluna, v);
    }
  });
  return Object.assign({}, dadosLancamentoSistemaAoSalvar(), dados);
}

function abrirNovo() {
  modoEdicao = null;
  itemEdicao = null;
  el.modalTitulo.textContent = "novo contrato";
  montarFormulario(null);
  modal.show();
}

function abrirEditar(item) {
  modoEdicao = item._linha;
  itemEdicao = item;
  el.modalTitulo.textContent = "editar contrato";
  montarFormulario(item);
  modal.show();
}

async function confirmarExcluir(item) {
  if (!(await AppConfirm.confirm("Excluir este registro?", { perigo: true, icon: "warning" }))) return;

  mostrarStatus("Excluindo...", "carregando");
  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "excluir",
      linha: item._linha,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json) return;
    mostrarStatus("Registro excluído.", "sucesso");
    await carregarContratos(true);
  } catch (e) {
    mostrarStatus("Erro ao excluir: " + e.message, "erro");
  }
}

function setSalvandoModal(ativo) {
  el.modalSalvando?.classList.toggle("d-none", !ativo);
  el.modalSalvando?.setAttribute("aria-hidden", ativo ? "false" : "true");
  if (el.btnSalvar) el.btnSalvar.disabled = ativo;
  if (el.btnCancelar) el.btnCancelar.disabled = ativo;
}

async function salvarFormulario(evento) {
  evento.preventDefault();
  const dados = lerFormulario();
  const acao = modoEdicao ? "atualizar" : "inserir";

  const campoCpf = resolverCamposFormulario().find((c) => c.tipo === "cpf");
  const cpfValor = campoCpf ? dados[chaveGravacao(campoCpf.coluna)] : "";
  const erroCpf = validarCpfFormulario(cpfValor, modoEdicao);
  if (erroCpf) {
    AppToast.show(erroCpf, "erro");
    document.getElementById("campo-cpf")?.focus();
    return;
  }

  const municipio = document.getElementById("campo-municipio")?.value?.trim() || "";
  const lideranca = document.getElementById("campo-coordenador")?.value?.trim() || "";
  const tipoContrato = document.getElementById("campo-tipo-contrato")?.value?.trim() || "";
  const valorContrato = document.getElementById("campo-valor-contrato")?.value ?? "";

  const previsaoSaldo = validarPrevisaoSaldoInclusaoContrato(
    municipio,
    lideranca,
    tipoContrato,
    valorContrato,
    modoEdicao
  );
  if (!previsaoSaldo.ok) {
    AppToast.show(previsaoSaldo.mensagem, "erro");
    return;
  }

  const alertasLimite = obterAlertasLimiteLideranca(municipio, lideranca);
  if (alertasLimite.length) {
    const msg =
      alertasLimite.join("\n") +
      "\n\ndeseja salvar o contrato mesmo assim?";
    if (!(await AppConfirm.confirm(msg, { icon: "warning" }))) return;
  }

  setSalvandoModal(true);

  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao,
      linha: modoEdicao,
      dados,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json) return;

    modal.hide();
    AppToast.show(
      modoEdicao ? "registro atualizado com sucesso" : "registro inserido com sucesso",
      "sucesso"
    );
    const linhaSalva =
      json.linha != null ? Number(json.linha) : modoEdicao ? Number(modoEdicao) : null;
    if (linhaSalva) linhaParaDestaqueSalvo = linhaSalva;
    await carregarContratos(true);
  } catch (e) {
    AppToast.show("Erro ao salvar: " + e.message, "erro");
  } finally {
    setSalvandoModal(false);
  }
}

function valorItem(item, col) {
  return col ? item[col.chave] : "";
}

function rotuloTabela(chave) {
  return (cfg.ROTULOS && cfg.ROTULOS[chave]) || chave;
}

function resolverColunas() {
  const idx = cfg.INDICES || {};
  colunaNome = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_NOME, idx.NOME);
  colunaNomeMae = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_NOME_MAE, idx.NOME_MAE);
  colunaCpf = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_CPF, idx.CPF);
  colunaCelular = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_CELULAR, idx.CELULAR);
  colunaDataNascimento = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_DATA_NASCIMENTO,
    idx.DATA_NASCIMENTO
  );
  colunaMunicipio = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_MUNICIPIO, idx.MUNICIPIO);
  colunaVinculo = PlanilhaApi.acharColuna(colunas, cfg.COLUNA_VINCULO, idx.VINCULO);
  colunaLancarSistema = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_LANCAR_SISTEMA,
    idx.LANCAMENTO_SISTEMA
  );
  colunaValorContrato = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_VALOR_CONTRATO,
    idx.VALOR_CONTRATO
  );
  colunaTipoContrato = PlanilhaApi.acharColuna(
    colunas,
    ["tipo-contrato", "tipo contrato", "tipo de contrato"],
    idx.TIPO_CONTRATO != null ? idx.TIPO_CONTRATO : 12
  );
  colunaAssinado = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_ASSINADO,
    idx.ASSINADO
  );
}

function itemLancarSistema(item) {
  return valorCheckboxSim(valorItem(item, colunaLancarSistema));
}

function itemAssinado(item) {
  return valorCheckboxSim(valorItem(item, colunaAssinado));
}

function itemImprimirContratoDesabilitado(item) {
  return itemAssinado(item);
}

function arquivoEContratoPdfColaborador(arquivo) {
  const nome = String(arquivo?.nome || "").trim().toLowerCase();
  if (!nome.endsWith(".pdf")) return false;
  return nome.indexOf("contrato-") === 0;
}

async function pastaColaboradorTemContratoPdf(linha) {
  if (!linha) return false;
  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "listar-arquivos-contrato",
      linha,
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json?.arquivos?.length) return false;
    return json.arquivos.some((arq) => arquivoEContratoPdfColaborador(arq));
  } catch (e) {
    console.warn("verificar contrato pdf:", e);
    return false;
  }
}

function htmlIconeAssinado(item) {
  const ok = itemAssinado(item);
  const classe = ok
    ? "contratos-icone-assinado contratos-icone-assinado--sim"
    : "contratos-icone-assinado contratos-icone-assinado--nao";
  const icone = ok ? ICONE_ASSINADO_SIM : ICONE_ASSINADO_NAO;
  const titulo = ok ? "assinado" : "não assinado";
  return `<span class="${classe}" title="${titulo}" aria-label="${titulo}">${icone}</span>`;
}

function exibirIconeLancamentoSistemaValor() {
  return cfg.EXIBIR_ICONE_LANCAMENTO_SISTEMA_VALOR !== false;
}

function htmlIconePagamento(item) {
  const noSistema = itemLancarSistema(item);
  const classe = noSistema
    ? "contratos-icone-pagamento contratos-icone-pagamento--banco"
    : "contratos-icone-pagamento contratos-icone-pagamento--moeda";
  const icone = noSistema ? ICONE_BANCO : ICONE_NAO_LANCAR_SISTEMA;
  return `<span class="${classe}" aria-hidden="true">${icone}</span>`;
}

function htmlCelulaValorContrato(item) {
  return (
    '<span class="contratos-valor-celula">' +
    `<span class="contratos-valor-texto">${formatarValorContratoExibir(valorItem(item, colunaValorContrato))}</span>` +
    (exibirIconeLancamentoSistemaValor() ? htmlIconePagamento(item) : "") +
    "</span>"
  );
}

function htmlMobileStackCabecalho() {
  const T = TabelaOrdenacao;
  return (
    '<div class="contratos-th-stack-head">' +
    `<span>${T.htmlCabecalhoOrdenavel(rotuloTabela("NOME"), "nome")}</span>` +
    `<span>${T.htmlCabecalhoOrdenavel(rotuloTabela("MUNICIPIO"), "municipio")}</span>` +
    `<span>${T.htmlCabecalhoOrdenavel(rotuloTabela("VINCULO"), "lideranca")}</span>` +
    `<span>${escapeHtml(rotuloTabela("CPF"))}</span>` +
    `<span>${escapeHtml(rotuloTabela("VALOR_CONTRATO"))}</span>` +
    "</div>"
  );
}

function htmlValorContratoMobileStack(item) {
  return (
    '<span class="contratos-stack-valor-linha">' +
    (exibirIconeLancamentoSistemaValor() ? htmlIconePagamento(item) : "") +
    `<span class="contratos-valor-texto">${formatarValorContratoExibir(valorItem(item, colunaValorContrato))}</span>` +
    "</span>"
  );
}

function htmlMobileStackCorpo(item) {
  return (
    '<div class="contratos-celula-stack">' +
    `<span class="contratos-stack-nome contratos-stack-nome--com-assinado">${htmlIconeAssinado(item)}<span>${exibirValor(valorItem(item, colunaNome))}</span></span>` +
    `<span class="contratos-stack-mun">${exibirValor(valorItem(item, colunaMunicipio))}</span>` +
    `<span class="contratos-stack-cpf">${exibirValor(valorItem(item, colunaCpf))}</span>` +
    htmlValorContratoMobileStack(item) +
    "</div>"
  );
}

function criarTh(texto, classes) {
  const th = document.createElement("th");
  th.scope = "col";
  th.className = classes || "";
  th.textContent = texto;
  return th;
}

function criarTdHtml(html, classes) {
  const td = document.createElement("td");
  td.className = classes || "";
  td.innerHTML = html;
  return td;
}

function htmlBotoesAcoes(item) {
  const imprimirOff = item && itemImprimirContratoDesabilitado(item);
  const imprimirCls =
    "crud-acao-icone crud-acao-icone--imprimir" +
    (imprimirOff ? " crud-acao-icone--desabilitado" : "");
  const imprimirTitulo = imprimirOff
    ? "contrato assinado — impressão desabilitada"
    : "imprimir contrato";
  const imprimirAttrs = imprimirOff ? " disabled aria-disabled=\"true\"" : "";

  return (
    '<div class="crud-acoes-icones">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--arquivos" data-acao="arquivos" aria-label="documentos" title="documentos">' +
    ICONE_ARQUIVOS +
    "</button>" +
    '<button type="button" class="' +
    imprimirCls +
    '" data-acao="imprimir" aria-label="imprimir contrato" title="' +
    escapeHtml(imprimirTitulo) +
    '"' +
    imprimirAttrs +
    ">" +
    ICONE_IMPRIMIR +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--editar" data-acao="editar" aria-label="editar" title="editar">' +
    ICONE_EDITAR +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--excluir" data-acao="excluir" aria-label="excluir" title="excluir">' +
    ICONE_EXCLUIR +
    "</button>" +
    "</div>"
  );
}

function htmlAcoesDesktop(item) {
  return htmlBotoesAcoes(item);
}

function htmlAcoesMobile(item) {
  return htmlBotoesAcoes(item);
}

function montarDadosImpressao(item) {
  const dados = {};
  colunas.forEach((col) => {
    const chave = col.chavePlanilha != null && String(col.chavePlanilha).trim() !== ""
      ? col.chavePlanilha
      : col.chave;
    dados[chave] = item[col.chave] != null ? item[col.chave] : "";
  });
  return dados;
}

async function imprimirContrato(item) {
  if (itemImprimirContratoDesabilitado(item)) return;

  mostrarStatus("", "carregando");

  try {
    const linha = item?._linha;
    if (linha) {
      const jaExiste = await pastaColaboradorTemContratoPdf(linha);
      if (jaExiste) {
        limparStatus();
        const confirmar = await AppConfirm.confirm(
          "já existe um contrato deste colaborador.\ndeseja gerar um novo?\no arquivo anterior será substituído.",
          {
            titulo: "contrato existente",
            icon: "warning",
            confirmar: "gerar novo",
            cancelar: "cancelar",
          }
        );
        if (!confirmar) return;
      }
    }

    mostrarStatus("", "carregando");

    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "imprimir-contrato",
      linha: item._linha,
      dados: montarDadosImpressao(item),
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json) return;
    const url = json.url;
    if (!url) throw new Error("PDF não gerado.");
    if (json.salvoNoDrive) {
      AppToast.show(
        "contrato salvo na pasta do colaborador no Drive (" + (json.nome || "PDF") + ")",
        "sucesso"
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.open(json.downloadUrl || url, "_blank", "noopener,noreferrer");
      AppToast.show("contrato gerado", "sucesso");
    }
  } catch (e) {
    AppToast.show("Erro ao gerar contrato: " + e.message, "erro");
  } finally {
    limparStatus();
  }
}

function vincularAcoes(container, item) {
  container.querySelector('[data-acao="arquivos"]')?.addEventListener("click", () => abrirModalArquivos(item));
  const btnImprimir = container.querySelector('[data-acao="imprimir"]');
  if (btnImprimir && !btnImprimir.disabled) {
    btnImprimir.addEventListener("click", () => imprimirContrato(item));
  }
  container.querySelector('[data-acao="editar"]')?.addEventListener("click", () => abrirEditar(item));
  container.querySelector('[data-acao="excluir"]')?.addEventListener("click", () => confirmarExcluir(item));
}

function montarCabecalhoTabela() {
  const trDesktop = el.cabecalhoDesktop;
  const trMobile = el.cabecalhoMobile;
  if (!trDesktop || !trMobile) return;

  trDesktop.innerHTML = "";
  trMobile.innerHTML = "";

  trDesktop.appendChild(
    TabelaOrdenacao.criarThOrdenavel(
      rotuloTabela("NOME"),
      "nome",
      "contratos-col-nome contratos-tabela-desktop-col"
    )
  );
  const thAssinado = criarTh(
    rotuloTabela("ASSINADO"),
    "contratos-col-assinado contratos-tabela-desktop-col text-center"
  );
  thAssinado.title = rotuloTabela("ASSINADO");
  trDesktop.appendChild(thAssinado);
  trDesktop.appendChild(criarTh(rotuloTabela("CPF"), "contratos-col-cpf contratos-tabela-desktop-col"));
  trDesktop.appendChild(
    TabelaOrdenacao.criarThOrdenavel(
      rotuloTabela("MUNICIPIO"),
      "municipio",
      "contratos-col-municipio contratos-tabela-desktop-col"
    )
  );
  trDesktop.appendChild(
    TabelaOrdenacao.criarThOrdenavel(
      rotuloTabela("VINCULO"),
      "lideranca",
      "contratos-col-vinculo contratos-tabela-desktop-col"
    )
  );
  trDesktop.appendChild(
    criarTh(
      rotuloTabela("VALOR_CONTRATO"),
      "contratos-col-valor contratos-tabela-desktop-col"
    )
  );
  trDesktop.appendChild(
    criarTh("ações", "crud-col-acoes contratos-col-acoes contratos-tabela-desktop-col")
  );

  const thStack = criarTh("", "contratos-col-stack contratos-tabela-mobile-col");
  thStack.innerHTML = htmlMobileStackCabecalho();
  trMobile.appendChild(thStack);

  trMobile.appendChild(
    criarTh("ações", "contratos-col-acoes contratos-tabela-mobile-col")
  );

  if (el.tabelaCard) {
    TabelaOrdenacao.atualizarUi(el.tabelaCard, ordenacaoContratos);
  }
}

function criarLinhaTabela(item) {
  const tr = document.createElement("tr");
  tr.dataset.linha = String(item._linha);

  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaNome)),
      "contratos-col-nome contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      htmlIconeAssinado(item),
      "contratos-col-assinado contratos-tabela-desktop-col text-center"
    )
  );
  tr.appendChild(
    criarTdHtml(exibirValor(valorItem(item, colunaCpf)), "contratos-col-cpf contratos-tabela-desktop-col")
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaMunicipio)),
      "contratos-col-municipio contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaVinculo)),
      "contratos-col-vinculo contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      htmlCelulaValorContrato(item),
      "contratos-col-valor contratos-tabela-desktop-col"
    )
  );

  const tdAcoesDesktop = criarTdHtml(
    htmlAcoesDesktop(item),
    "crud-col-acoes text-end text-nowrap contratos-col-acoes contratos-tabela-desktop-col"
  );
  vincularAcoes(tdAcoesDesktop, item);
  tr.appendChild(tdAcoesDesktop);

  const tdStack = criarTdHtml("", "contratos-col-stack contratos-tabela-mobile-col");
  tdStack.innerHTML = htmlMobileStackCorpo(item);
  tr.appendChild(tdStack);

  const tdAcoesMobile = criarTdHtml(
    htmlAcoesMobile(item),
    "text-end contratos-col-acoes contratos-tabela-mobile-col"
  );
  vincularAcoes(tdAcoesMobile, item);
  tr.appendChild(tdAcoesMobile);

  return tr;
}

function renderizarTabela(opcoes) {
  const opts = opcoes || {};
  const filtradas = linhasFiltradas();
  const total = filtradas.length;

  if (!opts.preservarPagina) {
    ajustarPaginaParaLinhaDestaque(filtradas);
  }
  ajustarPaginaTabela(total);

  el.corpo.innerHTML = "";

  if (!total) {
    paginaAtualTabela = 1;
    atualizarBarraPaginacao(0);
    el.vazio.hidden = false;
    el.vazio.textContent = termoBusca()
      ? "nenhum contrato encontrado para a busca."
      : "nenhum contrato encontrado.";
    linhaParaDestaqueSalvo = null;
    notificarAlturaFrame();
    return;
  }

  el.vazio.hidden = true;
  const tam = tamanhoPaginaTabela();
  const inicio = (paginaAtualTabela - 1) * tam;
  const paginaItens = filtradas.slice(inicio, inicio + tam);
  paginaItens.forEach((item) => {
    el.corpo.appendChild(criarLinhaTabela(item));
  });

  atualizarBarraPaginacao(total);
  notificarAlturaFrame();
  aplicarDestaqueLinhaSalva();
}

function aplicarDestaqueLinhaSalva() {
  const numLinha = linhaParaDestaqueSalvo;
  if (!numLinha || !el.corpo) return;
  linhaParaDestaqueSalvo = null;

  requestAnimationFrame(() => {
    const tr = el.corpo.querySelector(`tr[data-linha="${numLinha}"]`);
    if (!tr) return;

    tr.classList.add("contratos-linha-salva");
    window.setTimeout(() => tr.classList.remove("contratos-linha-salva"), 3100);
    tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
    notificarAlturaFrame();
  });
}

async function carregarContratos(silencioso) {
  if (!PlanilhaApi.configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  if (!silencioso) mostrarStatus("Carregando contratos...", "carregando");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const [dados, jsonMun, jsonAp] = await Promise.all([
      PlanilhaApi.ler(cfg.PLANILHA, cfg.ABA, cfg.LINHA_INICIO_DADOS),
      fetch(PlanilhaApi.urlGet(cfgMun.PLANILHA, cfgMun.ABA))
        .then((r) => r.json())
        .catch(() => null),
      fetch(PlanilhaApi.urlGet(cfgPessoal.PLANILHA_APOIADORES, cfgPessoal.ABA))
        .then((r) => r.json())
        .catch(() => null),
    ]);
    if (!dados) return;

    if (AUTH.tratarResposta(jsonMun) && jsonMun?.ok && jsonMun.valores) {
      listaMunicipiosForm = extrairListaMunicipios(jsonMun.valores);
    } else {
      listaMunicipiosForm = [];
    }

    if (AUTH.tratarResposta(jsonAp) && jsonAp?.ok && jsonAp.valores) {
      montarMapaLiderancasPorMunicipio(jsonAp.valores);
    } else {
      coordenadoresPorMunicipio = new Map();
    }

    colunas = dados.colunas;
    linhas = dados.linhas;
    resolverColunas();
    paginaAtualTabela = 1;

    montarCabecalhoTabela();
    renderizarTabela();
    if (!silencioso) limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  }
}

function init() {
  el = {
    tabelaCard: document.getElementById("tabelaCard"),
    busca: document.getElementById("buscaContrato"),
    cabecalhoDesktop: document.getElementById("cabecalhoDesktop"),
    cabecalhoMobile: document.getElementById("cabecalhoMobile"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
    paginacaoTabela: document.getElementById("paginacaoTabela"),
    paginacaoInfo: document.getElementById("paginacaoInfo"),
    paginacaoPaginaAtual: document.getElementById("paginacaoPaginaAtual"),
    paginacaoPrimeira: document.getElementById("paginacaoPrimeira"),
    paginacaoAnterior: document.getElementById("paginacaoAnterior"),
    paginacaoProxima: document.getElementById("paginacaoProxima"),
    paginacaoUltima: document.getElementById("paginacaoUltima"),
    btnNovo: document.getElementById("btnNovo"),
    form: document.getElementById("formContrato"),
    formCampos: document.getElementById("formCampos"),
    btnSalvar: document.getElementById("btnSalvar"),
    btnCancelar: document.getElementById("btnCancelar"),
    modalSalvando: document.getElementById("modalSalvando"),
    modalTitulo: document.getElementById("modalTitulo"),
    modalIcone: document.getElementById("modalIcone"),
    modalEl: document.getElementById("modalContrato"),
    modalArquivosEl: document.getElementById("modalArquivos"),
    modalArquivosEnviando: document.getElementById("modalArquivosEnviando"),
    modalArquivosEnviandoTexto: document.getElementById("modalArquivosEnviandoTexto"),
    modalArquivosTitulo: document.getElementById("modalArquivosTitulo"),
    modalArquivosIdent: document.getElementById("modalArquivosIdent"),
    modalArquivosCpf: document.getElementById("modalArquivosCpf"),
    modalArquivosMunicipio: document.getElementById("modalArquivosMunicipio"),
    contratosInputArquivos: document.getElementById("contratosInputArquivos"),
    contratosBtnEnviarArquivo: document.getElementById("contratosBtnEnviarArquivo"),
    contratosDocCarregando: document.getElementById("contratosDocCarregando"),
    contratosArquivosStatus: document.getElementById("contratosArquivosStatus"),
    contratosListaObrigatorios: document.getElementById("contratosListaObrigatorios"),
    contratosListaOpcionais: document.getElementById("contratosListaOpcionais"),
    contratosArquivosResumo: document.getElementById("contratosArquivosResumo"),
    contratosSelectTipoDocumento: document.getElementById("contratosSelectTipoDocumento"),
    tabDocObrigatoriosLabel: document.getElementById("tabDocObrigatoriosLabel"),
    tabDocOpcionaisLabel: document.getElementById("tabDocOpcionaisLabel"),
    btnArquivosFechar: document.getElementById("btnArquivosFechar"),
    btnArquivosFecharHeader: document.getElementById("btnArquivosFecharHeader"),
  };

  if (el.modalIcone && window.APP_ICON_SVG?.pessoal) {
    el.modalIcone.innerHTML = APP_ICON_SVG.pessoal;
  }

  modal = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  if (el.modalArquivosEl) {
    modalArquivos = bootstrap.Modal.getOrCreateInstance(el.modalArquivosEl);
  }
  el.contratosInputArquivos?.addEventListener("change", () =>
    enviarArquivosSelecionados(el.contratosInputArquivos)
  );
  el.btnArquivosFechar?.addEventListener("click", () => modalArquivos?.hide());
  el.busca?.addEventListener("input", () => {
    paginaAtualTabela = 1;
    renderizarTabela();
  });
  el.paginacaoPrimeira?.addEventListener("click", () => irParaPaginaTabela(1));
  el.paginacaoAnterior?.addEventListener("click", () => irParaPaginaTabela(paginaAtualTabela - 1));
  el.paginacaoProxima?.addEventListener("click", () => irParaPaginaTabela(paginaAtualTabela + 1));
  el.paginacaoUltima?.addEventListener("click", () => {
    irParaPaginaTabela(totalPaginasTabela(linhasFiltradas().length));
  });
  el.btnNovo?.addEventListener("click", abrirNovo);
  el.form?.addEventListener("submit", salvarFormulario);

  TabelaOrdenacao.vincular(
    el.tabelaCard,
    ordenacaoContratos,
    () => renderizarTabela({ preservarPagina: true }),
    "ordenacaoContratos"
  );

  window.atualizarPagina = () => carregarContratos(false);
  carregarContratos(false);
}

function htmlStackRelatorioCabecalho(linha1, linha2) {
  return (
    '<div class="contratos-rel-stack contratos-rel-stack--cab">' +
    `<div class="contratos-rel-stack-principal">${escapeHtml(linha1)}</div>` +
    `<div class="contratos-rel-stack-secundario">${escapeHtml(linha2)}</div>` +
    "</div>"
  );
}

function htmlStackRelatorioCorpo(linha1, linha2) {
  const p = String(linha1 ?? "").trim() || "—";
  const s = String(linha2 ?? "").trim();
  return (
    '<div class="contratos-rel-stack">' +
    `<div class="contratos-rel-stack-principal">${escapeHtml(p)}</div>` +
    (s
      ? `<div class="contratos-rel-stack-secundario">${escapeHtml(s)}</div>`
      : '<div class="contratos-rel-stack-secundario contratos-rel-stack-secundario--vazio">—</div>') +
    "</div>"
  );
}

function textoCelulaTabelaRelatorio(cel) {
  return (cel?.textContent || "").replace(/\s+/g, " ").trim();
}

function textoAssinadoRelatorio(tr, tdAss) {
  const linha = Number(tr?.dataset?.linha);
  if (linha) {
    const item = linhas.find((r) => r._linha === linha);
    if (item) return itemAssinado(item) ? "S" : "N";
  }
  if (tdAss?.querySelector(".contratos-icone-assinado--sim")) return "S";
  return "N";
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("contratos-tabela")) return;

  table.querySelectorAll(".contratos-thead-mobile").forEach((tr) => tr.remove());
  table
    .querySelectorAll(".contratos-col-nome-mae, .contratos-col-acoes, .crud-col-acoes")
    .forEach((el) => el.remove());

  table.querySelectorAll("thead tr").forEach((tr) => {
    tr.querySelector(".contratos-col-cpf")?.remove();
    tr.querySelector(".contratos-col-vinculo")?.remove();
    const thNome = tr.querySelector(".contratos-col-nome");
    const thMun = tr.querySelector(".contratos-col-municipio");
    const thAss = tr.querySelector(".contratos-col-assinado");
    if (thNome) {
      thNome.classList.add("contratos-rel-col-ident");
      thNome.textContent = rotuloTabela("NOME");
    }
    if (thMun) {
      thMun.classList.add("contratos-rel-col-mun-lider");
      thMun.innerHTML = htmlStackRelatorioCabecalho(
        rotuloTabela("MUNICIPIO"),
        rotuloTabela("VINCULO")
      );
    }
    if (thAss) {
      thAss.classList.add("contratos-rel-col-assinado", "text-center");
      thAss.textContent = rotuloTabela("ASSINADO");
    }
  });

  table.querySelectorAll("tbody tr").forEach((tr) => {
    const tdNome = tr.querySelector(".contratos-col-nome");
    const tdCpf = tr.querySelector(".contratos-col-cpf");
    const tdAss = tr.querySelector(".contratos-col-assinado");
    const tdMun = tr.querySelector(".contratos-col-municipio");
    const tdVin = tr.querySelector(".contratos-col-vinculo");
    if (!tdNome) return;

    const nome = textoCelulaTabelaRelatorio(tdNome);
    const cpf = textoCelulaTabelaRelatorio(tdCpf);
    const mun = textoCelulaTabelaRelatorio(tdMun);
    const lid = textoCelulaTabelaRelatorio(tdVin);

    tdCpf?.remove();
    tdVin?.remove();

    tdNome.classList.add("contratos-rel-col-ident");
    tdNome.innerHTML = htmlStackRelatorioCorpo(nome, cpf);
    if (tdMun) {
      tdMun.classList.add("contratos-rel-col-mun-lider");
      tdMun.innerHTML = htmlStackRelatorioCorpo(mun, lid);
    }
    if (tdAss) {
      tdAss.classList.add("contratos-rel-col-assinado", "text-center");
      tdAss.textContent = textoAssinadoRelatorio(tr, tdAss);
    }
  });

  const ordem = [
    "contratos-col-nome",
    "contratos-col-municipio",
    "contratos-col-assinado",
    "contratos-col-valor",
  ];

  const reordenarLinha = (tr) => {
    ordem.forEach((cls) => {
      const cel = tr.querySelector(`:scope > .${cls}`);
      if (cel) tr.appendChild(cel);
    });
  };

  table.querySelectorAll("thead tr, tbody tr").forEach(reordenarLinha);
}

window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function estilosRelatorioPagina() {
  const tbl = "table.rel-tabela.contratos-tabela";
  return (
    `.rel-body ${tbl}{table-layout:fixed;width:100%;}` +
    `.rel-body ${tbl} th.contratos-rel-col-ident,` +
    `.rel-body ${tbl} td.contratos-rel-col-ident{width:38%;text-align:left;}` +
    `.rel-body ${tbl} th.contratos-rel-col-mun-lider,` +
    `.rel-body ${tbl} td.contratos-rel-col-mun-lider{width:30%;text-align:left;}` +
    `.rel-body ${tbl} th.contratos-rel-col-assinado,` +
    `.rel-body ${tbl} td.contratos-rel-col-assinado{width:8%;text-align:center;font-weight:600;}` +
    `.rel-body ${tbl} th.contratos-col-valor,` +
    `.rel-body ${tbl} td.contratos-col-valor{width:24%;text-align:right;}` +
    `.rel-body ${tbl} .contratos-rel-stack{display:block;line-height:1.3;}` +
    `.rel-body ${tbl} .contratos-rel-stack-principal{font-weight:600;color:#1e293b;}` +
    `.rel-body ${tbl} .contratos-rel-stack--cab .contratos-rel-stack-principal{font-size:inherit;}` +
    `.rel-body ${tbl} .contratos-rel-stack-secundario{margin-top:0.12rem;font-size:8pt;color:#64748b;font-weight:400;}` +
    `.rel-body ${tbl} .contratos-rel-stack--cab .contratos-rel-stack-secundario{font-size:7.5pt;text-transform:lowercase;}` +
    `.rel-body ${tbl} .contratos-valor-celula{justify-content:flex-end;}` +
    `.rel-body ${tbl} .contratos-rel-num{font-variant-numeric:tabular-nums;white-space:nowrap;}`
  );
}

window.estilosRelatorioPagina = estilosRelatorioPagina;

function montarHtmlRelatorioGeral() {
  if (!window.Relatorio?.montarHtml) return null;
  return window.Relatorio.montarHtml({ documento: document });
}

function textoCampoTxtRelatorio(valor) {
  return String(valor ?? "")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .trim();
}

function formatarDataTxtRelatorio(valor) {
  const iso = planilhaDataParaInputDate(valor);
  return iso ? inputDateParaPlanilha(iso) : textoCampoTxtRelatorio(valor);
}

const TXT_CLICKSIGN_LARGURAS = {
  NOME: 50,
  CPF: 14,
  DATA_NASCIMENTO: 10,
  CELULAR: 15,
  ESPACO_COLUNAS: 2,
};

function colunaTxtAlinhada(valor, largura) {
  const s = textoCampoTxtRelatorio(valor);
  if (s.length > largura) return s.slice(0, largura);
  return s.padEnd(largura, " ");
}

function linhaTxtRelatorioClicksign(nome, cpf, nasc, cel) {
  const gap = " ".repeat(TXT_CLICKSIGN_LARGURAS.ESPACO_COLUNAS);
  return (
    colunaTxtAlinhada(nome, TXT_CLICKSIGN_LARGURAS.NOME) +
    gap +
    colunaTxtAlinhada(cpf, TXT_CLICKSIGN_LARGURAS.CPF) +
    gap +
    colunaTxtAlinhada(nasc, TXT_CLICKSIGN_LARGURAS.DATA_NASCIMENTO) +
    gap +
    colunaTxtAlinhada(cel, TXT_CLICKSIGN_LARGURAS.CELULAR)
  );
}

function montarTxtRelatorioDadosCadastro() {
  const items = linhasFiltradas();
  if (!items.length) return null;

  const header = linhaTxtRelatorioClicksign("nome", "CPF", "data-nascimento", "celular");
  const linhasTxt = items.map((item) => {
    const nome = valorItem(item, colunaNome);
    const cpf = formatarCpf(valorItem(item, colunaCpf));
    const nasc = formatarDataTxtRelatorio(valorItem(item, colunaDataNascimento));
    const cel = formatarCelular(valorItem(item, colunaCelular));
    return linhaTxtRelatorioClicksign(nome, cpf, nasc, cel);
  });

  return header + "\n" + linhasTxt.join("\n");
}

function nomeArquivoTxtRelatorioClicksign() {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const d = String(hoje.getDate()).padStart(2, "0");
  return `contatos-clicksign-${y}${m}${d}.txt`;
}

function baixarArquivoTexto(conteudo, nomeArquivo) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

async function executarRelatorioPagina(opcoes) {
  const opcao = opcoes?.opcao;

  if (opcao === "clicksign") {
    const conteudo = montarTxtRelatorioDadosCadastro();
    if (!conteudo) {
      return { tipo: "erro", mensagem: "nenhum dado para exportar." };
    }
    baixarArquivoTexto(conteudo, nomeArquivoTxtRelatorioClicksign());
    AppToast.show("arquivo TXT para Clicksign gerado.", "sucesso");
    return { tipo: "txt" };
  }

  const html = montarHtmlRelatorioGeral();
  if (!html) {
    return { tipo: "erro", mensagem: "nenhum dado para imprimir." };
  }
  return { tipo: "html", html };
}

window.montarHtmlRelatorioPagina = montarHtmlRelatorioGeral;
window.executarRelatorioPagina = executarRelatorioPagina;

window.gerarRelatorioPagina = async function gerarRelatorioPagina(opcoes) {
  if (opcoes && opcoes.apenasHtml) {
    return montarHtmlRelatorioGeral();
  }
  if (opcoes?.opcao) {
    const resultado = await executarRelatorioPagina(opcoes);
    if (resultado?.tipo === "html") return resultado.html;
    return false;
  }
  return montarHtmlRelatorioGeral();
};

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
