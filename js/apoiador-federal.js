// Página apoiador federal: liderança, município, federal + filtro por região.

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.PESSOAL;
const cfgAf = cfg.APOIADOR_FEDERAL;
const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
const COLS_TABELA = 3;
const COLS_TABELA_RESUMO = 3;

const CAMPOS_PLANILHA = [
  { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
  { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
  { prop: "federal", chave: "FEDERAL", aliases: ["federal", "apoiador federal", "deputado federal"] },
];

let el = {};
let linhas = [];
let regioes = [];
let mapaMunicipioRegiao = new Map();
let nomesColunaPlanilha = {};
let opcoesFederal = [];
let modalCrud = null;
let modoCrud = "inserir";
let linhaCrud = null;

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
}

function dadosGravacaoFederal(item, somenteFederal) {
  const dados = {};
  if (somenteFederal) {
    const chave = nomesColunaPlanilha.federal;
    if (chave) dados[chave] = item.federal ?? "";
    return dados;
  }
  CAMPOS_PLANILHA.forEach((campo) => {
    const chave = nomesColunaPlanilha[campo.prop];
    if (chave) dados[chave] = item[campo.prop] ?? "";
  });
  return dados;
}

function itemPorLinha(numLinha) {
  return linhas.find((r) => r._linha === numLinha) || null;
}

function urlConsultaAba(planilha, aba) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  const nomeAba = aba || cfg.ABA;
  if (nomeAba) url.searchParams.set("aba", nomeAba);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function fetchAba(planilha, aba) {
  const resp = await fetch(urlConsultaAba(planilha, aba), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

function extrairOpcoesFederal(valores) {
  const p = cfgAf.PARAMETROS;
  const mapa = new Map();
  if (!valores?.length) return [];

  for (let i = p.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const nome = String(valores[i]?.[p.COLUNA_FEDERAL] ?? "").trim();
    if (!nome) continue;
    const chave = normalizarChave(nome);
    if (!mapa.has(chave)) mapa.set(chave, nome);
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function montarSelectFederal(valorSelecionado) {
  if (!el.campoFederal) return;
  const atual = String(valorSelecionado ?? "").trim();
  const chaves = new Set(opcoesFederal.map((n) => normalizarChave(n)));
  const lista = [...opcoesFederal];
  if (atual && !chaves.has(normalizarChave(atual))) lista.push(atual);

  lista.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  el.campoFederal.innerHTML =
    '<option value="">selecione</option>' +
    lista
      .map((nome) => {
        const sel = atual && normalizarChave(nome) === normalizarChave(atual) ? " selected" : "";
        return `<option value="${escapeHtml(nome)}"${sel}>${escapeHtml(nome)}</option>`;
      })
      .join("");
}

async function carregarOpcoesFederal() {
  const p = cfgAf.PARAMETROS;
  try {
    const valores = await fetchAba(p.PLANILHA, p.ABA);
    opcoesFederal = extrairOpcoesFederal(valores || []);
  } catch {
    opcoesFederal = [];
  }
}

function abrirModalIncluirAfederal() {
  modoCrud = "inserir";
  linhaCrud = null;
  el.modalTitulo.textContent = "incluir registro";
  el.camposIdent.classList.remove("d-none");
  el.resumoIdent.classList.add("d-none");
  el.campoLideranca.value = "";
  el.campoMunicipio.value = "";
  montarSelectFederal("");
  modalCrud.show();
}

function abrirModalEditarAfederal(numLinha) {
  const item = itemPorLinha(numLinha);
  if (!item) return;
  modoCrud = "atualizar";
  linhaCrud = numLinha;
  el.modalTitulo.textContent = "editar federal";
  el.camposIdent.classList.add("d-none");
  el.resumoIdent.classList.remove("d-none");
  el.resumoLideranca.textContent = String(item.lideranca ?? "").trim();
  el.resumoMunicipio.textContent = String(item.municipio ?? "").trim();
  montarSelectFederal(item.federal);
  modalCrud.show();
}

async function salvarAfederalCrud() {
  const federal = el.campoFederal.value.trim();
  if (!federal) {
    MasterCrud.toast("preencha o federal.", "erro");
    return;
  }

  MasterCrud.salvando(el.modalEl, true, { btnSalvar: el.btnSalvar });
  try {
    if (modoCrud === "inserir") {
      const lideranca = el.campoLideranca.value.trim();
      const municipio = el.campoMunicipio.value.trim();
      if (!lideranca || !municipio) {
        MasterCrud.toast("preencha liderança e município.", "erro");
        return;
      }
      await PlanilhaApi.gravar(cfgAf.PLANILHA, {
        acao: "inserir",
        dados: dadosGravacaoFederal({ lideranca, municipio, federal }, false),
        origem: "pessoal-apoiador-federal",
      });
      MasterCrud.toast("registro incluído.", "sucesso");
    } else {
      await PlanilhaApi.gravar(cfgAf.PLANILHA, {
        acao: "atualizar",
        linha: linhaCrud,
        dados: dadosGravacaoFederal({ federal }, true),
        origem: "pessoal-apoiador-federal",
      });
      MasterCrud.toast("federal atualizado.", "sucesso");
    }
    modalCrud.hide();
    await carregar();
  } catch (e) {
    MasterCrud.toast("erro ao salvar: " + e.message, "erro");
  } finally {
    MasterCrud.salvando(el.modalEl, false, { btnSalvar: el.btnSalvar });
  }
}

async function excluirAfederalCrud(numLinha) {
  if (!itemPorLinha(numLinha) || !(await MasterCrud.confirmarExclusao())) return;
  try {
    await PlanilhaApi.gravar(cfgAf.PLANILHA, {
      acao: "excluir",
      linha: numLinha,
      origem: "pessoal-apoiador-federal",
    });
    MasterCrud.toast("registro excluído.", "sucesso");
    await carregar();
  } catch (e) {
    MasterCrud.toast("erro ao excluir: " + e.message, "erro");
  }
}

function aoClicarTabelaAfederal(e) {
  const btn = e.target.closest(MasterCrud.seletorAcao);
  if (!btn) return;
  e.stopPropagation();
  const numLinha = Number(btn.dataset.linha);
  if (!numLinha) return;
  if (btn.dataset.acao === "editar") abrirModalEditarAfederal(numLinha);
  if (btn.dataset.acao === "excluir") excluirAfederalCrud(numLinha);
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
    if (idx === -1 && cfgAf.COLUNAS[campo.chave] != null) {
      idx = cfgAf.COLUNAS[campo.chave];
    }
    indices[campo.prop] = idx;
  });

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
  if (n > 0 || s === "0") return fmt.format(n);
  return escapeHtml(s);
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
      '<span class="text-secondary small">nenhuma micro-região encontrada.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "af-regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
    const label = document.createElement("label");
    label.className = "dashboard-filtro-item dashboard-filtro-cor--" + indiceCorRegiao(reg.norm);
    label.innerHTML =
      `<input type="checkbox" class="visually-hidden" id="${id}" value="${escapeHtml(reg.norm)}" checked>` +
      `<span class="dashboard-filtro-badge">${escapeHtml(reg.rotulo)}</span>`;
    el.filtroRegioes.appendChild(label);
  });

  el.filtroRegioes.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", renderizarTudo);
  });
}

