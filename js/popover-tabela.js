// Popovers de linha em tabelas (Bootstrap 5).
const PopoverTabela = (function () {
  const POPOVER_CLASS = "orcamento-geral-popover-bs";

  function trigger() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ? "hover focus"
      : "click";
  }

  function item(rotulo, valor, marcadorClass) {
    const exibicao =
      valor !== undefined && valor !== null && String(valor).trim() !== "" ? valor : "—";
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
    }

    function inicializar(opts) {
      const {
        corpo,
        seletorLinha,
        linhas,
        htmlConteudo,
        trigger: triggerOpt,
        fecharAoClicarFora = true,
      } = opts;

      destruir();
      if (!corpo || typeof bootstrap === "undefined") return;

      const trigg = triggerOpt || trigger();
      const linhasEl = corpo.querySelectorAll(seletorLinha);

      linhasEl.forEach((tr, idx) => {
        const r = linhas[idx];
        if (!r) return;

        const pop = new bootstrap.Popover(tr, {
          trigger: trigg,
          html: true,
          sanitize: false,
          placement: "auto",
          container: "body",
          customClass: POPOVER_CLASS,
          content: htmlConteudo(r),
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

  return { trigger, item, corpo, criar, POPOVER_CLASS };
})();
