// Loader centralizado sobre o conteúdo da página (substitui alert de carregamento).

const PageLoader = {
  _el: null,
  _shownAt: 0,
  _hideTimer: null,
  _minMs: 320,

  init(id) {
    this._el = document.getElementById(id || "pageLoader");
    return this._el;
  },

  ensure() {
    if (!this._el) this.init();
    return this._el;
  },

  show() {
    const el = this.ensure();
    if (!el) return;

    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }

    el.classList.add("is-active");
    el.setAttribute("aria-busy", "true");
    this._shownAt = Date.now();
    void el.offsetHeight;
  },

  hide() {
    const el = this.ensure();
    if (!el || !el.classList.contains("is-active")) return;

    const wait = Math.max(0, this._minMs - (Date.now() - this._shownAt));
    if (wait > 0) {
      this._hideTimer = setTimeout(() => this._hideNow(), wait);
      return;
    }
    this._hideNow();
  },

  _hideNow() {
    this._hideTimer = null;
    if (!this._el) return;
    this._el.classList.remove("is-active");
    this._el.removeAttribute("aria-busy");
  },
};

function statusPainel(el, msg, tipo) {
  if (tipo === "carregando") {
    if (el) {
      el.textContent = "";
      el.className = "alert d-none";
    }
    PageLoader.show();
    return;
  }

  PageLoader.hide();
  if (!el) return;

  el.textContent = msg || "";
  if (tipo === "erro") el.className = "alert alert-danger mb-3";
  else if (tipo === "sucesso") el.className = "alert alert-success mb-3";
  else el.className = "alert d-none";
}

window.PageLoader = PageLoader;
window.statusPainel = statusPainel;

function notificarAlturaFrame() {
  try {
    if (
      window.parent &&
      window.parent !== window &&
      window.parent.ehMobileShell &&
      window.parent.ehMobileShell()
    ) {
      return;
    }
  } catch (e) {
    /* ignorar */
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        if (window.parent && window.parent !== window && window.parent.ajustarAlturaFrame) {
          window.parent.ajustarAlturaFrame();
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ tipo: "eleicao-resize" }, "*");
        }
      } catch (e) {
        /* iframe cross-origin — ignorar */
      }
    });
  });
}

window.notificarAlturaFrame = notificarAlturaFrame;

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  if (event.data?.tipo !== "eleicao-atualizar") return;
  if (typeof window.atualizarPagina === "function") {
    window.atualizarPagina();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => PageLoader.init());
} else {
  PageLoader.init();
}
