// Micro-regiões: resumo (mapa-voto) + municípios por região (planilha municipios).

const fmt = new Intl.NumberFormat("pt-BR");
const cfg = CONFIG.MICRO_REGIAO;
const cfgMun = cfg.MUNICIPIOS;

let municipios = [];
let modalMunicipios = null;
let linhasTabela = [];
let corpoTabela = null;
const popoverTabela = PopoverTabela.criar();

function popoverMicroRegiaoHabilitado() {
  return window.matchMedia("(min-width: 992px) and (hover: hover) and (pointer: fine)").matches;
}

function aplicarPopoversMicroRegiao() {
  popoverTabela.destruir();
  if (!corpoTabela || !linhasTabela.length || !popoverMicroRegiaoHabilitado()) return;

  popoverTabela.inicializar({
    corpo: corpoTabela,
    seletorLinha: "tr.micro-regiao-linha-popover",
    linhas: linhasTabela,
    htmlConteudo: htmlPopoverMicroRegiao,
    trigger: "hover focus",
    fecharAoClicarFora: false,
  });
}

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
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

function urlPlanilha(chavePlanilha, aba) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", chavePlanilha);
  if (aba) url.searchParams.set("aba", aba);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

async function consultarPlanilha(chavePlanilha, aba) {
  const resp = await fetch(urlPlanilha(chavePlanilha, aba), { method: "GET" });
  const json = await resp.json();
  if (!AUTH.tratarResposta(json)) return null;
  if (!json.ok) throw new Error(json.erro || "Falha ao consultar planilha.");
  return json.valores || [];
}

function extrairRegioes(valores) {
  const cols = cfg.COLUNAS;
  const inicio = cfg.LINHA_INICIO_DADOS;
  const fim = cfg.LINHA_FIM_DADOS;
  const itens = [];

  for (let linha = inicio; linha <= fim; linha++) {
    const regiao = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    if (!regiao) continue;
    if (normalizarChave(regiao) === "regiao") continue;

    itens.push({
      regiao,
      regiaoNorm: normalizarChave(regiao),
      municipios: parseNumero(celula(valores, linha, cols.MUNICIPIOS)),
      habitantes: parseNumero(celula(valores, linha, cols.HABITANTES)),
      eleitores: parseNumero(celula(valores, linha, cols.ELEITORES)),
    });
  }

  return itens;
}

function extrairMunicipios(valores) {
  const cols = cfgMun.COLUNAS;
  const itens = [];

  for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valores.length; linha++) {
    const municipio = String(celula(valores, linha, cols.MUNICIPIO) ?? "").trim();
    if (!municipio) continue;

    const regiaoBruta = String(celula(valores, linha, cols.REGIAO) ?? "").trim();
    itens.push({
      municipio,
      regiao: regiaoBruta,
      regiaoNorm: normalizarChave(regiaoBruta),
      habitantes: parseNumero(celula(valores, linha, cols.HABITANTES)),
      eleitores: parseNumero(celula(valores, linha, cols.ELEITORES)),
    });
  }

  return itens;
}

function ordenarRegioes(a, b) {
  const ordem = (CONFIG.DASHBOARD && CONFIG.DASHBOARD.ORDEM_REGIOES) || [];
  const indice = (norm) => {
    const i = ordem.indexOf(norm);
    return i === -1 ? ordem.length + 1 : i;
  };
  const diff = indice(a.regiaoNorm) - indice(b.regiaoNorm);
  if (diff !== 0) return diff;
  return a.regiao.localeCompare(b.regiao, "pt-BR");
}

function indiceCorRegiao(regiaoNorm) {
  const ordem = (CONFIG.DASHBOARD && CONFIG.DASHBOARD.ORDEM_REGIOES) || [];
  const i = ordem.indexOf(regiaoNorm);
  return i === -1 ? 0 : i % 5;
}

function htmlPopoverMicroRegiao(item) {
  return PopoverTabela.corpo(
    escapeHtml(item.regiao),
    [
      PopoverTabela.item("municípios", fmt.format(item.municipios)),
      PopoverTabela.item("habitantes", fmt.format(item.habitantes)),
      PopoverTabela.item("eleitores", fmt.format(item.eleitores)),
    ].join("")
  );
}

function renderizarLinha(item) {
  const cor = indiceCorRegiao(item.regiaoNorm);
  const nome = escapeHtml(item.regiao);

  return `
    <tr
      class="micro-regiao-linha micro-regiao-linha-popover"
      role="button"
      tabindex="0"
      data-regiao-norm="${escapeHtml(item.regiaoNorm)}"
      data-regiao-nome="${nome}"
      aria-label="Ver municípios de ${nome}"
    >
      <td>
        <span class="micro-regiao-celula-regiao">
          <span class="dashboard-regiao-marcador dashboard-regiao-cor--${cor}" aria-hidden="true"></span>
          <span class="micro-regiao-nome">${nome}</span>
        </span>
      </td>
      <td class="text-end">${fmt.format(item.municipios)}</td>
      <td class="text-end">${fmt.format(item.habitantes)}</td>
      <td class="text-end">${fmt.format(item.eleitores)}</td>
    </tr>`;
}

