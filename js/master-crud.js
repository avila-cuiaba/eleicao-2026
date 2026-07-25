// Ações de edição/inclusão/exclusão — somente chave avila-master.

const MasterCrud = {
  ativo() {
    return typeof AUTH !== "undefined" && AUTH.ehAvilaMaster();
  },

  ICONE_INCLUIR:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" />' +
    '<path d="M12 8v8M8 12h8" />' +
    "</svg>",

  ICONE_EDITAR:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' +
    "</svg>",

  ICONE_EXCLUIR:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>' +
    "</svg>",

  seletorAcao: ".crud-acao-icone",

  botaoIncluir(id) {
    if (!this.ativo()) return "";
    return (
      `<button type="button" class="agenda-btn-nova agenda-btn-nova--tabela" id="${id}" ` +
      `title="incluir" aria-label="incluir">${this.ICONE_INCLUIR}</button>`
    );
  },

  acoesLinha(numLinha, opcoes) {
    if (!this.ativo() || !numLinha) return "";
    const opts = opcoes || {};
    const somenteEditar = !!opts.somenteEditar;
    let html =
      '<span class="crud-acoes-icones" data-linha="' + numLinha + '">' +
      '<button type="button" class="crud-acao-icone crud-acao-icone--editar" data-acao="editar" data-linha="' +
      numLinha +
      '" title="editar" aria-label="editar">' +
      this.ICONE_EDITAR +
      "</button>";
    if (!somenteEditar) {
      html +=
        '<button type="button" class="crud-acao-icone crud-acao-icone--excluir" data-acao="excluir" data-linha="' +
        numLinha +
        '" title="excluir" aria-label="excluir">' +
        this.ICONE_EXCLUIR +
        "</button>";
    }
    html += "</span>";
    return html;
  },

  aplicarVisibilidadeIncluir(idBotao) {
    const btn = document.getElementById(idBotao);
    if (!btn) return;
    btn.classList.toggle("d-none", !this.ativo());
  },

  pararPropagacao(container) {
    container?.addEventListener("click", (e) => {
      if (e.target.closest(this.seletorAcao)) e.stopPropagation();
    });
  },

  async confirmarExclusao() {
    if (typeof AppConfirm !== "undefined") {
      return AppConfirm.confirm("excluir este registro?", { perigo: true, icon: "warning" });
    }
    return window.confirm("excluir este registro?");
  },

  toast(mensagem, tipo) {
    if (typeof AppToast !== "undefined") AppToast.show(mensagem, tipo);
  },

  salvando(modalEl, ativo, opcoes) {
    if (!modalEl) return;
    const opts = opcoes || {};
    const content = modalEl.querySelector(".modal-content");
    if (!content) return;

    let overlay = content.querySelector(".master-crud-modal-salvando");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "master-crud-modal-salvando d-none";
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-busy", "false");
      overlay.innerHTML =
        '<div class="spinner-border text-primary master-crud-modal-salvando-spinner" role="status">' +
        '<span class="visually-hidden">Salvando</span></div>' +
        '<span class="master-crud-modal-salvando-texto">salvando...</span>';
      content.classList.add("master-crud-modal-content");
      content.insertBefore(overlay, content.firstChild);
    }

    overlay.classList.toggle("d-none", !ativo);
    overlay.setAttribute("aria-hidden", ativo ? "false" : "true");
    overlay.setAttribute("aria-busy", ativo ? "true" : "false");

    const btnSalvar = opts.btnSalvar;
    const btnCancelar =
      opts.btnCancelar || content.querySelector(".modal-footer .btn-outline-secondary");
    const btnFechar = opts.btnFechar || content.querySelector(".btn-close");

    if (btnSalvar) btnSalvar.disabled = ativo;
    if (btnCancelar) btnCancelar.disabled = ativo;
    if (btnFechar) {
      btnFechar.disabled = ativo;
      btnFechar.setAttribute("aria-disabled", ativo ? "true" : "false");
    }
  },
};

window.MasterCrud = MasterCrud;
