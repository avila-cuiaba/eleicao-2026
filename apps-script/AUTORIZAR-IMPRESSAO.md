# Autorizar impressão de contrato (Google Apps Script)

O botão **imprimir** na página de contratos precisa de permissão para:

- **Google Drive** — copiar o modelo e salvar o PDF
- **Google Docs** — substituir os marcadores `{{nome-completo}}`, etc.

O modelo é **um único Google Doc** chamado **`modelo-contrato`** (não monta o texto do zero).

Na **impressão**, o Web App **não lê o `.docx` do repositório**: copia o Google Doc no Drive, troca os `{{marcadores}}` e gera o PDF. **Toda a formatação vem do Google Doc modelo** (o script não altera fonte nem espaçamento na impressão).

Link do modelo:  
https://docs.google.com/document/d/1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s/edit

---

## 1. Conferir o arquivo modelo

1. No Google Drive, o documento deve se chamar **`modelo-contrato`** (tipo Google Docs).
2. Renomear **não muda o ID** — o código usa o ID acima e, se falhar, busca pelo nome.
3. O texto do contrato segue o modelo **`Contrato de Trabalho JOSIMEIRE.doc`** (prestação de serviço para campanha eleitoral), atualizado para **Eleição 2026**.
4. Para aplicar o texto no Google Doc automaticamente, rode no editor Apps Script a função **`atualizarModeloContratoNoDrive`** (passo 4.4) — formatação básica (título centralizado, seções em negrito).
5. **Recomendado:** edite `apps-script/modelo-contrato.docx` no PC e **suba a versão para o Drive** (passo abaixo). O arquivo no Git **não** atualiza o Google Doc sozinho.
6. Marcadores dinâmicos (substituídos na impressão):

   **Colaborador (planilha):**
   - `{{nome-completo}}`, `{{cpf}}`, `{{nome-mae}}`, `{{nome-pai}}`
   - `{{titulo-eleitor}}`, `{{municipio}}`, `{{coordenador}}`, `{{tipo-contrato}}`
   - `{{recebe-bolsa-familia}}`, `{{lancamento-sistema}}`, `{{chave-pix}}`

   **Campanha / contrato (calculados pelo backend):**
   - `{{titulo-eleicoes}}` — ex.: ELEIÇÕES 2026
   - `{{ano-campanha}}` — ex.: 2026
   - `{{contratante-bloco}}` — razão social, CNPJ e representante
   - `{{contratado-bloco}}` — nome, documentos e município do colaborador
   - `{{objeto-servico}}`, `{{carga-horaria}}` — conforme tipo de contrato
   - `{{valor-remuneracao}}`, `{{valor-extenso}}` — conforme tipo de contrato
   - `{{cargo-candidato}}`, `{{data-fim-campanha}}`, `{{foro}}`
   - `{{local-assinatura}}`, `{{data-contrato}}` — data do dia na impressão (dd/MM/yyyy)
   - `{{data-contrato-extenso}}` — mesma data por extenso (ex.: 24 de julho de 2026)

7. **Compartilhar** o `modelo-contrato` com o e-mail da conta que publica o Web App (veja passo 3), com permissão de **Leitor** ou **Editor**.

Dados fixos (CNPJ, endereço, valores por tipo) ficam em **`CONTRATO_CAMPANHA`** no `BackendPlanilhas.gs`.

---

## 1.1. Sincronizar `modelo-contrato.docx` do PC → Google Drive

Se você alterou o `.docx` na pasta do projeto e o PDF **ainda sai com texto antigo**, é porque a impressão usa **só** o Google Doc no Drive (ID fixo em `CONTRATO_TEMPLATE_DOC_ID`), não o arquivo do disco.

**Opção A — substituir o conteúdo do Doc que o sistema já usa (mesmo ID)**

1. Abra o modelo no navegador:  
   https://docs.google.com/document/d/1WTHAVXrJ4z-IbJmP-pKqmO56WRRm9oUQTSIWcuYOL2s/edit  
