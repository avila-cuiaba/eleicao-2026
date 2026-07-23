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
let regioes = [];
let municipiosPorRegiao = new Map();
let municipiosSelecionados = new Set();
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

function municipioEhMt(municipioNorm) {
  return municipioNorm === "mt";
}

function montarCadastroMunicipios(valoresMunicipios) {
  municipiosPorRegiao = new Map();
  if (!valoresMunicipios?.length) return;

  const cols = cfgMun.COLUNAS;
  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
    const municipio = String(celula(valoresMunicipios, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiao = String(celula(valoresMunicipios, linha, cols.REGIAO) ?? "").trim();
    const regiaoNorm = PlanilhaApi.normalizarChave(regiao);
    const municipioNorm = PlanilhaApi.normalizarChave(municipio);
    if (municipioEhMt(municipioNorm)) continue;

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

function extrairRegioesDoCadastro() {
  return Array.from(municipiosPorRegiao.entries())
    .map(([norm, info]) => ({ norm, rotulo: info.rotulo || norm }))
    .sort(ordenarRegioes);
}

function regioesSelecionadas() {
  if (!el.filtroRegioes) return [];
  return Array.from(el.filtroRegioes.querySelectorAll('input[type="checkbox"]:checked')).map(
    (cb) => cb.value
  );
}

function municipiosDasRegioesSelecionadas() {
  const selecionadas = regioesSelecionadas();
  const mapa = new Map();

  selecionadas.forEach((regiaoNorm) => {
    (municipiosPorRegiao.get(regiaoNorm)?.municipios || []).forEach((mun) => {
      if (municipioEhMt(mun.norm)) return;
      if (!mapa.has(mun.norm)) {
        mapa.set(mun.norm, { ...mun, regiaoNorm });
      }
    });
  });

  return Array.from(mapa.values()).sort((a, b) =>
    a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" })
  );
}

function montarFiltrosRegioes(listaRegioes) {
  regioes = listaRegioes;
  if (!el.filtroRegioes) return;

  el.filtroRegioes.innerHTML = "";
  if (!listaRegioes.length) {
    el.filtroRegioes.closest(".contratos-filtro-wrap")?.classList.add("d-none");
    return;
  }

  el.filtroRegioes.closest(".contratos-filtro-wrap")?.classList.remove("d-none");
  listaRegioes.forEach((reg) => {
    const id = "ctr-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function municipiosSelecionadosLista() {
  return Array.from(municipiosSelecionados);
}

function municipiosFiltroAtivos() {
  const disponiveis = municipiosDasRegioesSelecionadas();
  const disponiveisNorm = new Set(disponiveis.map((m) => m.norm));

  if (municipiosSelecionados.size > 0) {
    return municipiosSelecionadosLista().filter((norm) => disponiveisNorm.has(norm));
  }

  return Array.from(disponiveisNorm);
}

function sincronizarAtivoMunicipios() {
  if (!el.filtroMunicipios) return;
  el.filtroMunicipios.querySelectorAll(".entregas-municipio-item").forEach((item) => {
    const val = item.querySelector("input")?.value;
    item.classList.toggle("is-active", Boolean(val && municipiosSelecionados.has(val)));
  });
}

function onRegiaoAlterada() {
  const disponiveis = municipiosDasRegioesSelecionadas();
  const disponiveisNorm = new Set(disponiveis.map((m) => m.norm));
  municipiosSelecionados.forEach((norm) => {
    if (!disponiveisNorm.has(norm)) municipiosSelecionados.delete(norm);
  });
  montarFiltroMunicipios(disponiveis);
  atualizarPainelTabela();
}

function montarFiltroMunicipios(lista) {
  if (!el.filtroMunicipios || !el.municipiosWrap) return;

  el.filtroMunicipios.innerHTML = "";
  if (!lista.length) {
    el.municipiosWrap.classList.add("d-none");
    return;
  }

  el.municipiosWrap.classList.remove("d-none");
  lista.forEach((mun) => {
    const id = "ctr-mun-" + mun.norm.replace(/[^a-z0-9]+/g, "-");
    const ativo = municipiosSelecionados.has(mun.norm);
    const corIdx = indiceCorRegiao(mun.regiaoNorm);
    const label = document.createElement("label");
    label.className =
      "entregas-municipio-item entregas-municipio-cor--" +
      corIdx +
      (ativo ? " is-active" : "");
    label.innerHTML =
      `<input type="checkbox" class="visually-hidden" id="${id}" value="${escapeHtml(mun.norm)}"${ativo ? " checked" : ""}>` +
      `<span class="entregas-municipio-badge">${escapeHtml(mun.rotulo)}</span>`;
    el.filtroMunicipios.appendChild(label);
  });

  el.filtroMunicipios.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) municipiosSelecionados.add(cb.value);
      else municipiosSelecionados.delete(cb.value);
      sincronizarAtivoMunicipios();
      atualizarPainelTabela();
    });
  });
}

