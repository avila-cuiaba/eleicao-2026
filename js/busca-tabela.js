/** Busca em vários campos do registro (OR), como em contratos. */
function itemCombinaBuscaMulticampo(item, termo, props, normalizarChaveFn) {
  if (!termo) return true;
  const norm =
    normalizarChaveFn ||
    (typeof PlanilhaApi !== "undefined" && PlanilhaApi.normalizarChave) ||
    ((t) =>
      String(t ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, ""));
  return props.some((prop) => norm(item[prop]).includes(termo));
}

window.itemCombinaBuscaMulticampo = itemCombinaBuscaMulticampo;
