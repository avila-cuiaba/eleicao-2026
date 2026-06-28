// Mobilização — estrutura: regionais → polos expansíveis com votos e lideranças.

const cfgResumo = CONFIG.MOBILIZACAO.ESTRUTURA;
const cfgDados = CONFIG.MOBILIZACAO.CUIABA;
const cfgPersp = CONFIG.MOBILIZACAO.PERSPECTIVA;
let el = {};
let perspectivaRegistros = [];
let modalApoiador = null;

const ICONE_PERSPECTIVA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M3 6h18M3 12h18M3 18h18M9 6v12M15 6v12"/>' +
  "</svg>";

const ICONE_ORIGEM_LOCAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"/>' +
  '<circle cx="12" cy="11" r="2.5"/>' +
  "</svg>";

const ICONE_ORIGEM_SEGMENTO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
  '<circle cx="9" cy="7" r="4"/>' +
  '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' +
  "</svg>";

function mostrarStatus(msg, tipo) {
  statusPainel(el.status, msg, tipo);
}

function classeRegional(regional) {
  const meta = cfgDados.REGIONAL_META || {};
  if (meta[regional]?.cls) return meta[regional].cls;
  return "neutro";
}

function rotuloRegional(regional, contexto) {
  const meta = cfgDados.REGIONAL_META || {};
  const item = meta[regional];
  if (contexto === "tabela" && item?.rotuloTabela) return item.rotuloTabela;
  if (item?.rotulo) return item.rotulo;
  return String(regional).toLowerCase();
}

function htmlMetaRegionalSemVotos(metricas) {
  return metricas.qtdLiderancas + " lideranças";
}

function htmlLiderancaClicavel(l) {
  return (
    '<button type="button" class="mob-estr-lider-btn" data-lideranca="' +
    MobComum.escapeHtml(l.nome) +
    '">' +
    MobComum.escapeHtml(l.nome) +
    "</button> (" +
    MobComum.fmt.format(l.votos) +
    ")"
  );
}

function htmlCelulaTabelaResumo(valor) {
  return '<td class="mob-org-resumo-tabela-num">' + MobComum.fmt.format(valor || 0) + "</td>";
}

function htmlCelulaTabelaVotos(valor, destaque) {
  let cls = "mob-estr-regiao-votos-badge";
  if (destaque) {
    cls += " mob-org-resumo-voto-badge--total";
    if (!valor) cls += " mob-org-resumo-voto-badge--zero";
  }
  return (
    '<td class="mob-org-resumo-tabela-num mob-org-resumo-tabela-votos">' +
    '<span class="' +
    cls +
    '">' +
    MobComum.fmt.format(valor || 0) +
    "</span></td>"
  );
}

function htmlBadgeOrigemVoto(tipo) {
  if (tipo === "localidade") {
    return (
      '<span class="mob-org-resumo-origem-badge mob-org-resumo-origem-badge--localidade" title="localidade" aria-label="origem do voto localidade">' +
      ICONE_ORIGEM_LOCAL +
      "localidade</span>"
    );
  }
  return (
    '<span class="mob-org-resumo-origem-badge mob-org-resumo-origem-badge--segmento" title="segmento" aria-label="origem do voto segmento">' +
    ICONE_ORIGEM_SEGMENTO +
    "segmento</span>"
  );
}

function htmlSubtituloOrigem(tipo, clsExtra) {
  const cls = "mob-org-resumo-subtitulo" + (clsExtra ? " " + clsExtra : "");
  return (
    '<div class="' +
    cls +
    '">' +
    '<span class="mob-org-resumo-subtitulo-texto">origem do voto por</span>' +
    htmlBadgeOrigemVoto(tipo) +
    "</div>"
  );
}

function htmlBlocoOrigemSegmento(segmento) {
  return (
    '<div class="mob-org-resumo-bloco-segmento">' +
    htmlSubtituloOrigem("segmento", "mob-org-resumo-subtitulo--segmento") +
    '<div class="mob-org-resumo-segmento-votos-linha">' +
    '<span class="mob-estr-regiao-votos-badge">' +
    MobComum.fmt.format(segmento.votos) +
    " votos</span></div>" +
    '<div class="mob-org-resumo-segmento-apoiadores-linha">' +
    '<span class="mob-org-resumo-segmento-apoiadores">' +
    MobComum.fmt.format(segmento.apoiadores) +
    " apoiadores</span></div></div>"
  );
}

function htmlMarcadorRegional(cls) {
  const c = cls || "neutro";
  return (
    '<span class="mob-org-resumo-tabela-marcador mob-org-resumo-tabela-marcador--' +
    MobComum.escapeHtml(c) +
    '" aria-hidden="true"></span>'
  );
}

