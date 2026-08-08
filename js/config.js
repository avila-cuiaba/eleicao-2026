// Configuração do projeto Eleição 2026
//
// 1. Publique apps-script/BackendPlanilhas.gs como "Aplicativo da Web" (Web App).
// 2. Copie a URL gerada (algo como https://script.google.com/macros/s/XXXX/exec).
// 3. Cole essa URL abaixo, substituindo o valor de WEB_APP_URL.

const CONFIG = {
  // URL do Web App do Google Apps Script (preencher depois de publicar)
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbznvDEewPSR0YG_CUlAfTXtrNzCWlsy2ZUGpasW4rb98P_MfsZZphVxagG-_v0QCg/exec",

  // Exigir login (chave de acesso) nas páginas. As senhas ficam no
  // Apps Script (Propriedades SENHA_ACESSO_*), nunca aqui no repositório.
  EXIGIR_LOGIN: true,

  // Tempo que o login permanece válido no navegador (sem pedir senha de novo).
  SESSAO_LOGIN_HORAS: 8,

  // Parâmetros padrão da agenda (criação de eventos).
  AGENDA: {
    DURACAO_PADRAO_MIN: 60, // duração do evento quando não informado o fim
    LEMBRETE_PADRAO_MIN: 30, // lembrete (pop-up) padrão antes do evento
    ORIGEM_PADRAO: "campanha", // agenda pré-selecionada ao inserir compromisso
  },

  // Chave da planilha (deve existir em PLANILHAS no BackendPlanilhas.gs).
  // Opções: mapa-voto, votacao, municipios, cadastro-colaboradores,
  //         pessoal-municipio, apoiadores, apoiador-federal, parcerias, orcamento.
  PLANILHA: "mapa-voto",

  // Planilhas cadastradas (usado pela página de verificação).
  // A "chave" deve ser idêntica à do BackendPlanilhas.gs.
  PLANILHAS_DISPONIVEIS: [
    { chave: "mapa-voto", titulo: "Mapa Voto" },
    { chave: "votacao", titulo: "Votação (projeções)" },
    { chave: "municipios", titulo: "Municípios (micro-região)" },
    { chave: "cadastro-colaboradores", titulo: "Cadastro colaboradores" },
    { chave: "pessoal-municipio", titulo: "Pessoal — Município" },
    { chave: "apoiadores", titulo: "Pessoal — Apoiadores" },
    { chave: "apoiador-federal", titulo: "Pessoal — Apoiador federal" },
    { chave: "parcerias", titulo: "Pessoal — Parcerias" },
    { chave: "orcamento", titulo: "Orçamento" },
    { chave: "orcamento-geral", titulo: "Orçamento — Geral" },
    { chave: "orcamento-desembolso", titulo: "Orçamento — Desembolso" },
    { chave: "pagamentos-lideranca", titulo: "Pagamentos — por liderança" },
    { chave: "entregas", titulo: "Entregas" },
    { chave: "contratos", titulo: "Contratos" },
    { chave: "mobilizacao-estrutura", titulo: "Mobilização — Estrutura" },
    { chave: "mobilizacao-perspectiva", titulo: "Mobilização — Perspectiva" },
    { chave: "material-grafico", titulo: "Logística — Material gráfico" },
    { chave: "material-grafico-entregas", titulo: "Logística — Material gráfico (entregas)" },
    { chave: "diario-bordo", titulo: "Logística — Diário bordo" },
    { chave: "diario-bordo-veiculos", titulo: "Logística — Diário bordo (veículos)" },
  ],

  MATERIAL_GRAFICO: {
    PLANILHA: "material-grafico",
    ABA: "",
    LINHA_CABECALHO: 1,
    LINHA_INICIO_DADOS: 2,
    // A–H: identificação e totais; I→: quantitativos por município.
    COLUNA_ITEM: ["item"],
    COLUNA_PECA: ["peca", "peça"],
    COLUNA_MIDIA: ["midia", "mídia"],
    COLUNA_TIRAGEM_1: ["tiragem 1", "tiragem-1", "tiragem1"],
    COLUNA_TIRAGEM_2: ["tiragem 2", "tiragem-2", "tiragem2"],
    COLUNA_TIRAGEM_3: ["tiragem 3", "tiragem-3", "tiragem3"],
    COLUNA_TIRAGEM_4: ["tiragem 4", "tiragem-4", "tiragem4"],
    COLUNA_SALDO: ["saldo"],
    INDICE_PRIMEIRO_MUNICIPIO: 8, // I
    OCULTAR_ZERO_PADRAO: true,
    ENTREGAS: {
      PLANILHA: "material-grafico-entregas",
      ABA: "",
      LINHA_INICIO_DADOS: 2,
      // Cabeçalhos: DATA | PECA | MIDIA | MUNICIPIO | QUANTIDADE | RECEBEDOR | ITEM
      COLUNA_DATA: ["data", "data-entrega", "data entrega", "dt"],
      COLUNA_PECA: ["peca", "peça"],
      COLUNA_MIDIA: ["midia", "mídia"],
      COLUNA_MUNICIPIO: ["municipio", "município", "cidade"],
      COLUNA_QUANTIDADE: [
        "quantidade",
        "qtd",
        "qtde",
        "entrega",
        "entregas",
        "qtd-entrega",
        "qtd entrega",
      ],
      COLUNA_RECEBEDOR: ["recebedor", "recebedora", "quem recebeu", "recebeu"],
      COLUNA_ITEM: ["item"],
    },
  },

  DIARIO_BORDO: {
    PLANILHA: "diario-bordo",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    TAMANHO_PAGINA_TABELA: 25,
    // Colunas A–F (índices 0–5): formulário, tabela e gravação.
    INDICE_COLUNA_INICIAL: 0,
    INDICE_COLUNA_FINAL: 5,
    CAMPOS_FORMULARIO: [],
    COLUNAS_IGNORAR: [],
    ORDEM_COLUNAS: [],
    CAMPO_VEICULO: {
      aliases: ["veiculo", "veículo"],
    },
    CAMPO_MUNICIPIO: {
      aliases: ["municipio", "município", "cidade"],
    },
    CAMPO_ODOMETRO: {
      aliases: ["odometro", "odômetro", "hodometro", "hodômetro"],
    },
    CAMPO_LITROS: {
      aliases: ["litros", "litragem"],
    },
    CAMPO_VALOR: {
      aliases: ["valor"],
    },
    MUNICIPIOS: {
      PLANILHA: "municipios",
      ABA: "",
    },
    // Planilha gid 966187834 — A=veículo, B=placa, C=nome (linha 2+). Exibir: NOME | VEÍCULO | PLACA.
    LISTA_VEICULOS: {
      PLANILHA: "diario-bordo-veiculos",
      ABA: "",
      LINHA_INICIAL: 2,
      COLUNAS_INDICES: [2, 0, 1],
      ORDENS_EXIBICAO_PARTES: [
        [2, 1, 0],
        [2, 0, 1],
        [1, 0, 2],
        [0, 2, 1],
      ],
      SEPARADOR: " | ",
    },
    // Formulário: pares lado a lado (col-6); em telas md+ mantém o mesmo par por linha.
    PARES_FORMULARIO: [
      [["data"], ["municipio", "município", "cidade"]],
      [["veiculo", "veículo"], ["odometro", "odômetro", "hodometro", "hodômetro", "km"]],
      [["litros", "litragem"], ["valor"]],
    ],
  },

  ENTREGAS: {
    PLANILHA: "entregas",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    REGIAO_MT: "mt-estadual",
    REGIOES_EXCLUIDAS: ["baixada cuiabana", "mt"],
    COLUNA_MUNICIPIO: ["municipio", "município", "cidade"],
    COLUNA_ANO: ["ano", "year", "exercicio", "exercício"],
    COLUNA_AREA: ["area", "área"],
    COLUNA_OBJETO: ["objeto"],
    COLUNA_VALOR: ["valor", "valor total", "valor entrega"],
  },

  CONTRATOS: {
    PLANILHA: "contratos",
    EXIBIR_CAMPO_LANCAR_SISTEMA_FORMULARIO: false,
    EXIBIR_ICONE_LANCAMENTO_SISTEMA_VALOR: false,
    // Vazio = aba resolvida no backend por gid (1492182435 — dados dos colaboradores).
    // A aba auditoria-contratos é só para log; não usar aqui.
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    TAMANHO_PAGINA_TABELA: 20,
    // Cabeçalhos atuais da planilha cadastro-colaboradores (kebab-case).
    COLUNA_NOME: [
      "nome-completo",
      "nome completo",
      "nome",
      "colaborador",
      "funcionario",
      "funcionário",
    ],
    COLUNA_NOME_MAE: ["nome-mae", "nome mae", "nome mãe", "mae", "mãe"],
    COLUNA_CPF: ["cpf"],
    COLUNA_MUNICIPIO: ["municipio", "município", "cidade"],
    COLUNA_VINCULO: [
      "vinculado-coordenador",
      "vinculado coordenador",
      "vinculo",
      "vínculo",
      "vinculacao",
      "vinculação",
    ],
    COLUNA_LANCAR_SISTEMA: [
      "lancamento-sistema",
      "lancamento sistema",
      "lançamento sistema",
      "lançar sistema",
      "lancar sistema",
    ],
    COLUNA_VALOR_CONTRATO: [
      "valor-contrato",
      "valor contrato",
      "valor do contrato",
    ],
    COLUNA_ASSINADO: ["assinado", "assinatura", "contrato-assinado", "contrato assinado"],
    // Fallback por índice (A=0) quando o cabeçalho não bater com os aliases.
    INDICES: {
      NOME: 0,
      NOME_MAE: 1,
      CPF: 2,
      TITULO_ELEITOR: 3,
      MUNICIPIO: 4,
      VINCULO: 7,
      BOLSA_FAMILIA: 8,
      LANCAMENTO_SISTEMA: 9,
      TIPO_CONTRATO: 10,
      NOME_PAI: 11,
      VALOR_CONTRATO: 12,
      SALDO_CONTRATO: 13,
      CHAVE_PIX: 14,
      ASSINADO: 22, // W
      PGTO_PARCEIRO: 23, // X
      DATA_PGTO_PARCEIRO: 24, // Y
    },
    COLUNA_SALDO_CONTRATO: [
      "saldo-contrato",
      "saldo contrato",
      "saldo do contrato",
    ],
    // Modelo Google Docs "modelo-contrato" — ver apps-script/AUTORIZAR-IMPRESSAO.md
    CONTRATO_TEMPLATE_DOC_ID: "1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s",
    CONTRATO_TEMPLATE_NOME: "modelo-contrato",
    // Dados fixos da campanha (espelham CONTRATO_CAMPANHA no BackendPlanilhas.gs).
    CAMPANHA: {
      ANO: 2026,
      TITULO_ELEICOES: "ELEIÇÕES 2026",
      DATA_FIM_CAMPANHA: "04 de outubro de 2026",
      CARGO_CANDIDATO: "DEPUTADO ESTADUAL",
    },
    OPCOES_TIPO_CONTRATO: [
      "apoiador meio período",
      "apoiador período integral",
      "apoiador líder",
      "apoiador customizado",
    ],
    // Planilha de referência (gid 1225905245) — valores em D2:D4.
    REFERENCIA_VALOR_CONTRATO: {
      PLANILHA: "contratos-valor-referencia",
      ABA: "",
      COLUNA_VALOR: 3,
      LINHA_POR_TIPO: {
        "apoiador lider": 1,
        "apoiador periodo integral": 2,
        "apoiador meio periodo": 3,
      },
    },
    ROTULOS: {
      NOME: "nome completo",
      ASSINADO: "assinado",
      NOME_MAE: "nome mãe",
      CPF: "CPF",
      MUNICIPIO: "município",
      VINCULO: "liderança",
      VALOR_CONTRATO: "valor contrato",
      SALDO_CONTRATO: "saldo contrato",
    },
    CAMPOS_FORMULARIO: [
      {
        id: "nome",
        aliases: ["nome-completo", "nome completo", "nome", "colaborador"],
        rotulo: "nome",
        indice: 0,
        largura: 9,
        grupo: "nome-assinado",
        uppercase: true,
      },
      {
        id: "assinado",
        aliases: ["assinado", "assinatura", "contrato-assinado", "contrato assinado"],
        rotulo: "assinado",
        tipo: "checkbox",
        indice: 22,
        largura: 3,
        grupo: "nome-assinado",
        valorSim: "S",
        valorNao: "N",
      },
      {
        id: "cpf",
        aliases: ["cpf"],
        rotulo: "CPF",
        rotuloUpper: true,
        tipo: "cpf",
        indice: 2,
        largura: 6,
        grupo: "documentos",
      },
      {
        id: "titulo-eleitor",
        aliases: ["titulo-eleitor", "titulo eleitor", "título de eleitor", "titulo de eleitor"],
        rotulo: "título de eleitor",
        indice: 3,
        largura: 6,
        grupo: "documentos",
      },
      {
        id: "nome-mae",
        aliases: ["nome-mae", "nome mae", "nome mãe", "mae", "mãe"],
        rotulo: "nome mãe",
        indice: 1,
        largura: 12,
        uppercase: true,
      },
      {
        id: "nome-pai",
        aliases: ["nome-pai", "nome pai", "pai"],
        rotulo: "nome pai",
        indice: 11,
        largura: 12,
        uppercase: true,
      },
      {
        id: "municipio",
        aliases: ["municipio", "município", "cidade"],
        rotulo: "município",
        tipo: "select",
        origem: "municipios",
        indice: 4,
        largura: 12,
      },
      {
        id: "coordenador",
        aliases: [
          "vinculado-coordenador",
          "vinculado coordenador",
          "vinculo",
          "vínculo",
        ],
        rotulo: "liderança",
        tipo: "select",
        origem: "liderancas",
        indice: 7,
        largura: 12,
      },
      {
        id: "bolsa-familia",
        aliases: [
          "recebe-bolsa-familia",
          "recebe-bolsa-família",
          "recebe bolsa familia",
          "recebe bolsa família",
          "bolsa familia",
          "bolsa família",
          "bolsa-familia",
        ],
        rotulo: "bolsa família",
        tipo: "checkbox",
        indice: 8,
        largura: 6,
        grupo: "beneficios",
      },
      {
        id: "lancar-sistema",
        aliases: [
          "lancamento-sistema",
          "lancamento sistema",
          "lançamento sistema",
          "lançar sistema",
        ],
        rotulo: "lançar sistema",
        tipo: "checkbox",
        indice: 9,
        largura: 6,
        grupo: "beneficios",
      },
      {
        id: "tipo-contrato",
        aliases: [
          "tipo-contrato",
          "tipo contrato",
          "tipo de contrato",
        ],
        rotulo: "tipo de contrato",
        tipo: "select",
        origem: "tipo-contrato",
        indice: 10,
        largura: 6,
        grupo: "tipo-valor",
      },
      {
        id: "valor-contrato",
        aliases: ["valor-contrato", "valor contrato", "valor do contrato"],
        rotulo: "valor contrato",
        tipo: "moeda",
        indice: 12,
        largura: 6,
        grupo: "tipo-valor",
      },
      {
        id: "chave-pix",
        aliases: ["chave-pix", "chave pix", "pix"],
        rotulo: "chave pix",
        indice: 14,
        largura: 12,
      },
    ],
    COLUNA_BUSCA: [
      "nome-completo",
      "nome completo",
      "nome",
      "colaborador",
      "nome-mae",
      "nome mãe",
      "cpf",
      "município",
      "municipio",
      "vinculado-coordenador",
      "vinculo",
      "vínculo",
      "nome-pai",
      "tipo-contrato",
      "valor-contrato",
      "valor contrato",
      "saldo-contrato",
      "saldo contrato",
    ],
  },

  DESEMBOLSO: {
    PLANILHA: "orcamento-desembolso",
    ABA: "",
    LINHA_CABECALHO: 1,
    LINHA_INICIO_DADOS: 2,
    COLUNAS: {
      ITEM: 1,        // B — item da despesa
      ORCAMENTO: 2,   // C — orçamento
      JUL_30: 14,     // O — desembolso-30-Jul
      AGO_15: 15,     // P — desembolso-15-Ago
      AGO_30: 16,     // Q — desembolso-30-Ago
      SET_15: 17,     // R — desembolso-15-Set
      SET_30: 18,     // S — desembolso-30-Set
    },
    CAMPOS: {
      ITEM: { aliases: ["item da despesa", "item despesa", "item", "despesa"] },
      ORCAMENTO: { aliases: ["orcamento", "orçamento"] },
      JUL_30: { aliases: ["desembolso-30-jul", "30 jul", "30/jul", "jul 30"] },
      AGO_15: { aliases: ["desembolso-15-ago", "15 ago", "15/ago", "ago 15"] },
      AGO_30: { aliases: ["desembolso-30-ago", "30 ago", "30/ago", "ago 30"] },
      SET_15: { aliases: ["desembolso-15-set", "15 set", "15/set", "set 15"] },
      SET_30: { aliases: ["desembolso-30-set", "30 set", "30/set", "set 30"] },
    },
    PERIODOS: [
      { prop: "jul30", chave: "JUL_30", slug: "jul30", rotulo: "30 Jul", kpiId: "kpiJul30", numProp: "numJul30", stack: "a" },
      { prop: "ago15", chave: "AGO_15", slug: "ago15", rotulo: "15 Ago", kpiId: "kpiAgo15", numProp: "numAgo15", stack: "b" },
      { prop: "ago30", chave: "AGO_30", slug: "ago30", rotulo: "30 Ago", kpiId: "kpiAgo30", numProp: "numAgo30", stack: "a" },
      { prop: "set15", chave: "SET_15", slug: "set15", rotulo: "15 Set", kpiId: "kpiSet15", numProp: "numSet15", stack: "b" },
      { prop: "set30", chave: "SET_30", slug: "set30", rotulo: "30 Set", kpiId: "kpiSet30", numProp: "numSet30", stack: "a" },
    ],
  },

  PAGAMENTOS_LIDERANCA: {
    PLANILHA: "pagamentos-lideranca",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    COLUNAS: {
      LIDERANCA: 0,           // A
      MUNICIPIO: 1,           // B
      PROPRIO_VALOR: 2,       // C — PROPRIO-APOIADOR-VALOR
      PROPRIO_PGTO: 3,        // D — PROPRIO-APOIADOR-PGTO
      LIDER_VALOR: 4,         // E — LIDER-VALOR
      LIDER_PGTO: 5,          // F — LIDER-PGTO
      INTEGRAL_VALOR: 6,      // G — INTEGRAL-VALOR
      INTEGRAL_PGTO: 7,       // H — INTEGRAL-PGTO
      MEIO_VALOR: 8,          // I — MEIO-VALOR
      MEIO_PGTO: 9,           // J — MEIO-PGTO
      CUSTOMIZADO_VALOR: 10,  // K — CUSTOMIZADO-VALOR
      CUSTOMIZADO_PGTO: 11,   // L — CUSTOMIZADO-PGTO
      PESSOAL_ORC: 12,        // M
      PESSOAL_PGTO: 13,       // N
      COMBUSTIVEL_ORC: 14,    // O — ORCAMENTO-COMBUSTIVEL
      COMBUSTIVEL_PGTO: 15,   // P — COMBUSTIVEL-PGTO
      DIVERSOS_ORC: 16,       // Q — ORCAMENTO-DIVERSOS
      DIVERSOS_PGTO: 17,      // R — DIVERSOS-PGTO
      DIA_D_ORC: 18,          // S — ORCAMENTO-DIA-D
      DIA_D_PGTO: 19,         // T — DIA-D-PGTO
      OBSERVACAO: 20,         // U
    },
    // Somente estas colunas podem ser alteradas pelo formulário (letras D F H J L P R T U).
    COLUNAS_EDITAVEIS: [
      "PROPRIO_PGTO",      // D
      "LIDER_PGTO",        // F
      "INTEGRAL_PGTO",     // H
      "MEIO_PGTO",         // J
      "CUSTOMIZADO_PGTO",  // L
      "COMBUSTIVEL_PGTO",  // P
      "DIVERSOS_PGTO",     // R
      "DIA_D_PGTO",        // T
      "OBSERVACAO",        // U
    ],
  },

  ORCAMENTO_GERAL: {
    PLANILHA: "orcamento-geral",
    ABA: "",
    LINHA_CABECALHO: 1,
    LINHA_INICIO_DADOS: 2,
    // Linhas 1-based estratificadas (C2–C5 nos cards).
    LINHAS_ESTRATIFICADAS: [2, 3, 4, 5],
    COLUNAS: {
      ITEM: 0,         // A — item despesa
      VALOR_B: 1,        // B
      ORCAMENTO: 2,      // C — orçamento
      REPASSE_PARCEIRO: 3, // D — repasse parceiro (bônus)
      PAGAMENTO: 11,     // L — pagamento
      A_PAGAR: 12,       // M — a pagar
    },
    CAMPOS: {
      ITEM: { aliases: ["item despesa", "item", "despesa"] },
      ORCAMENTO: { aliases: ["orcamento", "orçamento"] },
      REPASSE_PARCEIRO: { aliases: ["repasse parceiro", "repasse parceria", "repasse parcerias"] },
      PAGAMENTO: { aliases: ["pagamento"] },
      A_PAGAR: { aliases: ["a pagar", "apagar", "a-pagar"] },
    },
  },

  ORCAMENTO: {
    PLANILHA: "orcamento",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    ORDEM_REGIOES: [
      "alto araguaia",
      "medio araguaia",
      "norte araguaia",
      "baixada cuiabana",
      "mt",
    ],
    COLUNAS: {
      MUNICIPIO: 0,       // A — municipios
      PESSOAL: 1,         // B — contratos-distribuidos-apoiadores
      COMBUSTIVEL: 2,     // C — orcamento-combustivel
      DIVERSOS: 3,        // D — orcamento-diversos
      DIA_D: 4,           // E — orcamento-diaD
    },
  },

  PESSOAL: {
    PLANILHA: "pessoal-municipio",
    PLANILHA_APOIADORES: "apoiadores",
    PLANILHA_PARCERIAS: "parcerias",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    ORDEM_REGIOES: [
      "alto araguaia",
      "medio araguaia",
      "norte araguaia",
      "baixada cuiabana",
      "mt",
    ],
    COLUNAS: {
      MUNICIPIO: 1,           // B
      REGIAO: 2,              // C
      IDEAL: 5,               // F — meta votação
      PREFEITO: 6,            // G
      VEREADOR: 7,            // H
      AGENTE_POLITICO: 8,     // I
      APOIADORES: 9,          // J — contratos (após exclusão da antiga col. Assessor)
      PARCEIROS: 15,          // P
    },
    APOIADORES: {
      LINHA_INICIO_DADOS: 2,
      // Índices padrão (0-based) quando o cabeçalho não bater por nome.
      COLUNAS: {
        TIPO: 0,                  // A — só quando o cabeçalho for tipo/classificação
        LIDERANCA: 0,
        MUNICIPIO: 1,
        PROPRIO_APOIADOR: 3, // D — valor próprio apoiador (não usar offset da coluna TIPO)
        APOIADOR_LIDER: 4,
        FIN_LIDER: 5,
        APOIADOR_INTEGRAL: 6,
        FIN_INTEGRAL: 7,
        APOIADOR_MEIO: 8,
        FIN_MEIO: 9,
        APOIADOR_CUSTOMIZADO: 10,
        FIN_CUSTOMIZADO: 11,
      },
      COLUNAS_DESPACHO: [
        { prop: "pessoal", chave: "DESP_PESSOAL", aliases: ["pessoal", "contratos-distribuidos-apoiadores"] },
        {
          prop: "combustivel",
          chave: "DESP_COMBUSTIVEL",
          aliases: ["combustivel", "combustível", "orcamento-combustivel", "orcamento combustivel"],
        },
        { prop: "diversos", chave: "DESP_DIVERSOS", aliases: ["diversos", "orcamento-diversos"] },
        { prop: "diaD", chave: "DESP_DIA_D", aliases: ["dia d", "dia-d", "diad", "orcamento-diad", "orcamento dia d"] },
      ],
      // Aba parametros (mesma planilha gid 1225905245) — intervalo H1:L6.
      PARAMETROS_CLASSIFICACAO: {
        PLANILHA: "contratos-valor-referencia",
        LINHA_INICIO: 1,
        LINHA_FIM: 5,
        COL_TIPO: 7,
        COL_LIDER: 8,
        COL_INTEGRAL: 9,
        COL_MEIO: 10,
        COL_PROPRIO_VALOR: 11,
      },
      // Colunas com fórmula na aba apoiadores (0-based) — nunca regravar pelo app.
      COLUNAS_SOMENTE_FORMULA: [5, 7, 9, 13, 19],
      // E, G, I — fórmula quando não “editar padrão”; D = valor direto (padrão 0,00).
      COLUNAS_PADRAO_FORMULA: [4, 6, 8],
    },
    ORCAMENTO_POR_LIDERANCA: {
      LINHA_INICIO_DADOS: 2,
      COLUNAS: {
        LIDERANCA: 0,       // A
        MUNICIPIO: 1,       // B
        PESSOAL: 13,        // N
        COMBUSTIVEL: 20,    // U
        DIVERSOS: 21,       // V
        DIA_D: 22,          // W
      },
    },
    PARCERIAS: {
      LINHA_INICIO_DADOS: 2,
      COLUNAS: {
        LIDERANCA: 1,            // B
        MUNICIPIO: 2,            // C
        PARCERIA: 23,            // X
        ORCAMENTO: 24,           // Y
        REPASSE_PARCERIA: 25,    // Z
        REPASSE_FEDERAL: 25,     // Z — filtro (somente linhas com valor)
      },
    },
    APOIADOR_FEDERAL: {
      PLANILHA: "apoiadores",
      LINHA_INICIO_DADOS: 2,
      COLUNAS: {
        LIDERANCA: 1,   // B
        MUNICIPIO: 2,   // C
        FEDERAL: 13,    // N
      },
      PARAMETROS: {
        PLANILHA: "apoiadores",
        ABA: "parametros",
        COLUNA_FEDERAL: 5, // F
        LINHA_INICIO_DADOS: 2,
      },
    },
  },

  // Nome da aba (sheet) consultada/gravada. Vazio = primeira aba (gid=0).
  ABA: "",

  // Dashboard → planilha "votacao" (id 1tFJ54zDjwvzqvPwwfSH0OpgxkGygSXkF4pSqIhtImOE).
  // Micro-regiões resumo → "mapa-voto"; modal municípios → "municipios".
  MICRO_REGIAO: {
    PLANILHA: "mapa-voto",
    ABA: "",
    LINHA_INICIO_DADOS: 3,
    LINHA_FIM_DADOS: 7,
    COLUNAS: {
      REGIAO: 0,        // A
      MUNICIPIOS: 1,    // B
      HABITANTES: 2,    // C
      ELEITORES: 3,     // D
    },
    MUNICIPIOS: {
      PLANILHA: "municipios",
      ABA: "",
      LINHA_INICIO_DADOS: 2,
      COLUNAS: {
        MUNICIPIO: 1,   // B
        REGIAO: 2,      // C
        HABITANTES: 4,  // E
        ELEITORES: 5,   // F
      },
    },
  },

  DASHBOARD: {
    PLANILHA: "votacao",
    ABA: "",
    LINHA_INICIO_DADOS: 2,
    ORDEM_REGIOES: [
      "alto araguaia",
      "medio araguaia",
      "norte araguaia",
      "baixada cuiabana",
      "mt",
    ],
    COLUNAS: {
      MUNICIPIO: 1,   // B
      REGIAO: 2,      // C
      POPULACAO: 4,   // E
      ELEITORES: 5,   // F
      VOTOS_2022: 7,  // H
      MINIMA: 8,      // I
      IDEAL: 9,       // J
    },
  },

  // Registros → planilha mapa-voto, tabela REGIÃO (linhas 1–7). PRIORIDADE ignorada.
  REGISTROS: {
    PLANILHA: "mapa-voto",
    ABA: "",
    COLUNAS: {
      REGIAO: 0,       // A
      MUNICIPIOS: 1,   // B
      HABITANTES: 2,   // C
      ELEITORES: 3,    // D
      VOTOS_2018: 4,   // E
      VOTOS_2022: 5,   // F
      MINIMA: 6,       // G
      IDEAL: 7,        // H
    },
    TABELA: {
      titulo: "Região",
      headerRow: 1,
      totalRow: 2,
      dataInicio: 3,
      dataFim: 7,
    },
  },

  MOBILIZACAO: {
    TITULO_PAGINA: "mobilização em Cuiabá / VG",
    // Visão hierárquica resumida (organograma).
    ESTRUTURA: {
      PLANILHA: "mobilizacao-estrutura",
      ABA: "",
      TITULO: "Cuiabá / Várzea Grande",
      BADGE_PERSPECTIVA_ROTULO: "votos",
      CONTEXTO_APOIADOR: {
        MUNICIPIO: ["Cuiabá", "Cuiaba"],
        REGIAO_MICRO: ["baixada cuiabana"],
      },
    },
    // Dados da estrutura de Cuiabá (regionais, polos, bairros).
    CUIABA: {
      PLANILHA: "mobilizacao-estrutura",
      ABA: "",
      MUNICIPIO: "Cuiabá",
      TITULO: "estrutura de mobilização",
      SUBTITULO: "coordenação geral → mobilização → regionais → polos → bairros/localidades",
      LINHA_INICIO_DADOS: 2,
      EXIBICAO_PADRAO: "cards",
      REGIONAIS: [
        "REGIONAL NORTE",
        "REGIONAL SUL",
        "REGIONAL LESTE",
        "REGIONAL OESTE",
        "REGIONAL VG",
        "ZONA RURAL",
      ],
      REGIONAL_META: {
        "REGIONAL NORTE": { cls: "norte", rotulo: "regional norte" },
        "REGIONAL SUL": { cls: "sul", rotulo: "regional sul" },
        "REGIONAL LESTE": { cls: "leste", rotulo: "regional leste" },
        "REGIONAL OESTE": { cls: "oeste", rotulo: "regional oeste" },
        "REGIONAL VG": {
          cls: "vg",
          rotulo: "regional Várzea Grande",
          rotuloTabela: "regional VG",
        },
        "ZONA RURAL": { cls: "rural", rotulo: "zona rural" },
      },
      COLUNAS: {
        REGIONAL: {
          aliases: ["regional", "região", "regiao"],
          indice: null,
          preencher: true,
        },
        POLO: {
          aliases: ["polo"],
          indice: null,
          preencher: true,
        },
        NUMERO: {
          aliases: ["nr-item", "nr item", "num", "número", "numero", "n"],
          indice: null,
        },
        BAIRRO: {
          aliases: ["bairro-localidade", "bairro localidade", "bairro", "localidade"],
          indice: null,
        },
        RESPONSAVEL: {
          aliases: ["responsavel-polo", "responsavel polo", "responsável-polo", "responsavel", "responsável"],
          indice: null,
          preencher: true,
        },
      },
      ROTULOS_CAMPO: [
        "polo",
        "regional",
        "responsavel-polo",
        "responsavel polo",
        "mobilizacao",
        "mobilização",
        "bairro-localidade",
        "bairro localidade",
        "nr-item",
        "nr item",
      ],
      LINHA_ANCORA: ["polo"],
    },
    PERSPECTIVA: {
      PLANILHA: "mobilizacao-perspectiva",
      ABA: "",
      LINHA_INICIO_DADOS: 2,
      ORDEM_REGIOES: [
        "alto araguaia",
        "medio araguaia",
        "norte araguaia",
        "baixada cuiabana",
        "mt",
        "cuiaba",
        "cuiabá",
      ],
      COLUNA_REGIAO: ["regiao", "região", "micro-regiao", "polo", "polo regional"],
      COLUNA_POLO: ["polo"],
      COLUNA_BAIRRO: ["bairro", "bairro-localidade", "bairro localidade", "localidade"],
      COLUNA_LIDERANCA: ["apoiador", "lideranca", "liderança", "responsavel", "responsável", "nome"],
      COLUNA_VOTOS: ["perspectiva-voto", "perspectiva voto", "perspectiva de voto"],
      INDICE_LIDERANCA: 0,
      INDICE_BAIRRO: 1,
      INDICE_ORIGEM: 2,
      INDICE_VOTOS: 3,
      INDICE_SEGMENTO: 4,
      COLUNA_SEGMENTO: ["segmento"],
      COLUNA_MUNICIPIO: ["municipio", "município", "cidade"],
      COLUNA_RESPONSAVEL: ["responsavel", "responsável", "nome", "lideranca", "liderança", "coordenador"],
      COLUNA_RESPONSABILIDADE: ["responsabilidade", "papel", "funcao", "função", "cargo"],
      COLUNA_ORIGEM: ["origem-voto", "origem voto", "origem"],
      COLUNA_PERSPECTIVA: [
        "perspectiva-voto",
        "perspectiva voto",
        "perspectiva de voto",
        "perspectiva",
      ],
      // Listas do modal CRUD (mesma planilha de mobilização).
      OPCOES_FORMULARIO: {
        PLANILHA: "mobilizacao-perspectiva",
        APOIADOR: {
          ABA: "aux_apoiadores",
          COLUNA: 0,
          LINHA_INICIO: 1,
          LINHA_FIM: 1000,
        },
        BAIRRO: {
          ABA: "estrutura",
          COLUNA: 5,
          LINHA_INICIO: 2,
          LINHA_FIM: 1000,
        },
        SEGMENTO: {
          ABA: "",
          COLUNA: 4,
          LINHA_INICIO: 2,
          LINHA_FIM: 1000,
        },
      },
    },
  },
};

