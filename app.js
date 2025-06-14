// グローバル変数
let marp;
let editor;
let currentSlideIndex = 0;
let totalSlides = 1;
let autoSaveTimer;
let isPreviewVisible = true;
let isSlideMode = true;
let currentSettings = {
    theme: 'default',
    fontSize: 'medium',
    customFontSize: 16,
    slideRatio: '16:9',
    backgroundColor: '#ffffff',
    textColor: '#000000'
};

// デフォルトMarkdown
const defaultMarkdown = `---
marp: true
theme: default
---

# Welcome to Marp Slide Converter
Powerful Markdown-based slide creation tool

---

## Features
- **Real-time Preview** 📺
- **Multiple Export Formats** 📁  
- **Auto-save Functionality** 💾
- **Responsive Design** 📱

---

## Getting Started
1. Write your slides in Markdown
2. See live preview on the right
3. Export to PDF, PPTX, or HTML
4. Share your presentation!

---

# Thank You!
Happy presenting! 🎉`;

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        showLoading();
        await waitForLibraries();
        await initializeMarp();
        await initializeEditor();
        initializeEventListeners();
        loadDefaultContent();
        hideLoading();
        showSuccess('アプリケーションが正常に初期化されました');
    } catch (error) {
        hideLoading();
        showError('アプリケーションの初期化に失敗しました: ' + error.message);
        console.error('Initialization error:', error);
        initializeFallback();
    }
});

// 外部ライブラリのロード待ち
function waitForLibraries() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkLibraries = () => {
            attempts++;
            const codeMirrorLoaded = typeof CodeMirror !== 'undefined';
            const markedLoaded = typeof marked !== 'undefined';
            const marpLoaded = typeof Marp !== 'undefined' && Marp.Marp;
            const pptxLoaded = typeof PptxGenJS !== 'undefined';
            console.log('Library status:', { codeMirror: codeMirrorLoaded, marked: markedLoaded, marp: marpLoaded, pptx: pptxLoaded });
            if ((codeMirrorLoaded && markedLoaded && marpLoaded && pptxLoaded) || attempts >= maxAttempts) {
                resolve();
            } else {
                setTimeout(checkLibraries, 200);
            }
        };
        checkLibraries();
    });
}

// Marp初期化
async function initializeMarp() {
    try {
        if (typeof Marp !== 'undefined' && Marp.Marp) {
            marp = new Marp.Marp({
                html: true,
                breaks: true
            });
            applyMarpSettings();
        } else {
            marp = null;
        }
    } catch (error) {
        marp = null;
    }
}

// Marp設定適用
function applyMarpSettings() {
    if (!marp) return;
    marp = new Marp.Marp({
        html: true,
        breaks: true
    });
    if (currentSettings.theme !== 'default') {
        marp.use(theme => {
            theme.theme = currentSettings.theme;
        });
    }
    const customCSS = generateCustomCSS();
    marp.use(theme => {
        theme.css += customCSS;
    });
}

// カスタムCSS生成
function generateCustomCSS() {
    const { backgroundColor, textColor, customFontSize } = currentSettings;
    return `
        section {
            background-color: ${backgroundColor};
            color: ${textColor};
            font-size: ${customFontSize}px;
        }
        section h1, section h2, section h3 {
            color: ${textColor};
        }
    `;
}

// CodeMirrorエディタ初期化
async function initializeEditor() {
    const textarea = document.getElementById('markdown-editor');
    if (typeof CodeMirror !== 'undefined') {
        editor = CodeMirror.fromTextArea(textarea, {
            mode: 'markdown',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: true,
            autofocus: true,
            indentUnit: 2,
            tabSize: 2,
            extraKeys: {
                'Ctrl-S': function() { saveMarkdownFile(); },
                'Ctrl-P': function() { togglePreview(); }
            }
        });
        editor.on('change', function() {
            updatePreview();
            updateCharCount();
            setSaveStatus('unsaved');
            scheduleAutoSave();
        });
    } else {
        initializeFallbackEditor(textarea);
    }
}

// フォールバックエディタ
function initializeFallbackEditor(textarea) {
    if (textarea) {
        textarea.addEventListener('input', function() {
            updatePreview();
            updateCharCount();
            setSaveStatus('unsaved');
            scheduleAutoSave();
        });
        editor = {
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value; },
            on: () => {}
        };
    }
}

