// Agenda — calendário vanilla (JS puro) + lista de compromissos e tarefas.

let ui = {};

const DIAS_SEM = ["S", "T", "Q", "Q", "S", "S", "D"];
const DIAS_SEMANA_EXTENSO = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

function mesAbreviadoCardAgenda(data) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(data)
    .replace(/\./g, "")
    .toUpperCase();
}
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ORIGENS = {
  campanha: { rotulo: "campanha", cor: "#1f4e8c" },
  gabinete: { rotulo: "gabinete", cor: "#c45c26" },
  eventos: { rotulo: "eventos", cor: "#16a34a" },
};

function normalizarOrigem(origem) {
  if (origem === "pessoal") return "gabinete";
  return origem || "campanha";
}

let modalEvento = null;
let mesAtual = new Date();
let diaFiltro = null;
let todosEventos = [];
let agendasGravacao = { campanha: true, gabinete: true, eventos: true };
let modoEdicao = false;
let filtroTarefas = "pendentes";
let abaListasMobile = "atividades";
let calendarioMobileAberto = false;
let calendarioCarregando = false;
let filtroOrigens = new Set(Object.keys(ORIGENS));
let periodoLista = "diario";

const PERIODOS_LISTA = {
  diario: "diário",
  "4dias": "4 dias",
  semanal: "semanal",
  quinzenal: "quinzenal",
  mensal: "mensal",
};

function inicioDiaLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fimDiaLocal(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function intervaloPeriodoLista(anchor) {
  const start = inicioDiaLocal(anchor);
  let end;

  switch (periodoLista) {
    case "4dias":
      end = inicioDiaLocal(anchor);
      end.setDate(end.getDate() + 3);
      end = fimDiaLocal(end);
      break;
    case "semanal": {
      const monday = inicioDiaLocal(anchor);
      monday.setDate(monday.getDate() - offsetSegunda(anchor));
      start.setTime(monday.getTime());
      end = inicioDiaLocal(monday);
      end.setDate(end.getDate() + 6);
      end = fimDiaLocal(end);
      break;
    }
    case "quinzenal": {
      const monday = inicioDiaLocal(anchor);
      monday.setDate(monday.getDate() - offsetSegunda(anchor));
      start.setTime(monday.getTime());
      end = inicioDiaLocal(monday);
      end.setDate(end.getDate() + 13);
      end = fimDiaLocal(end);
      break;
    }
    case "mensal":
      start.setTime(new Date(anchor.getFullYear(), anchor.getMonth(), 1).getTime());
      end = fimDiaLocal(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
      break;
    default:
      end = fimDiaLocal(anchor);
  }

  return { start, end };
}

function ancoraPeriodoLista() {
  if (diaFiltro) return diaFiltro;
  return new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 15);
}

function filtroDataAtivo() {
  if (diaFiltro) return true;
  return periodoLista === "mensal";
}

function compromissoNoPeriodo(ev, start, end) {
  return AgendaAPI.diasCompromisso(ev).some((d) => {
    const t = inicioDiaLocal(d).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

function tarefaNoPeriodo(ev, start, end) {
  const t = inicioDiaLocal(new Date(ev.inicio)).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function diasCompromissoNoPeriodo(ev, start, end) {
  return AgendaAPI.diasCompromisso(ev).filter((d) => {
    const t = inicioDiaLocal(d).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

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

function offsetSegunda(date) {
  return (date.getDay() + 6) % 7;
}

function ehTarefa(item) {
  return item?.tipo === "tarefa";
}

function tipoSelecionado() {
  const marcado = document.querySelector('input[name="evTipo"]:checked');
  return marcado ? marcado.value : "evento";
}

function atualizarTituloHeader() {
  ui.btnSelMes.textContent = MESES[mesAtual.getMonth()];
  ui.btnSelAno.textContent = String(mesAtual.getFullYear());
}

function irParaMesAno(mes, ano) {
  return mudarPeriodoCalendario(mes, ano);
}

function setCalendarioCarregando(ativo) {
  calendarioCarregando = !!ativo;
  const pickerAberto = ui.picker && !ui.picker.classList.contains("d-none");

  ui.pickerCarregando?.classList.toggle("d-none", !ativo || !pickerAberto);
  ui.pickerCarregando?.setAttribute("aria-hidden", ativo && pickerAberto ? "false" : "true");
  ui.pickerCarregando?.setAttribute("aria-busy", ativo && pickerAberto ? "true" : "false");

  ui.calCarregando?.classList.toggle("d-none", !ativo || pickerAberto);
  ui.calCarregando?.setAttribute("aria-hidden", ativo && !pickerAberto ? "false" : "true");
  ui.calCarregando?.setAttribute("aria-busy", ativo && !pickerAberto ? "true" : "false");

  ui.calCard?.classList.toggle("is-carregando", ativo);

  [ui.btnMesAnt, ui.btnMesProx, ui.btnSelMes, ui.btnSelAno, ui.pickerFechar].forEach((el) => {
    if (el) el.disabled = ativo;
  });

  ui.miniCal?.querySelectorAll("button").forEach((btn) => {
    btn.disabled = ativo;
  });
  ui.pickerCorpo?.querySelectorAll("button").forEach((btn) => {
    btn.disabled = ativo;
  });
}

async function mudarPeriodoCalendario(mes, ano) {
  if (calendarioCarregando) return;

  const mudou = mesAtual.getMonth() !== mes || mesAtual.getFullYear() !== ano;
  if (!mudou) {
    fecharPicker();
    return;
  }

  mesAtual.setFullYear(ano, mes, 1);
  diaFiltro = null;
  setCalendarioCarregando(true);

  try {
    await carregarEventos();
  } finally {
    setCalendarioCarregando(false);
    fecharPicker();
  }
}

async function avancarMesCalendario(delta) {
  if (calendarioCarregando) return;

  mesAtual.setMonth(mesAtual.getMonth() + delta);
  diaFiltro = null;
  setCalendarioCarregando(true);

  try {
    await carregarEventos();
  } finally {
    setCalendarioCarregando(false);
  }
}

function abrirPicker() {
  if (calendarioCarregando) return;
  ui.picker.classList.remove("d-none");
  ui.picker.setAttribute("aria-hidden", "false");
}

function fecharPicker() {
  if (calendarioCarregando) return;
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
      mudarPeriodoCalendario(Number(btn.dataset.mes), mesAtual.getFullYear());
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
      mudarPeriodoCalendario(mesAtual.getMonth(), Number(btn.dataset.ano));
    });
  });

  abrirPicker();
}

function passaFiltroOrigem(item) {
  return filtroOrigens.has(normalizarOrigem(item.origem));
}

function mapaEventosPorDia() {
  const mapa = {};
  todosEventos.filter(passaFiltroOrigem).forEach((e) => {
    AgendaAPI.diasCompromisso(e).forEach((d) => {
      const k = chaveDia(d);
      if (!mapa[k]) mapa[k] = new Set();
      mapa[k].add(normalizarOrigem(e.origem));
    });
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
      renderListas();
      if (ehMobileListas()) fecharCalendarioMobile();
    });
  });

  atualizarBotaoCalendarioMobile();
}

function filtrarItens() {
  let compromissos = todosEventos.filter((e) => !ehTarefa(e) && passaFiltroOrigem(e));
  let tarefas = todosEventos.filter((e) => ehTarefa(e) && passaFiltroOrigem(e));

  if (filtroDataAtivo()) {
    const { start, end } = intervaloPeriodoLista(ancoraPeriodoLista());
    compromissos = compromissos.filter((e) => compromissoNoPeriodo(e, start, end));
    tarefas = tarefas.filter((e) => tarefaNoPeriodo(e, start, end));
  } else {
    const agora = new Date();
    compromissos = compromissos.filter((e) => !AgendaAPI.compromissoEncerrado(e, agora));
    if (filtroTarefas === "pendentes") {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      tarefas = tarefas.filter((e) => !e.concluida && new Date(e.inicio) >= inicioDia);
    }
  }

  if (filtroTarefas === "pendentes") {
    tarefas = tarefas.filter((e) => !e.concluida);
  }

  compromissos.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  tarefas.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  return { compromissos, tarefas };
}

function definirPeriodoLista(valor) {
  if (!PERIODOS_LISTA[valor]) return;
  periodoLista = valor;
  atualizarSelectsPeriodo();
  renderListas();
}

function atualizarSelectsPeriodo() {
  document.querySelectorAll("[data-periodo-lista]").forEach((sel) => {
    if (sel.value !== periodoLista) sel.value = periodoLista;
  });
}

function vincularSelectsPeriodo() {
  document.querySelectorAll("[data-periodo-lista]").forEach((sel) => {
    sel.addEventListener("change", () => definirPeriodoLista(sel.value));
  });
}

function textoPeriodoLista() {
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
  const fmtIntervalo = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
  const anchor = ancoraPeriodoLista();
  const { start, end } = intervaloPeriodoLista(anchor);

  switch (periodoLista) {
    case "diario":
      return "atividades em " + fmt.format(anchor);
    case "4dias":
      return "atividades de " + fmtIntervalo.format(start) + " a " + fmtIntervalo.format(end);
    case "semanal":
      return "atividades da semana de " + fmtIntervalo.format(start);
    case "quinzenal":
      return "atividades de " + fmtIntervalo.format(start) + " a " + fmtIntervalo.format(end);
    case "mensal": {
      const mes = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(anchor);
      return "atividades em " + mes + " de " + anchor.getFullYear();
    }
    default:
      return "atividades";
  }
}

function atualizarFiltroTarefasBadges() {
  if (!ui.filtroTarefasBtns) return;
  ui.filtroTarefasBtns.forEach((btn) => {
    btn.classList.toggle("is-ativo", btn.dataset.filtroTarefas === filtroTarefas);
  });
}

function atualizarFiltroOrigensBadges() {
  if (!ui.filtroOrigemBtns) return;
  ui.filtroOrigemBtns.forEach((btn) => {
    const ativo = filtroOrigens.has(btn.dataset.filtroOrigem);
    btn.classList.toggle("is-ativo", ativo);
    btn.setAttribute("aria-pressed", ativo ? "true" : "false");
  });
}

function alternarFiltroOrigem(origem) {
  const key = normalizarOrigem(origem);
  if (filtroOrigens.has(key)) {
    filtroOrigens.delete(key);
  } else {
    filtroOrigens.add(key);
  }
  atualizarFiltroOrigensBadges();
  renderMiniCalendario();
  renderListas();
}

function definirFiltroTarefas(valor) {
  if (filtroTarefas === valor) return;
  filtroTarefas = valor;
  atualizarFiltroTarefasBadges();
  renderListas();
}

function definirAbaListasMobile(aba) {
  if (abaListasMobile === aba) return;
  abaListasMobile = aba;
  atualizarAbasListasMobile();
  notificarAlturaFrame();
}

function ehMobileListas() {
  return window.matchMedia("(max-width: 576px)").matches;
}

function atualizarBotaoCalendarioMobile() {
  if (!ui.btnToggleCalendario) return;
  let label = "Abrir calendário";
  if (diaFiltro) {
    label =
      "Calendário: " +
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(diaFiltro);
    ui.btnToggleCalendario.classList.add("is-filtrado");
  } else {
    label = "Calendário: " + MESES[mesAtual.getMonth()] + " " + mesAtual.getFullYear();
    ui.btnToggleCalendario.classList.remove("is-filtrado");
  }
  ui.btnToggleCalendario.setAttribute("aria-label", label);
  ui.btnToggleCalendario.title = label;
}

function setCalendarioMobileAberto(aberto) {
  calendarioMobileAberto = !!aberto;
  document.body.classList.toggle("agenda-cal-aberto", calendarioMobileAberto && ehMobileListas());
  ui.calDrawer?.classList.toggle("is-open", calendarioMobileAberto && ehMobileListas());
  ui.calBackdrop?.classList.toggle("is-visible", calendarioMobileAberto && ehMobileListas());
  ui.calBackdrop?.setAttribute("aria-hidden", calendarioMobileAberto ? "false" : "true");
  ui.btnToggleCalendario?.setAttribute(
    "aria-expanded",
    calendarioMobileAberto && ehMobileListas() ? "true" : "false"
  );
  notificarAlturaFrame();
}

function abrirCalendarioMobile() {
  if (!ehMobileListas()) return;
  setCalendarioMobileAberto(true);
}

function fecharCalendarioMobile() {
  setCalendarioMobileAberto(false);
}

function toggleCalendarioMobile() {
  if (!ehMobileListas()) return;
  setCalendarioMobileAberto(!calendarioMobileAberto);
}

function atualizarAbasListasMobile() {
  if (!ui.listasTabs?.length) return;
  const mobile = ehMobileListas();

  ui.listasTabs.forEach((tab) => {
    const ativo = tab.dataset.agendaTab === abaListasMobile;
    tab.classList.toggle("is-ativo", ativo);
    tab.setAttribute("aria-selected", mobile && ativo ? "true" : "false");
    tab.tabIndex = mobile ? (ativo ? 0 : -1) : -1;
  });

  [
    { id: "atividades", el: ui.painelAtividades },
    { id: "tarefas", el: ui.painelTarefas },
  ].forEach(({ id, el }) => {
    if (!el) return;
    const ativo = abaListasMobile === id;
    el.classList.toggle("agenda-lista-painel--ativo", !mobile || ativo);
    if (mobile) el.hidden = !ativo;
    else el.hidden = false;
  });
}

function dataIsoCompromisso(data) {
  if (AgendaAPI.paraInputData) return AgendaAPI.paraInputData(data);
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

const ORDEM_ORIGEM_COMPROMISSO = {
  campanha: 0,
  eventos: 1,
  gabinete: 2,
};

function indiceOrdemOrigemCompromisso(ev) {
  const origem = normalizarOrigem(ev.origem);
  const ordem = ORDEM_ORIGEM_COMPROMISSO[origem];
  return ordem == null ? 99 : ordem;
}

function ordenarCompromissosNoGrupo(a, b) {
  const diffOrigem = indiceOrdemOrigemCompromisso(a) - indiceOrdemOrigemCompromisso(b);
  if (diffOrigem !== 0) return diffOrigem;
  return new Date(a.inicio) - new Date(b.inicio);
}

function agruparCompromissosPorData(compromissos) {
  const grupos = new Map();
  let periodo = null;
  if (filtroDataAtivo()) {
    periodo = intervaloPeriodoLista(ancoraPeriodoLista());
  }

  compromissos.forEach((ev) => {
    const diasExibir = periodo
      ? diasCompromissoNoPeriodo(ev, periodo.start, periodo.end)
      : [new Date(ev.inicio)];

    diasExibir.forEach((dataExibida) => {
      const dataIso = dataIsoCompromisso(dataExibida);
      if (!grupos.has(dataIso)) {
        grupos.set(dataIso, { dataExibida: inicioDiaLocal(dataExibida), dataIso, eventos: [] });
      }
      grupos.get(dataIso).eventos.push(ev);
    });
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      grupo.eventos.sort(ordenarCompromissosNoGrupo);
      return grupo;
    })
    .sort((a, b) => a.dataExibida.getTime() - b.dataExibida.getTime());
}

function htmlHorarioCompromisso(ev) {
  const hora = AgendaAPI.formatarHorarioCompromisso(ev);
  const horaClasse = ev.diaInteiro
    ? "lista-evento-horario lista-evento-horario--dia-inteiro"
    : "lista-evento-horario";
  return `<span class="${horaClasse} lista-evento-horario-titulo">${escapar(hora)}</span>`;
}

function htmlItemCompromissoNoGrupo(ev, dataIso) {
  const origem = normalizarOrigem(ev.origem);
  const rotuloOrigem = ev.origemTitulo || ORIGENS[origem]?.rotulo || origem;

  return (
    `<button type="button" class="lista-evento-item lista-evento-grupo-item lista-evento-${origem} lista-evento-acao" data-id="${escapar(ev.id)}" data-data="${escapar(dataIso)}">` +
    `<div class="lista-evento-corpo text-start">` +
  `<div class="lista-evento-meta-linha">` +
  `<span class="lista-evento-meta-esquerda">` +
  `${ev.local ? `<span class="lista-evento-local lista-evento-local-badge">${escapar(ev.local)}</span>` : ""}` +
  `</span>` +
  `<span class="badge-origem badge-origem-${origem}">${escapar(rotuloOrigem)}</span>` +
  `</div>` +
    `<div class="lista-evento-titulo-linha">` +
    `<strong>${escapar(ev.titulo)}</strong>` +
    `</div>` +
    htmlHorarioCompromisso(ev) +
    `${ev.descricao ? `<span class="small lista-evento-descricao">${escapar(textoMultilinha(ev.descricao))}</span>` : ""}` +
    `</div>` +
    `</button>`
  );
}

function htmlGrupoCompromissos(grupo) {
  const dataExibida = grupo.dataExibida;

  return (
    `<div class="lista-evento-grupo">` +
    `<div class="lista-evento-grupo-data lista-evento-data">` +
    `<span class="lista-evento-dia">${dataExibida.getDate()}</span>` +
    `<span class="lista-evento-mes">${mesAbreviadoCardAgenda(dataExibida)}</span>` +
    `<span class="lista-evento-semana">${DIAS_SEMANA_EXTENSO[dataExibida.getDay()] || ""}</span>` +
    `</div>` +
    `<div class="lista-evento-grupo-lista">` +
    grupo.eventos.map((ev) => htmlItemCompromissoNoGrupo(ev, grupo.dataIso)).join("") +
    `</div>` +
    `</div>`
  );
}

function htmlItemTarefa(ev) {
  const inicio = new Date(ev.inicio);
  const origem = normalizarOrigem(ev.origem);
  const rotuloOrigem = ev.origemTitulo || ORIGENS[origem]?.rotulo || origem;
  const concluida = !!ev.concluida;
  return `
    <div class="lista-evento-item lista-evento-${origem} lista-evento-tarefa${concluida ? " lista-evento-tarefa--concluida" : ""}">
      <label class="agenda-tarefa-check-wrap mb-0">
        <input type="checkbox" class="form-check-input agenda-tarefa-check" data-id="${escapar(ev.id)}" data-origem="${escapar(origem)}" ${concluida ? "checked" : ""} aria-label="marcar tarefa como concluída" />
      </label>
      <button type="button" class="lista-evento-corpo lista-evento-acao text-start flex-grow-1 border-0 bg-transparent p-0" data-id="${escapar(ev.id)}">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <strong class="${concluida ? "text-decoration-line-through text-secondary" : ""}">${escapar(ev.titulo)}</strong>
          <span class="badge-origem badge-origem-${origem}">${escapar(rotuloOrigem)}</span>
        </div>
        <span class="text-secondary small d-block">prazo: ${AgendaAPI.formatarPrazoTarefa(ev.inicio)}</span>
        ${ev.descricao ? `<span class="small lista-evento-descricao">${escapar(textoMultilinha(ev.descricao))}</span>` : ""}
      </button>
    </div>`;
}

function vincularAcoesLista(container) {
  if (!container) return;
  container.querySelectorAll(".lista-evento-acao").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ev = todosEventos.find((e) => e.id === btn.dataset.id);
      if (ev) abrirEditarItem(ev);
    });
  });
}

