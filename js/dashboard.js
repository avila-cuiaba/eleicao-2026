// Dashboard: lê a matriz crua da planilha (GET) e monta, para cada tabela,
// cards de totais e um gráfico comparativo (votos 2018 x 2022 x projeção ideal).

const el = {
  status: document.getElementById("status"),
  btnAtualizar: document.getElementById("btnAtualizar"),
  tabelas: document.getElementById("tabelas"),
};

const charts = [];
const fmt = new Intl.NumberFormat("pt-BR");

const CORES = {
  votos2018: "#9bb4d6",
  votos2022: "#1f4e8c",
  ideal: "#1b7a43", // destaque (troféu / projeção ideal)
  minima: "#caa14a", // medalha / projeção mínima
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
  el.status.textContent = mensagem;
  el.status.className = classeAlerta(tipo);
}

function limparStatus() {
  el.status.textContent = "";
  el.status.className = "alert d-none";
}

// Converte valor da planilha em número (trata milhar "." e decimal ",").
function parseNumero(v) {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function urlConsulta() {
  const url = new URL(CONFIG.WEB_APP_URL);
  if (CONFIG.PLANILHA) url.searchParams.set("planilha", CONFIG.PLANILHA);
  if (CONFIG.ABA) url.searchParams.set("aba", CONFIG.ABA);
  return url.toString();
}

async function carregarDashboard() {
  if (!configValida()) {
    mostrarStatus(
      "Configure a URL do Web App em js/config.js antes de usar o dashboard.",
      "erro"
    );
    return;
  }

  mostrarStatus("Carregando dados...", "carregando");
  el.btnAtualizar.disabled = true;

  try {
    const resp = await fetch(urlConsulta(), { method: "GET" });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar.");

    montar(json.valores || []);
    limparStatus();
  } catch (e) {
    mostrarStatus("Erro ao carregar: " + e.message, "erro");
  } finally {
    el.btnAtualizar.disabled = false;
  }
}

// Pega o valor de uma célula (linha 1-based, coluna 0-based).
function celula(valores, linha1based, col) {
  const linha = valores[linha1based - 1];
  if (!linha) return "";
  return linha[col];
}

function montar(valores) {
  charts.forEach((c) => c.destroy());
  charts.length = 0;
  el.tabelas.innerHTML = "";

  if (!valores.length) {
    mostrarStatus("Nenhum dado encontrado na planilha.", "erro");
    return;
  }

  const cols = CONFIG.DASHBOARD.COLUNAS;

  CONFIG.DASHBOARD.TABELAS.forEach((tab, idx) => {
    // Linhas de dados (sem o total).
    const rotulos = [];
    const votos2018 = [];
    const votos2022 = [];
    const minimas = [];
    const ideais = [];

    for (let l = tab.dataInicio; l <= tab.dataFim; l++) {
      const rotulo = celula(valores, l, cols.ROTULO);
      if (rotulo === "" || rotulo == null) continue; // pula linhas vazias
      rotulos.push(String(rotulo));
      votos2018.push(parseNumero(celula(valores, l, cols.VOTOS_2018)));
      votos2022.push(parseNumero(celula(valores, l, cols.VOTOS_2022)));
      minimas.push(parseNumero(celula(valores, l, cols.MINIMA)));
      ideais.push(parseNumero(celula(valores, l, cols.IDEAL)));
    }

    // Totais (linha de somatória da planilha).
    const totais = {
      municipios: parseNumero(celula(valores, tab.totalRow, cols.MUNICIPIOS)),
      eleitores: parseNumero(celula(valores, tab.totalRow, cols.ELEITORES)),
      votos2018: parseNumero(celula(valores, tab.totalRow, cols.VOTOS_2018)),
      votos2022: parseNumero(celula(valores, tab.totalRow, cols.VOTOS_2022)),
      minima: parseNumero(celula(valores, tab.totalRow, cols.MINIMA)),
      ideal: parseNumero(celula(valores, tab.totalRow, cols.IDEAL)),
    };

    renderizarTabela(tab, idx, totais, {
      rotulos,
      votos2018,
      votos2022,
      minimas,
      ideais,
    });
  });
}

function renderizarTabela(tab, idx, totais, serie) {
  const secao = document.createElement("section");
  secao.className = "mb-4";

  // Cards de totais + gráfico comparativo.
  secao.innerHTML = `
    <h2 class="h4 text-brand border-bottom pb-2 mb-3">${tab.titulo}</h2>
    <div class="row g-2 g-md-3 mb-3">
      ${cardKpi("Municípios", totais.municipios)}
      ${cardKpi("Eleitores", totais.eleitores)}
      ${cardKpi("Votos 2018", totais.votos2018)}
      ${cardKpi("Votos 2022", totais.votos2022)}
      ${cardKpi("Projeção mínima", totais.minima, "kpi-minima")}
      ${cardKpi("Projeção ideal", totais.ideal, "kpi-ideal")}
    </div>
    <div class="card shadow-sm">
      <div class="card-body">
        <h3 class="h6 mb-3">Comparativo: votos 2018 × 2022 × projeção ideal</h3>
        <div class="grafico-wrapper">
          <canvas id="grafico-${idx}"></canvas>
        </div>
      </div>
    </div>
  `;

  el.tabelas.appendChild(secao);

  const ctx = secao.querySelector(`#grafico-${idx}`);
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: serie.rotulos,
      datasets: [
        {
          label: "Votos 2018",
          data: serie.votos2018,
          backgroundColor: CORES.votos2018,
          borderRadius: 4,
        },
        {
          label: "Votos 2022",
          data: serie.votos2022,
          backgroundColor: CORES.votos2022,
          borderRadius: 4,
        },
        {
          label: "Projeção ideal",
          data: serie.ideais,
          backgroundColor: CORES.ideal,
          borderColor: "#0f5a30",
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${fmt.format(c.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmt.format(v) },
        },
      },
    },
  });

  charts.push(chart);
}

function cardKpi(rotulo, valor, extraClasse) {
  return `
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card h-100 shadow-sm ${extraClasse || ""}">
        <div class="card-body py-2 px-3">
          <div class="text-secondary small">${rotulo}</div>
          <strong class="kpi-valor d-block">${fmt.format(valor)}</strong>
        </div>
      </div>
    </div>
  `;
}

el.btnAtualizar.addEventListener("click", carregarDashboard);
carregarDashboard();