function restaurarFiltros(regioesMarcadas, municipiosNorm) {
  if (!el.filtroRegioes) return;
  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = regioesMarcadas.includes(cb.value);
  });
  municipiosSelecionados = new Set(
    Array.isArray(municipiosNorm) ? municipiosNorm : municipiosNorm ? [municipiosNorm] : []
  );
  montarFiltroMunicipios(municipiosDasRegioesSelecionadas());
}

function regioesFiltroInicial() {
  const lista = cfg.REGIOES_FILTRO_INICIAL || [];
  const disponiveis = new Set(regioes.map((r) => r.norm));
  return lista
    .map((regiao) => PlanilhaApi.normalizarChave(regiao))
    .filter((norm) => disponiveis.has(norm));
}

function aplicarFiltrosRegiaoIniciais() {
  const padrao = regioesFiltroInicial();
  if (!padrao.length) {
    municipiosSelecionados = new Set();
    montarFiltroMunicipios([]);
    return;
  }
  restaurarFiltros(padrao, []);
}

function selecaoAtiva() {
  return regioesSelecionadas().length > 0;
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
  if (!selecaoAtiva()) return [];

  const alvoMunicipios = new Set(municipiosFiltroAtivos());
  if (!alvoMunicipios.size) return [];

  let lista = linhas.slice();
  if (colunaMunicipio) {
    lista = lista.filter((item) =>
      alvoMunicipios.has(PlanilhaApi.normalizarChave(valorItem(item, colunaMunicipio)))
    );
  }

  return aplicarBusca(lista);
}

