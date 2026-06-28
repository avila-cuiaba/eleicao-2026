// Mobilização — perspectiva de voto (CRUD na planilha mobilizacao-perspectiva).

const cfgPersp = CONFIG.MOBILIZACAO.PERSPECTIVA;
const cfgEstrutura = CONFIG.MOBILIZACAO.CUIABA;

const ICONE_EDITAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' +
  "</svg>";
const ICONE_EXCLUIR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>' +
  "</svg>";
const ICONE_LOCAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"/>' +
  '<circle cx="12" cy="11" r="2.5"/>' +
  "</svg>";
const ICONE_PEOPLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
  '<circle cx="9" cy="7" r="4"/>' +
  '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' +
  "</svg>";

const COLUNAS_TABELA = [
  { id: "apoiador", rotulo: "apoiador", tipo: "texto" },
  { id: "local", rotulo: "bairro / segmento", tipo: "local" },
  { id: "origem", rotulo: "origem voto", tipo: "origem" },
  { id: "voto", rotulo: "voto", tipo: "perspectiva" },
];

const COLUNAS_OBRIGATORIAS = ["apoiador", "bairro", "segmento", "origem", "voto"];

let el = {};
let registros = [];
let colunasMap = {};
let chaveRegiao = null;
let regioesLista = [];
let modalRegistro = null;
let modoEdicao = null;
let opcoesApoiador = [];
let estruturaFormulario = null;

function aliasesPlanilhaPerspectiva() {
  return []
    .concat(
      cfgPersp.COLUNA_LIDERANCA || [],
      cfgPersp.COLUNA_BAIRRO || [],
      cfgPersp.COLUNA_SEGMENTO || [],
      cfgPersp.COLUNA_ORIGEM || [],
      cfgPersp.COLUNA_VOTOS || [],
      cfgPersp.COLUNA_PERSPECTIVA || [],
      cfgPersp.COLUNA_REGIAO || []
    );
}

function mostrarStatus(msg, tipo) {
  statusPainel(el.status, msg, tipo);
}

function resolverColuna(parsed, aliases, indiceFallback) {
  let chave = MobComum.indiceColuna(parsed.colunas, aliases);
  if (!chave && indiceFallback != null) {
    const col = parsed.colunas.find((c) => c.indice === indiceFallback);
    chave = col?.chave || null;
  }
  if (!chave) return null;
  const col = parsed.colunas.find((c) => c.chave === chave);
  return {
    chave,
    chavePlanilha: String(col?.chavePlanilha || chave).trim(),
    indice: col?.indice,
  };
}

function montarMapaColunas(parsed) {
  return {
    apoiador: resolverColuna(parsed, cfgPersp.COLUNA_LIDERANCA, cfgPersp.INDICE_LIDERANCA),
    bairro: resolverColuna(parsed, cfgPersp.COLUNA_BAIRRO, cfgPersp.INDICE_BAIRRO),
    segmento: resolverColuna(parsed, cfgPersp.COLUNA_SEGMENTO, cfgPersp.INDICE_SEGMENTO),
    origem: resolverColuna(parsed, cfgPersp.COLUNA_ORIGEM, cfgPersp.INDICE_ORIGEM),
    voto: resolverColuna(parsed, cfgPersp.COLUNA_VOTOS, cfgPersp.INDICE_VOTOS),
  };
}

function valorLocal(reg) {
  if (MobComum.ehOrigemSegmento({ origem: valorCampo(reg, "origem") })) {
    return valorCampo(reg, "segmento");
  }
  return valorCampo(reg, "bairro");
}

function textoBuscaRegistro(reg) {
  const partes = COLUNAS_TABELA.map((col) => {
    if (col.id === "local") return MobComum.normalizarChave(valorLocal(reg));
    return MobComum.normalizarChave(valorCampo(reg, col.id));
  });
  partes.push(MobComum.normalizarChave(valorCampo(reg, "bairro")));
  partes.push(MobComum.normalizarChave(valorCampo(reg, "segmento")));
  return partes.join(" ");
}

