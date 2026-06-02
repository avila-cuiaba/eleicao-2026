function renderHeader(activeLink) {
  const pages = [
    { href: 'index.html',       icon: '◈', label: 'Visão geral' },
    { href: 'votos.html',       icon: '◉', label: 'Votos & metas' },
    { href: 'municipios.html',  icon: '◎', label: 'Municípios' },
    { href: 'orcamento.html',   icon: '◐', label: 'Orçamento' },
    { href: 'apoiadores.html',  icon: '◑', label: 'Apoiadores' },
    { href: 'financeiro.html',  icon: '◒', label: 'Financeiro' },
  ];

  const navLinks = pages.map(p => {
    const isActive = p.href === activeLink;
    return `<a href="${p.href}" class="${isActive ? 'active' : ''}">
      <span class="nav-icon">${p.icon}</span>${p.label}
    </a>`;
  }).join('');

  const breadLabel = pages.find(p => p.href === activeLink)?.label || 'Início';

  document.getElementById('header-placeholder').innerHTML = `
    <header>
      <div class="header-left">
        <a href="index.html" class="logo-mark">MT</a>
        <div>
          <div class="site-title">Campanha 2026 — Mato Grosso</div>
          <div class="site-sub">Painel de Controle Eleitoral</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="header-badge">● ATIVO</span>
        <span class="updated" id="updated-time"></span>
      </div>
    </header>
    <nav>${navLinks}</nav>
    <div class="breadcrumb">
      <a href="index.html">início</a>
      <span>/</span>
      <span>${breadLabel}</span>
    </div>
  `;

  document.getElementById('updated-time').textContent =
    new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Cuiaba',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
}