function termoBuscaLideranca() {
  return normalizarChave(el.buscaLideranca?.value);
}

function linhasFiltradasPorRegiao() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];

  const todasMarcadas = selecionadas.length === regioes.length;

  return linhas.filter((item) => {
    if (item.regiaoNorm) {
      if (!selecionadas.includes(item.regiaoNorm)) return false;
    } else if (!todasMarcadas) {
      return false;
    }
    return true;
  });
}

function linhasFiltradas() {
  const termo = termoBuscaLideranca();
  return linhasFiltradasPorRegiao().filter((item) => {
    if (
      termo &&
      !itemCombinaBuscaMulticampo(item, termo, ["lideranca", "municipio", "federal"], normalizarChave)
    ) {
      return false;
    }
    return true;
  });
}

function agruparPorFederal(filtradas) {
  const mapa = new Map();

  filtradas.forEach((r) => {
    const federal = String(r.federal ?? "").trim();
    if (!federal) return;

    const chave = normalizarChave(federal);
    if (!mapa.has(chave)) {
      mapa.set(chave, { federal, liderancas: new Map(), qtde: 0 });
    }

    const grupo = mapa.get(chave);
    grupo.qtde++;

    const lideranca = String(r.lideranca ?? "").trim();
    if (lideranca) {
      const chaveLideranca = normalizarChave(lideranca);
      if (!grupo.liderancas.has(chaveLideranca)) {
        grupo.liderancas.set(chaveLideranca, lideranca);
      }
    }
  });

  return Array.from(mapa.values())
    .map((grupo) => ({
      federal: grupo.federal,
      qtde: grupo.qtde,
      liderancas: Array.from(grupo.liderancas.values()).sort((a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base" })
      ),
    }))
    .sort((a, b) => a.federal.localeCompare(b.federal, "pt-BR", { sensitivity: "base" }));
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
  return CAMPOS_PLANILHA.some((c) => celulaPreenchida(item[c.prop]));
}

function extrairLinhas(valores) {
  if (!valores?.length) return [];

  const indices = resolverIndices(valores[0]);
  const itens = [];

  for (let i = cfgAf.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha) continue;

    const municipio = String(valorCampo(linha, indices.municipio) ?? "").trim();
    const info = municipio ? mapaMunicipioRegiao.get(normalizarChave(municipio)) : null;

    const item = {
      _linha: i + 1,
      lideranca: valorCampo(linha, indices.lideranca),
      municipio,
      federal: valorCampo(linha, indices.federal),
      regiao: info?.regiao || "",
      regiaoNorm: info?.regiaoNorm || "",
    };

    if (!linhaTemConteudo(item)) continue;
    itens.push(item);
  }

  itens.sort(ordenarPorLideranca);
  return itens;
}

