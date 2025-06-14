// ========== 初期化 ==========
let editor;
let marp;
let currentSlide = 0;
let slideCount = 1;
let previewMode = "slide"; // "slide" or "markdown"
let autoSaveTimer = null;
let lastSavedContent = "";

// ========== DOM取得 ==========
const textarea = document.getElementById('markdown-editor');
const previewContent = document.getElementById('preview-content');
const charCount = document.getElementById('char-count');
const saveStatus = document.getElementById('save-status');
const slideCounter = document.getElementById('slide-counter');
const prevSlideBtn = document.getElementById('prev-slide');
const nextSlideBtn = document.getElementById('next-slide');
const previewToggleBtn = document.getElementById('preview-toggle');
const exportPdfBtn = document.getElementById('export-pdf');
const exportPptxBtn = document.getElementById('export-pptx');
const exportHtmlBtn = document.getElementById('export-html');
const saveMdBtn = document.getElementById('save-md-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const applySettingsBtn = document.getElementById('apply-settings');
const resetSettingsBtn = document.getElementById('reset-settings');
const themeSelect = document.getElementById('theme-select');
const fontSizeRadios = document.querySelectorAll('input[name="font-size"]');
const customFontSize = document.getElementById('custom-font-size');
const slideRatioSelect = document.getElementById('slide-ratio-select');
const backgroundColor = document.getElementById('background-color');
const textColor = document.getElementById('text-color');
const loading = document.getElementById('loading');
const errorDisplay = document.getElementById('error-display');
const errorMessage = document.getElementById('error-message');
const errorClose = document.getElementById('error-close');
const successDisplay = document.getElementById('success-display');
const successMessage = document.getElementById('success-message');
const successClose = document.getElementById('success-close');

// ========== 設定の初期値 ==========
const defaultSettings = {
  theme: "default",
  fontSize: "medium",
  customFontSize: 16,
  slideRatio: "16:9",
  backgroundColor: "#ffffff",
  textColor: "#000000"
};
let settings = {...defaultSettings};

// ========== Marp初期化 ==========
function initMarp() {
  marp = new Marp({
    html: true,
    themeSet: [],
    script: { source: 'cdn' }
  });
}
initMarp();

// ========== CodeMirror初期化 ==========
editor = CodeMirror.fromTextArea(textarea, {
  mode: 'markdown',
  lineNumbers: true,
  lineWrapping: true,
  theme: 'default'
});
editor.setSize('100%', '100%');

// ========== イベント登録 ==========
editor.on('change', handleEditorChange);
prevSlideBtn.addEventListener('click', () => { changeSlide(-1); });
nextSlideBtn.addEventListener('click', () => { changeSlide(1); });
previewToggleBtn.addEventListener('click', togglePreviewMode);
exportPdfBtn.addEventListener('click', exportPDF);
exportPptxBtn.addEventListener('click', exportPPTX);
exportHtmlBtn.addEventListener('click', exportHTML);
saveMdBtn.addEventListener('click', saveMarkdownFile);
settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);
applySettingsBtn.addEventListener('click', applySettings);
resetSettingsBtn.addEventListener('click', resetSettings);
successClose.addEventListener('click', () => { successDisplay.style.display = "none"; });
errorClose.addEventListener('click', () => { errorDisplay.style.display = "none"; });
fontSizeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    customFontSize.disabled = !document.getElementById('font-size-custom').checked;
  });
});
customFontSize.addEventListener('input', () => {
  document.getElementById('font-size-custom').checked = true;
});

// ========== 自動保存 ==========
function autoSave() {
  const content = editor.getValue();
  if (content !== lastSavedContent) {
    localStorage.setItem('marp-md', content);
    saveStatus.textContent = "保存済み";
    lastSavedContent = content;
  }
}
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(autoSave, 3000);
}
startAutoSave();

// ========== 初期データロード ==========
(function loadInitialData() {
  const saved = localStorage.getItem('marp-md');
  if (saved) {
    editor.setValue(saved);
    lastSavedContent = saved;
  } else {
    editor.setValue("# タイトル\n---\n## スライド2\n\n- 箇条書き\n- サンプル\n");
    lastSavedContent = editor.getValue();
  }
  updateCharCount();
  renderPreview();
})();

