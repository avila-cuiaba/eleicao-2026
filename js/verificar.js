// Página de verificação: testa o acesso a cada planilha cadastrada
// chamando o Web App (GET ?planilha=chave) e exibindo o status.

const ui = {
  status: document.getElementById("status"),
  lista: document.getElementById("lista"),
  btnVerificar: document.getElementById("btnVerificar"),
};

const fmtNum = new Intl.NumberFormat("pt-BR");

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function mostrarStatus(msg, tipo) {
  ui.status.textContent = msg;
  ui.status.className = "status " + (tipo || "");
}

function limparStatus() {
  ui.status.textContent = "";
  ui.status.className = "status";
}

function urlPlanilha(chave) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", chave);
  return url.toString();
}

function escapar(txt) {
  const div = document.createElement("div");
  div.textContent = txt == null ? "" : String(txt);
  return div.innerHTML;
}

// Cria o card inicial (estado "verificando") para uma planilha.
function criarCard(p) {
  const card = document.createElement("div");
  card.className = "card card-planilha";
  card.dataset.chave = p.chave;
  card.innerHTML = `
    <div class="card-planilha-topo">
      <div>
        <strong class="card-planilha-titulo">${escapar(p.titulo)}</strong>
        <span class="card-planilha-chave">${escapar(p.chave)}</span>
      </div>
      <span class="badge badge-aguardando">verificando…</span>
    </div>
    <div class="card-planilha-info">—</div>
    <div class="card-planilha-preview"></div>
    <div class="card-planilha-acoes">
      <button type="button" class="btn btn-secundario btn-retestar">Testar de novo</button>
      <a class="link-json" target="_blank" rel="noopener">Abrir JSON</a>
    </div>
  `;

  card.querySelector(".link-json").href = urlPlanilha(p.chave);
  card
    .querySelector(".btn-retestar")
    .addEventListener("click", () => testar(p, card));
  return card;
}

function setBadge(card, texto, classe) {
  const badge = card.querySelector(".badge");
  badge.textContent = texto;
  badge.className = "badge " + classe;
}

// Monta uma mini-tabela com as primeiras linhas/colunas da matriz.
function montarPreview(valores) {
  if (!valores || !valores.length) return "<em>sem linhas</em>";

  const maxLinhas = Math.min(valores.length, 4);
  const maxCols = Math.min(valores[0].length, 7);
  let html = '<div class="tabela-wrapper"><table class="mini-tabela"><tbody>';

  for (let i = 0; i < maxLinhas; i++) {
    html += "<tr>";
    for (let j = 0; j < maxCols; j++) {
      const v = valores[i][j];
      html += `<td>${escapar(v === "" || v == null ? "·" : v)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

// Testa uma planilha e atualiza o card.
async function testar(p, card) {
  setBadge(card, "verificando…", "badge-aguardando");
  card.querySelector(".card-planilha-info").textContent = "—";
  card.querySelector(".card-planilha-preview").innerHTML = "";

  const inicio = performance.now();
  try {
    const resp = await fetch(urlPlanilha(p.chave), { method: "GET" });
    const json = await resp.json();
    const ms = Math.round(performance.now() - inicio);

    if (!json.ok) {
      throw new Error(json.erro || "Resposta sem ok=true");
    }

    const valores = json.valores || [];
    const linhas = valores.length;
    const colunas = linhas ? valores[0].length : 0;

    setBadge(card, "OK", "badge-ok");
    card.querySelector(
      ".card-planilha-info"
    ).textContent = `${fmtNum.format(linhas)} linhas × ${fmtNum.format(
      colunas
    )} colunas · ${ms} ms`;
    card.querySelector(".card-planilha-preview").innerHTML = montarPreview(
      valores
    );
    return true;
  } catch (e) {
    setBadge(card, "ERRO", "badge-erro");
    card.querySelector(".card-planilha-info").textContent = e.message;
    return false;
  }
}

async function verificarTodas() {
  if (!configValida()) {
    mostrarStatus(
      "Configure a URL do Web App em js/config.js antes de verificar.",
      "erro"
    );
    return;
  }

  const planilhas = CONFIG.PLANILHAS_DISPONIVEIS || [];
  if (!planilhas.length) {
    mostrarStatus("Nenhuma planilha cadastrada em config.js.", "erro");
    return;
  }

  ui.btnVerificar.disabled = true;
  ui.lista.innerHTML = "";
  mostrarStatus("Verificando planilhas...", "carregando");

  const cards = planilhas.map((p) => {
    const card = criarCard(p);
    ui.lista.appendChild(card);
    return { p, card };
  });

  // Testa em paralelo.
  const resultados = await Promise.all(cards.map(({ p, card }) => testar(p, card)));

  const ok = resultados.filter(Boolean).length;
  const total = resultados.length;
  mostrarStatus(
    `${ok} de ${total} planilha(s) responderam com sucesso.`,
    ok === total ? "sucesso" : "erro"
  );
  ui.btnVerificar.disabled = false;
}

ui.btnVerificar.addEventListener("click", verificarTodas);
verificarTodas();