function htmlLinhaTabelaResumo(regionalKey, resumo, clsExtra) {
  const destaqueVotos = Boolean(clsExtra && clsExtra.includes("total"));
  const isTotal = destaqueVotos;
  const rotulo = isTotal ? "total" : rotuloRegional(regionalKey, "tabela");
  const clsReg = isTotal ? "" : classeRegional(regionalKey);
  const cls = "mob-org-resumo-tabela-linha" + (clsExtra ? " " + clsExtra : "");
  const marcador = isTotal ? "" : htmlMarcadorRegional(clsReg);
  return (
    "<tr class=\"" +
    cls +
    '">' +
    '<th scope="row" class="mob-org-resumo-tabela-regiao' +
    (clsReg ? " mob-org-resumo-tabela-regiao--" + clsReg : "") +
    '">' +
    marcador +
    '<span class="mob-org-resumo-tabela-regiao-nome">' +
    MobComum.escapeHtml(rotulo) +
    "</span></th>" +
    htmlCelulaTabelaResumo(resumo.polosTotal) +
    htmlCelulaTabelaResumo(resumo.polosMob) +
    htmlCelulaTabelaResumo(resumo.locaisTotal) +
    htmlCelulaTabelaResumo(resumo.locaisMob) +
    htmlCelulaTabelaVotos(resumo.votos, destaqueVotos) +
    "</tr>"
  );
}

function htmlTabelaResumo(regionais, porRegional, registros) {
  const resumos = regionais.map((reg) =>
    MobComum.resumoRegionalEstrutura(porRegional.get(reg) || [], registros)
  );
  const total = MobComum.somarResumosRegionais(resumos);

  const linhas = regionais
    .map((reg, i) => htmlLinhaTabelaResumo(reg, resumos[i]))
    .join("");

  return (
    '<div class="mob-org-resumo-tabela-wrap">' +
    '<table class="mob-org-resumo-tabela">' +
    "<thead>" +
    "<tr>" +
    '<th rowspan="2" class="mob-org-resumo-tabela-corner"></th>' +
    '<th colspan="2" class="mob-org-resumo-tabela-grupo">polos</th>' +
    '<th colspan="2" class="mob-org-resumo-tabela-grupo">localidades</th>' +
    '<th rowspan="2" class="mob-org-resumo-tabela-metrica">votos</th>' +
    "</tr>" +
    "<tr>" +
    '<th class="mob-org-resumo-tabela-sub">total</th>' +
    '<th class="mob-org-resumo-tabela-sub">ativo</th>' +
    '<th class="mob-org-resumo-tabela-sub">total</th>' +
    '<th class="mob-org-resumo-tabela-sub">ativo</th>' +
    "</tr>" +
    "</thead>" +
    "<tbody>" +
    linhas +
    htmlLinhaTabelaResumo(null, total, "mob-org-resumo-tabela-linha--total") +
    "</tbody></table></div>"
  );
}

function htmlCardIdentificacao(regionais, porRegional, registros) {
  const segmento = MobComum.metricasOrigemSegmento(registros);
  const btnPersp = AUTH.ehAvilaMaster()
    ? '<div class="mob-org-ident-acao">' +
      '<button type="button" class="mob-estr-persp-btn mob-estr-persp-btn--externo" id="btnMobPerspectiva" aria-label="responsabilidade e perspectiva de voto" title="responsabilidade">' +
      ICONE_PERSPECTIVA +
      "</button></div>"
    : "";

  return (
    '<div class="mob-org-ident">' +
    btnPersp +
    '<div class="mob-org-resumo-raiz">' +
    '<div class="mob-org-resumo-municipio">' +
    MobComum.escapeHtml(cfgResumo.TITULO || "Cuiabá") +
    "</div>" +
    htmlSubtituloOrigem("localidade") +
    htmlTabelaResumo(regionais, porRegional, registros) +
    htmlBlocoOrigemSegmento(segmento) +
    "</div></div>"
  );
}

function montarLinhaBairro(item, registrosPolo, candidatosPolo) {
  const detalhe = MobComum.detalheLocalPerspectiva(item.nome, registrosPolo, candidatosPolo);

  const badgeVotos =
    detalhe.votos > 0
      ? '<span class="mob-estr-bairro-votos-badge">' +
        MobComum.fmt.format(detalhe.votos) +
        "</span>"
      : "";

  const lideresHtml = detalhe.lideres.length
    ? '<span class="mob-estr-bairro-lideres">' +
      detalhe.lideres.map((l, i) => (i > 0 ? ", " : "") + htmlLiderancaClicavel(l)).join("") +
      "</span>"
    : "";

  return (
    '<li class="mob-estr-bairro-item">' +
    '<span class="mob-estr-bairro-num">' +
    MobComum.escapeHtml(item.num) +
    "</span>" +
    '<div class="mob-estr-bairro-info">' +
    '<span class="mob-estr-bairro-nome">' +
    MobComum.escapeHtml(item.nome) +
    badgeVotos +
    "</span>" +
    lideresHtml +
    "</div></li>"
  );
}