function vincularChecksTarefas() {
  ui.listaTarefas.querySelectorAll(".agenda-tarefa-check").forEach((chk) => {
    chk.addEventListener("change", async () => {
      const id = chk.dataset.id;
      const origem = chk.dataset.origem || "";
      const concluida = chk.checked;
      chk.disabled = true;
      try {
        await AgendaAPI.alternarTarefa(id, concluida, origem);
        const ev = todosEventos.find((e) => e.id === id);
        if (ev) ev.concluida = concluida;
        renderListas();
      } catch (err) {
        chk.checked = !concluida;
        statusPainel(ui.status, "Erro: " + mensagemErroAgenda(err), "erro");
      } finally {
        chk.disabled = false;
      }
    });
  });
}

function atualizarTituloLista() {
  const texto = filtroDataAtivo() ? textoPeriodoLista() : "próximas atividades";

  if (ui.tituloLista) ui.tituloLista.textContent = texto;
  if (ui.tituloListaMobile) ui.tituloListaMobile.textContent = texto;
}

function renderListas() {
  const { compromissos, tarefas } = filtrarItens();

  atualizarTituloLista();
  atualizarBotaoCalendarioMobile();

  if (!compromissos.length) {
    ui.lista.innerHTML =
      '<p class="text-secondary text-center py-4 mb-0">nenhuma atividade neste período.</p>';
  } else {
    ui.lista.innerHTML = agruparCompromissosPorData(compromissos)
      .map(htmlGrupoCompromissos)
      .join("");
    vincularAcoesLista(ui.lista);
  }

  if (!tarefas.length) {
    ui.listaTarefas.innerHTML =
      '<p class="text-secondary text-center py-4 mb-0">' +
      (filtroTarefas === "pendentes"
        ? "nenhuma tarefa pendente neste período."
        : "nenhuma tarefa neste período.") +
      "</p>";
  } else {
    ui.listaTarefas.innerHTML = tarefas.map(htmlItemTarefa).join("");
    vincularAcoesLista(ui.listaTarefas);
    vincularChecksTarefas();
  }

  notificarAlturaFrame();
}

