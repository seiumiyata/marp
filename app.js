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

        // Wait for external libraries to load
        await waitForLibraries();
        await initializeMarp();
        await initializeEditor();
        initializeEventListeners();
        loadDefaultContent();
        loadAutoSavedContent();

        hideLoading();
        showSuccess('アプリケーションが正常に初期化されました');
    } catch (error) {
        hideLoading();
        showError('アプリケーションの初期化に失敗しました: ' + error.message);
        console.error('Initialization error:', error);

        // Fallback: try to initialize with basic functionality
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

            // Check if at least basic functionality is available
            const basicReady = document.getElementById('markdown-editor') !== null;
            const marpReady = typeof Marp !== 'undefined';
            const codemirrorReady = typeof CodeMirror !== 'undefined';

            if (basicReady && (marpReady || codemirrorReady || attempts >= maxAttempts)) {
                console.log('Basic functionality available, proceeding...');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.log('Libraries failed to load, using fallback');
                resolve(); // Still resolve to allow fallback
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
        if (typeof Marp !== 'undefined') {
            const { Marp: MarpClass } = Marp;
            marp = new MarpClass({
                html: true,
                breaks: true
            });
            console.log('Marp initialized successfully');
        } else {
            console.warn('Marp Core not available, using fallback rendering');
            marp = null;
        }
    } catch (error) {
        console.error('Marp initialization failed:', error);
        marp = null;
    }
}

// Initialize CodeMirror editor
async function initializeEditor() {
    try {
        const textarea = document.getElementById('markdown-editor');

        if (!textarea) {
            throw new Error('markdown-editor element not found');
        }

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
            // Fallback to plain textarea
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
            textarea.style.width = '100%';
            textarea.style.height = '100%';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.padding = '16px';
            textarea.style.fontFamily = 'monospace';
            textarea.style.fontSize = '14px';
            textarea.style.resize = 'none';
        }
    } catch (error) {
        console.error('Editor initialization failed:', error);
        throw error;
    }
}

// Initialize fallback functionality
function initializeFallback() {
    try {
        console.log('Initializing fallback functionality');

        const textarea = document.getElementById('markdown-editor');
        if (textarea) {
            textarea.style.display = 'block';
            textarea.value = defaultMarkdown;

            editor = {
                getValue: () => textarea.value,
                setValue: (value) => { textarea.value = value; },
                on: () => {}
            };

            textarea.addEventListener('input', function() {
                updatePreviewFallback();
                updateCharCount();
                setSaveStatus('unsaved');
                scheduleAutoSave();
            });
        }

        // Initialize event listeners
        initializeEventListeners();

        // Load content
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
        safeAddEventListener('save-md-btn', 'click', saveMarkdownFile);
        safeAddEventListener('export-pdf', 'click', () => exportToPDF());
        safeAddEventListener('export-pptx', 'click', () => exportToPPTX());
        safeAddEventListener('export-html', 'click', () => exportToHTML());
        safeAddEventListener('settings-btn', 'click', openSettings);
        safeAddEventListener('preview-toggle', 'click', togglePreview);

        // Slide navigation
        safeAddEventListener('prev-slide', 'click', previousSlide);
        safeAddEventListener('next-slide', 'click', nextSlide);

        // Settings panel
        safeAddEventListener('settings-close', 'click', closeSettings);
        safeAddEventListener('apply-settings', 'click', applySettings);
        safeAddEventListener('reset-settings', 'click', resetSettings);

        // Settings overlay
        const settingsOverlay = document.querySelector('.settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.addEventListener('click', closeSettings);
        }

        // Settings form
        safeAddEventListener('font-size-select', 'change', toggleCustomFontSize);

        // Toast close buttons
        safeAddEventListener('error-close', 'click', hideError);
        safeAddEventListener('success-close', 'click', hideSuccess);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);

        // Prevent settings panel close when clicking content
        const settingsContent = document.querySelector('.settings-content');
        if (settingsContent) {
            settingsContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        console.log('Event listeners initialized successfully');
    } catch (error) {
        console.error('Event listener initialization failed:', error);
        showError('イベントリスナーの初期化に失敗しました: ' + error.message);
    }
}

