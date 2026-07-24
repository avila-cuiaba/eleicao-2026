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
const ICONE_MOEDA_PAPEL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<rect x="2" y="6" width="20" height="12" rx="2"/>' +
  '<circle cx="12" cy="12" r="2"/>' +
  '<path d="M6 12h.01M18 12h.01"/>' +
  "</svg>";

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
let listaMunicipiosForm = [];
let coordenadoresPorMunicipio = new Map();

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

function linhasFiltradas() {
  return aplicarBusca(linhas.slice());
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
  if (s === "nao" || s === "false" || s === "0" || s === "no") return false;
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
  return criarCampoTexto(campo, dadosExibicao, ' inputmode="decimal"');
}

function criarCampoSelect(campo, dados, opcoes) {
  const id = "campo-" + campo.id;
  const valor = dados && campo.coluna ? String(dados[campo.coluna.chave] ?? "").trim() : "";
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
  const valor = dados && campo.coluna ? dados[campo.coluna.chave] : "";
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
    row.className = "row g-2 mb-2";
    grupos.get(chaveGrupo).forEach((campo) => {
      const col = document.createElement("div");
      const largura = campo.largura || 12;
      col.className = "col-12 col-md-" + largura;

      if (campo.tipo === "checkbox") {
        col.appendChild(criarCampoCheckbox(campo, dados));
      } else if (campo.tipo === "cpf") {
        col.appendChild(criarCampoCpf(campo, dados));
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

  vincularFiltroCoordenador(dados);
}

function lerFormulario() {
  const dados = {};
  resolverCamposFormulario().forEach((campo) => {
    const chave = chaveGravacao(campo.coluna);
    const input = document.getElementById("campo-" + campo.id);
    if (!input) return;

    if (campo.tipo === "checkbox") {
      dados[chave] = valorCheckboxGravar(campo, input.checked);
    } else if (campo.tipo === "cpf") {
      dados[chave] = formatarCpf(input.value);
    } else if (campo.tipo === "moeda") {
      dados[chave] = valorMoedaGravar(input.value);
    } else {
      dados[chave] = input.value.trim();
    }
  });
  return dados;
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
  if (!window.confirm("Excluir este registro?")) return;

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
}

function itemLancarSistema(item) {
  return valorCheckboxSim(valorItem(item, colunaLancarSistema));
}

function htmlIconePagamento(item) {
  const noSistema = itemLancarSistema(item);
  const classe = noSistema
    ? "contratos-icone-pagamento contratos-icone-pagamento--banco"
    : "contratos-icone-pagamento contratos-icone-pagamento--moeda";
  const icone = noSistema ? ICONE_BANCO : ICONE_MOEDA_PAPEL;
  return `<span class="${classe}" aria-hidden="true">${icone}</span>`;
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
    '<div class="contratos-th-stack-head">' +
    `<span>${escapeHtml(rotuloTabela("NOME"))}</span>` +
    `<span>${escapeHtml(rotuloTabela("MUNICIPIO"))}</span>` +
    '<div class="contratos-stack-linha-dupla contratos-th-linha-dupla">' +
    `<span>${escapeHtml(rotuloTabela("CPF"))}</span>` +
    `<span>${escapeHtml(rotuloTabela("VALOR_CONTRATO"))}</span>` +
    "</div>" +
    "</div>"
  );
}

function htmlMobileStackCorpo(item) {
  return (
    '<div class="contratos-celula-stack">' +
    `<span class="contratos-stack-nome">${exibirValor(valorItem(item, colunaNome))}</span>` +
    `<span class="contratos-stack-mun">${exibirValor(valorItem(item, colunaMunicipio))}</span>` +
    '<div class="contratos-stack-linha-dupla">' +
    `<span class="contratos-stack-cpf">${exibirValor(valorItem(item, colunaCpf))}</span>` +
    `<span class="contratos-stack-valor">${htmlCelulaValorContrato(item)}</span>` +
    "</div>" +
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

function htmlBotoesAcoes() {
  return (
    '<div class="crud-acoes-icones">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--imprimir" data-acao="imprimir" aria-label="imprimir contrato" title="imprimir">' +
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

function htmlAcoesDesktop() {
  return htmlBotoesAcoes();
}

function htmlAcoesMobile() {
  return htmlBotoesAcoes();
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
  mostrarStatus("Gerando PDF do contrato...", "carregando");
  try {
    const json = await PlanilhaApi.gravar(cfg.PLANILHA, {
      acao: "imprimir-contrato",
      linha: item._linha,
      dados: montarDadosImpressao(item),
      aba: cfg.ABA,
      origem: "pessoal-contratos",
    });
    if (!json) return;
    const url = json.downloadUrl || json.url;
    if (!url) throw new Error("PDF não gerado.");
    window.open(url, "_blank", "noopener,noreferrer");
    AppToast.show("contrato gerado para impressão", "sucesso");
  } catch (e) {
    AppToast.show("Erro ao imprimir: " + e.message, "erro");
  } finally {
    limparStatus();
  }
}

function vincularAcoes(container, item) {
  container.querySelector('[data-acao="imprimir"]')?.addEventListener("click", () => imprimirContrato(item));
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
  trDesktop.appendChild(
    criarTh(rotuloTabela("NOME_MAE"), "contratos-col-nome-mae contratos-tabela-desktop-col")
  );
  trDesktop.appendChild(criarTh(rotuloTabela("CPF"), "contratos-col-cpf contratos-tabela-desktop-col"));
  trDesktop.appendChild(
    criarTh(rotuloTabela("VINCULO"), "contratos-col-vinculo contratos-tabela-desktop-col")
  );
  trDesktop.appendChild(
    criarTh(rotuloTabela("MUNICIPIO"), "contratos-col-municipio contratos-tabela-desktop-col")
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
}

function criarLinhaTabela(item) {
  const tr = document.createElement("tr");

  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaNome)),
      "contratos-col-nome contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaNomeMae)),
      "contratos-col-nome-mae contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(exibirValor(valorItem(item, colunaCpf)), "contratos-col-cpf contratos-tabela-desktop-col")
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaVinculo)),
      "contratos-col-vinculo contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      exibirValor(valorItem(item, colunaMunicipio)),
      "contratos-col-municipio contratos-tabela-desktop-col"
    )
  );
  tr.appendChild(
    criarTdHtml(
      htmlCelulaValorContrato(item),
      "contratos-col-valor contratos-tabela-desktop-col"
    )
  );

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

function renderizarTabela() {
  const filtradas = linhasFiltradas();
  el.corpo.innerHTML = "";

  if (!filtradas.length) {
    el.vazio.hidden = false;
    el.vazio.textContent = termoBusca()
      ? "nenhum contrato encontrado para a busca."
      : "nenhum contrato encontrado.";
    notificarAlturaFrame();
    return;
  }

  el.vazio.hidden = true;
  filtradas.forEach((item) => {
    el.corpo.appendChild(criarLinhaTabela(item));
  });

  notificarAlturaFrame();
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
    btnNovo: document.getElementById("btnNovo"),
    form: document.getElementById("formContrato"),
    formCampos: document.getElementById("formCampos"),
    btnSalvar: document.getElementById("btnSalvar"),
    btnCancelar: document.getElementById("btnCancelar"),
    modalSalvando: document.getElementById("modalSalvando"),
    modalTitulo: document.getElementById("modalTitulo"),
    modalIcone: document.getElementById("modalIcone"),
    modalEl: document.getElementById("modalContrato"),
  };

  if (el.modalIcone && window.APP_ICON_SVG?.pessoal) {
    el.modalIcone.innerHTML = APP_ICON_SVG.pessoal;
  }

  modal = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.busca?.addEventListener("input", renderizarTabela);
  el.btnNovo?.addEventListener("click", abrirNovo);
  el.form?.addEventListener("submit", salvarFormulario);

  window.atualizarPagina = () => carregarContratos(false);
  carregarContratos(false);
}

function ajustarTabelaRelatorioPagina(table) {
  if (!table?.classList?.contains("contratos-tabela")) return;

  table.querySelectorAll(".contratos-thead-mobile").forEach((tr) => tr.remove());
  table
    .querySelectorAll(".contratos-col-nome-mae, .contratos-col-acoes, .crud-col-acoes")
    .forEach((el) => el.remove());

  const ordem = [
    "contratos-col-nome",
    "contratos-col-cpf",
    "contratos-col-vinculo",
    "contratos-col-municipio",
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

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