function renderizarModalMunicipios(lista) {
  return lista
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.municipio)}</td>
      <td class="text-end">${fmt.format(item.habitantes)}</td>
      <td class="text-end">${fmt.format(item.eleitores)}</td>
    </tr>`
    )
    .join("");
}

function initMicroRegiao() {
  const els = {
    status: document.getElementById("status"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
    modalTitulo: document.getElementById("modalMunicipiosTitulo"),
    modalCorpo: document.getElementById("modalMunicipiosCorpo"),
    modalVazio: document.getElementById("modalMunicipiosVazio"),
    modalStatus: document.getElementById("modalMunicipiosStatus"),
  };

  if (!els.corpo) return;

  corpoTabela = els.corpo;
  window.addEventListener("resize", aplicarPopoversMicroRegiao);

  const modalEl = document.getElementById("modalMunicipios");
  modalMunicipios = modalEl ? new bootstrap.Modal(modalEl) : null;

  function mostrarStatus(mensagem, tipo) {
    statusPainel(els.status, mensagem, tipo);
  }

  function limparStatus() {
    statusPainel(els.status, "", null);
  }

  function renderizarTabela(itens) {
    popoverTabela.destruir();
    linhasTabela = [];
    els.corpo.innerHTML = "";

    if (!itens.length) {
      els.vazio.hidden = false;
      return;
    }
    els.vazio.hidden = true;

    const ordenados = [...itens].sort(ordenarRegioes);
    linhasTabela = ordenados;
    els.corpo.innerHTML = ordenados.map(renderizarLinha).join("");
    aplicarPopoversMicroRegiao();
  }

  function abrirModalRegiao(regiaoNorm, regiaoNome) {
    if (!modalMunicipios) return;

    const lista = municipios
      .filter((m) => m.regiaoNorm === regiaoNorm)
      .sort((a, b) => a.municipio.localeCompare(b.municipio, "pt-BR"));

    if (els.modalTitulo) {
      const cor = indiceCorRegiao(regiaoNorm);
      els.modalTitulo.innerHTML =
        `<span class="micro-regiao-modal-badge micro-regiao-modal-cor--${cor}"></span>`;
      const badge = els.modalTitulo.querySelector(".micro-regiao-modal-badge");
      if (badge) badge.textContent = regiaoNome;
    }

    if (els.modalStatus) {
      els.modalStatus.className = "alert d-none";
      els.modalStatus.textContent = "";
    }

    if (els.modalCorpo) {
      els.modalCorpo.innerHTML = lista.length ? renderizarModalMunicipios(lista) : "";
    }
    if (els.modalVazio) {
      els.modalVazio.hidden = lista.length > 0;
    }

    modalMunicipios.show();
  }

  function registrarCliquesLinha() {
    els.corpo.addEventListener("click", (e) => {
      const linha = e.target.closest("tr.micro-regiao-linha");
      if (!linha) return;
      abrirModalRegiao(linha.dataset.regiaoNorm, linha.dataset.regiaoNome);
    });

    els.corpo.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const linha = e.target.closest("tr.micro-regiao-linha");
      if (!linha) return;
      e.preventDefault();
      abrirModalRegiao(linha.dataset.regiaoNorm, linha.dataset.regiaoNome);
    });
  }

  async function carregarDados() {
    if (!configValida()) {
      mostrarStatus("Configure a URL do Web App em js/config.js antes de usar.", "erro");
      return;
    }

    mostrarStatus("Carregando micro-regiões...", "carregando");
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    try {
      const [valoresRegioes, valoresMunicipios] = await Promise.all([
        consultarPlanilha(cfg.PLANILHA, cfg.ABA),
        consultarPlanilha(cfgMun.PLANILHA, cfgMun.ABA),
      ]);

      if (valoresRegioes == null || valoresMunicipios == null) {
        limparStatus();
        return;
      }

      municipios = extrairMunicipios(valoresMunicipios);
      renderizarTabela(extrairRegioes(valoresRegioes));
      limparStatus();
    } catch (e) {
      mostrarStatus("Erro ao carregar: " + e.message, "erro");
    } finally {
      if (window.parent && window.parent.ajustarAlturaFrame) {
        setTimeout(() => window.parent.ajustarAlturaFrame(), 120);
      }
    }
  }

  registrarCliquesLinha();
  window.atualizarPagina = carregarDados;
  carregarDados();
}

function estilosRelatorioPagina() {
  return (
    ".page-micro-regiao table.rel-tabela.micro-regiao-tabela th:nth-child(n+2)," +
    ".page-micro-regiao table.rel-tabela.micro-regiao-tabela td:nth-child(n+2){" +
    "text-align:right;" +
    "padding-top:0.4rem;" +
    "padding-bottom:0.4rem;" +
    "padding-left:2.4rem;" +
    "padding-right:2.4rem;" +
    "font-variant-numeric:tabular-nums;" +
    "white-space:nowrap;" +
    "}"
  );
}

window.estilosRelatorioPagina = estilosRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initMicroRegiao);
