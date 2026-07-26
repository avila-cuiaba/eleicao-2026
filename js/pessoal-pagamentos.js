// Página pessoal — pagamentos (mesma planilha de contratos; tabela diferente).

const cfg = CONFIG.PESSOAL_PAGAMENTOS;
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
const ICONE_RELATORIO =
  (typeof APP_ICON_SVG !== "undefined" && APP_ICON_SVG.relatorio) || ICONE_IMPRIMIR;
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
const ICONE_PAGAMENTO_DIRETO_REL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M11 11V6a2 2 0 0 1 4 0v1"/>' +
  '<path d="M9 11V7a2 2 0 0 1 4 0v4"/>' +
  '<path d="M7 14l-1 5h12l-1-5H7z"/>' +
  '<circle cx="12" cy="17" r="1.25" fill="currentColor" stroke="none"/>' +
  "</svg>";
const ICONE_CADEADO_ABERTO =
  '<i class="fa-solid fa-lock-open" aria-hidden="true"></i>';
const ICONE_CADEADO_FECHADO =
  '<i class="fa-solid fa-lock" aria-hidden="true"></i>';

let el = {};
let colunas = [];
let linhas = [];
let modal = null;
let modoEdicao = null;
let itemEdicao = null;
let colunaNome = null;
let colunaNomeMae = null;
let colunaCpf = null;
let colunaMunicipio = null;
let colunaVinculo = null;
let colunaLancarSistema = null;
let colunaValorContrato = null;
let colunaSaldoContrato = null;
let colunaChavePix = null;
let colunaAssinado = null;
let parcelasRelatorioOV = [];
let listaMunicipiosForm = [];
let coordenadoresPorMunicipio = new Map();
let cacheValoresReferenciaContrato = null;
let promessaValoresReferenciaContrato = null;
let linhaParaDestaqueSalvo = null;
let camposDesbloqueadosFormulario = new Set();
let linhasSelecionadasModal = new Set();
let valorPixModalPorLinha = new Map();
let modalSelecao = null;
let modalLancarPix = null;
let linhasLotePix = [];
let colunasLotePix = [];
let colunaLoteId = null;
let colunaLoteData = null;
let colunaLoteColaborador = null;
let colunaLoteCpf = null;
let colunaLoteValor = null;
let colunaLoteContador = null;
let colunaLoteLancado = null;
let linhasSelecionadasLancarModal = new Set();
let paginaAtualTabela = 1;

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

function campoEstaBloqueado(campo) {
  if (campo.desabilitadoPermanente) return true;
  if (campo.edicaoComConfirmacao && !camposDesbloqueadosFormulario.has(campo.id)) return true;
  return false;
}

function campoIncluirNoSalvar(campo) {
  if (campo.somenteLeitura) return false;
  if (campo.desabilitadoPermanente) return false;
  if (campo.edicaoComConfirmacao && !camposDesbloqueadosFormulario.has(campo.id)) return false;
  return true;
}

function mensagemConfirmarEdicaoCampo(campo) {
  return `Tem certeza de que deseja editar o campo "${campo.rotulo}"?`;
}

function controleCampoFormulario(campoId) {
  return document.getElementById("campo-" + campoId);
}

function atualizarBotaoCadeadoCampo(btn, desbloqueado, rotulo) {
  if (!btn) return;
  btn.innerHTML = desbloqueado ? ICONE_CADEADO_ABERTO : ICONE_CADEADO_FECHADO;
  btn.title = desbloqueado ? "bloquear" : "desbloquear";
  btn.setAttribute(
    "aria-label",
    desbloqueado ? `Bloquear ${rotulo}` : `Desbloquear ${rotulo}`
  );
  btn.classList.toggle("contratos-btn-cadeado-campo--aberto", desbloqueado);
  btn.classList.toggle("contratos-btn-cadeado-campo--fechado", !desbloqueado);
}

async function alternarBloqueioCampoFormulario(campo) {
  if (!campo?.edicaoComConfirmacao) return;

  const desbloqueado = camposDesbloqueadosFormulario.has(campo.id);
  const wrap = el.formCampos?.querySelector(`[data-campo-form="${campo.id}"]`);
  const btn = wrap?.querySelector(".contratos-btn-cadeado-campo");
  const input = controleCampoFormulario(campo.id);

  if (!desbloqueado) {
    if (!(await AppConfirm.confirm(mensagemConfirmarEdicaoCampo(campo)))) return;
    camposDesbloqueadosFormulario.add(campo.id);
    if (input) input.disabled = false;
    wrap?.classList.add("contratos-campo-form--desbloqueado");
    if (campo.id === "tipo-contrato") vincularSugestaoValorContrato();
  } else {
    camposDesbloqueadosFormulario.delete(campo.id);
    if (input) input.disabled = true;
    wrap?.classList.remove("contratos-campo-form--desbloqueado");
  }

  atualizarBotaoCadeadoCampo(btn, camposDesbloqueadosFormulario.has(campo.id), campo.rotulo);
}

function vincularFormatacaoMoedaInput(input) {
  if (!input || input.dataset.moedaFormatada === "1") return;
  input.dataset.moedaFormatada = "1";
  input.placeholder = "0,00";
  input.addEventListener("blur", () => {
    const formatado = valorMoedaGravar(input.value);
    input.value = formatado || "";
  });
}

function envolverCampoFormulario(campo, conteudo) {
  if (!campo.edicaoComConfirmacao) return conteudo;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "btn btn-sm btn-link contratos-btn-cadeado-campo contratos-btn-cadeado-campo--fechado";
  atualizarBotaoCadeadoCampo(btn, false, campo.rotulo);
  btn.addEventListener("click", () => alternarBloqueioCampoFormulario(campo));

  const linha = document.createElement("div");
  linha.className = "contratos-campo-controle-linha";

  const check = conteudo.querySelector(".form-check.contratos-form-check");
  const control = conteudo.querySelector("input.form-control, select.form-select");

  if (check) {
    check.remove();
    linha.appendChild(check);
    linha.appendChild(btn);
    conteudo.appendChild(linha);
  } else if (control) {
    control.remove();
    linha.appendChild(control);
    linha.appendChild(btn);
    const label = conteudo.querySelector("label");
    if (label) label.insertAdjacentElement("afterend", linha);
    else conteudo.appendChild(linha);
  } else {
    conteudo.appendChild(btn);
  }

  conteudo.classList.add("contratos-campo-form", "contratos-campo-form--bloqueado");
  conteudo.dataset.campoForm = campo.id;
  return conteudo;
}

function aplicarBloqueioNoControle(campo, controle) {
  if (!controle || !campoEstaBloqueado(campo)) return;
  controle.disabled = true;
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
  return escapeHtml(valorMoedaGravar(n));
}

