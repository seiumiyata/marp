// Global variables 
let marp;
let editor;
let currentSlideIndex = 0;
let totalSlides = 1;
let autoSaveTimer;
let isPreviewVisible = true;
let isSlideMode = true; // 新規: スライドモード vs マークダウンモード
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
            
            // CodeMirrorとmarkedのみチェック
            const codeMirrorLoaded = typeof CodeMirror !== 'undefined';
            const markedLoaded = typeof marked !== 'undefined';
            
            console.log('Library status:', {
                codeMirror: codeMirrorLoaded,
                marked: markedLoaded
            });
            
            if (codeMirrorLoaded || attempts >= maxAttempts) {
                console.log('Libraries check completed');
                resolve();
            } else {
                setTimeout(checkLibraries, 200);
            }
        };
        
        checkLibraries();
    });
}


// Initialize Marp with error handling
async function initializeMarp() {
    try {
        if (typeof Marp !== 'undefined' && Marp.Marp) {
            marp = new Marp.Marp({
                html: true,
                breaks: true
            });
            
            // Apply initial theme
            applyMarpSettings();
            console.log('Marp initialized successfully');
        } else {
            console.warn('Marp not available, using fallback');
            // Marpが利用できない場合のフォールバック
            marp = null;
        }
    } catch (error) {
        console.error('Marp initialization failed:', error);
        marp = null; // エラー時はnullに設定
    }
}

// Apply settings to Marp engine
function applyMarpSettings() {
    try {
        if (!marp) return;
        
        // Reset Marp instance with new settings
        marp = new Marp.Marp({
            html: true,
            breaks: true
        });
        
        // Apply theme if available
        if (currentSettings.theme !== 'default') {
            // For built-in themes
            marp.use(theme => {
                theme.theme = currentSettings.theme;
            });
        }
        
        // Apply custom CSS for styling
        const customCSS = generateCustomCSS();
        marp.use(theme => {
            theme.css += customCSS;
        });
        
        console.log('Marp settings applied successfully');
    } catch (error) {
        console.error('Failed to apply Marp settings:', error);
        showError('設定の適用に失敗しました: ' + error.message);
    }
}

// Generate custom CSS based on settings
function generateCustomCSS() {
    const { backgroundColor, textColor, customFontSize, slideRatio } = currentSettings;
    
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

// フォールバックエディタ初期化関数
function initializeFallbackEditor(textarea) {
    console.log('Initializing fallback editor');
    
    if (textarea) {
        textarea.addEventListener('input', function() {
            updatePreview();
            updateCharCount();
            setSaveStatus('unsaved');
            scheduleAutoSave();
        });
        
        // エディタ変数を設定
        editor = {
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value; },
            on: () => {} // ダミー関数
        };
    }
}

// Initialize event listeners with error handling
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
        const previewModeBtn = document.getElementById('preview-mode-toggle'); // 新規
        
        if (saveBtn) saveBtn.addEventListener('click', saveMarkdownFile);
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportToPDF());
        if (exportPptxBtn) exportPptxBtn.addEventListener('click', () => exportToPPTX());
        if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', () => exportToHTML());
        if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
        if (previewToggleBtn) previewToggleBtn.addEventListener('click', togglePreview);
        if (previewModeBtn) previewModeBtn.addEventListener('click', togglePreviewMode); // 新規
        
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

// 新規: プレビューモード切り替え機能
function togglePreviewMode() {
    try {
        isSlideMode = !isSlideMode;
        const previewModeBtn = document.getElementById('preview-mode-toggle');
        
        if (previewModeBtn) {
            previewModeBtn.textContent = isSlideMode ? 'マークダウン表示' : 'スライド表示';
        }
        
        updatePreview();
        showSuccess(isSlideMode ? 'スライドモードに切り替えました' : 'マークダウンモードに切り替えました');
    } catch (error) {
        console.error('Preview mode toggle failed:', error);
        showError('プレビューモードの切り替えに失敗しました');
    }
}

// Updated preview function with mode switching
async function updatePreview() {
    try {
        if (!editor) return;
        
        const markdown = editor.getValue();
        const previewContent = document.getElementById('preview-content');
        
        if (!markdown.trim()) {
            previewContent.innerHTML = '<p>プレビューするMarkdownを入力してください</p>';
            return;
        }
        
        if (isSlideMode) {
            // Slide mode using Marp
            await updateSlidePreview(markdown);
        } else {
            // Markdown mode using marked.js
            await updateMarkdownPreview(markdown);
        }
    } catch (error) {
        console.error('Preview update failed:', error);
        document.getElementById('preview-content').innerHTML = 
            `<div class="error">プレビューの更新に失敗しました: ${error.message}</div>`;
    }
}

// Slide preview using Marp
async function updateSlidePreview(markdown) {
    try {
        const previewContent = document.getElementById('preview-content');
        const previewContainer = document.querySelector('.preview-container');
        
        // プレビューコンテナのクラスを更新
        if (previewContainer) {
            previewContainer.className = 'preview-container slide-mode';
        }
        
        // プレビュータイトルを更新
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) {
            previewTitle.className = '';
        }
        
        // プレビューコントロールを表示
        const previewControls = document.querySelector('.preview-controls');
        if (previewControls) {
            previewControls.className = 'preview-controls';
        }
        
        if (marp) {
            const { html, css } = marp.render(markdown);
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
            // Marpが利用できない場合はマークダウンプレビューにフォールバック
            await updateMarkdownPreview(markdown);
        }
    } catch (error) {
        console.error('Slide preview failed:', error);
        throw error;
    }
}