// イベントリスナー
function initializeEventListeners() {
    const saveBtn = document.getElementById('save-md-btn');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportPptxBtn = document.getElementById('export-pptx');
    const exportHtmlBtn = document.getElementById('export-html');
    const settingsBtn = document.getElementById('settings-btn');
    const previewToggleBtn = document.getElementById('preview-toggle');
    const previewModeBtn = document.getElementById('preview-mode-toggle');
    if (saveBtn) saveBtn.addEventListener('click', saveMarkdownFile);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportToPDF());
    if (exportPptxBtn) exportPptxBtn.addEventListener('click', () => exportToPPTX());
    if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', () => exportToHTML());
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (previewToggleBtn) previewToggleBtn.addEventListener('click', togglePreview);
    if (previewModeBtn) previewModeBtn.addEventListener('click', togglePreviewMode);
    const settingsClose = document.getElementById('settings-close');
    const applyBtn = document.getElementById('apply-settings');
    const resetBtn = document.getElementById('reset-settings');
    const settingsOverlay = document.querySelector('.settings-overlay');
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    if (applyBtn) applyBtn.addEventListener('click', applySettings);
    if (resetBtn) resetBtn.addEventListener('click', resetSettings);
    if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettings);
    const errorClose = document.getElementById('error-close');
    const successClose = document.getElementById('success-close');
    if (errorClose) errorClose.addEventListener('click', hideError);
    if (successClose) successClose.addEventListener('click', hideSuccess);
    // スライドナビゲーション
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
}

// プレビューモード切替
function togglePreviewMode() {
    isSlideMode = !isSlideMode;
    const previewModeBtn = document.getElementById('preview-mode-toggle');
    if (previewModeBtn) {
        previewModeBtn.textContent = isSlideMode ? 'マークダウン表示' : 'スライド表示';
    }
    updatePreview();
    showSuccess(isSlideMode ? 'スライドモードに切り替えました' : 'マークダウンモードに切り替えました');
}

// プレビュー更新
async function updatePreview() {
    if (!editor) return;
    const markdown = editor.getValue();
    if (!markdown.trim()) {
        document.getElementById('preview-content').innerHTML = '<p>プレビューするMarkdownを入力してください</p>';
        return;
    }
    if (isSlideMode) {
        await updateSlidePreview(markdown);
    } else {
        await updateMarkdownPreview(markdown);
    }
}

// スライドプレビュー
async function updateSlidePreview(markdown) {
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        previewContainer.className = 'preview-container slide-mode';
    }
    const previewTitle = document.getElementById('preview-title');
    if (previewTitle) {
        previewTitle.className = '';
    }
    const previewControls = document.querySelector('.preview-controls');
    if (previewControls) {
        previewControls.className = 'preview-controls';
        previewControls.style.display = 'flex';
    }
    if (marp && typeof marp.render === 'function') {
        const result = marp.render(markdown);
        previewContent.innerHTML = `<style>${result.css}</style>${result.html}`;
        const slides = previewContent.querySelectorAll('section');
        totalSlides = slides.length;
        if (totalSlides > 0) {
            slides.forEach((slide, index) => {
                slide.style.display = index === currentSlideIndex ? 'block' : 'none';
            });
            updateSlideCounter();
        } else {
            previewContent.innerHTML = '<div>スライドが見つかりません</div>';
        }
    } else {
        createSimpleSlides();
    }
}

// マークダウンプレビュー
async function updateMarkdownPreview(markdown) {
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        previewContainer.className = 'preview-container markdown-mode';
    }
    const previewTitle = document.getElementById('preview-title');
    if (previewTitle) {
        previewTitle.className = 'markdown-mode';
    }
    const previewControls = document.querySelector('.preview-controls');
    if (previewControls) {
        previewControls.className = 'preview-controls markdown-mode';
        previewControls.style.display = 'none';
    }
    if (typeof marked !== 'undefined') {
        const html = marked.parse(markdown);
        previewContent.innerHTML = `<div class="markdown-preview">${html}</div>`;
    } else {
        const htmlContent = markdown.replace(/\n/g, '<br>');
        previewContent.innerHTML = `<div class="markdown-preview">${htmlContent}</div>`;
    }
}

// シンプルスライド（Marp未ロード時のフォールバック）
function createSimpleSlides() {
    const markdown = editor.getValue();
    const previewContent = document.getElementById('preview-content');
    const slideTexts = markdown.split(/^---$/m);
    const validSlides = slideTexts.filter(text => text.trim());
    totalSlides = validSlides.length;
    currentSlideIndex = Math.min(currentSlideIndex, totalSlides - 1);
    if (totalSlides === 0) {
        previewContent.innerHTML = '<div>プレビューするMarkdownを入力してください</div>';
        return;
    }
    const currentSlideText = validSlides[currentSlideIndex].trim();
    let html = currentSlideText
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    previewContent.innerHTML = `<section style="padding: 40px; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #ccc;">${html}</section>`;
    updateSlideCounter();
}

