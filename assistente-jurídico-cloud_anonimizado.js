/**
 * ASSISTENTE JURÍDICO CLOUD - Versão 14.5 (Estabilizada & Debug Inteligente)
 * - Motor: Gemini 2.5 Flash Lite
 * - Filtro: Critério penal amplo (Exclui: Tributário, Empresarial, Constitucional, Civil)
 * - Rigor: Identificação de Processo, Tema e Data obrigatórios.
 * - Debug Inteligente: Só envia o texto bruto se NÃO encontrar julgados.
 */

// --- CONFIGURAÇÕES ---
const GEMINI_API_KEY = "<CHAVE_API_GEMINI>";
const MODEL_NAME = "gemini-2.5-flash-lite";
const FOLDER_ID = "<ID_PASTA_GOOGLE_DRIVE>";
const EMAIL_DESTINO = "<EMAIL_DESTINO>";
const STATE_FILE_NAME = "informativo_estado.json";

// MODO DE INVESTIGAÇÃO (Envia o texto bruto por e-mail para auditoria)
const MODO_DEBUG = true;

function main() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  let state = getOrCreateState(folder);

  const nSTF = state.stf_next;
  const nSTJ = state.stj_next;

  console.log(`🚀 Iniciando Varredura: STF ${nSTF} e STJ ${nSTJ}...`);

  let resultadosHtml = "";
  let logsCaptura = [];
  let houveSucessoGeral = false;

  // --- 1. PROCESSAR STF ---
  let contSTF = buscarPdfDizerDireito(nSTF, "stf");
  if (contSTF && contSTF.length > 200) {
    let analise = pedirAnaliseGemini(contSTF, `STF ${nSTF}`);

    if (analise.startsWith("ERRO_")) {
      if (MODO_DEBUG) enviarTextoBrutoDebug(contSTF, `STF_${nSTF}`); // Envia debug se der erro
      resultadosHtml += `<p style="color:red;"><b>⚠️ Falha na API (STF ${nSTF}):</b> ${analise}</p>`;
      houveSucessoGeral = true;
    } else if (analise && !analise.includes("SEM_CONTEUDO")) {
      // SUCESSO! Achou penal, NÃO envia debug.
      resultadosHtml += `<br><h2 style="color:#1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 5px;">Informativo STF ${nSTF}</h2>` + analise;
      houveSucessoGeral = true;
      state.stf_next++;
      logsCaptura.push(`✅ STF ${nSTF}`);
    } else {
      // SEM CONTEÚDO
      if (MODO_DEBUG) enviarTextoBrutoDebug(contSTF, `STF_${nSTF}`); // Envia debug para conferência manual
      state.stf_next++;
      logsCaptura.push(`✅ STF ${nSTF} (Lido, sem penal)`);
    }
  } else {
    logsCaptura.push(`❌ STF ${nSTF} (Falha OCR)`);
  }

  // --- 2. PROCESSAR STJ ---
  let contSTJ = buscarPdfDizerDireito(nSTJ, "stj");
  if (contSTJ && contSTJ.length > 200) {
    let analise = pedirAnaliseGemini(contSTJ, `STJ ${nSTJ}`);

    if (analise.startsWith("ERRO_")) {
      if (MODO_DEBUG) enviarTextoBrutoDebug(contSTJ, `STJ_${nSTJ}`); // Envia debug se der erro
      resultadosHtml += `<br><p style="color:red;"><b>⚠️ Falha na API (STJ ${nSTJ}):</b> ${analise}</p>`;
      houveSucessoGeral = true;
    } else if (analise && !analise.includes("SEM_CONTEUDO")) {
      // SUCESSO! Achou penal, NÃO envia debug.
      resultadosHtml += `<br><br><h2 style="color:#1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 5px;">Informativo STJ ${nSTJ}</h2>` + analise;
      houveSucessoGeral = true;
      state.stj_next++;
      logsCaptura.push(`✅ STJ ${nSTJ}`);
    } else {
      // SEM CONTEÚDO
      if (MODO_DEBUG) enviarTextoBrutoDebug(contSTJ, `STJ_${nSTJ}`); // Envia debug para conferência manual
      state.stj_next++;
      logsCaptura.push(`✅ STJ ${nSTJ} (Lido, sem penal)`);
    }
  } else {
    logsCaptura.push(`❌ STJ ${nSTJ} (Falha OCR)`);
  }

  saveState(folder, state);

  let saudacao = `<p>Olá, Wesley. Como seu assistente jurídico criminalista, analisei os informativos focando em matéria Penal e Processual Penal. Apliquei um critério amplo de inclusão, conforme solicitado. Abaixo os resultados identificados:</p>`;
  let htmlFinal = houveSucessoGeral ? saudacao + resultadosHtml : "<h3>ℹ️ Nenhuma tese criminal identificada nesta rodada.</h3>";

  GmailApp.sendEmail(EMAIL_DESTINO, `Informativos: STF ${nSTF} | STJ ${nSTJ}`, "", {
    htmlBody: htmlFinal + `<br><hr><small>Logs: ${logsCaptura.join(' | ')}</small>`
  });
}

