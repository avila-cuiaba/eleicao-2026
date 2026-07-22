// Mobilização — estrutura: regionais → polos expansíveis com votos e lideranças.

const cfgResumo = CONFIG.MOBILIZACAO.ESTRUTURA;
const cfgDados = CONFIG.MOBILIZACAO.CUIABA;
const cfgPersp = CONFIG.MOBILIZACAO.PERSPECTIVA;
let el = {};
let perspectivaRegistros = [];
let dadosEstrutura = [];
let organogramaContexto = null;
let modalApoiador = null;
let modalSegmento = null;

const ICONE_PERSPECTIVA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
  '<path d="M3 6h18M3 12h18M3 18h18M9 6v12M15 6v12"/>' +
  "</svg>";

const ICONE_IMPRIMIR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>' +
  '<path d="M6 14h12v8H6z"/>' +
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

function htmlLiderancaTexto(l) {
  return MobComum.escapeHtml(l.nome) + " (" + MobComum.fmt.format(l.votos) + ")";
}

function locaisComRegistroPolo(p, registrosPolo) {
  const candidatosPolo = p.itens.map((i) => i.nome);
  return p.itens.filter((item) => {
    const detalhe = MobComum.detalheLocalPerspectiva(item.nome, registrosPolo, candidatosPolo);
    return detalhe.qtdRegistros > 0;
  });
}

function poloTemRegistro(p) {
  const registrosPolo = MobComum.filtrarPerspectivaPolo(p, perspectivaRegistros);
  return locaisComRegistroPolo(p, registrosPolo).length > 0;
}

function filtrarPolosComRegistro(polos) {
  return (polos || []).filter(poloTemRegistro);
}

