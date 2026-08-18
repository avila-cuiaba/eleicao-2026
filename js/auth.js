// Controle de acesso: a chave digitada no login fica no navegador (localStorage)
// por um período configurável (padrão 8 h) e é enviada em todas as requisições
// ao Web App. A validação real é no Apps Script.

const AUTH = {
  STORAGE_KEY: "eleicao_chave",
  STORAGE_PERFIL: "eleicao_perfil",
  STORAGE_USUARIO: "eleicao_usuario",
  STORAGE_EXPIRA: "eleicao_sessao_expira",

  PERFIS: {
    contratos: {
      paginaInicial: "pessoal-contratos",
      paginas: ["pessoal-contratos"],
    },
    reginaldo: {
      paginaInicial: "pessoal-contratos",
      paginas: ["pessoal-contratos", "pessoal-pagamentos"],
    },
    material: {
      paginaInicial: "logistica-material-grafico",
      paginas: ["logistica-material-grafico", "midia-producao"],
    },
    combustivel: {
      paginaInicial: "logistica-abastecimento",
      paginas: ["logistica-abastecimento"],
    },
    faustinho: {
      paginaInicial: "agenda",
      paginas: ["agenda", "entregas"],
      relatorio: true,
    },
    juliana: {
      paginaInicial: "orcamento-juliana",
      paginas: ["orcamento-juliana", "pessoal-contratos-juliana"],
    },
    coordenador: {
      paginaInicial: "dashboard",
      paginas: [
        "micro-regiao",
        "dashboard",
        "logistica-material-grafico",
        "agenda",
        "entregas",
      ],
    },
    campanha: {
      paginaInicial: "inicio",
      paginasExcluidas: [
        "pessoal-contratos",
        "pessoal-pagamentos",
        "pessoal-contratos-juliana",
        "orcamento-juliana",
      ],
    },
    master: {
      paginaInicial: "inicio",
    },
  },

  duracaoSessaoMs() {
    const horas = window.CONFIG?.SESSAO_LOGIN_HORAS;
    if (typeof horas === "number" && horas > 0) return horas * 60 * 60 * 1000;
    return 8 * 60 * 60 * 1000;
  },

  _lerItem(chave) {
    try {
      const local = localStorage.getItem(chave);
      if (local != null && local !== "") return local;
      return sessionStorage.getItem(chave) || "";
    } catch (e) {
      try {
        return sessionStorage.getItem(chave) || "";
      } catch (err) {
        return "";
      }
    }
  },

  _gravarItem(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch (e) {
      /* quota ou modo privado */
    }
    try {
      sessionStorage.setItem(chave, valor);
    } catch (e) {
      /* ignorar */
    }
  },

  _removerItem(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (e) {
      /* ignorar */
    }
    try {
      sessionStorage.removeItem(chave);
    } catch (e) {
      /* ignorar */
    }
  },

  _obterExpira() {
    const exp = this._lerItem(this.STORAGE_EXPIRA);
    const n = Number(exp);
    return Number.isFinite(n) && n > 0 ? n : 0;
  },

  sessaoExpirada() {
    const chave = this._lerItem(this.STORAGE_KEY);
    const perfil = this._lerItem(this.STORAGE_PERFIL);
    if (!chave || !perfil) return true;

    const expira = this._obterExpira();
    if (!expira) return false;
    return Date.now() > expira;
  },

  renovarExpiraSessao() {
    if (this.sessaoExpirada()) return;
    this._gravarItem(this.STORAGE_EXPIRA, String(Date.now() + this.duracaoSessaoMs()));
  },

  getChave() {
    if (this.sessaoExpirada()) {
      this.limpar();
      return "";
    }
    return this._lerItem(this.STORAGE_KEY);
  },

  getPerfil() {
    if (this.sessaoExpirada()) {
      this.limpar();
      return "";
    }
    return this._lerItem(this.STORAGE_PERFIL);
  },

  getUsuario() {
    if (this.sessaoExpirada()) {
      this.limpar();
      return "";
    }
    return this._lerItem(this.STORAGE_USUARIO);
  },

  setSessao(chave, perfil, usuario) {
    const expira = Date.now() + this.duracaoSessaoMs();
    this._gravarItem(this.STORAGE_KEY, chave);
    this._gravarItem(this.STORAGE_PERFIL, perfil || "master");
    this._gravarItem(this.STORAGE_USUARIO, usuario || "");
    this._gravarItem(this.STORAGE_EXPIRA, String(expira));
  },

  setChave(valor) {
    this._gravarItem(this.STORAGE_KEY, valor);
    this.renovarExpiraSessao();
  },

  limpar() {
    this._removerItem(this.STORAGE_KEY);
    this._removerItem(this.STORAGE_PERFIL);
    this._removerItem(this.STORAGE_USUARIO);
    this._removerItem(this.STORAGE_EXPIRA);
  },

  perfilAtivo() {
    return this.getPerfil() || "master";
  },

  ehAvilaMaster() {
    return this.getPerfil() === "master";
  },

  ehCoordenador() {
    return this.getPerfil() === "coordenador";
  },

  ehSomenteLeituraPlanilhas() {
    const p = this.getPerfil();
    return p === "campanha" || p === "coordenador";
  },

  podeEditarAgenda() {
    const p = this.getPerfil();
    if (p === "coordenador") return false;
    return p === "master" || p === "campanha" || p === "faustinho";
  },

  ehSomenteLeitura() {
    return this.ehSomenteLeituraPlanilhas();
  },

  paginaInicial() {
    const cfg = this.PERFIS[this.perfilAtivo()];
    return cfg?.paginaInicial || "inicio";
  },

  podeAcessarPagina(paginaId) {
    const cfg = this.PERFIS[this.perfilAtivo()];
    if (!cfg) return true;
    if (cfg.paginas) return cfg.paginas.includes(paginaId);
    if (cfg.paginasExcluidas) return !cfg.paginasExcluidas.includes(paginaId);
    return true;
  },

  filtrarMenu(menu) {
    return (menu || [])
      .map((item) => {
        if (item.separador) return item;
        if (item.filhos?.length) {
          const filhos = item.filhos.filter((f) => this.podeAcessarPagina(f.id));
          if (!filhos.length) return null;
          return Object.assign({}, item, { filhos: filhos });
        }
        return this.podeAcessarPagina(item.id) ? item : null;
      })
      .filter(Boolean);
  },

  _redirecionandoLogin: false,

  erroEhSessaoOuSeguranca(erro) {
    const msg = String(erro?.message ?? erro ?? "").toLowerCase();
    return (
      msg.includes("cross-origin") ||
      msg.includes("blocked a frame") ||
      msg.includes("failed to read a named property from") ||
      msg.includes("permission denied")
    );
  },

  mensagemErroUsuario(erro) {
    if (this._redirecionandoLogin) {
      return "Sua sessão expirou por inatividade. Redirecionando ao login…";
    }
    if (this.sessaoExpirada() || (!this._lerItem(this.STORAGE_KEY) && window.CONFIG?.EXIGIR_LOGIN)) {
      return "Sua sessão expirou por inatividade. Faça login novamente.";
    }
    if (this.erroEhSessaoOuSeguranca(erro)) {
      return "Sua sessão expirou por inatividade. Faça login novamente.";
    }
    const msg = String(erro?.message ?? erro ?? "")
      .replace(/^Error:\s*/i, "")
      .trim();
    return msg || "Falha na operação.";
  },

  urlLogin() {
    const emIframe = window.parent !== window;
    if (emIframe) {
      try {
        return new URL("login.html", window.parent.location.href).href;
      } catch (e) {
        try {
          return new URL("../login.html", window.location.href).href;
        } catch (err) {
          return "../login.html";
        }
      }
    }
    try {
      return new URL("login.html", window.location.href).href;
    } catch (e) {
      return "login.html";
    }
  },

  irLogin() {
    if (this._redirecionandoLogin) return;
    this._redirecionandoLogin = true;

    const url = this.urlLogin();
    const emIframe = window.parent !== window;

    if (emIframe) {
      try {
        window.parent.location.replace(url);
        return;
      } catch (e) {
        try {
          window.parent.postMessage({ tipo: "eleicao-login", url }, "*");
        } catch (err) {
          /* ignorar */
        }
      }
    }

    try {
      window.location.replace(url);
    } catch (e) {
      try {
        window.location.href = emIframe ? "../login.html" : "login.html";
      } catch (err) {
        /* último recurso — não propagar SecurityError à UI */
      }
    }
  },

  exigir() {
    if (!window.CONFIG || !CONFIG.EXIGIR_LOGIN) return;
    if (!this.getChave() || !this.getPerfil()) {
      this.limpar();
      this.irLogin();
    }
  },

  aplicarNaUrl(url) {
    const chave = this.getChave();
    if (chave) url.searchParams.set("chave", chave);
    return url;
  },

  tratarResposta(json) {
    if (json && json.naoAutorizado) {
      this.limpar();
      this.irLogin();
      return false;
    }
    if (window.CONFIG?.EXIGIR_LOGIN && this.sessaoExpirada()) {
      this.limpar();
      this.irLogin();
      return false;
    }
    return true;
  },

  verificarSessao() {
    if (!window.CONFIG?.EXIGIR_LOGIN) return true;
    if (this.sessaoExpirada()) {
      this.limpar();
      this.irLogin();
      return false;
    }
    return true;
  },

  sair() {
    this.limpar();
    this.irLogin();
  },
};

window.AUTH = AUTH;

document.addEventListener("click", function (e) {
  if (e.target.closest("#btnSair")) AUTH.sair();
});
