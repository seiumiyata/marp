// Global variables
let marp;
let editor;
let currentSlideIndex = 0;
let totalSlides = 1;
let autoSaveTimer;
let isPreviewVisible = true;
let currentSettings = {
    theme: 'default',
    fontSize: 'medium',
    customFontSize: 16,
    slideRatio: '16:9',
    backgroundColor: '#ffffff',
    textColor: '#000000'
};

// Default markdown content
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

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded');
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

// Wait for external libraries to load
function waitForLibraries() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkLibraries = () => {
            attempts++;
            console.log(`Checking libraries attempt ${attempts}`);
            if (typeof Marp !== 'undefined' && typeof CodeMirror !== 'undefined') {
                console.log('All libraries loaded successfully');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.log('Libraries failed to load, using fallback');
                reject(new Error('External libraries failed to load'));
            } else {
                setTimeout(checkLibraries, 200);
            }
        };
        checkLibraries();
    });
}

// Initialize Marp
async function initializeMarp() {
    try {
        if (typeof Marp === 'undefined') {
            throw new Error('Marp Core ライブラリが読み込まれていません');
        }
        marp = new Marp.Marp({
            html: true,
            breaks: true
        });
        console.log('Marp initialized successfully');
    } catch (error) {
        console.error('Marp initialization failed:', error);
        throw error;
    }
}

// Initialize CodeMirror editor
async function initializeEditor() {
    try {
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
            
            console.log('CodeMirror initialized successfully');
        } else {
            initializeFallbackEditor(textarea);
        }
    } catch (error) {
        console.error('Editor initialization failed:', error);
        throw error;
    }
}

// Initialize fallback editor
function initializeFallbackEditor(textarea) {
    console.log('Using fallback textarea editor');
    editor = {
        getValue: () => textarea.value,
        setValue: (value) => { textarea.value = value; },
        on: () => {}
    };
    
    textarea.addEventListener('input', function() {
        updatePreview();
        updateCharCount();
        setSaveStatus('unsaved');
        scheduleAutoSave();
    });
    
    textarea.style.display = 'block';
}

// Initialize fallback functionality
function initializeFallback() {
    try {
        console.log('Initializing fallback functionality');
        const textarea = document.getElementById('markdown-editor');
        textarea.style.display = 'block';
        textarea.value = defaultMarkdown;
        
        initializeFallbackEditor(textarea);
        initializeEventListeners();
        updatePreviewFallback();
        updateCharCount();
        setSaveStatus('saved');
        showSuccess('フォールバックモードで初期化されました');
    } catch (error) {
        console.error('Fallback initialization failed:', error);
        showError('フォールバック初期化に失敗しました: ' + error.message);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    try {
        console.log('Initializing event listeners');
        
        // Toolbar buttons
        const saveBtn = document.getElementById('save-md-btn');
        const exportPdfBtn = document.getElementById('export-pdf');
        const exportPptxBtn = document.getElementById('export-pptx');
        const exportHtmlBtn = document.getElementById('export-html');
        const settingsBtn = document.getElementById('settings-btn');
        const previewToggleBtn = document.getElementById('preview-toggle');
        
        if (saveBtn) saveBtn.addEventListener('click', saveMarkdownFile);
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportToPDF());
        if (exportPptxBtn) exportPptxBtn.addEventListener('click', () => exportToPPTX());
        if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', () => exportToHTML());
        if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
        if (previewToggleBtn) previewToggleBtn.addEventListener('click', togglePreview);
        
        // Slide navigation
        const prevBtn = document.getElementById('prev-slide');
        const nextBtn = document.getElementById('next-slide');
        if (prevBtn) prevBtn.addEventListener('click', previousSlide);
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);
        
        // Settings panel
        const settingsClose = document.getElementById('settings-close');
        const applyBtn = document.getElementById('apply-settings');
        const resetBtn = document.getElementById('reset-settings');
        const settingsOverlay = document.querySelector('.settings-overlay');
        
        if (settingsClose) settingsClose.addEventListener('click', closeSettings);
        if (applyBtn) applyBtn.addEventListener('click', applySettings);
        if (resetBtn) resetBtn.addEventListener('click', resetSettings);
        if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettings);
        
        // Toast close buttons
        const errorClose = document.getElementById('error-close');
        const successClose = document.getElementById('success-close');
        if (errorClose) errorClose.addEventListener('click', hideError);
        if (successClose) successClose.addEventListener('click', hideSuccess);
        
        console.log('Event listeners initialized successfully');
    } catch (error) {
        console.error('Event listener initialization failed:', error);
        showError('イベントリスナーの初期化に失敗しました: ' + error.message);
    }
}

// Load default content
function loadDefaultContent() {
    try {
        if (editor && editor.setValue) {
            editor.setValue(defaultMarkdown);
        }
        updatePreview();
        updateCharCount();
        setSaveStatus('saved');
    } catch (error) {
        console.error('Default content loading failed:', error);
        showError('デフォルトコンテンツの読み込みに失敗しました: ' + error.message);
    }
}

