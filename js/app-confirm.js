// Confirmações com SweetAlert2 (substitui window.confirm).

const AppConfirm = {
  SWAL_CSS: "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css",
  SWAL_JS: "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js",
  _carregando: null,

  _carregarSwal() {
    if (typeof Swal !== "undefined") return Promise.resolve();
    if (this._carregando) return this._carregando;

    this._carregando = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-app-confirm="swal-css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = this.SWAL_CSS;
        link.setAttribute("data-app-confirm", "swal-css");
        document.head.appendChild(link);
      }

      const script = document.createElement("script");
      script.src = this.SWAL_JS;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("não foi possível carregar SweetAlert2."));
      document.head.appendChild(script);
    });

    return this._carregando;
  },

  /**
   * @param {string} mensagem
   * @param {{ titulo?: string, confirmar?: string, cancelar?: string, icon?: string, perigo?: boolean }} [opcoes]
   * @returns {Promise<boolean>}
   */
  async confirm(mensagem, opcoes) {
    const texto = String(mensagem ?? "").trim();
    if (!texto) return false;

    const opts = opcoes || {};
    try {
      await this._carregarSwal();
    } catch (e) {
      return window.confirm(texto);
    }

    const perigo = !!opts.perigo;
    const result = await Swal.fire({
      title: opts.titulo || "",
      text: texto,
      icon: opts.icon || (perigo ? "warning" : "question"),
      showCancelButton: true,
      confirmButtonText: opts.confirmar || "sim",
      cancelButtonText: opts.cancelar || "cancelar",
      reverseButtons: true,
      focusCancel: !perigo,
      focusConfirm: perigo,
      buttonsStyling: false,
      customClass: {
        popup: "app-swal-popup",
        title: "app-swal-title",
        htmlContainer: "app-swal-text",
        actions: "app-swal-actions",
        confirmButton: perigo
          ? "btn btn-sm btn-danger app-swal-btn-confirmar"
          : "btn btn-sm btn-primary app-swal-btn-confirmar",
        cancelButton: "btn btn-sm btn-outline-secondary app-swal-btn-cancelar",
      },
      heightAuto: false,
    });

    return !!result.isConfirmed;
  },
};

window.AppConfirm = AppConfirm;
