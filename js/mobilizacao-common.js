// Utilitários compartilhados — páginas de mobilização.

const MobComum = {
  fmt: new Intl.NumberFormat("pt-BR"),

  configValida() {
    return CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.startsWith("COLE_AQUI");
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

  escapeHtml(texto) {
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  parseNumero(v) {
    if (typeof v === "number" && !isNaN(v)) return v;
    if (v == null || v === "") return 0;
    const s = String(v).trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  },

  textoPreenchido(v) {
    return String(v ?? "").trim() !== "";
  },

  exibirValor(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = this.parseNumero(val);
    if (n > 0 && /^[\d.,\s]+$/.test(s.replace(/\s/g, ""))) return this.fmt.format(n);
    return this.escapeHtml(s);
  },

  indiceColuna(colunas, aliases) {
    const alvos = (aliases || []).map((a) => this.normalizarChave(a));
    for (const col of colunas) {
      const chave = this.normalizarChave(col.chave);
      const planilha = this.normalizarChave(col.chavePlanilha);
      if (alvos.some((a) => chave === a || chave.includes(a) || planilha === a || planilha.includes(a))) {
        return col.chave;
      }
    }
    return null;
  },

  indiceColunaComFallback(colunas, aliases, indiceFallback) {
    const porNome = this.indiceColuna(colunas, aliases);
    if (porNome) return porNome;
    if (indiceFallback == null) return null;
    const col = colunas.find((c) => c.indice === indiceFallback);
    return col ? col.chave : null;
  },

  resolverColunaPerspectivaVoto(colunas, cfg) {
    const preferidos = (cfg.COLUNA_VOTOS || []).map((a) => this.normalizarChave(a));
    for (const col of colunas) {
      const chave = this.normalizarChave(col.chave);
      const planilha = this.normalizarChave(col.chavePlanilha);
      if (preferidos.some((p) => chave === p || planilha === p)) {
        return col.chave;
      }
    }
    if (cfg.INDICE_VOTOS != null) {
      const col = colunas.find((c) => c.indice === cfg.INDICE_VOTOS);
      if (col) return col.chave;
    }
    return null;
  },

  classificarPerspectivaLocal(bairroRegistro, candidatos) {
    const b = this.normalizarChave(bairroRegistro);
    if (!b || !candidatos?.length) return null;

    const lista = candidatos.map((nome) => ({
      nome,
      norm: this.normalizarChave(nome),
    }));

    const exato = lista.find((item) => item.norm === b);
    if (exato) return exato.nome;

    const parciais = lista.filter((item) => {
      if (item.norm.endsWith(b)) return true;
      if (b.endsWith(item.norm) && item.norm.length >= 6) return true;
      return false;
    });

    if (parciais.length === 1) return parciais[0].nome;

    if (parciais.length > 1) {
      const porSufixo = parciais.filter(
        (item) => item.norm.endsWith(b) || b.endsWith(item.norm)
      );
      if (porSufixo.length === 1) return porSufixo[0].nome;
      porSufixo.sort((a, b2) => b2.norm.length - a.norm.length);
      if (porSufixo.length && porSufixo[0].norm.endsWith(b)) return porSufixo[0].nome;
    }

    return null;
  },

  ehOrigemSegmento(registro) {
    const texto = String(registro?.origem ?? "").trim();
    if (!texto) return false;
    const k = this.normalizarChave(texto);
    return k === "segmento" || k.includes("segment");
  },

  agruparPerspectivaLocais(candidatos, registros) {
    const mapa = new Map();
    (candidatos || []).forEach((nome) => mapa.set(nome, []));

    (registros || []).forEach((r) => {
      if (this.ehOrigemSegmento(r)) return;
      const local = this.classificarPerspectivaLocal(r.bairro, candidatos);
      if (!local) return;
      mapa.get(local).push(r);
    });

    return mapa;
  },

  bairroPerspectivaCombina(nomeLocal, bairroRegistro) {
    return this.classificarPerspectivaLocal(bairroRegistro, [nomeLocal]) === nomeLocal;
  },

  filtrarPerspectivaPorBairros(registros, nomesBairros) {
    const mapa = this.agruparPerspectivaLocais(nomesBairros, registros);
    const saida = [];
    (nomesBairros || []).forEach((nome) => saida.push(...(mapa.get(nome) || [])));
    return saida;
  },

  filtrarPerspectivaPolo(block, registros) {
    if (!registros?.length || !block) return [];
    const bairros = block.itens.map((i) => i.nome);
    const poloNorm = this.normalizarChave(block.polo);
    const mapa = this.agruparPerspectivaLocais(bairros, registros);
    const saida = [];
    bairros.forEach((nome) => saida.push(...(mapa.get(nome) || [])));

    registros.forEach((r) => {
      if (this.ehOrigemSegmento(r)) return;
      const rPolo = this.normalizarChave(r.polo);
      if (!rPolo || rPolo !== poloNorm) return;
      if (this.classificarPerspectivaLocal(r.bairro, bairros)) return;
      saida.push(r);
    });

    const vistos = new Set();
    return saida.filter((r) => {
      const id = r.linha?._linha ?? r.lideranca + "|" + r.bairro + "|" + r.votos;
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });
  },

  metricasPerspectiva(registros) {
    const lideres = new Set();
    let totalVotos = 0;
    (registros || []).forEach((r) => {
      const nome = String(r.lideranca ?? "").trim();
      if (nome) lideres.add(this.normalizarChave(nome));
      totalVotos += r.votos || 0;
    });
    return {
      qtdLiderancas: lideres.size,
      totalVotos,
    };
  },

  registrosPerspectivaLideranca(nome, registros) {
    if (!nome || !registros?.length) return [];
    const alvo = this.normalizarChave(nome);
    if (!alvo) return [];

    const exatos = registros.filter((r) => this.normalizarChave(r.lideranca) === alvo);
    if (exatos.length) return exatos;

    return registros.filter((r) => {
      const k = this.normalizarChave(r.lideranca);
      return k && (k.includes(alvo) || alvo.includes(k));
    });
  },

  somarVotosLideranca(nome, registros) {
    return this.metricasVotosLideranca(nome, registros).total;
  },

  metricasVotosLideranca(nome, registros) {
    const lista = this.registrosPerspectivaLideranca(nome, registros);
    let total = 0;
    let localidade = 0;
    let segmento = 0;
    const localidadesMap = new Map();
    const segmentosMap = new Map();

    lista.forEach((r) => {
      const v = r.votos || 0;
      total += v;
      if (this.ehOrigemSegmento(r)) {
        segmento += v;
        const seg = String(r.segmento ?? "").trim();
        if (!seg) return;
        const normSeg = this.normalizarChave(seg);
        if (!segmentosMap.has(normSeg)) {
          segmentosMap.set(normSeg, { nome: seg, votos: 0 });
        }
        segmentosMap.get(normSeg).votos += v;
        return;
      }
      localidade += v;
      const bairro = String(r.bairro ?? "").trim();
      if (!bairro) return;
      const norm = this.normalizarChave(bairro);
      if (!localidadesMap.has(norm)) {
        localidadesMap.set(norm, { nome: bairro, votos: 0 });
      }
      localidadesMap.get(norm).votos += v;
    });

    const localidades = [...localidadesMap.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
    const segmentos = [...segmentosMap.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    return { total, localidade, segmento, localidades, segmentos };
  },

  detalheLocalPerspectiva(nomeLocal, registros, candidatos) {
    let filtrados;
    if (candidatos?.length) {
      filtrados = this.agruparPerspectivaLocais(candidatos, registros).get(nomeLocal) || [];
    } else {
      filtrados = (registros || []).filter(
        (r) =>
          !this.ehOrigemSegmento(r) &&
          this.classificarPerspectivaLocal(r.bairro, [nomeLocal]) === nomeLocal
      );
    }
    const lideres = new Map();
    let votos = 0;
    filtrados.forEach((r) => {
      const v = r.votos || 0;
      votos += v;
      const nome = String(r.lideranca ?? "").trim();
      if (!nome) return;
      const norm = this.normalizarChave(nome);
      if (!lideres.has(norm)) lideres.set(norm, { nome, votos: 0 });
      lideres.get(norm).votos += v;
    });
    return {
      votos,
      lideres: Array.from(lideres.values()),
      qtdRegistros: filtrados.length,
    };
  },

  somarPerspectivaPolo(block, registros) {
    return this.metricasPerspectiva(
      this.filtrarPerspectivaPolo(block, registros).filter((r) => !this.ehOrigemSegmento(r))
    ).totalVotos;
  },

  contagemPolosLocaisComVotos(dados, registros) {
    let polos = 0;
    let locais = 0;
    (dados || []).forEach((block) => {
      const candidatos = block.itens.map((i) => i.nome);
      const regPolo = this.filtrarPerspectivaPolo(block, registros);
      let somaPolo = 0;
      block.itens.forEach((item) => {
        const votos = this.detalheLocalPerspectiva(item.nome, regPolo, candidatos).votos;
        if (votos > 0) {
          locais++;
          somaPolo += votos;
        }
      });
      if (somaPolo > 0) polos++;
    });
    return { polos, locais };
  },

  resumoRegionalEstrutura(polos, registros) {
    const lista = polos || [];
    let polosMob = 0;
    let locaisTotal = 0;
    let locaisMob = 0;

    lista.forEach((block) => {
      const candidatos = block.itens.map((i) => i.nome);
      const regPolo = this.filtrarPerspectivaPolo(block, registros);
      locaisTotal += block.itens.length;
      let somaPolo = 0;
      block.itens.forEach((item) => {
        const votos = this.detalheLocalPerspectiva(item.nome, regPolo, candidatos).votos;
        if (votos > 0) {
          locaisMob++;
          somaPolo += votos;
        }
      });
      if (somaPolo > 0) polosMob++;
    });

    const metricas = this.metricasPerspectivaRegional(lista, registros);
    return {
      polosTotal: lista.length,
      polosMob,
      locaisTotal,
      locaisMob,
      liderancas: metricas.qtdLiderancas,
      votos: metricas.totalVotos,
    };
  },

  somarResumosRegionais(resumos) {
    const lista = resumos || [];
    return lista.reduce(
      (acc, r) => {
        acc.polosTotal += r.polosTotal || 0;
        acc.polosMob += r.polosMob || 0;
        acc.locaisTotal += r.locaisTotal || 0;
        acc.locaisMob += r.locaisMob || 0;
        acc.liderancas += r.liderancas || 0;
        acc.votos += r.votos || 0;
        return acc;
      },
      {
        polosTotal: 0,
        polosMob: 0,
        locaisTotal: 0,
        locaisMob: 0,
        liderancas: 0,
        votos: 0,
      }
    );
  },

  metricasOrigemSegmento(registros) {
    const apoiadores = new Set();
    let votos = 0;
    (registros || []).forEach((r) => {
      if (!this.ehOrigemSegmento(r)) return;
      const nome = String(r.lideranca ?? "").trim();
      if (nome) apoiadores.add(this.normalizarChave(nome));
      votos += r.votos || 0;
    });
    return {
      apoiadores: apoiadores.size,
      votos,
    };
  },

  listarRegistrosOrigemSegmento(registros) {
    return (registros || [])
      .filter((r) => this.ehOrigemSegmento(r))
      .map((r) => ({
        apoiador: String(r.lideranca ?? "").trim(),
        segmento: String(r.segmento ?? "").trim(),
        votos: r.votos || 0,
      }))
      .filter((r) => r.apoiador || r.segmento)
      .sort((a, b) => {
        const porApoiador = a.apoiador.localeCompare(b.apoiador, "pt-BR");
        if (porApoiador) return porApoiador;
        return a.segmento.localeCompare(b.segmento, "pt-BR");
      });
  },

  agruparOrigemSegmentoPorApoiador(registros) {
    const mapa = new Map();
    this.listarRegistrosOrigemSegmento(registros).forEach((r) => {
      const apoiador = r.apoiador || "—";
      if (!mapa.has(apoiador)) {
        mapa.set(apoiador, { apoiador, segmentos: [], totalVotos: 0 });
      }
      const grupo = mapa.get(apoiador);
      grupo.segmentos.push({ segmento: r.segmento || "—", votos: r.votos || 0 });
      grupo.totalVotos += r.votos || 0;
    });
    return Array.from(mapa.values()).sort((a, b) =>
      a.apoiador.localeCompare(b.apoiador, "pt-BR", { sensitivity: "base" })
    );
  },

  metricasPerspectivaRegional(polos, registros) {
    const bairros = [];
    (polos || []).forEach((p) => p.itens.forEach((i) => bairros.push(i.nome)));
    return this.metricasPerspectiva(this.filtrarPerspectivaPorBairros(registros, bairros));
  },

  colunaReservada(col, cfg) {
    const chave = this.normalizarChave(col.chave);
    const planilha = this.normalizarChave(col.chavePlanilha);
    const grupos = [cfg.COLUNA_REGIAO, cfg.COLUNA_MUNICIPIO, cfg.COLUNA_COORDENADOR];
    return grupos.some((aliases) =>
      (aliases || []).some((a) => {
        const alvo = this.normalizarChave(a);
        return (
          chave === alvo ||
          chave.includes(alvo) ||
          planilha === alvo ||
          planilha.includes(alvo) ||
          alvo.includes(chave)
        );
      })
    );
  },

  colunasMetricas(colunas, cfg) {
    const excluir = new Set(
      (cfg.EXCLUIR_COLUNAS || []).map((c) => this.normalizarChave(c))
    );
    const metricas = [];
    const aliasesMetrica = (cfg.COLUNAS_METRICA || []).map((a) => this.normalizarChave(a));

    colunas.forEach((col) => {
      const chave = this.normalizarChave(col.chave);
      const planilha = this.normalizarChave(col.chavePlanilha);
      if (excluir.has(chave) || excluir.has(planilha)) return;
      if (this.colunaReservada(col, cfg)) return;

      const bateMetrica =
        !aliasesMetrica.length ||
        aliasesMetrica.some(
          (a) => chave.includes(a) || planilha.includes(a) || a.includes(chave) || a.includes(planilha)
        );
      if (bateMetrica) metricas.push(col);
    });

    return metricas.slice(0, 8);
  },

  preencherHierarquia(linhas, chaveRegiao, chaveMunicipio) {
    let ultimaRegiao = "";
    let ultimoMunicipio = "";
    return linhas.map((linha) => {
      const copia = Object.assign({}, linha);
      if (chaveRegiao) {
        const r = String(copia[chaveRegiao] ?? "").trim();
        if (r) ultimaRegiao = r;
        else if (ultimaRegiao) copia[chaveRegiao] = ultimaRegiao;
      }
      if (chaveMunicipio) {
        const m = String(copia[chaveMunicipio] ?? "").trim();
        if (m) ultimoMunicipio = m;
        else if (ultimoMunicipio) copia[chaveMunicipio] = ultimoMunicipio;
      }
      return copia;
    });
  },

  ordenarRegioes(nomes, ordemPadrao) {
    const ordem = (ordemPadrao || []).map((r) => this.normalizarChave(r));
    const unicos = [];
    const vistos = new Set();
    nomes.forEach((nome) => {
      const norm = this.normalizarChave(nome);
      if (!norm || vistos.has(norm)) return;
      vistos.add(norm);
      unicos.push({ rotulo: nome, norm });
    });

    unicos.sort((a, b) => {
      const ia = ordem.indexOf(a.norm);
      const ib = ordem.indexOf(b.norm);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.rotulo.localeCompare(b.rotulo, "pt-BR");
    });
    return unicos;
  },

  montarFiltroRegioes(container, regioes, onChange) {
    if (!container) return;
    container.innerHTML = "";
    regioes.forEach((reg, i) => {
      const id = "mob-filtro-reg-" + i;
      const label = document.createElement("label");
      label.className = "dashboard-filtro-regiao";
      label.htmlFor = id;
      label.innerHTML =
        '<input type="checkbox" class="visually-hidden" id="' +
        id +
        '" value="' +
        this.escapeHtml(reg.norm) +
        '" checked>' +
        '<span class="dashboard-filtro-badge">' +
        this.escapeHtml(reg.rotulo) +
        "</span>";
      container.appendChild(label);
    });
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", onChange);
    });
  },

  regioesSelecionadas(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  },

  async carregarPlanilha(chave, aba, linhaInicio) {
    return PlanilhaApi.ler(chave, aba, linhaInicio);
  },

  async carregarValoresBrutos(chave, aba) {
    return PlanilhaApi.lerValores(chave, aba);
  },

  matrizCelulas(valores) {
    return (valores || []).map((row) => (row || []).map((c) => String(c ?? "").trim()));
  },

  ehRotuloCampo(texto, cfg) {
    const k = this.normalizarChave(texto);
    if (!k) return false;
    return (cfg.ROTULOS_CAMPO || []).some((r) => this.normalizarChave(r) === k);
  },

  preencherColuna(matriz, colIdx) {
    let ultimo = "";
    for (let r = 0; r < matriz.length; r++) {
      if (matriz[r][colIdx]) ultimo = matriz[r][colIdx];
      else if (ultimo) matriz[r][colIdx] = ultimo;
    }
  },

  preencherDireita(linha) {
    const out = linha.slice();
    let ultimo = "";
    for (let i = 0; i < out.length; i++) {
      if (out[i]) ultimo = out[i];
      else if (ultimo) out[i] = ultimo;
    }
    return out;
  },

  ordenarPolos(polos, cfg) {
    const ordem = (cfg.ORDEM_POLOS || []).map((p) => this.normalizarChave(p));
    return polos.slice().sort((a, b) => {
      const ia = ordem.findIndex((o) => a.norm.includes(o) || o.includes(a.norm));
      const ib = ordem.findIndex((o) => b.norm.includes(o) || o.includes(b.norm));
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  },

  parseOrganogramaMatriz(valores, cfg) {
    const matriz = this.matrizCelulas(valores);
    if (!matriz.length) return { titulo: cfg.TITULO || "Cuiabá", topo: [], polos: [] };

    this.preencherColuna(matriz, 0);

    const ancoras = (cfg.LINHA_ANCORA || ["polo"]).map((a) => this.normalizarChave(a));
    let anchorRow = -1;

    for (let r = 0; r < matriz.length; r++) {
      const rotulo = this.normalizarChave(matriz[r][0]);
      if (!ancoras.includes(rotulo)) continue;
      if (matriz[r].slice(1).some((c) => this.textoPreenchido(c))) {
        anchorRow = r;
        break;
      }
    }

    if (anchorRow < 0) {
      for (let r = 0; r < matriz.length; r++) {
        if (!this.ehRotuloCampo(matriz[r][0], cfg)) continue;
        if (matriz[r].slice(1).some((c) => this.textoPreenchido(c))) {
          anchorRow = r;
          break;
        }
      }
    }

    if (anchorRow < 0) {
      return { titulo: cfg.TITULO || "Cuiabá", topo: [], polos: [] };
    }

    let headerRow = 0;
    let maxNomes = 0;
    for (let r = 0; r < anchorRow; r++) {
      const nomes = matriz[r]
        .slice(1)
        .filter((c) => this.textoPreenchido(c) && !this.ehRotuloCampo(c, cfg));
      if (nomes.length > maxNomes) {
        maxNomes = nomes.length;
        headerRow = r;
      }
    }

    const headerLinha = this.preencherDireita(matriz[headerRow] || []);
    const maxCols = Math.max(
      headerLinha.length,
      ...matriz.map((row) => row.length)
    );

    const polos = [];
    for (let c = 1; c < maxCols; c++) {
      const nomeHeader = String(headerLinha[c] ?? "").trim();
      let nome = nomeHeader;

      if (!nome || this.ehRotuloCampo(nome, cfg)) {
        let temDado = false;
        for (let r = anchorRow; r < matriz.length; r++) {
          if (this.textoPreenchido(matriz[r][c])) {
            temDado = true;
            break;
          }
        }
        if (!temDado) continue;
        nome = nomeHeader || "polo " + c;
      }

      if (this.ehRotuloCampo(nome, cfg)) continue;
      polos.push({ nome, col: c, norm: this.normalizarChave(nome) });
    }

    const topo = [];
    for (let r = 0; r < headerRow; r++) {
      matriz[r].forEach((cell) => {
        if (!this.textoPreenchido(cell)) return;
        const norm = this.normalizarChave(cell);
        if (topo.some((t) => this.normalizarChave(t.texto) === norm)) return;
        topo.push({ texto: cell });
      });
    }

    const tituloCfg = cfg.TITULO || "Cuiabá";
    const titulo =
      topo.find((t) => this.normalizarChave(t.texto).includes(this.normalizarChave(tituloCfg)))
        ?.texto || tituloCfg;

    const estruturaPolos = polos.map((polo) => {
      const niveis = [];
      let ultimoRotulo = "";
      for (let r = anchorRow; r < matriz.length; r++) {
        if (r > anchorRow && !matriz[r].some((cel) => this.textoPreenchido(cel))) break;
        if (
          r > anchorRow &&
          ancoras.includes(this.normalizarChave(matriz[r][0])) &&
          matriz[r].slice(1).some((c) => this.textoPreenchido(c))
        ) {
          break;
        }

        const rotuloBruto = matriz[r][0] || ultimoRotulo;
        if (matriz[r][0]) ultimoRotulo = matriz[r][0];
        const valor = String(matriz[r][polo.col] ?? "").trim();
        if (!valor) continue;
        niveis.push({ rotulo: rotuloBruto || "equipe", valor });
      }
      return { nome: polo.nome, norm: polo.norm, niveis };
    });

    const comDados = estruturaPolos.filter((p) => p.niveis.length);
    return {
      titulo,
      topo,
      polos: this.ordenarPolos(comDados.length ? comDados : estruturaPolos, cfg),
    };
  },

  parsePlanilhaComCabecalho(valores, aliasesCabecalho, linhaPadrao) {
    const alvos = (aliasesCabecalho || []).map((a) => this.normalizarChave(a));
    for (let i = 0; i < Math.min(valores.length, 12); i++) {
      const row = valores[i] || [];
      const bate = row.some((cel) => {
        const k = this.normalizarChave(cel);
        return alvos.some((a) => k === a || k.includes(a) || a.includes(k));
      });
      if (bate) return PlanilhaApi.parseValores(valores, i + 2);
    }
    return PlanilhaApi.parseValores(valores, linhaPadrao || 2);
  },

  async carregarPlanilhaComCabecalho(chave, aba, aliasesCabecalho, linhaPadrao) {
    const valores = await this.carregarValoresBrutos(chave, aba);
    return this.parsePlanilhaComCabecalho(valores, aliasesCabecalho, linhaPadrao);
  },

  tipoColunaPerspectiva(chave, cfg) {
    const k = this.normalizarChave(chave);
    if ((cfg.COLUNA_RESPONSABILIDADE || []).some((a) => k.includes(this.normalizarChave(a)))) {
      return "badge";
    }
    if ((cfg.COLUNA_PERSPECTIVA || []).some((a) => k === this.normalizarChave(a) || k.includes(this.normalizarChave(a)))) {
      return "perspectiva";
    }
    if ((cfg.COLUNA_ORIGEM || []).some((a) => k === this.normalizarChave(a) || k.includes(this.normalizarChave(a)))) {
      return "origem";
    }
    return "texto";
  },

  linhaTemConteudo(linha) {
    return Object.keys(linha).some((k) => {
      if (k === "_linha") return false;
      return this.textoPreenchido(linha[k]);
    });
  },

  ehRegionalNome(texto, cfg) {
    const k = this.normalizarChave(texto);
    if (!k) return false;
    return (cfg.REGIONAIS || []).some((r) => this.normalizarChave(r) === k);
  },

  normalizarRegional(texto, cfg) {
    const k = this.normalizarChave(texto);
    const lista = cfg.REGIONAIS || [];
    const achou = lista.find((r) => this.normalizarChave(r) === k);
    return achou || String(texto ?? "").trim().toUpperCase();
  },

  ehPoloNome(texto) {
    return /^polo\s*\d+/i.test(String(texto ?? "").trim());
  },

  normalizarPoloNome(texto) {
    const s = String(texto ?? "").trim();
    const m = s.match(/polo\s*(\d+)/i);
    if (m) return "POLO " + m[1];
    return s.toUpperCase();
  },

  formatNrItem(valor, indice) {
    const s = String(valor ?? "").trim();
    const pad = (n) => String(n).padStart(2, "0");
    if (!s) return pad(indice);
    if (/^\d{1,2}$/.test(s)) return pad(parseInt(s, 10));
    const soDigitos = s.replace(/\D/g, "");
    if (soDigitos && /^\d+$/.test(soDigitos)) return pad(parseInt(soDigitos, 10));
    return pad(indice);
  },

  ordenarBlocosEstrutura(blocos, cfg) {
    const ordemReg = (cfg.REGIONAIS || []).map((r) => this.normalizarChave(r));
    return blocos.slice().sort((a, b) => {
      let ia = ordemReg.indexOf(this.normalizarChave(a.regional));
      let ib = ordemReg.indexOf(this.normalizarChave(b.regional));
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      if (ia !== ib) return ia - ib;
      const na = parseInt((String(a.polo).match(/\d+/) || ["0"])[0], 10);
      const nb = parseInt((String(b.polo).match(/\d+/) || ["0"])[0], 10);
      return na - nb;
    });
  },

  chaveBlocoEstrutura(regional, polo) {
    return this.normalizarChave(regional) + "|" + this.normalizarChave(polo);
  },

  adicionarItemBloco(mapa, regional, polo, responsavel, num, nome, cfg) {
    const reg = this.normalizarRegional(regional, cfg || { REGIONAIS: [] });
    const pol = this.normalizarPoloNome(polo) || polo;
    const chave = this.chaveBlocoEstrutura(reg, pol);
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        regional: reg,
        polo: pol,
        responsavel: responsavel || "",
        itens: [],
      });
    }
    const bloco = mapa.get(chave);
    if (responsavel) bloco.responsavel = responsavel;
    const nomeLimpo = String(nome ?? "").trim();
    if (!nomeLimpo) return;
    let numLimpo = String(num ?? "").trim();
    if (cfg && this.ehRotuloCampo(numLimpo, cfg)) numLimpo = "";
    bloco.itens.push({
      num: this.formatNrItem(numLimpo, bloco.itens.length + 1),
      nome: nomeLimpo,
    });
  },

  parseEstruturaTabular(parsed, cfg) {
    const colRegional = this.indiceColuna(parsed.colunas, cfg.COLUNA_REGIONAL);
    const colPolo = this.indiceColuna(parsed.colunas, cfg.COLUNA_POLO);
    const colBairro = this.indiceColuna(parsed.colunas, cfg.COLUNA_BAIRRO);
    const colNum = this.indiceColuna(parsed.colunas, cfg.COLUNA_NUM);
    const colResp = this.indiceColuna(parsed.colunas, cfg.COLUNA_RESPONSAVEL);

    if (!colBairro && !colRegional && !colPolo) return [];

    let linhas = this.preencherHierarquia(parsed.linhas, colRegional, colPolo);
    const mapa = new Map();

    linhas.forEach((linha) => {
      const regional = colRegional ? String(linha[colRegional] ?? "").trim() : "";
      const polo = colPolo ? String(linha[colPolo] ?? "").trim() : "";
      const bairro = colBairro ? String(linha[colBairro] ?? "").trim() : "";
      const num = colNum ? linha[colNum] : "";
      const resp = colResp ? String(linha[colResp] ?? "").trim() : "";

      if (!bairro && !regional && !polo) return;
      if (this.ehRotuloCampo(bairro, cfg) || this.ehRotuloCampo(regional, cfg)) return;
      if (!bairro) return;

      const reg = regional || "SEM REGIONAL";
      const pol = polo || "POLO 1";
      this.adicionarItemBloco(mapa, reg, pol, resp, num, bairro, cfg);
    });

    return this.ordenarBlocosEstrutura(Array.from(mapa.values()), cfg);
  },

  parseEstruturaPorSecoes(valores, cfg) {
    const matriz = this.matrizCelulas(valores);
    const mapa = new Map();
    let regionalAtual = "";
    let poloAtual = "";
    let responsavelAtual = "";

    const colBairroAlias = (cfg.COLUNA_BAIRRO || []).map((a) => this.normalizarChave(a));
    const colNumAlias = (cfg.COLUNA_NUM || []).map((a) => this.normalizarChave(a));

    for (let r = 0; r < matriz.length; r++) {
      const row = matriz[r];
      if (!row.some((c) => this.textoPreenchido(c))) continue;

      for (let c = 0; c < row.length; c++) {
        if (this.ehRegionalNome(row[c], cfg)) {
          regionalAtual = this.normalizarRegional(row[c], cfg);
          poloAtual = "";
          responsavelAtual = "";
        }
      }

      const c0 = this.normalizarChave(row[0]);
      if (this.ehPoloNome(row[0])) {
        poloAtual = this.normalizarPoloNome(row[0]);
        continue;
      }
      for (let c = 0; c < row.length; c++) {
        if (this.ehPoloNome(row[c])) {
          poloAtual = this.normalizarPoloNome(row[c]);
          break;
        }
      }

      if (c0.includes("responsavel") && c0.includes("polo")) {
        for (let c = 1; c < row.length; c++) {
          if (this.textoPreenchido(row[c])) responsavelAtual = row[c];
        }
        continue;
      }

      if (row.length >= 2 && regionalAtual) {
        const a = String(row[0] ?? "").trim();
        const b = String(row[1] ?? "").trim();
        if (a && b && !this.ehRotuloCampo(a, cfg) && !this.ehRotuloCampo(b, cfg)) {
          if (/^\d{1,2}$/.test(b) && !/^\d{1,2}$/.test(a)) {
            this.adicionarItemBloco(mapa, regionalAtual, poloAtual || "POLO 1", responsavelAtual, b, a, cfg);
            continue;
          }
          if (/^\d{1,2}$/.test(a) && !/^\d{1,2}$/.test(b)) {
            this.adicionarItemBloco(mapa, regionalAtual, poloAtual || "POLO 1", responsavelAtual, a, b, cfg);
            continue;
          }
        }
      }

      let idxBairro = -1;
      let idxNum = -1;
      for (let c = 0; c < row.length; c++) {
        const k = this.normalizarChave(row[c]);
        if (colBairroAlias.some((a) => k === a)) idxBairro = c;
        if (colNumAlias.some((a) => k === a)) idxNum = c;
      }

      if (idxBairro >= 0 && idxNum >= 0 && r + 1 < matriz.length) {
        continue;
      }

      let bairro = "";
      let num = "";
      if (colBairroAlias.includes(c0)) {
        bairro = String(row[1] ?? "").trim();
        num = String(row[2] ?? "").trim();
      } else if (colNumAlias.includes(c0)) {
        num = String(row[1] ?? "").trim();
        bairro = String(row[2] ?? "").trim();
      } else if (/^\d{1,2}$/.test(row[0]) || /^0?\d+$/.test(row[0])) {
        num = row[0];
        bairro = String(row[1] ?? row[2] ?? "").trim();
      } else {
        const cel0 = String(row[0] ?? "").trim();
        bairro = String(row[1] ?? row[0] ?? "").trim();
        num = cel0;
        if (this.ehRotuloCampo(cel0, cfg)) {
          num = "";
          bairro = String(row[1] ?? "").trim();
        }
        if (bairro === num) {
          bairro = String(row[1] ?? "").trim();
          num = String(row[0] ?? "").trim();
          if (this.ehRotuloCampo(num, cfg)) num = "";
        }
      }

      if (!bairro || this.ehRotuloCampo(bairro, cfg) || this.ehRegionalNome(bairro, cfg)) continue;
      if (this.ehPoloNome(bairro)) continue;

      const reg = regionalAtual || "SEM REGIONAL";
      const pol = poloAtual || "POLO 1";
      this.adicionarItemBloco(mapa, reg, pol, responsavelAtual, num, bairro, cfg);
    }

    return this.ordenarBlocosEstrutura(Array.from(mapa.values()), cfg);
  },

  parseEstruturaMatrizPolos(valores, cfg) {
    const matriz = this.matrizCelulas(valores);
    const mapa = new Map();

    for (let r = 0; r < matriz.length; r++) {
      let regional = "";
      for (let c = 0; c < matriz[r].length; c++) {
        if (this.ehRegionalNome(matriz[r][c], cfg)) {
          regional = this.normalizarRegional(matriz[r][c], cfg);
          break;
        }
      }
      if (!regional) continue;

      const polos = [];
      let dataStart = r + 1;
      for (let hr = r + 1; hr < Math.min(r + 15, matriz.length); hr++) {
        polos.length = 0;
        for (let c = 0; c < matriz[hr].length; c++) {
          if (this.ehPoloNome(matriz[hr][c])) {
            polos.push({ nome: this.normalizarPoloNome(matriz[hr][c]), col: c });
          }
        }
        if (polos.length) {
          dataStart = hr + 1;
          break;
        }
      }
      if (!polos.length) continue;

      const respPorCol = {};
      for (let rr = dataStart; rr < Math.min(dataStart + 4, matriz.length); rr++) {
        const rot = this.normalizarChave(matriz[rr][0]);
        if (rot.includes("responsavel") && rot.includes("polo")) {
          polos.forEach((p) => {
            if (this.textoPreenchido(matriz[rr][p.col])) respPorCol[p.col] = matriz[rr][p.col];
          });
          dataStart = rr + 1;
          break;
        }
      }

      for (let dr = dataStart; dr < matriz.length; dr++) {
        if (matriz[dr].some((c) => this.ehRegionalNome(c, cfg))) break;
        if (!matriz[dr].some((c) => this.textoPreenchido(c))) break;
        if (matriz[dr].some((c) => this.ehPoloNome(c))) break;

        const rot0 = this.normalizarChave(matriz[dr][0]);
        if (
          this.ehRotuloCampo(matriz[dr][0], cfg) &&
          (rot0.includes("bairro") || rot0.includes("localidade") || rot0.includes("nr"))
        ) {
          continue;
        }

        const numCel = String(matriz[dr][0] ?? "").trim();
        const num = /^\d{1,2}$/.test(numCel) ? numCel : "";

        polos.forEach((polo) => {
          const nome = String(matriz[dr][polo.col] ?? "").trim();
          if (!nome || this.ehRotuloCampo(nome, cfg) || this.ehPoloNome(nome)) return;
          const chave = this.chaveBlocoEstrutura(regional, polo.nome);
          const n = num || String((mapa.get(chave)?.itens.length || 0) + 1);
          this.adicionarItemBloco(mapa, regional, polo.nome, respPorCol[polo.col], n, nome, cfg);
        });
      }
    }

    return this.ordenarBlocosEstrutura(Array.from(mapa.values()), cfg);
  },

  async parseEstruturaDados(cfg) {
    return this.parseCuiabaDados(cfg);
  },

  resolverColunasEstrutura(parsed, cfg) {
    const cols = {};
    const def = cfg.COLUNAS || {};
    Object.keys(def).forEach((nome) => {
      const item = def[nome];
      let chave = null;
      if (item.indice != null) {
        const col = parsed.colunas.find((c) => c.indice === item.indice);
        if (col) chave = col.chave;
      }
      if (!chave) chave = this.indiceColuna(parsed.colunas, item.aliases);
      cols[nome] = chave;
    });
    return cols;
  },

  cfgLegadoMatriz(cfg) {
    return {
      REGIONAIS: cfg.REGIONAIS,
      ROTULOS_CAMPO: cfg.ROTULOS_CAMPO,
      LINHA_ANCORA: cfg.LINHA_ANCORA,
    };
  },

  parseCuiabaLista(parsed, cols, cfg) {
    let linhas = parsed.linhas.slice();
    if (cols.REGIONAL || cols.POLO) {
      linhas = this.preencherHierarquia(linhas, cols.REGIONAL, cols.POLO);
    }

    const mapa = new Map();
    linhas.forEach((linha) => {
      const regional = cols.REGIONAL ? String(linha[cols.REGIONAL] ?? "").trim() : "";
      const polo = cols.POLO ? String(linha[cols.POLO] ?? "").trim() : "";
      const bairro = cols.BAIRRO ? String(linha[cols.BAIRRO] ?? "").trim() : "";
      let num = cols.NUMERO ? linha[cols.NUMERO] : "";
      const resp = cols.RESPONSAVEL ? String(linha[cols.RESPONSAVEL] ?? "").trim() : "";

      if (!bairro) return;
      if (this.ehRotuloCampo(bairro, cfg)) return;
      if (this.ehRotuloCampo(String(num ?? "").trim(), cfg)) num = "";
      if (this.ehRegionalNome(bairro, cfg) || this.ehPoloNome(bairro)) return;

      const reg = regional || "SEM REGIONAL";
      const pol = polo || "POLO 1";
      this.adicionarItemBloco(mapa, reg, pol, resp, num, bairro, cfg);
    });

    return this.ordenarBlocosEstrutura(Array.from(mapa.values()), cfg);
  },

  async montarOpcoesEstruturaPorRegional(cfg) {
    const valores = await this.carregarValoresBrutos(cfg.PLANILHA, cfg.ABA || "");
    const aliases = Object.values(cfg.COLUNAS || {}).flatMap((c) => c.aliases || []);
    const parsed = this.parsePlanilhaComCabecalho(valores, aliases, cfg.LINHA_INICIO_DADOS);
    const cols = this.resolverColunasEstrutura(parsed, cfg);
    const vazio = {
      regionais: [],
      bairrosPorRegional: new Map(),
      regionalPorBairro: new Map(),
    };
    if (!cols.REGIONAL || !cols.BAIRRO) return vazio;

    const linhas = this.preencherHierarquia(parsed.linhas, cols.REGIONAL, cols.POLO);
    const bairrosPorRegional = new Map();
    const regionalPorBairro = new Map();

    linhas.forEach((linha) => {
      const regionalBruto = String(linha[cols.REGIONAL] ?? "").trim();
      const bairro = String(linha[cols.BAIRRO] ?? "").trim();
      if (!regionalBruto || !bairro) return;
      if (this.ehRotuloCampo(bairro, cfg)) return;
      if (this.ehRegionalNome(bairro, cfg) || this.ehPoloNome(bairro)) return;

      const regional = this.normalizarRegional(regionalBruto, cfg);
      if (!bairrosPorRegional.has(regional)) bairrosPorRegional.set(regional, new Map());
      const normBairro = this.normalizarChave(bairro);
      bairrosPorRegional.get(regional).set(normBairro, bairro);
      regionalPorBairro.set(normBairro, regional);
    });

    const regionaisOrdenadas = this.ordenarRegioes(
      [...bairrosPorRegional.keys()],
      cfg.REGIONAIS
    );
    const meta = cfg.REGIONAL_META || {};
    const regionais = regionaisOrdenadas.map((item) => ({
      chave: item.rotulo,
      rotulo: meta[item.rotulo]?.rotulo || String(item.rotulo).toLowerCase(),
    }));

    const bairrosPorRegionalLista = new Map();
    bairrosPorRegional.forEach((mapaBairros, regional) => {
      bairrosPorRegionalLista.set(
        regional,
        [...mapaBairros.values()].sort((a, b) => a.localeCompare(b, "pt-BR"))
      );
    });

    return {
      regionais,
      bairrosPorRegional: bairrosPorRegionalLista,
      regionalPorBairro,
    };
  },

  async parsePerspectivaLista(cfg) {
    const aliases = []
      .concat(
        cfg.COLUNA_POLO || [],
        cfg.COLUNA_BAIRRO || [],
        cfg.COLUNA_REGIAO || [],
        cfg.COLUNA_LIDERANCA || [],
        cfg.COLUNA_RESPONSAVEL || [],
        cfg.COLUNA_VOTOS || [],
        cfg.COLUNA_ORIGEM || [],
        cfg.COLUNA_SEGMENTO || [],
        cfg.COLUNA_PERSPECTIVA || []
      );
    const parsed = await this.carregarPlanilhaComCabecalho(
      cfg.PLANILHA,
      cfg.ABA,
      aliases,
      cfg.LINHA_INICIO_DADOS
    );

    const colPolo = this.indiceColunaComFallback(parsed.colunas, cfg.COLUNA_POLO, cfg.INDICE_POLO);
    const colBairro = this.indiceColunaComFallback(
      parsed.colunas,
      cfg.COLUNA_BAIRRO,
      cfg.INDICE_BAIRRO
    );
    const colRegional = this.indiceColunaComFallback(parsed.colunas, cfg.COLUNA_REGIAO, cfg.INDICE_REGIAO);
    const colLideranca = this.indiceColunaComFallback(
      parsed.colunas,
      cfg.COLUNA_LIDERANCA || cfg.COLUNA_RESPONSAVEL,
      cfg.INDICE_LIDERANCA
    );
    const colVotos = this.resolverColunaPerspectivaVoto(parsed.colunas, cfg);
    const colOrigem = this.indiceColunaComFallback(
      parsed.colunas,
      cfg.COLUNA_ORIGEM,
      cfg.INDICE_ORIGEM
    );
    const colSegmento = this.indiceColunaComFallback(
      parsed.colunas,
      cfg.COLUNA_SEGMENTO,
      cfg.INDICE_SEGMENTO
    );

    return parsed.linhas
      .filter((linha) => this.linhaTemConteudo(linha))
      .map((linha) => ({
        polo: colPolo ? String(linha[colPolo] ?? "").trim() : "",
        bairro: colBairro ? String(linha[colBairro] ?? "").trim() : "",
        segmento: colSegmento ? String(linha[colSegmento] ?? "").trim() : "",
        regional: colRegional ? String(linha[colRegional] ?? "").trim() : "",
        lideranca: colLideranca ? String(linha[colLideranca] ?? "").trim() : "",
        origem: colOrigem ? String(linha[colOrigem] ?? "").trim() : "",
        votos: colVotos ? this.parseNumero(linha[colVotos]) : 0,
        linha,
      }));
  },

  async parseCuiabaDados(cfg) {
    const valores = await this.carregarValoresBrutos(cfg.PLANILHA, cfg.ABA);
    const aliases = Object.values(cfg.COLUNAS || {}).flatMap((c) => c.aliases || []);
    const parsed = this.parsePlanilhaComCabecalho(valores, aliases, cfg.LINHA_INICIO_DADOS);
    const cols = this.resolverColunasEstrutura(parsed, cfg);

    if (cols.BAIRRO) {
      const lista = this.parseCuiabaLista(parsed, cols, cfg);
      if (lista.length) return lista;
    }

    let blocos = this.parseEstruturaMatrizPolos(valores, this.cfgLegadoMatriz(cfg));
    if (blocos.length) return blocos;

    const legado = Object.assign({}, cfg, {
      COLUNA_REGIONAL: cfg.COLUNAS?.REGIONAL?.aliases,
      COLUNA_POLO: cfg.COLUNAS?.POLO?.aliases,
      COLUNA_BAIRRO: cfg.COLUNAS?.BAIRRO?.aliases,
      COLUNA_NUM: cfg.COLUNAS?.NUMERO?.aliases,
      COLUNA_RESPONSAVEL: cfg.COLUNAS?.RESPONSAVEL?.aliases,
    });
    blocos = this.parseEstruturaTabular(parsed, legado);
    if (blocos.length) return blocos;

    return this.parseEstruturaPorSecoes(valores, legado);
  },
};
