# Autorizar impressão de contrato (Google Apps Script)

O botão **imprimir** na página de contratos precisa de permissão para:

- **Google Drive** — copiar o modelo e salvar o PDF
- **Google Docs** — substituir os marcadores `{{nome-completo}}`, etc.

O modelo é **um único Google Doc** chamado **`modelo-contrato`** (não monta o texto do zero).

Link do modelo:  
https://docs.google.com/document/d/1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s/edit

---

## 1. Conferir o arquivo modelo

1. No Google Drive, o documento deve se chamar **`modelo-contrato`** (tipo Google Docs).
2. Renomear **não muda o ID** — o código usa o ID acima e, se falhar, busca pelo nome.
3. Dentro do documento, use marcadores como:
   - `{{nome-completo}}` ou `{{ nome-completo }}`
   - `{{cpf}}` ou `{ {cpf} }` (com espaços também funciona)
   - `{{nome-mae}}`
   - `{{nome-pai}}`
   - `{{municipio}}`
   - `{{coordenador}}`
   - `{{tipo-contrato}}`
4. **Compartilhar** o `modelo-contrato` com o e-mail da conta que publica o Web App (veja passo 3), com permissão de **Leitor** ou **Editor**.

---

## 2. Atualizar o código no Apps Script

1. Abra https://script.google.com e o projeto do **Eleição 2026**.
2. Substitua o conteúdo de `BackendPlanilhas.gs` pela versão do repositório.
3. (Recomendado) Crie/edite o arquivo **`appsscript.json`** no projeto:
   - No editor: ⚙️ **Configurações do projeto** → marque **“Mostrar arquivo de manifesto appsscript.json”**
   - Cole o conteúdo de `apps-script/appsscript.json` do repositório (declara escopos Drive + Docs).
4. **Salvar** (Ctrl+S).

---

## 3. Descobrir qual conta executa o script

1. No Apps Script: **Implantar** → **Gerenciar implantações**.
2. Abra a implantação do **Web App**.
3. Anote:
   - **Executar como:** em geral **“Eu (seu e-mail)”** — essa conta precisa das permissões.
   - **Quem tem acesso:** quem usa o site.

A conta em **“Executar como”** deve:

- Ser dona ou ter acesso ao `modelo-contrato`
- Ser dona das planilhas do projeto
- Ser a mesma que você usa ao clicar **Executar** no editor (passo 4)

---

## 4. Autorizar no editor (obrigatório)

Faça **nesta ordem**, logado na **mesma conta** do passo 3:

### 4.1 `autorizarImpressaoContrato`

1. No editor, selecione a função **`autorizarImpressaoContrato`** no menu de funções.
2. Clique **Executar**.
3. Se aparecer **“Autorização necessária”**:
   - Clique **Revisar permissões**
   - Escolha a conta correta
   - Se disser “Google não verificou o app”: **Avançado** → **Acessar Eleição 2026 (não seguro)**
   - Aceite **todas** as permissões (Planilhas, Drive, Documentos).
4. Abra **Execuções** (ícone de relógio à esquerda) ou **Exibir → Registros de execução**.
5. Deve aparecer: `Modelo encontrado: modelo-contrato | id: ...`

### 4.2 `testarImpressaoContrato`

1. Selecione **`testarImpressaoContrato`** → **Executar**.
2. Autorize de novo se pedir.
3. Nos logs deve aparecer **URL do PDF**. Abra o link — se abrir, a impressão está OK no editor.

### 4.3 (Opcional) `autorizar`

Rode **`autorizar`** para incluir também Planilhas e Agenda de uma vez.

---

## 5. Republicar o Web App (obrigatório)

Autorizar no editor **não atualiza** a implantação antiga sozinho.

1. **Implantar** → **Gerenciar implantações**.
2. Clique ✏️ **Editar** na implantação do Web App.
3. Em **Versão**: escolha **Nova versão**.
4. Confirme **Executar como: Eu** (mesma conta do passo 4).
5. **Implantar**.
6. A URL do Web App pode continuar a mesma — não precisa mudar `config.js` se a URL não mudou.

---

## 6. Testar no site

1. Recarregue o sistema com **Ctrl+F5**.
2. Vá em **pessoal → contratos**.
3. Clique no ícone **imprimir** em um registro.
4. Deve abrir uma nova aba com o PDF.

---

## Erros comuns

| Mensagem | O que fazer |
|----------|-------------|
| `DriveApp.getFileById` sem permissão | Repita passos 4 e 5; confira `appsscript.json` com escopo `drive`. |
| Modelo não encontrado | Verifique o nome `modelo-contrato` no Drive ou o ID em `CONTRATO_TEMPLATE_DOC_ID`. |
| Funciona no editor, falha no site | Republicar **nova versão** (passo 5). |
| PDF vazio / marcadores não trocados | Confira grafia dos `{{marcadores}}` no Doc. |
| Conta errada | “Executar como” e a conta que autorizou no editor devem ser a mesma. |

---

## Marcadores suportados no modelo

| Marcador | Campo da planilha |
|----------|-------------------|
| `{{nome-completo}}` | nome completo |
| `{{nome-mae}}` | nome mãe |
| `{{nome-pai}}` | nome pai |
| `{{cpf}}` | CPF |
| `{{titulo-eleitor}}` | título de eleitor |
| `{{municipio}}` | município |
| `{{coordenador}}` | coordenador |
| `{{tipo-contrato}}` | tipo de contrato |
| `{{recebe-bolsa-familia}}` | bolsa família |
| `{{lancamento-sistema}}` | lançar sistema |
| `{{chave-pix}}` | chave pix |

Qualquer cabeçalho da planilha também funciona como `{{nome-da-coluna}}`.