function enviarTextoBrutoDebug(texto, rotulo) {
  GmailApp.sendEmail(
    EMAIL_DESTINO,
    `🔍 DEBUG TEXTO BRUTO: ${rotulo}`,
    `A Inteligência Artificial NÃO identificou matéria penal neste informativo (ou ocorreu um erro).\n\nO conteúdo lido pelo OCR está anexado em formato .txt para sua conferência manual.`,
    { attachments: [Utilities.newBlob(texto, 'text/plain', `debug_${rotulo}.txt`)] }
  );
}

function buscarPdfDizerDireito(n, tribunal) {
  const anos = ["2024", "2025", "2026", "2023"];
  const meses = ["12", "11", "10", "09", "08", "07", "06", "05", "04", "03", "02", "01"];

  for (let ano of anos) {
    for (let mes of meses) {
      const variacoes = [
        `info-${n}-${tribunal}-resumido.pdf`,
        `info-${n}-${tribunal}.pdf`
      ];

      for (let nomeArq of variacoes) {
        let url = `https://dizerodireito.net/wp-content/uploads/${ano}/${mes}/${nomeArq}`;
        try {
          let res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
          const contentType = res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'];

          if (res.getResponseCode() === 200 && contentType.includes('application/pdf')) {
            console.log(`✅ PDF Localizado: ${url}`);
            return fetchPdfViaOCR_v3(url, `${tribunal}_${n}`);
          }
        } catch (e) { continue; }
      }
    }
  }
  return null;
}

function fetchPdfViaOCR_v3(url, label) {
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const blob = response.getBlob();
    const resource = { name: `TEMP_OCR_${label}`, mimeType: 'application/vnd.google-apps.document' };
    const tempFile = Drive.Files.create(resource, blob);
    Utilities.sleep(7500);
    const doc = DocumentApp.openById(tempFile.id);
    const text = doc.getBody().getText();
    Drive.Files.remove(tempFile.id);
    return text;
  } catch (e) { return null; }
}

function pedirAnaliseGemini(textoBruto, rotulo) {
  const prompt = `Você é um Juiz de Direito Especialista em Direito Penal. Analise o documento ${rotulo}.

DIRETRIZ DE FILTRAGEM:
1. Extraia julgados de natureza Penal ou Processual Penal. Adote um critério MENOS RESTRITIVO para o que seja penal (crimes, inquéritos, execuções, contravenções, etc).
2. EXCLUSÃO OBRIGATÓRIA: Ignore e exclua rigorosamente julgados de Direito Tributário, Empresarial, Constitucional (puro) e Civil.
3. Se não houver nada penal no texto, responda apenas: SEM_CONTEUDO.

REGRAS DE FORMATAÇÃO (HTML):
Cada julgado deve necessariamente vir acompanhado da identificação do processo, tema e data do julgamento. Use o formato:

<h4 style="color:#1a237e; margin-bottom: 5px;">{Tema Central}</h4>
<p style="font-size: 14px; margin-top: 0;"><b>Processo:</b> {Identificação} | <b>Data de Julgamento:</b> {Data}</p>
<div style="background:#f8f9fa; padding:12px; border-left:4px solid #1a237e; margin-bottom: 15px;">
  <b>Tese Fixada:</b> {Texto da tese fixada no informativo}
</div>
<p style="font-size: 14px;">{Resumo didático do julgado}</p>

TEXTO DO INFORMATIVO:
${textoBruto.substring(0, 35000)}`;

  return callGemini(prompt);
}

// SISTEMA DE RETRY (TEIMOSIA) CONTRA ERROS DE SERVIDOR
function callGemini(prompt, tentativasMaximas = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  for (let t = 1; t <= tentativasMaximas; t++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const json = JSON.parse(response.getContentText());

      if (code === 200 && json.candidates && json.candidates[0].content) {
        return json.candidates[0].content.parts[0].text.replace(/```html|```/g, "").trim();
      }

      if (code === 503 || code === 429 || (json.error && json.error.message.includes("high demand"))) {
        console.log(`⚠️ Servidor ocupado (Tentativa ${t}). Aguardando 10 segundos...`);
        if (t === tentativasMaximas) return `ERRO_API: Servidor sobrecarregado.`;
        Utilities.sleep(10000);
        continue;
      }

      return `ERRO_API: ${json.error?.message || code}`;
    } catch (e) {
      if (t === tentativasMaximas) return `ERRO_FETCH: ${e.message}`;
      Utilities.sleep(10000);
    }
  }
  return "ERRO_DESCONHECIDO";
}

function getOrCreateState(folder) {
  const files = folder.getFilesByName(STATE_FILE_NAME);
  if (files.hasNext()) return JSON.parse(files.next().getBlob().getDataAsString());
  const def = { stf_next: 1153, stj_next: 859 };
  folder.createFile(STATE_FILE_NAME, JSON.stringify(def));
  return def;
}

function saveState(folder, state) {
  const files = folder.getFilesByName(STATE_FILE_NAME);
  if (files.hasNext()) files.next().setContent(JSON.stringify(state));
}