function somarFederal(filtradas) {
  const set = new Set();
  filtradas.forEach((r) => {
    const s = String(r.federal ?? "").trim();
    if (s) set.add(normalizarChave(s));
  });
  return set.size;
}

function atualizarKpis(filtradas) {
  el.kpiRegistros.textContent = fmt.format(filtradas.length);
  el.kpiFederal.textContent = fmt.format(somarFederal(filtradas));
}

function limparKpis() {
  el.kpiRegistros.textContent = "—";
  el.kpiFederal.textContent = "—";
}

function zerarKpis() {
  el.kpiRegistros.textContent = fmt.format(0);
  el.kpiFederal.textContent = fmt.format(0);
}

function largurasColunasAfederal() {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  if (mobile) {
    return {
      "apoiadores-col-ident": "58%",
      "apoiadores-col-municipio": "0",
      "apoiadores-col-lider": "42%",
    };
  }
  return {
    "apoiadores-col-ident": "34%",
    "apoiadores-col-municipio": "34%",
    "apoiadores-col-lider": "32%",
  };
}

function sincronizarLargurasColunas(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 991.98px)").matches;
  const larguras = largurasColunasAfederal();
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
  const panel = document.querySelector("#painelAfDetalhe .dashboard-tabela-panel");
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

  sincronizarLargurasColunas(headTable, bodyTable);
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function renderizarLinha(r) {
  const corIdx = indiceCorRegiao(r.regiaoNorm);
  const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
  const municipioHtml = escapeHtml(r.municipio);
  const liderancaHtml = exibirTexto(r.lideranca);
  const acoesMaster = MasterCrud.acoesLinha(r._linha);
  const municipioSub = r.municipio
    ? `<span class="apoiadores-sub-municipio">${municipioHtml}</span>`
    : "";

  return `<tr>
    <td class="apoiadores-col-ident">
      <span class="apoiadores-celula-desktop apoiadores-celula-texto">
        <span class="apoiadores-celula-texto-wrap">${liderancaHtml}${acoesMaster}</span>
      </span>
      <span class="apoiadores-celula-mobile">
        <span class="dashboard-municipio-celula">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
          <span class="dashboard-municipio-texto">
            <span class="dashboard-municipio-nome apoiadores-celula-texto-wrap">${liderancaHtml || municipioHtml}${acoesMaster}</span>
            ${municipioSub}
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
    <td class="apoiadores-col-lider apoiadores-celula-texto">${exibirTexto(r.federal)}</td>
  </tr>`;
}

function renderizarLinhaResumo(grupo) {
  const liderancasHtml = grupo.liderancas.length
    ? grupo.liderancas.map((nome) => escapeHtml(nome)).join(", ")
    : "";

  return `<tr>
    <td class="afederal-resumo-col-federal apoiadores-celula-texto">${exibirTexto(grupo.federal)}</td>
    <td class="text-end afederal-resumo-col-qtde apoiadores-celula-num">${fmt.format(grupo.qtde)}</td>
    <td class="afederal-resumo-col-liderancas apoiadores-celula-texto">${liderancasHtml}</td>
  </tr>`;
}

