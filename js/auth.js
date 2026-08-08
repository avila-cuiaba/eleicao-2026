// Controle de acesso: a chave digitada no login fica na sessão e é enviada
// em todas as requisições ao Web App. A validação real é no Apps Script.

const AUTH = {
  STORAGE_KEY: "eleicao_chave",
  STORAGE_PERFIL: "eleicao_perfil",
  STORAGE_USUARIO: "eleicao_usuario",

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
      paginas: ["logistica-material-grafico"],
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
    campanha: {
      paginaInicial: "inicio",
      paginasExcluidas: ["pessoal-contratos", "pessoal-pagamentos"],
    },
    master: {
      paginaInicial: "inicio",
    },
  },

  getChave() {
    try {
      return sessionStorage.getItem(this.STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  },

  getPerfil() {
    try {
      return sessionStorage.getItem(this.STORAGE_PERFIL) || "";
    } catch (e) {
      return "";
    }
  },

  getUsuario() {
    try {
      return sessionStorage.getItem(this.STORAGE_USUARIO) || "";
    } catch (e) {
      return "";
    }
  },

  setSessao(chave, perfil, usuario) {
    sessionStorage.setItem(this.STORAGE_KEY, chave);
    sessionStorage.setItem(this.STORAGE_PERFIL, perfil || "master");
    sessionStorage.setItem(this.STORAGE_USUARIO, usuario || "");
  },

  setChave(valor) {
    sessionStorage.setItem(this.STORAGE_KEY, valor);
  },

  limpar() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_PERFIL);
    sessionStorage.removeItem(this.STORAGE_USUARIO);
  },

  perfilAtivo() {
    return this.getPerfil() || "master";
  },

  ehAvilaMaster() {
    return this.getChave() === "avila-master";
  },

  paginaInicial() {
    const cfg = this.PERFIS[this.perfilAtivo()];
    return cfg?.paginaInicial || "inicio";
  },

  podeAcessarPagina(paginaId) {
    if (paginaId === "planilhas" && !this.ehAvilaMaster()) {
      return false;
    }
    const cfg = this.PERFIS[this.perfilAtivo()];
    if (!cfg) return true;
    if (cfg.paginas) return cfg.paginas.includes(paginaId);
    if (cfg.paginasExcluidas) return !cfg.paginasExcluidas.includes(paginaId);
    return true;
  },

  filtrarMenu(menu) {
    return (menu || [])
      .map((item) => {
        if (item.filhos?.length) {
          const filhos = item.filhos.filter((f) => this.podeAcessarPagina(f.id));
          if (!filhos.length) return null;
          return Object.assign({}, item, { filhos: filhos });
        }
        return this.podeAcessarPagina(item.id) ? item : null;
      })
      .filter(Boolean);
  },

  urlLogin() {
    const base = window.parent !== window ? window.parent.location : window.location;
    return new URL("login.html", base).href;
  },

  irLogin() {
    const url = this.urlLogin();
    if (window.parent !== window) window.parent.location.replace(url);
    else window.location.replace(url);
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
