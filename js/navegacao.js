// Navegação a partir de páginas dentro do iframe → principal.html.

function navegarPara(pagina) {
  if (!pagina) return;

  if (window.parent !== window) {
    try {
      if (typeof window.parent.carregarPagina === "function") {
        window.parent.carregarPagina(pagina);
        return;
      }
    } catch (e) {
      /* acesso ao parent bloqueado */
    }
    window.parent.postMessage({ tipo: "eleicao-nav", pagina: pagina }, "*");
    return;
  }

  window.location.href = "../principal.html?p=" + encodeURIComponent(pagina);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".home-atalho[data-pagina]");
  if (!link) return;
  e.preventDefault();
  navegarPara(link.getAttribute("data-pagina"));
});