function valorMoedaGravar(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return "";
  const n = numeroMoeda(s);
  if (n == null) return s;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function totaisContratosVazios() {
  return { totalContratos: 0, totalPago: 0, totalSaldo: 0 };
}

function acumularTotaisContrato(bucket, valorContrato, saldoContrato) {
  const v = valorContrato;
  const s = saldoContrato;
  if (v != null) bucket.totalContratos += v;
  if (s != null) bucket.totalSaldo += s;
  if (v != null && s != null) bucket.totalPago += Math.max(0, v - s);
}

function totaisContratosPagamentos(lista) {
  const out = Object.assign(totaisContratosVazios(), {
    pix: totaisContratosVazios(),
    direto: totaisContratosVazios(),
  });
  for (const item of lista) {
    const v = numeroMoeda(valorItem(item, colunaValorContrato));
    const s = numeroMoeda(valorItem(item, colunaSaldoContrato));
    acumularTotaisContrato(out, v, s);
    acumularTotaisContrato(itemPagamentoPix(item) ? out.pix : out.direto, v, s);
  }
  return out;
}

function rotuloFiltroFormaPagamento(valor) {
  if (valor === "pix") return "conta (lançamento no sistema)";
  if (valor === "direto") return "direto (pagamento manual)";
  return "todos";
}

function obterFiltroFormaPagamento() {
  const checked = document.querySelector('input[name="filtroFormaPagamento"]:checked');
  const v = checked?.value || "todos";
  return v === "pix" || v === "direto" ? v : "todos";
}

function itemPagamentoPix(item) {
  return itemLancarSistema(item);
}

function aplicarFiltroFormaPagamento(lista) {
  const f = obterFiltroFormaPagamento();
  if (f === "pix") return lista.filter(itemPagamentoPix);
  if (f === "direto") return lista.filter((item) => !itemPagamentoPix(item));
  return lista;
}

function definirTextoResumo(elRef, valor) {
  if (elRef) elRef.textContent = valorMoedaGravar(valor) || "0,00";
}

function atualizarResumoContratosToolbar() {
  const totais = totaisContratosPagamentos(linhasParaResumoToolbar());
  definirTextoResumo(el.resumoToolbarTotalContratos, totais.totalContratos);
  definirTextoResumo(el.resumoToolbarValorPago, totais.totalPago);
  definirTextoResumo(el.resumoToolbarSaldoContratos, totais.totalSaldo);
  definirTextoResumo(el.resumoToolbarTotalContratosPix, totais.pix.totalContratos);
  definirTextoResumo(el.resumoToolbarTotalContratosDireto, totais.direto.totalContratos);
  definirTextoResumo(el.resumoToolbarValorPagoPix, totais.pix.totalPago);
  definirTextoResumo(el.resumoToolbarValorPagoDireto, totais.direto.totalPago);
  definirTextoResumo(el.resumoToolbarSaldoContratosPix, totais.pix.totalSaldo);
  definirTextoResumo(el.resumoToolbarSaldoContratosDireto, totais.direto.totalSaldo);
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

function linhasAposBusca() {
  return aplicarBusca(linhas.slice());
}

/** Totais do card: todos os registros (só respeita a busca), sem filtro conta/direto. */
function linhasParaResumoToolbar() {
  return ordenarLinhasPorNome(linhasAposBusca());
}

function linhasFiltradas() {
  return ordenarLinhasPorNome(aplicarFiltroFormaPagamento(linhasAposBusca()));
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

function montarMapaLiderancasPorMunicipio(valoresApoiadores) {
  coordenadoresPorMunicipio = new Map();
  if (!valoresApoiadores?.length) return;

  const cab = valoresApoiadores[0] || [];
  const idxLider = indiceColunaApoiadores(
    cab,
    ["lideranca", "liderança"],
    cfgAp.COLUNAS.LIDERANCA
  );
  const idxMun = indiceColunaApoiadores(
    cab,
    ["municipio", "município"],
    cfgAp.COLUNAS.MUNICIPIO
  );

  for (let linha = cfgAp.LINHA_INICIO_DADOS; linha <= valoresApoiadores.length; linha++) {
    const lideranca = String(celula(valoresApoiadores, linha, idxLider) ?? "").trim();
    const municipio = String(celula(valoresApoiadores, linha, idxMun) ?? "").trim();
    if (!lideranca || !municipio) continue;

    const munNorm = PlanilhaApi.normalizarChave(municipio);
    if (!coordenadoresPorMunicipio.has(munNorm)) {
      coordenadoresPorMunicipio.set(munNorm, new Map());
    }
    const mapaLider = coordenadoresPorMunicipio.get(munNorm);
    const lidNorm = PlanilhaApi.normalizarChave(lideranca);
    if (!mapaLider.has(lidNorm)) mapaLider.set(lidNorm, lideranca);
  }
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

function vincularSugestaoValorContrato() {
  const selTipo = document.getElementById("campo-tipo-contrato");
  const inputValor = document.getElementById("campo-valor-contrato");
  if (!selTipo || !inputValor) return;

  if (selTipo._contratosMudouTipo) {
    selTipo.removeEventListener("change", selTipo._contratosMudouTipo);
  }

  selTipo._contratosMudouTipo = async () => {
    const tipo = selTipo.value.trim();
    if (!tipo) return;
    if (PlanilhaApi.normalizarChave(tipo) === PlanilhaApi.normalizarChave("apoiador customizado")) {
      return;
    }
    const valores = await obterValoresReferenciaContrato();
    if (!valores) return;
    const sugerido = valorReferenciaContrato(tipo, valores);
    if (sugerido === "" || sugerido == null) return;
    aplicarValorSugeridoContrato(sugerido);
  };

  selTipo.addEventListener("change", selTipo._contratosMudouTipo);
}

function vincularFiltroCoordenador(dados) {
  const selMun = document.getElementById("campo-municipio");
  if (!selMun) return;

  const valorCoord =
    dados && colunaVinculo ? String(dados[colunaVinculo.chave] ?? "").trim() : "";

  if (selMun._contratosMudouMun) {
    selMun.removeEventListener("change", selMun._contratosMudouMun);
  }
  selMun._contratosMudouMun = () => repopularSelectCoordenador("", true);
  selMun.addEventListener("change", selMun._contratosMudouMun);

  repopularSelectCoordenador(valorCoord, false);
}

function resolverCamposFormulario() {
  return (cfg.CAMPOS_FORMULARIO || [])
    .map((campo) => ({
      ...campo,
      coluna: PlanilhaApi.acharColuna(colunas, campo.aliases, campo.indice),
    }))
    .filter((campo) => campo.coluna);
}

function chaveGravacao(coluna) {
  if (!coluna) return "";
  const planilha = coluna.chavePlanilha != null ? String(coluna.chavePlanilha) : "";
  return planilha.trim() !== "" ? planilha : coluna.chave;
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

function criarCampoTexto(campo, dados, attrs) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? dados[campo.coluna.chave] : "";
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<input type="text" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}" value="${escapeHtml(String(valor ?? ""))}" autocomplete="off"${attrs || ""}>`;
  aplicarBloqueioNoControle(campo, wrap.querySelector("input"));
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

function criarCampoMoeda(campo, dados) {
  const valor = dados && campo.coluna ? dados[campo.coluna.chave] : "";
  const exibicao = valorMoedaGravar(valor) || String(valor ?? "").trim();
  const dadosExibicao = dados ? { ...dados } : {};
  if (campo.coluna) dadosExibicao[campo.coluna.chave] = exibicao;
  const wrap = criarCampoTexto(campo, dadosExibicao, ' inputmode="decimal"');
  vincularFormatacaoMoedaInput(wrap.querySelector("input"));
  return wrap;
}

function criarCampoSomenteLeitura(campo, dados) {
  const id = "campo-" + campo.id;
  let valorHtml;
  if (campo.tipo === "cpf") {
    const bruto = dados && campo.coluna ? dados[campo.coluna.chave] : "";
    const fmt = formatarCpf(bruto);
    valorHtml = fmt ? escapeHtml(fmt) : '<span class="text-muted">—</span>';
  } else {
    const s = dados && campo.coluna ? String(dados[campo.coluna.chave] ?? "").trim() : "";
    valorHtml = s ? escapeHtml(s) : '<span class="text-muted">—</span>';
  }
  const wrap = document.createElement("div");
  wrap.className = "mb-1 contratos-campo-somente-leitura";
  wrap.innerHTML =
    `<div class="${classeRotulo(campo)}">${escapeHtml(campo.rotulo)}</div>` +
    `<div class="contratos-campo-leitura-valor" id="${id}" aria-readonly="true">${valorHtml}</div>`;
  return wrap;
}

function criarCampoData(campo, dados) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? planilhaDataParaInputDate(dados[campo.coluna.chave]) : "";
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<input type="date" class="form-control form-control-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}" value="${escapeHtml(valor)}" autocomplete="off">`;
  aplicarBloqueioNoControle(campo, wrap.querySelector("input"));
  return wrap;
}

function criarCampoSelect(campo, dados, opcoes) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? String(dados[campo.coluna.chave] ?? "").trim() : "";
  const placeholder =
    campo.origem === "liderancas" && !municipioSelecionadoNoForm(dados)
      ? "selecione o município primeiro"
      : "selecione...";
  const optionsHtml = htmlOpcoesSelect(opcoes, valor, placeholder);
  const desabilitadoLideranca =
    campo.origem === "liderancas" && !municipioSelecionadoNoForm(dados);
  const desabilitado = desabilitadoLideranca || campoEstaBloqueado(campo);

  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<label class="${classeRotulo(campo)}" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `<select class="form-select form-select-sm" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}"${desabilitado ? " disabled" : ""}>${optionsHtml}</select>`;
  return wrap;
}

function criarCampoCheckbox(campo, dados) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? dados[campo.coluna.chave] : "";
  const marcado = valorCheckboxSim(valor);
  const desabilitado = campoEstaBloqueado(campo);
  const wrap = document.createElement("div");
  wrap.className = "mb-1";
  wrap.innerHTML =
    `<div class="form-check contratos-form-check">` +
    `<input type="checkbox" class="form-check-input" id="${id}" name="${escapeHtml(chaveGravacao(campo.coluna))}"${marcado ? " checked" : ""}${desabilitado ? " disabled" : ""}>` +
    `<label class="form-check-label" for="${id}">${escapeHtml(campo.rotulo)}</label>` +
    `</div>`;
  return wrap;
}

function montarNoCampo(campo, dados) {
  let no;
  if (campo.somenteLeitura) {
    no = criarCampoSomenteLeitura(campo, dados);
  } else if (campo.tipo === "checkbox") {
    no = criarCampoCheckbox(campo, dados);
  } else if (campo.tipo === "cpf") {
    no = criarCampoCpf(campo, dados);
  } else if (campo.tipo === "moeda") {
    no = criarCampoMoeda(campo, dados);
  } else if (campo.tipo === "data") {
    no = criarCampoData(campo, dados);
  } else if (campo.tipo === "select") {
    no = criarCampoSelect(campo, dados, opcoesCampoSelect(campo, dados));
  } else {
    no = criarCampoTexto(campo, dados);
  }

  if (!campo.somenteLeitura && campo.edicaoComConfirmacao) {
    return envolverCampoFormulario(campo, no);
  }
  return no;
}

function classeColunaFormulario(campo, camposNoGrupo) {
  const largura = campo.largura || 12;
  const grupoPar =
    camposNoGrupo.length === 2 && camposNoGrupo.every((c) => (c.largura || 12) <= 8);
  if (grupoPar) {
    return `col-6 col-md-${largura}`;
  }
  if (largura >= 12) return "col-12";
  return `col-12 col-md-${largura}`;
}

function montarFormulario(dados) {
  el.formCampos.innerHTML = "";
  camposDesbloqueadosFormulario = new Set();
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
    row.className = "row g-2 mb-2";
    grupos.get(chaveGrupo).forEach((campo) => {
      const col = document.createElement("div");
      const camposNoGrupo = grupos.get(chaveGrupo);
      col.className = classeColunaFormulario(campo, camposNoGrupo);

      col.appendChild(montarNoCampo(campo, dados));

      row.appendChild(col);
    });
    el.formCampos.appendChild(row);
  });

  const temCoordenador = campos.some((c) => c.id === "coordenador");
  if (temCoordenador) vincularFiltroCoordenador(dados);
  const temTipoContrato = campos.some((c) => c.id === "tipo-contrato");
  if (temTipoContrato && camposDesbloqueadosFormulario.has("tipo-contrato")) {
    vincularSugestaoValorContrato();
    obterValoresReferenciaContrato();
  }
}

function dadosCamposSomenteLeituraEdicao() {
  const extras = {};
  if (!itemEdicao || !modoEdicao) return extras;
  resolverCamposFormulario().forEach((campo) => {
    if (!campo.somenteLeitura || !campo.coluna) return;
    const chave = chaveGravacao(campo.coluna);
    let val = itemEdicao[campo.coluna.chave];
    if (val == null || String(val).trim() === "") return;
    if (campo.tipo === "cpf") extras[chave] = formatarCpf(val);
    else extras[chave] = String(val).trim();
  });
  return extras;
}

function lerFormulario() {
  const dados = {};
  resolverCamposFormulario().forEach((campo) => {
    if (!campoIncluirNoSalvar(campo)) return;
    const chave = chaveGravacao(campo.coluna);
    const input = document.getElementById("campo-" + campo.id);
    if (!input) return;

    if (campo.tipo === "checkbox") {
      dados[chave] = valorCheckboxGravar(campo, input.checked);
    } else if (campo.tipo === "cpf") {
      dados[chave] = formatarCpf(input.value);
    } else if (campo.tipo === "moeda") {
      dados[chave] = valorMoedaGravar(input.value);
    } else if (campo.tipo === "data") {
      dados[chave] = inputDateParaPlanilha(input.value);
    } else {
      dados[chave] = input.value.trim();
    }
  });
  return Object.assign({}, dadosCamposSomenteLeituraEdicao(), dados);
}

function abrirNovo() {
  if (cfg.SOMENTE_EDICAO) return;
  modoEdicao = null;
  itemEdicao = null;
  el.modalTitulo.textContent = "novo contrato";
  montarFormulario(null);
  modal.show();
}

function abrirEditar(item) {
  modoEdicao = item._linha;
  itemEdicao = item;
  el.modalTitulo.textContent = "editar pagamento";
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
      origem: "pessoal-pagamentos",
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
  if (cfg.SOMENTE_EDICAO && !modoEdicao) {
    AppToast.show("selecione um registro na tabela para editar.", "erro");
    return;
  }
  const dados = lerFormulario();
  const acao = modoEdicao ? "atualizar" : "inserir";

  const campoCpf = resolverCamposFormulario().find((c) => c.tipo === "cpf");
  let cpfValor = "";
  if (campoCpf?.coluna) {
    if (campoCpf.somenteLeitura && itemEdicao) {
      cpfValor = itemEdicao[campoCpf.coluna.chave];
    } else {
      cpfValor = dados[chaveGravacao(campoCpf.coluna)];
    }
  }
  const erroCpf = validarCpfFormulario(cpfValor, modoEdicao);
  if (erroCpf) {
    AppToast.show(erroCpf, "erro");
    if (!campoCpf?.somenteLeitura) document.getElementById("campo-cpf")?.focus();
    return;
  }

  setSalvandoModal(true);

  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao,
      linha: modoEdicao,
      dados,
      aba: cfg.ABA,
      origem: "pessoal-pagamentos",
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
    AppToast.show(PlanilhaApi.mensagemErro(e), "erro");
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
  colunaSaldoContrato = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_SALDO_CONTRATO,
    idx.SALDO_CONTRATO
  );
  colunaChavePix = PlanilhaApi.acharColuna(
    colunas,
    ["chave-pix", "chave pix", "pix"],
    cfg.INDICES && cfg.INDICES.CHAVE_PIX != null ? cfg.INDICES.CHAVE_PIX : null
  );
  colunaAssinado = PlanilhaApi.acharColuna(
    colunas,
    cfg.COLUNA_ASSINADO,
    idx.ASSINADO
  );
  resolverColunasOVRelatorio();
}

