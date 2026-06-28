// Consulta apoiadores por liderança (planilha pessoal-apoiadores).

const ApoiadoresLookup = {
  fmt: new Intl.NumberFormat("pt-BR"),
  fmtMoeda: new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  linhas: null,
  mapaMunicipioRegiao: null,
  rotulosDespacho: null,
  promessa: null,

  CAMPOS: [
    { prop: "lideranca", chave: "LIDERANCA", aliases: ["lideranca", "liderança"] },
    { prop: "municipio", chave: "MUNICIPIO", aliases: ["municipio", "município"] },
    { prop: "apoiadorLider", chave: "APOIADOR_LIDER", aliases: ["apoiador-lider", "apoiador lider"] },
    { prop: "apoiador30", chave: "APOIADOR_30", aliases: ["apoiador-30", "apoiador 30"] },
    { prop: "apoiador45", chave: "APOIADOR_45", aliases: ["apoiador-45", "apoiador 45"] },
    {
      prop: "apoiadorCustomizado",
      chave: "APOIADOR_CUSTOMIZADO",
      aliases: ["apoiador-customizado", "apoiador customizado", "apoiador-livre", "apoiador livre"],
    },
  ],

  camposDespacho() {
    return CONFIG.PESSOAL.APOIADORES.COLUNAS_DESPACHO || [];
  },

  normalizar(texto) {
    return MobComum.normalizarChave(texto);
  },

  escape(texto) {
    return MobComum.escapeHtml(texto);
  },

  parseNumero(v) {
    return MobComum.parseNumero(v);
  },

  exibirCelula(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = this.parseNumero(val);
    if (n > 0) return this.fmt.format(n);
    return this.escape(s);
  },

  exibirMoeda(val) {
    const n = this.parseNumero(val);
    if (n > 0) return this.fmtMoeda.format(n);
    const s = String(val ?? "").trim();
    return s ? this.escape(s) : "—";
  },

  valorCampo(linha, idx) {
    if (idx == null || idx < 0) return "";
    return linha[idx];
  },

  resolverIndices(cabecalho) {
    const cfgAp = CONFIG.PESSOAL.APOIADORES;
    const normalizados = (cabecalho || []).map((h) => this.normalizar(h));
    const indices = {};

    this.CAMPOS.forEach((campo) => {
      let idx = normalizados.findIndex((n) =>
        campo.aliases.some((alias) => this.normalizar(alias) === n)
      );
      if (idx === -1 && cfgAp.COLUNAS[campo.chave] != null) {
        idx = cfgAp.COLUNAS[campo.chave];
      }
      indices[campo.prop] = idx;
    });

    this.camposDespacho().forEach((campo) => {
      let idx = normalizados.findIndex((n) =>
        (campo.aliases || []).some((alias) => this.normalizar(alias) === n)
      );
      if (idx === -1 && campo.indice != null) idx = campo.indice;
      if (idx === -1 && cfgAp.COLUNAS[campo.chave] != null) {
        idx = cfgAp.COLUNAS[campo.chave];
      }
      indices[campo.prop] = idx;
    });

    return indices;
  },

  resolverRotulosDespacho(cabecalho) {
    const cfgAp = CONFIG.PESSOAL.APOIADORES;
    const padrao = {
      pessoal: "pessoal",
      combustivel: "combustível",
      diversos: "diversos",
      diaD: "dia D",
    };
    const rotulos = Object.assign({}, padrao);

    this.camposDespacho().forEach((campo) => {
      let idx = campo.indice;
      if (idx == null && cfgAp.COLUNAS[campo.chave] != null) {
        idx = cfgAp.COLUNAS[campo.chave];
      }
      const bruto = cabecalho && idx != null ? String(cabecalho[idx] ?? "").trim() : "";
      if (bruto) rotulos[campo.prop] = bruto;
    });

    return rotulos;
  },

  montarMapaMunicipios(valoresMunicipios) {
    const mapa = new Map();
    const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
    if (!valoresMunicipios?.length) return mapa;

    const cols = cfgMun.COLUNAS;
    for (let linha = cfgMun.LINHA_INICIO_DADOS; linha <= valoresMunicipios.length; linha++) {
      const row = valoresMunicipios[linha - 1];
      if (!row) continue;
      const municipio = String(row[cols.MUNICIPIO] ?? "").trim();
      if (!municipio) continue;
      const regiao = String(row[cols.REGIAO] ?? "").trim();
      mapa.set(this.normalizar(municipio), {
        regiao,
        regiaoNorm: this.normalizar(regiao),
      });
    }
    return mapa;
  },

  extrairLinhas(valores) {
    if (!valores?.length) return [];

    const cfgAp = CONFIG.PESSOAL.APOIADORES;
    const indices = this.resolverIndices(valores[0]);
    this.rotulosDespacho = this.resolverRotulosDespacho(valores[0]);
    const itens = [];

    for (let i = cfgAp.LINHA_INICIO_DADOS - 1; i < valores.length; i++) {
      const linha = valores[i];
      if (!linha) continue;

      const municipio = String(this.valorCampo(linha, indices.municipio) ?? "").trim();
      const info = municipio ? this.mapaMunicipioRegiao.get(this.normalizar(municipio)) : null;

      const item = {
        lideranca: this.valorCampo(linha, indices.lideranca),
        municipio,
        apoiadorLider: this.valorCampo(linha, indices.apoiadorLider),
        apoiador30: this.valorCampo(linha, indices.apoiador30),
        apoiador45: this.valorCampo(linha, indices.apoiador45),
        apoiadorCustomizado: this.valorCampo(linha, indices.apoiadorCustomizado),
        pessoal: this.valorCampo(linha, indices.pessoal),
        combustivel: this.valorCampo(linha, indices.combustivel),
        diversos: this.valorCampo(linha, indices.diversos),
        diaD: this.valorCampo(linha, indices.diaD),
        regiao: info?.regiao || "",
        regiaoNorm: info?.regiaoNorm || "",
      };

      const temConteudo = this.CAMPOS.some((c) => String(item[c.prop] ?? "").trim() !== "");
      if (!temConteudo) continue;
      itens.push(item);
    }

    return itens;
  },

  async carregar() {
    if (this.linhas) return this.linhas;
    if (this.promessa) return this.promessa;

    this.promessa = (async () => {
      const cfg = CONFIG.PESSOAL;
      const cfgMun = CONFIG.MICRO_REGIAO.MUNICIPIOS;
      const [valoresAp, valoresMun] = await Promise.all([
        PlanilhaApi.lerValores(cfg.PLANILHA_APOIADORES, cfg.ABA),
        PlanilhaApi.lerValores(cfgMun.PLANILHA, cfgMun.ABA).catch(() => []),
      ]);
      this.mapaMunicipioRegiao = this.montarMapaMunicipios(valoresMun);
      this.linhas = this.extrairLinhas(valoresAp);
      return this.linhas;
    })();

    return this.promessa;
  },

  buscarPorLideranca(nome, contexto) {
    const todos = this.buscarPorLiderancaTodos(nome);
    if (!contexto) return todos;
    return this.filtrarPorContexto(todos, contexto);
  },

  buscarPorLiderancaTodos(nome) {
    if (!this.linhas?.length) return [];
    const alvo = this.normalizar(nome);
    if (!alvo) return [];

    const exatos = this.linhas.filter((r) => this.normalizar(r.lideranca) === alvo);
    if (exatos.length) return exatos;

    return this.linhas.filter((r) => {
      const k = this.normalizar(r.lideranca);
      return k && (k.includes(alvo) || alvo.includes(k));
    });
  },

  filtrarPorContexto(registros, contexto) {
    if (!registros?.length || !contexto) return registros || [];

    const muns = (contexto.MUNICIPIO || contexto.municipio || [])
      .map((m) => this.normalizar(m))
      .filter(Boolean);
    const regs = (contexto.REGIAO_MICRO || contexto.regiaoMicro || [])
      .map((r) => this.normalizar(r))
      .filter(Boolean);

    if (!muns.length && !regs.length) return registros;

    return registros.filter((r) => {
      const rm = this.normalizar(r.municipio);
      const rr = this.normalizar(r.regiao);
      const bateMun =
        muns.length > 0 &&
        muns.some((m) => rm === m || rm.includes(m) || m.includes(rm));
      const bateReg =
        regs.length > 0 &&
        regs.some((reg) => rr === reg || rr.includes(reg) || reg.includes(rr));
      return bateMun || bateReg;
    });
  },

  contextoMobilizacaoEstrutura() {
    return (
      CONFIG.MOBILIZACAO?.ESTRUTURA?.CONTEXTO_APOIADOR || {
        MUNICIPIO: [CONFIG.MOBILIZACAO?.CUIABA?.MUNICIPIO || "Cuiabá"],
        REGIAO_MICRO: ["baixada cuiabana"],
      }
    );
  },

  somarDespacho(registros) {
    const totais = { pessoal: 0, combustivel: 0, diversos: 0, diaD: 0 };
    (registros || []).forEach((r) => {
      totais.pessoal += this.parseNumero(r.pessoal);
      totais.combustivel += this.parseNumero(r.combustivel);
      totais.diversos += this.parseNumero(r.diversos);
      totais.diaD += this.parseNumero(r.diaD);
    });
    return totais;
  },

  htmlBlocoContratos(registro) {
    const itens = [
      registro.regiao
        ? PopoverTabela.item("micro-região", this.escape(registro.regiao))
        : "",
      PopoverTabela.item("município", this.escape(registro.municipio) || "—"),
      PopoverTabela.item(
        "lider",
        this.exibirCelula(registro.apoiadorLider) || "—",
        "popover-marcador--apoiador-lider"
      ),
      PopoverTabela.item(
        "30 dias",
        this.exibirCelula(registro.apoiador30) || "—",
        "popover-marcador--apoiador-30"
      ),
      PopoverTabela.item(
        "45 dias",
        this.exibirCelula(registro.apoiador45) || "—",
        "popover-marcador--apoiador-45"
      ),
      PopoverTabela.item(
        "customizado",
        this.exibirCelula(registro.apoiadorCustomizado) || "—",
        "popover-marcador--apoiador-custom"
      ),
    ]
      .filter(Boolean)
      .join("");

    return '<div class="orcamento-geral-popover-corpo mob-estr-apoiador-corpo">' + itens + "</div>";
  },

  htmlTotalBadge(valor, formato) {
    const cls =
      "mob-estr-apoiador-valor-badge mob-estr-apoiador-valor-badge--total" +
      (valor > 0 ? "" : " mob-estr-apoiador-valor-badge--zero");
    const texto =
      formato === "moeda"
        ? this.fmtMoeda.format(valor || 0)
        : this.fmt.format(valor || 0);
    return '<span class="' + cls + '">' + texto + "</span>";
  },

  htmlVotosPerspectiva(metricas) {
    const m = metricas || { total: 0, localidade: 0, segmento: 0 };
    const subitens = [
      { rotulo: "voto por localidade", valor: m.localidade },
      { rotulo: "voto por segmento", valor: m.segmento },
    ]
      .map(
        (l) =>
          '<div class="orcamento-geral-popover-item mob-estr-apoiador-desp-item">' +
          '<span class="orcamento-geral-popover-rotulo mob-estr-apoiador-desp-rotulo mob-estr-apoiador-desp-rotulo--sub">- ' +
          this.escape(l.rotulo) +
          "</span>" +
          '<span class="orcamento-geral-popover-valor mob-estr-apoiador-desp-valor mob-estr-apoiador-voto-valor">' +
          this.fmt.format(l.valor || 0) +
          "</span></div>"
      )
      .join("");

    return (
      '<div class="orcamento-geral-popover-corpo mob-estr-apoiador-votos">' +
      '<div class="orcamento-geral-popover-item mob-estr-apoiador-desp-item mob-estr-apoiador-desp-item--total mob-estr-apoiador-voto-item--total">' +
      '<span class="orcamento-geral-popover-rotulo mob-estr-apoiador-desp-rotulo">total de votos</span>' +
      this.htmlTotalBadge(m.total, "numero") +
      "</div>" +
      subitens +
      "</div>"
    );
  },

  htmlTotaisDespacho(registros) {
    if (!registros?.length) return "";
    const totais = this.somarDespacho(registros);
    const totalGeral =
      totais.pessoal + totais.combustivel + totais.diversos + totais.diaD;

    const linhas = [
      { rotulo: "pessoal", valor: totais.pessoal },
      { rotulo: "combustível", valor: totais.combustivel },
      { rotulo: "diversos", valor: totais.diversos },
      { rotulo: "dia D", valor: totais.diaD, preserveCase: true },
    ];

    const subitens = linhas
      .map((l) => {
        const rotuloClass =
          "orcamento-geral-popover-rotulo mob-estr-apoiador-desp-rotulo mob-estr-apoiador-desp-rotulo--sub" +
          (l.preserveCase ? " mob-estr-apoiador-desp-rotulo--case" : "");
        return (
          '<div class="orcamento-geral-popover-item mob-estr-apoiador-desp-item">' +
          '<span class="' +
          rotuloClass +
          '">- ' +
          this.escape(l.rotulo) +
          "</span>" +
          '<span class="orcamento-geral-popover-valor mob-estr-apoiador-desp-valor">' +
          this.fmtMoeda.format(l.valor) +
          "</span></div>"
        );
      })
      .join("");

    return (
      '<div class="orcamento-geral-popover-corpo mob-estr-apoiador-totais">' +
      '<div class="orcamento-geral-popover-item mob-estr-apoiador-desp-item mob-estr-apoiador-desp-item--total">' +
      '<span class="orcamento-geral-popover-rotulo mob-estr-apoiador-desp-rotulo">total orçamento</span>' +
      this.htmlTotalBadge(totalGeral, "moeda") +
      "</div>" +
      subitens +
      "</div>"
    );
  },

  htmlDetalhes(registros, opcoes) {
    if (!registros?.length) {
      return '<p class="text-secondary small mb-0">nenhum registro na planilha de apoiadores.</p>';
    }

    const nome = this.escape(String(registros[0].lideranca ?? "").trim());
    const votos = opcoes?.votos || {
      total: opcoes?.totalVotos ?? 0,
      localidade: opcoes?.totalVotos ?? 0,
      segmento: 0,
    };

    let html = '<div class="mob-estr-apoiador-nome">' + (nome || "—") + "</div>";
    html += '<hr class="mob-estr-apoiador-sep">';

    registros.forEach((r, i) => {
      if (i > 0) html += '<hr class="mob-estr-apoiador-sep mob-estr-apoiador-sep--interno">';
      html += this.htmlBlocoContratos(r);
    });

    html += '<hr class="mob-estr-apoiador-sep">';
    html += this.htmlVotosPerspectiva(votos);
    html += '<hr class="mob-estr-apoiador-sep">';
    html += this.htmlTotaisDespacho(registros);
    return html;
  },

  tituloAcessivel(registros, nomeBusca) {
    const nome = String(registros?.[0]?.lideranca ?? nomeBusca ?? "").trim();
    return nome || "apoiador";
  },
};

window.ApoiadoresLookup = ApoiadoresLookup;
