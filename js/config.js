// Configuração do projeto Eleição 2026
//
// 1. Publique apps-script/BackendPlanilhas.gs como "Aplicativo da Web" (Web App).
// 2. Copie a URL gerada (algo como https://script.google.com/macros/s/XXXX/exec).
// 3. Cole essa URL abaixo, substituindo o valor de WEB_APP_URL.

const CONFIG = {
  // URL do Web App do Google Apps Script (preencher depois de publicar)
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbznvDEewPSR0YG_CUlAfTXtrNzCWlsy2ZUGpasW4rb98P_MfsZZphVxagG-_v0QCg/exec",

  // Exigir login (chave de acesso) nas páginas. A senha em si fica no
  // Apps Script (Propriedade SENHA_ACESSO), nunca aqui no repositório.
  EXIGIR_LOGIN: true,

  // Parâmetros padrão da agenda (criação de eventos).
  AGENDA: {
    DURACAO_PADRAO_MIN: 60, // duração do evento quando não informado o fim
    LEMBRETE_PADRAO_MIN: 30, // lembrete (pop-up) padrão antes do evento
  },

  // Chave da planilha (deve existir em PLANILHAS no BackendPlanilhas.gs).
  // Opções atuais: "mapa-voto", "planilha-2", "planilha-3",
  //                "planilha-4-aba1", "planilha-4-aba2".
  PLANILHA: "mapa-voto",

  // Planilhas cadastradas (usado pela página de verificação).
  // A "chave" deve ser idêntica à do BackendPlanilhas.gs.
  PLANILHAS_DISPONIVEIS: [
    { chave: "mapa-voto", titulo: "Mapa Voto" },
    { chave: "planilha-2", titulo: "Planilha 2" },
    { chave: "planilha-3", titulo: "Planilha 3" },
    { chave: "planilha-4-aba1", titulo: "Planilha 4 - Aba 1" },
    { chave: "planilha-4-aba2", titulo: "Planilha 4 - Aba 2" },
  ],

  // Nome da aba (sheet) consultada/gravada. Vazio = primeira aba (gid=0).
  ABA: "",

  // Mapeamento do dashboard.
  DASHBOARD: {
    // Colunas (índices baseados em 0): A=0, B=1, C=2, D=3, E=4, F=5, G=6
    COLUNAS: {
      ROTULO: 0,     // A
      MUNICIPIOS: 1, // B
      ELEITORES: 2,  // C
      VOTOS_2018: 3, // D
      VOTOS_2022: 4, // E
      MINIMA: 5,     // F (projeção mínima)
      IDEAL: 6,      // G (projeção ideal)
    },

    // Tabelas empilhadas na mesma aba (números de linha da planilha, base 1).
    // headerRow = linha do cabeçalho; totalRow = linha de somatória;
    // dataInicio/dataFim = intervalo das linhas de dados (inclusive).
    TABELAS: [
      {
        titulo: "Região",
        headerRow: 1,
        totalRow: 2,
        dataInicio: 3,
        dataFim: 7,
      },
      {
        titulo: "Prioridade",
        headerRow: 11,
        totalRow: 12,
        dataInicio: 13,
        dataFim: 17,
      },
    ],
  },
};