// スライドナビゲーション
function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        updatePreview();
    }
}
function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updatePreview();
    }
}

// 設定パネル等
function applySettings() {
    const theme = document.getElementById('theme-select')?.value || 'default';
    const fontSize = document.getElementById('font-size-select')?.value || 'medium';
    const customFontSize = parseInt(document.getElementById('custom-font-size')?.value) || 16;
    const slideRatio = document.getElementById('slide-ratio-select')?.value || '16:9';
    const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
    const textColor = document.getElementById('text-color')?.value || '#000000';
    currentSettings = {
        theme,
        fontSize,
        customFontSize,
        slideRatio,
        backgroundColor,
        textColor
    };
    applyMarpSettings();
    updatePreview();
    localStorage.setItem('marpSettings', JSON.stringify(currentSettings));
    closeSettings();
    showSuccess('設定が適用されました');
}
function openSettings() {
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) settingsPanel.classList.add('show');
}
function closeSettings() {
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) settingsPanel.classList.remove('show');
}
function resetSettings() {
    currentSettings = {
        theme: 'default',
        fontSize: 'medium',
        customFontSize: 16,
        slideRatio: '16:9',
        backgroundColor: '#ffffff',
        textColor: '#000000'
    };
    populateSettingsForm();
    showSuccess('設定をリセットしました');
}
function populateSettingsForm() {
    const themeSelect = document.getElementById('theme-select');
    const fontSizeSelect = document.getElementById('font-size-select');
    const customFontSize = document.getElementById('custom-font-size');
    const slideRatioSelect = document.getElementById('slide-ratio-select');
    const backgroundColor = document.getElementById('background-color');
    const textColor = document.getElementById('text-color');
    if (themeSelect) themeSelect.value = currentSettings.theme;
    if (fontSizeSelect) fontSizeSelect.value = currentSettings.fontSize;
    if (customFontSize) customFontSize.value = currentSettings.customFontSize;
    if (slideRatioSelect) slideRatioSelect.value = currentSettings.slideRatio;
    if (backgroundColor) backgroundColor.value = currentSettings.backgroundColor;
    if (textColor) textColor.value = currentSettings.textColor;
}

