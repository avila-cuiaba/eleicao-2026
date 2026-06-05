// principal.html — controla o iframe de conteúdo e sincroniza menu/cabeçalho.

const PAGINAS = {
  inicio: { titulo: "Início", subtitulo: "painel da campanha", arquivo: "pages/inicio.html" },
  "micro-regiao": {
    titulo: "Micro-região",
    subtitulo: "municípios, habitantes e eleitores por região",
    arquivo: "pages/micro-regiao.html",
  },
  dashboard: { titulo: "Projeções", subtitulo: "gráficos e tabelas de votação", arquivo: "pages/dashboard.html" },
  pessoal: { titulo: "Pessoal", subtitulo: "equipe e colaboradores", arquivo: "pages/pessoal.html" },
  logistica: { titulo: "Logística", subtitulo: "operações e deslocamentos", arquivo: "pages/logistica.html" },
  orcamento: { titulo: "Orçamento", subtitulo: "planejamento financeiro da campanha", arquivo: "pages/orcamento.html" },
  agenda: { titulo: "Agenda", subtitulo: "próximas atividades", arquivo: "pages/agenda.html" },
  registros: { titulo: "Registros", subtitulo: "contatos e observações", arquivo: "pages/registros.html" },
  planilhas: { titulo: "Planilhas", subtitulo: "diagnóstico do Google Sheets", arquivo: "pages/planilhas.html" },
};

function paginaDaUrl() {
  const p = new URLSearchParams(window.location.search).get("p");
  return p && PAGINAS[p] ? p : "inicio";
}

function atualizarCabecalho(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const titulo = document.getElementById("appHeaderTitulo");
  const sub = document.getElementById("appHeaderSub");
  if (titulo) titulo.textContent = cfg.titulo;
  if (sub) sub.textContent = cfg.subtitulo;
  document.title = cfg.titulo + " | Eleição 2026";
  if (window.LAYOUT) LAYOUT.atualizarMenu(id);
}

// Chamado pelo menu lateral e pelos links dentro do iframe (parent.carregarPagina).
window.carregarPagina = function (id) {
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
    const preencheViewport = doc.body?.classList.contains("page-dashboard");

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

  frame?.addEventListener("load", agendarAjusteFrame);
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