function htmlBotoesIdent() {
  let html =
    '<div class="mob-org-ident-acao">' +
    '<button type="button" class="mob-estr-persp-btn mob-estr-persp-btn--imprimir" id="btnMobImprimir" aria-label="imprimir relatório" title="imprimir relatório">' +
    ICONE_IMPRIMIR +
    "</button>";
  if (AUTH.ehAvilaMaster()) {
    html +=
      '<button type="button" class="mob-estr-persp-btn mob-estr-persp-btn--externo" id="btnMobPerspectiva" aria-label="responsabilidade e perspectiva de voto" title="responsabilidade">' +
      ICONE_PERSPECTIVA +
      "</button>";
  }
  html += "</div>";
  return html;
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
    " " +
    (segmento.apoiadores > 0
      ? '<button type="button" class="mob-org-segmento-apoiadores-link" data-acao="segmento-apoiadores">apoiadores</button>'
      : "apoiadores") +
    "</span></div></div>"
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

  return (
    '<div class="mob-org-ident">' +
    htmlBotoesIdent() +
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
  const itensComRegistro = locaisComRegistroPolo(p, registrosPolo);

  if (!itensComRegistro.length) return "";

  const bairros = itensComRegistro
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
    itensComRegistro.length +
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

function htmlLinhaBairroImpressao(item, registrosPolo, candidatosPolo) {
  const detalhe = MobComum.detalheLocalPerspectiva(item.nome, registrosPolo, candidatosPolo);
  if (!detalhe.qtdRegistros) return "";

  const votos =
    detalhe.votos > 0
      ? ' <span class="mob-rel-votos">(' + MobComum.fmt.format(detalhe.votos) + " votos)</span>"
      : "";
  const lideres = detalhe.lideres.length
    ? " — " + detalhe.lideres.map(htmlLiderancaTexto).join(", ")
    : "";

  return (
    "<li><strong>" +
    MobComum.escapeHtml(item.nome) +
    "</strong>" +
    votos +
    lideres +
    "</li>"
  );
}

function htmlPoloImpressao(p) {
  const candidatosPolo = p.itens.map((i) => i.nome);
  const registrosPolo = MobComum.filtrarPerspectivaPolo(p, perspectivaRegistros);
  const itensComRegistro = locaisComRegistroPolo(p, registrosPolo);
  if (!itensComRegistro.length) return "";

  const linhas = itensComRegistro
    .map((i) => htmlLinhaBairroImpressao(i, registrosPolo, candidatosPolo))
    .join("");
  const totalVotos = MobComum.somarPerspectivaPolo(p, perspectivaRegistros);
  const resp = p.responsavel
    ? '<p class="mob-rel-resp">responsável: ' + MobComum.escapeHtml(p.responsavel) + "</p>"
    : "";

  return (
    '<div class="mob-rel-polo">' +
    "<h3>" +
    MobComum.escapeHtml(p.polo) +
    ' <span class="mob-rel-polo-meta">(' +
    MobComum.fmt.format(totalVotos) +
    " votos · " +
    itensComRegistro.length +
    " locais)</span></h3>" +
    "<ul>" +
    linhas +
    "</ul>" +
    resp +
    "</div>"
  );
}

function htmlRegionalImpressao(reg, polos) {
  const polosComRegistro = filtrarPolosComRegistro(polos);
  if (!polosComRegistro.length) return "";

  const metricasReg = MobComum.metricasPerspectivaRegional(polosComRegistro, perspectivaRegistros);
  const corpo = polosComRegistro.map(htmlPoloImpressao).join("");

  return (
    '<section class="mob-rel-regional">' +
    "<h2>" +
    MobComum.escapeHtml(rotuloRegional(reg)) +
    ' <span class="mob-rel-regional-meta">(' +
    MobComum.fmt.format(metricasReg.totalVotos) +
    " votos)</span></h2>" +
    corpo +
    "</section>"
  );
}

function estilosRelatorioImpressao() {
  return (
    "<style>" +
    "body{font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;margin:1.2rem;font-size:11pt;line-height:1.4;}" +
    "h1{font-size:16pt;margin:0 0 0.35rem;text-align:center;}" +
    ".mob-rel-gerado{font-size:9pt;color:#64748b;text-align:center;margin:0 0 1rem;}" +
    "table{border-collapse:collapse;width:100%;margin:0.5rem 0 1rem;font-size:9pt;}" +
    "th,td{border:1px solid #cbd5e1;padding:0.3rem 0.4rem;text-align:center;}" +
    "th{background:#f1f5f9;font-weight:600;}" +
    "th.mob-rel-regiao,td.mob-rel-regiao{text-align:left;}" +
    ".mob-rel-total th,.mob-rel-total td{font-weight:700;background:#f8fafc;}" +
    ".mob-rel-segmento{margin:1rem 0 1.25rem;padding:0.65rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;}" +
    ".mob-rel-segmento h2{font-size:11pt;margin:0 0 0.35rem;}" +
    ".mob-rel-segmento-resumo{margin:0 0 0.5rem;font-size:9.5pt;}" +
    "th.mob-rel-texto,td.mob-rel-texto{text-align:left;}" +
    "td.mob-rel-num{text-align:right;font-variant-numeric:tabular-nums;}" +
    ".mob-rel-segmento-apoiador table th.mob-rel-num,.mob-rel-segmento-apoiador table td.mob-rel-num{text-align:center;}" +
    ".mob-rel-segmento-apoiador table{table-layout:fixed;width:100%;margin-bottom:0;}" +
    ".mob-rel-segmento-apoiador table .mob-rel-col-segmento{width:70%;}" +
    ".mob-rel-segmento-apoiador table .mob-rel-col-votos{width:30%;}" +
    ".mob-rel-segmento-apoiador table th.mob-rel-texto,.mob-rel-segmento-apoiador table td.mob-rel-texto{width:70%;}" +
    ".mob-rel-segmento-apoiador table th.mob-rel-num,.mob-rel-segmento-apoiador table td.mob-rel-num{width:30%;}" +
    ".mob-rel-segmento-vazio{margin:0;font-size:9pt;color:#64748b;}" +
    ".mob-rel-segmento-apoiador{margin:0.65rem 0 0.85rem;page-break-inside:avoid;}" +
    ".mob-rel-segmento-apoiador h3{font-size:10pt;margin:0 0 0.25rem;text-align:left;}" +
    ".mob-rel-segmento-apoiador-total{font-size:9pt;font-weight:600;color:#4338ca;}" +
    ".mob-rel-regional{margin-top:1rem;page-break-inside:avoid;}" +
    ".mob-rel-regional h2{font-size:12pt;margin:0 0 0.5rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.25rem;}" +
    ".mob-rel-regional-meta{font-size:10pt;font-weight:600;color:#4338ca;}" +
    ".mob-rel-polo{margin:0.5rem 0 0.75rem 0.5rem;}" +
    ".mob-rel-polo h3{font-size:10.5pt;margin:0 0 0.25rem;}" +
    ".mob-rel-polo-meta{font-size:9pt;font-weight:600;color:#64748b;}" +
    ".mob-rel-polo ul{margin:0;padding-left:1.1rem;}" +
    ".mob-rel-polo li{margin:0.15rem 0;}" +
    ".mob-rel-votos{color:#4338ca;font-weight:600;}" +
    ".mob-rel-resp{margin:0.25rem 0 0;font-size:9pt;color:#64748b;}" +
    "@media print{body{margin:0.8cm;} .mob-rel-regional{page-break-inside:avoid;}}" +
    "</style>"
  );
}

function htmlTabelaResumoImpressao(regionais, porRegional, registros) {
  const resumos = regionais.map((reg) =>
    MobComum.resumoRegionalEstrutura(porRegional.get(reg) || [], registros)
  );
  const total = MobComum.somarResumosRegionais(resumos);

  const linhas = regionais
    .map((reg, i) => {
      const r = resumos[i];
      const rotulo = rotuloRegional(reg, "tabela");
      return (
        "<tr>" +
        '<th scope="row" class="mob-rel-regiao">' +
        MobComum.escapeHtml(rotulo) +
        "</th>" +
        "<td>" +
        MobComum.fmt.format(r.polosTotal) +
        "</td><td>" +
        MobComum.fmt.format(r.polosMob) +
        "</td><td>" +
        MobComum.fmt.format(r.locaisTotal) +
        "</td><td>" +
        MobComum.fmt.format(r.locaisMob) +
        "</td><td>" +
        MobComum.fmt.format(r.votos) +
        "</td></tr>"
      );
    })
    .join("");

  return (
    "<table>" +
    "<thead><tr>" +
    '<th rowspan="2" class="mob-rel-regiao"></th>' +
    '<th colspan="2">polos</th><th colspan="2">localidades</th><th rowspan="2">votos</th>' +
    "</tr><tr>" +
    "<th>total</th><th>ativo</th><th>total</th><th>ativo</th>" +
    "</tr></thead><tbody>" +
    linhas +
    '<tr class="mob-rel-total"><th scope="row" class="mob-rel-regiao">total</th>' +
    "<td>" +
    MobComum.fmt.format(total.polosTotal) +
    "</td><td>" +
    MobComum.fmt.format(total.polosMob) +
    "</td><td>" +
    MobComum.fmt.format(total.locaisTotal) +
    "</td><td>" +
    MobComum.fmt.format(total.locaisMob) +
    "</td><td>" +
    MobComum.fmt.format(total.votos) +
    "</td></tr></tbody></table>"
  );
}

function htmlLinhasSegmentoGrupo(segmentos, clsSegmento, clsVotos) {
  return segmentos
    .map(
      (s) =>
        "<tr>" +
        '<td class="' +
        clsSegmento +
        '">' +
        MobComum.escapeHtml(s.segmento) +
        "</td>" +
        '<td class="' +
        clsVotos +
        '">' +
        MobComum.fmt.format(s.votos || 0) +
        "</td></tr>"
    )
    .join("");
}

function htmlTabelaSegmentoImpressao(registros) {
  const grupos = MobComum.agruparOrigemSegmentoPorApoiador(registros);
  if (!grupos.length) {
    return '<p class="mob-rel-segmento-vazio">nenhum registro com origem segmento.</p>';
  }

  return grupos
    .map((g) => {
      const linhas = htmlLinhasSegmentoGrupo(g.segmentos, "mob-rel-texto", "mob-rel-num");
      return (
        '<div class="mob-rel-segmento-apoiador">' +
        "<h3>" +
        MobComum.escapeHtml(g.apoiador) +
        ' <span class="mob-rel-segmento-apoiador-total">(' +
        MobComum.fmt.format(g.totalVotos) +
        " votos)</span></h3>" +
        "<table>" +
        "<colgroup><col class=\"mob-rel-col-segmento\" /><col class=\"mob-rel-col-votos\" /></colgroup>" +
        "<thead><tr>" +
        '<th class="mob-rel-texto">segmento</th>' +
        '<th class="mob-rel-num">votos</th>' +
        "</tr></thead><tbody>" +
        linhas +
        "</tbody></table></div>"
      );
    })
    .join("");
}

function htmlBlocoSegmentoImpressao(registros) {
  const segmento = MobComum.metricasOrigemSegmento(registros);
  return (
    '<div class="mob-rel-segmento">' +
    "<h2>origem do voto por segmento</h2>" +
    '<p class="mob-rel-segmento-resumo"><strong>' +
    MobComum.fmt.format(segmento.votos) +
    " votos</strong> · " +
    MobComum.fmt.format(segmento.apoiadores) +
    " apoiadores</p>" +
    htmlTabelaSegmentoImpressao(registros) +
    "</div>"
  );
}

function montarHtmlRelatorio() {
  if (!organogramaContexto) return "";

  const { regionais, porRegional } = organogramaContexto;
  const registros = perspectivaRegistros;
  const titulo = cfgResumo.TITULO || "Cuiabá / Várzea Grande";
  const gerado = new Date().toLocaleString("pt-BR");
  const detalhes = regionais.map((reg) => htmlRegionalImpressao(reg, porRegional.get(reg) || [])).join("");

  return (
    "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\" />" +
    "<title>mobilização — " +
    MobComum.escapeHtml(titulo) +
    "</title>" +
    estilosRelatorioImpressao() +
    "</head><body>" +
    "<h1>" +
    MobComum.escapeHtml(titulo) +
    "</h1>" +
    '<p class="mob-rel-gerado">relatório gerado em ' +
    MobComum.escapeHtml(gerado) +
    "</p>" +
    "<h2>origem do voto por localidade</h2>" +
    htmlTabelaResumoImpressao(regionais, porRegional, registros) +
    htmlBlocoSegmentoImpressao(registros) +
    "<h2>estrutura por regional</h2>" +
    (detalhes || "<p>nenhum local com registro.</p>") +
    (window.Relatorio && typeof Relatorio.scriptImpressaoRelatorio === "function"
      ? Relatorio.scriptImpressaoRelatorio()
      : '<script>(function(){function fechar(){try{window.close();}catch(e){}}window.addEventListener("afterprint",fechar);window.addEventListener("load",function(){window.focus();window.print();});})();</script>') +
    "</body></html>"
  );
}

function imprimirRelatorio() {
  const html = montarHtmlRelatorioPagina();
  if (!html) {
    mostrarStatus("nenhum dado para imprimir.", "erro");
    return;
  }

  try {
    if (window.parent && window.parent !== window && typeof window.parent.abrirRelatorioHtml === "function") {
      window.parent.abrirRelatorioHtml(html);
      return;
    }
  } catch (e) {
    /* origem cruzada */
  }

  const janela = window.open("", "_blank");
  if (!janela) {
    mostrarStatus("permita pop-ups para gerar o PDF.", "erro");
    return;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

function montarHtmlRelatorioPagina() {
  if (!organogramaContexto || !dadosEstrutura.length) return "";
  return montarHtmlRelatorio();
}

function fecharRegionais(exceto) {
  el.chart.querySelectorAll(".mob-estr-regiao").forEach((sec) => {
    if (exceto && sec === exceto) return;
    sec.classList.remove("mob-estr-regiao--open");
    const head = sec.querySelector(".mob-estr-regiao-head");
    if (head) head.setAttribute("aria-expanded", "false");
  });
}

function htmlTabelaSegmentoApoiadores(registros) {
  const grupos = MobComum.agruparOrigemSegmentoPorApoiador(registros);
  if (!grupos.length) {
    return '<p class="text-secondary small mb-0">nenhum registro com origem segmento.</p>';
  }

  return (
    '<div class="mob-org-segmento-modal-scroll">' +
    grupos
      .map((g) => {
        const linhas = htmlLinhasSegmentoGrupo(
          g.segmentos,
          "",
          "text-end mob-org-segmento-modal-votos"
        );
        return (
          '<div class="mob-segmento-apoiador-grupo">' +
          '<div class="mob-segmento-apoiador-cabecalho">' +
          "<strong>" +
          MobComum.escapeHtml(g.apoiador) +
          "</strong>" +
          '<span class="mob-segmento-apoiador-total">' +
          MobComum.fmt.format(g.totalVotos) +
          " votos</span></div>" +
          '<table class="table table-sm table-hover mb-0 mob-org-segmento-modal-tabela">' +
          '<thead class="table-light"><tr>' +
          "<th scope=\"col\">segmento</th>" +
          '<th scope="col" class="text-end">votos</th>' +
          "</tr></thead><tbody>" +
          linhas +
          "</tbody></table></div>"
        );
      })
      .join("") +
    "</div>"
  );
}

function abrirModalSegmentoApoiadores() {
  if (!modalSegmento) return;

  el.modalSegmentoCorpo.innerHTML = htmlTabelaSegmentoApoiadores(perspectivaRegistros);
  modalSegmento.show();
}

function vincularApoiadores() {
  el.chart.querySelectorAll(".mob-estr-lider-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalApoiador(btn.dataset.lideranca || "");
    });
  });
}

function vincularSegmentoApoiadores() {
  el.chart.querySelectorAll('[data-acao="segmento-apoiadores"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalSegmentoApoiadores();
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
    const metricasVotos = MobComum.metricasVotosLideranca(nome, perspectivaRegistros);
    el.modalCorpo.innerHTML = ApoiadoresLookup.htmlDetalhes(registros, { votos: metricasVotos });
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
  dadosEstrutura = dados;

  if (!dados.length) {
    organogramaContexto = null;
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
  organogramaContexto = { regionais, porRegional };

  let html = htmlCardIdentificacao(regionais, porRegional, perspectivaRegistros);
  html += '<div class="mob-org-resumo-tronco" aria-hidden="true"></div>';
  html += '<div class="mob-org-resumo-regionais">';

  regionais.forEach((reg) => {
    const polos = filtrarPolosComRegistro(porRegional.get(reg) || []);
    if (!polos.length) return;

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
  vincularSegmentoApoiadores();
  document.getElementById("btnMobImprimir")?.addEventListener("click", imprimirRelatorio);
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
    modalSegmentoEl: document.getElementById("modalSegmentoApoiadores"),
    modalSegmentoCorpo: document.getElementById("modalSegmentoApoiadoresCorpo"),
  };
  if (el.modalEl && typeof bootstrap !== "undefined") {
    modalApoiador = bootstrap.Modal.getOrCreateInstance(el.modalEl);
  }
  if (el.modalSegmentoEl && typeof bootstrap !== "undefined") {
    modalSegmento = bootstrap.Modal.getOrCreateInstance(el.modalSegmentoEl);
  }
  PageLoader.init("pageLoader");
  carregar();
}

window.atualizarPagina = carregar;
window.montarHtmlRelatorioPagina = montarHtmlRelatorioPagina;
window.gerarRelatorioPagina = imprimirRelatorio;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