function renderizarTabelaResumo() {
  const selecionadas = regioesSelecionadas();
  const filtradas = linhasFiltradasPorRegiao();
  const grupos = agruparPorFederal(filtradas);

  if (!linhas.length) {
    el.corpoResumo.innerHTML =
      `<tr><td colspan="${COLS_TABELA_RESUMO}" class="text-center text-secondary py-4">nenhum registro na planilha.</td></tr>`;
    return;
  }

  if (!selecionadas.length) {
    el.corpoResumo.innerHTML =
      `<tr><td colspan="${COLS_TABELA_RESUMO}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    return;
  }

  if (!grupos.length) {
    el.corpoResumo.innerHTML =
      `<tr><td colspan="${COLS_TABELA_RESUMO}" class="text-center text-secondary py-4">nenhum federal para os filtros selecionados.</td></tr>`;
    return;
  }

  el.corpoResumo.innerHTML = grupos.map(renderizarLinhaResumo).join("");
}

function renderizarTudo() {
  renderizarTabela();
  renderizarTabelaResumo();
  aposRenderTabela();
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtradas = [...linhasFiltradas()].sort(ordenarPorLideranca);

  el.vazio.hidden = true;

  if (!linhas.length) {
    limparKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">nenhum registro na planilha.</td></tr>`;
    return;
  }

  if (!selecionadas.length) {
    zerarKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">selecione ao menos uma micro-região</td></tr>`;
    return;
  }

  if (!filtradas.length) {
    zerarKpis();
    el.corpo.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">nenhum registro para os filtros selecionados.</td></tr>`;
    return;
  }

  atualizarKpis(filtradas);
  el.corpo.innerHTML = filtradas.map(renderizarLinha).join("");
}

function montar(valores) {
  atualizarMetadadosPlanilha(valores);
  linhas = extrairLinhas(valores);
  montarFiltros(extrairRegioes(linhas));
  renderizarTudo();
}

