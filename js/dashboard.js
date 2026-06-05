// Dashboard: municípios da planilha "votacao" filtrados por micro-região (coluna C).

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.DASHBOARD;

let el = {};
let registros = [];
let regioes = [];

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

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", cfg.PLANILHA);
  if (cfg.ABA) url.searchParams.set("aba", cfg.ABA);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function extrairRegistros(valores) {
  const cols = cfg.COLUNAS;
  const itens = [];

  for (let linha = cfg.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiaoBruta = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    itens.push({
      municipio,
      regiao: regiaoBruta,
      regiaoNorm: normalizarRegiao(regiaoBruta),
      populacao: parseNumero(celula(valores, linha, cols.POPULACAO)),
      eleitores: parseNumero(celula(valores, linha, cols.ELEITORES)),
      votos2022: parseNumero(celula(valores, linha, cols.VOTOS_2022)),
      minima: parseNumero(celula(valores, linha, cols.MINIMA)),
      ideal: parseNumero(celula(valores, linha, cols.IDEAL)),
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

function atualizarResumo(filtrados) {
  const totais = filtrados.reduce(
    (acc, r) => {
      acc.populacao += r.populacao;
      acc.eleitores += r.eleitores;
      acc.votos2022 += r.votos2022;
      acc.minima += r.minima;
      acc.ideal += r.ideal;
      return acc;
    },
    { populacao: 0, eleitores: 0, votos2022: 0, minima: 0, ideal: 0 }
  );

  el.kpiMunicipios.textContent = fmt.format(filtrados.length);
  el.kpiPopulacao.textContent = fmt.format(totais.populacao);
  el.kpiEleitores.textContent = fmt.format(totais.eleitores);
  el.kpiMinima.textContent = fmt.format(totais.minima);
  el.kpiIdeal.textContent = fmt.format(totais.ideal);

  if (el.thTotal2022) el.thTotal2022.textContent = fmt.format(totais.votos2022);
  if (el.thTotalMinima) el.thTotalMinima.textContent = fmt.format(totais.minima);
  if (el.thTotalIdeal) el.thTotalIdeal.textContent = fmt.format(totais.ideal);
}

function limparResumo() {
  el.kpiMunicipios.textContent = "—";
  el.kpiPopulacao.textContent = "—";
  el.kpiEleitores.textContent = "—";
  el.kpiMinima.textContent = "—";
  el.kpiIdeal.textContent = "—";
  if (el.thTotal2022) el.thTotal2022.textContent = "—";
  if (el.thTotalMinima) el.thTotalMinima.textContent = "—";
  if (el.thTotalIdeal) el.thTotalIdeal.textContent = "—";
}

function alinharColunasTabela() {
  const headWrap = document.querySelector(".dashboard-tabela-head");
  const bodyScroll = document.querySelector(".dashboard-tabela-body-scroll");
  const headTable = headWrap?.querySelector("table");
  const bodyTable = bodyScroll?.querySelector("table");
  if (!headWrap || !bodyScroll || !headTable || !bodyTable) return;

  const largura = bodyScroll.clientWidth;
  headTable.style.width = largura + "px";
  bodyTable.style.width = largura + "px";

  const barra = bodyScroll.offsetWidth - bodyScroll.clientWidth;
  headWrap.style.paddingRight = barra > 0 ? barra + "px" : "0px";
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
      '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum município na planilha.</td></tr>';
    aposRenderTabela();
    return;
  }

  if (!selecionadas.length) {
    limparResumo();
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-4">Selecione ao menos uma micro-região.</td></tr>';
    aposRenderTabela();
    return;
  }

  atualizarResumo(filtrados);

  if (!filtrados.length) {
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum município para os filtros selecionados.</td></tr>';
    aposRenderTabela();
    return;
  }

  el.corpoTabela.innerHTML = filtrados
    .map(
      (r) => {
        const corIdx = indiceCorRegiao(r.regiaoNorm);
        const tituloRegiao = r.regiao ? ` title="${escapeHtml(r.regiao)}"` : "";
        return `<tr>
        <td class="dashboard-col-municipio">
          <span class="dashboard-municipio-celula">
            <span class="dashboard-regiao-marcador dashboard-regiao-cor--${corIdx}"${tituloRegiao} aria-hidden="true"></span>
            <span class="dashboard-municipio-texto">
              <span class="dashboard-municipio-nome">${escapeHtml(r.municipio)}</span>
              <span class="dashboard-municipio-eleitores text-muted">${fmt.format(r.eleitores)}</span>
            </span>
          </span>
        </td>
        <td class="text-end dashboard-col-eleitores">${fmt.format(r.eleitores)}</td>
        <td class="text-end dashboard-col-2022">${fmt.format(r.votos2022)}</td>
        <td class="text-end dashboard-col-minima">${fmt.format(r.minima)}</td>
        <td class="text-end dashboard-col-ideal">${fmt.format(r.ideal)}</td>
      </tr>`;
      }
    )
    .join("");

  aposRenderTabela();
}

function montar(valores) {
  registros = extrairRegistros(valores);
  montarFiltros(extrairRegioes(registros));
  renderizarTabela();
}

async function carregarDashboard() {
  if (!configValida()) {
    mostrarStatus("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");
  el.btnAtualizar.disabled = true;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) {
      limparStatus();
      return;
    }
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar planilha.");

    montar(json.valores || []);
    limparStatus();
    aposRenderTabela();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
    el.corpoTabela.innerHTML =
      '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>';
  } finally {
    el.btnAtualizar.disabled = false;
    notificarAlturaFrame();
  }
}

function initDashboard() {
  el = {
    status: document.getElementById("status"),
    btnAtualizar: document.getElementById("btnAtualizar"),
    filtroRegioes: document.getElementById("filtroRegioes"),
    corpoTabela: document.getElementById("corpoTabela"),
    thTotal2022: document.getElementById("thTotal2022"),
    thTotalMinima: document.getElementById("thTotalMinima"),
    thTotalIdeal: document.getElementById("thTotalIdeal"),
    kpiMunicipios: document.getElementById("kpiMunicipios"),
    kpiPopulacao: document.getElementById("kpiPopulacao"),
    kpiEleitores: document.getElementById("kpiEleitores"),
    kpiMinima: document.getElementById("kpiMinima"),
    kpiIdeal: document.getElementById("kpiIdeal"),
  };
  if (!el.corpoTabela) return;

  el.btnAtualizar.addEventListener("click", carregarDashboard);
  window.addEventListener("resize", alinharColunasTabela);
  requestAnimationFrame(() => notificarAlturaFrame());
  carregarDashboard();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initDashboard);
