// principal.html — controla o iframe de conteúdo e sincroniza menu/cabeçalho.

const PAGINAS = {
  inicio: {
    titulo: "início",
    subtitulo: "painel da campanha",
    arquivo: "pages/inicio.html",
    atualizar: true,
  },
  "micro-regiao": {
    titulo: "região",
    subtitulo: "municípios, habitantes e eleitores por região",
    arquivo: "pages/micro-regiao.html",
    atualizar: true,
  },
  dashboard: {
    titulo: "votação",
    subtitulo: "gráficos e tabelas de votação",
    arquivo: "pages/dashboard.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
  "pessoal-visao-geral": {
    titulo: "pessoal",
    subtitulo: "visão geral — equipe por município",
    arquivo: "pages/pessoal.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-apoiadores": {
    titulo: "pessoal",
    subtitulo: "apoiadores — contratos",
    arquivo: "pages/apoiadores.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-contratos": {
    titulo: "pessoal",
    subtitulo: "contratos",
    arquivo: "pages/contratos.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-parcerias": {
    titulo: "pessoal",
    subtitulo: "parceria — contratos",
    arquivo: "pages/parcerias.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  logistica: {
    titulo: "logística",
    subtitulo: "operações e deslocamentos",
    arquivo: "pages/logistica.html",
  },
  "orcamento-geral": {
    titulo: "orçamento",
    subtitulo: "planejamento geral",
    arquivo: "pages/orcamento-geral.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-estratificado": {
    titulo: "orçamento",
    subtitulo: "orçamento por município",
    arquivo: "pages/orcamento.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-desembolso": {
    titulo: "orçamento",
    subtitulo: "desembolso",
    arquivo: "pages/orcamento-desembolso.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  agenda: {
    titulo: "agenda",
    subtitulo: "próximas atividades",
    arquivo: "pages/agenda.html",
    atualizar: true,
  },
  entregas: {
    titulo: "entregas",
    subtitulo: "materiais e distribuição",
    arquivo: "pages/entregas.html",
    atualizar: true,
  },
  pautas: {
    titulo: "pautas",
    subtitulo: "temas e compromissos",
    arquivo: "pages/pautas.html",
  },
  "mobilizacao-estrutura": {
    titulo: "mobilização em Cuiabá / VG",
    subtitulo: "estrutura — visão hierárquica",
    arquivo: "pages/mobilizacao-estrutura.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
  "mobilizacao-perspectiva": {
    titulo: "mobilização em Cuiabá / VG",
    subtitulo: "responsabilidade e perspectiva de voto",
    arquivo: "pages/mobilizacao-perspectiva.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
  planilhas: {
    titulo: "planilhas",
    subtitulo: "diagnóstico do Google Sheets",
    arquivo: "pages/planilhas.html",
    atualizar: true,
  },
};

function resolverPagina(id) {
  if (id === "pessoal") return "pessoal-visao-geral";
  if (id === "orcamento") return "orcamento-estratificado";
  if (id === "mobilizacao") return "mobilizacao-estrutura";
  if (id === "desempenho") return "dashboard";
  const resolved = id && PAGINAS[id] ? id : "inicio";
  if (AUTH.getChave() && !AUTH.podeAcessarPagina(resolved)) {
    return AUTH.paginaInicial();
  }
  return resolved;
}

function paginaDaUrl() {
  const p = new URLSearchParams(window.location.search).get("p");
  return resolverPagina(p);
}

function iconeIdPagina(id) {
  const cfg = PAGINAS[id];
  if (cfg?.menuGrupo) return cfg.menuGrupo;
  return window.APP_ICONE ? APP_ICONE.idPagina(id) : id;
}

function tituloPagina(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  if (id === "mobilizacao-estrutura" || id === "mobilizacao-perspectiva") {
    return CONFIG.MOBILIZACAO?.TITULO_PAGINA || cfg.titulo;
  }
  return cfg.titulo;
}

function atualizarCabecalho(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const titulo = document.getElementById("appHeaderTitulo");
  const sub = document.getElementById("appHeaderSub");
  const btnAtualizar = document.getElementById("btnAtualizarShell");
  const textoTitulo = tituloPagina(id);
  if (titulo) {
    const iconId = iconeIdPagina(id);
    titulo.innerHTML =
      window.APP_ICONE ? APP_ICONE.tituloComIcone(iconId, textoTitulo) : textoTitulo;
  }
  if (sub) sub.textContent = cfg.subtitulo;
  if (btnAtualizar) btnAtualizar.hidden = !cfg.atualizar;
  document.title = textoTitulo + " | Eleição 2026";
  if (window.LAYOUT) LAYOUT.atualizarMenu(id);
}

function executarAtualizarShell() {
  const frame = document.getElementById("appFrame");
  const win = frame?.contentWindow;
  if (!win) return;

  try {
    if (typeof win.atualizarPagina === "function") {
      win.atualizarPagina();
      return;
    }
  } catch (e) {
    /* file:// ou origem cruzada — usar postMessage */
  }

  win.postMessage({ tipo: "eleicao-atualizar" }, "*");
}

// Chamado pelo menu lateral e pelos links dentro do iframe (parent.carregarPagina).
window.carregarPagina = function (id) {
  id = resolverPagina(id);
  if (AUTH.getChave() && !AUTH.podeAcessarPagina(id)) {
    id = AUTH.paginaInicial();
  }
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const frame = document.getElementById("appFrame");
  if (!frame) return;

  frame.src = cfg.arquivo;
  document.body.setAttribute("data-pagina", id);
  atualizarCabecalho(id);

  const url = new URL(window.location.href);
  url.searchParams.set("p", id);
  history.pushState({ p: id }, "", url);

  if (window.matchMedia("(max-width: 991.98px)").matches && window.LAYOUT) {
    LAYOUT.fecharSidebar();
  }
};

function ajustarAlturaFrame() {
  const frame = document.getElementById("appFrame");
  const main = document.querySelector(".app-main-frame");
  if (!frame || !main) return;

  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    const preencheViewport =
      doc.body?.classList.contains("page-dashboard") ||
      doc.body?.classList.contains("page-pessoal") ||
      doc.body?.classList.contains("page-apoiadores") ||
      doc.body?.classList.contains("page-parcerias") ||
      doc.body?.classList.contains("page-orcamento") ||
      doc.body?.classList.contains("page-orcamento-geral") ||
      doc.body?.classList.contains("page-orcamento-desembolso") ||
      doc.body?.classList.contains("page-mobilizacao-estrutura-resumo") ||
      doc.body?.classList.contains("page-mobilizacao-estrutura") ||
      doc.body?.classList.contains("page-mobilizacao");

    frame.style.flex = "1 1 auto";
    frame.style.minHeight = "0";

    if (preencheViewport) {
      frame.style.height = "";
      return;
    }

    const areaMain = main.clientHeight;
    const docAltura = Math.max(
      doc.body?.scrollHeight || 0,
      doc.documentElement?.scrollHeight || 0,
      doc.body?.offsetHeight || 0,
      doc.documentElement?.offsetHeight || 0
    );

    if (docAltura > areaMain) {
      frame.style.flex = "0 0 auto";
      frame.style.height = docAltura + "px";
    } else {
      frame.style.height = "";
    }
  } catch (e) {
    frame.style.flex = "1 1 auto";
    frame.style.height = "";
    frame.style.minHeight = "0";
  }
}

function agendarAjusteFrame() {
  ajustarAlturaFrame();
  setTimeout(ajustarAlturaFrame, 120);
  setTimeout(ajustarAlturaFrame, 350);
}

window.ajustarAlturaFrame = ajustarAlturaFrame;

document.addEventListener("DOMContentLoaded", () => {
  AUTH.exigir();

  const id = paginaDaUrl();
  const cfg = PAGINAS[id];
  const frame = document.getElementById("appFrame");

  if (window.LAYOUT) {
    LAYOUT.init();
  }

  if (frame) {
    const padraoInicio = !new URLSearchParams(window.location.search).get("p") && id === "inicio";
    if (!padraoInicio || id !== "inicio") {
      frame.src = cfg.arquivo;
    }
  }

  document.body.setAttribute("data-pagina", id);
  atualizarCabecalho(id);

  if (!new URLSearchParams(window.location.search).get("p")) {
    const url = new URL(window.location.href);
    url.searchParams.set("p", id);
    history.replaceState({ p: id }, "", url);
  }

  document.getElementById("btnAtualizarShell")?.addEventListener("click", executarAtualizarShell);

  frame?.addEventListener("load", () => {
    agendarAjusteFrame();
    atualizarCabecalho(document.body.getAttribute("data-pagina") || paginaDaUrl());
  });
});

window.addEventListener("popstate", (e) => {
  carregarPagina(e.state?.p || paginaDaUrl());
});

window.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "eleicao-nav" && event.data.pagina) {
    carregarPagina(event.data.pagina);
    return;
  }
  if (event.data && event.data.tipo === "eleicao-resize") {
    agendarAjusteFrame();
  }
});

window.addEventListener("resize", () => {
  agendarAjusteFrame();
});