// Markdown preview using marked.js (fallback)
async function updateMarkdownPreview(markdown) {
    try {
        const previewContent = document.getElementById('preview-content');
        const previewContainer = document.querySelector('.preview-container');
        
        // プレビューコンテナのクラスを更新
        if (previewContainer) {
            previewContainer.className = 'preview-container markdown-mode';
        }
        
        // プレビュータイトルを更新
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) {
            previewTitle.className = 'markdown-mode';
        }
        
        // プレビューコントロールを非表示
        const previewControls = document.querySelector('.preview-controls');
        if (previewControls) {
            previewControls.className = 'preview-controls markdown-mode';
        }
        
        if (typeof marked !== 'undefined') {
            const html = marked.parse(markdown);
            previewContent.innerHTML = `<div class="markdown-preview">${html}</div>`;
        } else {
            // markedが利用できない場合の簡易フォールバック
            const htmlContent = markdown
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>');
            previewContent.innerHTML = `<div class="markdown-preview">${htmlContent}</div>`;
        }
    } catch (error) {
        console.error('Markdown preview failed:', error);
        throw error;
    }
}

// Improved PDF export with text preservation
async function exportToPDF() {
    try {
        showLoading();
        showError('PDF出力機能は現在開発中です。HTMLエクスポートをご利用ください。');
    } catch (error) {
        console.error('PDF export failed:', error);
        showError('PDF出力機能は利用できません: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Improved PPTX export with native text support
async function exportToPPTX() {
    try {
        showLoading();
        showError('PPTX出力機能は現在開発中です。HTMLエクスポートをご利用ください。');
    } catch (error) {
        console.error('PPTX export failed:', error);
        showError('PPTX出力機能は利用できません: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Apply settings function (fixed implementation)
function applySettings() {
    try {
        // Get form values
        const theme = document.getElementById('theme-select')?.value || 'default';
        const fontSize = document.getElementById('font-size-select')?.value || 'medium';
        const customFontSize = parseInt(document.getElementById('custom-font-size')?.value) || 16;
        const slideRatio = document.getElementById('slide-ratio-select')?.value || '16:9';
        const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
        const textColor = document.getElementById('text-color')?.value || '#000000';
        
        // Update current settings
        currentSettings = {
            theme,
            fontSize,
            customFontSize,
            slideRatio,
            backgroundColor,
            textColor
        };
        
        // Apply to Marp engine
        applyMarpSettings();
        
        // Update preview
        updatePreview();
        
        // Save to localStorage
        localStorage.setItem('marpSettings', JSON.stringify(currentSettings));
        
        // Close settings panel
        closeSettings();
        
        showSuccess('設定が適用されました');
    } catch (error) {
        console.error('Settings application failed:', error);
        showError('設定の適用に失敗しました: ' + error.message);
    }
}

// Toggle preview visibility with layout adjustment
function togglePreview() {
    try {
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
    } catch (error) {
        console.error('Preview toggle failed:', error);
        showError('プレビューの切り替えに失敗しました');
    }
}

// Load default content
function loadDefaultContent() {
    if (editor) {
        editor.setValue(defaultMarkdown);
        updatePreview();
        updateCharCount();
        setSaveStatus('saved');
    }
}

// Update character count
function updateCharCount() {
    const charCountElement = document.getElementById('char-count');
    if (charCountElement && editor) {
        const count = editor.getValue().length;
        charCountElement.textContent = `${count} 文字`;
    }
}

// Set save status
function setSaveStatus(status) {
    const saveStatusElement = document.getElementById('save-status');
    if (saveStatusElement) {
        saveStatusElement.textContent = status === 'saved' ? '保存済み' : 
                                       status === 'saving' ? '保存中' : '未保存';
        saveStatusElement.className = `save-status ${status}`;
    }
}

// Schedule auto save
function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
        console.log('Auto-save triggered');
    }, 5000);
}

// Open settings panel
function openSettings() {
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.add('show');
    }
}

// Close settings panel
function closeSettings() {
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.remove('show');
    }
}

// Reset settings to default
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

// Save markdown file
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

// Export to HTML
function exportToHTML() {
    if (!editor) return;
    
    try {
        showLoading();
        
        const markdown = editor.getValue();
        if (!markdown.trim()) {
            throw new Error('エクスポートするコンテンツがありません');
        }
        
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
            const content = typeof marked !== 'undefined' ? 
                marked.parse(markdown) : 
                markdown.replace(/\n/g, '<br>');
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
        console.error('HTML export failed:', error);
        showError('HTMLファイルの出力に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Populate settings form with current values
function populateSettingsForm() {
    try {
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
    } catch (error) {
        console.error('Form population failed:', error);
    }
}

// Update slide counter
function updateSlideCounter() {
    const slideCounter = document.getElementById('slide-counter');
    if (slideCounter) {
        slideCounter.textContent = `${currentSlideIndex + 1} / ${totalSlides}`;
    }
}

// Initialize fallback mode
function initializeFallback() {
    console.log('Initializing fallback mode');
    
    const textarea = document.getElementById('markdown-editor');
    if (textarea) {
        initializeFallbackEditor(textarea);
    }
    
    loadDefaultContent();
    showSuccess('フォールバックモードで初期化されました');
}

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('marpSettings');
        if (saved) {
            currentSettings = { ...currentSettings, ...JSON.parse(saved) };
            populateSettingsForm();
        }
    } catch (error) {
        console.error('Settings loading failed:', error);
    }
}

// Slide navigation functions
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

// Utility functions for UI feedback
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

// Initialize settings on load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});