// 保存・エクスポート
function saveMarkdownFile() {
    if (!editor) return;
    const markdown = editor.getValue();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.md';
    a.click();
    URL.revokeObjectURL(url);
    setSaveStatus('saved');
    showSuccess('ファイルを保存しました');
}
function exportToHTML() {
    if (!editor) return;
    try {
        showLoading();
        const markdown = editor.getValue();
        if (!markdown.trim()) throw new Error('エクスポートするコンテンツがありません');
        let html;
        if (marp) {
            const result = marp.render(markdown);
            html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Marp Presentation</title>
    <style>${result.css}</style>
</head>
<body>
    ${result.html}
</body>
</html>`;
        } else {
            const content = typeof marked !== 'undefined' ? marked.parse(markdown) : markdown.replace(/\n/g, '<br>');
            html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Presentation</title>
</head>
<body>
    ${content}
</body>
</html>`;
        }
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'presentation.html';
        a.click();
        URL.revokeObjectURL(url);
        showSuccess('HTMLファイルの出力が完了しました');
    } catch (error) {
        showError('HTMLファイルの出力に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// PDFエクスポート（テキストとして認識されるPDF）
async function exportToPDF() {
    try {
        showLoading();

        if (!editor) throw new Error('エディタが初期化されていません');
        const markdown = editor.getValue();
        if (!markdown.trim()) throw new Error('エクスポートするコンテンツがありません');
        if (!marp) throw new Error('Marpエンジンが利用できません');

        const { html, css } = marp.render(markdown);

        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Marp PDF Export</title>
                <style>${css}</style>
                <style>
                @media print {
                    section { page-break-after: always; }
                }
                body { margin: 0; }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `);
        win.document.close();

        win.onload = () => {
            win.focus();
            win.print();
        };

        showSuccess('PDF出力用ウィンドウを開きました。印刷ダイアログからPDF保存してください。');
    } catch (error) {
        showError('PDFの出力に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// PPTXエクスポート（テキストとして認識されるPPTX）
async function exportToPPTX() {
    try {
        showLoading();

        if (!editor) throw new Error('エディタが初期化されていません');
        const markdown = editor.getValue();
        if (!markdown.trim()) throw new Error('エクスポートするコンテンツがありません');

        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJSライブラリが利用できません');

        const pptx = new PptxGenJS();
        const slides = markdown.split(/^---$/m);

        slides.forEach(slideText => {
            const slide = pptx.addSlide();
            let html = slideText
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^- (.*$)/gm, '<li>$1</li>');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            let y = 0.5;
            tempDiv.querySelectorAll('h1').forEach(h => {
                slide.addText(h.textContent, { x: 0.5, y, w: 8, fontSize: 36, bold: true });
                y += 1;
            });
            tempDiv.querySelectorAll('h2').forEach(h => {
                slide.addText(h.textContent, { x: 0.7, y, w: 7.5, fontSize: 28, bold: true });
                y += 0.8;
            });
            tempDiv.querySelectorAll('h3').forEach(h => {
                slide.addText(h.textContent, { x: 0.9, y, w: 7, fontSize: 22, bold: true });
                y += 0.6;
            });
            tempDiv.querySelectorAll('li').forEach(li => {
                slide.addText("• " + li.textContent, { x: 1.2, y, w: 7, fontSize: 18 });
                y += 0.5;
            });
            const plain = tempDiv.textContent
                .replace(/[\r\n]+/g, '\n')
                .trim();
            if (plain) {
                slide.addText(plain, { x: 0.5, y, w: 8, fontSize: 18 });
            }
        });

        pptx.writeFile({ fileName: 'marp-presentation.pptx' });
        showSuccess('PowerPointファイルの出力が完了しました');
    } catch (error) {
        showError('PowerPointファイルの出力に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ステータス・カウンタ
function updateCharCount() {
    const charCountElement = document.getElementById('char-count');
    if (charCountElement && editor) {
        const count = editor.getValue().length;
        charCountElement.textContent = `${count} 文字`;
    }
}
function setSaveStatus(status) {
    const saveStatusElement = document.getElementById('save-status');
    if (saveStatusElement) {
        saveStatusElement.textContent = status === 'saved' ? '保存済み' : status === 'saving' ? '保存中' : '未保存';
        saveStatusElement.className = `save-status ${status}`;
    }
}
function updateSlideCounter() {
    const slideCounter = document.getElementById('slide-counter');
    if (slideCounter) {
        slideCounter.textContent = `${currentSlideIndex + 1} / ${totalSlides}`;
    }
}
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {}, 5000);
}

// プレビュー表示切り替え
function togglePreview() {
    isPreviewVisible = !isPreviewVisible;
    const previewPane = document.querySelector('.preview-pane');
    const editorLayout = document.querySelector('.editor-layout');
    const toggleBtn = document.getElementById('preview-toggle');
    if (previewPane && editorLayout) {
        if (isPreviewVisible) {
            previewPane.style.display = 'flex';
            editorLayout.style.gridTemplateColumns = '1fr 1fr';
            toggleBtn.textContent = 'プレビュー非表示';
        } else {
            previewPane.style.display = 'none';
            editorLayout.style.gridTemplateColumns = '1fr';
            toggleBtn.textContent = 'プレビュー表示';
        }
    }
    showSuccess(isPreviewVisible ? 'プレビューを表示しました' : 'プレビューを非表示にしました');
}

// デフォルトコンテンツ読み込み
function loadDefaultContent() {
    if (editor) {
        editor.setValue(defaultMarkdown);
        updatePreview();
        updateCharCount();
        setSaveStatus('saved');
    }
}

// トースト・ローディング
function showLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.add('show');
}
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('show');
}
function showSuccess(message) {
    const toast = document.querySelector('.success-toast');
    if (toast) {
        toast.querySelector('span').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}
function showError(message) {
    const toast = document.querySelector('.error-toast');
    if (toast) {
        toast.querySelector('span').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
    }
}
function hideSuccess() {
    document.querySelector('.success-toast')?.classList.remove('show');
}
function hideError() {
    document.querySelector('.error-toast')?.classList.remove('show');
}

// 設定のロード
function loadSettings() {
    try {
        const saved = localStorage.getItem('marpSettings');
        if (saved) {
            currentSettings = { ...currentSettings, ...JSON.parse(saved) };
            populateSettingsForm();
        }
    } catch (error) {}
}
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});