// Safe event listener helper
function safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element with ID "${elementId}" not found`);
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

// Load auto-saved content
function loadAutoSavedContent() {
    try {
        const saved = localStorage.getItem('marp-pwa-content');
        if (saved && saved !== defaultMarkdown) {
            if (editor && editor.setValue) {
                editor.setValue(saved);
                updatePreview();
                updateCharCount();
                setSaveStatus('saved');
                showSuccess('自動保存されたコンテンツを読み込みました');
            }
        }
    } catch (error) {
        console.error('Auto-saved content loading failed:', error);
    }
}

// Update preview with Marp
async function updatePreview() {
    try {
        if (!editor) return;

        const markdown = editor.getValue();
        const previewContent = document.getElementById('preview-content');

        if (!previewContent) return;

        if (!markdown.trim()) {
            previewContent.innerHTML = '<p>プレビューするMarkdownを入力してください</p>';
            updateSlideCounter(1, 1);
            return;
        }

        if (marp) {
            // Use Marp for rendering
            const { html, css } = marp.render(markdown);

            // Apply current settings
            const styledHtml = `
                <style>
                    ${css}
                    .marp-slide {
                        background-color: ${currentSettings.backgroundColor};
                        color: ${currentSettings.textColor};
                        font-size: ${getFontSizeValue()}px;
                    }
                </style>
                <div class="marp-slide">
                    ${html}
                </div>
            `;

            previewContent.innerHTML = styledHtml;

            // Count slides
            const slides = previewContent.querySelectorAll('section');
            totalSlides = Math.max(slides.length, 1);
            currentSlideIndex = Math.min(currentSlideIndex, totalSlides - 1);

            updateSlideCounter(currentSlideIndex + 1, totalSlides);
            showCurrentSlide();
        } else {
            // Fallback rendering
            updatePreviewFallback();
        }
    } catch (error) {
        console.error('Preview update failed:', error);
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.innerHTML = `<p>プレビューエラー: ${error.message}</p>`;
        }
    }
}

// Fallback preview update
function updatePreviewFallback() {
    try {
        if (!editor) return;

        const markdown = editor.getValue();
        const previewContent = document.getElementById('preview-content');

        if (!previewContent) return;

        if (!markdown.trim()) {
            previewContent.innerHTML = '<p>プレビューするMarkdownを入力してください</p>';
            return;
        }

        // Simple markdown to HTML conversion
        const html = markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^\*\*(.*)\*\*/gm, '<strong>$1</strong>')
            .replace(/^\*(.*)\*/gm, '<em>$1</em>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^([^<].*$)/gm, '<p>$1</p>');

        previewContent.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${html}</div>`;

        updateSlideCounter(1, 1);
    } catch (error) {
        console.error('Fallback preview update failed:', error);
    }
}

// Update character count
function updateCharCount() {
    try {
        const charCountElement = document.getElementById('char-count');
        if (charCountElement && editor) {
            const content = editor.getValue();
            charCountElement.textContent = `${content.length} 文字`;
        }
    } catch (error) {
        console.error('Character count update failed:', error);
    }
}

// Update slide counter
function updateSlideCounter(current, total) {
    try {
        const slideCounter = document.getElementById('slide-counter');
        if (slideCounter) {
            slideCounter.textContent = `${current} / ${total}`;
        }
    } catch (error) {
        console.error('Slide counter update failed:', error);
    }
}

// Show current slide
function showCurrentSlide() {
    try {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent) return;

        const slides = previewContent.querySelectorAll('section');
        slides.forEach((slide, index) => {
            slide.style.display = index === currentSlideIndex ? 'block' : 'none';
        });
    } catch (error) {
        console.error('Show current slide failed:', error);
    }
}

// Navigation functions
function previousSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        showCurrentSlide();
        updateSlideCounter(currentSlideIndex + 1, totalSlides);
    }
}

function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        showCurrentSlide();
        updateSlideCounter(currentSlideIndex + 1, totalSlides);
    }
}

// Save functions
function setSaveStatus(status) {
    try {
        const saveStatusElement = document.getElementById('save-status');
        if (saveStatusElement) {
            saveStatusElement.className = `save-status ${status}`;
            switch (status) {
                case 'saved':
                    saveStatusElement.textContent = '保存済み';
                    break;
                case 'saving':
                    saveStatusElement.textContent = '保存中...';
                    break;
                case 'unsaved':
                    saveStatusElement.textContent = '未保存';
                    break;
            }
        }
    } catch (error) {
        console.error('Save status update failed:', error);
    }
}

function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
        try {
            setSaveStatus('saving');
            const content = editor.getValue();
            localStorage.setItem('marp-pwa-content', content);
            setSaveStatus('saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
            setSaveStatus('unsaved');
        }
    }, 3000);
}

function saveMarkdownFile() {
    try {
        const content = editor.getValue();
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `marp-slide-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess('Markdownファイルを保存しました');
    } catch (error) {
        console.error('Save markdown file failed:', error);
        showError('ファイルの保存に失敗しました: ' + error.message);
    }
}

// Export functions
function exportToPDF() {
    try {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent) {
            throw new Error('プレビューコンテンツが見つかりません');
        }

        if (typeof html2pdf === 'undefined') {
            throw new Error('PDF出力ライブラリが読み込まれていません');
        }

        const opt = {
            margin: 0,
            filename: `marp-slide-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(previewContent).save();
        showSuccess('PDFファイルを出力しました');
    } catch (error) {
        console.error('PDF export failed:', error);
        showError('PDF出力に失敗しました: ' + error.message);
    }
}

