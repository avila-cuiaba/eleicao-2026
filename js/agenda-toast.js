// Agenda Toast UI Calendar — visual estilo app, com arrastar para remarcar.

AUTH.exigir();

const ui = {
  status: document.getElementById("status"),
  statusModal: document.getElementById("statusModal"),
  form: document.getElementById("formEvento"),
  btnSalvar: document.getElementById("btnSalvarEvento"),
  btnNova: document.getElementById("btnNova"),
  diaInteiro: document.getElementById("evDiaInteiro"),
};

const CAL_ID = "campanha";
let calendar = null;
let modalEvento = null;

function paraEventoToast(e) {
  return {
    id: e.id,
    calendarId: CAL_ID,
    title: e.titulo,
    start: e.inicio,
    end: e.fim,
    isAllday: e.diaInteiro,
    category: e.diaInteiro ? "allday" : "time",
    location: e.local || "",
    body: e.descricao || "",
  };
}

function paraDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === "function") return val.toDate();
  return new Date(val);
}

function obterClasseCalendar() {
  if (window.tui && window.tui.Calendar) return window.tui.Calendar;
  return null;
}

async function recarregar() {
  if (!calendar) return;
  if (!AgendaAPI.configValida()) {
    AgendaAPI.alerta(ui.status, "Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  try {
    const inicio = paraDate(calendar.getDateRangeStart());
    const fim = paraDate(calendar.getDateRangeEnd());
    if (!inicio || !fim) throw new Error("Período do calendário indisponível.");
    const eventos = await AgendaAPI.buscar(inicio, fim);
    if (eventos === null) return;

    calendar.clear();
    calendar.createEvents(eventos.map(paraEventoToast));
    AgendaAPI.alerta(ui.status, "", null);
  } catch (err) {
    AgendaAPI.alerta(ui.status, "Erro ao carregar: " + err.message, "erro");
  }
}

function iniciarCalendario() {
  const Calendar = obterClasseCalendar();
  if (!Calendar) {
    AgendaAPI.alerta(
      ui.status,
      "Biblioteca Toast UI não carregou. Verifique a conexão ou recarregue a página.",
      "erro"
    );
    return;
  }

  const telaPequena = window.innerWidth < 768;

  calendar = new Calendar(document.getElementById("calendario-toast"), {
    defaultView: telaPequena ? "week" : "month",
    usageStatistics: false,
    isReadOnly: false,
    useFormPopup: false,
    useDetailPopup: true,
    week: {
      startDayOfWeek: 0,
      dayNames: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    },
    month: {
      startDayOfWeek: 0,
      dayNames: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    },
    calendars: [
      {
        id: CAL_ID,
        name: "Campanha 2026",
        backgroundColor: "#1f4e8c",
        borderColor: "#163a69",
        dragBackgroundColor: "#1f4e8c",
      },
    ],
  });

  calendar.on("clickDay", (ev) => abrirNovoEvento(ev.date));

  calendar.on("beforeUpdateEvent", async (ev) => {
    const { event, changes } = ev;
    const novoInicio = paraDate(changes.start) || paraDate(event.start);
    const novoFim = paraDate(changes.end) || paraDate(event.end);

    try {
      await AgendaAPI.atualizar(
        event.id,
        novoInicio,
        novoFim,
        event.isAllday || event.category === "allday"
      );
      calendar.updateEvent(event.id, event.calendarId, changes);
      AgendaAPI.alerta(ui.status, "Horário atualizado.", "sucesso");
    } catch (err) {
      AgendaAPI.alerta(ui.status, "Erro ao remarcar: " + err.message, "erro");
      recarregar();
    }
  });

  calendar.on("navigate", recarregar);
}

function abrirNovoEvento(data) {
  ui.form.reset();
  AgendaAPI.alerta(ui.statusModal, "", null);

  const inicio = data || new Date();
  document.getElementById("evInicio").value = AgendaAPI.paraInputLocal(inicio);
  const fim = new Date(inicio.getTime() + CONFIG.AGENDA.DURACAO_PADRAO_MIN * 60000);
  document.getElementById("evFim").value = AgendaAPI.paraInputLocal(fim);
  document.getElementById("evLembrete").value = CONFIG.AGENDA.LEMBRETE_PADRAO_MIN;

  modalEvento.show();
}

ui.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!AgendaAPI.configValida()) {
    AgendaAPI.alerta(ui.statusModal, "Configure a URL do Web App.", "erro");
    return;
  }

  const inicioVal = document.getElementById("evInicio").value;
  if (!inicioVal) {
    AgendaAPI.alerta(ui.statusModal, "Informe a data/hora de início.", "erro");
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
    recarregar();
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

ui.btnNova.addEventListener("click", () => abrirNovoEvento(new Date()));

document.addEventListener("DOMContentLoaded", () => {
  modalEvento = new bootstrap.Modal(document.getElementById("modalEvento"));
  iniciarCalendario();
  recarregar();
});
