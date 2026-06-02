# Eleição 2026

Aplicação web estática (HTML/JS/CSS) que **consulta e grava dados no Google Sheets**
usando o **Google Apps Script** como backend (Web App). O frontend pode ser hospedado
gratuitamente no **GitHub Pages**, sem necessidade de VPS.

## Arquitetura

```
[Formulário HTML/JS/CSS]  --fetch-->  [Apps Script Web App]  -->  [Google Sheets]
   (GitHub Pages)                         (backend)                 (dados)
```

## Estrutura

```
eleicao-2026/
├─ index.html          # tela inicial (consulta + formulário)
├─ css/style.css       # estilo
├─ js/config.js        # URL do Web App e nome da aba
├─ js/app.js           # GET (consultar) e POST (gravar)
├─ apps-script/BackendPlanilhas.gs # backend (doGet + doPost)
├─ .gitignore
└─ README.md
```

## Passo a passo

### 1. Criar a planilha no Google Sheets

1. Crie uma planilha nova.
2. Renomeie a primeira aba para `Dados`.
3. Na primeira linha, coloque os cabeçalhos: `data`, `nome`, `cidade`, `observacao`.
4. Na URL da planilha, copie o **ID**:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_É_O_ID`**`/edit`

### 2. Publicar o backend (Apps Script)

1. Na planilha: menu **Extensões > Apps Script**.
2. Apague o conteúdo padrão e cole o conteúdo de `apps-script/BackendPlanilhas.gs`.
3. Cadastre os IDs/gids das planilhas no objeto `PLANILHAS`.
4. Clique em **Implantar > Nova implantação**.
5. Tipo: **Aplicativo da Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Autorize quando solicitado e copie a **URL do app** (termina em `/exec`).

### 3. Configurar o frontend

1. Abra `js/config.js`.
2. Cole a URL do Web App em `WEB_APP_URL`.
3. Confirme que `ABA` é igual ao nome da aba (`Dados`).

### 4. Testar localmente

Abra `index.html` no navegador (ou use um servidor estático simples).
Com a URL configurada, a página lista os registros e o formulário grava novos.

### 5. Hospedar no GitHub Pages

1. Crie um repositório no GitHub e suba os arquivos.
2. No GitHub: **Settings > Pages**.
3. Source: branch `main`, pasta `/ (root)`.
4. Aguarde a URL pública (algo como `https://usuario.github.io/eleicao-2026/`).

## Observações

- O POST usa `Content-Type: text/plain` para evitar o *preflight* de CORS do navegador.
- O Google Sheets atende bem cargas pequenas/médias (cota da API ~60 req/min por usuário).
- **Nunca** versione chaves/credenciais (veja `.gitignore`).

## Pendências

- Definir o **ID da planilha**, os **nomes das abas** e os **cabeçalhos** definitivos,
  caso sejam diferentes do exemplo (`data`, `nome`, `cidade`, `observacao`).
