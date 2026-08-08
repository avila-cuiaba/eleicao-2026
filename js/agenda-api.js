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

  async _post(corpo) {
    const payload = Object.assign({ recurso: "agenda", chave: AUTH.getChave() }, corpo);
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha na operação.");
    return json;
  },

  async buscar(inicio, fim) {
    const resp = await fetch(
      this.urlGet({ inicio: inicio.toISOString(), fim: fim.toISOString() }),
      { method: "GET" }
    );
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao buscar agenda.");
    return {
      eventos: json.eventos || [],
      agendas: json.agendas || null,
    };
  },

  async criar(dados) {
    return this._post(dados);
  },

  async atualizar(dados) {
    return this._post(Object.assign({ acao: "atualizar" }, dados));
  },

  async excluir(id, origem) {
    return this._post({ acao: "excluir", id: id, origem: origem || "" });
  },

  async alternarTarefa(id, concluida, origem) {
    return this._post({
      acao: "alternar-tarefa",
      id: id,
      concluida: !!concluida,
      origem: origem || "",
    });
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

  paraInputData(date) {
    const z = (n) => String(n).padStart(2, "0");
    return date.getFullYear() + "-" + z(date.getMonth() + 1) + "-" + z(date.getDate());
  },

  /** Último dia inclusivo de compromisso dia inteiro (fim do Google é exclusivo). */
  diaInteiroFimInclusive(fimIso) {
    const d = new Date(fimIso);
    if (isNaN(d.getTime())) return this.paraInputData(new Date());
    d.setDate(d.getDate() - 1);
    return this.paraInputData(d);
  },

  /** Dia seguinte ao último dia inclusivo (fim exclusivo para o Google Calendar). */
  diaInteiroFimExclusivo(fimInclusiveYmd) {
    const m = String(fimInclusiveYmd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) throw new Error("Data de fim inválida.");
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setDate(d.getDate() + 1);
    return this.paraInputData(d);
  },

  isoDeDataLocal(ymd) {
    const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) throw new Error("Data inválida.");
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0).toISOString();
  },

  diaLocal(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  },

  /** Dias do calendário em que o compromisso deve aparecer (início inclusivo). */
  diasCompromisso(ev) {
    if (ev?.tipo === "tarefa") {
      return [this.diaLocal(ev.inicio)];
    }

    const inicio = new Date(ev.inicio);
    const start = this.diaLocal(inicio);

    if (ev.diaInteiro) {
      if (!ev.fim) return [start];
      const endExclusive = this.diaLocal(ev.fim);
      const dias = [];
      const cur = new Date(start);
      while (cur < endExclusive) {
        dias.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return dias.length ? dias : [start];
    }

    const fim = ev.fim ? new Date(ev.fim) : inicio;
    const ultimo = this.diaLocal(fim);
    const dias = [];
    const cur = new Date(start);
    while (cur <= ultimo) {
      dias.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dias.length ? dias : [start];
  },

  compromissoNoDia(ev, dia) {
    const alvo = this.diaLocal(dia).getTime();
    return this.diasCompromisso(ev).some((d) => this.diaLocal(d).getTime() === alvo);
  },

  /** Fim efetivo do compromisso (dia inteiro usa fim exclusivo do Google). */
  compromissoEncerrado(ev, ref = new Date()) {
    if (ev?.tipo === "tarefa") {
      const prazo = this.diaLocal(ev.inicio);
      prazo.setDate(prazo.getDate() + 1);
      return ref >= prazo;
    }

    const inicio = new Date(ev.inicio);
    let fimEfetivo;
    if (ev.diaInteiro) {
      if (ev.fim) {
        fimEfetivo = this.diaLocal(ev.fim);
      } else {
        fimEfetivo = this.diaLocal(inicio);
        fimEfetivo.setDate(fimEfetivo.getDate() + 1);
      }
    } else {
      fimEfetivo = ev.fim ? new Date(ev.fim) : inicio;
    }
    return ref >= fimEfetivo;
  },

  /** Extrai YYYY-MM-DD sem deslocar por fuso (prazo de tarefa do Google Tasks). */
  diaDeIso(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[1] + "-" + m[2] + "-" + m[3] : this.paraInputData(new Date(iso));
  },

  formatarPrazoTarefa(iso) {
    const ymd = this.diaDeIso(iso).split("-");
    if (ymd.length !== 3) return "";
    return ymd[2] + "/" + ymd[1] + "/" + ymd[0];
  },

  formatarHorarioCompromisso(ev) {
    if (ev.diaInteiro) return "dia inteiro";
    const inicio = new Date(ev.inicio);
    const iniTxt = this.fmtHora.format(inicio);
    if (!ev.fim) return iniTxt;
    const fim = new Date(ev.fim);
    const fimTxt = this.fmtHora.format(fim);
    if (iniTxt === fimTxt) return iniTxt;
    return iniTxt + " - " + fimTxt;
  },

  formatarQuando(ev) {
    if (ev.tipo === "tarefa") {
      const ymd = this.diaDeIso(ev.inicio).split("-");
      if (ymd.length === 3) {
        return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
          new Date(Number(ymd[0]), Number(ymd[1]) - 1, Number(ymd[2]), 12, 0, 0)
        );
      }
    }
    const inicio = new Date(ev.inicio);
    const fim = ev.fim ? new Date(ev.fim) : null;
    if (ev.diaInteiro) {
      const fimInc = ev.fim ? this.diaInteiroFimInclusive(ev.fim) : this.paraInputData(inicio);
      const iniTxt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(inicio);
      if (fimInc !== this.paraInputData(inicio)) {
        const fimD = fimInc.split("-");
        const fimDate = new Date(Number(fimD[0]), Number(fimD[1]) - 1, Number(fimD[2]), 12, 0, 0);
        const fimTxt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(fimDate);
        return iniTxt + " até " + fimTxt;
      }
      return iniTxt;
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
