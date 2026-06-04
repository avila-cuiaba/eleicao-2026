// Página de verificação: testa o acesso a cada planilha cadastrada
// chamando o Web App (GET ?planilha=chave) e exibindo o status.

let ui = {};

const fmtNum = new Intl.NumberFormat("pt-BR");

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

function classeAlerta(tipo) {
  if (tipo === "sucesso") return "alert alert-success";
  if (tipo === "erro") return "alert alert-danger";
  if (tipo === "carregando") return "alert alert-info";
  return "alert d-none";
}

function mostrarStatus(msg, tipo) {
  ui.status.textContent = msg;
  ui.status.className = classeAlerta(tipo);
}

function limparStatus() {
  ui.status.textContent = "";
  ui.status.className = "alert d-none";
}

function urlPlanilha(chave) {
  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("planilha", chave);
  AUTH.aplicarNaUrl(url);
  return url.toString();
}

function escapar(txt) {
  const div = document.createElement("div");
  div.textContent = txt == null ? "" : String(txt);
  return div.innerHTML;
}

// Cria o card inicial (estado "verificando") para uma planilha.
function criarCard(p) {
  const col = document.createElement("div");
  col.className = "col-12 col-md-6 col-lg-4";
  col.dataset.chave = p.chave;
  col.innerHTML = `
    <div class="card h-100 shadow-sm">
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <strong class="d-block">${escapar(p.titulo)}</strong>
            <span class="chave-mono text-secondary">${escapar(p.chave)}</span>
          </div>
          <span class="badge rounded-pill text-bg-secondary">verificando…</span>
        </div>
        <div class="card-planilha-info text-secondary small mt-2">—</div>
        <div class="card-planilha-preview mt-2"></div>
        <div class="d-flex align-items-center gap-3 mt-auto pt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary btn-retestar">Testar de novo</button>
          <a class="link-json small" target="_blank" rel="noopener">Abrir JSON</a>
        </div>
      </div>
    </div>
  `;

  col.querySelector(".link-json").href = urlPlanilha(p.chave);
  col
    .querySelector(".btn-retestar")
    .addEventListener("click", () => testar(p, col));
  return col;
}

function setBadge(card, texto, classe) {
  const badge = card.querySelector(".badge");
  badge.textContent = texto;
  badge.className = "badge rounded-pill " + classe;
}

// Monta uma mini-tabela com as primeiras linhas/colunas da matriz.
function montarPreview(valores) {
  if (!valores || !valores.length) return "<em class='text-secondary'>sem linhas</em>";

  const maxLinhas = Math.min(valores.length, 4);
  const maxCols = Math.min(valores[0].length, 7);
  let html =
    '<div class="table-responsive"><table class="table table-sm table-bordered mini-tabela mb-0"><tbody>';

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
  setBadge(card, "verificando…", "text-bg-secondary");
  card.querySelector(".card-planilha-info").textContent = "—";
  card.querySelector(".card-planilha-preview").innerHTML = "";

  const inicio = performance.now();
  try {
    const resp = await fetch(urlPlanilha(p.chave), { method: "GET" });
    const json = await resp.json();
    const ms = Math.round(performance.now() - inicio);

    if (!AUTH.tratarResposta(json)) return false;

    if (!json.ok) {
      throw new Error(json.erro || "Resposta sem ok=true");
    }

    const valores = json.valores || [];
    const linhas = valores.length;
    const colunas = linhas ? valores[0].length : 0;

    setBadge(card, "OK", "text-bg-success");
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
    setBadge(card, "ERRO", "text-bg-danger");
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

function initPlanilhas() {
  ui = {
    status: document.getElementById("status"),
    lista: document.getElementById("lista"),
    btnVerificar: document.getElementById("btnVerificar"),
  };
  if (!ui.lista) return;

  ui.btnVerificar.addEventListener("click", verificarTodas);
  verificarTodas();
}

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initPlanilhas);
