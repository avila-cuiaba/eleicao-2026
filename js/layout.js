// Sidebar esquerda — links abrem HTMLs no iframe #appFrame (principal.html).

window.LAYOUT = {
  getMenu() {
    return window.APP_MENU || [];
  },

  icone(id) {
    return (window.APP_ICONE && APP_ICONE.html(id)) || "";
  },

  grupoDaPagina(paginaId) {
    for (const item of this.getMenu()) {
      if (item.filhos?.some((f) => f.id === paginaId)) return item.id;
    }
    return null;
  },

  paginaEstaAtiva(itemId, paginaAtiva) {
    return itemId === paginaAtiva;
  },

  grupoEstaAtivo(grupoId, paginaAtiva) {
    const item = this.getMenu().find((m) => m.id === grupoId);
    if (!item?.filhos) return grupoId === paginaAtiva;
    return item.filhos.some((f) => f.id === paginaAtiva);
  },

  renderLink(item, paginaAtiva) {
    const active = this.paginaEstaAtiva(item.id, paginaAtiva) ? " active" : "";
    const aria = this.paginaEstaAtiva(item.id, paginaAtiva) ? ' aria-current="page"' : "";
    return (
      '<a href="#" class="app-sidebar-link' +
      active +
      '" data-pagina="' +
      item.id +
      '"' +
      aria +
      ">" +
      '<span class="sidebar-icone" aria-hidden="true">' +
      this.icone(item.id) +
      "</span>" +
      '<span class="app-sidebar-texto">' +
      item.label +
      "</span>" +
      "</a>"
    );
  },

  renderSublink(item, paginaAtiva) {
    const active = this.paginaEstaAtiva(item.id, paginaAtiva) ? " active" : "";
    const aria = this.paginaEstaAtiva(item.id, paginaAtiva) ? ' aria-current="page"' : "";
    return (
      '<a href="#" class="app-sidebar-link app-sidebar-sublink' +
      active +
      '" data-pagina="' +
      item.id +
      '"' +
      aria +
      ">" +
      '<span class="app-sidebar-texto">' +
      item.label +
      "</span>" +
      "</a>"
    );
  },

  renderGrupo(item, paginaAtiva) {
    const aberto = this.grupoEstaAtivo(item.id, paginaAtiva);
    const sublinks = item.filhos.map((f) => this.renderSublink(f, paginaAtiva)).join("");
    return (
      '<div class="app-sidebar-group' +
      (aberto ? " is-open has-active" : "") +
      '" data-grupo="' +
      item.id +
      '">' +
      '<div class="app-sidebar-group-head">' +
      '<span class="sidebar-icone" aria-hidden="true">' +
      this.icone(item.id) +
      "</span>" +
      '<span class="app-sidebar-texto">' +
      item.label +
      "</span>" +
      "</div>" +
      '<div class="app-sidebar-subnav">' +
      sublinks +
      "</div>" +
      "</div>"
    );
  },

  montarSidebar(paginaAtiva) {
    const links = this.getMenu()
      .map((item) => {
        if (item.filhos?.length) return this.renderGrupo(item, paginaAtiva);
        return this.renderLink(item, paginaAtiva);
      })
      .join("");

    return (
      '<div class="app-sidebar-inner">' +
      '<div class="app-sidebar-brand">' +
      '<a href="#" class="app-sidebar-title" data-pagina="inicio">' +
      '<span class="sidebar-icone" aria-hidden="true">' +
      this.icone("inicio") +
      "</span>" +
      "<span>Eleição 2026</span></a>" +
      '<span class="app-sidebar-sub">campanha Dr. Eugênio</span>' +
      "</div>" +
      '<nav class="app-sidebar-nav" aria-label="Menu principal">' +
      links +
      "</nav>" +
      '<div class="app-sidebar-footer">' +
      '<button type="button" id="btnSair" class="btn btn-sm btn-outline-light w-100">sair</button>' +
      "</div>" +
      "</div>"
    );
  },

  atualizarMenu(paginaAtiva) {
    document.body.setAttribute("data-pagina", paginaAtiva);

    document.querySelectorAll(".app-sidebar-link, .app-sidebar-title[data-pagina]").forEach((link) => {
      const id = link.getAttribute("data-pagina");
      const ativo = id === paginaAtiva;
      link.classList.toggle("active", ativo);
      if (ativo) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    document.querySelectorAll(".app-sidebar-group").forEach((group) => {
      const grupoId = group.getAttribute("data-grupo");
      const ativo = this.grupoEstaAtivo(grupoId, paginaAtiva);
      group.classList.toggle("is-open", ativo);
      group.classList.toggle("has-active", ativo);
    });
  },

  fecharSidebar() {
    document.body.classList.remove("sidebar-open");
  },

  alternarSidebar() {
    document.body.classList.toggle("sidebar-open");
  },

  init() {
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const toggle = document.getElementById("btnMenuToggle");
    const pagina = document.body.getAttribute("data-pagina") || "inicio";

    if (sidebar) sidebar.innerHTML = this.montarSidebar(pagina);

    toggle?.addEventListener("click", () => this.alternarSidebar());
    backdrop?.addEventListener("click", () => this.fecharSidebar());

    sidebar?.addEventListener("click", (e) => {
      const link = e.target.closest("[data-pagina]");
      if (!link || !sidebar.contains(link)) return;
      e.preventDefault();

      const id = link.getAttribute("data-pagina");
      if (typeof window.carregarPagina === "function") {
        window.carregarPagina(id);
      }

      if (window.matchMedia("(max-width: 991.98px)").matches) this.fecharSidebar();
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 992px)").matches) this.fecharSidebar();
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => LAYOUT.init());
} else {
  LAYOUT.init();
}
