// Tela de login: valida a chave no backend e, se ok, guarda na sessão.

const lg = {
  form: document.getElementById("formLogin"),
  chave: document.getElementById("chave"),
  btn: document.getElementById("btnEntrar"),
  status: document.getElementById("status"),
};

function mostrarErro(msg) {
  lg.status.textContent = msg;
  lg.status.className = "alert alert-danger";
}

function limparErro() {
  lg.status.textContent = "";
  lg.status.className = "alert d-none";
}

function setCarregando(ativo) {
  lg.btn.disabled = ativo;
  lg.btn.classList.toggle("is-loading", ativo);
  lg.btn.setAttribute("aria-busy", ativo ? "true" : "false");
  if (ativo) limparErro();
}

// Se já está logado, vai direto para a home.
if (AUTH.getChave()) {
  window.location.replace("principal.html?p=inicio");
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
      AUTH.setChave(chave);
      lg.btn.classList.add("is-success");
      window.location.replace("principal.html?p=inicio");
      return;
    }

    mostrarErro("Chave inválida. Tente novamente.");
  } catch (err) {
    mostrarErro("Erro ao verificar: " + err.message);
  } finally {
    if (!AUTH.getChave()) setCarregando(false);
  }
});
