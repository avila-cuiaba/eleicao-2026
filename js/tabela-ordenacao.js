// Ordenação de colunas (setas ▲▼) — reutilizado em várias tabelas.
const TabelaOrdenacao = {
  SORT_BTN_CLASS: "apoiadores-th-sort-btn",

  cmpTexto(a, b) {
    return String(a ?? "")
      .trim()
      .localeCompare(String(b ?? "").trim(), "pt-BR", { sensitivity: "base" });
  },

  htmlSortBotoes(col) {
    const c = String(col ?? "");
    return (
      `<span class="apoiadores-th-sort" role="group">` +
      `<button type="button" class="${this.SORT_BTN_CLASS}" data-ordenar-col="${c}" data-ordenar-dir="asc" title="crescente" aria-label="crescente">` +
      `<svg class="apoiadores-th-sort-icone" viewBox="0 0 10 6" aria-hidden="true"><path fill="currentColor" d="M5 0 10 6H0z"/></svg></button>` +
      `<button type="button" class="${this.SORT_BTN_CLASS}" data-ordenar-col="${c}" data-ordenar-dir="desc" title="decrescente" aria-label="decrescente">` +
      `<svg class="apoiadores-th-sort-icone" viewBox="0 0 10 6" aria-hidden="true"><path fill="currentColor" d="M5 6 0 0h10z"/></svg></button>` +
      `</span>`
    );
  },

  htmlCabecalhoOrdenavel(rotulo, col, classesExtra) {
    const cls = classesExtra ? ` ${classesExtra}` : "";
    const r = String(rotulo ?? "");
    return (
      `<span class="apoiadores-th-ordenavel${cls}">` +
      `<span class="apoiadores-th-ordenavel-rotulo">${r}</span>` +
      this.htmlSortBotoes(col) +
      `</span>`
    );
  },

  htmlMobileLinhaOrdenavel(rotulo, col, subClasse) {
    const sub = subClasse ? ` ${subClasse}` : "";
    return (
      `<span class="apoiadores-th-mobile-linha apoiadores-th-ordenavel">` +
      `<span class="dashboard-th-principal${sub}">${String(rotulo ?? "")}</span>` +
      this.htmlSortBotoes(col) +
      `</span>`
    );
  },

  aplicar(lista, state, comparadores) {
    const fn = comparadores[state.col];
    if (!fn) return lista.slice();
    const dir = state.dir === "desc" ? -1 : 1;
    return lista.slice().sort((a, b) => dir * fn(a, b));
  },

  atualizarUi(root, state) {
    if (!root) return;
    root.querySelectorAll(`.${this.SORT_BTN_CLASS}`).forEach((btn) => {
      const ativo =
        btn.dataset.ordenarCol === state.col && btn.dataset.ordenarDir === state.dir;
      btn.classList.toggle("is-ativo", ativo);
      btn.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
  },

  vincular(root, state, onSort, datasetKey) {
    if (!root || root.dataset[datasetKey]) return;
    root.dataset[datasetKey] = "1";
    root.addEventListener("click", (e) => {
      const btn = e.target.closest(`.${this.SORT_BTN_CLASS}`);
      if (!btn || !root.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      state.col = btn.dataset.ordenarCol || state.col;
      state.dir = btn.dataset.ordenarDir === "desc" ? "desc" : "asc";
      this.atualizarUi(root, state);
      onSort();
    });
    this.atualizarUi(root, state);
  },

  criarThOrdenavel(rotulo, col, classes) {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = classes || "";
    th.innerHTML = this.htmlCabecalhoOrdenavel(rotulo, col);
    return th;
  },

  montarCabecalhoLiderancaMunicipio(card) {
    if (!card) return;
    const deskLid = card.querySelector(
      ".apoiadores-th-ident-inner .apoiadores-th-titulo.apoiadores-th-desktop"
    );
    if (deskLid && !deskLid.classList.contains("apoiadores-th-ordenavel")) {
      deskLid.outerHTML = this.htmlCabecalhoOrdenavel(
        "liderança",
        "lideranca",
        "apoiadores-th-titulo apoiadores-th-desktop"
      );
    }
    const mobile = card.querySelector(".apoiadores-th-ident-inner > .apoiadores-th-mobile");
    if (mobile && !mobile.querySelector(`.${this.SORT_BTN_CLASS}`)) {
      mobile.innerHTML =
        this.htmlMobileLinhaOrdenavel("liderança", "lideranca", "dashboard-th-principal") +
        this.htmlMobileLinhaOrdenavel(
          "município",
          "municipio",
          "dashboard-th-sub text-muted apoiadores-th-sub-municipio"
        );
    }
    const mun = card.querySelector(".apoiadores-th-municipio > .apoiadores-th-desktop");
    if (mun && !mun.classList.contains("apoiadores-th-ordenavel")) {
      mun.outerHTML = this.htmlCabecalhoOrdenavel("município", "municipio", "apoiadores-th-desktop");
    }
  },

  montarCabecalhoParceriaMunicipio(card) {
    if (!card) return;
    const desk = card.querySelector(
      ".apoiadores-th-ident-inner > .apoiadores-th-titulo.apoiadores-th-desktop"
    );
    if (desk && !desk.classList.contains("apoiadores-th-ordenavel")) {
      desk.outerHTML = this.htmlCabecalhoOrdenavel(
        "parceria",
        "parceria",
        "apoiadores-th-titulo apoiadores-th-desktop"
      );
    }
    const mobile = card.querySelector(".apoiadores-th-ident-inner > .apoiadores-th-mobile");
    if (mobile && !mobile.querySelector(`.${this.SORT_BTN_CLASS}`)) {
      mobile.innerHTML =
        this.htmlMobileLinhaOrdenavel("parceria", "parceria", "dashboard-th-principal") +
        this.htmlMobileLinhaOrdenavel(
          "município",
          "municipio",
          "dashboard-th-sub text-muted apoiadores-th-sub-municipio"
        );
    }
    const mun = card.querySelector(".apoiadores-th-municipio > .apoiadores-th-desktop");
    if (mun && !mun.classList.contains("apoiadores-th-ordenavel")) {
      mun.outerHTML = this.htmlCabecalhoOrdenavel("município", "municipio", "apoiadores-th-desktop");
    }
  },
};

window.TabelaOrdenacao = TabelaOrdenacao;