async function carregar() {
  if (!configValida()) {
    mostrarStatus("configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("carregando apoiador federal...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valores, valoresMunicipios] = await Promise.all([
      fetchPlanilha(cfgAf.PLANILHA),
      fetchPlanilha(cfgMun.PLANILHA).catch(() => []),
      carregarOpcoesFederal(),
    ]);

    if (valores === null) {
      limparStatus();
      return;
    }

    mapaMunicipioRegiao = montarMapaMunicipios(valoresMunicipios || []);
    montar(valores);
    limparStatus();
  } catch (e) {
    mostrarStatus("erro ao carregar: " + e.message, "erro");
    el.corpo.innerHTML = "";
    el.corpoResumo.innerHTML = "";
    el.vazio.hidden = true;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregar;

function htmlCardsRelatorioPagina(doc) {
  const root = doc || document;
  const grid = root.querySelector(".afederal-kpi-grid");
  if (!grid) return "";

  const clone = grid.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  return (
    '<section class="rel-secao rel-secao-indicadores"><h2>indicadores</h2>' +
    '<div class="rel-afederal-kpis">' +
    clone.outerHTML +
    "</div></section>"
  );
}

function coletarTabelasRelatorioPagina(doc) {
  const Rel = window.Relatorio;
  if (!Rel) return [];

  const root = doc || document;
  const blocos = [];

  const painelDetalhe = root.querySelector("#painelAfDetalhe .dashboard-tabela-panel");
  if (painelDetalhe) {
    const mesclada = Rel.mesclarTabelaDashboard(painelDetalhe);
    if (mesclada) {
      blocos.push({
        titulo: "federal por liderança",
        html: Rel.htmlTabelaClonada(mesclada),
      });
    }
  }

  const painelResumo = root.querySelector("#painelAfResumo .dashboard-tabela-panel");
  if (painelResumo) {
    const tabela = painelResumo.querySelector("table");
    if (tabela) {
      blocos.push({
        titulo: "por federal",
        html: Rel.htmlTabelaClonada(tabela),
      });
    }
  }

  return blocos;
}

function estilosRelatorioPagina() {
  return (
    ".page-apoiador-federal .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;}" +
    ".page-apoiador-federal .rel-secao h2{margin-bottom:0.3rem;padding-bottom:0.15rem;}" +
    ".page-apoiador-federal .rel-secao-indicadores{margin-bottom:0.25rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-apoiador-federal .rel-secao + .rel-secao + .rel-secao," +
    ".page-apoiador-federal .rel-secao + .rel-secao + .rel-secao + .rel-secao{" +
    "page-break-before:avoid;break-before:avoid-page;margin-top:0.2rem;}" +
    ".page-apoiador-federal .rel-afederal-kpis{margin-top:0.2rem;}" +
    ".page-apoiador-federal .rel-afederal-kpis > .afederal-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}" +
    ".page-apoiador-federal .rel-afederal-kpis .apoiadores-kpi-slot{min-width:0;}" +
    ".page-apoiador-federal .rel-afederal-kpis .dashboard-kpi-card{border-radius:8px;overflow:hidden;page-break-inside:avoid;box-shadow:none;border:1px solid rgba(31,78,140,0.14);}" +
    ".page-apoiador-federal .rel-afederal-kpis .dashboard-kpi-card .card-body{padding:0.35rem 0.3rem;text-align:center;}" +
    ".page-apoiador-federal .rel-afederal-kpis .dashboard-kpi-rotulo{font-size:7pt;font-weight:600;color:#64748b;margin-bottom:0.1rem;line-height:1.15;}" +
    ".page-apoiador-federal .rel-afederal-kpis .dashboard-kpi-valor{font-size:9pt;font-weight:700;line-height:1.1;color:#1e293b;}" +
    ".page-apoiador-federal .rel-afederal-kpis .apoiadores-kpi-total .dashboard-kpi-card{border-left:3px solid #1f4e8c!important;}" +
    ".page-apoiador-federal .rel-afederal-kpis .apoiadores-kpi-lider .dashboard-kpi-card{border-left:3px solid #4f46e5!important;}"
  );
}

window.htmlCardsRelatorioPagina = htmlCardsRelatorioPagina;
window.coletarTabelasRelatorioPagina = coletarTabelasRelatorioPagina;
window.estilosRelatorioPagina = estilosRelatorioPagina;

function init() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    buscaLideranca: document.getElementById("buscaLideranca"),
    corpo: document.getElementById("corpoTabela"),
    corpoResumo: document.getElementById("corpoTabelaResumo"),
    vazio: document.getElementById("vazio"),
    kpiRegistros: document.getElementById("kpiRegistros"),
    kpiFederal: document.getElementById("kpiFederal"),
    btnIncluir: document.getElementById("btnIncluirAfederal"),
    btnSalvar: document.getElementById("btnSalvarAfederal"),
    modalTitulo: document.getElementById("modalAfederalTitulo"),
    modalEl: document.getElementById("modalAfederalCrud"),
    camposIdent: document.getElementById("afederalCamposIdent"),
    resumoIdent: document.getElementById("afederalResumoIdent"),
    resumoLideranca: document.getElementById("afederalResumoLideranca"),
    resumoMunicipio: document.getElementById("afederalResumoMunicipio"),
    campoLideranca: document.getElementById("campoAfLideranca"),
    campoMunicipio: document.getElementById("campoAfMunicipio"),
    campoFederal: document.getElementById("campoAfFederal"),
  };
  if (!el.corpo || !el.corpoResumo || !el.filtroRegioes) return;

  MasterCrud.aplicarVisibilidadeIncluir("btnIncluirAfederal");
  if (el.modalEl) modalCrud = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  el.btnIncluir?.addEventListener("click", abrirModalIncluirAfederal);
  el.btnSalvar?.addEventListener("click", salvarAfederalCrud);
  el.corpo.addEventListener("click", aoClicarTabelaAfederal);

  el.buscaLideranca?.addEventListener("input", renderizarTudo);
  document.querySelectorAll('#afederalTabs button[data-bs-toggle="tab"]').forEach((btn) => {
    btn.addEventListener("shown.bs.tab", () => {
      alinharColunasTabela();
      notificarAlturaFrame();
    });
  });
  window.addEventListener("resize", alinharColunasTabela);
  PageLoader.init("pageLoader");
  alinharColunasTabela();
  carregar();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", init);
