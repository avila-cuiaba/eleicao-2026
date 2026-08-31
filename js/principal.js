// principal.html — controla o iframe de conteúdo e sincroniza menu/cabeçalho.

const PAGINAS = {
  inicio: {
    titulo: "início",
    subtitulo: "painel da campanha",
    arquivo: "pages/inicio.html",
    atualizar: true,
  },
  "micro-regiao": {
    titulo: "região",
    subtitulo: "municípios, habitantes e eleitores por região",
    arquivo: "pages/micro-regiao.html",
    atualizar: true,
  },
  dashboard: {
    titulo: "votação",
    subtitulo: "gráficos e tabelas de votação",
    arquivo: "pages/dashboard.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
  "pessoal-visao-geral": {
    titulo: "pessoal",
    subtitulo: "visão geral — equipe por município",
    arquivo: "pages/pessoal.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-apoiadores": {
    titulo: "pessoal",
    subtitulo: "apoiadores — contratos",
    arquivo: "pages/apoiadores.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-apoiador-federal": {
    titulo: "pessoal",
    subtitulo: "apoiador federal",
    arquivo: "pages/apoiador-federal.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-contratos": {
    titulo: "pessoal",
    subtitulo: "contratos",
    arquivo: "pages/contratos.html",
    atualizar: true,
    menuGrupo: "pessoal",
    relatorioOpcoes: [
      { id: "geral", rotulo: "relatório geral" },
      { id: "clicksign", rotulo: "contatos para clicksign" },
    ],
  },
  "pessoal-pagamentos": {
    titulo: "pessoal",
    subtitulo: "pagamentos",
    arquivo: "pages/pessoal-pagamentos.html",
    atualizar: true,
    menuGrupo: "pessoal",
  },
  "pessoal-parcerias": {
    titulo: "orçamento",
    subtitulo: "parceria",
    arquivo: "pages/parcerias.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "logistica-material-grafico": {
    titulo: "logística",
    subtitulo: "material gráfico",
    arquivo: "pages/logistica-material-grafico.html",
    atualizar: true,
    menuGrupo: "logistica",
  },
  "logistica-abastecimento": {
    titulo: "logística",
    subtitulo: "abastecimentos",
    arquivo: "pages/logistica-abastecimento.html",
    atualizar: true,
    menuGrupo: "logistica",
  },
  "midia-producao": {
    titulo: "mídia",
    subtitulo: "produção",
    arquivo: "pages/midia-producao.html",
    atualizar: true,
    menuGrupo: "midia",
  },
  "orcamento-geral": {
    titulo: "orçamento",
    subtitulo: "planejamento geral",
    arquivo: "pages/orcamento-geral.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-estratificado": {
    titulo: "orçamento",
    subtitulo: "orçamento por município",
    arquivo: "pages/orcamento.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-pessoal-apoiadores": {
    titulo: "orçamento",
    subtitulo: "por liderança",
    arquivo: "pages/orcamento-pessoal-apoiadores.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-desembolso": {
    titulo: "orçamento",
    subtitulo: "desembolso",
    arquivo: "pages/orcamento-desembolso.html",
    atualizar: true,
    menuGrupo: "orcamento",
  },
  "orcamento-juliana": {
    titulo: "Juliana",
    subtitulo: "orçamento por liderança",
    arquivo: "pages/orcamento-juliana.html",
    atualizar: true,
    menuGrupo: "juliana",
  },
  "pessoal-contratos-juliana": {
    titulo: "Juliana",
    subtitulo: "contratos",
    arquivo: "pages/contratos-juliana.html",
    atualizar: true,
    menuGrupo: "juliana",
    exportarXls: true,
    relatorioOpcoes: [
      { id: "geral", rotulo: "relatório geral" },
      { id: "clicksign", rotulo: "contatos para clicksign" },
    ],
  },
  "pagamentos-geral": {
    titulo: "pagamentos",
    subtitulo: "geral",
    arquivo: "pages/pagamentos-geral.html",
    atualizar: true,
    menuGrupo: "pagamentos",
  },
  "pagamentos-lideranca": {
    titulo: "pagamentos",
    subtitulo: "por liderança",
    arquivo: "pages/pagamentos-lideranca.html",
    atualizar: true,
    menuGrupo: "pagamentos",
  },
  agenda: {
    titulo: "agenda",
    subtitulo: "próximas atividades",
    arquivo: "pages/agenda.html",
    atualizar: true,
  },
  entregas: {
    titulo: "entregas",
    subtitulo: "materiais e distribuição",
    arquivo: "pages/entregas.html",
    atualizar: true,
  },
  "mobilizacao-estrutura": {
    titulo: "mobilização em Cuiabá / VG",
    subtitulo: "estrutura — visão hierárquica",
    arquivo: "pages/mobilizacao-estrutura.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
  "mobilizacao-perspectiva": {
    titulo: "mobilização em Cuiabá / VG",
    subtitulo: "responsabilidade e perspectiva de voto",
    arquivo: "pages/mobilizacao-perspectiva.html",
    atualizar: true,
    menuGrupo: "desempenho",
  },
};

function resolverPagina(id) {
  if (id === "pessoal") return "pessoal-visao-geral";
  if (id === "logistica") return "logistica-material-grafico";
  if (id === "midia") return "midia-producao";
  if (id === "orcamento") return "orcamento-estratificado";
  if (id === "mobilizacao") return "mobilizacao-estrutura";
  if (id === "desempenho") return "dashboard";
  if (id === "juliana") return "orcamento-juliana";
  if (id === "apoiador-federal") return "pessoal-apoiador-federal";
  const resolved = id && PAGINAS[id] ? id : "inicio";
  if (AUTH.getChave() && !AUTH.podeAcessarPagina(resolved)) {
    return AUTH.paginaInicial();
  }
  return resolved;
}

function paginaDaUrl() {
  const p = new URLSearchParams(window.location.search).get("p");
  return resolverPagina(p);
}

function iconeIdPagina(id) {
  const cfg = PAGINAS[id];
  if (cfg?.menuGrupo) return cfg.menuGrupo;
  return window.APP_ICONE ? APP_ICONE.idPagina(id) : id;
}

function tituloPagina(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  if (id === "mobilizacao-estrutura" || id === "mobilizacao-perspectiva") {
    return CONFIG.MOBILIZACAO?.TITULO_PAGINA || cfg.titulo;
  }
  return cfg.titulo;
}

function paginaTemRelatorio(cfg, paginaId) {
  if (!cfg) return false;
  if (cfg.relatorio === false) return false;
  const perfilCfg = AUTH.PERFIS[AUTH.perfilAtivo()];
  if (perfilCfg?.paginas && !perfilCfg.paginas.includes(paginaId)) return false;
  if (perfilCfg?.relatorio === true) return true;
  return cfg.relatorio === true || !!cfg.atualizar;
}

function escapeHtmlShell(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}

function atualizarMenuRelatorioShell(cfg, id) {
  const temRelatorio = paginaTemRelatorio(cfg, id);
  const btnSimples = document.getElementById("btnRelatorioShell");
  const menuWrap = document.getElementById("relatorioShellMenuWrap");
  const menuLista = document.getElementById("relatorioShellDropdownLista");
  const opcoes = cfg.relatorioOpcoes;

  if (!temRelatorio) {
    if (btnSimples) btnSimples.hidden = true;
    if (menuWrap) menuWrap.hidden = true;
    return;
  }

  if (opcoes?.length) {
    if (btnSimples) btnSimples.hidden = true;
    if (menuWrap) menuWrap.hidden = false;
    if (menuLista) {
      menuLista.innerHTML = opcoes
        .map(
          (op) =>
            `<li><button type="button" class="dropdown-item" data-relatorio-opcao="${escapeHtmlShell(op.id)}">${escapeHtmlShell(op.rotulo)}</button></li>`
        )
        .join("");
    }
    return;
  }

  if (menuWrap) menuWrap.hidden = true;
  if (btnSimples) btnSimples.hidden = false;
}

function atualizarExportarXlsShell(cfg, id) {
  const btn = document.getElementById("btnExportarXlsShell");
  if (!btn) return;
  const mostrar = cfg?.exportarXls && paginaTemRelatorio(cfg, id);
  btn.hidden = !mostrar;
}

function initRelatorioShellMenu() {
  const menuLista = document.getElementById("relatorioShellDropdownLista");
  if (!menuLista || menuLista.dataset.relatorioVinculado === "1") return;
  menuLista.dataset.relatorioVinculado = "1";
  menuLista.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-relatorio-opcao]");
    if (!btn) return;
    executarRelatorioShell(btn.getAttribute("data-relatorio-opcao"));
  });
}

function atualizarCabecalho(id) {
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const titulo = document.getElementById("appHeaderTitulo");
  const sub = document.getElementById("appHeaderSub");
  const btnAtualizar = document.getElementById("btnAtualizarShell");
  const textoTitulo = tituloPagina(id);
  if (titulo) {
    const iconId = iconeIdPagina(id);
    titulo.innerHTML =
      window.APP_ICONE ? APP_ICONE.tituloComIcone(iconId, textoTitulo) : textoTitulo;
  }
  if (sub) sub.textContent = cfg.subtitulo;
  if (btnAtualizar) btnAtualizar.hidden = !cfg.atualizar;
  atualizarMenuRelatorioShell(cfg, id);
  atualizarExportarXlsShell(cfg, id);
  document.title = textoTitulo + " | Eleição 2026";
  if (window.LAYOUT) LAYOUT.atualizarMenu(id);
}

function executarAtualizarShell() {
  const frame = document.getElementById("appFrame");
  const win = frame?.contentWindow;
  if (!win) return;

  try {
    if (typeof win.atualizarPagina === "function") {
      win.atualizarPagina();
      return;
    }
  } catch (e) {
    /* file:// ou origem cruzada — usar postMessage */
  }

  win.postMessage({ tipo: "eleicao-atualizar" }, "*");
}

function abrirRelatorioHtml(html) {
  if (!html) return false;
  if (window.Relatorio?.abrirJanelaRelatorio?.(html)) return true;

  const janela = window.open("about:blank", "_blank");
  if (!janela) {
    window.alert("permita pop-ups para gerar o PDF.");
    return false;
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  if (window.Relatorio?.aplicarTituloImpressaoDocumento) {
    Relatorio.aplicarTituloImpressaoDocumento(janela.document);
  }
  return true;
}

window.abrirRelatorioHtml = abrirRelatorioHtml;

let relatorioJanelaPendente = null;

function framePermiteAcessoDireto(frame) {
  if (!frame?.contentWindow) return false;
  try {
    void frame.contentWindow.document;
    return true;
  } catch (e) {
    return false;
  }
}

function obterHtmlRelatorioDoFrame(frame) {
  let doc = null;
  try {
    doc = frame.contentDocument;
  } catch (e) {
    return undefined;
  }
  if (!doc) return undefined;

  const win = doc.defaultView;
  if (!win) return undefined;

  try {
    if (typeof win.obterHtmlRelatorioPagina === "function") {
      return win.obterHtmlRelatorioPagina({ documento: doc });
    }
    if (win.Relatorio) {
      return win.Relatorio.montarHtml({ documento: doc });
    }
    if (typeof win.gerarRelatorioPagina === "function") {
      const html = win.gerarRelatorioPagina({ apenasHtml: true, documento: doc });
      if (typeof html === "string") return html;
    }
  } catch (e) {
    return undefined;
  }

  return undefined;
}

function deveUsarMensagemRelatorio(frame) {
  if (window.location.protocol === "file:") return true;
  return !framePermiteAcessoDireto(frame);
}

function solicitarRelatorioPorMensagem(frame, opcao) {
  const win = frame?.contentWindow;
  if (!win) return;

  if (opcao === "clicksign") {
    win.postMessage({ tipo: "eleicao-relatorio", opcao: "clicksign" }, "*");
    return;
  }

  const janela = window.open("", "_blank");
  if (!janela) {
    window.alert("permita pop-ups para gerar o PDF.");
    return;
  }

  try {
    janela.document.open();
    janela.document.write(
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\" />" +
        "<title>relatório</title><style>body{font-family:Segoe UI,sans-serif;padding:2rem;color:#475569;}</style>" +
        "</head><body><p>gerando relatório…</p></body></html>"
    );
    janela.document.close();
  } catch (e) {
    /* ignorar */
  }

  relatorioJanelaPendente = janela;
  win.postMessage({ tipo: "eleicao-relatorio", opcao: opcao || "geral" }, "*");
}

async function executarExportacaoXlsShell() {
  const frame = document.getElementById("appFrame");
  if (!frame) return;

  if (!deveUsarMensagemRelatorio(frame)) {
    try {
      const win = frame.contentWindow;
      if (win && typeof win.executarExportacaoXlsPagina === "function") {
        const resultado = await win.executarExportacaoXlsPagina();
        if (resultado?.tipo === "erro") {
          window.alert(resultado.mensagem || "não foi possível exportar o XLS.");
        }
        return;
      }
    } catch (e) {
      /* file:// ou origem cruzada — usar postMessage */
    }
  }

  frame.contentWindow?.postMessage({ tipo: "eleicao-exportar-xls" }, "*");
}

async function executarRelatorioShell(opcao) {
  const frame = document.getElementById("appFrame");
  if (!frame) return;

  const opcoesExec = opcao ? { opcao } : undefined;

  if (!deveUsarMensagemRelatorio(frame)) {
    try {
      const win = frame.contentWindow;
      if (win && typeof win.executarRelatorioPagina === "function") {
        const resultado = await win.executarRelatorioPagina(opcoesExec);
        if (resultado?.tipo === "html" && resultado.html) {
          abrirRelatorioHtml(resultado.html);
        } else if (resultado?.tipo === "erro") {
          window.alert(resultado.mensagem || "não foi possível gerar o relatório.");
        }
        return;
      }

      if (!opcao || opcao === "geral") {
        const html = obterHtmlRelatorioDoFrame(frame);
        if (typeof html === "string" && html) {
          abrirRelatorioHtml(html);
          return;
        }
      }
    } catch (e) {
      /* file:// ou origem cruzada — usar postMessage */
    }
  }

  solicitarRelatorioPorMensagem(frame, opcao || "geral");
}

// Chamado pelo menu lateral e pelos links dentro do iframe (parent.carregarPagina).
window.carregarPagina = function (id) {
  id = resolverPagina(id);
  if (AUTH.getChave() && !AUTH.podeAcessarPagina(id)) {
    id = AUTH.paginaInicial();
  }
  const cfg = PAGINAS[id] || PAGINAS.inicio;
  const frame = document.getElementById("appFrame");
  if (!frame) return;

  frame.src = cfg.arquivo;
  document.body.setAttribute("data-pagina", id);
  atualizarCabecalho(id);

  const url = new URL(window.location.href);
  url.searchParams.set("p", id);
  history.pushState({ p: id }, "", url);

  if (window.matchMedia("(max-width: 991.98px)").matches && window.LAYOUT) {
    LAYOUT.fecharSidebar();
  }
};

function ehMobileShell() {
  return window.matchMedia("(max-width: 576px)").matches;
}

function ajustarAlturaFrame() {
  const frame = document.getElementById("appFrame");
  const main = document.querySelector(".app-main-frame");
  if (!frame || !main) return;

  try {
    frame.style.flex = "1 1 auto";
    frame.style.minHeight = "0";

    const areaMain = main.clientHeight;
    if (areaMain > 0) {
      frame.style.height = areaMain + "px";
    } else {
      frame.style.height = "";
    }
  } catch (e) {
    frame.style.flex = "1 1 auto";
    frame.style.height = "";
    frame.style.minHeight = "0";
  }
}

let agendarAjusteFrameTimer = null;

function agendarAjusteFrame() {
  if (agendarAjusteFrameTimer) clearTimeout(agendarAjusteFrameTimer);
  agendarAjusteFrameTimer = setTimeout(() => {
    agendarAjusteFrameTimer = null;
    ajustarAlturaFrame();
    setTimeout(ajustarAlturaFrame, 120);
  }, ehMobileShell() ? 180 : 0);
}

window.ajustarAlturaFrame = ajustarAlturaFrame;
window.ehMobileShell = ehMobileShell;

document.addEventListener("DOMContentLoaded", () => {
  AUTH.exigir();

  if (window.CONFIG?.EXIGIR_LOGIN) {
    const checarSessao = () => {
      if (AUTH.sessaoExpirada()) {
        AUTH.limpar();
        AUTH.irLogin();
        return false;
      }
      return true;
    };
    setInterval(checarSessao, 60000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checarSessao();
    });
  }

  const id = paginaDaUrl();
  const cfg = PAGINAS[id];
  const frame = document.getElementById("appFrame");

  if (window.LAYOUT) {
    LAYOUT.init();
  }

  if (frame) {
    const padraoInicio = !new URLSearchParams(window.location.search).get("p") && id === "inicio";
    if (!padraoInicio || id !== "inicio") {
      frame.src = cfg.arquivo;
    }
  }

  document.body.setAttribute("data-pagina", id);
  atualizarCabecalho(id);

  if (!new URLSearchParams(window.location.search).get("p")) {
    const url = new URL(window.location.href);
    url.searchParams.set("p", id);
    history.replaceState({ p: id }, "", url);
  }

  document.getElementById("btnAtualizarShell")?.addEventListener("click", executarAtualizarShell);
  initRelatorioShellMenu();
  document.getElementById("btnRelatorioShell")?.addEventListener("click", () => executarRelatorioShell());
  document.getElementById("btnExportarXlsShell")?.addEventListener("click", () => executarExportacaoXlsShell());

  frame?.addEventListener("load", () => {
    agendarAjusteFrame();
    atualizarCabecalho(document.body.getAttribute("data-pagina") || paginaDaUrl());
  });
});

window.addEventListener("popstate", (e) => {
  carregarPagina(e.state?.p || paginaDaUrl());
});

window.addEventListener("message", (event) => {
  if (event.data?.tipo === "eleicao-login") {
    const dest = event.data.url;
    try {
      if (dest && /login\.html/i.test(dest)) {
        window.location.replace(dest);
      } else {
        window.location.replace("login.html");
      }
    } catch (e) {
      window.location.href = "login.html";
    }
    return;
  }
  if (event.data && event.data.tipo === "eleicao-nav" && event.data.pagina) {
    carregarPagina(event.data.pagina);
    return;
  }
  if (event.data && event.data.tipo === "eleicao-resize") {
    agendarAjusteFrame();
    return;
  }
  if (event.data?.tipo === "eleicao-exportar-xls-result") {
    if (event.data.erro) {
      window.alert(event.data.erro);
    }
    return;
  }
  if (event.data?.tipo === "eleicao-relatorio-html") {
    const janela = relatorioJanelaPendente;
    relatorioJanelaPendente = null;
    if (!janela || janela.closed) return;

    if (event.data.erro) {
      janela.close();
      window.alert(event.data.erro);
      return;
    }

    if (event.data.semAlerta) {
      janela.close();
      return;
    }

    if (event.data.html) {
      if (!janela || janela.closed) {
        abrirRelatorioHtml(event.data.html);
        return;
      }
      janela.document.open();
      janela.document.write(event.data.html);
      janela.document.close();
      return;
    }

    janela.close();
    window.alert(event.data.mensagem || "nenhum dado para imprimir.");
  }
});

window.addEventListener("resize", () => {
  agendarAjusteFrame();
});
