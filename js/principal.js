// principal.html — controla o iframe de conteúdo e sincroniza menu/cabeçalho.

const PAGINAS = {
  inicio: {
    titulo: "Início",
    subtitulo: "painel da campanha",
    arquivo: "pages/inicio.html",
    atualizar: true,
  },
  "micro-regiao": {
    titulo: "Micro-região",
    subtitulo: "municípios, habitantes e eleitores por região",
    arquivo: "pages/micro-regiao.html",
    atualizar: true,
  },
  dashboard: {
    titulo: "Projeções",
    subtitulo: "gráficos e tabelas de votação",
    arquivo: "pages/dashboard.html",
    atualizar: true,
  },
  "pessoal-visao-geral": {
    titulo: "Pessoal",
    subtitulo: "visão geral — equipe por município",
    arquivo: "pages/pessoal.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-apoiadores": {
    titulo: "Pessoal",
    subtitulo: "apoiadores — contratos",
    arquivo: "pages/apoiadores.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  logistica: {
    titulo: "Logística",
    subtitulo: "operações e deslocamentos",
    arquivo: "pages/logistica.html",
  },
  orcamento: {
    titulo: "Orçamento",
    subtitulo: "planejamento financeiro da campanha",
    arquivo: "pages/orcamento.html",
  },
  agenda: {
    titulo: "Agenda",
    subtitulo: "próximas atividades",
    arquivo: "pages/agenda.html",
    atualizar: true,
  },
  registros: {
    titulo: "Registros",
    subtitulo: "contatos e observações",
    arquivo: "pages/registros.html",
    atualizar: true,
  },
  planilhas: {
    titulo: "Planilhas",
    subtitulo: "diagnóstico do Google Sheets",
    arquivo: "pages/planilhas.html",
    atualizar: true,
  },
};

function resolverPagina(id) {
  if (id === "pessoal") return "pessoal-visao-geral";
  return id && PAGINAS[id] ? id : "inicio";
}

function paginaDaUrl() {
  const p = new URLSearchParams(window.location.search).get("p");
  return resolverPagina(p);
}

function atualizarCabecalho(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const titulo = document.getElementById("appHeaderTitulo");
  const sub = document.getElementById("appHeaderSub");
  const btnAtualizar = document.getElementById("btnAtualizarShell");
  if (titulo) titulo.textContent = cfg.titulo;
  if (sub) sub.textContent = cfg.subtitulo;
  if (btnAtualizar) btnAtualizar.hidden = !cfg.atualizar;
  document.title = cfg.titulo + " | Eleição 2026";
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
  if (!frame) return;

  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    const main = document.querySelector(".app-main-frame");
    const areaMain = main ? main.clientHeight : 0;
    const preencheViewport =
      doc.body?.classList.contains("page-dashboard") ||
      doc.body?.classList.contains("page-pessoal") ||
      doc.body?.classList.contains("page-apoiadores");

    if (preencheViewport) {
      frame.style.height = "";
      frame.style.minHeight = "400px";
      return;
    }

    frame.style.minHeight = "";

    const docAltura = Math.max(
      doc.body.scrollHeight,
      doc.documentElement.scrollHeight,
      doc.body.offsetHeight,
      doc.documentElement.offsetHeight
    );
    const altura = Math.max(docAltura, areaMain, 400);
    frame.style.height = altura + "px";
  } catch (e) {
    frame.style.height = "70vh";
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

  if (frame && id !== "inicio") {
    frame.src = cfg.arquivo;
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
