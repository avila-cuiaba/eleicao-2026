// Lógica do frontend: consulta (GET) e gravação (POST) no Web App do Apps Script.

const els = {
  status: document.getElementById("status"),
  form: document.getElementById("formRegistro"),
  btnEnviar: document.getElementById("btnEnviar"),
  btnAtualizar: document.getElementById("btnAtualizar"),
  cabecalho: document.getElementById("cabecalhoTabela"),
  corpo: document.getElementById("corpoTabela"),
  vazio: document.getElementById("vazio"),
};

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function classeAlerta(tipo) {
  if (tipo === "sucesso") return "alert alert-success";
  if (tipo === "erro") return "alert alert-danger";
  if (tipo === "carregando") return "alert alert-info";
  return "alert d-none";
}

function mostrarStatus(mensagem, tipo) {
  els.status.textContent = mensagem;
  els.status.className = classeAlerta(tipo);
}

function limparStatus() {
  els.status.textContent = "";
  els.status.className = "alert d-none";
}

// Monta a URL de consulta com a aba configurada.
function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  if (CONFIG.PLANILHA) url.searchParams.set("planilha", CONFIG.PLANILHA);
  if (CONFIG.ABA) url.searchParams.set("aba", CONFIG.ABA);
  return url.toString();
}

// GET: busca os dados e renderiza na tabela.
async function carregarDados() {
  if (!configValida()) {
    mostrarStatus(
      "Configure a URL do Web App em js/config.js antes de usar.",
      "erro"
    );
    return;
  }

  mostrarStatus("Carregando registros...", "carregando");
  els.btnAtualizar.disabled = true;

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();

    if (!json.ok) {
      throw new Error(json.erro || "Falha ao consultar.");
    }

    renderizarTabela(json.dados || []);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  } finally {
    els.btnAtualizar.disabled = false;
  }
}

// Renderiza cabeçalho + linhas a partir de uma lista de objetos.
function renderizarTabela(dados) {
  els.cabecalho.innerHTML = "";
  els.corpo.innerHTML = "";

  if (!dados.length) {
    els.vazio.hidden = false;
    return;
  }
  els.vazio.hidden = true;

  const colunas = Object.keys(dados[0]);

  colunas.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    els.cabecalho.appendChild(th);
  });

  dados.forEach((linha) => {
    const tr = document.createElement("tr");
    colunas.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = linha[col] != null ? linha[col] : "";
      tr.appendChild(td);
    });
    els.corpo.appendChild(tr);
  });
}

// POST: envia o formulário. Usa text/plain para evitar preflight de CORS.
async function enviarDados(evento) {
  evento.preventDefault();

  if (!configValida()) {
    mostrarStatus(
      "Configure a URL do Web App em js/config.js antes de usar.",
      "erro"
    );
    return;
  }

  const dados = {
    planilha: CONFIG.PLANILHA,
    aba: CONFIG.ABA,
    nome: document.getElementById("nome").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    observacao: document.getElementById("observacao").value.trim(),
  };

  mostrarStatus("Salvando...", "carregando");
  els.btnEnviar.disabled = true;

  try {
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados),
    });
    const json = await resp.json();

    if (!json.ok) {
      throw new Error(json.erro || "Falha ao gravar.");
    }

    mostrarStatus("Registro salvo com sucesso!", "sucesso");
    els.form.reset();
    carregarDados();
  } catch (e) {
    mostrarStatus("Erro ao salvar: " + e.message, "erro");
  } finally {
    els.btnEnviar.disabled = false;
  }
}

els.form.addEventListener("submit", enviarDados);
els.btnAtualizar.addEventListener("click", carregarDados);

// Carrega os dados ao abrir a página.
carregarDados();