function exportToPPTX() {
    try {
        if (typeof PptxGenJS === 'undefined') {
            throw new Error('PPTX出力ライブラリが読み込まれていません');
        }

        const pptx = new PptxGenJS();
        const content = editor.getValue();

        // Simple slide generation (basic implementation)
        const slides = content.split('---').filter(slide => slide.trim());

        slides.forEach(slideContent => {
            const slide = pptx.addSlide();
            slide.addText(slideContent.trim(), {
                x: 0.5,
                y: 1,
                w: 9,
                h: 5,
                fontSize: 18,
                color: currentSettings.textColor
            });
        });

        pptx.writeFile({ fileName: `marp-slide-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pptx` });
        showSuccess('PPTXファイルを出力しました');
    } catch (error) {
        console.error('PPTX export failed:', error);
        showError('PPTX出力に失敗しました: ' + error.message);
    }
}

function exportToHTML() {
    try {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent) {
            throw new Error('プレビューコンテンツが見つかりません');
        }

        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marp Slides</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .slide { margin-bottom: 40px; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
    </style>
</head>
<body>
    ${previewContent.innerHTML}
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `marp-slide-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess('HTMLファイルを出力しました');
    } catch (error) {
        console.error('HTML export failed:', error);
        showError('HTML出力に失敗しました: ' + error.message);
    }
}

// Settings functions
function openSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.add('show');
        loadCurrentSettings();
    }
}

function closeSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.remove('show');
    }
}

function loadCurrentSettings() {
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

        toggleCustomFontSize();
    } catch (error) {
        console.error('Load current settings failed:', error);
    }
}

function applySettings() {
    try {
        const themeSelect = document.getElementById('theme-select');
        const fontSizeSelect = document.getElementById('font-size-select');
        const customFontSize = document.getElementById('custom-font-size');
        const slideRatioSelect = document.getElementById('slide-ratio-select');
        const backgroundColor = document.getElementById('background-color');
        const textColor = document.getElementById('text-color');

        if (themeSelect) currentSettings.theme = themeSelect.value;
        if (fontSizeSelect) currentSettings.fontSize = fontSizeSelect.value;
        if (customFontSize) currentSettings.customFontSize = parseInt(customFontSize.value);
        if (slideRatioSelect) currentSettings.slideRatio = slideRatioSelect.value;
        if (backgroundColor) currentSettings.backgroundColor = backgroundColor.value;
        if (textColor) currentSettings.textColor = textColor.value;

        // Save settings to localStorage
        localStorage.setItem('marp-pwa-settings', JSON.stringify(currentSettings));

        updatePreview();
        closeSettings();
        showSuccess('設定を適用しました');
    } catch (error) {
        console.error('Apply settings failed:', error);
        showError('設定の適用に失敗しました: ' + error.message);
    }
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

    localStorage.removeItem('marp-pwa-settings');
    loadCurrentSettings();
    updatePreview();
    showSuccess('設定をリセットしました');
}

function toggleCustomFontSize() {
    const fontSizeSelect = document.getElementById('font-size-select');
    const customGroup = document.getElementById('custom-font-size-group');

    if (fontSizeSelect && customGroup) {
        if (fontSizeSelect.value === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }
    }
}

function getFontSizeValue() {
    switch (currentSettings.fontSize) {
        case 'small': return 12;
        case 'medium': return 16;
        case 'large': return 20;
        case 'custom': return currentSettings.customFontSize;
        default: return 16;
    }
}

// Preview toggle
function togglePreview() {
    const previewPane = document.getElementById('preview-pane');
    const editorLayout = document.querySelector('.editor-layout');

    if (previewPane && editorLayout) {
        isPreviewVisible = !isPreviewVisible;

        if (isPreviewVisible) {
            previewPane.style.display = 'flex';
            editorLayout.style.gridTemplateColumns = '1fr 1fr';
        } else {
            previewPane.style.display = 'none';
            editorLayout.style.gridTemplateColumns = '1fr';
        }
    }
}

// Utility functions
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

function showError(message) {
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');

    if (errorToast && errorMessage) {
        errorMessage.textContent = message;
        errorToast.classList.add('show');

        setTimeout(() => {
            errorToast.classList.remove('show');
        }, 5000);
    }

    console.error(message);
}

function hideError() {
    const errorToast = document.getElementById('error-toast');
    if (errorToast) {
        errorToast.classList.remove('show');
    }
}

function showSuccess(message) {
    const successToast = document.getElementById('success-toast');
    const successMessage = document.getElementById('success-message');

    if (successToast && successMessage) {
        successMessage.textContent = message;
        successToast.classList.add('show');

        setTimeout(() => {
            successToast.classList.remove('show');
        }, 3000);
    }

    console.log(message);
}

function hideSuccess() {
    const successToast = document.getElementById('success-toast');
    if (successToast) {
        successToast.classList.remove('show');
    }
}

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                saveMarkdownFile();
                break;
            case 'p':
                e.preventDefault();
                togglePreview();
                break;
            case 'e':
                e.preventDefault();
                openSettings();
                break;
        }
    }
}

// Load saved settings on startup
document.addEventListener('DOMContentLoaded', () => {
    try {
        const savedSettings = localStorage.getItem('marp-pwa-settings');
        if (savedSettings) {
            currentSettings = { ...currentSettings, ...JSON.parse(savedSettings) };
        }
    } catch (error) {
        console.error('Failed to load saved settings:', error);
    }
});