function escapar(txt) {
  const d = document.createElement("div");
  d.textContent = txt || "";
  return d.innerHTML;
}

function textoMultilinha(txt) {
  return String(txt || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function atualizarSeletorAgendas(agendas) {
  const fieldset = document.getElementById("evOrigemFieldset");
  const aviso = document.getElementById("evOrigemAviso");
  if (!fieldset) return;

  if (agendas) {
    agendasGravacao = {};
    Object.keys(agendas).forEach((key) => {
      agendasGravacao[key] = !!agendas[key].gravacao;
    });
  }

  const opcoes = fieldset.querySelectorAll(".agenda-origem-opcao");
  let algumaGravacao = false;

  opcoes.forEach((label) => {
    const input = label.querySelector('input[name="evOrigem"]');
    if (!input) return;
    const key = input.value;
    const disponivel = !!agendasGravacao[key];
    label.classList.toggle("agenda-origem-opcao--indisponivel", !disponivel);
    input.disabled = !disponivel;
    if (disponivel) algumaGravacao = true;
  });

  const marcada = document.querySelector('input[name="evOrigem"]:checked');
  if (!modoEdicao && (!marcada || marcada.disabled)) {
    const primeira = fieldset.querySelector('input[name="evOrigem"]:not(:disabled)');
    if (primeira) primeira.checked = true;
  }

  if (aviso) {
    const indisponiveis = Object.keys(agendasGravacao).filter(
      (key) => agendasGravacao[key] === false
    );
    aviso.textContent =
      indisponiveis.length > 0
        ? `Agenda(s) ainda não configurada(s) no servidor (Apps Script): ${indisponiveis.join(", ")}.`
        : "";
    aviso.classList.toggle("d-none", indisponiveis.length === 0);
  }

  fieldset.classList.toggle("d-none", !algumaGravacao);
}

function extrairDataDoCampo(el) {
  const v = String(el?.value || "").trim();
  if (!v) return AgendaAPI.paraInputData(new Date());
  return v.length >= 10 ? v.slice(0, 10) : v;
}

function aplicarModoDiaInteiro(diaInteiro) {
  const inicioEl = ui.evInicio;
  const fimEl = ui.evFim;
  const inicioAtual = extrairDataDoCampo(inicioEl);
  const fimAtual = extrairDataDoCampo(fimEl) || inicioAtual;

  if (diaInteiro) {
    inicioEl.type = "date";
    fimEl.type = "date";
    inicioEl.value = inicioAtual;
    fimEl.value = fimAtual;
    fimEl.disabled = false;
  } else {
    const horaInicio = inicioEl.type === "datetime-local" && inicioEl.value.includes("T")
      ? inicioEl.value.slice(11, 16)
      : "09:00";
    const horaFim = fimEl.type === "datetime-local" && fimEl.value.includes("T")
      ? fimEl.value.slice(11, 16)
      : "10:00";
    inicioEl.type = "datetime-local";
    fimEl.type = "datetime-local";
    inicioEl.value = inicioAtual + "T" + horaInicio;
    fimEl.value = fimAtual + "T" + horaFim;
    fimEl.disabled = false;
  }

  ui.evLembrete.disabled = diaInteiro;
}

function aplicarCamposTipo(tipo) {
  const ehTarefaForm = tipo === "tarefa";
  ui.camposEvento.classList.toggle("d-none", ehTarefaForm);
  ui.camposTarefa.classList.toggle("d-none", !ehTarefaForm);
  ui.evInicio.required = !ehTarefaForm;
  ui.evPrazo.required = ehTarefaForm;
  ui.evConcluidaWrap.classList.toggle("d-none", !modoEdicao || !ehTarefaForm);
}

function definirTipoFormulario(tipo) {
  const input = document.querySelector(`input[name="evTipo"][value="${tipo}"]`);
  if (input) input.checked = true;
  aplicarCamposTipo(tipo);
}

function definirOrigemFormulario(origem) {
  const key = normalizarOrigem(origem);
  document.querySelectorAll('input[name="evOrigem"]').forEach((inp) => {
    inp.checked = inp.value === key;
  });
}

function definirOrigemPadrao() {
  const padrao = CONFIG.AGENDA?.ORIGEM_PADRAO || "campanha";
  definirOrigemFormulario(padrao);
}

function setSalvandoModal(ativo) {
  ui.modalSalvando?.classList.toggle("d-none", !ativo);
  ui.modalSalvando?.setAttribute("aria-hidden", ativo ? "false" : "true");
  ui.modalSalvando?.setAttribute("aria-busy", ativo ? "true" : "false");
  if (ui.btnSalvar) ui.btnSalvar.disabled = ativo;
  if (ui.btnExcluir) ui.btnExcluir.disabled = ativo;
}

function mensagemErroAgenda(err) {
  const msg = String(err?.message || err || "");
  const m = msg.match(/Agenda não cadastrada:\s*(\w+)/i);
  if (m) {
    const chave = m[1];
    return (
      `A agenda ${chave} não está configurada no Apps Script. ` +
      `Configure AGENDAS.${chave}.id e publique nova versão do Web App.`
    );
  }
  return msg.replace(/^Error:\s*/i, "");
}

function abrirModalItem(tipo, data, ev) {
  modoEdicao = !!ev;
  ui.form.reset();
  ui.evId.value = ev ? ev.id : "";
  ui.evOrigemSalva.value = ev ? normalizarOrigem(ev.origem) : "";
  atualizarSeletorAgendas();
  AgendaAPI.alerta(ui.statusModal, "", null);

  const inicio = ev ? new Date(ev.inicio) : data || diaFiltro || new Date();
  const tipoItem = ev ? (ehTarefa(ev) ? "tarefa" : "evento") : tipo || "evento";

  definirTipoFormulario(tipoItem);
  document.querySelectorAll('input[name="evTipo"]').forEach((input) => {
    input.disabled = modoEdicao;
  });
  ui.tipoFieldset.classList.toggle("d-none", modoEdicao);

  if (ev) {
    ui.modalTitulo.textContent = ehTarefa(ev) ? "editar tarefa" : "editar atividade";
    ui.evTitulo.value = ev.titulo || "";
    ui.evDescricao.value = ev.descricao || "";
    definirOrigemFormulario(ev.origem);
    if (ehTarefa(ev)) {
      ui.evPrazo.value = AgendaAPI.diaDeIso(ev.inicio);
      ui.evConcluida.checked = !!ev.concluida;
    } else {
      ui.diaInteiro.checked = !!ev.diaInteiro;
      aplicarModoDiaInteiro(ui.diaInteiro.checked);
      if (ev.diaInteiro) {
        ui.evInicio.value = AgendaAPI.paraInputData(inicio);
        ui.evFim.value = ev.fim
          ? AgendaAPI.diaInteiroFimInclusive(ev.fim)
          : AgendaAPI.paraInputData(inicio);
      } else {
        ui.evInicio.value = AgendaAPI.paraInputLocal(inicio);
        ui.evFim.value = ev.fim ? AgendaAPI.paraInputLocal(new Date(ev.fim)) : "";
      }
      ui.evLocal.value = ev.local || "";
      ui.evLembrete.value = CONFIG.AGENDA.LEMBRETE_PADRAO_MIN;
    }
  } else {
    ui.modalTitulo.textContent = tipoItem === "tarefa" ? "nova tarefa" : "nova atividade";
    definirOrigemPadrao();
    ui.evInicio.value = AgendaAPI.paraInputLocal(inicio);
    const fim = new Date(inicio.getTime() + CONFIG.AGENDA.DURACAO_PADRAO_MIN * 60000);
    ui.evFim.value = AgendaAPI.paraInputLocal(fim);
    ui.diaInteiro.checked = false;
    aplicarModoDiaInteiro(false);
    ui.evPrazo.value = AgendaAPI.paraInputData(inicio);
    ui.evLembrete.value = CONFIG.AGENDA.LEMBRETE_PADRAO_MIN;
    ui.evConcluida.checked = false;
  }

  ui.btnExcluir.classList.toggle("d-none", !modoEdicao);
  aplicarCamposTipo(tipoItem);
  modalEvento.show();
}

function abrirNovoEvento(data) {
  abrirModalItem("evento", data, null);
}

function abrirEditarItem(ev) {
  abrirModalItem(ehTarefa(ev) ? "tarefa" : "evento", null, ev);
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
    const resultado = await AgendaAPI.buscar(inicio, fim);
    if (resultado === null) return;

    todosEventos = resultado.eventos;
    atualizarSeletorAgendas(resultado.agendas);
    statusPainel(ui.status, "", null);
    renderMiniCalendario();
    renderListas();
  } catch (err) {
    statusPainel(ui.status, "Erro: " + err.message, "erro");
  }
}

function origemAnterior() {
  return normalizarOrigem(ui.evOrigemSalva?.value || "");
}

function origemSelecionada() {
  const marcada = document.querySelector('input[name="evOrigem"]:checked');
  if (marcada) return normalizarOrigem(marcada.value);
  const anterior = origemAnterior();
  return anterior || "campanha";
}

function lerFormulario() {
  const tipo = tipoSelecionado();
  const origem = origemSelecionada();
  const base = {
    id: ui.evId.value || undefined,
    titulo: ui.evTitulo.value.trim(),
    descricao: textoMultilinha(ui.evDescricao.value),
    origem: origem,
    tipo: tipo,
  };

  if (modoEdicao) {
    const anterior = origemAnterior();
    if (anterior) base.origemAnterior = anterior;
    const ev = todosEventos.find((e) => e.id === base.id);
    if (ev?.legadoCalendario) base.legadoCalendario = true;
  }

  if (tipo === "tarefa") {
    const prazo = ui.evPrazo.value;
    if (!prazo) throw new Error("Informe o prazo da tarefa.");
    return Object.assign(base, {
      inicio: prazo,
      concluida: ui.evConcluida.checked,
    });
  }

  const inicioVal = ui.evInicio.value;
  if (!inicioVal) throw new Error("Informe o início.");

  if (ui.diaInteiro.checked) {
    const inicioYmd = extrairDataDoCampo(ui.evInicio);
    const fimYmd = extrairDataDoCampo(ui.evFim) || inicioYmd;
    if (fimYmd < inicioYmd) {
      throw new Error("A data de fim não pode ser anterior à data de início.");
    }
    return Object.assign(base, {
      inicio: AgendaAPI.isoDeDataLocal(inicioYmd),
      fim: AgendaAPI.isoDeDataLocal(AgendaAPI.diaInteiroFimExclusivo(fimYmd)),
      local: ui.evLocal.value.trim(),
      diaInteiro: true,
      duracaoMin: CONFIG.AGENDA.DURACAO_PADRAO_MIN,
      lembreteMin: "",
    });
  }

  return Object.assign(base, {
    inicio: new Date(inicioVal).toISOString(),
    fim: ui.evFim.value ? new Date(ui.evFim.value).toISOString() : null,
    local: ui.evLocal.value.trim(),
    diaInteiro: ui.diaInteiro.checked,
    duracaoMin: CONFIG.AGENDA.DURACAO_PADRAO_MIN,
    lembreteMin: ui.evLembrete.value,
  });
}

async function salvarFormulario(e) {
  e.preventDefault();
  if (!AgendaAPI.configValida()) return;

  const origem = origemSelecionada();
  if (agendasGravacao[origem] === false) {
    AgendaAPI.alerta(ui.statusModal, mensagemErroAgenda("Agenda não cadastrada: gabinete"), "erro");
    return;
  }

  let dados;
  try {
    dados = lerFormulario();
  } catch (err) {
    AgendaAPI.alerta(ui.statusModal, err.message, "erro");
    return;
  }

  setSalvandoModal(true);
  AgendaAPI.alerta(ui.statusModal, "", null);

  let toastAtividade = null;

  try {
    if (modoEdicao) {
      await AgendaAPI.atualizar(dados);
      if (dados.tipo === "tarefa") {
        const transferiu =
          dados.origemAnterior && dados.origemAnterior !== dados.origem;
        statusPainel(
          ui.status,
          transferiu
            ? "Tarefa transferida e atualizada!"
            : "Tarefa atualizada!",
          "sucesso"
        );
      } else {
        toastAtividade = "atividade editada com sucesso";
      }
    } else {
      await AgendaAPI.criar(dados);
      if (dados.tipo === "tarefa") {
        statusPainel(ui.status, "Tarefa adicionada!", "sucesso");
      } else {
        toastAtividade = "atividade inserida com sucesso";
      }
    }
    modalEvento.hide();
    await carregarEventos();
  } catch (err) {
    AgendaAPI.alerta(ui.statusModal, "Erro: " + mensagemErroAgenda(err), "erro");
  } finally {
    setSalvandoModal(false);
  }

  if (toastAtividade && window.AppToast) {
    AppToast.show(toastAtividade, "sucesso");
  }
}

async function excluirItem() {
  if (!modoEdicao || !ui.evId.value) return;
  if (!(await AppConfirm.confirm("Excluir este item da agenda?", { perigo: true, icon: "warning" }))) return;

  const ev = todosEventos.find((e) => e.id === ui.evId.value);
  const origem = ev ? normalizarOrigem(ev.origem) : origemAnterior() || origemSelecionada();

  setSalvandoModal(true);
  try {
    await AgendaAPI.excluir(ui.evId.value, origem);
    modalEvento.hide();
    statusPainel(ui.status, "Item excluído.", "sucesso");
    await carregarEventos();
  } catch (err) {
    AgendaAPI.alerta(ui.statusModal, "Erro: " + mensagemErroAgenda(err), "erro");
  } finally {
    setSalvandoModal(false);
  }
}

function montarUi() {
  ui = {
    status: document.getElementById("status"),
    statusModal: document.getElementById("statusModal"),
    form: document.getElementById("formEvento"),
    evId: document.getElementById("evId"),
    evOrigemSalva: document.getElementById("evOrigemSalva"),
    modalTitulo: document.getElementById("modalEventoTitulo"),
    btnSalvar: document.getElementById("btnSalvarEvento"),
    btnExcluir: document.getElementById("btnExcluirEvento"),
    btnNova: document.getElementById("btnNova"),
    btnNovaDesktop: document.getElementById("btnNovaDesktop"),
    diaInteiro: document.getElementById("evDiaInteiro"),
    evInicio: document.getElementById("evInicio"),
    evFim: document.getElementById("evFim"),
    evPrazo: document.getElementById("evPrazo"),
    evTitulo: document.getElementById("evTitulo"),
    evDescricao: document.getElementById("evDescricao"),
    evLocal: document.getElementById("evLocal"),
    evLembrete: document.getElementById("evLembrete"),
    evConcluida: document.getElementById("evConcluida"),
    evConcluidaWrap: document.getElementById("evConcluidaWrap"),
    camposEvento: document.getElementById("evCamposEvento"),
    camposTarefa: document.getElementById("evCamposTarefa"),
    tipoFieldset: document.getElementById("evTipoFieldset"),
    modalSalvando: document.getElementById("evModalSalvando"),
    miniCal: document.getElementById("miniCalendario"),
    btnSelMes: document.getElementById("btnSelMes"),
    btnSelAno: document.getElementById("btnSelAno"),
    picker: document.getElementById("pickerPeriodo"),
    pickerTitulo: document.getElementById("pickerPeriodoTitulo"),
    pickerCorpo: document.getElementById("pickerPeriodoCorpo"),
    pickerFechar: document.getElementById("pickerFechar"),
    pickerBackdrop: document.getElementById("pickerBackdrop"),
    pickerCarregando: document.getElementById("pickerCarregando"),
    calCard: document.querySelector(".vanilla-cal-card"),
    calCarregando: document.getElementById("calAgendaCarregando"),
    lista: document.getElementById("listaEventos"),
    listaTarefas: document.getElementById("listaTarefas"),
    tituloLista: document.getElementById("tituloLista"),
    tituloListaMobile: document.getElementById("tituloListaMobile"),
    tituloTarefas: document.getElementById("tituloTarefas"),
    filtroTarefasBtns: document.querySelectorAll("[data-filtro-tarefas]"),
    filtroOrigemBtns: document.querySelectorAll("[data-filtro-origem]"),
    listasTabs: document.querySelectorAll("[data-agenda-tab]"),
    painelAtividades: document.getElementById("painelAgendaAtividades"),
    painelTarefas: document.getElementById("painelAgendaTarefas"),
    btnMesAnt: document.getElementById("btnMesAnt"),
    btnMesProx: document.getElementById("btnMesProx"),
    calDrawer: document.getElementById("agendaCalDrawer"),
    calBackdrop: document.getElementById("agendaCalBackdrop"),
    btnToggleCalendario: document.getElementById("btnToggleCalendario"),
    btnFecharCalendario: document.getElementById("btnFecharCalendario"),
    btnRelatorioTarefas: document.getElementById("btnRelatorioTarefas"),
  };
}

function abrirRelatorioTarefas() {
  if (!window.Relatorio) return;
  Relatorio.abrirJanela({
    agendaListas: "tarefas",
    titulo: "agenda",
    subtitulo: "tarefas",
  });
}

function initAgenda() {
  montarUi();
  if (!ui.miniCal) return;

  const modalEl = document.getElementById("modalEvento");
  modalEvento = modalEl ? new bootstrap.Modal(modalEl) : null;

  ui.form.addEventListener("submit", salvarFormulario);
  ui.btnExcluir.addEventListener("click", excluirItem);

  document.querySelectorAll('input[name="evTipo"]').forEach((input) => {
    input.addEventListener("change", () => aplicarCamposTipo(tipoSelecionado()));
  });

  ui.diaInteiro.addEventListener("change", () => {
    aplicarModoDiaInteiro(ui.diaInteiro.checked);
  });

  ui.btnNova.addEventListener("click", () => abrirNovoEvento());
  ui.btnNovaDesktop?.addEventListener("click", () => abrirNovoEvento());
  ui.btnRelatorioTarefas?.addEventListener("click", abrirRelatorioTarefas);

  ui.btnToggleCalendario?.addEventListener("click", () => toggleCalendarioMobile());
  ui.btnFecharCalendario?.addEventListener("click", () => fecharCalendarioMobile());
  ui.calBackdrop?.addEventListener("click", () => fecharCalendarioMobile());

  ui.filtroTarefasBtns.forEach((btn) => {
    btn.addEventListener("click", () => definirFiltroTarefas(btn.dataset.filtroTarefas));
  });
  ui.filtroOrigemBtns.forEach((btn) => {
    btn.addEventListener("click", () => alternarFiltroOrigem(btn.dataset.filtroOrigem));
  });
  ui.listasTabs.forEach((tab) => {
    tab.addEventListener("click", () => definirAbaListasMobile(tab.dataset.agendaTab));
  });
  atualizarFiltroTarefasBadges();
  atualizarFiltroOrigensBadges();
  atualizarAbasListasMobile();
  vincularSelectsPeriodo();
  atualizarSelectsPeriodo();

  window.addEventListener("resize", () => {
    if (!ehMobileListas()) fecharCalendarioMobile();
    atualizarAbasListasMobile();
    atualizarBotaoCalendarioMobile();
    if (!ehMobileListas()) notificarAlturaFrame();
  });

  ui.btnMesAnt.addEventListener("click", () => {
    avancarMesCalendario(-1);
  });

  ui.btnMesProx.addEventListener("click", () => {
    avancarMesCalendario(1);
  });

  ui.btnSelMes.addEventListener("click", abrirSeletorMes);
  ui.btnSelAno.addEventListener("click", abrirSeletorAno);
  ui.pickerFechar.addEventListener("click", fecharPicker);
  ui.pickerBackdrop.addEventListener("click", fecharPicker);

  atualizarTituloHeader();
  atualizarBotaoCalendarioMobile();
  carregarEventos();
}

window.atualizarPagina = carregarEventos;

function estilosRelatorioPagina() {
  return (
    ".page-agenda .rel-secao{margin:0.45rem 0 0.55rem;page-break-inside:auto;break-inside:auto;}" +
    ".page-agenda .rel-secao h2{margin-bottom:0.35rem;page-break-after:avoid;break-after:avoid-page;}" +
    ".page-agenda .rel-secao + .rel-secao{page-break-before:avoid;break-before:avoid-page;margin-top:0.25rem;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela{table-layout:fixed;width:100%;margin-top:0.15rem;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela th.agenda-rel-col-data," +
    ".page-agenda table.rel-tabela.agenda-rel-tabela td.agenda-rel-col-data{width:14%;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela th.agenda-rel-col-data{vertical-align:top;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela td.agenda-rel-col-data{vertical-align:middle;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela th.agenda-rel-col-local," +
    ".page-agenda table.rel-tabela.agenda-rel-tabela td.agenda-rel-col-local{width:22%;vertical-align:top;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela th.agenda-rel-col-info," +
    ".page-agenda table.rel-tabela.agenda-rel-tabela td.agenda-rel-col-info{width:64%;vertical-align:top;}" +
    ".page-agenda table.rel-tabela.agenda-rel-tabela td.agenda-rel-grupo-data{background:#f8fafc;}" +
    ".page-agenda .agenda-rel-evento-sub td.agenda-rel-col-local," +
    ".page-agenda .agenda-rel-evento-sub td.agenda-rel-col-info{border-top:1px solid #e8edf2;padding-top:0.4rem;}" +
    ".page-agenda .agenda-rel-evento-primeiro:not(:first-child) td{border-top:2px solid #e2e8f0;padding-top:0.45rem;}" +
    ".page-agenda .agenda-rel-info-stack{display:block;line-height:1.3;}" +
    ".page-agenda .agenda-rel-titulo-stack,.page-agenda .agenda-rel-data-stack{display:block;line-height:1.3;}" +
    ".page-agenda .agenda-rel-titulo{font-weight:600;color:#1e293b;}" +
    ".page-agenda .agenda-rel-origem{margin-top:0.12rem;font-size:8pt;color:#64748b;font-weight:400;}" +
    ".page-agenda .agenda-rel-data-extenso{font-weight:600;color:#1e293b;font-size:8.5pt;line-height:1.25;}" +
    ".page-agenda .agenda-rel-data-semana{margin-top:0.08rem;font-size:7.5pt;color:#64748b;font-weight:400;}" +
    ".page-agenda .agenda-rel-horario{margin-top:0.15rem;font-size:7.5pt;font-weight:500;color:#64748b;line-height:1.25;font-variant-numeric:tabular-nums;}" +
    ".page-agenda .agenda-rel-horario--dia-inteiro{font-size:7pt;font-weight:500;color:#94a3b8;text-transform:lowercase;}" +
    ".page-agenda .agenda-rel-local-celula{position:relative;min-height:2.6rem;padding-bottom:0.35rem;}" +
    ".page-agenda .agenda-rel-local-corpo{display:block;}" +
    ".page-agenda .agenda-rel-local-texto{font-weight:600;font-size:8.5pt;color:#1e293b;line-height:1.3;}" +
    ".page-agenda .agenda-rel-local-celula .agenda-rel-horario{margin-top:0.15rem;}" +
    ".page-agenda .agenda-rel-local-origem{position:absolute;bottom:0;right:0;line-height:1;}" +
    ".page-agenda .agenda-rel-origem-badge{display:inline-block;font-size:7pt;font-weight:600;padding:0.1rem 0.4rem;border-radius:999px;text-transform:lowercase;line-height:1.25;}" +
    ".page-agenda .agenda-rel-origem-badge--campanha{background:#e8eef7;color:#1f4e8c;}" +
    ".page-agenda .agenda-rel-origem-badge--gabinete{background:#fdeee8;color:#9a4a3a;}" +
    ".page-agenda .agenda-rel-origem-badge--eventos{background:#dcfce7;color:#15803d;}" +
    ".page-agenda .agenda-rel-descricao{margin-top:0.2rem;font-size:8pt;color:#475569;line-height:1.35;white-space:pre-line;}" +
    "@media print{" +
    ".page-agenda .rel-secao{page-break-inside:auto!important;break-inside:auto!important;}" +
    ".page-agenda .rel-secao + .rel-secao{page-break-before:avoid!important;break-before:avoid-page!important;}" +
    "}"
  );
}

window.estilosRelatorioPagina = estilosRelatorioPagina;

AUTH.exigir();
document.addEventListener("DOMContentLoaded", initAgenda);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ui.picker && !ui.picker.classList.contains("d-none")) {
    fecharPicker();
    return;
  }
  if (e.key === "Escape" && calendarioMobileAberto) {
    fecharCalendarioMobile();
  }
});
