// Agenda Lista — calendário simples + lista de próximas atividades (mobile-first).

AUTH.exigir();

const ui = {
  status: document.getElementById("status"),
  statusModal: document.getElementById("statusModal"),
  form: document.getElementById("formEvento"),
  btnSalvar: document.getElementById("btnSalvarEvento"),
  btnNova: document.getElementById("btnNova"),
  diaInteiro: document.getElementById("evDiaInteiro"),
  miniCal: document.getElementById("miniCalendario"),
  tituloMes: document.getElementById("tituloMes"),
  lista: document.getElementById("listaEventos"),
  tituloLista: document.getElementById("tituloLista"),
  btnLimpar: document.getElementById("btnLimparFiltro"),
  btnMesAnt: document.getElementById("btnMesAnt"),
  btnMesProx: document.getElementById("btnMesProx"),
};

const DIAS_SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

let modalEvento = null;
let mesAtual = new Date();
let diaFiltro = null; // Date ou null
let todosEventos = [];

function chaveDia(d) {
  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function renderMiniCalendario() {
  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  ui.tituloMes.textContent = fmtMes.format(mesAtual);

  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const inicioGrid = new Date(primeiro);
  inicioGrid.setDate(1 - primeiro.getDay());

  const diasComEvento = new Set(
    todosEventos.map((e) => chaveDia(new Date(e.inicio)))
  );

  let html =
    '<div class="mini-cal-grid">' +
    DIAS_SEM.map((d) => `<div class="mini-cal-head">${d}</div>`).join("");

  const hoje = new Date();
  let cursor = new Date(inicioGrid);

  for (let i = 0; i < 42; i++) {
    const foraMes = cursor.getMonth() !== mes;
    const ehHoje = mesmoDia(cursor, hoje);
    const selecionado = diaFiltro && mesmoDia(cursor, diaFiltro);
    const temEvento = diasComEvento.has(chaveDia(cursor));

    let cls = "mini-cal-dia";
    if (foraMes) cls += " fora-mes";
    if (ehHoje) cls += " hoje";
    if (selecionado) cls += " selecionado";
    if (temEvento) cls += " com-evento";

    html += `<button type="button" class="${cls}" data-dia="${cursor.toISOString()}">${cursor.getDate()}</button>`;
    cursor.setDate(cursor.getDate() + 1);
  }

  html += "</div>";
  ui.miniCal.innerHTML = html;

  ui.miniCal.querySelectorAll(".mini-cal-dia").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = new Date(btn.dataset.dia);
      if (diaFiltro && mesmoDia(d, diaFiltro)) {
        diaFiltro = null;
      } else {
        diaFiltro = d;
      }
      renderMiniCalendario();
      renderLista();
    });
  });
}

function renderLista() {
  let eventos = todosEventos.slice();

  if (diaFiltro) {
    eventos = eventos.filter((e) => mesmoDia(new Date(e.inicio), diaFiltro));
    ui.tituloLista.textContent =
      "atividades em " +
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(diaFiltro);
    ui.btnLimpar.classList.remove("d-none");
  } else {
    const agora = new Date();
    eventos = eventos.filter((e) => new Date(e.inicio) >= agora);
    ui.tituloLista.textContent = "próximas atividades";
    ui.btnLimpar.classList.add("d-none");
  }

  eventos.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  if (!eventos.length) {
    ui.lista.innerHTML =
      '<p class="text-secondary text-center py-4 mb-0">nenhuma atividade neste período.</p>';
    return;
  }

  ui.lista.innerHTML = eventos
    .map((ev) => {
      const inicio = new Date(ev.inicio);
      const hora = ev.diaInteiro
        ? "dia inteiro"
        : AgendaAPI.fmtHora.format(inicio);
      return `
        <div class="lista-evento-item">
          <div class="lista-evento-data">
            <span class="lista-evento-dia">${inicio.getDate()}</span>
            <span class="lista-evento-mes">${new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(inicio)}</span>
          </div>
          <div class="lista-evento-corpo">
            <strong>${escapar(ev.titulo)}</strong>
            <span class="text-secondary small d-block">${hora}${ev.local ? " · " + escapar(ev.local) : ""}</span>
            ${ev.descricao ? `<span class="small">${escapar(ev.descricao)}</span>` : ""}
          </div>
        </div>`;
    })
    .join("");
}

