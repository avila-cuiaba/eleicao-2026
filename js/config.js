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

  // Parâmetros padrão da agenda (criação de eventos).
  AGENDA: {
    DURACAO_PADRAO_MIN: 60, // duração do evento quando não informado o fim
    LEMBRETE_PADRAO_MIN: 30, // lembrete (pop-up) padrão antes do evento
  },

  // Chave da planilha (deve existir em PLANILHAS no BackendPlanilhas.gs).
  // Opções: mapa-voto, votacao, municipios, cadastro-colaboradores,
  //         pessoal-municipio, apoiadores, parcerias, orcamento.
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
    { chave: "parcerias", titulo: "Pessoal — Parcerias" },
    { chave: "orcamento", titulo: "Orçamento" },
    { chave: "orcamento-geral", titulo: "Orçamento — Geral" },
    { chave: "orcamento-desembolso", titulo: "Orçamento — Desembolso" },
    { chave: "entregas", titulo: "Entregas" },
    { chave: "contratos", titulo: "Contratos" },
    { chave: "mobilizacao-estrutura", titulo: "Mobilização — Estrutura" },
    { chave: "mobilizacao-perspectiva", titulo: "Mobilização — Perspectiva" },
  ],

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
    // Vazio = aba resolvida no backend por gid (1492182435 — dados dos colaboradores).
    // A aba auditoria-contratos é só para log; não usar aqui.
    ABA: "",
    LINHA_INICIO_DADOS: 2,
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
      CHAVE_PIX: 12,
    },
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
      "apoiador 30 dias",
      "apoiador 45 dias",
      "apoiador líder",
      "apoiador customizado",
    ],
    ROTULOS: {
      NOME: "nome completo",
      NOME_MAE: "nome mãe",
      CPF: "CPF",
      MUNICIPIO: "município",
      VINCULO: "coordenador",
    },
    CAMPOS_FORMULARIO: [
      {
        id: "nome",
        aliases: ["nome-completo", "nome completo", "nome", "colaborador"],
        rotulo: "nome",
        indice: 0,
        largura: 12,
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
      },
      {
        id: "nome-pai",
        aliases: ["nome-pai", "nome pai", "pai"],
        rotulo: "nome pai",
        indice: 11,
        largura: 12,
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
        rotulo: "coordenador",
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
        largura: 12,
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
        grupo: "sistema",
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
        grupo: "sistema",
      },
      {
        id: "chave-pix",
        aliases: ["chave-pix", "chave pix", "pix"],
        rotulo: "chave pix",
        indice: 12,
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
      DIAS_5: 9,      // J
      DIAS_15: 10,    // K
      DIAS_30: 11,    // L
      DIAS_45: 12,    // M
    },
    CAMPOS: {
      ITEM: { aliases: ["item da despesa", "item despesa", "item", "despesa"] },
      ORCAMENTO: { aliases: ["orcamento", "orçamento"] },
      DIAS_5: { aliases: ["5 dias", "5d", "5"] },
      DIAS_15: { aliases: ["15 dias", "15d", "15"] },
      DIAS_30: { aliases: ["30 dias", "30d", "30"] },
      DIAS_45: { aliases: ["45 dias", "45d", "45"] },
    },
    PERIODOS: [
      { prop: "dias5", rotulo: "5 dias", kpi: "kpi5" },
      { prop: "dias15", rotulo: "15 dias", kpi: "kpi15" },
      { prop: "dias30", rotulo: "30 dias", kpi: "kpi30" },
      { prop: "dias45", rotulo: "45 dias", kpi: "kpi45" },
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
      PAGAMENTO: 7,      // H — pagamento
    },
    CAMPOS: {
      ITEM: { aliases: ["item despesa", "item", "despesa"] },
      ORCAMENTO: { aliases: ["orcamento", "orçamento"] },
      PAGAMENTO: { aliases: ["pagamento"] },
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
      ASSESSOR: 9,            // J
      APOIADORES: 10,         // K — contratos
    },
    APOIADORES: {
      LINHA_INICIO_DADOS: 2,
      // Índices padrão (0-based) quando o cabeçalho não bater por nome.
      COLUNAS: {
        LIDERANCA: 0,             // A
        MUNICIPIO: 1,             // B
        APOIADOR_LIDER: 2,        // C
        APOIADOR_30: 3,           // D
        APOIADOR_45: 4,           // E
        APOIADOR_CUSTOMIZADO: 5,  // F
        DESP_PESSOAL: 9,       // J
        DESP_COMBUSTIVEL: 10,  // K
        DESP_DIVERSOS: 11,     // L
        DESP_DIA_D: 12,        // M
      },
      COLUNAS_DESPACHO: [
        { prop: "pessoal", chave: "DESP_PESSOAL", indice: 9, aliases: ["pessoal", "contratos-distribuidos-apoiadores"] },
        {
          prop: "combustivel",
          chave: "DESP_COMBUSTIVEL",
          indice: 10,
          aliases: ["combustivel", "combustível", "orcamento-combustivel", "orcamento combustivel"],
        },
        { prop: "diversos", chave: "DESP_DIVERSOS", indice: 11, aliases: ["diversos", "orcamento-diversos"] },
        { prop: "diaD", chave: "DESP_DIA_D", indice: 12, aliases: ["dia d", "dia-d", "diad", "orcamento-diad", "orcamento dia d"] },
      ],
    },
    PARCERIAS: {
      LINHA_INICIO_DADOS: 2,
      COLUNAS: {
        MUNICIPIO: 0,         // A
        PARCERIA: 1,          // B
        APOIADORES: 2,        // C
        VALOR_PARCERIA: 3,    // D
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
    // Visão hierárquica resumida (organograma).
    ESTRUTURA: {
      PLANILHA: "mobilizacao-estrutura",
      ABA: "",
      TITULO: "Cuiabá",
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
      },
    },
  },
};