function itemAssinado(item) {
  return valorCheckboxSim(valorItem(item, colunaAssinado));
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

function resolverColunasOVRelatorio() {
  const defs = cfg.PARCELAS_COLUNAS_O_V || [];
  parcelasRelatorioOV = defs.map((def) => ({
    n: def.n,
    colPgto: PlanilhaApi.acharColuna(colunas, def.pgtoAliases, def.pgto),
    colData: PlanilhaApi.acharColuna(colunas, def.dataAliases, def.data),
  }));
}

function valorDataRelatorioItem(item, col) {
  if (!col) return "—";
  const bruto = valorItem(item, col);
  if (bruto == null || String(bruto).trim() === "") return "—";
  const iso = planilhaDataParaInputDate(bruto);
  return iso ? inputDateParaPlanilha(iso) : String(bruto).trim();
}

function valorMoedaRelatorioItem(item, col) {
  if (!col) return "—";
  return textoMoedaRelatorio(valorItem(item, col));
}

function htmlCardParcelaRelatorioIndividual(parcela, item) {
  const valor = valorMoedaRelatorioItem(item, parcela.colPgto);
  const data = valorDataRelatorioItem(item, parcela.colData);
  return (
    '<div class="pagamentos-rel-parcela-card">' +
    `<div class="pagamentos-rel-parcela-titulo">pagamento ${parcela.n}</div>` +
    `<div class="pagamentos-rel-parcela-valor pagamentos-rel-num">${escapeHtml(valor)}</div>` +
    '<div class="pagamentos-rel-parcela-rotulo-data">data pagamento</div>' +
    `<div class="pagamentos-rel-parcela-data">${escapeHtml(data)}</div>` +
    "</div>"
  );
}

function htmlSecaoColunasOVRelatorioIndividual(item) {
  if (!parcelasRelatorioOV.length) return "";
  const cards = parcelasRelatorioOV
    .map((parcela) => htmlCardParcelaRelatorioIndividual(parcela, item))
    .join("");
  return (
    '<section class="rel-secao pagamentos-rel-secao-parcelas"><h2>parcelas</h2>' +
    '<div class="pagamentos-rel-parcelas-grid">' +
    cards +
    "</div></section>"
  );
}

function textoMoedaExibir(val) {
  const n = numeroMoeda(val);
  if (n == null) {
    const s = String(val ?? "").trim();
    return s || "";
  }
  return valorMoedaGravar(n);
}

function htmlCelulaModalDupla(linha1, linha2, opcoes) {
  const opts = opcoes || {};
  const l1 = String(linha1 ?? "").trim();
  const l2 = String(linha2 ?? "").trim();
  const cls2 = opts.linha2Muted ? "pagamentos-selecao-linha2 text-muted" : "pagamentos-selecao-linha2";
  return (
    '<div class="pagamentos-selecao-celula">' +
    `<span class="pagamentos-selecao-linha1">${l1 ? escapeHtml(l1) : '<span class="text-muted">—</span>'}</span>` +
    `<span class="${cls2}">${l2 ? escapeHtml(l2) : '<span class="text-muted">—</span>'}</span>` +
    "</div>"
  );
}

function ordenarLinhasPorNome(lista) {
  return lista.slice().sort((a, b) => {
    const na = String(valorItem(a, colunaNome) ?? "").trim();
    const nb = String(valorItem(b, colunaNome) ?? "").trim();
    return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
  });
}

function itemLancarSistema(item) {
  return valorCheckboxSim(valorItem(item, colunaLancarSistema));
}

function saldoContratoElegivelPix(item) {
  const n = numeroMoeda(valorItem(item, colunaSaldoContrato));
  if (n == null) return false;
  return n > 0;
}

function percentualQuitadoContrato(item) {
  const valor = numeroMoeda(valorItem(item, colunaValorContrato));
  const saldo = numeroMoeda(valorItem(item, colunaSaldoContrato));
  if (valor == null || valor <= 0) return null;
  if (saldo == null) return null;
  const pago = valor - saldo;
  return Math.min(100, Math.max(0, (pago / valor) * 100));
}

function htmlBarraProgressoQuitadoContrato(item) {
  const pct = percentualQuitadoContrato(item);
  if (pct == null) return "";
  const pctInt = Math.round(pct);
  return (
    `<div class="orcamento-geral-progress-pago pagamentos-contrato-progress-quitado" role="progressbar" ` +
    `aria-valuenow="${pctInt}" aria-valuemin="0" aria-valuemax="100" title="${pctInt}% quitado">` +
    `<div class="orcamento-geral-progress-pago-track" aria-hidden="true">` +
    `<div class="orcamento-geral-progress-pago-fill" style="width:${pctInt}%"></div>` +
    `</div></div>`
  );
}

function itemElegivelModalPagamentosPix(item) {
  return itemLancarSistema(item) && cpfEIgualChavePix(item) && saldoContratoElegivelPix(item);
}

function linhasParaModalPagamentosPix() {
  return linhas.filter(itemElegivelModalPagamentosPix);
}

function alternarSelecaoLinhaModal(linha, marcado) {
  if (marcado) linhasSelecionadasModal.add(linha);
  else linhasSelecionadasModal.delete(linha);
}

function idsLinhasListaSelecao() {
  return ordenarLinhasPorNome(linhasParaModalPagamentosPix()).map((item) => item._linha);
}

function atualizarCheckboxMarcarTodos() {
  const master = el.selecaoMarcarTodos;
  if (!master) return;
  const ids = idsLinhasListaSelecao();
  if (!ids.length) {
    master.checked = false;
    master.indeterminate = false;
    master.disabled = true;
    return;
  }
  master.disabled = false;
  const marcados = ids.filter((id) => linhasSelecionadasModal.has(id)).length;
  master.checked = marcados === ids.length;
  master.indeterminate = marcados > 0 && marcados < ids.length;
}

function marcarDesmarcarTodosSelecao(marcar) {
  idsLinhasListaSelecao().forEach((id) => {
    if (marcar) linhasSelecionadasModal.add(id);
    else linhasSelecionadasModal.delete(id);
  });
  el.corpoSelecaoPagamentos?.querySelectorAll(".pagamentos-selecao-check").forEach((input) => {
    input.checked = marcar;
  });
  atualizarCheckboxMarcarTodos();
  atualizarTotalPixModalSelecao();
}

function valorPixSugeridoDeSaldo(item) {
  const saldo = valorItem(item, colunaSaldoContrato);
  const n = numeroMoeda(saldo);
  if (n == null) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarValorPixInput(valorTexto) {
  const s = String(valorTexto ?? "").trim();
  if (!s) return "";
  return valorMoedaGravar(s) || s;
}

function cpfEIgualChavePix(item) {
  const cpfDigitos = cpfSomenteDigitos(valorItem(item, colunaCpf));
  const pix = String(valorItem(item, colunaChavePix) ?? "").trim();
  if (!cpfDigitos || !pix) return false;
  const pixDigitos = cpfSomenteDigitos(pix);
  if (pixDigitos.length === 11) return cpfDigitos === pixDigitos;
  const cpfFmt = formatarCpf(cpfDigitos);
  return (
    pix === cpfFmt ||
    pix === cpfDigitos ||
    PlanilhaApi.normalizarChave(pix) === PlanilhaApi.normalizarChave(cpfFmt)
  );
}

function htmlCelulaCpfChavePix(item) {
  const cpfFmt = formatarCpf(valorItem(item, colunaCpf));
  const cpfExibir = cpfFmt ? escapeHtml(cpfFmt) : '<span class="text-muted">—</span>';
  const conferem = cpfEIgualChavePix(item);
  const titulo = conferem ? "CPF e chave PIX conferem" : "CPF e chave PIX diferentes";
  const icone = conferem
    ? '<i class="fa-solid fa-circle-check pagamentos-cpf-pix-icone pagamentos-cpf-pix-icone--ok" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-circle-xmark pagamentos-cpf-pix-icone pagamentos-cpf-pix-icone--erro" aria-hidden="true"></i>';
  return (
    '<span class="pagamentos-cpf-pix-celula">' +
    `<span class="pagamentos-cpf-pix-texto">${cpfExibir}</span>` +
    `<span class="pagamentos-cpf-pix-icone-wrap" title="${escapeHtml(titulo)}">${icone}</span>` +
    "</span>"
  );
}

function obterValorPixLinha(numLinha, item) {
  if (valorPixModalPorLinha.has(numLinha)) {
    return valorPixModalPorLinha.get(numLinha);
  }
  return valorPixSugeridoDeSaldo(item);
}

function lerValorPixInput(numLinha) {
  const input = el.corpoSelecaoPagamentos?.querySelector(
    `input.pagamentos-selecao-valor-pix[data-linha-pix="${numLinha}"]`
  );
  return input ? String(input.value ?? "").trim() : "";
}

function itemModalPorLinha(numLinha) {
  return linhas.find((item) => item._linha === numLinha);
}

function atualizarTotalPixModalSelecao() {
  const valorEl = el.pagamentosSelecaoTotalPixValor;
  if (!valorEl) return;

  let soma = 0;
  let qtd = 0;
  for (const numLinha of linhasSelecionadasModal) {
    const item = itemModalPorLinha(numLinha);
    if (!item || !itemElegivelModalPagamentosPix(item)) continue;
    qtd += 1;
    const texto = lerValorPixInput(numLinha) || obterValorPixLinha(numLinha, item);
    const n = numeroMoeda(texto);
    if (n != null) soma += n;
  }

  valorEl.textContent = valorMoedaGravar(soma) || "0,00";
  if (el.pagamentosSelecaoTotalPixQtd) {
    let rotulo;
    if (qtd === 0) rotulo = "nenhum registro selecionado";
    else if (qtd === 1) rotulo = "1 registro selecionado";
    else rotulo = `${qtd} registros selecionados`;
    el.pagamentosSelecaoTotalPixQtd.textContent = rotulo;
  }
}

function dataHojeInputDate() {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const d = String(hoje.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataPagamentoParaCsv(isoDate) {
  const p = String(isoDate ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return String(isoDate ?? "").trim();
  return `${p[3]}/${p[2]}/${p[1]}`;
}

function inscricaoCsvDeChavePix(pix) {
  const digitos = cpfSomenteDigitos(pix);
  if (digitos.length === 11) return digitos;
  const soDigitos = String(pix ?? "").replace(/\D/g, "");
  if (soDigitos.length === 11) return soDigitos;
  return "";
}

function valorPixParaCsv(valorTexto) {
  const n = numeroMoeda(valorTexto);
  if (n == null || n <= 0) return "";
  return String(Math.round(n));
}

const CSV_DELIMITER_PIX_BB = ";";

function escapeCampoCsv(texto) {
  const delim = CSV_DELIMITER_PIX_BB;
  const t = String(texto ?? "");
  const precisaAspas = new RegExp(`[${delim}"\\n\\r]`).test(t);
  if (precisaAspas) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function sufixoDataHoraArquivoPix() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_` +
    `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

function formatarContadorLotePix(contador) {
  const n = Math.floor(Number(contador));
  if (!n || n < 1) return "100";
  return String(n).padStart(3, "0");
}

function nomeArquivoLotePix(contador) {
  const seq = formatarContadorLotePix(contador);
  return `lote_${seq}_pix_${sufixoDataHoraArquivoPix()}.csv`;
}

function idLoteDeNomeArquivoPix(nomeArquivo) {
  return String(nomeArquivo || "").replace(/\.csv$/i, "");
}

async function obterProximoContadorLotePix() {
  const planilhaLote = cfg.PLANILHA_LOTE_PIX || "pagamentos-pix-lote";
  const json = await PlanilhaApi.gravar(planilhaLote, {
    acao: "proximo-contador-lote-pix",
    origem: "pessoal-pagamentos",
    dados: {},
  });
  const n = Math.floor(Number(json?.contador));
  if (!json?.ok || !Number.isFinite(n) || n < 100) {
    throw new Error("não foi possível obter o número do lote.");
  }
  return n;
}

function setGerarCsvPagamentosCarregando(ativo) {
  const btn = el.btnGerarCsvPagamentos;
  const spinner = el.gerarCsvSpinner;
  const icon = el.gerarCsvIcone;
  if (btn) btn.disabled = !!ativo;
  spinner?.classList.toggle("d-none", !ativo);
  icon?.classList.toggle("d-none", !!ativo);
}

function setLancarPagamentosCarregando(ativo) {
  const btn = el.btnExecutarLancarPagamentosPix;
  const spinner = el.lancarPixSpinner;
  const icon = el.lancarPixIcone;
  if (btn) {
    if (ativo) {
      btn.dataset.carregando = "1";
      btn.disabled = true;
    } else {
      delete btn.dataset.carregando;
    }
  }
  spinner?.classList.toggle("d-none", !ativo);
  icon?.classList.toggle("d-none", !!ativo);
  if (!ativo) atualizarBotaoLancarPagamentosPix();
}

async function gerarArquivoCsvPagamentos() {
  const dataIso = String(el.dataPagamentoSelecao?.value ?? "").trim();
  if (!dataIso) {
    AppToast.show("informe a data do pagamento.", "erro");
    el.dataPagamentoSelecao?.focus();
    return;
  }

  const lista = ordenarLinhasPorNome(linhasParaModalPagamentosPix()).filter((item) =>
    linhasSelecionadasModal.has(item._linha)
  );
  if (!lista.length) {
    AppToast.show("selecione ao menos um colaborador.", "erro");
    return;
  }

  const dataCsv = dataPagamentoParaCsv(dataIso);
  const d = CSV_DELIMITER_PIX_BB;
  const linhasArquivo = [
    ["inscricao", "nome", "valor", "data_pagamento", "seu_numero"].join(d),
  ];
  let sequencial = 1;
  const registrosLote = [];

  for (const item of lista) {
    const numLinha = item._linha;
    const nome = String(valorItem(item, colunaNome) ?? "").trim();
    const pix = String(valorItem(item, colunaChavePix) ?? "").trim();
    const inscricao = inscricaoCsvDeChavePix(pix);
    if (!inscricao) {
      AppToast.show(
        `chave PIX deve ser CPF com 11 dígitos${nome ? ` (${nome})` : ""}.`,
        "erro"
      );
      return;
    }

    const valorTexto = lerValorPixInput(numLinha) || obterValorPixLinha(numLinha, item);
    const valor = valorPixParaCsv(valorTexto);
    if (!valor) {
      AppToast.show(
        `valor PIX inválido${nome ? ` em ${nome}` : ""}.`,
        "erro"
      );
      return;
    }

    const cpfColaborador = cpfSomenteDigitos(valorItem(item, colunaCpf)) || inscricao;

    linhasArquivo.push(
      [
        escapeCampoCsv(inscricao),
        escapeCampoCsv(nome.toUpperCase()),
        escapeCampoCsv(valor),
        escapeCampoCsv(dataCsv),
        escapeCampoCsv(String(sequencial)),
      ].join(d)
    );
    registrosLote.push({
      colaborador: nome,
      cpf: cpfColaborador,
      valor: Number(valor),
    });
    sequencial += 1;
  }

  const planilhaLote = cfg.PLANILHA_LOTE_PIX || "pagamentos-pix-lote";
  let contadorLote;
  let nomeArquivo;
  let idLote;

  setGerarCsvPagamentosCarregando(true);
  try {
    contadorLote = await obterProximoContadorLotePix();
    nomeArquivo = nomeArquivoLotePix(contadorLote);
    idLote = idLoteDeNomeArquivoPix(nomeArquivo);

    // Sem BOM: o utf-8-sig no Colab/Python quebra o cabeçalho "inscricao".
    const conteudo = linhasArquivo.join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);

    await PlanilhaApi.gravar(planilhaLote, {
      acao: "registrar-lote-pagamentos-pix",
      origem: "pessoal-pagamentos",
      dados: {
        idLote,
        dataLote: dataIso,
        contadorLote,
        registros: registrosLote,
      },
    });
    AppToast.show("arquivo CSV gerado.", "sucesso");
  } catch (e) {
    if (nomeArquivo) {
      AppToast.show(
        `CSV gerado, mas falha ao registrar lote: ${PlanilhaApi.mensagemErro(e)}`,
        "erro"
      );
    } else {
      AppToast.show(PlanilhaApi.mensagemErro(e), "erro");
    }
  } finally {
    setGerarCsvPagamentosCarregando(false);
  }
}

function renderizarTabelaSelecaoModal() {
  const corpo = el.corpoSelecaoPagamentos;
  const vazio = el.vazioSelecaoPagamentos;
  if (!corpo) return;

  const lista = ordenarLinhasPorNome(linhasParaModalPagamentosPix());
  corpo.innerHTML = "";

  if (!lista.length) {
    if (vazio) vazio.hidden = false;
    atualizarCheckboxMarcarTodos();
    atualizarTotalPixModalSelecao();
    return;
  }
  if (vazio) vazio.hidden = true;

  lista.forEach((item) => {
    const tr = document.createElement("tr");
    const numLinha = item._linha;
    const marcado = linhasSelecionadasModal.has(numLinha);

    const tdCheck = document.createElement("td");
    tdCheck.className = "pagamentos-selecao-col-check text-center";
    tdCheck.innerHTML =
      `<input type="checkbox" class="form-check-input pagamentos-selecao-check" data-linha="${numLinha}"${marcado ? " checked" : ""} aria-label="selecionar linha">`;
    tr.appendChild(tdCheck);

    const nome = String(valorItem(item, colunaNome) ?? "").trim();
    const municipio = String(valorItem(item, colunaMunicipio) ?? "").trim();
    tr.appendChild(
      criarTdHtml(htmlCelulaModalDupla(nome, municipio, { linha2Muted: true }), "")
    );

    const cpf = formatarCpf(valorItem(item, colunaCpf));
    const pix = String(valorItem(item, colunaChavePix) ?? "").trim();
    tr.appendChild(criarTdHtml(htmlCelulaModalDupla(cpf, pix, { linha2Muted: true }), ""));

    const valor = textoMoedaExibir(valorItem(item, colunaValorContrato));
    const saldo = textoMoedaExibir(valorItem(item, colunaSaldoContrato));
    const tdValores = criarTdHtml(
      htmlCelulaModalDupla(valor || "—", saldo || "—", { linha2Muted: true }),
      "text-end pagamentos-selecao-col-valores"
    );
    tr.appendChild(tdValores);

    const valorPixInicial = formatarValorPixInput(obterValorPixLinha(numLinha, item));
    const tdValorPix = document.createElement("td");
    tdValorPix.className = "pagamentos-selecao-col-valor-pix text-end";
    const inputPix = document.createElement("input");
    inputPix.type = "text";
    inputPix.className = "form-control form-control-sm pagamentos-selecao-valor-pix text-end";
    inputPix.dataset.linhaPix = String(numLinha);
    inputPix.inputMode = "decimal";
    inputPix.placeholder = "0,00";
    inputPix.value = valorPixInicial;
    inputPix.setAttribute("aria-label", `valor PIX — ${nome || "colaborador"}`);
    vincularFormatacaoMoedaInput(inputPix);
    inputPix.addEventListener("input", () => {
      valorPixModalPorLinha.set(numLinha, inputPix.value);
      atualizarTotalPixModalSelecao();
    });
    inputPix.addEventListener("blur", () => {
      const fmt = formatarValorPixInput(inputPix.value);
      inputPix.value = fmt;
      valorPixModalPorLinha.set(numLinha, fmt);
      atualizarTotalPixModalSelecao();
    });
    tdValorPix.appendChild(inputPix);
    tr.appendChild(tdValorPix);

    const input = tdCheck.querySelector("input");
    input?.addEventListener("change", () => {
      alternarSelecaoLinhaModal(numLinha, input.checked);
      atualizarCheckboxMarcarTodos();
      atualizarTotalPixModalSelecao();
    });

    corpo.appendChild(tr);
  });
  atualizarCheckboxMarcarTodos();
  atualizarTotalPixModalSelecao();
}

function abrirModalSelecao() {
  if (el.dataPagamentoSelecao && !el.dataPagamentoSelecao.value) {
    el.dataPagamentoSelecao.value = dataHojeInputDate();
  }
  const elegiveis = new Set(linhasParaModalPagamentosPix().map((item) => item._linha));
  for (const id of [...linhasSelecionadasModal]) {
    if (!elegiveis.has(id)) linhasSelecionadasModal.delete(id);
  }
  renderizarTabelaSelecaoModal();
  modalSelecao?.show();
}

function valorItemLote(item, col) {
  return col ? item[col.chave] : "";
}

function resolverColunasLotePix() {
  const mapa = cfg.COLUNAS_LOTE_PIX || {};
  const idx = cfg.INDICES_LOTE_PIX || {};
  colunaLoteId = PlanilhaApi.acharColuna(colunasLotePix, mapa.ID_LOTE, idx.ID_LOTE);
  colunaLoteData = PlanilhaApi.acharColuna(colunasLotePix, mapa.DATA_LOTE, idx.DATA_LOTE);
  colunaLoteColaborador = PlanilhaApi.acharColuna(
    colunasLotePix,
    mapa.COLABORADOR,
    idx.COLABORADOR
  );
  colunaLoteCpf = PlanilhaApi.acharColuna(colunasLotePix, mapa.CPF, idx.CPF);
  colunaLoteValor = PlanilhaApi.acharColuna(colunasLotePix, mapa.VALOR, idx.VALOR);
  colunaLoteContador = PlanilhaApi.acharColuna(
    colunasLotePix,
    mapa.CONTADOR_LOTE,
    idx.CONTADOR_LOTE
  );
  colunaLoteLancado = PlanilhaApi.acharColuna(colunasLotePix, mapa.LANCADO, idx.LANCADO);
}

function dataPagamentoIsoDeItemLote(item) {
  const val = valorItemLote(item, colunaLoteData);
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    return `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())}`;
  }
  const s = String(val ?? "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return s;
}

function valorLancadoColaboradorItem(item) {
  return String(valorItemLote(item, colunaLoteLancado) ?? "")
    .trim()
    .toUpperCase();
}

function itemLotePixJaLancado(item) {
  if (!item) return false;
  if (item._lancadoColaborador === true) return true;
  const v = valorLancadoColaboradorItem(item);
  return v === "S" || v === "SIM";
}

function linhasLotePixElegiveisLancar() {
  return linhasLotePixFiltradas().filter((item) => !itemLotePixJaLancado(item));
}

function htmlBadgeStatusLotePix(item) {
  if (itemLotePixJaLancado(item)) {
    return '<span class="pagamentos-lancar-badge pagamentos-lancar-badge--registrado">registrado</span>';
  }
  return '<span class="pagamentos-lancar-badge pagamentos-lancar-badge--pendente">pendente</span>';
}

function atualizarRotuloLoteLancarModal() {
  const idEl = el.lancarPixIdLote;
  if (!idEl) return;
  const filtro = String(el.filtroLotePix?.value ?? "").trim();
  if (!filtro) {
    idEl.hidden = true;
    idEl.textContent = "";
    return;
  }
  idEl.hidden = false;
  idEl.textContent = filtro;
}

function registrosSelecionadosLancarModal() {
  const lista = [];
  for (const numLinha of linhasSelecionadasLancarModal) {
    const item = linhasLotePix.find((r) => r._linha === numLinha);
    if (!item) continue;
    if (itemLotePixJaLancado(item)) continue;
    if (el.filtroLotePix?.value) {
      const id = String(valorItemLote(item, colunaLoteId) ?? "").trim();
      if (id !== String(el.filtroLotePix.value).trim()) continue;
    }
    lista.push(item);
  }
  return lista;
}

function parseIdLotePix(idLote) {
  const m = String(idLote || "")
    .trim()
    .match(/^lote_(\d+)_pix_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/i);
  if (!m) return null;
  return {
    seq: m[1],
    dataIso: `${m[2]}-${m[3]}-${m[4]}`,
    hora: `${m[5]}:${m[6]}:${m[7]}`,
  };
}

function seqLoteExibirDeItem(item) {
  const cont = String(valorItemLote(item, colunaLoteContador) ?? "").trim();
  if (cont) {
    const n = Math.floor(Number(cont.replace(/\D/g, "") || cont));
    if (n > 0) return formatarContadorLotePix(n);
    return cont;
  }
  const id = String(valorItemLote(item, colunaLoteId) ?? "").trim();
  const parsed = parseIdLotePix(id);
  if (parsed?.seq) return formatarContadorLotePix(parsed.seq);
  return "—";
}

function rotuloSelectLotePix(item) {
  const id = String(valorItemLote(item, colunaLoteId) ?? "").trim();
  const seq = seqLoteExibirDeItem(item);
  const parsed = parseIdLotePix(id);
  let data = formatarDataLoteExibir(valorItemLote(item, colunaLoteData));
  if (data === "—" && parsed?.dataIso) {
    data = formatarDataLoteExibir(parsed.dataIso);
  }
  const hora = parsed?.hora ?? "—";
  return `${seq} ${data} ${hora}`;
}

function formatarDataLoteExibir(val) {
  const s = String(val ?? "").trim();
  if (!s) return "—";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[1]}/${br[2]}/${br[3]}`;
  return s;
}

function textoValorLoteExibir(val) {
  const n = numeroMoeda(val);
  if (n == null) {
    const s = String(val ?? "").trim();
    return s || "—";
  }
  return valorMoedaGravar(n);
}

function ordenarLinhasLotePix(lista) {
  return lista.slice().sort((a, b) => {
    const idA = String(valorItemLote(a, colunaLoteId) ?? "");
    const idB = String(valorItemLote(b, colunaLoteId) ?? "");
    if (idA !== idB) return idB.localeCompare(idA, "pt-BR");
    const na = String(valorItemLote(a, colunaLoteColaborador) ?? "").trim();
    const nb = String(valorItemLote(b, colunaLoteColaborador) ?? "").trim();
    return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
  });
}

function linhasLotePixFiltradas() {
  const filtro = String(el.filtroLotePix?.value ?? "").trim();
  let lista = linhasLotePix;
  if (filtro) {
    lista = lista.filter(
      (item) => String(valorItemLote(item, colunaLoteId) ?? "").trim() === filtro
    );
  }
  return ordenarLinhasLotePix(lista);
}

function idsLinhasListaLancar() {
  return linhasLotePixElegiveisLancar().map((item) => item._linha);
}

function atualizarCheckboxMarcarTodosLancar() {
  const master = el.lancarMarcarTodos;
  if (!master) return;
  const ids = idsLinhasListaLancar();
  if (!ids.length) {
    master.checked = false;
    master.indeterminate = false;
    master.disabled = true;
    return;
  }
  master.disabled = false;
  const marcados = ids.filter((id) => linhasSelecionadasLancarModal.has(id)).length;
  master.checked = marcados === ids.length;
  master.indeterminate = marcados > 0 && marcados < ids.length;
}

function alternarSelecaoLinhaLancar(linha, marcado) {
  const item = linhasLotePix.find((r) => r._linha === linha);
  if (marcado && item && itemLotePixJaLancado(item)) return;
  if (marcado) linhasSelecionadasLancarModal.add(linha);
  else linhasSelecionadasLancarModal.delete(linha);
}

function marcarDesmarcarTodosLancar(marcar) {
  const ids = idsLinhasListaLancar();
  ids.forEach((id) => {
    if (marcar) linhasSelecionadasLancarModal.add(id);
    else linhasSelecionadasLancarModal.delete(id);
  });
  for (const id of [...linhasSelecionadasLancarModal]) {
    const item = linhasLotePix.find((r) => r._linha === id);
    if (item && itemLotePixJaLancado(item)) linhasSelecionadasLancarModal.delete(id);
  }
  el.corpoLancarPagamentos?.querySelectorAll(".pagamentos-lancar-check").forEach((input) => {
    if (input.disabled) {
      input.checked = false;
      return;
    }
    const linha = Number(input.dataset.linha);
    input.checked = marcar && ids.includes(linha);
  });
  atualizarCheckboxMarcarTodosLancar();
  atualizarBotaoLancarPagamentosPix();
}

function atualizarBotaoLancarPagamentosPix() {
  const btn = el.btnExecutarLancarPagamentosPix;
  if (!btn) return;
  const qtd = registrosSelecionadosLancarModal().length;
  btn.disabled = qtd === 0 || btn.dataset.carregando === "1";
}

async function executarLancarPagamentosPix() {
  const selecionados = registrosSelecionadosLancarModal();
  if (!selecionados.length) {
    AppToast.show("selecione ao menos um registro.", "erro");
    return;
  }

  const registros = [];
  const ignoradosLancados = [];
  for (const item of selecionados) {
    if (itemLotePixJaLancado(item)) {
      ignoradosLancados.push(String(valorItemLote(item, colunaLoteColaborador) ?? "").trim());
      continue;
    }
    const cpf = cpfSomenteDigitos(valorItemLote(item, colunaLoteCpf));
    const dataIso = dataPagamentoIsoDeItemLote(item);
    if (!dataIso) {
      AppToast.show("data do lote ausente em um dos registros selecionados.", "erro");
      return;
    }
    registros.push({
      cpf,
      colaborador: String(valorItemLote(item, colunaLoteColaborador) ?? "").trim(),
      valor: valorItemLote(item, colunaLoteValor),
      dataPagamento: dataIso,
      linhaLote: item._linha,
    });
  }

  if (!registros.length) {
    const msg =
      ignoradosLancados.length > 0
        ? "os registros selecionados já constam como lançados (lancado-colaborador = S)."
        : "nenhum registro válido para lançar.";
    AppToast.show(msg, "erro");
    return;
  }

  let confirma = `lançar ${registros.length} pagamento(s) na planilha de contratos?`;
  if (ignoradosLancados.length) {
    confirma += `\n\n${ignoradosLancados.length} registro(s) já lançado(s) serão ignorados.`;
  }
  if (!(await AppConfirm.confirm(confirma))) return;

  setLancarPagamentosCarregando(true);

  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "lancar-pagamentos-pix-contratos",
      dados: { registros },
      aba: cfg.ABA,
      origem: "pessoal-pagamentos",
    });
    if (!json) return;

    const processados = Number(json.processados) || 0;
    const erros = Array.isArray(json.erros) ? json.erros : [];

    if (json.ok && !erros.length) {
      AppToast.show(
        processados === 1 ? "1 pagamento lançado." : `${processados} pagamentos lançados.`,
        "sucesso"
      );
    } else if (processados > 0) {
      const detalhe = erros
        .slice(0, 3)
        .map((e) => `${e.rotulo || "registro"}: ${e.mensagem}`)
        .join("\n");
      AppToast.show(
        `${processados} lançado(s); ${erros.length} falha(s).${detalhe ? "\n" + detalhe : ""}`,
        "erro"
      );
    } else {
      const detalhe = erros[0]?.mensagem || "não foi possível lançar os pagamentos.";
      AppToast.show(detalhe, "erro");
    }

    const linhasOk = new Set((json.linhasLote || []).map((n) => Number(n)));
    linhasOk.forEach((n) => {
      if (n >= 2) linhasSelecionadasLancarModal.delete(n);
    });

    await carregarLinhasLotePix();
    await carregarContratos(true);
    renderizarTabelaLancarModal();
  } catch (e) {
    AppToast.show("erro ao lançar: " + e.message, "erro");
  } finally {
    setLancarPagamentosCarregando(false);
  }
}

function preencherFiltroLotesPix() {
  const select = el.filtroLotePix;
  if (!select) return;
  const atual = String(select.value ?? "");
  const porId = new Map();
  linhasLotePix.forEach((item) => {
    const id = String(valorItemLote(item, colunaLoteId) ?? "").trim();
    if (id && !porId.has(id)) porId.set(id, item);
  });
  const ordenados = Array.from(porId.keys()).sort((a, b) => b.localeCompare(a, "pt-BR"));
  select.innerHTML = '<option value="">todos os lotes</option>';
  ordenados.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = rotuloSelectLotePix(porId.get(id));
    select.appendChild(opt);
  });
  if (atual && ordenados.includes(atual)) select.value = atual;
  atualizarRotuloLoteLancarModal();
}

function renderizarTabelaLancarModal() {
  atualizarRotuloLoteLancarModal();
  const corpo = el.corpoLancarPagamentos;
  const vazio = el.vazioLancarPagamentos;
  if (!corpo) return;

  const lista = linhasLotePixFiltradas();
  corpo.innerHTML = "";

  if (!lista.length) {
    if (vazio) vazio.hidden = false;
    atualizarCheckboxMarcarTodosLancar();
    atualizarBotaoLancarPagamentosPix();
    return;
  }
  if (vazio) vazio.hidden = true;

  lista.forEach((item) => {
    const tr = document.createElement("tr");
    const numLinha = item._linha;
    const jaLancado = itemLotePixJaLancado(item);
    if (jaLancado) linhasSelecionadasLancarModal.delete(numLinha);
    const marcado = !jaLancado && linhasSelecionadasLancarModal.has(numLinha);
    if (jaLancado) tr.classList.add("pagamentos-lancar-linha--lancada");

    const tdCheck = document.createElement("td");
    tdCheck.className = "pagamentos-selecao-col-check text-center";
    tdCheck.innerHTML =
      `<input type="checkbox" class="form-check-input pagamentos-lancar-check" data-linha="${numLinha}"` +
      `${marcado ? " checked" : ""}` +
      `${jaLancado ? " disabled" : ""}` +
      ` aria-label="${jaLancado ? "registro já lançado" : "selecionar linha"}">`;
    tr.appendChild(tdCheck);

    const colaborador = String(valorItemLote(item, colunaLoteColaborador) ?? "").trim();
    const cpf = formatarCpf(valorItemLote(item, colunaLoteCpf));
    tr.appendChild(
      criarTdHtml(htmlCelulaModalDupla(colaborador, cpf, { linha2Muted: true }), "")
    );

    const valor = textoValorLoteExibir(valorItemLote(item, colunaLoteValor));
    tr.appendChild(
      criarTdHtml(
        `<span class="pagamentos-lancar-valor-pix">${escapeHtml(valor)}</span>`,
        "text-end pagamentos-selecao-col-valor-pix"
      )
    );

    tr.appendChild(
      criarTdHtml(htmlBadgeStatusLotePix(item), "pagamentos-lancar-col-status text-end")
    );

    tdCheck.querySelector("input")?.addEventListener("change", (ev) => {
      const input = ev.target;
      alternarSelecaoLinhaLancar(numLinha, input.checked);
      atualizarCheckboxMarcarTodosLancar();
      atualizarBotaoLancarPagamentosPix();
    });

    corpo.appendChild(tr);
  });
  atualizarCheckboxMarcarTodosLancar();
  atualizarBotaoLancarPagamentosPix();
}

async function carregarLinhasLotePix() {
  const planilha = cfg.PLANILHA_LOTE_PIX || "pagamentos-pix-lote";
  const inicio = cfg.LINHA_INICIO_DADOS_LOTE_PIX || 2;
  const dados = await PlanilhaApi.ler(planilha, "", inicio);
  if (!dados) return false;
  colunasLotePix = dados.colunas;
  linhasLotePix = dados.linhas;
  resolverColunasLotePix();
  linhasLotePix = linhasLotePix.map((item) => {
    const lancado = itemLotePixJaLancado(item);
    return Object.assign({}, item, { _lancadoColaborador: lancado });
  });
  preencherFiltroLotesPix();
  const idsValidos = new Set(linhasLotePix.map((r) => r._linha));
  for (const id of [...linhasSelecionadasLancarModal]) {
    if (!idsValidos.has(id)) linhasSelecionadasLancarModal.delete(id);
    else {
      const item = linhasLotePix.find((r) => r._linha === id);
      if (item && itemLotePixJaLancado(item)) linhasSelecionadasLancarModal.delete(id);
    }
  }
  return true;
}

async function abrirModalLancarPix() {
  if (el.lancarPixCarregando) el.lancarPixCarregando.hidden = false;
  if (el.vazioLancarPagamentos) el.vazioLancarPagamentos.hidden = true;
  modalLancarPix?.show();

  try {
    const ok = await carregarLinhasLotePix();
    if (!ok) {
      AppToast.show("falha ao carregar lotes de pagamento.", "erro");
      return;
    }
    renderizarTabelaLancarModal();
  } catch (e) {
    AppToast.show(PlanilhaApi.mensagemErro(e), "erro");
    linhasLotePix = [];
    renderizarTabelaLancarModal();
  } finally {
    if (el.lancarPixCarregando) el.lancarPixCarregando.hidden = true;
  }
}

function htmlIconePagamento(item) {
  const noSistema = itemLancarSistema(item);
  const classe = noSistema
    ? "contratos-icone-pagamento contratos-icone-pagamento--banco"
    : "contratos-icone-pagamento contratos-icone-pagamento--moeda";
  const icone = noSistema ? ICONE_BANCO : ICONE_NAO_LANCAR_SISTEMA;
  return `<span class="${classe}" aria-hidden="true">${icone}</span>`;
}

function htmlIconePagamentoRelatorio(item) {
  const noSistema = itemLancarSistema(item);
  const classe = noSistema
    ? "pagamentos-rel-icone pagamentos-rel-icone--banco"
    : "pagamentos-rel-icone pagamentos-rel-icone--direto";
  const icone = noSistema ? ICONE_BANCO : ICONE_PAGAMENTO_DIRETO_REL;
  const titulo = noSistema ? "lançamento via conta" : "pagamento direto";
  return (
    `<span class="${classe}" title="${escapeHtml(titulo)}" aria-hidden="true">${icone}</span>`
  );
}

function htmlCelulaSaldoContrato(item) {
  const texto = formatarValorContratoExibir(valorItem(item, colunaSaldoContrato));
  const barra = htmlBarraProgressoQuitadoContrato(item);
  return (
    '<div class="orcamento-geral-celula-apagar pagamentos-saldo-celula-stack">' +
    `<span class="contratos-valor-texto orcamento-tabela-celula-direita">${texto}</span>` +
    barra +
    "</div>"
  );
}

function htmlCelulaValorContrato(item) {
  return (
    '<span class="contratos-valor-celula">' +
    `<span class="contratos-valor-texto">${formatarValorContratoExibir(valorItem(item, colunaValorContrato))}</span>` +
    htmlIconePagamento(item) +
    "</span>"
  );
}

function htmlMobileStackCabecalho() {
  return (
    '<div class="contratos-th-stack-head contratos-th-stack-head--unico">' +
    '<span>dados do colaborador</span>' +
    "</div>"
  );
}

function htmlValoresContratoSaldoMobileStack(item) {
  const valorHtml = formatarValorContratoExibir(valorItem(item, colunaValorContrato));
  let valoresHtml =
    '<span class="contratos-stack-valor-saldo-par">' +
    '<span class="contratos-stack-valor-saldo-rotulo">contrato =</span> ' +
    `<span class="contratos-stack-valor-saldo-num">${valorHtml}</span></span>`;
  if (cfg.EXIBIR_COLUNA_SALDO_CONTRATO) {
    const saldoHtml = formatarValorContratoExibir(valorItem(item, colunaSaldoContrato));
    const barraQuitado = htmlBarraProgressoQuitadoContrato(item);
    valoresHtml +=
      ' <span class="contratos-stack-valor-saldo-sep" aria-hidden="true">/</span> ' +
      '<span class="contratos-stack-valor-saldo-par contratos-stack-valor-saldo-par--com-barra">' +
      '<span class="contratos-stack-valor-saldo-rotulo">saldo =</span> ' +
      `<span class="contratos-stack-valor-saldo-num">${saldoHtml}</span>` +
      (barraQuitado
        ? `<span class="pagamentos-saldo-barra-mobile">${barraQuitado}</span>`
        : "") +
      "</span>";
  }
  return (
    '<span class="contratos-stack-valor-saldo-linha">' +
    htmlIconePagamento(item) +
    `<span class="contratos-stack-valor-saldo-texto">${valoresHtml}</span>` +
    "</span>"
  );
}

function htmlMobileStackCorpo(item) {
  let html =
    '<div class="contratos-celula-stack">' +
    `<span class="contratos-stack-nome contratos-stack-nome--com-assinado">${htmlIconeAssinado(item)}<span>${exibirValor(valorItem(item, colunaNome))}</span></span>` +
    `<span class="contratos-stack-mun">${exibirValor(valorItem(item, colunaMunicipio))}</span>` +
    `<span class="contratos-stack-cpf">${htmlCelulaCpfChavePix(item)}</span>` +
    htmlValoresContratoSaldoMobileStack(item);
  html += "</div>";
  return html;
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

function htmlBotoesAcoes() {
  return (
    '<div class="crud-acoes-icones">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--imprimir" data-acao="relatorio" aria-label="relatório individual" title="relatório">' +
    ICONE_RELATORIO +
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

function htmlAcoesDesktop() {
  return htmlBotoesAcoes();
}

function htmlAcoesMobile() {
  return htmlBotoesAcoes();
}

function textoMoedaRelatorio(val) {
  const n = numeroMoeda(val);
  if (n == null) {
    const s = String(val ?? "").trim();
    return s || "—";
  }
  return valorMoedaGravar(n);
}

function valorPagoContratoItem(item) {
  const valor = numeroMoeda(valorItem(item, colunaValorContrato));
  const saldo = numeroMoeda(valorItem(item, colunaSaldoContrato));
  if (valor == null || saldo == null) return null;
  return Math.max(0, valor - saldo);
}

function textoCpfRelatorio(item) {
  const cpf = formatarCpf(valorItem(item, colunaCpf));
  return cpf || "—";
}

function htmlCelulaCpfPixRelatorio(item) {
  const texto = textoCpfRelatorio(item);
  const textoHtml =
    texto === "—"
      ? '<span class="text-muted">—</span>'
      : escapeHtml(texto);
  return (
    '<span class="pagamentos-rel-cpf-pix-celula">' +
    `<span class="pagamentos-rel-cpf-pix-texto">${textoHtml}</span>` +
    htmlIconePagamentoRelatorio(item) +
    "</span>"
  );
}

function htmlCelulaNomeMunicipioRelatorio(item, opcoes) {
  const opts = opcoes || {};
  const nome = String(valorItem(item, colunaNome) ?? "").trim();
  const mun = String(valorItem(item, colunaMunicipio) ?? "").trim();
  if (opts.apenasMunicipio) {
    if (!mun) return '<span class="text-muted">—</span>';
    return `<div class="pagamentos-rel-municipio">${escapeHtml(mun)}</div>`;
  }
  if (!nome && !mun) return "—";
  let html = '<div class="pagamentos-rel-nome-stack">';
  html += nome
    ? `<div class="pagamentos-rel-nome">${escapeHtml(nome)}</div>`
    : '<div class="pagamentos-rel-nome pagamentos-rel-nome--vazio">—</div>';
  if (mun) {
    html += `<div class="pagamentos-rel-municipio">${escapeHtml(mun)}</div>`;
  }
  html += "</div>";
  return html;
}

function htmlTabelaRelatorioPagamentos(itens, opcoes) {
  const opts = opcoes || {};
  const individual = opts.tipo === "individual";
  const th = (rotulo, cls) =>
    '<th scope="col"' + (cls ? ` class="${cls}"` : "") + ">" + escapeHtml(rotulo) + "</th>";

  const cabecalhos = [
    th(individual ? rotuloTabela("MUNICIPIO") : rotuloTabela("NOME"), "pagamentos-rel-col-nome"),
    th(rotuloTabela("ASSINADO"), "pagamentos-rel-col-assinado text-center"),
    th("CPF", "pagamentos-rel-col-cpf text-center"),
    th(rotuloTabela("VALOR_CONTRATO"), "pagamentos-rel-col-valor text-end"),
    th(rotuloTabela("VALOR_PAGO"), "pagamentos-rel-col-valor text-end"),
    th(rotuloTabela("SALDO_CONTRATO"), "pagamentos-rel-col-valor text-end"),
  ];

  let totalContrato = 0;
  let totalPago = 0;
  let totalSaldo = 0;

  const linhasHtml = itens
    .map((item) => {
      const valorContrato = numeroMoeda(valorItem(item, colunaValorContrato));
      const saldo = numeroMoeda(valorItem(item, colunaSaldoContrato));
      const pago = valorPagoContratoItem(item);
      if (valorContrato != null) totalContrato += valorContrato;
      if (saldo != null) totalSaldo += saldo;
      if (pago != null) totalPago += pago;

      const cols = [
        '<td class="pagamentos-rel-col-nome">' +
          htmlCelulaNomeMunicipioRelatorio(item, { apenasMunicipio: individual }) +
          "</td>",
        '<td class="text-center pagamentos-rel-col-assinado">' + htmlIconeAssinado(item) + "</td>",
        '<td class="text-center pagamentos-rel-col-cpf">' + htmlCelulaCpfPixRelatorio(item) + "</td>",
        '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num">' +
          escapeHtml(textoMoedaRelatorio(valorItem(item, colunaValorContrato))) +
          "</td>",
        '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num">' +
          escapeHtml(pago != null ? valorMoedaGravar(pago) : textoMoedaRelatorio("")) +
          "</td>",
        '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num">' +
          escapeHtml(textoMoedaRelatorio(valorItem(item, colunaSaldoContrato))) +
          "</td>",
      ];
      return "<tr>" + cols.join("") + "</tr>";
    })
    .join("");

  let rodape = "";
  if (!individual && itens.length > 1) {
    rodape =
      "<tfoot><tr>" +
      '<td colspan="3"><strong>total</strong></td>' +
      '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num"><strong>' +
      escapeHtml(valorMoedaGravar(totalContrato)) +
      "</strong></td>" +
      '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num"><strong>' +
      escapeHtml(valorMoedaGravar(totalPago)) +
      "</strong></td>" +
      '<td class="text-end pagamentos-rel-col-valor pagamentos-rel-num"><strong>' +
      escapeHtml(valorMoedaGravar(totalSaldo)) +
      "</strong></td>" +
      "</tr></tfoot>";
  }

  return (
    '<table class="rel-tabela pagamentos-rel-tabela">' +
    "<thead><tr>" +
    cabecalhos.join("") +
    "</tr></thead><tbody>" +
    (linhasHtml || '<tr><td colspan="5">—</td></tr>') +
    "</tbody>" +
    rodape +
    "</table>"
  );
}

function htmlCardsResumoRelatorioPagamentos(totais) {
  const fmt = (n) => valorMoedaGravar(n) || "0,00";
  function card(rotulo, total, pix, direto) {
    return (
      '<div class="rel-card pagamentos-rel-card-split">' +
      '<span class="rel-card-rotulo">' +
      escapeHtml(rotulo) +
      "</span>" +
      '<strong class="rel-card-valor">' +
      escapeHtml(fmt(total)) +
      "</strong>" +
      '<span class="pagamentos-rel-card-split-detalhe">' +
      '<span class="pagamentos-rel-card-split-linha"><span>conta</span> <strong>' +
      escapeHtml(fmt(pix)) +
      "</strong></span>" +
      '<span class="pagamentos-rel-card-split-linha"><span>direto</span> <strong>' +
      escapeHtml(fmt(direto)) +
      "</strong></span>" +
      "</span></div>"
    );
  }
  return (
    '<div class="rel-cards pagamentos-rel-cards-resumo">' +
    card("total contratos", totais.totalContratos, totais.pix.totalContratos, totais.direto.totalContratos) +
    card("valor pago", totais.totalPago, totais.pix.totalPago, totais.direto.totalPago) +
    card(
      "saldo contratos",
      totais.totalSaldo,
      totais.pix.totalSaldo,
      totais.direto.totalSaldo
    ) +
    "</div>"
  );
}

function htmlResumoRelatorioPagamentosTotais(totais) {
  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>resumo</h2>' +
    htmlCardsResumoRelatorioPagamentos(totais) +
    "</section>"
  );
}

function abrirRelatorioIndividual(item) {
  const Rel = window.Relatorio;
  if (!Rel) {
    AppToast.show("módulo de relatório indisponível.", "erro");
    return;
  }
  const nome = String(valorItem(item, colunaNome) ?? "").trim();
  const metaRel = Rel.resolverMetaRelatorio({ documento: document });
  const tabela = htmlTabelaRelatorioPagamentos([item], { tipo: "individual" });
  const detalheOV = htmlSecaoColunasOVRelatorioIndividual(item);
  const nomeDestaque = nome
    ? `<p class="pagamentos-rel-nome-destaque">${escapeHtml(nome)}</p>`
    : "";
  const corpo =
    '<section class="rel-secao pagamentos-rel-secao-individual">' +
    nomeDestaque +
    tabela +
    detalheOV +
    "</section>" +
    Rel.scriptImpressaoRelatorio();
  const html = Rel.htmlDocumento(
    {
      documento: document,
      ...metaRel,
      subtitulo: metaRel.subtitulo || "pagamentos",
    },
    corpo
  );
  if (!Rel.abrirJanelaRelatorio(html)) {
    AppToast.show("permita pop-ups para abrir o relatório.", "erro");
  }
}

function montarHtmlRelatorioPagina(opcoes) {
  const Rel = window.Relatorio;
  if (!Rel) return "";

  const meta = opcoes || {};
  const doc = meta.documento || document;
  const metaRel = Rel.resolverMetaRelatorio(meta);
  const lista = linhasFiltradas();
  const totais = totaisContratosPagamentos(lista);
  const termo = termoBusca();
  const filtros = [];
  if (termo) {
    filtros.push({
      nome: "busca",
      valor: termo,
      ativo: true,
    });
  }
  const forma = obterFiltroFormaPagamento();
  if (forma !== "todos") {
    filtros.push({
      nome: "forma pagamento",
      valor: rotuloFiltroFormaPagamento(forma),
      ativo: true,
    });
  }

  const corpo =
    '<section class="rel-secao"><h2>filtros</h2>' +
    Rel.htmlFiltros(filtros) +
    "</section>" +
    '<section class="rel-secao pagamentos-rel-secao-resumo-lista">' +
    "<h2>resumo</h2>" +
    htmlCardsResumoRelatorioPagamentos(totais) +
    '<h2 class="pagamentos-rel-titulo-lista">pagamentos</h2>' +
    htmlTabelaRelatorioPagamentos(lista, { tipo: "lista" }) +
    "</section>" +
    Rel.scriptImpressaoRelatorio();

  return Rel.htmlDocumento({ ...meta, ...metaRel, documento: doc }, corpo);
}

function vincularAcoes(container, item) {
  container.querySelector('[data-acao="relatorio"]')?.addEventListener("click", () => abrirRelatorioIndividual(item));
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
    criarTh(rotuloTabela("NOME"), "contratos-col-nome contratos-tabela-desktop-col")
  );
  const thAssinado = criarTh(
    rotuloTabela("ASSINADO"),
    "contratos-col-assinado contratos-tabela-desktop-col text-center"
  );
  thAssinado.title = rotuloTabela("ASSINADO");
  trDesktop.appendChild(thAssinado);
  trDesktop.appendChild(criarTh(rotuloTabela("CPF"), "contratos-col-cpf contratos-tabela-desktop-col"));
  trDesktop.appendChild(
    criarTh(rotuloTabela("MUNICIPIO"), "contratos-col-municipio contratos-tabela-desktop-col")
  );
  if (cfg.EXIBIR_COLUNA_LIDERANCA !== false) {
    trDesktop.appendChild(
      criarTh(rotuloTabela("VINCULO"), "contratos-col-vinculo contratos-tabela-desktop-col")
    );
  }
  trDesktop.appendChild(
    criarTh(
      rotuloTabela("VALOR_CONTRATO"),
      "contratos-col-valor contratos-tabela-desktop-col"
    )
  );
  if (cfg.EXIBIR_COLUNA_SALDO_CONTRATO) {
    trDesktop.appendChild(
      criarTh(
        rotuloTabela("SALDO_CONTRATO"),
        "contratos-col-saldo contratos-tabela-desktop-col"
      )
    );
  }
  trDesktop.appendChild(
    criarTh("ações", "crud-col-acoes contratos-col-acoes contratos-tabela-desktop-col")
  );

  const thStack = criarTh("", "contratos-col-stack contratos-tabela-mobile-col");
  thStack.innerHTML = htmlMobileStackCabecalho();
  trMobile.appendChild(thStack);

  trMobile.appendChild(
    criarTh("ações", "contratos-col-acoes contratos-tabela-mobile-col")
  );
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
    criarTdHtml(htmlCelulaCpfChavePix(item), "contratos-col-cpf contratos-tabela-desktop-col")
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaMunicipio)),
      "contratos-col-municipio contratos-tabela-desktop-col"
    )
  );
  if (cfg.EXIBIR_COLUNA_LIDERANCA !== false) {
    tr.appendChild(
      criarTdHtml(
        exibirValor(valorItem(item, colunaVinculo)),
        "contratos-col-vinculo contratos-tabela-desktop-col"
      )
    );
  }
  tr.appendChild(
    criarTdHtml(
      htmlCelulaValorContrato(item),
      "contratos-col-valor contratos-tabela-desktop-col"
    )
  );
  if (cfg.EXIBIR_COLUNA_SALDO_CONTRATO) {
    tr.appendChild(
      criarTdHtml(
        htmlCelulaSaldoContrato(item),
        "contratos-col-saldo contratos-tabela-desktop-col"
      )
    );
  }

  const tdAcoesDesktop = criarTdHtml(
    htmlAcoesDesktop(),
    "crud-col-acoes text-end text-nowrap contratos-col-acoes contratos-tabela-desktop-col"
  );
  vincularAcoes(tdAcoesDesktop, item);
  tr.appendChild(tdAcoesDesktop);

  const tdStack = criarTdHtml("", "contratos-col-stack contratos-tabela-mobile-col");
  tdStack.innerHTML = htmlMobileStackCorpo(item);
  tr.appendChild(tdStack);

  const tdAcoesMobile = criarTdHtml(
    htmlAcoesMobile(),
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
    atualizarResumoContratosToolbar();
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
  atualizarResumoContratosToolbar();
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
    resumoToolbarTotalContratos: document.getElementById("resumoToolbarTotalContratos"),
    resumoToolbarValorPago: document.getElementById("resumoToolbarValorPago"),
    resumoToolbarSaldoContratos: document.getElementById("resumoToolbarSaldoContratos"),
    resumoToolbarTotalContratosPix: document.getElementById("resumoToolbarTotalContratosPix"),
    resumoToolbarTotalContratosDireto: document.getElementById("resumoToolbarTotalContratosDireto"),
    resumoToolbarValorPagoPix: document.getElementById("resumoToolbarValorPagoPix"),
    resumoToolbarValorPagoDireto: document.getElementById("resumoToolbarValorPagoDireto"),
    resumoToolbarSaldoContratosPix: document.getElementById("resumoToolbarSaldoContratosPix"),
    resumoToolbarSaldoContratosDireto: document.getElementById("resumoToolbarSaldoContratosDireto"),
    filtroFormaPagamentoRadios: document.querySelectorAll('input[name="filtroFormaPagamento"]'),
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
    btnAbrirSelecao: document.getElementById("btnAbrirSelecao"),
    modalSelecaoEl: document.getElementById("modalSelecaoPagamentos"),
    corpoSelecaoPagamentos: document.getElementById("corpoSelecaoPagamentos"),
    vazioSelecaoPagamentos: document.getElementById("vazioSelecaoPagamentos"),
    selecaoMarcarTodos: document.getElementById("selecaoMarcarTodos"),
    dataPagamentoSelecao: document.getElementById("dataPagamentoSelecao"),
    btnGerarCsvPagamentos: document.getElementById("btnGerarCsvPagamentos"),
    gerarCsvSpinner: document.getElementById("gerarCsvSpinner"),
    gerarCsvIcone: document.getElementById("gerarCsvIcone"),
    pagamentosSelecaoTotalPixValor: document.getElementById("pagamentosSelecaoTotalPixValor"),
    pagamentosSelecaoTotalPixQtd: document.getElementById("pagamentosSelecaoTotalPixQtd"),
    btnAbrirLancarPix: document.getElementById("btnAbrirLancarPix"),
    modalLancarEl: document.getElementById("modalLancarPagamentosPix"),
    corpoLancarPagamentos: document.getElementById("corpoLancarPagamentos"),
    vazioLancarPagamentos: document.getElementById("vazioLancarPagamentos"),
    lancarMarcarTodos: document.getElementById("lancarMarcarTodos"),
    filtroLotePix: document.getElementById("filtroLotePix"),
    lancarPixCarregando: document.getElementById("lancarPixCarregando"),
    btnExecutarLancarPagamentosPix: document.getElementById("btnExecutarLancarPagamentosPix"),
    lancarPixSpinner: document.getElementById("lancarPixSpinner"),
    lancarPixIcone: document.getElementById("lancarPixIcone"),
    lancarPixIdLote: document.getElementById("lancarPixIdLote"),
  };

  if (el.modalIcone && window.APP_ICON_SVG?.pagamentos) {
    el.modalIcone.innerHTML = APP_ICON_SVG.pagamentos;
  }

  modal = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  if (el.modalSelecaoEl) {
    modalSelecao = bootstrap.Modal.getOrCreateInstance(el.modalSelecaoEl);
  }
  if (el.modalLancarEl) {
    modalLancarPix = bootstrap.Modal.getOrCreateInstance(el.modalLancarEl);
  }
  if (cfg.SOMENTE_EDICAO && el.btnNovo) {
    el.btnNovo.hidden = true;
  }
  el.busca?.addEventListener("input", () => {
    paginaAtualTabela = 1;
    renderizarTabela();
  });
  el.filtroFormaPagamentoRadios?.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      paginaAtualTabela = 1;
      renderizarTabela();
    });
  });
  el.paginacaoPrimeira?.addEventListener("click", () => irParaPaginaTabela(1));
  el.paginacaoAnterior?.addEventListener("click", () => irParaPaginaTabela(paginaAtualTabela - 1));
  el.paginacaoProxima?.addEventListener("click", () => irParaPaginaTabela(paginaAtualTabela + 1));
  el.paginacaoUltima?.addEventListener("click", () => {
    irParaPaginaTabela(totalPaginasTabela(linhasFiltradas().length));
  });
  el.btnAbrirSelecao?.addEventListener("click", abrirModalSelecao);
  el.btnAbrirLancarPix?.addEventListener("click", abrirModalLancarPix);
  el.filtroLotePix?.addEventListener("change", () => {
    renderizarTabelaLancarModal();
  });
  el.btnExecutarLancarPagamentosPix?.addEventListener("click", executarLancarPagamentosPix);
  el.lancarMarcarTodos?.addEventListener("change", () => {
    marcarDesmarcarTodosLancar(el.lancarMarcarTodos.checked);
  });
  el.selecaoMarcarTodos?.addEventListener("change", () => {
    marcarDesmarcarTodosSelecao(el.selecaoMarcarTodos.checked);
    atualizarTotalPixModalSelecao();
  });
  el.btnGerarCsvPagamentos?.addEventListener("click", gerarArquivoCsvPagamentos);
  el.btnNovo?.addEventListener("click", abrirNovo);
  el.form?.addEventListener("submit", salvarFormulario);

  window.atualizarPagina = () => carregarContratos(false);
  carregarContratos(false);
}

function ajustarTabelaRelatorioPagina(_table) {
  /* relatório de pagamentos usa montarHtmlRelatorioPagina (tabela dedicada). */
}

window.ajustarTabelaRelatorioPagina = ajustarTabelaRelatorioPagina;

function estilosRelatorioPagina() {
  const tbl = "table.rel-tabela.pagamentos-rel-tabela";
  return (
    `.rel-body ${tbl}{table-layout:fixed;width:100%;}` +
    `.rel-body ${tbl} th.pagamentos-rel-col-nome,` +
    `.rel-body ${tbl} td.pagamentos-rel-col-nome{width:32%;}` +
    `.rel-body ${tbl} th.pagamentos-rel-col-assinado,` +
    `.rel-body ${tbl} td.pagamentos-rel-col-assinado{width:6%;text-align:center;}` +
    `.rel-body ${tbl} .contratos-icone-assinado{display:inline-flex;align-items:center;justify-content:center;}` +
    `.rel-body ${tbl} .contratos-icone-assinado--sim{color:#0f766e;}` +
    `.rel-body ${tbl} .contratos-icone-assinado--nao{color:#dc2626;}` +
    `.rel-body ${tbl} th.pagamentos-rel-col-cpf,` +
    `.rel-body ${tbl} td.pagamentos-rel-col-cpf{width:22%;}` +
    `.rel-body ${tbl} .pagamentos-rel-cpf-pix-celula{display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;max-width:100%;}` +
    `.rel-body ${tbl} .pagamentos-rel-cpf-pix-texto{text-align:center;white-space:nowrap;line-height:1.25;}` +
    `.rel-body ${tbl} th.pagamentos-rel-col-valor,` +
    `.rel-body ${tbl} td.pagamentos-rel-col-valor{width:13.333%;min-width:0;box-sizing:border-box;}` +
    `.rel-body ${tbl} .pagamentos-rel-icone{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:1.15rem;height:1.15rem;}` +
    `.rel-body ${tbl} .pagamentos-rel-icone svg{width:1.05rem;height:1.05rem;}` +
    `.rel-body ${tbl} .pagamentos-rel-icone--banco{color:#b8956c;}` +
    `.rel-body ${tbl} .pagamentos-rel-icone--direto{color:#1f4e8c;}` +
    `.rel-body ${tbl} .pagamentos-rel-num{font-variant-numeric:tabular-nums;white-space:nowrap;}` +
    `.rel-body ${tbl} .pagamentos-rel-nome-stack{display:block;width:100%;line-height:1.3;}` +
    `.rel-body ${tbl} .pagamentos-rel-nome{font-weight:600;color:#1e293b;}` +
    `.rel-body ${tbl} .pagamentos-rel-municipio{margin-top:0.15rem;font-size:8pt;color:#64748b;font-weight:400;line-height:1.2;}` +
    ".rel-body .pagamentos-rel-secao-parcelas{margin-top:0.75rem;page-break-inside:avoid;}" +
    ".rel-body .pagamentos-rel-parcelas-grid{display:flex;flex-wrap:wrap;gap:0.55rem;margin-top:0.35rem;}" +
    ".rel-body .pagamentos-rel-parcela-card{flex:1 1 calc(25% - 0.55rem);min-width:6.5rem;max-width:100%;" +
    "border:1px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.55rem;background:#f8fafc;box-sizing:border-box;}" +
    ".rel-body .pagamentos-rel-parcela-titulo{font-size:8pt;font-weight:600;color:#64748b;text-transform:lowercase;margin-bottom:0.2rem;}" +
    ".rel-body .pagamentos-rel-parcela-valor{font-size:11pt;font-weight:700;color:#1f4e8c;margin-bottom:0.35rem;}" +
    ".rel-body .pagamentos-rel-parcela-rotulo-data{font-size:7.5pt;color:#94a3b8;margin-bottom:0.08rem;}" +
    ".rel-body .pagamentos-rel-parcela-data{font-size:9pt;font-weight:600;color:#334155;}" +
    ".rel-body .pagamentos-rel-secao-resumo-lista.rel-secao{page-break-inside:auto;break-inside:auto;margin-bottom:0.75rem;}" +
    ".rel-body .pagamentos-rel-secao-resumo-lista .pagamentos-rel-cards-resumo{page-break-inside:avoid;break-inside:avoid-page;page-break-after:avoid;break-after:avoid-page;}" +
    ".rel-body .pagamentos-rel-secao-resumo-lista .pagamentos-rel-titulo-lista{page-break-before:avoid;break-before:avoid-page;margin-top:0.65rem;}" +
    ".rel-body .pagamentos-rel-cards-resumo .rel-card{flex:1 1 140px;min-width:120px;text-align:center;}" +
    ".rel-body .pagamentos-rel-cards-resumo .rel-card .rel-card-rotulo," +
    ".rel-body .pagamentos-rel-cards-resumo .rel-card .rel-card-valor{display:block;text-align:center;}" +
    ".rel-body .pagamentos-rel-secao-individual .pagamentos-rel-nome-destaque{margin:0 0 0.55rem;font-size:13pt;font-weight:700;color:#1f4e8c;line-height:1.25;}" +
    ".page-pessoal-pagamentos .rel-secao-indicadores .rel-cards," +
    ".page-pessoal-pagamentos .pagamentos-rel-cards-resumo{display:flex;flex-wrap:wrap;gap:0.5rem;}" +
    ".page-pessoal-pagamentos .rel-secao-indicadores .rel-card{flex:1 1 140px;min-width:120px;text-align:center;}" +
    ".rel-body .rel-secao-indicadores .rel-card .rel-card-rotulo," +
    ".rel-body .rel-secao-indicadores .rel-card .rel-card-valor{display:block;text-align:center;}" +
    ".rel-body .rel-secao-indicadores .rel-card .rel-card-valor{margin-top:0.15rem;}" +
    ".rel-body .pagamentos-rel-card-split .pagamentos-rel-card-split-detalhe{display:block;margin-top:0.35rem;" +
    "font-size:7.5pt;font-weight:400;color:#64748b;line-height:1.35;}" +
    ".rel-body .pagamentos-rel-card-split .pagamentos-rel-card-split-linha{display:block;}" +
    ".rel-body .pagamentos-rel-card-split .pagamentos-rel-card-split-linha strong{font-weight:600;color:#334155;}"
  );
}

window.estilosRelatorioPagina = estilosRelatorioPagina;
window.montarHtmlRelatorioPagina = montarHtmlRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