2. No Google Doc: **Arquivo → Abrir → Fazer upload** → escolha `apps-script/modelo-contrato.docx`.  
3. Abra o documento **recém-criado** pelo upload (convertido em Google Docs).  
4. **Ctrl+A** no Doc novo → **Ctrl+C**.  
5. Volte ao Doc do link do passo 1 → **Ctrl+A** → **Ctrl+V** (substitui todo o texto).  
6. Confira se os `{{marcadores}}` continuam intactos.  
7. Teste **imprimir** um contrato na web (não precisa republicar o Web App só por mudança de texto no Doc).

**Opção B — novo arquivo no Drive (trocar o ID no código)**

1. Faça upload do `.docx` no Drive → **Abrir com → Google Documentos**.  
2. Renomeie para **`modelo-contrato`**.  
3. Copie o **ID** da URL (`/document/d/ESTE_ID/edit`).  
4. Em `BackendPlanilhas.gs`, altere `CONTRATO_TEMPLATE_DOC_ID` para esse ID, salve, **reimplante** o Web App.  
5. Compartilhe o Doc com a conta que executa o script.

**Não use** `atualizarModeloContratoNoDrive()` depois de editar o Word — essa função **apaga** o Doc e grava o texto **antigo** que está fixo no código.

**Relatório da barra do `principal.html`** (ícone imprimir relatório) **não** usa este modelo; é outra coisa (tabela HTML via `relatorio.js`).

**Word / PDF com linhas “esticadas” na página:** costuma ser o **modelo no Google Doc** (espaço entre parágrafos ou colagem do Word). No Doc: **Ctrl+A** → **Formatar → Espaçamento de linha e parágrafo → Simples** e remova espaço antes/depois. Ou rode **uma vez** no Apps Script a função **`repararEspacamentoModeloContratoNoDrive()`** (só no modelo do Drive, não na impressão). Use um parágrafo só para `CONTRATANTE: {{contratante-bloco}}`. No Word, layout vertical **Superior**, não justificado na vertical.

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

### 4.4 `atualizarModeloContratoNoDrive`

1. Selecione **`atualizarModeloContratoNoDrive`** → **Executar**.
2. Isso reescreve o Google Doc `modelo-contrato` com o texto padrão Eleição 2026 (cláusulas, assinaturas, marcadores).
3. Nos logs deve aparecer a URL do modelo atualizado.
4. Depois rode **`testarImpressaoContrato`** para validar o PDF.

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

| Marcador | Origem |
|----------|--------|
| `{{nome-completo}}` | planilha — nome completo |
| `{{nome-mae}}` | planilha — nome mãe |
| `{{nome-pai}}` | planilha — nome pai |
| `{{cpf}}` | planilha — CPF (formatado) |
| `{{titulo-eleitor}}` | planilha — título de eleitor |
| `{{municipio}}` | planilha — município |
| `{{coordenador}}` | planilha — coordenador |
| `{{tipo-contrato}}` | planilha — tipo de contrato |
| `{{contratante-bloco}}` | `CONTRATO_CAMPANHA` — razão social e representante |
| `{{contratado-bloco}}` | montado a partir dos dados do colaborador |
| `{{objeto-servico}}` | conforme tipo de contrato |
| `{{carga-horaria}}` | conforme tipo de contrato |
| `{{valor-remuneracao}}` | conforme tipo de contrato |
| `{{valor-extenso}}` | conforme tipo de contrato |
| `{{ano-campanha}}` | `CONTRATO_CAMPANHA.ANO` (2026) |
| `{{data-fim-campanha}}` | fim da campanha (04/10/2026) |
| `{{data-contrato}}` | data do dia na impressão (dd/MM/yyyy) |
| `{{data-contrato-extenso}}` | mesma data por extenso (ex.: 24 de julho de 2026) |
| `{{local-assinatura}}` | ex.: CUIABÁ-MT |

Qualquer cabeçalho da planilha também funciona como `{{nome-da-coluna}}`.