// Update preview with Marp
async function updatePreview() {
    try {
        if (!editor) return;
        
        const markdown = editor.getValue();
        if (!markdown.trim()) {
            document.getElementById('preview-content').innerHTML = '<p>プレビューするMarkdownを入力してください</p>';
            return;
        }
        
        if (marp) {
            const { html, css } = marp.render(markdown);
            const previewContent = document.getElementById('preview-content');
            
            // Create slide container
            previewContent.innerHTML = `<style>${css}</style>${html}`;
            
            // Count slides and setup navigation
            const slides = previewContent.querySelectorAll('section');
            totalSlides = slides.length;
            
            // Show only current slide
            slides.forEach((slide, index) => {
                slide.style.display = index === currentSlideIndex ? 'block' : 'none';
            });
            
            updateSlideCounter();
        } else {
            updatePreviewFallback();
        }
    } catch (error) {
        console.error('Preview update failed:', error);
        document.getElementById('preview-content').innerHTML = `<div style="color: red;">プレビューエラー: ${error.message}</div>`;
    }
}

// Fallback preview update
function updatePreviewFallback() {
    const markdown = editor.getValue();
    const html = markdown
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/(?:^|\n)([^<\n]+)(?=\n|$)/g, '<p>$1</p>');
    
    document.getElementById('preview-content').innerHTML = `<div style="padding: 20px;">${html}</div>`;
}

// Slide navigation functions
function previousSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updatePreview();
    }
}

function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        updatePreview();
    }
}

function updateSlideCounter() {
    const counter = document.getElementById('slide-counter');
    if (counter) {
        counter.textContent = `${currentSlideIndex + 1} / ${totalSlides}`;
    }
}

// Character count update
function updateCharCount() {
    const charCountElement = document.getElementById('char-count');
    if (charCountElement && editor) {
        charCountElement.textContent = `${editor.getValue().length} 文字`;
    }
}

// Save status management
function setSaveStatus(status) {
    const saveStatusElement = document.getElementById('save-status');
    if (saveStatusElement) {
        saveStatusElement.textContent = status === 'saved' ? '保存済み' : 
                                       status === 'saving' ? '保存中' : '未保存';
        saveStatusElement.className = `save-status ${status}`;
    }
}

// Auto-save functionality
function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
        localStorage.setItem('marp-editor-content', editor.getValue());
        setSaveStatus('saved');
    }, 3000);
}

// Export functions
function exportToPDF() {
    if (typeof html2pdf === 'undefined') {
        showError('PDF export library not loaded');
        return;
    }
    
    const element = document.getElementById('preview-content');
    const opt = {
        margin: 0,
        filename: 'presentation.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    
    html2pdf().from(element).set(opt).save();
    showSuccess('PDFエクスポートを開始しました');
}

function exportToPPTX() {
    if (typeof PptxGenJS === 'undefined') {
        showError('PPTX export library not loaded');
        return;
    }
    
    const pptx = new PptxGenJS();
    const slides = document.querySelectorAll('#preview-content section');
    
    slides.forEach((slide, index) => {
        const pptxSlide = pptx.addSlide();
        const text = slide.textContent || `Slide ${index + 1}`;
        pptxSlide.addText(text, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 18 });
    });
    
    pptx.writeFile({ fileName: 'presentation.pptx' });
    showSuccess('PPTXエクスポートを開始しました');
}

function exportToHTML() {
    const { html, css } = marp.render(editor.getValue());
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Marp Presentation</title>
    <style>${css}</style>
</head>
<body>
    ${html}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('HTMLエクスポートが完了しました');
}

function saveMarkdownFile() {
    const content = editor.getValue();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.md';
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Markdownファイルを保存しました');
}

// Settings functions
function openSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.add('show');
    }
}

function closeSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.remove('show');
    }
}

function applySettings() {
    // Get settings from form
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        currentSettings.theme = themeSelect.value;
    }
    
    closeSettings();
    updatePreview();
    showSuccess('設定を適用しました');
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
    
    closeSettings();
    updatePreview();
    showSuccess('設定をリセットしました');
}

function togglePreview() {
    const previewPane = document.querySelector('.preview-pane');
    if (previewPane) {
        previewPane.classList.toggle('hidden');
        isPreviewVisible = !previewPane.classList.contains('hidden');
    }
}

// UI helper functions
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showError(message) {
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');
    if (errorDisplay && errorMessage) {
        errorMessage.textContent = message;
        errorDisplay.style.display = 'flex';
    }
}

function hideError() {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
    }
}

function showSuccess(message) {
    const successDisplay = document.getElementById('success-display');
    const successMessage = document.getElementById('success-message');
    if (successDisplay && successMessage) {
        successMessage.textContent = message;
        successDisplay.style.display = 'flex';
        setTimeout(() => {
            successDisplay.style.display = 'none';
        }, 3000);
    }
}

function hideSuccess() {
    const successDisplay = document.getElementById('success-display');
    if (successDisplay) {
        successDisplay.style.display = 'none';
    }
}

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
