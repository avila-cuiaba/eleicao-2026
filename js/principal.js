// principal.html — controla o iframe de conteúdo e sincroniza menu/cabeçalho.

const PAGINAS = {
  inicio: { titulo: "Início", subtitulo: "painel da campanha", arquivo: "pages/inicio.html" },
  dashboard: { titulo: "Projeções", subtitulo: "gráficos e tabelas de votação", arquivo: "pages/dashboard.html" },
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
    const altura = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 400);
    frame.style.height = altura + "px";
  } catch (e) {
    frame.style.height = "70vh";
  }
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

  frame?.addEventListener("load", ajustarAlturaFrame);
});

window.addEventListener("popstate", (e) => {
  carregarPagina(e.state?.p || paginaDaUrl());
});

window.addEventListener("resize", () => {
  ajustarAlturaFrame();
});
