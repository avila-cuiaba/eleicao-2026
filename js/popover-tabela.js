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

  function documentosPopoverEventos() {
    const docs = [document];
    try {
      if (window.parent?.document && window.parent.document !== document) {
        docs.push(window.parent.document);
      }
    } catch (e) {
      /* ignorar */
    }
    return docs;
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

    documentosPopoverEventos()
      .filter((doc) => doc !== document)
      .forEach((doc) => {
        doc.addEventListener("pointerdown", (e) => {
          const btn = e.target.closest(".popover-tabela-btn-imprimir");
          if (!btn) return;
          e.preventDefault();
          e.stopPropagation();
          executarImpressao(btn);
        });
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

  const HOVER_HIDE_MS = 220;
  const HOVER_SHOW_MS = 120;

  function popperConfigPopoverTabela() {
    return {
      strategy: "fixed",
      modifiers: [
        { name: "offset", options: { offset: [0, 8] } },
        {
          name: "preventOverflow",
          options: { padding: 8, altAxis: true },
        },
        {
          name: "flip",
          options: { fallbackPlacements: ["bottom", "right", "left", "top"] },
        },
      ],
    };
  }

  function aplicarClasseShellPopover(aberto) {
    try {
      if (window.parent && window.parent !== window && window.parent.document?.body) {
        window.parent.document.body.classList.toggle("app-shell-popover-tabela-aberto", !!aberto);
        return true;
      }
    } catch (e) {
      /* origem cruzada — ignorar */
    }
    return false;
  }

  function resetarShellPopoverTabela() {
    aplicarClasseShellPopover(false);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ tipo: "eleicao-popover-tabela", aberto: false }, "*");
      }
    } catch (e) {
      /* ignorar */
    }
  }

  function vincularGatilhoPopoverLinha({ tr, alvos, pop, trigg, seletorAlvo, fecharOutros }) {
    const usaHover = String(trigg).includes("hover");
    const usaClick = String(trigg).includes("click");
    let hideTimer = null;
    let showTimer = null;
    const seletorPopover = `.popover.${POPOVER_CLASS}`;

    function cancelarHide() {
      if (!hideTimer) return;
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    function cancelarShow() {
      if (!showTimer) return;
      clearTimeout(showTimer);
      showTimer = null;
    }

    function alvoAindaAtivo() {
      return !!tr.querySelector(`${seletorAlvo}:hover`);
    }

    function destinoPermaneceAberto(destino) {
      if (!destino) return false;
      if (destino.closest?.(seletorPopover)) return true;
      if (!tr.contains(destino)) return false;
      return !!destino.closest?.(seletorAlvo);
    }

    function agendarHide() {
      cancelarHide();
      hideTimer = setTimeout(() => {
        hideTimer = null;
        pop.hide();
      }, HOVER_HIDE_MS);
    }

    function vincularPopoverAberto() {
      const id = pop._element?.getAttribute("aria-describedby");
      const popoverEl = id ? document.getElementById(id) : null;
      if (!popoverEl || popoverEl.dataset.gatilhoVinculado === "1") return;
      popoverEl.dataset.gatilhoVinculado = "1";
      popoverEl.addEventListener("mouseenter", cancelarHide);
      popoverEl.addEventListener("mouseleave", (e) => {
        if (destinoPermaneceAberto(e.relatedTarget)) return;
        agendarHide();
      });
    }

    pop._element?.addEventListener("shown.bs.popover", vincularPopoverAberto);

    alvos.forEach((alvo) => {
      if (usaHover) {
        alvo.addEventListener("mouseenter", () => {
          cancelarHide();
          cancelarShow();
          fecharOutros(tr);
          showTimer = setTimeout(() => {
            showTimer = null;
            if (!alvoAindaAtivo()) return;
            pop.show();
          }, HOVER_SHOW_MS);
        });
        alvo.addEventListener("mouseleave", (e) => {
          cancelarShow();
          if (destinoPermaneceAberto(e.relatedTarget)) return;
          agendarHide();
        });
      }
      if (usaClick) {
        alvo.addEventListener("click", (e) => {
          e.preventDefault();
          fecharOutros(tr);
          pop.toggle();
        });
      }
    });
  }

  function criar() {
    let popovers = [];
    const clickHandlers = [];
    let seletorLinhaAtual = "tr";

    function fecharOutros(trAtivo) {
      popovers.forEach((p) => {
        const linhaPop = p._element?.closest?.(seletorLinhaAtual);
        if (linhaPop && linhaPop !== trAtivo) p.hide();
      });
    }

    function removerClickHandlers() {
      clickHandlers.forEach(({ doc, handler }) => {
        doc.removeEventListener("click", handler, true);
      });
      clickHandlers.length = 0;
    }

    function destruir() {
      removerClickHandlers();
      const lista = popovers;
      popovers = [];
      limparPayloadsImpressao();
      lista.forEach((p) => p.dispose());
      resetarShellPopoverTabela();
    }

    function inicializar(opts) {
      const {
        corpo,
        seletorLinha,
        seletorAlvo,
        linhas,
        htmlConteudo,
        trigger: triggerOpt,
        fecharAoClicarFora = true,
        tituloImpressao,
        printKey,
      } = opts;

      destruir();
      if (!corpo || typeof bootstrap === "undefined") return;

      seletorLinhaAtual = seletorLinha;
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

        const alvos = seletorAlvo
          ? Array.from(tr.querySelectorAll(seletorAlvo))
          : [tr];
        if (!alvos.length) return;

        const ancora = alvos[0];
        const pop = new bootstrap.Popover(ancora, {
          trigger: seletorAlvo ? "manual" : trigg,
          html: true,
          sanitize: false,
          placement: "bottom",
          container: document.body,
          customClass: POPOVER_CLASS,
          popperConfig: popperConfigPopoverTabela(),
          content: contentHtml,
        });

        if (seletorAlvo) {
          vincularGatilhoPopoverLinha({
            tr,
            alvos,
            pop,
            trigg,
            seletorAlvo,
            fecharOutros,
          });
        } else {
          ancora.addEventListener("show.bs.popover", () => fecharOutros(tr));
        }

        popovers.push(pop);
      });

      if (fecharAoClicarFora && String(trigg).includes("click")) {
        const handler = (e) => {
          const emPopover = e.target.closest(`.popover.${POPOVER_CLASS}`);
          if (emPopover) return;

          const emLinha = e.target.closest(seletorLinha);
          const emAlvo = seletorAlvo ? e.target.closest(seletorAlvo) : null;
          if (emLinha || emAlvo) return;

          popovers.forEach((p) => p.hide());
        };

        document.addEventListener("click", handler, true);
        clickHandlers.push({ doc: document, handler });
      }
    }

    return { destruir, inicializar };
  }

  return { trigger, item, corpo, criar, htmlBotaoImprimir, imprimirConteudoPopover, POPOVER_CLASS };
})();