function atualizarPainelTabela() {
  const mostrar = selecaoAtiva();
  el.tabelaCard?.classList.toggle("d-none", !mostrar);
  el.selecioneMsg?.classList.toggle("d-none", mostrar);
  renderizarTabela();
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

function htmlAcoesDesktop() {
  return (
    '<button type="button" class="btn btn-sm btn-outline-secondary crud-btn-acao" data-acao="imprimir">imprimir</button> ' +
    '<button type="button" class="btn btn-sm btn-outline-primary crud-btn-acao" data-acao="editar">editar</button> ' +
    '<button type="button" class="btn btn-sm btn-outline-danger crud-btn-acao" data-acao="excluir">excluir</button>'
  );
}

function htmlAcoesMobile() {
  return (
    '<div class="crud-acoes-icones">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--imprimir" data-acao="imprimir" aria-label="imprimir contrato">' +
    ICONE_IMPRIMIR +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--editar" data-acao="editar" aria-label="editar">' +
    ICONE_EDITAR +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--excluir" data-acao="excluir" aria-label="excluir">' +
    ICONE_EXCLUIR +
    "</button>" +
    "</div>"
  );
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
    criarTh("ações", "crud-col-acoes text-end contratos-col-acoes contratos-tabela-desktop-col")
  );

  const thStack = criarTh("", "contratos-col-nome-cpf contratos-tabela-mobile-col");
  thStack.innerHTML =
    '<div class="contratos-th-stack-head">' +
    `<span>${escapeHtml(rotuloTabela("NOME"))}</span>` +
    `<span>${escapeHtml(rotuloTabela("CPF"))}</span>` +
    "</div>";
  trMobile.appendChild(thStack);

  const thCoordMun = criarTh("", "contratos-col-coord-mun contratos-tabela-mobile-col");
  thCoordMun.innerHTML =
    '<div class="contratos-th-stack-head">' +
    `<span>${escapeHtml(rotuloTabela("VINCULO"))}</span>` +
    `<span>${escapeHtml(rotuloTabela("MUNICIPIO"))}</span>` +
    "</div>";
  trMobile.appendChild(thCoordMun);

  trMobile.appendChild(
    criarTh("ações", "text-end contratos-col-acoes contratos-tabela-mobile-col")
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

  const tdAcoesDesktop = criarTdHtml(
    htmlAcoesDesktop(),
    "crud-col-acoes text-end text-nowrap contratos-col-acoes contratos-tabela-desktop-col"
  );
  vincularAcoes(tdAcoesDesktop, item);
  tr.appendChild(tdAcoesDesktop);

  const tdStack = criarTdHtml("", "contratos-col-nome-cpf contratos-tabela-mobile-col");
  tdStack.innerHTML =
    '<div class="contratos-celula-stack">' +
    `<span class="contratos-stack-nome">${exibirValor(valorItem(item, colunaNome))}</span>` +
    `<span class="contratos-stack-cpf">${exibirValor(valorItem(item, colunaCpf))}</span>` +
    "</div>";
  tr.appendChild(tdStack);

  const tdCoordMun = criarTdHtml("", "contratos-col-coord-mun contratos-tabela-mobile-col");
  tdCoordMun.innerHTML =
    '<div class="contratos-celula-stack">' +
    `<span class="contratos-stack-coord">${exibirValor(valorItem(item, colunaVinculo))}</span>` +
    `<span class="contratos-stack-mun">${exibirValor(valorItem(item, colunaMunicipio))}</span>` +
    "</div>";
  tr.appendChild(tdCoordMun);

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

  if (!selecaoAtiva()) {
    el.vazio.hidden = false;
    el.vazio.textContent = "selecione uma região para ver os contratos.";
    notificarAlturaFrame();
    return;
  }

  if (!filtradas.length) {
    el.vazio.hidden = false;
    el.vazio.textContent = municipiosSelecionados.size
      ? "nenhum contrato encontrado para os municípios selecionados."
      : "nenhum contrato encontrado para esta região.";
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

  const regioesAntes = regioesSelecionadas();
  const municipiosAntes = municipiosSelecionadosLista();

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
      montarCadastroMunicipios(jsonMun.valores);
      listaMunicipiosForm = extrairListaMunicipios(jsonMun.valores);
    } else {
      municipiosPorRegiao = new Map();
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
    montarFiltrosRegioes(extrairRegioesDoCadastro());
    if (silencioso && regioesAntes.length) {
      restaurarFiltros(regioesAntes, municipiosAntes);
    } else if (!silencioso) {
      aplicarFiltrosRegiaoIniciais();
    } else {
      municipiosSelecionados = new Set();
      montarFiltroMunicipios([]);
    }

    atualizarPainelTabela();
    if (!silencioso) limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  }
}

function init() {
  el = {
    filtroRegioes: document.getElementById("filtroRegioes"),
    municipiosWrap: document.getElementById("municipiosWrap"),
    filtroMunicipios: document.getElementById("filtroMunicipios"),
    selecioneMsg: document.getElementById("contratosSelecione"),
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
  el.busca?.addEventListener("input", atualizarPainelTabela);
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
