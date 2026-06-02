// Funções compartilhadas da agenda (calendário vanilla + Google Agenda).

const AgendaAPI = {
  fmtData: new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }),
  fmtDataCurta: new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }),
  fmtHora: new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }),

  configValida() {
    return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
  },

  urlGet(params) {
    const url = new URL(CONFIG.WEB_APP_URL);
    url.searchParams.set("recurso", "agenda");
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== "") url.searchParams.set(k, v);
    });
    AUTH.aplicarNaUrl(url);
    return url.toString();
  },

  async buscar(inicio, fim) {
    const resp = await fetch(
      this.urlGet({ inicio: inicio.toISOString(), fim: fim.toISOString() }),
      { method: "GET" }
    );
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao buscar agenda.");
    return json.eventos || [];
  },

  async criar(dados) {
    const corpo = Object.assign({ recurso: "agenda", chave: AUTH.getChave() }, dados);
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao salvar.");
    return json;
  },

  async atualizar(id, inicio, fim, diaInteiro) {
    const corpo = {
      recurso: "agenda",
      acao: "atualizar",
      chave: AUTH.getChave(),
      id: id,
      inicio: inicio instanceof Date ? inicio.toISOString() : inicio,
      fim: fim instanceof Date ? fim.toISOString() : fim,
      diaInteiro: !!diaInteiro,
    };
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao atualizar.");
    return json;
  },

  paraInputLocal(date) {
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
  },

  formatarQuando(ev) {
    const inicio = new Date(ev.inicio);
    const fim = ev.fim ? new Date(ev.fim) : null;
    if (ev.diaInteiro) {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(inicio);
    }
    let txt = this.fmtData.format(inicio);
    if (fim) txt += " até " + this.fmtHora.format(fim);
    return txt;
  },

  alerta(el, msg, tipo) {
    el.textContent = msg;
    el.className =
      "alert " +
      (tipo === "erro"
        ? "alert-danger"
        : tipo === "sucesso"
        ? "alert-success"
        : tipo === "carregando"
        ? "alert-info"
        : "d-none");
  },
};
