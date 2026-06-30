// Agenda — calendário vanilla (JS puro) + lista de compromissos e tarefas.

let ui = {};

const DIAS_SEM = ["S", "T", "Q", "Q", "S", "S", "D"];
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

  if (diaFiltro) {
    compromissos = compromissos.filter((e) => AgendaAPI.compromissoNoDia(e, diaFiltro));
    tarefas = tarefas.filter((e) => mesmoDia(new Date(e.inicio), diaFiltro));
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

function htmlItemCompromisso(ev) {
  const inicio = new Date(ev.inicio);
  const dataExibida =
    diaFiltro && AgendaAPI.compromissoNoDia(ev, diaFiltro) ? diaFiltro : inicio;
  const hora = ev.diaInteiro ? "dia inteiro" : AgendaAPI.fmtHora.format(inicio);
  const origem = normalizarOrigem(ev.origem);
  const rotuloOrigem = ev.origemTitulo || ORIGENS[origem]?.rotulo || origem;
  return `
    <button type="button" class="lista-evento-item lista-evento-${origem} lista-evento-acao" data-id="${escapar(ev.id)}">
      <div class="lista-evento-data">
        <span class="lista-evento-dia">${dataExibida.getDate()}</span>
        <span class="lista-evento-mes">${new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(dataExibida)}</span>
      </div>
      <div class="lista-evento-corpo text-start">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <strong>${escapar(ev.titulo)}</strong>
          <span class="badge-origem badge-origem-${origem}">${escapar(rotuloOrigem)}</span>
        </div>
        <span class="text-secondary small d-block">${hora}${ev.local ? " · " + escapar(ev.local) : ""}</span>
        ${ev.descricao ? `<span class="small">${escapar(ev.descricao)}</span>` : ""}
      </div>
    </button>`;
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
        ${ev.descricao ? `<span class="small">${escapar(ev.descricao)}</span>` : ""}
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

function renderListas() {
  const { compromissos, tarefas } = filtrarItens();

  if (diaFiltro) {
    ui.tituloLista.textContent =
      "atividades em " +
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(diaFiltro);
    ui.btnLimpar.classList.remove("d-none");
  } else {
    ui.tituloLista.textContent = "próximas atividades";
    ui.btnLimpar.classList.add("d-none");
  }

  atualizarBotaoCalendarioMobile();

  if (!compromissos.length) {
    ui.lista.innerHTML =
      '<p class="text-secondary text-center py-4 mb-0">nenhuma atividade neste período.</p>';
  } else {
    ui.lista.innerHTML = compromissos.map(htmlItemCompromisso).join("");
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
    descricao: ui.evDescricao.value.trim(),
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

  try {
    if (modoEdicao) {
      await AgendaAPI.atualizar(dados);
      const transferiu =
        dados.origemAnterior && dados.origemAnterior !== dados.origem;
      statusPainel(
        ui.status,
        transferiu
          ? dados.tipo === "tarefa"
            ? "Tarefa transferida e atualizada!"
            : "Atividade transferida e atualizada!"
          : dados.tipo === "tarefa"
          ? "Tarefa atualizada!"
          : "Atividade atualizada!",
        "sucesso"
      );
    } else {
      await AgendaAPI.criar(dados);
      statusPainel(ui.status, dados.tipo === "tarefa" ? "Tarefa adicionada!" : "Atividade adicionada!", "sucesso");
    }
    modalEvento.hide();
    await carregarEventos();
  } catch (err) {
    AgendaAPI.alerta(ui.statusModal, "Erro: " + mensagemErroAgenda(err), "erro");
  } finally {
    setSalvandoModal(false);
  }
}

async function excluirItem() {
  if (!modoEdicao || !ui.evId.value) return;
  if (!confirm("Excluir este item da agenda?")) return;

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
    tituloTarefas: document.getElementById("tituloTarefas"),
    filtroTarefasBtns: document.querySelectorAll("[data-filtro-tarefas]"),
    filtroOrigemBtns: document.querySelectorAll("[data-filtro-origem]"),
    listasTabs: document.querySelectorAll("[data-agenda-tab]"),
    painelAtividades: document.getElementById("painelAgendaAtividades"),
    painelTarefas: document.getElementById("painelAgendaTarefas"),
    btnLimpar: document.getElementById("btnLimparFiltro"),
    btnMesAnt: document.getElementById("btnMesAnt"),
    btnMesProx: document.getElementById("btnMesProx"),
    calDrawer: document.getElementById("agendaCalDrawer"),
    calBackdrop: document.getElementById("agendaCalBackdrop"),
    btnToggleCalendario: document.getElementById("btnToggleCalendario"),
    btnFecharCalendario: document.getElementById("btnFecharCalendario"),
  };
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

  window.addEventListener("resize", () => {
    if (!ehMobileListas()) fecharCalendarioMobile();
    atualizarAbasListasMobile();
    atualizarBotaoCalendarioMobile();
    if (!ehMobileListas()) notificarAlturaFrame();
  });

  ui.btnLimpar.addEventListener("click", () => {
    diaFiltro = null;
    renderMiniCalendario();
    renderListas();
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
