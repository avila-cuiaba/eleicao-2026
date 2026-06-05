// Página pessoal: equipe por município (planilhas pessoal-municipio + apoiadores).

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.PESSOAL;

let el = {};
let registros = [];
let regioes = [];

const COLS_TABELA = 7;

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

function celula(valores, linha1, col0) {
  const linha = valores[linha1 - 1];
  if (!linha) return "";
  return linha[col0];
}

function normalizarRegiao(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarMunicipio(texto) {
  return normalizarRegiao(texto);
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlConsulta(planilha) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", planilha);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function textoPreenchido(v) {
  return String(v ?? "").trim() !== "";
}

function exibirTexto(val) {
  const s = String(val ?? "").trim();
  return s ? escapeHtml(s) : "";
}

function exibirNumero(val) {
  const n = parseNumero(val);
  return n ? fmt.format(n) : "";
}

function exibirApoiadores(r) {
  if (r.apoiadores > 0) return fmt.format(r.apoiadores);
  return exibirTexto(r.apoiadoresTexto);
}

function exibirCelulaPessoal(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = parseNumero(val);
  if (n > 0) return fmt.format(n);
  return escapeHtml(s);
}

function valorApoiadores(val) {
  const n = parseNumero(val);
  if (n > 0) return n;
  return textoPreenchido(val) ? 1 : 0;
}

function contagemApoiadoresPorMunicipio(valores) {
  const mapa = new Map();
  if (!valores?.length) return mapa;

  const colMun = cfg.APOIADORES.COLUNAS.MUNICIPIO;
  for (let linha = cfg.APOIADORES.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, colMun) ?? "").trim();
    if (!municipio) continue;
    const chave = normalizarMunicipio(municipio);
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }
  return mapa;
}

