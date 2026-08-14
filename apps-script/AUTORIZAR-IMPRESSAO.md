# Autorizar impressão de contrato (Google Apps Script)

O botão **imprimir** na página de contratos precisa de permissão para:

- **Google Drive** — copiar o modelo e salvar o PDF
- **Google Docs** — substituir os marcadores `{{...}}`

O modelo é **um único Google Doc** chamado **`modelo-contrato`**.

Na **impressão**, o Web App copia esse Google Doc no Drive, troca os marcadores e gera o PDF. **Não há arquivo Word no repositório** — edite o modelo diretamente no Drive.

Link do modelo:  
https://docs.google.com/document/d/1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s/edit

---

## 1. Conferir o arquivo modelo

1. No Google Drive, o documento deve se chamar **`modelo-contrato`** (tipo Google Docs).
2. Edite o texto e a formatação **diretamente no Google Doc** (link acima).
3. **CONTRATANTE / Administrador Financeiro** ficam **fixos no modelo** (não são substituídos na impressão).

### Marcadores substituídos na impressão

| Marcador | Origem |
|----------|--------|
| `{{contratado-bloco}}` | Nome (negrito), CPF e município do colaborador (montado pelo backend) |
| `{{carga-horaria}}` | Coluna M `tipo-contrato`: meio período → `04`; integral/líder → `08` (o texto "horas diárias" fica no modelo) |
| `{{valor-salario}}` | Coluna O `valor-contrato` (formato `600,00`) |
| `{{valor-salario-extenso}}` | **Automático** a partir de `valor-contrato` (não precisa coluna na planilha) |
| `{{local-assinatura}}` | Coluna H `local-assinatura` |
| `{{data-contrato-extenso}}` | Coluna AD `data-contrato` (por extenso, ex.: 15 de agosto de 2026) |

**Não é necessária** coluna `valor-salario-extenso` na planilha — o extenso é calculado no Apps Script.

4. **Compartilhar** o `modelo-contrato` com a conta que publica o Web App (Leitor ou Editor).

---

## 2. Atualizar o código no Apps Script

1. Cole o `BackendPlanilhas.gs` atualizado no editor.
2. **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.

---

## 3. Republicar após mudanças

- **Só texto no Google Doc:** não precisa republicar o Web App.
- **Mudanças no `BackendPlanilhas.gs`:** republicar o Web App.

---

## 4. Testar no editor Apps Script

1. `autorizarImpressaoContrato()` — concede Drive + Docs.
2. `testarImpressaoContrato()` — gera PDF de teste (ver Registros de execução).

**Não use** `atualizarModeloContratoNoDrive()` para reescrever o texto — ela só registra o modelo atual no log.
