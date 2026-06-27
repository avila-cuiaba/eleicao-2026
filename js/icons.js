// Ícones e menu compartilhados (sidebar + cabeçalho dos formulários).

window.APP_ICON_SVG = {
  inicio:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/>' +
    "</svg>",
  "micro-regiao":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"/>' +
    '<circle cx="12" cy="11" r="2.5"/>' +
    "</svg>",
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M4 19V5M4 19h16M8 17V9m4 8V7m4 10v-4"/>' +
    "</svg>",
  desempenho:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M4 19V5M4 19h16M8 17V9m4 8V7m4 10v-4"/>' +
    "</svg>",
  pessoal:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
    '<circle cx="9" cy="7" r="4"/>' +
    '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' +
    "</svg>",
  logistica:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5"/>' +
    '<path d="M21 12H3"/>' +
    "</svg>",
  orcamento:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' +
    "</svg>",
  agenda:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' +
    "</svg>",
  entregas:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M16.5 9.4 7.55 4.24"/>' +
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' +
    '<path d="M3.27 6.96 12 12.01 20.73 6.96M12 22.08V12"/>' +
    "</svg>",
  pautas:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/>' +
    "</svg>",
  mobilizacao:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<circle cx="12" cy="5" r="2"/>' +
    '<circle cx="5" cy="19" r="2"/>' +
    '<circle cx="19" cy="19" r="2"/>' +
    '<path d="M12 7v4M12 11l-5 6M12 11l5 6"/>' +
    "</svg>",
  planilhas:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>' +
    "</svg>",
  atualizar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">' +
    '<path d="M1 4v6h6M23 20v-6h-6"/>' +
    '<path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>' +
    "</svg>",
};

window.APP_MENU = [
  { id: "inicio", label: "início" },
  { id: "micro-regiao", label: "região" },
  {
    id: "desempenho",
    label: "desempenho",
    filhos: [
      { id: "dashboard", label: "votação geral" },
      { id: "mobilizacao-estrutura", label: "votação Cuiabá" },
    ],
  },
  {
    id: "pessoal",
    label: "pessoal",
    filhos: [
      { id: "pessoal-visao-geral", label: "visão geral" },
      { id: "pessoal-apoiadores", label: "apoiadores" },
      { id: "pessoal-contratos", label: "contratos" },
      { id: "pessoal-parcerias", label: "parceria" },
    ],
  },
  { id: "logistica", label: "logística" },
  {
    id: "orcamento",
    label: "orçamento",
    filhos: [
      { id: "orcamento-geral", label: "geral" },
      { id: "orcamento-estratificado", label: "estratificado" },
      { id: "orcamento-desembolso", label: "desembolso" },
    ],
  },
  { id: "agenda", label: "agenda" },
  { id: "entregas", label: "entregas" },
  { id: "pautas", label: "pautas" },
  { id: "planilhas", label: "planilhas" },
];

window.APP_ICONE = {
  idPagina(paginaId) {
    if (
      paginaId === "pessoal-visao-geral" ||
      paginaId === "pessoal-apoiadores" ||
      paginaId === "pessoal-contratos" ||
      paginaId === "pessoal-parcerias"
    ) {
      return "pessoal";
    }
    if (
      paginaId === "orcamento-geral" ||
      paginaId === "orcamento-estratificado" ||
      paginaId === "orcamento-desembolso"
    ) {
      return "orcamento";
    }
    if (paginaId === "dashboard") {
      return "desempenho";
    }
    if (
      paginaId === "mobilizacao-estrutura" ||
      paginaId === "mobilizacao-perspectiva"
    ) {
      return "desempenho";
    }
    return paginaId;
  },

  html(id) {
    const svg = window.APP_ICON_SVG[id];
    if (svg) {
      return '<span class="app-icone app-icone--svg" aria-hidden="true">' + svg + "</span>";
    }
    return "";
  },

  tituloComIcone(id, texto) {
    const label = texto != null ? String(texto) : "";
    const svg = window.APP_ICON_SVG[id];
    if (svg) {
      return (
        '<span class="app-titulo-icone" aria-hidden="true">' +
        svg +
        '</span><span class="app-titulo-texto">' +
        label +
        "</span>"
      );
    }
    return label;
  },

  aplicarTitulos() {
    document.querySelectorAll("[data-titulo-pagina]").forEach((el) => {
      const id = el.getAttribute("data-titulo-pagina");
      const label = el.getAttribute("data-titulo-label") || el.textContent.trim();
      el.innerHTML = this.tituloComIcone(id, label);
    });
  },
};

function initTitulosComIcone() {
  if (window.APP_ICONE) APP_ICONE.aplicarTitulos();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTitulosComIcone);
} else {
  initTitulosComIcone();
}