CONFIG.PESSOAL_PAGAMENTOS = Object.assign({}, CONFIG.CONTRATOS, {
  EXIBIR_CAMPO_LANCAR_SISTEMA_FORMULARIO: true,
  EXIBIR_ICONE_LANCAMENTO_SISTEMA_VALOR: true,
  EXIBIR_COLUNA_LIDERANCA: false,
  EXIBIR_COLUNA_SALDO_CONTRATO: true,
  SOMENTE_EDICAO: true,
  ROTULOS: Object.assign({}, CONFIG.CONTRATOS.ROTULOS, {
    CPF: "CPF / chave pix",
    VALOR_PAGO: "pago",
  }),
  TAMANHO_PAGINA_TABELA: 20,
  PLANILHA_LOTE_PIX: "pagamentos-pix-lote",
  /** Colunas O–V: pgto 1 / data 1 … pgto 4 / data 4 (14–21); X/Y: pgto-parceiro / data (23–24). */
  PARCELAS_COLUNAS_O_V: [
    {
      n: 1,
      pgto: 14,
      data: 15,
      pgtoAliases: ["pgto-1", "pgto 1"],
      dataAliases: ["data-pgto-1", "data pgto 1", "data pgto-1"],
    },
    {
      n: 2,
      pgto: 16,
      data: 17,
      pgtoAliases: ["pgto-2", "pgto 2"],
      dataAliases: ["data-pgto-2", "data pgto 2", "data pgto-2"],
    },
    {
      n: 3,
      pgto: 18,
      data: 19,
      pgtoAliases: ["pgto-3", "pgto 3"],
      dataAliases: ["data-pgto-3", "data pgto 3", "data pgto-3"],
    },
    {
      n: 4,
      pgto: 20,
      data: 21,
      pgtoAliases: ["pgto-4", "pgto 4"],
      dataAliases: ["data-pgto-4", "data pgto 4", "data pgto-4"],
    },
    {
      n: "parceiro",
      titulo: "pagamento parceiro",
      pgto: 23,
      data: 24,
      pgtoAliases: ["pgto-parceiro", "pgto parceiro"],
      dataAliases: ["data-pgto-parceiro", "data pgto parceiro", "data-pgto parceiro"],
    },
  ],
  LINHA_INICIO_DADOS_LOTE_PIX: 2,
  COLUNAS_LOTE_PIX: {
    ID_LOTE: ["id-lote", "id lote"],
    DATA_LOTE: ["data-lote", "data lote"],
    COLABORADOR: ["colaborador"],
    CPF: ["cpf-pix", "cpf pix", "cpf"],
    VALOR: ["valor"],
    CONTADOR_LOTE: ["contador-lote", "contador lote", "contador"],
    LANCADO: [
      "lancado-colaborador",
      "lancado colaborador",
      "lancado",
      "lançado",
      "lancamento",
      "lançamento",
      "lancado-sistema",
    ],
  },
  INDICES_LOTE_PIX: {
    LANCADO: 6,
  },
  CAMPOS_FORMULARIO: [
    {
      id: "nome",
      aliases: ["nome-completo", "nome completo", "nome", "colaborador"],
      rotulo: "nome",
      indice: 0,
      largura: 9,
      grupo: "nome-assinado",
      somenteLeitura: true,
    },
    {
      id: "assinado",
      aliases: ["assinado", "assinatura", "contrato-assinado", "contrato assinado"],
      rotulo: "assinado",
      tipo: "checkbox",
      indice: 22,
      largura: 3,
      grupo: "nome-assinado",
      valorSim: "S",
      valorNao: "N",
      edicaoComConfirmacao: true,
    },
    {
      id: "cpf",
      aliases: ["cpf"],
      rotulo: "CPF",
      rotuloUpper: true,
      tipo: "cpf",
      indice: 2,
      largura: 4,
      grupo: "identificacao",
      somenteLeitura: true,
    },
    {
      id: "titulo-eleitor",
      aliases: ["titulo-eleitor", "titulo eleitor", "título de eleitor", "titulo de eleitor"],
      rotulo: "título de eleitor",
      indice: 3,
      largura: 8,
      grupo: "identificacao",
      somenteLeitura: true,
    },
    {
      id: "municipio",
      aliases: ["municipio", "município", "cidade"],
      rotulo: "município",
      tipo: "select",
      origem: "municipios",
      indice: 4,
      largura: 12,
      desabilitadoPermanente: true,
    },
    {
      id: "bolsa-familia",
      aliases: [
        "recebe-bolsa-familia",
        "recebe-bolsa-família",
        "recebe bolsa familia",
        "recebe bolsa família",
        "bolsa familia",
        "bolsa família",
        "bolsa-familia",
      ],
      rotulo: "bolsa família",
      tipo: "checkbox",
      indice: 8,
      largura: 6,
      grupo: "beneficios",
      edicaoComConfirmacao: true,
    },
    {
      id: "lancar-sistema",
      aliases: [
        "lancamento-sistema",
        "lancamento sistema",
        "lançamento sistema",
        "lançar sistema",
      ],
      rotulo: "lançar sistema",
      tipo: "checkbox",
      indice: 9,
      largura: 6,
      grupo: "beneficios",
      edicaoComConfirmacao: true,
    },
    {
      id: "tipo-contrato",
      aliases: ["tipo-contrato", "tipo contrato", "tipo de contrato"],
      rotulo: "tipo de contrato",
      tipo: "select",
      origem: "tipo-contrato",
      indice: 10,
      largura: 6,
      grupo: "tipo-valor",
      edicaoComConfirmacao: true,
    },
    {
      id: "valor-contrato",
      aliases: ["valor-contrato", "valor contrato", "valor do contrato"],
      rotulo: "valor contrato",
      tipo: "moeda",
      indice: 12,
      largura: 6,
      grupo: "tipo-valor",
      edicaoComConfirmacao: true,
    },
    {
      id: "chave-pix",
      aliases: ["chave-pix", "chave pix", "pix"],
      rotulo: "chave pix",
      largura: 12,
      desabilitadoPermanente: true,
    },
    {
      id: "pgto-1",
      aliases: ["pgto-1", "pgto 1"],
      rotulo: "pagamento 1",
      tipo: "moeda",
      indice: 14,
      largura: 6,
      grupo: "parcela-1",
    },
    {
      id: "data-pgto-1",
      aliases: ["data-pgto-1", "data pgto 1", "data pgto-1"],
      rotulo: "data pagamento 1",
      tipo: "data",
      indice: 15,
      largura: 6,
      grupo: "parcela-1",
    },
    {
      id: "pgto-2",
      aliases: ["pgto-2", "pgto 2"],
      rotulo: "pagamento 2",
      tipo: "moeda",
      indice: 16,
      largura: 6,
      grupo: "parcela-2",
    },
    {
      id: "data-pgto-2",
      aliases: ["data-pgto-2", "data pgto 2", "data pgto-2"],
      rotulo: "data pagamento 2",
      tipo: "data",
      indice: 17,
      largura: 6,
      grupo: "parcela-2",
    },
    {
      id: "pgto-3",
      aliases: ["pgto-3", "pgto 3"],
      rotulo: "pagamento 3",
      tipo: "moeda",
      indice: 18,
      largura: 6,
      grupo: "parcela-3",
    },
    {
      id: "data-pgto-3",
      aliases: ["data-pgto-3", "data pgto 3", "data pgto-3"],
      rotulo: "data pagamento 3",
      tipo: "data",
      indice: 19,
      largura: 6,
      grupo: "parcela-3",
    },
    {
      id: "pgto-4",
      aliases: ["pgto-4", "pgto 4"],
      rotulo: "pagamento 4",
      tipo: "moeda",
      indice: 20,
      largura: 6,
      grupo: "parcela-4",
    },
    {
      id: "data-pgto-4",
      aliases: ["data-pgto-4", "data pgto 4", "data pgto-4"],
      rotulo: "data pagamento 4",
      tipo: "data",
      indice: 21,
      largura: 6,
      grupo: "parcela-4",
    },
    {
      id: "pgto-parceiro",
      aliases: ["pgto-parceiro", "pgto parceiro"],
      rotulo: "pagamento parceiro",
      tipo: "moeda",
      indice: 23,
      largura: 6,
      grupo: "parcela-parceiro",
    },
    {
      id: "data-pgto-parceiro",
      aliases: ["data-pgto-parceiro", "data pgto parceiro", "data-pgto parceiro"],
      rotulo: "data pagamento parceiro",
      tipo: "data",
      indice: 24,
      largura: 6,
      grupo: "parcela-parceiro",
    },
  ],
  COLUNA_BUSCA: [
    "nome-completo",
    "nome completo",
    "nome",
    "cpf",
    "município",
    "municipio",
    "tipo-contrato",
    "valor-contrato",
    "saldo-contrato",
    "pgto-1",
    "pgto-2",
    "pgto-3",
    "pgto-4",
    "pgto-parceiro",
  ],
});
