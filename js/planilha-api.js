// Consulta e gravação (CRUD) no Web App do Apps Script.

const PlanilhaApi = {
  configValida() {
    return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
  },

  urlGet(planilha, aba) {
    const url = new URL(CONFIG.WEB_APP_URL);
    url.searchParams.set("planilha", planilha);
    if (aba) url.searchParams.set("aba", aba);
    AUTH.aplicarNaUrl(url);
    return url.toString();
  },

  mensagemErro(erro) {
    if (window.AUTH?.mensagemErroUsuario) return AUTH.mensagemErroUsuario(erro);
    let msg = erro?.message != null ? String(erro.message) : String(erro ?? "");
    return msg.replace(/^Error:\s*/i, "").trim() || "Falha na operação.";
  },

  normalizarChave(texto) {
    return String(texto ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  rotuloColuna(nome, indice) {
    const s = String(nome ?? "").trim();
    return s || "coluna " + (indice + 1);
  },

  chaveColunaUnica(nome, indice, usados) {
    const base = this.rotuloColuna(nome, indice);
    if (!usados.has(base)) {
      usados.add(base);
      return base;
    }
    let n = 2;
    while (usados.has(base + " (" + n + ")")) n++;
    const chave = base + " (" + n + ")";
    usados.add(chave);
    return chave;
  },

  parseValores(valores, linhaInicio) {
    const inicio = linhaInicio || 2;
    if (!valores?.length) return { cabecalhos: [], colunas: [], linhas: [] };

    let maxCols = 0;
    valores.forEach((row) => {
      if (row && row.length > maxCols) maxCols = row.length;
    });

    const bruta = valores[0] || [];
    const usados = new Set();
    const colunas = [];
    for (let i = 0; i < maxCols; i++) {
      const bruto = bruta[i];
      colunas.push({
        chave: this.chaveColunaUnica(bruto, i, usados),
        chavePlanilha: bruto != null ? String(bruto) : "",
        indice: i,
      });
    }

    const linhas = [];
    for (let i = inicio - 1; i < valores.length; i++) {
      const row = valores[i];
      if (!row || !row.some((c) => String(c ?? "").trim() !== "")) continue;

      const obj = { _linha: i + 1 };
      colunas.forEach((col) => {
        obj[col.chave] = row[col.indice] != null ? row[col.indice] : "";
      });
      linhas.push(obj);
    }

    return {
      cabecalhos: colunas.map((c) => c.chave),
      colunas,
      linhas,
    };
  },

  async ler(planilha, aba, linhaInicio) {
    const bruto = await this.lerValores(planilha, aba);
    if (!bruto) return null;
    return this.parseValores(bruto, linhaInicio);
  },

  async lerValores(planilha, aba) {
    if (window.CONFIG?.EXIGIR_LOGIN && !AUTH.verificarSessao()) return null;
    const resp = await fetch(this.urlGet(planilha, aba), { method: "GET" });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao consultar " + planilha + ".");
    return json.valores || [];
  },

  async gravar(planilha, opts) {
    if (window.CONFIG?.EXIGIR_LOGIN && !AUTH.verificarSessao()) return null;
    const { acao, linha, dados, aba, origem, ...extras } = opts || {};
    const corpo = {
      chave: AUTH.getChave(),
      planilha,
      acao: acao || "inserir",
      aba: aba || "",
      dados: dados || {},
      ...extras,
    };
    if (linha != null) corpo.linha = linha;
    if (origem) corpo.origem = origem;
    if (AUTH.getUsuario()) corpo.usuario = AUTH.getUsuario();

    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json();
    if (!AUTH.tratarResposta(json)) return null;
    if (!json.ok) throw new Error(json.erro || "Falha ao gravar.");
    return json;
  },

  acharColuna(colunas, aliases, indiceFallback) {
    const lista = (aliases || []).map((a) => this.normalizarChave(a));
    const porNome = colunas.find(
      (col) =>
        lista.includes(this.normalizarChave(col.chave)) ||
        lista.includes(this.normalizarChave(col.chavePlanilha))
    );
    if (porNome) return porNome;
    if (indiceFallback == null) return null;
    return colunas.find((col) => col.indice === indiceFallback) || null;
  },
};

window.PlanilhaApi = PlanilhaApi;