function escapar(txt) {
  const d = document.createElement("div");
  d.textContent = txt || "";
  return d.innerHTML;
}

async function carregarEventos() {
  if (!AgendaAPI.configValida()) {
    AgendaAPI.alerta(ui.status, "Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  AgendaAPI.alerta(ui.status, "Carregando...", "carregando");

  try {
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 2, 0);
    const eventos = await AgendaAPI.buscar(inicio, fim);
    if (eventos === null) return;

    todosEventos = eventos;
    AgendaAPI.alerta(ui.status, "", null);
    renderMiniCalendario();
    renderLista();
  } catch (err) {
    AgendaAPI.alerta(ui.status, "Erro: " + err.message, "erro");
  }
}

function abrirNovoEvento(data) {
  ui.form.reset();
  AgendaAPI.alerta(ui.statusModal, "", null);

  const inicio = data || diaFiltro || new Date();
  document.getElementById("evInicio").value = AgendaAPI.paraInputLocal(inicio);
  const fim = new Date(inicio.getTime() + CONFIG.AGENDA.DURACAO_PADRAO_MIN * 60000);
  document.getElementById("evFim").value = AgendaAPI.paraInputLocal(fim);
  document.getElementById("evLembrete").value = CONFIG.AGENDA.LEMBRETE_PADRAO_MIN;

  modalEvento.show();
}

ui.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!AgendaAPI.configValida()) return;

  const inicioVal = document.getElementById("evInicio").value;
  if (!inicioVal) {
    AgendaAPI.alerta(ui.statusModal, "Informe o início.", "erro");
    return;
  }

  AgendaAPI.alerta(ui.statusModal, "Salvando...", "carregando");
  ui.btnSalvar.disabled = true;

  try {
    await AgendaAPI.criar({
      titulo: document.getElementById("evTitulo").value.trim(),
      inicio: new Date(inicioVal).toISOString(),
      fim: document.getElementById("evFim").value
        ? new Date(document.getElementById("evFim").value).toISOString()
        : null,
      local: document.getElementById("evLocal").value.trim(),
      descricao: document.getElementById("evDescricao").value.trim(),
      diaInteiro: ui.diaInteiro.checked,
      duracaoMin: CONFIG.AGENDA.DURACAO_PADRAO_MIN,
      lembreteMin: document.getElementById("evLembrete").value,
    });

    modalEvento.hide();
    AgendaAPI.alerta(ui.status, "Atividade adicionada!", "sucesso");
    carregarEventos();
  } catch (err) {
    AgendaAPI.alerta(ui.statusModal, "Erro: " + err.message, "erro");
  } finally {
    ui.btnSalvar.disabled = false;
  }
});

ui.diaInteiro.addEventListener("change", () => {
  document.getElementById("evFim").disabled = ui.diaInteiro.checked;
  document.getElementById("evLembrete").disabled = ui.diaInteiro.checked;
});

ui.btnNova.addEventListener("click", () => abrirNovoEvento());
ui.btnLimpar.addEventListener("click", () => {
  diaFiltro = null;
  renderMiniCalendario();
  renderLista();
});

ui.btnMesAnt.addEventListener("click", () => {
  mesAtual.setMonth(mesAtual.getMonth() - 1);
  diaFiltro = null;
  carregarEventos();
});

ui.btnMesProx.addEventListener("click", () => {
  mesAtual.setMonth(mesAtual.getMonth() + 1);
  diaFiltro = null;
  carregarEventos();
});

document.addEventListener("DOMContentLoaded", () => {
  modalEvento = new bootstrap.Modal(document.getElementById("modalEvento"));
  carregarEventos();
});
