// Tela de login: valida a chave no backend e, se ok, guarda na sessão.

const lg = {
  form: document.getElementById("formLogin"),
  chave: document.getElementById("chave"),
  btn: document.getElementById("btnEntrar"),
  status: document.getElementById("status"),
};

function mostrarErro(msg) {
  AppToast.show(msg, "danger");
}

function setCarregando(ativo) {
  lg.btn.disabled = ativo;
  lg.btn.classList.toggle("is-loading", ativo);
  lg.btn.setAttribute("aria-busy", ativo ? "true" : "false");
}

// Se já está logado (com perfil), vai para a página inicial do perfil.
if (AUTH.getChave() && AUTH.getPerfil()) {
  window.location.replace("principal.html?p=" + AUTH.paginaInicial());
}

lg.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.startsWith("COLE_AQUI")) {
    mostrarErro("Configure a URL do Web App em js/config.js.");
    return;
  }

  const chave = lg.chave.value;
  setCarregando(true);

  try {
    const url = new URL(CONFIG.WEB_APP_URL);
    url.searchParams.set("recurso", "login");
    url.searchParams.set("chave", chave);

    const resp = await fetch(url.toString(), { method: "GET" });
    const json = await resp.json();

    if (json.ok) {
      AUTH.setSessao(chave, json.perfil || "master", json.usuario || "");
      lg.btn.classList.add("is-success");
      window.location.replace("principal.html?p=" + AUTH.paginaInicial());
      return;
    }

    mostrarErro("chave inválida");
  } catch (err) {
    mostrarErro("Erro ao verificar: " + err.message);
  } finally {
    if (!AUTH.getChave()) setCarregando(false);
  }
});
