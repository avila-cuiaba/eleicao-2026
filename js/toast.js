// Toast com barra de progresso (auto-dismiss).

const AppToast = {
  DURACAO: {
    sucesso: 4000,
    info: 4000,
    erro: 6000,
    danger: 6000,
  },

  _container: null,

  ensureContainer() {
    if (this._container) return this._container;
    const el = document.createElement("div");
    el.className = "app-toast-stack";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
    this._container = el;
    return el;
  },

  show(mensagem, tipo, duracaoMs) {
    const msg = String(mensagem ?? "").trim();
    if (!msg) return;

    const tipoFinal =
      tipo === "erro" || tipo === "danger"
        ? "danger"
        : tipo === "info"
          ? "info"
          : "sucesso";
    const duracao = duracaoMs || this.DURACAO[tipoFinal] || 4000;
    const stack = this.ensureContainer();

    const toast = document.createElement("div");
    toast.className = "app-toast app-toast--" + tipoFinal;
    toast.setAttribute("role", "status");
    toast.style.setProperty("--toast-duracao", duracao + "ms");

    toast.innerHTML =
      '<div class="app-toast-corpo">' +
      '<span class="app-toast-texto"></span>' +
      '<button type="button" class="app-toast-fechar" aria-label="Fechar">&times;</button>' +
      "</div>" +
      '<div class="app-toast-progress" aria-hidden="true"></div>';

    toast.querySelector(".app-toast-texto").textContent = msg;

    const fechar = () => {
      toast.classList.add("is-saindo");
      setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector(".app-toast-fechar").addEventListener("click", fechar);
    const timer = setTimeout(fechar, duracao);

    toast.addEventListener("mouseenter", () => {
      clearTimeout(timer);
      toast.classList.add("is-pausado");
    });
    toast.addEventListener("mouseleave", () => {
      toast.classList.remove("is-pausado");
      setTimeout(fechar, 1200);
    });

    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visivel"));
  },
};

window.AppToast = AppToast;
