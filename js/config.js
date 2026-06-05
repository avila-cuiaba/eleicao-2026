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
  // Opções: mapa-voto, votacao, municipios, cadastro-colaboradores,
  //         pessoal-municipio-aba1, pessoal-municipio-aba2.
  PLANILHA: "mapa-voto",

  // Planilhas cadastradas (usado pela página de verificação).
  // A "chave" deve ser idêntica à do BackendPlanilhas.gs.
  PLANILHAS_DISPONIVEIS: [
    { chave: "mapa-voto", titulo: "Mapa Voto" },
    { chave: "votacao", titulo: "Votação (projeções)" },
    { chave: "municipios", titulo: "Municípios (micro-região)" },
    { chave: "cadastro-colaboradores", titulo: "Cadastro colaboradores" },
    { chave: "pessoal-municipio-aba1", titulo: "Pessoal — Município (aba 1)" },
    { chave: "pessoal-municipio-aba2", titulo: "Pessoal — Município (aba 2)" },
  ],

  // Página pessoal (quando implementada).
  PESSOAL: {
    MUNICIPIO_ABA1: "pessoal-municipio-aba1",
    MUNICIPIO_ABA2: "pessoal-municipio-aba2",
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
};
