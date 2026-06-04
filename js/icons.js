// Ícones e menu compartilhados (página início + sidebar).

window.APP_ICON_SVG = {
  inicio:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/>' +
    "</svg>",
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<path d="M4 19V5M4 19h16M8 17V9m4 8V7m4 10v-4"/>' +
    "</svg>",
  agenda:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' +
    "</svg>",
  registros:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>' +
    "</svg>",
  planilhas:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>' +
    "</svg>",
};

window.APP_MENU = [
  { id: "inicio", label: "início" },
  { id: "dashboard", label: "projeções" },
  { id: "agenda", label: "agenda" },
  { id: "registros", label: "registros" },
  { id: "planilhas", label: "planilhas" },
];
