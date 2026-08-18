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

function mensagemErroCarregamento(erro) {
  if (window.AUTH?.mensagemErroUsuario) return AUTH.mensagemErroUsuario(erro);
  return String(erro?.message ?? erro ?? "Falha na operação.");
}

window.PageLoader = PageLoader;
window.statusPainel = statusPainel;
window.mensagemErroCarregamento = mensagemErroCarregamento;

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
    if (document.body?.classList.contains("page-agenda")) {
      return;
    }
    if (document.body?.classList.contains("page-material-grafico")) {
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

function initPageSmTabs(aoMostrarAba) {
  const tabs = document.getElementById("pageSmTabs");
  if (!tabs) return;
  tabs.querySelectorAll('button[data-bs-toggle="tab"]').forEach((btn) => {
    btn.addEventListener("shown.bs.tab", () => {
      requestAnimationFrame(() => {
        if (typeof aoMostrarAba === "function") aoMostrarAba(btn);
        notificarAlturaFrame();
      });
    });
  });
}

window.initPageSmTabs = initPageSmTabs;

function montarHtmlRelatorioNoIframe() {
  if (typeof window.obterHtmlRelatorioPagina === "function") {
    return window.obterHtmlRelatorioPagina();
  }
  if (window.Relatorio && typeof window.Relatorio.montarHtml === "function") {
    return window.Relatorio.montarHtml();
  }
  if (typeof window.gerarRelatorioPagina === "function") {
    const resultado = window.gerarRelatorioPagina({ apenasHtml: true });
    if (typeof resultado === "string" && resultado) return resultado;
  }
  return null;
}

window.addEventListener("message", (event) => {
  if (event.data?.tipo === "eleicao-atualizar") {
    if (event.source !== window.parent) return;
    if (typeof window.atualizarPagina === "function") {
      window.atualizarPagina();
    }
    return;
  }

  if (event.data?.tipo === "eleicao-relatorio") {
    (async () => {
      let html = null;
      let erro = null;
      let semAlerta = false;

      try {
        const opcao = event.data?.opcao;
        const opcoesExec = opcao ? { opcao } : undefined;
        if (typeof window.executarRelatorioPagina === "function") {
          const resultado = await window.executarRelatorioPagina(opcoesExec);
          if (resultado?.tipo === "html" && resultado.html) {
            html = resultado.html;
          } else if (resultado?.tipo === "erro") {
            erro = resultado.mensagem || "não foi possível gerar o relatório.";
          } else if (resultado?.tipo === "txt" || resultado?.tipo === "cancelado") {
            semAlerta = true;
          }
        } else {
          html = montarHtmlRelatorioNoIframe();
          if (!html) {
            erro = window.Relatorio
              ? "nenhum dado para imprimir."
              : "módulo de relatório não carregado nesta página.";
          }
        }
      } catch (e) {
        erro = e?.message || "não foi possível gerar o relatório.";
      }

      try {
        window.parent.postMessage(
          {
            tipo: "eleicao-relatorio-html",
            html: typeof html === "string" && html ? html : null,
            mensagem: "nenhum dado para imprimir.",
            erro: html ? null : erro,
            semAlerta,
          },
          "*"
        );
      } catch (e) {
        /* ignorar */
      }
    })();
    return;
  }

  if (event.data?.tipo === "eleicao-exportar-xls") {
    (async () => {
      let erro = null;
      try {
        if (typeof window.executarExportacaoXlsPagina === "function") {
          const resultado = await window.executarExportacaoXlsPagina();
          if (resultado?.tipo === "erro") {
            erro = resultado.mensagem || "não foi possível exportar o XLS.";
          }
        } else {
          erro = "exportação XLS não disponível nesta página.";
        }
      } catch (e) {
        erro = e?.message || "não foi possível exportar o XLS.";
      }

      try {
        window.parent.postMessage({ tipo: "eleicao-exportar-xls-result", erro }, "*");
      } catch (e) {
        /* ignorar */
      }
    })();
    return;
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => PageLoader.init());
} else {
  PageLoader.init();
}
