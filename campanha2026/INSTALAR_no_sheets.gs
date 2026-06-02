/**
 * ============================================================
 *  CAMPANHA 2026 — API de Dados via Google Apps Script
 * ============================================================
 *
 *  COMO INSTALAR (faça uma vez só):
 *  1. Abra sua planilha no Google Sheets
 *  2. Menu: Extensões → Apps Script
 *  3. Apague todo o código existente e cole este arquivo inteiro
 *  4. Salve (Ctrl+S)
 *  5. Menu: Implantar → Nova implantação
 *       - Tipo: "Aplicativo da Web"
 *       - Executar como: "Eu (seu e-mail)"
 *       - Quem pode acessar: "Qualquer pessoa"   ← necessário para o HTML acessar
 *  6. Clique em "Implantar" → autorize as permissões
 *  7. Copie a URL gerada (formato: https://script.google.com/macros/s/XXX/exec)
 *  8. Cole essa URL no arquivo index.html onde indicado (variável API_URL)
 *
 *  ATUALIZAÇÃO DE DADOS:
 *  - Basta editar a planilha normalmente. O HTML sempre buscará os dados mais recentes.
 *  - Não é necessário reimplantar após editar os dados.
 *  - Reimplantar só é necessário se você alterar ESTE script.
 *
 *  ABAS ESPERADAS NA PLANILHA (nomes exatos):
 *    - "Municipios"   → dados por município (votos, metas, etc.)
 *    - "Orcamento"    → itens de orçamento 2022 e 2026
 *    - "Apoiadores"   → lista de apoiadores com status
 *    - "Financeiro"   → gastos realizados por município
 *
 *  Se suas abas tiverem nomes diferentes, ajuste a constante SHEET_NAMES abaixo.
 * ============================================================
 */

// ── Nomes das abas na planilha (ajuste se necessário) ──────────────────────
const SHEET_NAMES = {
  municipios:  'Municipios',
  orcamento:   'Orcamento',
  apoiadores:  'Apoiadores',
  financeiro:  'Financeiro',
};

// ── Ponto de entrada HTTP GET ──────────────────────────────────────────────
function doGet(e) {
  const section = (e.parameter.section || 'all').toLowerCase();

  let payload;
  try {
    switch (section) {
      case 'municipios':  payload = getMunicipios();  break;
      case 'orcamento':   payload = getOrcamento();   break;
      case 'apoiadores':  payload = getApoiadores();  break;
      case 'financeiro':  payload = getFinanceiro();  break;
      default:            payload = getAll();         break;
    }
  } catch (err) {
    payload = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Lê uma aba e retorna array de objetos usando a 1ª linha como cabeçalho */
function sheetToObjects(sheetName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Aba não encontrada: ' + sheetName);

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const rows    = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Pula linhas completamente vazias
    if (row.every(cell => cell === '' || cell === null)) continue;

    const obj = {};
    headers.forEach((h, j) => {
      let val = row[j];
      // Converte datas do Sheets para string legível
      if (val instanceof Date) val = Utilities.formatDate(val, 'America/Cuiaba', 'dd/MM/yyyy');
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

/** Retorna todos os dados de uma vez */
function getAll() {
  return {
    municipios:  getMunicipios(),
    orcamento:   getOrcamento(),
    apoiadores:  getApoiadores(),
    financeiro:  getFinanceiro(),
    meta: {
      gerado_em: new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })
    }
  };
}

// ── Leitores por seção ─────────────────────────────────────────────────────

function getMunicipios() {
  const rows = sheetToObjects(SHEET_NAMES.municipios);
  return rows.map(r => ({
    ordem:      toInt(r['Ordem']       || r['ordem']       || r['#']),
    municipio:  str(r['Municipio']     || r['Município']   || r['municipio']),
    regiao:     str(r['Regiao']        || r['Região']      || r['regiao']),
    prioridade: str(r['Prioridade']    || r['prioridade']),
    eleitores:  toInt(r['Eleitores']   || r['eleitores']),
    votos_2018: toInt(r['Votos2018']   || r['Votos 2018']  || r['votos_2018']),
    votos_2022: toInt(r['Votos2022']   || r['Votos 2022']  || r['votos_2022']),
    meta_min:   toInt(r['MetaMin']     || r['Meta Min']    || r['meta_min']    || r['Meta Minima']),
    meta_ideal: toInt(r['MetaIdeal']   || r['Meta Ideal']  || r['meta_ideal']  || r['Meta Ideal']),
  })).filter(r => r.municipio);
}

function getOrcamento() {
  const rows = sheetToObjects(SHEET_NAMES.orcamento);
  return rows.map(r => ({
    item:   str(r['Item']       || r['item']),
    tipo:   str(r['Tipo']       || r['tipo']),
    v2022:  toFloat(r['2022']   || r['v2022'] || r['Valor2022']),
    v2026:  toFloat(r['2026']   || r['v2026'] || r['Valor2026'] || r['Previsto2026']),
  })).filter(r => r.item);
}

function getApoiadores() {
  const rows = sheetToObjects(SHEET_NAMES.apoiadores);
  return rows.map(r => ({
    nome:        str(r['Nome']        || r['nome']),
    municipio:   str(r['Municipio']   || r['Município']  || r['municipio']),
    perfil:      str(r['Perfil']      || r['perfil']),
    categoria:   str(r['Categoria']   || r['categoria']  || r['cat']),
    situacao:    str(r['Situacao']    || r['Situação']   || r['situacao']   || r['Status']),
    candidato:   str(r['Candidato']   || r['candidato']  || r['Cand2024']   || r['Candidato 2024']),
  })).filter(r => r.nome);
}

function getFinanceiro() {
  const rows = sheetToObjects(SHEET_NAMES.financeiro);
  return rows.map(r => ({
    municipio:   str(r['Municipio']   || r['Município']  || r['municipio']),
    votos_2022:  toInt(r['Votos2022'] || r['Votos 2022'] || r['votos_2022']),
    gasto_total: toFloat(r['GastoTotal']|| r['Gasto Total']|| r['gasto_total']),
    pessoal:     toFloat(r['Pessoal']   || r['pessoal']),
    combustivel: toFloat(r['Combustivel']|| r['Combustível']|| r['combustivel']),
    apoiador:    toFloat(r['Apoiador']  || r['apoiador']),
    dia_d:       toFloat(r['DiaD']      || r['Dia D']    || r['dia_d']),
  })).filter(r => r.municipio);
}

// ── Utilitários de tipo ────────────────────────────────────────────────────
function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? 0 : n; }
function str(v)     { return v === undefined || v === null ? '' : String(v).trim(); }