// ========== エディタ変更時の処理 ==========
function handleEditorChange() {
  updateCharCount();
  saveStatus.textContent = "未保存";
  renderPreview();
  startAutoSave();
}

// ========== 文字数カウント ==========
function updateCharCount() {
  charCount.textContent = `${editor.getValue().length} 文字`;
}

// ========== プレビュー描画 ==========
function renderPreview() {
  const md = editor.getValue();
  // 設定をYAML Frontmatterとして挿入
  const yaml = [
    "---",
    `theme: ${settings.theme}`,
    `size: ${settings.slideRatio}`,
    `backgroundColor: "${settings.backgroundColor}"`,
    `color: "${settings.textColor}"`,
    `fontSize: "${getFontSize()}"`,
    "---"
  ].join('\n');
  const mdWithYaml = `${yaml}\n${md}`;

  try {
    const { html, css } = marp.render(mdWithYaml);
    // スライド分割
    const slides = html.split(/<section class="marp-slide.*?<\/section>/gs)
      .filter(Boolean);
    slideCount = (html.match(/<section class="marp-slide/gs) || []).length || 1;
    if (currentSlide >= slideCount) currentSlide = slideCount - 1;
    if (currentSlide < 0) currentSlide = 0;

    // スライドプレビュー
    if (previewMode === "slide") {
      const slideHtml = html.match(/<section class="marp-slide.*?<\/section>/gs) || [];
      previewContent.innerHTML = (slideHtml[currentSlide] || "<p>スライドなし</p>") + `<style>${css}</style>`;
    } else {
      // Markdownプレビュー
      previewContent.innerHTML = `<pre style="white-space:pre-wrap">${escapeHtml(md)}</pre>`;
    }
    slideCounter.textContent = `${currentSlide + 1} / ${slideCount}`;
  } catch (e) {
    previewContent.innerHTML = `<div style="color:#b80000;">プレビューエラー: ${e.message}</div>`;
  }
}

// ========== スライド切り替え ==========
function changeSlide(delta) {
  currentSlide += delta;
  if (currentSlide < 0) currentSlide = 0;
  if (currentSlide >= slideCount) currentSlide = slideCount - 1;
  renderPreview();
}

// ========== プレビューモード切替 ==========
function togglePreviewMode() {
  previewMode = (previewMode === "slide") ? "markdown" : "slide";
  document.getElementById('preview-title').textContent =
    (previewMode === "slide") ? "リアルタイムプレビュー" : "Markdownプレビュー";
  renderPreview();
}

// ========== 設定UI ==========
function openSettings() {
  // 現在の設定をUIに反映
  themeSelect.value = settings.theme;
  slideRatioSelect.value = settings.slideRatio;
  backgroundColor.value = settings.backgroundColor;
  textColor.value = settings.textColor;
  if (settings.fontSize === "custom") {
    document.getElementById('font-size-custom').checked = true;
    customFontSize.value = settings.customFontSize;
    customFontSize.disabled = false;
  } else {
    document.getElementById(`font-size-${settings.fontSize}`).checked = true;
    customFontSize.disabled = true;
  }
  settingsPanel.classList.remove('hidden');
  settingsOverlay.classList.remove('hidden');
}
function closeSettings() {
  settingsPanel.classList.add('hidden');
  settingsOverlay.classList.add('hidden');
}
function applySettings() {
  settings.theme = themeSelect.value;
  settings.slideRatio = slideRatioSelect.value;
  settings.backgroundColor = backgroundColor.value;
  settings.textColor = textColor.value;
  fontSizeRadios.forEach(radio => {
    if (radio.checked) settings.fontSize = radio.value;
  });
  if (settings.fontSize === "custom") {
    settings.customFontSize = parseInt(customFontSize.value, 10) || 16;
  }
  closeSettings();
  renderPreview();
  showSuccess("設定を適用しました");
}
function resetSettings() {
  settings = {...defaultSettings};
  closeSettings();
  renderPreview();
  showSuccess("設定をリセットしました");
}
function getFontSize() {
  if (settings.fontSize === "small") return 12;
  if (settings.fontSize === "medium") return 16;
  if (settings.fontSize === "large") return 24;
  if (settings.fontSize === "custom") return settings.customFontSize;
  return 16;
}

// ========== ファイル保存・エクスポート ==========
function saveMarkdownFile() {
  const blob = new Blob([editor.getValue()], {type: "text/markdown"});
  downloadBlob(blob, "slide.md");
  showSuccess("Markdownを保存しました");
}
function exportHTML() {
  const md = editor.getValue();
  const yaml = [
    "---",
    `theme: ${settings.theme}`,
    `size: ${settings.slideRatio}`,
    `backgroundColor: "${settings.backgroundColor}"`,
    `color: "${settings.textColor}"`,
    `fontSize: "${getFontSize()}"`,
    "---"
  ].join('\n');
  const mdWithYaml = `${yaml}\n${md}`;
  const { html, css } = marp.render(mdWithYaml);
  const doc = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Marp Slide Export</title>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;
  const blob = new Blob([doc], {type: "text/html"});
  downloadBlob(blob, "slide.html");
  showSuccess("HTMLをエクスポートしました");
}
function exportPDF() {
  showLoading(true);
  setTimeout(() => {
    const md = editor.getValue();
    const yaml = [
      "---",
      `theme: ${settings.theme}`,
      `size: ${settings.slideRatio}`,
      `backgroundColor: "${settings.backgroundColor}"`,
      `color: "${settings.textColor}"`,
      `fontSize: "${getFontSize()}"`,
      "---"
    ].join('\n');
    const mdWithYaml = `${yaml}\n${md}`;
    const { html, css } = marp.render(mdWithYaml);
    // 全スライドを1ページずつPDF化
    const slideHtml = html.match(/<section class="marp-slide.*?<\/section>/gs) || [];
    const container = document.createElement('div');
    slideHtml.forEach(slide => {
      const div = document.createElement('div');
      div.innerHTML = slide + `<style>${css}</style>`;
      div.style.pageBreakAfter = 'always';
      container.appendChild(div);
    });
    html2pdf().from(container).set({
      margin: 0,
      filename: 'slide.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'landscape' }
    }).save().then(() => {
      showLoading(false);
      showSuccess("PDFをエクスポートしました");
    }).catch(err => {
      showLoading(false);
      showError("PDFエクスポート失敗: " + err.message);
    });
  }, 100);
}
function exportPPTX() {
  showLoading(true);
  setTimeout(() => {
    const md = editor.getValue();
    const yaml = [
      "---",
      `theme: ${settings.theme}`,
      `size: ${settings.slideRatio}`,
      `backgroundColor: "${settings.backgroundColor}"`,
      `color: "${settings.textColor}"`,
      `fontSize: "${getFontSize()}"`,
      "---"
    ].join('\n');
    const mdWithYaml = `${yaml}\n${md}`;
    const { html, css } = marp.render(mdWithYaml);
    // スライドごとにテキスト抽出
    const slideHtml = html.match(/<section class="marp-slide.*?<\/section>/gs) || [];
    const pptx = new PptxGenJS();
    slideHtml.forEach(slide => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = slide;
      let text = "";
      tempDiv.querySelectorAll('*').forEach(el => {
        if (el.childNodes.length && el.childNodes[0].nodeType === 3) {
          text += el.textContent + "\n";
        }
      });
      pptx.addSlide().addText(text.trim(), { x:0.5, y:0.5, w:9, h:5, fontSize: getFontSize(), color: settings.textColor, fill: { color: settings.backgroundColor } });
    });
    pptx.writeFile({ fileName: "slide.pptx" }).then(() => {
      showLoading(false);
      showSuccess("PPTXをエクスポートしました");
    }).catch(err => {
      showLoading(false);
      showError("PPTXエクスポート失敗: " + err.message);
    });
  }, 100);
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 500);
}

// ========== ローディング・メッセージ ==========
function showLoading(show) {
  loading.style.display = show ? "flex" : "none";
}
function showSuccess(msg) {
  successMessage.textContent = msg;
  successDisplay.style.display = "flex";
  setTimeout(() => { successDisplay.style.display = "none"; }, 2000);
}
function showError(msg) {
  errorMessage.textContent = msg;
  errorDisplay.style.display = "flex";
}

// ========== ユーティリティ ==========
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m];
  });
}
