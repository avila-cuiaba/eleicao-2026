// Agenda — calendário vanilla (JS puro) + lista de próximas atividades.

let ui = {};

// Semana começa na segunda-feira (col 5 = sábado, col 6 = domingo).
const DIAS_SEM = ["S", "T", "Q", "Q", "S", "S", "D"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ORIGENS = {
  campanha: { rotulo: "campanha", cor: "#1f4e8c" },
  pessoal: { rotulo: "pessoal", cor: "#c45c26" },
};

let modalEvento = null;
let mesAtual = new Date();
let diaFiltro = null;
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

// Deslocamento para grade com início na segunda (0=seg … 6=dom).
function offsetSegunda(date) {
  return (date.getDay() + 6) % 7;
}

function atualizarTituloHeader() {
  ui.btnSelMes.textContent = MESES[mesAtual.getMonth()];
  ui.btnSelAno.textContent = String(mesAtual.getFullYear());
}

function irParaMesAno(mes, ano) {
  mesAtual.setFullYear(ano, mes, 1);
  diaFiltro = null;
  carregarEventos();
}

function abrirPicker() {
  ui.picker.classList.remove("d-none");
  ui.picker.setAttribute("aria-hidden", "false");
}

function fecharPicker() {
  ui.picker.classList.add("d-none");
  ui.picker.setAttribute("aria-hidden", "true");
}

function abrirSeletorMes() {
  ui.pickerTitulo.textContent = "selecionar mês";
  const mesAtivo = mesAtual.getMonth();

  ui.pickerCorpo.innerHTML =
    '<div class="picker-grid picker-meses">' +
    MESES.map((nome, i) => {
      const ativo = i === mesAtivo ? " ativo" : "";
      return `<button type="button" class="picker-item${ativo}" data-mes="${i}">${nome.slice(0, 3)}</button>`;
    }).join("") +
    "</div>";

  ui.pickerCorpo.querySelectorAll("[data-mes]").forEach((btn) => {
    btn.addEventListener("click", () => {
      irParaMesAno(Number(btn.dataset.mes), mesAtual.getFullYear());
      fecharPicker();
    });
  });

  abrirPicker();
}

function abrirSeletorAno() {
  ui.pickerTitulo.textContent = "selecionar ano";
  const anoAtual = mesAtual.getFullYear();
  const inicio = anoAtual - 6;
  const fim = anoAtual + 5;

  let botoes = "";
  for (let a = inicio; a <= fim; a++) {
    const ativo = a === anoAtual ? " ativo" : "";
    botoes += `<button type="button" class="picker-item${ativo}" data-ano="${a}">${a}</button>`;
  }

  ui.pickerCorpo.innerHTML = `<div class="picker-grid picker-anos">${botoes}</div>`;

  ui.pickerCorpo.querySelectorAll("[data-ano]").forEach((btn) => {
    btn.addEventListener("click", () => {
      irParaMesAno(mesAtual.getMonth(), Number(btn.dataset.ano));
      fecharPicker();
    });
  });

  abrirPicker();
}

function mapaEventosPorDia() {
  const mapa = {};
  todosEventos.forEach((e) => {
    const k = chaveDia(new Date(e.inicio));
    if (!mapa[k]) mapa[k] = new Set();
    mapa[k].add(e.origem || "campanha");
  });
  return mapa;
}

function htmlMarcadores(origens) {
  if (!origens || !origens.size) return "";
  let html = '<span class="mini-cal-marcadores">';
  origens.forEach((o) => {
    html += `<i class="marcador marcador-${o}"></i>`;
  });
  return html + "</span>";
}

function classeColuna(idx) {
  if (idx === 5) return " col-sabado";
  if (idx === 6) return " col-domingo";
  return "";
}

function renderMiniCalendario() {
  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  atualizarTituloHeader();

  const primeiro = new Date(ano, mes, 1);
  const inicioGrid = new Date(primeiro);
  inicioGrid.setDate(1 - offsetSegunda(primeiro));

  const eventosPorDia = mapaEventosPorDia();

  let html =
    '<div class="mini-cal-grid">' +
    DIAS_SEM.map((d, i) => {
      return `<div class="mini-cal-head${classeColuna(i)}">${d}</div>`;
    }).join("");

  const hoje = new Date();
  let cursor = new Date(inicioGrid);

  for (let i = 0; i < 42; i++) {
    const col = i % 7;
    const foraMes = cursor.getMonth() !== mes;
    const ehHoje = mesmoDia(cursor, hoje);
    const selecionado = diaFiltro && mesmoDia(cursor, diaFiltro);
    const origens = eventosPorDia[chaveDia(cursor)];

    let cls = "mini-cal-dia" + classeColuna(col);
    if (foraMes) cls += " fora-mes";
    if (ehHoje) cls += " hoje";
    if (selecionado) cls += " selecionado";
    if (origens && origens.size) cls += " com-evento";

    html += `<button type="button" class="${cls}" data-dia="${cursor.toISOString()}">${cursor.getDate()}${htmlMarcadores(origens)}</button>`;
    cursor.setDate(cursor.getDate() + 1);
  }

  html += "</div>";
  ui.miniCal.innerHTML = html;

  ui.miniCal.querySelectorAll(".mini-cal-dia").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = new Date(btn.dataset.dia);
      diaFiltro = diaFiltro && mesmoDia(d, diaFiltro) ? null : d;
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
      const origem = ev.origem || "campanha";
      const rotuloOrigem = ev.origemTitulo || ORIGENS[origem]?.rotulo || origem;
      return `
        <div class="lista-evento-item lista-evento-${origem}">
          <div class="lista-evento-data">
            <span class="lista-evento-dia">${inicio.getDate()}</span>
            <span class="lista-evento-mes">${new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(inicio)}</span>
          </div>
          <div class="lista-evento-corpo">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <strong>${escapar(ev.titulo)}</strong>
              <span class="badge-origem badge-origem-${origem}">${escapar(rotuloOrigem)}</span>
            </div>
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
    statusPainel(ui.status, "Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  statusPainel(ui.status, "", "carregando");

  try {
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 2, 0);
    const eventos = await AgendaAPI.buscar(inicio, fim);
    if (eventos === null) return;

    todosEventos = eventos;
    statusPainel(ui.status, "", null);
    renderMiniCalendario();
    renderLista();
  } catch (err) {
    statusPainel(ui.status, "Erro: " + err.message, "erro");
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

function montarUi() {
  ui = {
    status: document.getElementById("status"),
    statusModal: document.getElementById("statusModal"),
    form: document.getElementById("formEvento"),
    btnSalvar: document.getElementById("btnSalvarEvento"),
    btnNova: document.getElementById("btnNova"),
    diaInteiro: document.getElementById("evDiaInteiro"),
    miniCal: document.getElementById("miniCalendario"),
    btnSelMes: document.getElementById("btnSelMes"),
    btnSelAno: document.getElementById("btnSelAno"),
    picker: document.getElementById("pickerPeriodo"),
    pickerTitulo: document.getElementById("pickerPeriodoTitulo"),
    pickerCorpo: document.getElementById("pickerPeriodoCorpo"),
    pickerFechar: document.getElementById("pickerFechar"),
    pickerBackdrop: document.getElementById("pickerBackdrop"),
    lista: document.getElementById("listaEventos"),
    tituloLista: document.getElementById("tituloLista"),
    btnLimpar: document.getElementById("btnLimparFiltro"),
    btnMesAnt: document.getElementById("btnMesAnt"),
    btnMesProx: document.getElementById("btnMesProx"),
  };
}

function initAgenda() {
  montarUi();
  if (!ui.miniCal) return;

  const modalEl = document.getElementById("modalEvento");
  modalEvento = modalEl ? new bootstrap.Modal(modalEl) : null;

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

  ui.btnSelMes.addEventListener("click", abrirSeletorMes);
  ui.btnSelAno.addEventListener("click", abrirSeletorAno);
  ui.pickerFechar.addEventListener("click", fecharPicker);
  ui.pickerBackdrop.addEventListener("click", fecharPicker);

  atualizarTituloHeader();
  carregarEventos();
}

window.atualizarPagina = carregarEventos;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initAgenda);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ui.picker && !ui.picker.classList.contains("d-none")) {
    fecharPicker();
  }
});
