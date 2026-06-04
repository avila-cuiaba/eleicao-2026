// Controle de acesso (Opção A): a "chave" digitada no login é guardada na
// sessão do navegador e enviada em todas as requisições ao Web App.
// A validação real é feita no backend (Apps Script) contra a SENHA_ACESSO.

const AUTH = {
  STORAGE_KEY: "eleicao_chave",

  getChave() {
    try {
      return sessionStorage.getItem(this.STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  },

  setChave(valor) {
    sessionStorage.setItem(this.STORAGE_KEY, valor);
  },

  limpar() {
    sessionStorage.removeItem(this.STORAGE_KEY);
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

  // Redireciona para o login se a página exige e ainda não há chave.
  exigir() {
    if (!window.CONFIG || !CONFIG.EXIGIR_LOGIN) return;
    if (!this.getChave()) this.irLogin();
  },

  // Acrescenta a chave a uma URL (objeto URL) de requisição GET.
  aplicarNaUrl(url) {
    const chave = this.getChave();
    if (chave) url.searchParams.set("chave", chave);
    return url;
  },

  // Verifica a resposta do backend: se for "não autorizado", desloga.
  // Retorna true se pode prosseguir, false se redirecionou para login.
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

// Liga o botão de logout (#btnSair), injetado pela sidebar em layout.js.
document.addEventListener("click", function (e) {
  if (e.target.closest("#btnSair")) AUTH.sair();
});