function montarCardPolo(p) {
  const candidatosPolo = p.itens.map((i) => i.nome);
  const registrosPolo = MobComum.filtrarPerspectivaPolo(p, perspectivaRegistros);
  const totalVotos = MobComum.somarPerspectivaPolo(p, perspectivaRegistros);
  const badgeTitle = "soma de perspectiva-voto (coluna D)";

  const bairros = p.itens
    .map((i) => montarLinhaBairro(i, registrosPolo, candidatosPolo))
    .join("");

  const resp = p.responsavel
    ? '<p class="mob-estr-card-resp">' + MobComum.escapeHtml(p.responsavel) + "</p>"
    : "";

  const clsBadge = totalVotos > 0 ? "" : " mob-estr-card-badge--zero";

  return (
    '<article class="mob-estr-card">' +
    '<button type="button" class="mob-estr-card-head" aria-expanded="false">' +
    '<span class="mob-estr-card-badge' +
    clsBadge +
    '" title="' +
    MobComum.escapeHtml(badgeTitle) +
    '">' +
    MobComum.fmt.format(totalVotos) +
    "</span>" +
    '<span class="mob-estr-card-titulo">' +
    MobComum.escapeHtml(p.polo) +
    "</span>" +
    '<span class="mob-estr-card-qtd">' +
    p.itens.length +
    " locais</span>" +
    '<span class="mob-estr-card-chevron" aria-hidden="true"></span>' +
    "</button>" +
    '<div class="mob-estr-card-body">' +
    '<ol class="mob-estr-card-bairros">' +
    bairros +
    "</ol>" +
    resp +
    "</div></article>"
  );
}

function fecharRegionais(exceto) {
  el.chart.querySelectorAll(".mob-estr-regiao").forEach((sec) => {
    if (exceto && sec === exceto) return;
    sec.classList.remove("mob-estr-regiao--open");
    const head = sec.querySelector(".mob-estr-regiao-head");
    if (head) head.setAttribute("aria-expanded", "false");
  });
}

function vincularApoiadores() {
  el.chart.querySelectorAll(".mob-estr-lider-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalApoiador(btn.dataset.lideranca || "");
    });
  });
}

async function abrirModalApoiador(nome) {
  if (!modalApoiador || !nome) return;

  el.modalTitulo.textContent = nome;
  el.modalCorpo.innerHTML =
    '<p class="text-secondary small mb-0">carregando dados do apoiador…</p>';
  modalApoiador.show();

  try {
    await ApoiadoresLookup.carregar();
    const contexto = ApoiadoresLookup.contextoMobilizacaoEstrutura();
    const registros = ApoiadoresLookup.buscarPorLideranca(nome, contexto);
    if (!registros.length) {
      el.modalTitulo.textContent = nome;
      el.modalCorpo.innerHTML =
        '<p class="text-secondary small mb-0">nenhum registro em Cuiabá / baixada cuiabana na planilha de apoiadores para <strong>' +
        MobComum.escapeHtml(nome) +
        "</strong>.</p>";
      return;
    }
    el.modalTitulo.textContent = ApoiadoresLookup.tituloAcessivel(registros, nome);
    const totalVotos = MobComum.somarVotosLideranca(nome, perspectivaRegistros);
    el.modalCorpo.innerHTML = ApoiadoresLookup.htmlDetalhes(registros, { totalVotos });
  } catch (err) {
    el.modalCorpo.innerHTML =
      '<p class="text-danger small mb-0">' +
      MobComum.escapeHtml(err.message || "erro ao carregar apoiador.") +
      "</p>";
  }
}

function vincularExpansao() {
  el.chart.querySelectorAll(".mob-estr-regiao-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".mob-estr-regiao");
      const estavaAberta = sec.classList.contains("mob-estr-regiao--open");
      fecharRegionais();
      if (!estavaAberta) {
        sec.classList.add("mob-estr-regiao--open");
        btn.setAttribute("aria-expanded", "true");
      }
      notificarAlturaFrame();
    });
  });

  el.chart.querySelectorAll(".mob-estr-card-head").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".mob-estr-card");
      const aberto = card.classList.toggle("mob-estr-card--open");
      btn.setAttribute("aria-expanded", aberto ? "true" : "false");
      notificarAlturaFrame();
    });
  });
}

