// Relatórios em PDF (impressão do navegador) — cards, filtros e tabelas da página atual.

(function initRelatorio(global) {
  "use strict";
  if (global.Relatorio) return;

  const Relatorio = {
  TITULO_CAMPANHA: "Eleição 2026 · deputado estadual Dr. Eugênio",

  escapeHtml(txt) {
    const div = document.createElement("div");
    div.textContent = txt == null ? "" : String(txt);
    return div.innerHTML;
  },

  elementoVisivel(el) {
    if (!el || !el.isConnected) return false;
    if (el.closest(".modal")) return false;
    if (el.matches("[hidden]")) return false;
    if (el.closest("[hidden]")) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  },

  elementoParaRelatorio(el) {
    if (!el || !el.isConnected) return false;
    if (el.closest(".modal")) return false;
    if (el.matches("[hidden]")) return false;
    return true;
  },

  obterMetaPagina() {
    const meta = { titulo: document.title || "relatório", subtitulo: "" };
    try {
      const parentDoc = window.parent?.document;
      if (!parentDoc || parentDoc === document) return meta;
      const tituloEl = parentDoc.getElementById("appHeaderTitulo");
      const subEl = parentDoc.getElementById("appHeaderSub");
      if (tituloEl) {
        meta.titulo = (tituloEl.querySelector(".app-titulo-texto") || tituloEl).textContent.trim() || meta.titulo;
      }
      if (subEl) meta.subtitulo = subEl.textContent.trim();
    } catch (e) {
      /* iframe cross-origin */
    }
    return meta;
  },

  formatarDataHoraRelatorio(data) {
    const d = data instanceof Date ? data : new Date(data);
    const p = (n) => String(n).padStart(2, "0");
    return (
      p(d.getDate()) +
      "/" +
      p(d.getMonth() + 1) +
      "/" +
      String(d.getFullYear()).slice(-2) +
      "  " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  },

  tituloRelatorioPagina(titulo, comSufixo) {
    const base = String(titulo || "relatório").trim() || "relatório";
    if (comSufixo === false) return base;
    return /relat[oó]rio\s*$/i.test(base) ? base : base + " — relatório";
  },

  textoRodapeRelatorio(titulo, gerado, comSufixo = true) {
    return this.tituloRelatorioPagina(titulo, comSufixo) + " (" + gerado + ")";
  },

  textoCabecalhoRelatorio(metaPagina) {
    const titulo = String(metaPagina?.titulo || "").trim().toLowerCase();
    const subtitulo = String(metaPagina?.subtitulo || "").trim().toLowerCase();
    if (titulo && subtitulo) return titulo + " — " + subtitulo;
    return titulo || subtitulo || "relatório";
  },

  resolverMetaRelatorio(meta) {
    const base = meta || {};
    const metaPagina = this.obterMetaPagina();
    return {
      titulo: base.titulo || metaPagina.titulo,
      subtitulo: base.subtitulo !== undefined ? base.subtitulo : metaPagina.subtitulo,
    };
  },

  coletarCards(doc) {
    const cards = [];
    const vistos = new Set();

    function adicionar(rotulo, valor) {
      const chave = String(rotulo || "").trim().toLowerCase();
      if (!chave || chave === "—" || vistos.has(chave)) return;
      vistos.add(chave);
      cards.push({ rotulo: String(rotulo).trim(), valor: String(valor).trim() || "—" });
    }

    doc.querySelectorAll(".dashboard-kpi-card").forEach((card) => {
      if (!this.elementoParaRelatorio(card)) return;
      const rotulo = card.querySelector(".dashboard-kpi-rotulo")?.textContent?.trim();
      const valor = card.querySelector(".dashboard-kpi-valor")?.textContent?.trim();
      if (rotulo) adicionar(rotulo, valor);
    });

    doc.querySelectorAll(".home-kpi-card").forEach((card) => {
      if (!this.elementoParaRelatorio(card)) return;
      const rotulo = card.querySelector(".home-kpi-titulo")?.textContent?.trim();
      const valor = card.querySelector(".home-kpi-valor")?.textContent?.trim();
      if (rotulo) adicionar(rotulo, valor);
    });

    doc.querySelectorAll("#lista .card").forEach((card) => {
      if (!this.elementoParaRelatorio(card)) return;
      const titulo = card.querySelector("strong")?.textContent?.trim();
      const badge = card.querySelector(".badge")?.textContent?.trim();
      const info = card.querySelector(".card-planilha-info")?.textContent?.trim();
      if (!titulo) return;
      adicionar(titulo, [badge, info].filter(Boolean).join(" · ") || "—");
    });

    return cards;
  },

  coletarFiltros(doc) {
    const filtros = [];

    doc.querySelectorAll(".dashboard-filtro-regioes").forEach((grupo) => {
      const checks = Array.from(grupo.querySelectorAll('input[type="checkbox"]'));
      if (!checks.length) return;
      const marcados = checks.filter((c) => c.checked);
      const nome = grupo.getAttribute("aria-label") || "região";
      const todos = marcados.length === checks.length;
      const nenhum = marcados.length === 0;
      let valor = "todas as regiões";
      if (nenhum) valor = "nenhuma região selecionada";
      else if (!todos) {
        valor = marcados
          .map((c) => c.closest("label")?.textContent?.trim() || c.value)
          .filter(Boolean)
          .join(", ");
      }
      filtros.push({ nome, ativo: !todos || nenhum, valor });
    });

    const visualizarNulos = doc.getElementById("visualizarRegistrosNulos");
    if (visualizarNulos) {
      filtros.push({
        nome: "visualizar registros nulos",
        ativo: visualizarNulos.checked,
        valor: visualizarNulos.checked ? "ativado" : "desativado",
      });
    }

    doc.querySelectorAll(".entregas-filtro-municipios").forEach((grupo) => {
      const radios = Array.from(grupo.querySelectorAll('input[type="radio"]'));
      const checks = Array.from(grupo.querySelectorAll('input[type="checkbox"]'));
      const inputs = radios.length ? radios : checks;
      if (!inputs.length) return;
      const marcados = inputs.filter((c) => c.checked);
      const nome = grupo.getAttribute("aria-label") || "município";
      let valor = "todos";
      let ativo = false;
      if (marcados.length && marcados.length < inputs.length) {
        ativo = true;
        valor = marcados
          .map((c) => c.closest("label")?.textContent?.trim() || c.value)
          .filter(Boolean)
          .join(", ");
      } else if (marcados.length === 1) {
        ativo = true;
        valor =
          marcados[0].closest("label")?.textContent?.trim() || marcados[0].value || "selecionado";
      }
      filtros.push({ nome, ativo, valor });
    });

    doc.querySelectorAll('input[type="search"], .crud-busca-input').forEach((input) => {
      const valor = input.value?.trim();
      if (!valor) return;
      const nome =
        input.getAttribute("placeholder") ||
        input.id ||
        input.closest("label")?.textContent?.trim() ||
        "busca";
      filtros.push({ nome, ativo: true, valor });
    });

    doc.querySelectorAll('.pagamentos-filtro-forma input[type="radio"]:checked').forEach((input) => {
      const valor = String(input.value || "").trim();
      if (!valor || valor === "todos") return;
      filtros.push({
        nome: "forma pagamento",
        ativo: true,
        valor: valor === "pix" ? "conta (lançamento no sistema)" : "direto (pagamento manual)",
      });
    });

    const origens = Array.from(doc.querySelectorAll(".agenda-filtro-badge--origem"));
    if (origens.length) {
      const ativas = origens.filter((b) => b.classList.contains("is-ativo"));
      filtros.push({
        nome: "agendas",
        ativo: ativas.length < origens.length,
        valor:
          ativas.length === origens.length
            ? "todas"
            : ativas.map((b) => b.textContent.trim()).join(", "),
      });
    }

    const tarefasFiltro = doc.querySelector(".agenda-tarefas-filtro .is-ativo");
    if (tarefasFiltro) {
      filtros.push({
        nome: "tarefas",
        ativo: tarefasFiltro.dataset.filtroTarefas !== "todas",
        valor: tarefasFiltro.textContent.trim(),
      });
    }

    const limparDia =
      doc.getElementById("btnLimparFiltro") || doc.getElementById("btnLimparFiltroDesktop");
    if (limparDia && !limparDia.classList.contains("d-none")) {
      const titulo =
        doc.getElementById("tituloLista")?.textContent?.trim() ||
        doc.getElementById("tituloListaMobile")?.textContent?.trim();
      filtros.push({ nome: "período", ativo: true, valor: titulo || "dia selecionado" });
    }

    const abaAtiva = doc.querySelector(".agenda-listas-tab.is-ativo");
    if (abaAtiva) {
      filtros.push({
        nome: "lista exibida",
        ativo: abaAtiva.dataset.agendaTab !== "atividades",
        valor: abaAtiva.textContent.trim(),
      });
    }

    return filtros;
  },

  limparNo(clone) {
    clone
      .querySelectorAll(
        "button, .btn, .agenda-btn-nova, .popover, .dashboard-th-acoes, .crud-acoes, input, select, svg, .visually-hidden, .d-none, [hidden]"
      )
      .forEach((el) => el.remove());
    this.prepararLayoutDesktop(clone);
    clone.querySelectorAll("td, th").forEach((cel) => {
      cel.removeAttribute("style");
      cel.className = cel.className.replace(/\b(d-none|d-lg-none|d-md-none|d-sm-none)\b/g, "").trim();
    });
    return clone;
  },

  prepararLayoutDesktop(clone) {
    const removerElementos = [
      ".apoiadores-th-mobile",
      ".apoiadores-celula-mobile",
      ".apoiadores-sub-municipio",
      ".apoiadores-th-sub-municipio",
      ".apoiadores-sub-fin-total",
      ".apoiadores-fin-badge",
      ".orcamento-municipio-total-mobile",
      ".pessoal-th-label-sm",
      ".registros-th-regiao-mobile",
      ".registros-only-mobile",
      ".entregas-thead-mobile",
      ".mob-persp-thead-mobile",
      ".dashboard-municipio-eleitores",
      ".dashboard-th-sub-eleitores",
      ".dashboard-kpi-votacao-titulo",
      ".d-lg-none",
      ".d-md-none",
      ".d-sm-none",
      ".d-xl-none",
    ];
    removerElementos.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });

    const removerCelulas = [
      "td.apoiadores-col-grupo-mobile",
      "th.apoiadores-col-grupo-mobile",
      "td[class*='-tabela-stack-col']",
      "th[class*='-tabela-stack-col']",
      "td[class*='-tabela-mobile-col']",
      "th[class*='-tabela-mobile-col']",
      "td.entregas-col-stack",
      "th.entregas-col-stack",
      "tr.entregas-thead-mobile",
      "tr.mob-persp-thead-mobile",
    ];
    removerCelulas.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });

    clone.querySelectorAll("colgroup col").forEach((col) => {
      const cls = col.className || "";
      if (
        /-tabela-stack-col|-tabela-mobile-col|registros-only-mobile|apoiadores-col-grupo-mobile/.test(cls)
      ) {
        col.remove();
      }
    });

    clone
      .querySelectorAll(
        ".pessoal-th-label-lg, .apoiadores-th-desktop, .apoiadores-celula-desktop, .registros-only-desktop"
      )
      .forEach((el) => {
        el.style.display = "";
        el.style.visibility = "";
      });

    return clone;
  },

  htmlTabelaClonada(table) {
    const clone = this.limparNo(table.cloneNode(true));
    clone.classList.add("rel-tabela");
    clone.removeAttribute("id");
    if (typeof global.ajustarTabelaRelatorioPagina === "function") {
      try {
        global.ajustarTabelaRelatorioPagina(clone);
      } catch (e) {
        /* ignorar */
      }
    }
    return clone.outerHTML;
  },

  mesclarTabelaDashboard(card) {
    const headTable = card.querySelector(".dashboard-tabela-head table");
    const bodyTable = card.querySelector(".dashboard-tabela-body-scroll table");
    if (!headTable && !bodyTable) return null;

    const origem = headTable || bodyTable;
    const table = document.createElement("table");
    table.className = origem.className || "table mb-0";

    const colgroup =
      headTable?.querySelector("colgroup") || bodyTable?.querySelector("colgroup");
    if (colgroup) table.appendChild(colgroup.cloneNode(true));

    const thead = headTable?.querySelector("thead") || bodyTable?.querySelector("thead");
    if (thead) table.appendChild(thead.cloneNode(true));

    const tbody = bodyTable?.querySelector("tbody") || headTable?.querySelector("tbody");
    if (tbody) table.appendChild(tbody.cloneNode(true));

    const tfoot = bodyTable?.querySelector("tfoot") || headTable?.querySelector("tfoot");
    if (tfoot) table.appendChild(tfoot.cloneNode(true));

    return table.rows.length ? table : null;
  },

  coletarTabelas(doc) {
    const blocos = [];
    const tabelasVistas = new Set();

    const podeIncluir = (table) => {
      if (!table || !this.elementoParaRelatorio(table)) return false;
      if (table.closest(".modal")) return false;
      if (table.closest(".crud-tabela-card")?.classList.contains("d-none")) return false;
      return true;
    };

    const tituloCard = (card) =>
      card?.querySelector(".card-header, h2, h3, .small.text-secondary")?.textContent?.trim() || "";

    const marcarTabelas = (root) => {
      root?.querySelectorAll("table").forEach((t) => tabelasVistas.add(t));
    };

    const adicionarTabela = (table, titulo) => {
      if (!podeIncluir(table) || tabelasVistas.has(table)) return;
      tabelasVistas.add(table);
      blocos.push({ titulo: titulo || "", html: this.htmlTabelaClonada(table) });
    };

    doc.querySelectorAll(".dashboard-tabela-card").forEach((card) => {
      if (!this.elementoParaRelatorio(card)) return;
      const titulo = tituloCard(card);
      const paineis = card.querySelectorAll(".dashboard-tabela-panel");

      if (paineis.length) {
        paineis.forEach((painel) => {
          const mesclada = this.mesclarTabelaDashboard(painel);
          if (mesclada) {
            marcarTabelas(painel);
            blocos.push({ titulo, html: this.htmlTabelaClonada(mesclada) });
            return;
          }
          adicionarTabela(painel.querySelector("table"), titulo);
        });
        marcarTabelas(card);
        return;
      }

      const mesclada = this.mesclarTabelaDashboard(card);
      if (mesclada) {
        marcarTabelas(card);
        blocos.push({ titulo, html: this.htmlTabelaClonada(mesclada) });
        return;
      }
      adicionarTabela(card.querySelector("table"), titulo);
    });

    [
      ".registros-tabela-card table",
      "#tabelaMicroRegiao",
      "#tabelaRegistros",
      ".crud-tabela-card table",
      "#entregasPorAnoCorpo",
      ".entregas-tabela",
    ].forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => {
        const table = el.tagName === "TABLE" ? el : el.closest("table");
        adicionarTabela(table, "");
      });
    });

    const mobChart = doc.getElementById("mobOrgChart");
    if (mobChart && this.elementoParaRelatorio(mobChart)) {
      const tabelas = mobChart.querySelectorAll("table");
      if (tabelas.length) {
        tabelas.forEach((table, i) => {
          if (tabelasVistas.has(table)) return;
          tabelasVistas.add(table);
          blocos.push({
            titulo: i === 0 ? "estrutura" : "",
            html: this.htmlTabelaClonada(table),
          });
        });
      } else if (mobChart.textContent.trim()) {
        const clone = mobChart.cloneNode(true);
        this.limparNo(clone);
        blocos.push({ titulo: "estrutura", html: '<div class="rel-bloco-texto">' + clone.innerHTML + "</div>" });
      }
    }

    return blocos;
  },

  coletarListasAgenda(doc) {
    const blocos = [];
    const esc = (v) => Relatorio.escapeHtml(v);
    const MESES_EXTENSO = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    const DIAS_SEMANA = [
      "domingo",
      "segunda",
      "terça",
      "quarta",
      "quinta",
      "sexta",
      "sábado",
    ];

    function htmlTituloOrigem(tituloItem, origem) {
      const titulo = String(tituloItem || "").trim() || "—";
      const orig = String(origem || "").trim();
      let html = '<div class="agenda-rel-titulo-stack">';
      html += `<div class="agenda-rel-titulo">${esc(titulo)}</div>`;
      if (orig) {
        html += `<div class="agenda-rel-origem">${esc(orig)}</div>`;
      }
      html += "</div>";
      return html;
    }

    function parseDataItem(item, dataDia, dataMes) {
      const iso = String(item.getAttribute("data-data") || "").trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
        const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt.getTime())) return dt;
      }
      const dia = parseInt(String(dataDia || "").replace(/\D/g, ""), 10);
      if (!dia) return null;
      const agora = new Date();
      return new Date(agora.getFullYear(), agora.getMonth(), dia);
    }

    function htmlDataExtenso(dt) {
      if (!dt || isNaN(dt.getTime())) return "—";
      const dia = dt.getDate();
      const mes = MESES_EXTENSO[dt.getMonth()] || "";
      const ano = dt.getFullYear();
      const semana = DIAS_SEMANA[dt.getDay()] || "";
      return (
        '<div class="agenda-rel-data-stack">' +
        `<div class="agenda-rel-data-extenso">${esc(`${dia} ${mes} ${ano}`)}</div>` +
        `<div class="agenda-rel-data-semana">(${esc(semana)})</div>` +
        "</div>"
      );
    }

    function listaParaTabela(container, titulo, headers, colunas, classesTh) {
      if (!container || !Relatorio.elementoParaRelatorio(container)) return;
      const itens = Array.from(container.querySelectorAll(".lista-evento-item")).filter((el) =>
        Relatorio.elementoParaRelatorio(el)
      );
      if (!itens.length) {
        blocos.push({
          titulo,
          html: '<p class="rel-vazio">nenhum item na lista.</p>',
        });
        return;
      }
      const linhas = itens
        .map((item) => {
          const tituloItem = item.querySelector("strong")?.textContent?.trim() || "—";
          const origem = item.querySelector(".badge-origem")?.textContent?.trim() || "";
          const detalhe = item.querySelector(".text-secondary")?.textContent?.trim() || "";
          const descricao =
            item.querySelector(".lista-evento-corpo .small:not(.text-secondary)")?.textContent?.trim() ||
            "";
          const dataDia = item.querySelector(".lista-evento-dia")?.textContent?.trim() || "";
          const dataMes = item.querySelector(".lista-evento-mes")?.textContent?.trim() || "";
          const dataDt = parseDataItem(item, dataDia, dataMes);
          const data = dataDt
            ? `${dataDt.getDate()} ${MESES_EXTENSO[dataDt.getMonth()] || ""} ${dataDt.getFullYear()}`
            : [dataDia, dataMes].filter(Boolean).join(" ");
          const cols = colunas.map((fn, i) => {
            const cel = fn({ tituloItem, origem, detalhe, descricao, data, dataDt });
            const html = cel && typeof cel === "object" && cel.html != null ? cel.html : esc(cel);
            const cls = classesTh && classesTh[i] ? ` class="${classesTh[i]}"` : "";
            return "<td" + cls + ">" + html + "</td>";
          });
          return "<tr>" + cols.join("") + "</tr>";
        })
        .join("");
      const ths = headers
        .map((h, i) => {
          const cls = classesTh && classesTh[i] ? ` class="${classesTh[i]}"` : "";
          return "<th" + cls + ">" + esc(h) + "</th>";
        })
        .join("");
      blocos.push({
        titulo,
        html:
          '<table class="rel-tabela agenda-rel-tabela"><thead><tr>' +
          ths +
          "</tr></thead><tbody>" +
          linhas +
          "</tbody></table>",
      });
    }

    listaParaTabela(
      doc.getElementById("listaEventos"),
      "atividades",
      ["data", "título", "detalhes"],
      [
        (r) => ({ html: htmlDataExtenso(r.dataDt) }),
        (r) => ({ html: htmlTituloOrigem(r.tituloItem, r.origem) }),
        (r) => [r.detalhe, r.descricao].filter(Boolean).join(" · "),
      ],
      ["agenda-rel-col-data", "agenda-rel-col-titulo", "agenda-rel-col-detalhes"]
    );

    listaParaTabela(
      doc.getElementById("listaTarefas"),
      "tarefas",
      ["título", "detalhes"],
      [
        (r) => ({ html: htmlTituloOrigem(r.tituloItem, r.origem) }),
        (r) => [r.detalhe, r.descricao].filter(Boolean).join(" · "),
      ],
      ["agenda-rel-col-titulo", "agenda-rel-col-detalhes"]
    );

    return blocos;
  },

  estilos(opcoes) {
    const extra =
      (opcoes && opcoes.estilosExtras) ||
      (typeof global.estilosRelatorioPagina === "function" ? global.estilosRelatorioPagina() : "") ||
      "";

    return (
      "<style>" +
      "body{font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;margin:0.8cm 0.8cm 0.5cm;font-size:10pt;line-height:1.4;}" +
      "table.rel-print-shell{width:100%;border-collapse:collapse;border-spacing:0;}" +
      "table.rel-print-shell thead{display:table-header-group;}" +
      "table.rel-print-shell tfoot{display:table-footer-group;}" +
      "table.rel-print-shell tbody{display:table-row-group;}" +
      "table.rel-print-shell td.rel-print-celula{border:0;padding:0;vertical-align:top;}" +
      "table.rel-print-shell td.rel-print-celula-rodape{vertical-align:bottom;padding-top:0.45rem;}" +
      ".rel-cabecalho{font-size:12pt;font-weight:600;color:#1f4e8c;margin:0 0 0.75rem;padding-bottom:0.35rem;border-bottom:1px solid #e2e8f0;line-height:1.25;}" +
      ".rel-conteudo{padding:0;}" +
      ".rel-rodape{display:none!important;}" +
      "h1{font-size:16pt;margin:0 0 0.2rem;color:#1f4e8c;}" +
      ".rel-subtitulo{font-size:11pt;color:#475569;margin:0 0 0.35rem;}" +
      ".rel-gerado{display:none!important;}" +
      ".rel-secao{margin:1rem 0 1.25rem;page-break-inside:avoid;}" +
      ".rel-secao h2{font-size:11pt;margin:0 0 0.5rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.25rem;color:#334155;}" +
      ".rel-filtros{margin:0;padding:0;list-style:none;}" +
      ".rel-filtros li{margin:0.2rem 0;font-size:9.5pt;}" +
      ".rel-filtros strong{color:#334155;}" +
      ".rel-filtro-ativo{color:#b45309;}" +
      ".rel-filtro-inativo{color:#64748b;}" +
      ".rel-cards{display:flex;flex-wrap:wrap;gap:0.5rem;margin:0.5rem 0 0;}" +
      ".rel-card{flex:1 1 140px;min-width:120px;border:1px solid #e2e8f0;border-radius:6px;padding:0.45rem 0.55rem;background:#f8fafc;}" +
      ".rel-card-rotulo{font-size:8.5pt;color:#64748b;text-transform:lowercase;}" +
      ".rel-card-valor{display:block;font-size:12pt;font-weight:700;color:#1f4e8c;margin-top:0.15rem;}" +
      ".rel-graficos{display:flex;flex-wrap:wrap;gap:0.85rem;margin-top:0.5rem;}" +
      ".rel-grafico-bloco{flex:1 1 280px;min-width:240px;border:1px solid #e2e8f0;border-radius:8px;padding:0.55rem 0.65rem;background:#fff;page-break-inside:avoid;}" +
      ".rel-grafico-bloco h3{font-size:9.5pt;font-weight:600;color:#334155;margin:0 0 0.45rem;text-transform:lowercase;}" +
      ".rel-grafico-img{display:block;width:100%;max-width:100%;height:auto;}" +
      ".rel-grafico-meta-layout{display:flex;flex-wrap:wrap;align-items:center;gap:0.65rem;}" +
      ".rel-grafico-meta-layout .rel-grafico-img{flex:1 1 180px;max-width:220px;}" +
      ".rel-grafico-legenda{flex:1 1 140px;min-width:120px;margin:0;padding:0;list-style:none;font-size:8.5pt;}" +
      ".rel-grafico-legenda li{display:flex;align-items:center;gap:0.35rem;margin:0.15rem 0;}" +
      ".rel-grafico-legenda-cor{display:inline-block;width:0.55rem;height:0.55rem;border-radius:999px;flex-shrink:0;}" +
      "table.rel-tabela{border-collapse:collapse;width:100%;margin:0.35rem 0 0.75rem;font-size:8.5pt;}" +
      "table.rel-tabela th,table.rel-tabela td{border:1px solid #cbd5e1;padding:0.28rem 0.35rem;vertical-align:middle;}" +
      "table.rel-tabela th{background:#f1f5f9;font-weight:600;}" +
      "table.rel-tabela tbody tr:nth-child(even){background:#fafbfc;}" +
      "table.rel-tabela .text-end{text-align:right;}" +
      "table.rel-tabela .text-center{text-align:center;}" +
      "table.rel-tabela .apoiadores-celula-num,table.rel-tabela .pessoal-celula-num{font-variant-numeric:tabular-nums;}" +
      ".rel-vazio{font-size:9pt;color:#64748b;margin:0;}" +
      ".rel-bloco-texto{font-size:9pt;}" +
      "html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
      ".home-kpi-card,.home-kpi-ilustra,.rel-grafico-bloco,.rel-card,table.rel-tabela th{" +
      "-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
      "@media print{" +
      "body{margin:0.8cm 0.8cm 0.45cm;}" +
      ".rel-secao{page-break-inside:avoid;}" +
      "*,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}" +
      "}" +
      extra +
      "</style>"
    );
  },

  classeBodyRelatorio(doc) {
    const body = doc?.body;
    if (!body) return "rel-body";
    const paginas = Array.from(body.classList).filter(
      (c) => c.startsWith("page-") && c !== "page-frame-body"
    );
    return paginas.length ? "rel-body " + paginas.join(" ") : "rel-body";
  },

  scriptImpressaoRelatorio() {
    return (
      '<scr' +
      'ipt>(function(){function fechar(){try{window.close();}catch(e){}}' +
      'function imprimir(){try{document.title=" ";}catch(e){}window.focus();window.print();}' +
      'window.addEventListener("afterprint",fechar);' +
      'window.addEventListener("load",imprimir);' +
      '})();</scr' +
      "ipt>"
    );
  },

  htmlEnvelopeImpressao(cabecalhoHtml, conteudoHtml) {
    return (
      '<table class="rel-print-shell">' +
      "<thead><tr><td class=\"rel-print-celula\">" +
      cabecalhoHtml +
      "</td></tr></thead>" +
      "<tbody><tr><td class=\"rel-print-celula rel-print-celula-corpo\">" +
      conteudoHtml +
      "</td></tr></tbody>" +
      "</table>"
    );
  },

  htmlDocumento(opcoes, conteudoBody) {
    const meta = opcoes || {};
    const doc = meta.documento || document;
    const bodyClass = this.classeBodyRelatorio(doc);
    const metaRel = this.resolverMetaRelatorio(meta);
    const textoCabecalho = this.textoCabecalhoRelatorio(metaRel);
    const cabecalho =
      '<div class="rel-cabecalho">' + this.escapeHtml(textoCabecalho) + "</div>";

    return (
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\" />" +
      "<title>" +
      this.escapeHtml(textoCabecalho) +
      "</title>" +
      this.estilos(meta) +
      "</head><body class=\"" +
      this.escapeHtml(bodyClass) +
      "\">" +
      this.htmlEnvelopeImpressao(cabecalho, conteudoBody) +
      "</body></html>"
    );
  },

  htmlFiltros(filtros) {
    if (!filtros.length) {
      return (
        '<ul class="rel-filtros"><li class="rel-filtro-inativo"><strong>filtros:</strong> nenhum filtro aplicado (exibindo todos os registros)</li></ul>'
      );
    }
    const temAtivo = filtros.some((f) => f.ativo);
    const linhas = filtros
      .map((f) => {
        const cls = f.ativo ? "rel-filtro-ativo" : "rel-filtro-inativo";
        const status = f.ativo ? "filtro ativo" : "sem filtro";
        return (
          '<li class="' +
          cls +
          '"><strong>' +
          this.escapeHtml(f.nome) +
          ":</strong> " +
          this.escapeHtml(f.valor) +
          " <em>(" +
          status +
          ")</em></li>"
        );
      })
      .join("");
    const resumo = temAtivo
      ? '<li class="rel-filtro-ativo"><strong>resumo:</strong> relatório com filtros aplicados</li>'
      : '<li class="rel-filtro-inativo"><strong>resumo:</strong> sem filtros restritivos (dados completos)</li>';
    return '<ul class="rel-filtros">' + resumo + linhas + "</ul>";
  },

  htmlExtras(extras) {
    const html = String(extras || "").trim();
    if (!html) return "";
    return html;
  },

  coletarExtras(doc, opcoes) {
    const meta = opcoes || {};
    if (meta.extras) return meta.extras;
    if (typeof global.conteudoExtraRelatorioPagina === "function") {
      try {
        return global.conteudoExtraRelatorioPagina(doc) || "";
      } catch (e) {
        return "";
      }
    }
    return "";
  },

  htmlCards(cards) {
    if (!cards.length) return "";
    const itens = cards
      .map(
        (c) =>
          '<div class="rel-card"><span class="rel-card-rotulo">' +
          this.escapeHtml(c.rotulo) +
          '</span><strong class="rel-card-valor">' +
          this.escapeHtml(c.valor) +
          "</strong></div>"
      )
      .join("");
    return '<section class="rel-secao"><h2>indicadores</h2><div class="rel-cards">' + itens + "</div></section>";
  },

  htmlTabelas(blocos) {
    if (!blocos.length) return "";
    return blocos
      .map((b) => {
        const titulo = b.titulo ? "<h2>" + this.escapeHtml(b.titulo) + "</h2>" : "<h2>dados</h2>";
        return '<section class="rel-secao">' + titulo + b.html + "</section>";
      })
      .join("");
  },

  montarHtml(opcoes) {
    const meta = opcoes || {};
    const doc = meta.documento || document;
    const metaRel = this.resolverMetaRelatorio(meta);

    const filtros = meta.filtros || this.coletarFiltros(doc);
    const cards = meta.cards || this.coletarCards(doc);
    const cardsHtml =
      typeof global.htmlCardsRelatorioPagina === "function"
        ? global.htmlCardsRelatorioPagina(doc) || ""
        : this.htmlCards(cards);
    const extras = this.htmlExtras(meta.extras || this.coletarExtras(doc, meta));
    const tabelas =
      meta.tabelas ||
      (typeof global.coletarTabelasRelatorioPagina === "function"
        ? global.coletarTabelasRelatorioPagina(doc)
        : this.coletarTabelas(doc));
    const listasAgenda = this.coletarListasAgenda(doc);
    const todosBlocos = tabelas.concat(listasAgenda);
    const temCards = String(cardsHtml || "").trim().length > 0;

    const corpo =
      '<section class="rel-secao"><h2>filtros</h2>' +
      this.htmlFiltros(filtros) +
      "</section>" +
      cardsHtml +
      extras +
      this.htmlTabelas(todosBlocos);

    if (!temCards && !todosBlocos.length && !extras) {
      return this.htmlDocumento(
        { ...meta, ...metaRel, documento: doc },
        '<p class="rel-vazio">nenhum dado disponível para impressão nesta página.</p>'
      );
    }

    return (
      this.htmlDocumento(
        { ...meta, ...metaRel, documento: doc },
        corpo + this.scriptImpressaoRelatorio()
      )
    );
  },

  abrirJanelaRelatorio(html) {
    if (!html) return false;

    const janela = window.open("", "_blank");
    if (!janela) return false;

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    return true;
  },

  imprimir(opcoes) {
    const html = typeof opcoes === "string" ? opcoes : this.montarHtml(opcoes);
    return this.abrirJanela(html);
  },

  abrirJanela(html) {
    if (!html) return false;

    try {
      if (window.parent && window.parent !== window && typeof window.parent.abrirRelatorioHtml === "function") {
        return window.parent.abrirRelatorioHtml(html);
      }
    } catch (e) {
      /* origem cruzada */
    }

    if (this.abrirJanelaRelatorio(html)) return true;

    this.mostrarErro("permita pop-ups para gerar o PDF.");
    return false;
  },

  mostrarErro(msg) {
    if (typeof statusPainel === "function") {
      const status = document.getElementById("status") || document.getElementById("statusInicio");
      statusPainel(status, msg, "erro");
      return;
    }
    alert(msg);
  },

  obterHtml(opcoes) {
    return typeof opcoes === "string" ? opcoes : this.montarHtml(opcoes);
  },

  gerarPadrao(opcoes) {
    return this.imprimir(opcoes);
  }
};

  global.Relatorio = Relatorio;

  global.obterHtmlRelatorioPagina = function obterHtmlRelatorioPagina(opcoes) {
    if (typeof global.montarHtmlRelatorioPagina === "function") {
      const htmlCustom = global.montarHtmlRelatorioPagina(opcoes);
      if (typeof htmlCustom === "string" && htmlCustom) {
        return htmlCustom;
      }
    }
    return Relatorio.obterHtml(opcoes);
  };

  if (typeof global.gerarRelatorioPagina !== "function") {
    global.gerarRelatorioPagina = function gerarRelatorioPaginaPadrao(opcoes) {
      if (opcoes && opcoes.apenasHtml) {
        return Relatorio.obterHtml(opcoes);
      }
      return Relatorio.gerarPadrao(opcoes);
    };
  }
})(window);
