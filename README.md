# Assistente Jurídico Cloud v14.5

Bot automatizado que monitora diariamente informativos de jurisprudência do **STF** (Superior Tribunal Federal) e **STJ** (Superior Tribunal de Justiça), filtra apenas matérias penais relevantes usando IA Generativa, e encaminha um resumo estruturado por e-mail.

## 🎯 Funcionalidade Principal

- ✅ Busca PDFs dos informativos STF e STJ em [dizerodireito.net](https://dizerodireito.net)
- ✅ Converte PDFs para texto usando **OCR** (Google Drive API)
- ✅ Analisa conteúdo com **Gemini 2.5 Flash Lite** (critério penal amplo)
- ✅ Envia e-mail com teses fixadas, processos identificados e datas de julgamento
- ✅ Retry automático contra erros de servidor (até 3 tentativas)
- ✅ Sistema de estado persistente (evita reprocessamento)

## ⚙️ Configuração

### Pré-requisitos

- Conta Google com Apps Script ativado
- Google Drive API habilitada
- Gmail API habilitada
- Chave de API do Gemini ([obter em](https://aistudio.google.com/app/apikey))

### Parâmetros de Configuração

Edite as constantes no início do script:

```javascript
const GEMINI_API_KEY = "<CHAVE_API_GEMINI>";      // Sua chave Gemini
const MODEL_NAME = "gemini-2.5-flash-lite";       // Modelo IA
const FOLDER_ID = "<ID_PASTA_GOOGLE_DRIVE>";      // ID da pasta para armazenar estado
const EMAIL_DESTINO = "<EMAIL_DESTINO>";          // E-mail que receberá os informativos
const MODO_DEBUG = true;                           // true = envia texto bruto em caso de erro
```

## 📊 Fluxo de Execução

```
main()
  ├─ buscarPdfDizerDireito() → Localiza PDF no site
  │   └─ fetchPdfViaOCR_v3() → Converte PDF para texto
  │
  ├─ pedirAnaliseGemini() → Extrai teses penais
  │   └─ callGemini() → Chama API com retry automático
  │
  └─ GmailApp.sendEmail() → Envia resultado estruturado
```

## 🛡️ Tratamento de Erros

| Erro | Resposta |
|------|----------|
| **Falha OCR** | Pula para próximo número; registra como ❌ |
| **API Gemini 503/429** | Retry automático (até 3x, aguarda 10s) |
| **Sem conteúdo penal** | Se `MODO_DEBUG=true`: envia texto bruto por email |
| **Erro desconhecido** | Continua processamento; registra nos logs |

## ⚖️ Critério de Filtragem Penal

### INCLUIR
- Crimes e execuções penais
- Inquéritos e processos penais
- Contravenções penais
- Processual Penal
- Casos com aspecto penal secundário (critério amplo)

### EXCLUIR
- ❌ Direito Tributário
- ❌ Direito Empresarial
- ❌ Constitucional puro
- ❌ Civil puro

**Retorno se vazio:** `SEM_CONTEUDO`

## 🔗 Dependências

- Google Apps Script
- Google Drive API
- Gmail API
- Gemini API v1beta
- UrlFetchApp (integrado no Apps Script)

## ⏰ Agendamento

### Via Apps Script (Recomendado)

1. Abra o editor de Apps Script
2. Clique em **⏱️ Triggers** (Acionadores)
3. Crie um novo trigger:
   - **Função:** `main`
   - **Tipo de evento:** Baseado em tempo
   - **Frequência:** Diária
   - **Horário:** Manhã (ex: 8:00 AM)

### Execução Manual

Clique em ▶️ (Play) no editor do Apps Script para testar imediatamente.

## 📈 Rastreamento de Estado

O script mantém um arquivo `informativo_estado.json` na pasta do Drive:

```json
{
  "stf_next": 1153,
  "stj_next": 859
}
```

- **Propósito:** Evita reprocessar informativos já lidos
- **Atualização:** Incrementa automaticamente após cada sucesso

## 📧 Exemplo de E-mail Enviado

**Assunto:** `Informativos: STF 1153 | STJ 859`

**Corpo (HTML formatado):**

```
Olá, Wesley. Como seu assistente jurídico criminalista, analisei os informativos 
focando em matéria Penal e Processual Penal...

[Informativo STF 1153]
  
  ⚖️ Tese Fixada: ...
  
  Processo: 0000000-00.0000.0.00.0000 | Data: 01/01/2025
  Resumo: ...

[Informativo STJ 859]
  
  ⚖️ Tese Fixada: ...
  
  Logs: ✅ STF 1153 | ✅ STJ 859
```

## 📝 Notas de Implementação

- **Temperature=0.1:** IA produz análises mais focadas (menos criativa)
- **Limite de texto:** 35.000 caracteres por análise (proteção contra overflow)
- **OCR via Google Drive:** Converte PDF → Google Doc → Texto puro
- **Tamanho mínimo:** Ignora PDFs < 200 caracteres (invalida OCR)
- **HTML sanitizado:** Remove blocos ``` do response Gemini
- **Modo Debug:** Útil para auditar PDFs que não retornaram conteúdo penal

## 🚀 Como Usar

### 1. Criar repositório no Apps Script

```bash
# No editor do Apps Script, copie todo o conteúdo de assistente-jurídico-cloud_anonimizado.js
# Cole na aba "Código.gs"
```

### 2. Configurar credenciais

```javascript
// Edite as 4 linhas de configuração com seus dados reais
const GEMINI_API_KEY = "sua-chave-aqui";
const FOLDER_ID = "seu-id-pasta-aqui";
const EMAIL_DESTINO = "seu-email@gmail.com";
```

### 3. Adicionar triggers

1. Clique em **⏱️ Triggers**
2. Crie trigger diário para `main()`
3. Salve

### 4. Testar

Clique em ▶️ para rodar uma vez e verificar os logs.

## 🐛 Debug

Se algo der errado, verifique:

1. **Logs no Apps Script** (Ctrl+Enter ou ▶️ → Logs)
2. **Pasta do Drive existe?** Verifique `FOLDER_ID`
3. **Chave Gemini válida?** Teste em [aistudio.google.com](https://aistudio.google.com)
4. **Gmail API habilitada?** Acesse [console.cloud.google.com](https://console.cloud.google.com)
5. **MODO_DEBUG = true?** Você receberá e-mails com o texto bruto para análise manual

## 📄 Licença

MIT License - Sinta-se livre para usar, modificar e distribuir.

## 👤 Autor

Assistente Jurídico Cloud - Desenvolvido para juízes e profissionais de Direito Penal.

---

**Versão atual:** 14.5  
**Última atualização:** Abril 2026  
**Próximas melhorias:** Integração com jurisprudência adicional, filtros customizáveis
