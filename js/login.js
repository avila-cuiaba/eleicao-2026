// Tela de login: valida a chave no backend e, se ok, guarda na sessão.

const lg = {
  form: document.getElementById("formLogin"),
  chave: document.getElementById("chave"),
  btn: document.getElementById("btnEntrar"),
  status: document.getElementById("status"),
};

function status(msg, tipo) {
  lg.status.textContent = msg;
  lg.status.className =
    "alert " +
    (tipo === "erro"
      ? "alert-danger"
      : tipo === "carregando"
      ? "alert-info"
      : "d-none");
}

// Se já está logado, vai direto para a home.
if (AUTH.getChave()) {
  window.location.replace("index.html");
}

lg.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.startsWith("COLE_AQUI")) {
    status("Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  const chave = lg.chave.value;
  status("Verificando...", "carregando");
  lg.btn.disabled = true;

  try {
    const url = new URL(CONFIG.WEB_APP_URL);
    url.searchParams.set("recurso", "login");
    url.searchParams.set("chave", chave);

    const resp = await fetch(url.toString(), { method: "GET" });
    const json = await resp.json();

    if (json.ok) {
      AUTH.setChave(chave);
      window.location.replace("index.html");
    } else {
      status("Chave inválida. Tente novamente.", "erro");
    }
  } catch (err) {
    status("Erro ao verificar: " + err.message, "erro");
  } finally {
    lg.btn.disabled = false;
  }
});
