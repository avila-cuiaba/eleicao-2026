// Lógica do frontend: consulta (GET) e gravação (POST) no Web App do Apps Script.

function initRegistros() {
  const els = {
    status: document.getElementById("status"),
    form: document.getElementById("formRegistro"),
    btnEnviar: document.getElementById("btnEnviar"),
    btnAtualizar: document.getElementById("btnAtualizar"),
    cabecalho: document.getElementById("cabecalhoTabela"),
    corpo: document.getElementById("corpoTabela"),
    vazio: document.getElementById("vazio"),
  };

  if (!els.btnAtualizar || !els.corpo) return;

  function configValida() {
    return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
  }

  function mostrarStatus(mensagem, tipo) {
    statusPainel(els.status, mensagem, tipo);
  }

  function limparStatus() {
    statusPainel(els.status, "", null);
  }

  function urlConsulta() {
    const url = new URL(CONFIG.WEB_APP_URL);
    if (CONFIG.PLANILHA) url.searchParams.set("planilha", CONFIG.PLANILHA);
    if (CONFIG.ABA) url.searchParams.set("aba", CONFIG.ABA);
    AUTH.aplicarNaUrl(url);
    return url.toString();
  }

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
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const resp = await fetch(urlConsulta(), { method: "GET" });
      const json = await resp.json();
      if (!AUTH.tratarResposta(json)) {
        limparStatus();
        return;
      }

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
      chave: AUTH.getChave(),
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
      if (!AUTH.tratarResposta(json)) return;

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

  if (els.form && els.btnEnviar) {
    els.form.addEventListener("submit", enviarDados);
  }
  els.btnAtualizar.addEventListener("click", carregarDados);
  carregarDados();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initRegistros);