function valorCampo(reg, id) {
  const col = colunasMap[id];
  if (!col) return "";
  return reg.linha[col.chave];
}

function parseRegistros(parsed) {
  colunasMap = montarMapaColunas(parsed);
  chaveRegiao = MobComum.indiceColuna(parsed.colunas, cfgPersp.COLUNA_REGIAO);

  const itens = [];
  parsed.linhas.forEach((linha) => {
    if (!MobComum.linhaTemConteudo(linha)) return;

    const regiao = chaveRegiao ? String(linha[chaveRegiao] ?? "").trim() : "";
    itens.push({
      regiao: regiao || "—",
      regiaoNorm: MobComum.normalizarChave(regiao || "sem regiao"),
      linha,
    });
  });

  return itens;
}

function extrairOpcoesColuna(valores, cfgCol) {
  const map = new Map();
  if (!valores?.length || !cfgCol) return [];

  const col = cfgCol.COLUNA ?? 0;
  const ini = cfgCol.LINHA_INICIO ?? 1;
  const fim = cfgCol.LINHA_FIM ?? valores.length;
  const limite = Math.min(fim, valores.length);

  for (let i = ini - 1; i < limite; i++) {
    const row = valores[i];
    if (!row) continue;
    const texto = String(row[col] ?? "").trim();
    if (!texto) continue;
    map.set(MobComum.normalizarChave(texto), texto);
  }

  return [...map.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

async function carregarOpcoesFormulario() {
  const cfgForm = cfgPersp.OPCOES_FORMULARIO;
  if (!cfgForm) {
    opcoesApoiador = [];
    estruturaFormulario = null;
    return;
  }

  const planilha = cfgForm.PLANILHA || cfgPersp.PLANILHA;
  const [valApoiador, estrutura] = await Promise.all([
    PlanilhaApi.lerValores(planilha, cfgForm.APOIADOR.ABA).catch(() => []),
    MobComum.montarOpcoesEstruturaPorRegional(cfgEstrutura).catch(() => null),
  ]);

  opcoesApoiador = extrairOpcoesColuna(valApoiador, cfgForm.APOIADOR);
  estruturaFormulario = estrutura;
}

function preencherSelectNivelGeral(selectEl, regionais, valorSelecionado) {
  if (!selectEl) return;

  const atual = String(valorSelecionado ?? "").trim();
  const lista = [...(regionais || [])];
  if (
    atual &&
    !lista.some((item) => MobComum.normalizarChave(item.chave) === MobComum.normalizarChave(atual))
  ) {
    lista.push({ chave: atual, rotulo: atual.toLowerCase() });
  }

  selectEl.innerHTML =
    '<option value="">selecione…</option>' +
    lista
      .map((item) => {
        const selected =
          atual && MobComum.normalizarChave(item.chave) === MobComum.normalizarChave(atual)
            ? " selected"
            : "";
        return (
          '<option value="' +
          MobComum.escapeHtml(item.chave) +
          '"' +
          selected +
          ">" +
          MobComum.escapeHtml(item.rotulo) +
          "</option>"
        );
      })
      .join("");
}

function opcoesBairroPorNivelGeral(nivelGeral) {
  if (!estruturaFormulario?.bairrosPorRegional || !nivelGeral) return [];
  const alvo = MobComum.normalizarChave(nivelGeral);
  const regional =
    estruturaFormulario.regionais?.find(
      (item) => MobComum.normalizarChave(item.chave) === alvo
    )?.chave || MobComum.normalizarRegional(nivelGeral, cfgEstrutura);
  return estruturaFormulario.bairrosPorRegional.get(regional) || [];
}

function atualizarSelectRegional(valorSelecionado) {
  const nivel = el.perspNivelGeral?.value || "";
  const bairroAtual =
    valorSelecionado !== undefined
      ? String(valorSelecionado ?? "").trim()
      : el.perspBairro?.value || "";
  preencherSelect(el.perspBairro, opcoesBairroPorNivelGeral(nivel), bairroAtual);
}

function preencherSelect(selectEl, opcoes, valorSelecionado) {
  if (!selectEl) return;

  const atual = String(valorSelecionado ?? "").trim();
  const lista = [...opcoes];
  if (
    atual &&
    !lista.some((item) => MobComum.normalizarChave(item) === MobComum.normalizarChave(atual))
  ) {
    lista.push(atual);
    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  selectEl.innerHTML =
    '<option value="">selecione…</option>' +
    lista
      .map((item) => {
        const selected =
          atual && MobComum.normalizarChave(item) === MobComum.normalizarChave(atual)
            ? " selected"
            : "";
        return (
          '<option value="' +
          MobComum.escapeHtml(item) +
          '"' +
          selected +
          ">" +
          MobComum.escapeHtml(item) +
          "</option>"
        );
      })
      .join("");
}

function origemSegmentoSelecionada() {
  const k = MobComum.normalizarChave(el.perspOrigem?.value || "");
  return k === "segmento" || k.includes("segment");
}

function origemLocalizadoSelecionada() {
  const k = MobComum.normalizarChave(el.perspOrigem?.value || "");
  return k === "localizado" || k.includes("localiz");
}

function desabilitarCamposLocal(limpar) {
  [el.perspNivelGeral, el.perspBairro].forEach((campo) => {
    if (!campo) return;
    if (limpar) campo.value = "";
    campo.disabled = true;
    campo.removeAttribute("required");
  });
  el.perspLocalWrap?.classList.add("mob-persp-campo--inativo");
  if (limpar) preencherSelect(el.perspBairro, [], "");
}

function desabilitarCampoSegmento(limpar) {
  if (!el.perspSegmento) return;
  if (limpar) el.perspSegmento.value = "";
  el.perspSegmento.disabled = true;
  el.perspSegmento.removeAttribute("required");
  el.perspSegmentoWrap?.classList.add("mob-persp-campo--inativo");
}

function atualizarCamposPorOrigem() {
  if (origemSegmentoSelecionada()) {
    desabilitarCamposLocal(true);
    el.perspSegmento.disabled = false;
    el.perspSegmento.setAttribute("required", "required");
    el.perspSegmentoWrap?.classList.remove("mob-persp-campo--inativo");
    return;
  }

  desabilitarCampoSegmento(true);

  if (origemLocalizadoSelecionada()) {
    [el.perspNivelGeral, el.perspBairro].forEach((campo) => {
      if (!campo) return;
      campo.disabled = false;
      campo.setAttribute("required", "required");
    });
    el.perspLocalWrap?.classList.remove("mob-persp-campo--inativo");
    if (el.perspNivelGeral?.value) {
      atualizarSelectRegional();
    } else {
      preencherSelect(el.perspBairro, [], "");
    }
    return;
  }

  desabilitarCamposLocal(false);
}

function montarSelectsFormulario(reg) {
  const apoiador = reg ? String(valorCampo(reg, "apoiador") ?? "").trim() : "";
  const origemSegmento = reg ? MobComum.ehOrigemSegmento({ origem: valorCampo(reg, "origem") }) : false;
  const bairro = reg && !origemSegmento ? String(valorCampo(reg, "bairro") ?? "").trim() : "";
  const segmento = reg && origemSegmento ? String(valorCampo(reg, "segmento") ?? "").trim() : "";

  let nivelGeral = "";
  if (bairro && estruturaFormulario?.regionalPorBairro) {
    nivelGeral = estruturaFormulario.regionalPorBairro.get(MobComum.normalizarChave(bairro)) || "";
  }

  preencherSelect(el.perspApoiador, opcoesApoiador, apoiador);
  preencherSelectNivelGeral(el.perspNivelGeral, estruturaFormulario?.regionais || [], nivelGeral);
  atualizarSelectRegional(bairro);
  if (el.perspSegmento) el.perspSegmento.value = segmento;
}

function classePerspectiva(val) {
  const n = MobComum.parseNumero(val);
  if (n >= 1000) return "mob-persp--alta";
  if (n >= 300) return "mob-persp--media";
  if (n > 0) return "mob-persp--baixa";
  return "";
}

function htmlOrigem(val) {
  const texto = String(val ?? "").trim();
  if (!texto) return "—";
  const k = MobComum.normalizarChave(texto);
  if (k === "localizado" || k.includes("localiz")) {
    return (
      '<span class="mob-persp-origem-icone mob-persp-origem-icone--localizado" title="localizado" aria-label="localizado">' +
      ICONE_LOCAL +
      "</span>"
    );
  }
  if (k === "segmento" || k.includes("segment")) {
    return (
      '<span class="mob-persp-origem-icone mob-persp-origem-icone--segmento" title="segmento" aria-label="segmento">' +
      ICONE_PEOPLE +
      "</span>"
    );
  }
  return MobComum.escapeHtml(texto);
}

function htmlBotoesAcoes() {
  return (
    '<div class="crud-acoes-icones">' +
    '<button type="button" class="crud-acao-icone crud-acao-icone--editar" data-acao="editar" aria-label="editar">' +
    ICONE_EDITAR +
    "</button>" +
    '<button type="button" class="crud-acao-icone crud-acao-icone--excluir" data-acao="excluir" aria-label="excluir">' +
    ICONE_EXCLUIR +
    "</button></div>"
  );
}

function htmlAcoesDesktop() {
  return (
    '<td class="mob-persp-td mob-persp-td--acoes mob-persp-tabela-desktop-col">' +
    htmlBotoesAcoes() +
    "</td>"
  );
}

function htmlAcoesMobile() {
  return (
    '<td class="mob-persp-td mob-persp-td--acoes mob-persp-tabela-mobile-col">' +
    htmlBotoesAcoes() +
    "</td>"
  );
}

function htmlCelulaApoiadorBairroStack(reg) {
  const apoiador = MobComum.exibirValor(valorCampo(reg, "apoiador")) || "—";
  const local = MobComum.exibirValor(valorLocal(reg)) || "—";

  return (
    '<td class="mob-persp-td mob-persp-col-stack mob-persp-tabela-mobile-col">' +
    '<div class="mob-persp-celula-stack">' +
    '<span class="mob-persp-stack-apoiador">' +
    apoiador +
    "</span>" +
    '<span class="mob-persp-stack-bairro">' +
    local +
    "</span></div></td>"
  );
}

function htmlCelula(col, reg) {
  const val = col.id === "local" ? valorLocal(reg) : valorCampo(reg, col.id);
  const clsDesktop =
    col.id === "apoiador" || col.id === "local" ? " mob-persp-tabela-desktop-col" : "";

  if (col.tipo === "local") {
    const exib = MobComum.exibirValor(val) || "—";
    return (
      '<td class="mob-persp-td mob-persp-col-local' +
      clsDesktop +
      '">' +
      exib +
      "</td>"
    );
  }
  if (col.tipo === "origem") {
    return (
      '<td class="mob-persp-td mob-persp-td--origem mob-persp-col-origem' +
      clsDesktop +
      '">' +
      htmlOrigem(val) +
      "</td>"
    );
  }
  if (col.tipo === "perspectiva") {
    const exib = MobComum.exibirValor(val) || "—";
    return (
      '<td class="mob-persp-td mob-persp-td--num mob-persp-col-voto ' +
      classePerspectiva(val) +
      clsDesktop +
      '"><strong>' +
      exib +
      "</strong></td>"
    );
  }
  const exib = MobComum.exibirValor(val) || "—";
  return (
    '<td class="mob-persp-td mob-persp-col-' +
    col.id +
    clsDesktop +
    '">' +
    exib +
    "</td>"
  );
}

function renderizarCabecalhoTabela() {
  if (!el.cabecalhoDesktop || !el.cabecalhoMobile) return;

  el.cabecalhoDesktop.innerHTML =
    COLUNAS_TABELA.map((col) => {
      const clsCentro =
        col.tipo === "origem" || col.tipo === "perspectiva" ? " mob-persp-th--centro" : "";
      const clsDesktop =
        col.id === "apoiador" || col.id === "local" ? " mob-persp-tabela-desktop-col" : "";
      return (
        '<th scope="col" class="mob-persp-th mob-persp-th-' +
        col.id +
        clsCentro +
        clsDesktop +
        '">' +
        MobComum.escapeHtml(col.rotulo) +
        "</th>"
      );
    }).join("") +
    '<th scope="col" class="mob-persp-th mob-persp-th--acoes mob-persp-tabela-desktop-col"><span class="visually-hidden">ações</span></th>';

  el.cabecalhoMobile.innerHTML =
    '<th scope="col" class="mob-persp-th mob-persp-col-stack mob-persp-tabela-mobile-col">' +
    '<div class="mob-persp-th-stack-head">' +
    "<span>apoiador</span><span>bairro / segmento</span></div></th>" +
    '<th scope="col" class="mob-persp-th mob-persp-th--centro mob-persp-th-origem mob-persp-tabela-mobile-col">origem voto</th>' +
    '<th scope="col" class="mob-persp-th mob-persp-th--centro mob-persp-th-voto mob-persp-tabela-mobile-col">voto</th>' +
    '<th scope="col" class="mob-persp-th mob-persp-th--acoes mob-persp-tabela-mobile-col"><span class="visually-hidden">ações</span></th>';
}

function registrosFiltrados() {
  const selecionadas = MobComum.regioesSelecionadas(el.filtroRegioes);
  const busca = MobComum.normalizarChave(el.busca?.value || "");
  let lista = registros;

  if (selecionadas.length && regioesLista.length) {
    lista = lista.filter((r) => selecionadas.includes(r.regiaoNorm));
  }

  if (busca) {
    lista = lista.filter((r) => textoBuscaRegistro(r).includes(busca));
  }
  return lista;
}

function renderizarTabela() {
  const filtrados = registrosFiltrados();
  if (!el.corpoTabela || !el.cabecalhoDesktop || !el.cabecalhoMobile) return;

  const colsOk = COLUNAS_OBRIGATORIAS.every((id) => colunasMap[id]);
  if (!colsOk) {
    el.cabecalhoDesktop.innerHTML = "";
    el.cabecalhoMobile.innerHTML = "";
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-secondary small">não foi possível identificar colunas na planilha.</td></tr>';
    notificarAlturaFrame();
    return;
  }

  renderizarCabecalhoTabela();

  if (!filtrados.length) {
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-secondary small">nenhum registro encontrado.</td></tr>';
    if (el.contador) el.contador.textContent = "0 registros";
    notificarAlturaFrame();
    return;
  }

  el.corpoTabela.innerHTML = filtrados
    .map((reg, idx) => {
      const cells = htmlCelulaApoiadorBairroStack(reg) + COLUNAS_TABELA.map((col) => htmlCelula(col, reg)).join("");
      return '<tr data-idx="' + idx + '">' + cells + htmlAcoesDesktop() + htmlAcoesMobile() + "</tr>";
    })
    .join("");

  if (el.contador) {
    el.contador.textContent = MobComum.fmt.format(filtrados.length) + " registros";
  }
  notificarAlturaFrame();
}

function registroPorIndice(idx) {
  return registrosFiltrados()[Number(idx)];
}

function lerFormulario() {
  const dados = {};
  const segmentoOrigem = origemSegmentoSelecionada();
  const campos = {
    apoiador: el.perspApoiador?.value.trim() || "",
    bairro: segmentoOrigem ? "" : el.perspBairro?.value.trim() || "",
    segmento: segmentoOrigem ? el.perspSegmento?.value.trim() || "" : "",
    origem: el.perspOrigem?.value.trim() || "",
    voto: el.perspVoto?.value.trim() || "",
  };

  Object.keys(campos).forEach((id) => {
    const col = colunasMap[id];
    if (!col) return;
    dados[col.chavePlanilha] = campos[id];
  });
  return dados;
}

function preencherFormulario(reg) {
  montarSelectsFormulario(reg);

  const origem = MobComum.normalizarChave(valorCampo(reg, "origem"));
  if (origem === "localizado" || origem.includes("localiz")) {
    el.perspOrigem.value = "localizado";
  } else if (origem === "segmento" || origem.includes("segment")) {
    el.perspOrigem.value = "segmento";
  } else {
    el.perspOrigem.value = String(valorCampo(reg, "origem") ?? "").trim();
  }

  el.perspVoto.value = String(valorCampo(reg, "voto") ?? "").trim();
  atualizarCamposPorOrigem();
}

function abrirNovo() {
  modoEdicao = null;
  el.modalTitulo.textContent = "inserir registro";
  montarSelectsFormulario(null);
  el.perspOrigem.value = "";
  el.perspVoto.value = "";
  if (el.perspSegmento) el.perspSegmento.value = "";
  atualizarCamposPorOrigem();
  modalRegistro.show();
}

function abrirEditar(reg) {
  if (!reg) return;
  modoEdicao = reg.linha._linha;
  el.modalTitulo.textContent = "editar registro";
  preencherFormulario(reg);
  modalRegistro.show();
}

async function confirmarExcluir(reg) {
  if (!reg?.linha?._linha) return;
  if (!window.confirm("excluir este registro?")) return;

  mostrarStatus("excluindo…", "carregando");
  try {
    const json = await PlanilhaApi.gravar(cfgPersp.PLANILHA, {
      acao: "excluir",
      linha: reg.linha._linha,
      aba: cfgPersp.ABA,
      origem: "mobilizacao-perspectiva",
    });
    if (!json) return;
    mostrarStatus("registro excluído.", "sucesso");
    await carregar();
  } catch (e) {
    mostrarStatus(e.message || "erro ao excluir.", "erro");
  }
}

async function salvarFormulario(evento) {
  evento.preventDefault();
  const dados = lerFormulario();
  const acao = modoEdicao ? "atualizar" : "inserir";

  setSalvandoModal(true);
  try {
    const payload = {
      acao,
      dados,
      aba: cfgPersp.ABA,
      origem: "mobilizacao-perspectiva",
    };
    if (modoEdicao) payload.linha = modoEdicao;

    const json = await PlanilhaApi.gravar(cfgPersp.PLANILHA, payload);
    if (!json) return;

    modalRegistro.hide();
    mostrarStatus(
      modoEdicao ? "registro atualizado." : "registro inserido.",
      "sucesso"
    );
    await carregar();
  } catch (e) {
    mostrarStatus(e.message || "erro ao salvar.", "erro");
  } finally {
    setSalvandoModal(false);
  }
}

function setSalvandoModal(ativo) {
  el.modalSalvando?.classList.toggle("d-none", !ativo);
  el.modalSalvando?.setAttribute("aria-hidden", ativo ? "false" : "true");
  el.modalSalvando?.setAttribute("aria-busy", ativo ? "true" : "false");
  el.form?.querySelectorAll("button").forEach((btn) => {
    btn.disabled = ativo;
  });
  el.form?.querySelectorAll("select, input").forEach((campo) => {
    campo.disabled = ativo;
  });
  if (!ativo) {
    atualizarCamposPorOrigem();
  }
}

function vincularTabela() {
  el.corpoTabela?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const tr = btn.closest("tr");
    const reg = registroPorIndice(tr?.dataset.idx);
    if (!reg) return;

    const acao = btn.dataset.acao;
    if (acao === "editar") abrirEditar(reg);
    if (acao === "excluir") confirmarExcluir(reg);
  });
}

function atualizarFiltroRegioes() {
  const wrap = el.filtroRegioesWrap;
  if (!wrap || !el.filtroRegioes) return;

  if (!chaveRegiao || !regioesLista.length) {
    wrap.classList.add("d-none");
    el.filtroRegioes.innerHTML = "";
    return;
  }

  wrap.classList.remove("d-none");
  MobComum.montarFiltroRegioes(el.filtroRegioes, regioesLista, renderizarTabela);
}

async function carregar() {
  if (!MobComum.configValida()) {
    mostrarStatus("configure WEB_APP_URL em js/config.js e publique o Apps Script.", "erro");
    return;
  }

  mostrarStatus("carregando perspectiva…", "carregando");
  try {
    const [parsed] = await Promise.all([
      MobComum.carregarPlanilhaComCabecalho(
        cfgPersp.PLANILHA,
        cfgPersp.ABA,
        aliasesPlanilhaPerspectiva(),
        cfgPersp.LINHA_INICIO_DADOS
      ),
      carregarOpcoesFormulario(),
    ]);
    registros = parseRegistros(parsed);
    regioesLista = MobComum.ordenarRegioes(
      registros.map((r) => r.regiao).filter((r) => r && r !== "—"),
      cfgPersp.ORDEM_REGIOES
    );
    atualizarFiltroRegioes();
    mostrarStatus("", null);
    renderizarTabela();
  } catch (e) {
    mostrarStatus(e.message || "erro ao carregar perspectiva.", "erro");
  }
}

function init() {
  AUTH.exigir();
  el = {
    status: document.getElementById("status"),
    filtroRegioesWrap: document.getElementById("filtroRegioesWrap"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    busca: document.getElementById("buscaPerspectiva"),
    cabecalhoDesktop: document.getElementById("cabecalhoPerspectivaDesktop"),
    cabecalhoMobile: document.getElementById("cabecalhoPerspectivaMobile"),
    corpoTabela: document.getElementById("corpoPerspectiva"),
    contador: document.getElementById("contadorPerspectiva"),
    btnInserir: document.getElementById("btnPerspInserir"),
    form: document.getElementById("formPerspectiva"),
    modalTitulo: document.getElementById("modalPerspectivaTitulo"),
    modalSalvando: document.getElementById("perspModalSalvando"),
    perspApoiador: document.getElementById("perspApoiador"),
    perspLocalWrap: document.getElementById("perspLocalWrap"),
    perspNivelGeral: document.getElementById("perspNivelGeral"),
    perspBairro: document.getElementById("perspBairro"),
    perspSegmentoWrap: document.getElementById("perspSegmentoWrap"),
    perspSegmento: document.getElementById("perspSegmento"),
    perspOrigem: document.getElementById("perspOrigem"),
    perspVoto: document.getElementById("perspVoto"),
  };

  const modalEl = document.getElementById("modalPerspectiva");
  if (modalEl && typeof bootstrap !== "undefined") {
    modalRegistro = bootstrap.Modal.getOrCreateInstance(modalEl);
  }

  PageLoader.init("pageLoader");
  el.busca?.addEventListener("input", renderizarTabela);
  el.btnInserir?.addEventListener("click", abrirNovo);
  el.perspOrigem?.addEventListener("change", atualizarCamposPorOrigem);
  el.perspNivelGeral?.addEventListener("change", () => {
    atualizarSelectRegional("");
  });
  el.form?.addEventListener("submit", salvarFormulario);
  vincularTabela();
  carregar();
}

window.atualizarPagina = carregar;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
