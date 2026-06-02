// Agenda: FullCalendar + criação de atividades no Google Agenda (via Web App).

AUTH.exigir();

const ag = {
  status: document.getElementById("status"),
  statusModal: document.getElementById("statusModal"),
  form: document.getElementById("formEvento"),
  btnSalvar: document.getElementById("btnSalvarEvento"),
  btnSair: document.getElementById("btnSair"),
  btnNova: document.getElementById("btnNova"),
  diaInteiro: document.getElementById("evDiaInteiro"),
  fim: document.getElementById("evFim"),
};

let calendar = null;
let modalEvento = null;
let modalDetalhe = null;

function alerta(elemento, msg, tipo) {
  elemento.textContent = msg;
  elemento.className =
    "alert " +
    (tipo === "erro"
      ? "alert-danger"
      : tipo === "sucesso"
      ? "alert-success"
      : tipo === "carregando"
      ? "alert-info"
      : "d-none");
}

function configValida() {
  return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
}

// Date -> valor para <input type="datetime-local"> (horário local).
function paraInputLocal(date) {
  const z = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    z(date.getMonth() + 1) +
    "-" +
    z(date.getDate()) +
    "T" +
    z(date.getHours()) +
    ":" +
    z(date.getMinutes())
  );
}

// Busca eventos do período no Web App (usado pelo FullCalendar).
function buscarEventos(fetchInfo, sucesso, falha) {
  if (!configValida()) {
    alerta(ag.status, "Configure a URL do Web App em js/config.js.", "erro");
    falha(new Error("sem config"));
    return;
  }

  const url = new URL(CONFIG.WEB_APP_URL);
  url.searchParams.set("recurso", "agenda");
  url.searchParams.set("inicio", fetchInfo.startStr);
  url.searchParams.set("fim", fetchInfo.endStr);
  AUTH.aplicarNaUrl(url);

  fetch(url.toString(), { method: "GET" })
    .then((r) => r.json())
    .then((json) => {
      if (!AUTH.tratarResposta(json)) return;
      if (!json.ok) {
        alerta(ag.status, "Erro ao carregar agenda: " + json.erro, "erro");
        falha(new Error(json.erro));
        return;
      }
      alerta(ag.status, "", null);
      const eventos = (json.eventos || []).map((e) => ({
        id: e.id,
        title: e.titulo,
        start: e.inicio,
        end: e.fim,
        allDay: e.diaInteiro,
        extendedProps: { local: e.local, descricao: e.descricao },
      }));
      sucesso(eventos);
    })
    .catch((err) => {
      alerta(ag.status, "Erro ao carregar agenda: " + err.message, "erro");
      falha(err);
    });
}

function iniciarCalendario() {
  const el = document.getElementById("calendario");
  const telaPequena = window.innerWidth < 768;

  calendar = new FullCalendar.Calendar(el, {
    locale: "pt-br",
    firstDay: 0, // domingo (padrão BR)
    initialView: telaPequena ? "listWeek" : "dayGridMonth",
    height: "auto",
    // Toolbar mais enxuta no celular (menos botões = menos “estourado”).
    headerToolbar: telaPequena
      ? { left: "prev,next", center: "title", right: "listWeek,dayGridMonth" }
      : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" },
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      list: "Lista",
    },
    views: {
      dayGridMonth: { buttonText: "Mês" },
      timeGridWeek: { buttonText: "Semana" },
      listWeek: {
        buttonText: "Lista",
        noEventsText: "Nenhuma atividade neste período",
      },
    },
    titleFormat: telaPequena
      ? { month: "short", year: "numeric" }
      : { month: "long", year: "numeric" },
    nowIndicator: true,
    events: buscarEventos,

    dateClick: function (info) {
      abrirNovoEvento(info.date);
    },

    eventClick: function (info) {
      mostrarDetalhe(info.event);
    },
  });

  calendar.render();
}

function abrirNovoEvento(data) {
  ag.form.reset();
  alerta(ag.statusModal, "", null);

  const inicio = data || new Date();
  document.getElementById("evInicio").value = paraInputLocal(inicio);
  const fim = new Date(inicio.getTime() + CONFIG.AGENDA.DURACAO_PADRAO_MIN * 60000);
  document.getElementById("evFim").value = paraInputLocal(fim);
  document.getElementById("evLembrete").value = CONFIG.AGENDA.LEMBRETE_PADRAO_MIN;

  modalEvento.show();
}

function mostrarDetalhe(evento) {
  document.getElementById("detTitulo").textContent = evento.title || "Atividade";

  const opt = { dateStyle: "full", timeStyle: evento.allDay ? undefined : "short" };
  const fmt = new Intl.DateTimeFormat("pt-BR", opt);
  let quando = fmt.format(evento.start);
  if (evento.end && !evento.allDay) {
    quando +=
      " até " +
      new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(evento.end);
  }

  document.getElementById("detQuando").textContent = quando;
  document.getElementById("detLocal").textContent =
    evento.extendedProps.local || "—";
  document.getElementById("detDescricao").textContent =
    evento.extendedProps.descricao || "—";

  modalDetalhe.show();
}

// Salvar nova atividade.
ag.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configValida()) {
    alerta(ag.statusModal, "Configure a URL do Web App em js/config.js.", "erro");
    return;
  }

  const diaInteiro = ag.diaInteiro.checked;
  const inicioVal = document.getElementById("evInicio").value;
  const fimVal = document.getElementById("evFim").value;

  if (!inicioVal) {
    alerta(ag.statusModal, "Informe a data/hora de início.", "erro");
    return;
  }

  const corpo = {
    recurso: "agenda",
    chave: AUTH.getChave(),
    titulo: document.getElementById("evTitulo").value.trim(),
    inicio: new Date(inicioVal).toISOString(),
    fim: fimVal ? new Date(fimVal).toISOString() : null,
    local: document.getElementById("evLocal").value.trim(),
    descricao: document.getElementById("evDescricao").value.trim(),
    diaInteiro: diaInteiro,
    duracaoMin: CONFIG.AGENDA.DURACAO_PADRAO_MIN,
    lembreteMin: document.getElementById("evLembrete").value,
  };

  alerta(ag.statusModal, "Salvando...", "carregando");
  ag.btnSalvar.disabled = true;

  try {
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return;

    if (!json.ok) throw new Error(json.erro || "Falha ao salvar.");

    modalEvento.hide();
    alerta(ag.status, "Atividade adicionada à agenda!", "sucesso");
    calendar.refetchEvents();
  } catch (err) {
    alerta(ag.statusModal, "Erro ao salvar: " + err.message, "erro");
  } finally {
    ag.btnSalvar.disabled = false;
  }
});

// Desabilita os horários quando "dia inteiro" está marcado.
ag.diaInteiro.addEventListener("change", () => {
  const inteiro = ag.diaInteiro.checked;
  document.getElementById("evFim").disabled = inteiro;
  document.getElementById("evLembrete").disabled = inteiro;
});

ag.btnNova.addEventListener("click", () => abrirNovoEvento(new Date()));

document.addEventListener("DOMContentLoaded", () => {
  modalEvento = new bootstrap.Modal(document.getElementById("modalEvento"));
  modalDetalhe = new bootstrap.Modal(document.getElementById("modalDetalhe"));
  iniciarCalendario();
});