function extrairRegistros(valores, contagemApoiadores) {
  const cols = cfg.COLUNAS;
  const itens = [];

  for (let linha = cfg.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiaoBruta = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    const municipioNorm = normalizarMunicipio(municipio);
    let apoiadores = valorApoiadores(celula(valores, linha, cols.APOIADORES));
    if (!apoiadores && contagemApoiadores.has(municipioNorm)) {
      apoiadores = contagemApoiadores.get(municipioNorm);
    }

    itens.push({
      municipio,
      municipioNorm,
      regiao: regiaoBruta,
      regiaoNorm: normalizarRegiao(regiaoBruta),
      ideal: parseNumero(celula(valores, linha, cols.IDEAL)),
      prefeito: celula(valores, linha, cols.PREFEITO),
      vereador: celula(valores, linha, cols.VEREADOR),
      agentePolitico: celula(valores, linha, cols.AGENTE_POLITICO),
      assessor: celula(valores, linha, cols.ASSESSOR),
      apoiadores,
      apoiadoresTexto: celula(valores, linha, cols.APOIADORES),
    });
  }

  return itens;
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
      '<span class="text-secondary small">Nenhuma micro-região encontrada na planilha.</span>';
    return;
  }

  listaRegioes.forEach((reg) => {
    const id = "regiao-" + reg.norm.replace(/[^a-z0-9]+/g, "-");
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

function registrosFiltrados() {
  const selecionadas = regioesSelecionadas();
  if (!selecionadas.length) return [];
  return registros.filter((r) => selecionadas.includes(r.regiaoNorm));
}

function totalColunaPessoal(filtrados, campo) {
  return filtrados.reduce((acc, r) => {
    const raw = r[campo];
    const n = parseNumero(raw);
    if (n > 0) return acc + n;
    if (textoPreenchido(raw)) return acc + 1;
    return acc;
  }, 0);
}

function totalApoiadores(filtrados) {
  return filtrados.reduce((acc, r) => acc + r.apoiadores, 0);
}

function totalVotacaoIdeal(filtrados) {
  return filtrados.reduce((acc, r) => acc + (r.ideal || 0), 0);
}

function atualizarResumo(filtrados) {
  const totalPrefeito = totalColunaPessoal(filtrados, "prefeito");
  const totalVereador = totalColunaPessoal(filtrados, "vereador");
  const totalAgente = totalColunaPessoal(filtrados, "agentePolitico");
  const totalAssessor = totalColunaPessoal(filtrados, "assessor");
  const totalApoiad = totalApoiadores(filtrados);
  const totalIdeal = totalVotacaoIdeal(filtrados);

  el.kpiIdeal.textContent = fmt.format(totalIdeal);
  el.kpiPrefeito.textContent = fmt.format(totalPrefeito);
  el.kpiVereador.textContent = fmt.format(totalVereador);
  el.kpiAgente.textContent = fmt.format(totalAgente);
  el.kpiAssessor.textContent = fmt.format(totalAssessor);
  el.kpiApoiadores.textContent = fmt.format(totalApoiad);

  const somaPv = fmt.format(totalPrefeito + totalVereador);
  const somaAa = fmt.format(totalAgente + totalAssessor);
  const apoiadFmt = fmt.format(totalApoiad);
  el.kpiSomaPrefeitoVereador.textContent = somaPv;
  el.kpiSomaAgenteAssessor.textContent = somaAa;
  el.kpiApoiadoresSm.textContent = apoiadFmt;
}

function limparResumo() {
  const vazio = "—";
  el.kpiIdeal.textContent = vazio;
  el.kpiPrefeito.textContent = vazio;
  el.kpiVereador.textContent = vazio;
  el.kpiAgente.textContent = vazio;
  el.kpiAssessor.textContent = vazio;
  el.kpiApoiadores.textContent = vazio;
  el.kpiSomaPrefeitoVereador.textContent = vazio;
  el.kpiSomaAgenteAssessor.textContent = vazio;
  el.kpiApoiadoresSm.textContent = vazio;
}

function alinharColunasTabela() {
  const headWrap = document.querySelector(".dashboard-tabela-head");
  const bodyScroll = document.querySelector(".dashboard-tabela-body-scroll");
  const headTable = headWrap?.querySelector("table");
  const bodyTable = bodyScroll?.querySelector("table");
  if (!headWrap || !bodyScroll || !headTable || !bodyTable) return;

  headTable.style.width = "100%";
  bodyTable.style.width = "100%";

  const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
  headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";

  sincronizarLargurasColunasPessoal(headTable, bodyTable);
}

function sincronizarLargurasColunasPessoal(headTable, bodyTable) {
  const mobile = window.matchMedia("(max-width: 575.98px)").matches;
  const largurasMobile = {
    "pessoal-col-municipio": "34%",
    "pessoal-col-ideal": "0",
    "pessoal-col-prefeito": "16.5%",
    "pessoal-col-vereador": "16.5%",
    "pessoal-col-agente": "16.5%",
    "pessoal-col-assessor": "0",
    "pessoal-col-apoiadores": "16.5%",
  };

  [headTable, bodyTable].forEach((table) => {
    table.querySelectorAll("colgroup col").forEach((col) => {
      const cls = Array.from(col.classList).find((c) => c.startsWith("pessoal-col-"));
      if (mobile && cls && largurasMobile[cls] != null) {
        col.style.width = largurasMobile[cls];
      } else {
        col.style.width = "";
      }
    });
  });
}

function aposRenderTabela() {
  requestAnimationFrame(() => {
    alinharColunasTabela();
    notificarAlturaFrame();
    requestAnimationFrame(alinharColunasTabela);
  });
}

function renderizarTabela() {
  const selecionadas = regioesSelecionadas();
  const filtrados = registrosFiltrados();

  if (!registros.length) {
    limparResumo();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum município na planilha.</td></tr>`;
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    limparResumo();
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Selecione ao menos uma micro-região.</td></tr>`;
    aposRenderTabela();
    return;
  }

  atualizarResumo(filtrados);

  if (!filtrados.length) {
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-secondary py-4">Nenhum município para os filtros selecionados.</td></tr>`;
    aposRenderTabela();
    return;
  }

  el.corpoTabela.innerHTML = filtrados
    .map((r) => {
      const corIdx = indiceCorRegiao(r.regiaoNorm);
      const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
      const idealHtml = r.ideal
        ? `<span class="pessoal-badge-ideal">${fmt.format(r.ideal)}</span>`
        : "";

      return `<tr>
        <td class="pessoal-col-municipio">
          <span class="dashboard-municipio-celula">
            <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
            <span class="dashboard-municipio-texto">
              <span class="dashboard-municipio-nome">${escapeHtml(r.municipio)}</span>
              ${idealHtml}
            </span>
          </span>
        </td>
        <td class="text-end pessoal-col-ideal pessoal-col-lg-only">${exibirNumero(r.ideal)}</td>
        <td class="text-end pessoal-col-prefeito pessoal-celula-num">${exibirCelulaPessoal(r.prefeito)}</td>
        <td class="text-end pessoal-col-vereador pessoal-celula-num">${exibirCelulaPessoal(r.vereador)}</td>
        <td class="text-end pessoal-col-agente pessoal-celula-num">${exibirCelulaPessoal(r.agentePolitico)}</td>
        <td class="text-end pessoal-col-assessor pessoal-col-lg-only pessoal-celula-num">${exibirCelulaPessoal(r.assessor)}</td>
        <td class="text-end pessoal-col-apoiadores">${exibirApoiadores(r)}</td>
      </tr>`;
    })
    .join("");

  aposRenderTabela();
}

function montar(valoresMunicipio, valoresApoiadores) {
  const contagem = contagemApoiadoresPorMunicipio(valoresApoiadores);
  registros = extrairRegistros(valoresMunicipio, contagem);
  montarFiltros(extrairRegioes(registros));
  renderizarTabela();
}

async function fetchPlanilha(planilha) {
  const resp = await fetch(urlConsulta(planilha), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
  return json.valores || [];
}

async function carregarPessoal() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const [valoresMunicipio, valoresApoiadores] = await Promise.all([
      fetchPlanilha(cfg.PLANILHA),
      fetchPlanilha(cfg.PLANILHA_APOIADORES).catch(() => []),
    ]);

    if (valoresMunicipio === null) {
      limparStatus();
      return;
    }

    montar(valoresMunicipio, valoresApoiadores || []);
    limparStatus();
    aposRenderTabela();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    el.corpoTabela.innerHTML =
      `<tr><td colspan="${COLS_TABELA}" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>`;
  } finally {
    notificarAlturaFrame();
  }
}

window.atualizarPagina = carregarPessoal;

function initPessoal() {
  el = {
    status: document.getElementById("status"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    corpoTabela: document.getElementById("corpoTabela"),
    kpiIdeal: document.getElementById("kpiIdeal"),
    kpiPrefeito: document.getElementById("kpiPrefeito"),
    kpiVereador: document.getElementById("kpiVereador"),
    kpiAgente: document.getElementById("kpiAgente"),
    kpiAssessor: document.getElementById("kpiAssessor"),
    kpiApoiadores: document.getElementById("kpiApoiadores"),
    kpiSomaPrefeitoVereador: document.getElementById("kpiSomaPrefeitoVereador"),
    kpiSomaAgenteAssessor: document.getElementById("kpiSomaAgenteAssessor"),
    kpiApoiadoresSm: document.getElementById("kpiApoiadoresSm"),
  };
  if (!el.corpoTabela) return;

  window.addEventListener("resize", alinharColunasTabela);
  requestAnimationFrame(() => notificarAlturaFrame());
  carregarPessoal();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initPessoal);
