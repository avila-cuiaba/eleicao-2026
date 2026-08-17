// Popovers de linha em tabelas (Bootstrap 5).
const PopoverTabela = (function () {
  const POPOVER_CLASS = "orcamento-geral-popover-bs";

  const ICONE_IMPRIMIR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>' +
    '<path d="M6 14h12v8H6z"/>' +
    "</svg>";

  let imprimirPopoverVinculado = false;
  const popoverPrintPayloads = new Map();

  function htmlSemBotaoImprimir(html) {
    const doc = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html");
    doc.querySelectorAll(".popover-tabela-btn-imprimir").forEach((el) => el.remove());
    return doc.body.firstChild?.innerHTML ?? html;
  }

  function registrarPayloadImpressao(printKey, html, titulo) {
    const key = String(printKey ?? "").trim();
    if (!key) return;
    popoverPrintPayloads.set(key, {
      html: htmlSemBotaoImprimir(html),
      titulo: String(titulo ?? "").trim(),
    });
  }

  function limparPayloadsImpressao() {
    popoverPrintPayloads.clear();
  }

  function escapeAttr(txt) {
    return String(txt ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function estilosPopoverImpressao() {
    return (
      ".popover-tabela-impressao{font-size:10pt;line-height:1.4;color:#1e293b;}" +
      ".apoiadores-popover-cabecalho{margin-bottom:0.45rem;}" +
      ".popover-tabela-impressao .apoiadores-popover-cabecalho{display:none!important;}" +
      ".apoiadores-popover-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;}" +
      ".apoiadores-popover-topo-acoes{display:flex;align-items:center;gap:0.35rem;flex-shrink:0;}" +
      ".apoiadores-popover-lideranca{flex:1;min-width:0;font-weight:600;font-size:11pt;line-height:1.35;color:#1e293b;}" +
      ".apoiadores-popover-municipio-muted{margin-top:0.15rem;font-size:9pt;line-height:1.3;color:#64748b;}" +
      ".apoiadores-popover-divisor{margin:0.35rem 0 0;border:0;border-top:1px solid rgba(148,163,184,0.35);}" +
      ".apoiadores-popover-tabela{display:block;}" +
      ".apoiadores-popover-linha{display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem;padding:0.12rem 0;}" +
      ".apoiadores-popover-linha--fin{display:flex!important;align-items:baseline;justify-content:space-between;gap:0.75rem;font-size:9pt;}" +
      ".apoiadores-popover-rotulo{color:#64748b;text-transform:lowercase;}" +
      ".apoiadores-popover-rotulo--com-marcador{display:inline-flex;align-items:center;gap:0.3rem;}" +
      ".apoiadores-popover-rotulo--case{text-transform:none;}" +
      ".apoiadores-popover-fin{font-weight:600;font-variant-numeric:tabular-nums;color:#1e293b;text-align:right;flex:1 1 auto;min-width:0;}" +
      ".apoiadores-popover-parceria-nome{font-weight:600;text-align:right;word-break:break-word;}" +
      ".apoiadores-fin-badge,.apoiadores-popover-fin-badge{display:inline-block;padding:0.1rem 0.4rem;border-radius:999px;font-size:8pt;font-weight:600;line-height:1.25;color:#0f766e;background:rgba(15,118,110,0.12);}" +
      ".orcamento-geral-popover-marcador{display:inline-block;width:0.45rem;height:0.45rem;border-radius:50%;flex-shrink:0;vertical-align:middle;}" +
      ".popover-marcador--orc-pessoal{background:#16a34a;}" +
      ".popover-marcador--orc-combustivel{background:#ea580c;}" +
      ".popover-marcador--orc-diversos{background:#7c3aed;}" +
      ".popover-marcador--orc-diad{background:#dc2626;}" +
      ".apoiadores-popover-secao{margin-top:0.35rem;}" +
      ".apoiadores-popover-secao-titulo{font-size:8.5pt;font-weight:600;color:#475569;text-transform:lowercase;margin-bottom:0.2rem;}" +
      ".apoiadores-popover-linha:not(.apoiadores-popover-linha--fin){display:grid!important;grid-template-columns:minmax(4rem,1.2fr) minmax(2rem,0.8fr) minmax(4rem,1fr);gap:0.35rem;align-items:baseline;}" +
      ".apoiadores-popover-qtd{text-align:center;font-variant-numeric:tabular-nums;color:#334155;}" +
      ".apoiadores-popover-observacao{margin-top:0.35rem;font-size:9pt;line-height:1.4;color:#475569;white-space:pre-wrap;word-break:break-word;}" +
      ".popover-tabela-btn-imprimir{display:none!important;}"
    );
  }

  function imprimirConteudoPopover(conteudoHtml, titulo) {
    const htmlConteudo = String(conteudoHtml ?? "").trim();
    if (!htmlConteudo) return false;

    const textoCabecalho = String(titulo ?? "").trim() || "detalhes";
    const Rel = window.Relatorio;
    const conteudo =
      '<div class="popover-tabela-impressao apoiadores-popover-corpo orcamento-geral-popover-corpo">' +
      htmlConteudo +
      "</div>";

    if (Rel?.htmlDocumento && Rel?.scriptImpressaoRelatorio) {
      const html = Rel.htmlDocumento(
        {
          titulo: textoCabecalho,
          subtitulo: "",
          estilosExtras: estilosPopoverImpressao(),
        },
        conteudo + Rel.scriptImpressaoRelatorio()
      );

      if (Rel.abrirJanela?.(html)) return true;
      if (Rel.abrirJanelaRelatorio?.(html)) return true;
    }

    const janela = window.open("about:blank", "_blank");
    if (!janela) return false;

    janela.document.open();
    janela.document.write(
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\" />" +
      "<title>" +
      escapeAttr(textoCabecalho) +
      "</title>" +
      "<style>body{font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0.8cm;color:#1e293b;}" +
      estilosPopoverImpressao() +
      "</style></head><body>" +
      "<h1 style=\"font-size:12pt;margin:0 0 0.6rem;color:#1f4e8c;\">" +
      escapeAttr(textoCabecalho) +
      "</h1>" +
      conteudo +
      "<script>window.addEventListener(\"load\",function(){window.focus();window.print();});</script>" +
      "</body></html>"
    );
    janela.document.close();
    return true;
  }

  function vincularImprimirPopover() {
    if (imprimirPopoverVinculado) return;
    imprimirPopoverVinculado = true;

    function executarImpressao(btn) {
      const printKey = btn.getAttribute("data-print-key") || "";
      let conteudoHtml = "";
      let titulo = btn.getAttribute("data-titulo-impressao") || "";

      if (printKey && popoverPrintPayloads.has(printKey)) {
        const payload = popoverPrintPayloads.get(printKey);
        conteudoHtml = payload.html;
        if (payload.titulo) titulo = payload.titulo;
      } else {
        const popover = btn.closest(".popover");
        const corpo = popover?.querySelector(".popover-body");
        if (!corpo) return;
        const clone = corpo.cloneNode(true);
        clone.querySelectorAll(".popover-tabela-btn-imprimir").forEach((el) => el.remove());
        conteudoHtml = clone.innerHTML;
      }

      if (!imprimirConteudoPopover(conteudoHtml, titulo)) {
        if (window.Relatorio?.mostrarErro) {
          window.Relatorio.mostrarErro("permita pop-ups para imprimir.");
        }
      }
    }

    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".popover-tabela-btn-imprimir");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      executarImpressao(btn);
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".popover-tabela-btn-imprimir");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const btn = e.target.closest(".popover-tabela-btn-imprimir");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      executarImpressao(btn);
    });
  }

  function htmlBotaoImprimir(titulo, printKey) {
    const t = String(titulo ?? "").trim();
    const tituloAttr = t ? ` data-titulo-impressao="${escapeAttr(t)}"` : "";
    const key = String(printKey ?? "").trim();
    const keyAttr = key ? ` data-print-key="${escapeAttr(key)}"` : "";
    return (
      `<button type="button" class="popover-tabela-btn-imprimir"${tituloAttr}${keyAttr} aria-label="imprimir" title="imprimir">` +
      ICONE_IMPRIMIR +
      "</button>"
    );
  }

  vincularImprimirPopover();

  function trigger() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ? "hover focus"
      : "click";
  }

  function item(rotulo, valor, marcadorClass, semTracoVazio) {
    const vazio = semTracoVazio ? "" : "—";
    const exibicao =
      valor !== undefined && valor !== null && String(valor).trim() !== "" ? valor : vazio;
    const marcador = marcadorClass
      ? `<span class="orcamento-geral-popover-marcador ${marcadorClass}" aria-hidden="true"></span>`
      : "";
    const rotuloCls = marcadorClass ? " orcamento-geral-popover-rotulo--com-marcador" : "";
    return `<div class="orcamento-geral-popover-item">
      <span class="orcamento-geral-popover-rotulo${rotuloCls}">${marcador}${rotulo}</span>
      <span class="orcamento-geral-popover-valor">${exibicao}</span>
    </div>`;
  }

  function corpo(titulo, itensHtml) {
    const t = titulo && String(titulo).trim() ? titulo : "—";
    return `<div class="orcamento-geral-popover-corpo">
      <div class="orcamento-geral-popover-titulo">${t}</div>
      ${itensHtml}
    </div>`;
  }

  function criar() {
    let popovers = [];
    let handler = null;

    function fecharOutros(trAtivo) {
      popovers.forEach((p) => {
        if (p._element !== trAtivo) p.hide();
      });
    }

    function destruir() {
      if (handler) {
        document.removeEventListener("click", handler, true);
        handler = null;
      }
      popovers.forEach((p) => p.dispose());
      popovers = [];
      limparPayloadsImpressao();
    }

    function inicializar(opts) {
      const {
        corpo,
        seletorLinha,
        linhas,
        htmlConteudo,
        trigger: triggerOpt,
        fecharAoClicarFora = true,
        tituloImpressao,
        printKey,
      } = opts;

      destruir();
      if (!corpo || typeof bootstrap === "undefined") return;

      const trigg = triggerOpt || trigger();
      const linhasEl = corpo.querySelectorAll(seletorLinha);

      linhasEl.forEach((tr, idx) => {
        const r = linhas[idx];
        if (!r) return;

        const key =
          (typeof printKey === "function" ? printKey(r, idx) : printKey) ||
          (r._linha != null ? `linha-${r._linha}` : `idx-${idx}`);
        const tituloPrint =
          typeof tituloImpressao === "function" ? tituloImpressao(r) : "";
        if (r && typeof r === "object") r._popoverPrintKey = key;
        const contentHtml = htmlConteudo(r);
        registrarPayloadImpressao(key, contentHtml, tituloPrint);

        const pop = new bootstrap.Popover(tr, {
          trigger: trigg,
          html: true,
          sanitize: false,
          placement: "auto",
          container: "body",
          customClass: POPOVER_CLASS,
          content: contentHtml,
        });

        tr.addEventListener("show.bs.popover", () => fecharOutros(tr));
        popovers.push(pop);
      });

      if (fecharAoClicarFora && String(trigg).includes("click")) {
        handler = (e) => {
          const emLinha = e.target.closest(seletorLinha);
          const emPopover = e.target.closest(`.popover.${POPOVER_CLASS}`);
          if (!emLinha && !emPopover) {
            popovers.forEach((p) => p.hide());
          }
        };
        document.addEventListener("click", handler, true);
      }
    }

    return { destruir, inicializar };
  }

  return { trigger, item, corpo, criar, htmlBotaoImprimir, imprimirConteudoPopover, POPOVER_CLASS };
})();