function renderizarOrganograma(dados, perspectiva) {
  perspectivaRegistros = perspectiva || [];

  if (!dados.length) {
    el.chart.innerHTML =
      '<p class="text-secondary small mb-0">nenhum dado na planilha de estrutura.</p>';
    notificarAlturaFrame();
    return;
  }

  const porRegional = new Map();
  dados.forEach((block) => {
    if (!porRegional.has(block.regional)) {
      porRegional.set(block.regional, []);
    }
    porRegional.get(block.regional).push(block);
  });

  const ordem = (cfgDados.REGIONAIS || []).filter((r) => porRegional.has(r));
  const extras = [...porRegional.keys()].filter((r) => !ordem.includes(r));
  const regionais = ordem.concat(extras);

  let html = htmlCardIdentificacao(regionais, porRegional, perspectivaRegistros);
  html += '<div class="mob-org-resumo-tronco" aria-hidden="true"></div>';
  html += '<div class="mob-org-resumo-regionais">';

  regionais.forEach((reg) => {
    const polos = porRegional.get(reg) || [];
    const cls = classeRegional(reg);
    const cards = polos.map(montarCardPolo).join("");
    const resumo = MobComum.resumoRegionalEstrutura(polos, perspectivaRegistros);
    const metricasReg = MobComum.metricasPerspectivaRegional(polos, perspectivaRegistros);

    html +=
      '<section class="mob-org-resumo-regiao mob-estr-regiao mob-org-resumo-regiao--' +
      cls +
      '">' +
      '<button type="button" class="mob-org-resumo-regiao-head mob-estr-regiao-head" aria-expanded="false">' +
      '<div class="mob-estr-regiao-head-linha1">' +
      "<h2>" +
      MobComum.escapeHtml(rotuloRegional(reg)) +
      "</h2>" +
      '<span class="mob-estr-regiao-votos-badge">' +
      MobComum.fmt.format(metricasReg.totalVotos) +
      " votos</span></div>" +
      '<span class="mob-org-resumo-regiao-qtd">' +
      resumo.polosTotal +
      " polos · " +
      resumo.locaisTotal +
      " locais · " +
      htmlMetaRegionalSemVotos(metricasReg) +
      "</span>" +
      '<span class="mob-estr-card-chevron mob-estr-regiao-chevron" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="mob-estr-regiao-body">' +
      '<div class="mob-org-resumo-polos">' +
      cards +
      "</div></div></section>";
  });

  html += "</div>";
  el.chart.innerHTML = html;
  vincularExpansao();
  vincularApoiadores();
  document.getElementById("btnMobPerspectiva")?.addEventListener("click", () => {
    navegarParaPagina("mobilizacao-perspectiva");
  });
  notificarAlturaFrame();
}

async function carregar() {
  if (!MobComum.configValida()) {
    mostrarStatus("configure WEB_APP_URL em js/config.js e publique o Apps Script.", "erro");
    return;
  }

  mostrarStatus("carregando estrutura…", "carregando");
  try {
    const [dados, perspectiva] = await Promise.all([
      MobComum.parseCuiabaDados(cfgDados),
      MobComum.parsePerspectivaLista(cfgPersp),
      ApoiadoresLookup.carregar().catch(() => []),
    ]);
    mostrarStatus("", null);
    renderizarOrganograma(dados, perspectiva);
  } catch (e) {
    mostrarStatus(e.message || "erro ao carregar estrutura.", "erro");
  }
}

function navegarParaPagina(pagina) {
  if (!pagina) return;
  if (window.parent !== window) {
    try {
      if (typeof window.parent.carregarPagina === "function") {
        window.parent.carregarPagina(pagina);
        return;
      }
    } catch (e) {
      /* acesso ao parent bloqueado */
    }
    window.parent.postMessage({ tipo: "eleicao-nav", pagina: pagina }, "*");
    return;
  }
  window.location.href = "../principal.html?p=" + encodeURIComponent(pagina);
}

function init() {
  AUTH.exigir();
  el = {
    status: document.getElementById("status"),
    chart: document.getElementById("mobOrgChart"),
    modalEl: document.getElementById("modalApoiador"),
    modalTitulo: document.getElementById("modalApoiadorTitulo"),
    modalCorpo: document.getElementById("modalApoiadorCorpo"),
  };
  if (el.modalEl && typeof bootstrap !== "undefined") {
    modalApoiador = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  }
  PageLoader.init("pageLoader");
  carregar();
}

window.atualizarPagina = carregar;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
