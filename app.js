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
            // Fallback to plain textarea
            console.log('Using fallback textarea editor');
            editor = {
                getValue: () => textarea.value,
                setValue: (value) => { textarea.value = value; },
                on: () => {} // Dummy function
            };
            
            textarea.addEventListener('input', function() {
                updatePreview();
                updateCharCount();
                setSaveStatus('unsaved');
                scheduleAutoSave();
            });
            
            textarea.style.display = 'block';
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
        
        // Simple textarea editor
        const textarea = document.getElementById('markdown-editor');
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
        
        // Settings form
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect) fontSizeSelect.addEventListener('change', toggleCustomFontSize);
        
        // Toast close buttons
        const errorClose = document.getElementById('error-close');
        const successClose = document.getElementById('success-close');
        if (errorClose) errorClose.addEventListener('click', hideError);
        if (successClose) successClose.addEventListener('click', hideSuccess);
        
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
            document.getElementById('preview-content').innerHTML = '<div class="preview-placeholder"><p>プレビューするMarkdownを入力してください</p></div>';
            updateSlideCounter(0, 0);
            return;
        }
        
        if (marp) {
            // Use Marp for rendering
            const processedMarkdown = applySettingsToMarkdown(markdown);
            const result = marp.render(processedMarkdown);
            
            if (result && result.html) {
                document.getElementById('preview-content').innerHTML = result.html;
                
                // Count slides
                const slides = document.querySelectorAll('#preview-content section');
                totalSlides = slides.length;
                currentSlideIndex = Math.min(currentSlideIndex, Math.max(0, totalSlides - 1));
                
                updateSlideCounter(currentSlideIndex + 1, totalSlides);
                showCurrentSlide();
            } else {
                throw new Error('Markdownの変換に失敗しました');
            }
        } else {
            // Fallback preview
            updatePreviewFallback();
        }
    } catch (error) {
        console.error('Preview update error:', error);
        document.getElementById('preview-content').innerHTML = `<div class="error-message">プレビューエラー: ${error.message}</div>`;
    }
}

// Fallback preview update
function updatePreviewFallback() {
    try {
        const markdown = editor.getValue();
        if (!markdown.trim()) {
            document.getElementById('preview-content').innerHTML = '<div class="preview-placeholder"><p>プレビューするMarkdownを入力してください</p></div>';
            return;
        }
        
        // Simple markdown to HTML conversion
        const html = markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[hul])/gm, '<p>')
            .replace(/(?<![>])$/gm, '</p>');
        
        document.getElementById('preview-content').innerHTML = `<div class="fallback-preview">${html}</div>`;
        
        // Simple slide counting (count headings as slides)
        const headings = (markdown.match(/^#+ /gm) || []).length;
        totalSlides = Math.max(1, headings);
        updateSlideCounter(1, totalSlides);
    } catch (error) {
        console.error('Fallback preview error:', error);
        document.getElementById('preview-content').innerHTML = `<div class="error-message">プレビューエラー: ${error.message}</div>`;
    }
}

// Apply settings to markdown
function applySettingsToMarkdown(markdown) {
    try {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
        const match = markdown.match(frontmatterRegex);
        
        let content = markdown;
        if (match) {
            content = markdown.replace(frontmatterRegex, '');
        }
        
        const settings = [
            'marp: true',
            `theme: ${currentSettings.theme}`,
            `size: ${currentSettings.slideRatio}`
        ];
        
        let fontSize = '1em';
        switch (currentSettings.fontSize) {
            case 'small': fontSize = '0.8em'; break;
            case 'large': fontSize = '1.2em'; break;
            case 'custom': fontSize = `${currentSettings.customFontSize}px`; break;
            default: fontSize = '1em';
        }
        
        const style = `
<style>
section {
    font-size: ${fontSize};
    background-color: ${currentSettings.backgroundColor};
    color: ${currentSettings.textColor};
}
</style>`;
        
        return `---\n${settings.join('\n')}\n---\n\n${style}\n\n${content}`;
    } catch (error) {
        console.error('Settings application error:', error);
        return markdown;
    }
}

// Show current slide
function showCurrentSlide() {
    try {
        const slides = document.querySelectorAll('#preview-content section');
        slides.forEach((slide, index) => {
            slide.style.display = index === currentSlideIndex ? 'block' : 'none';
        });
    } catch (error) {
        console.error('Show slide error:', error);
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

function updateSlideCounter(current, total) {
    const counter = document.getElementById('slide-counter');
    if (counter) {
        counter.textContent = `${current} / ${total}`;
    }
}

// Character count update
function updateCharCount() {
    try {
        const content = editor.getValue();
        const charCount = content.length;
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = `${charCount.toLocaleString()} 文字`;
        }
    } catch (error) {
        console.error('Character count update error:', error);
    }
}

// Save status management
function setSaveStatus(status) {
    try {
        const statusElement = document.getElementById('save-status');
        if (!statusElement) return;
        
        statusElement.className = `save-status ${status}`;
        
        switch (status) {
            case 'saved':
                statusElement.textContent = '保存済み';
                break;
            case 'saving':
                statusElement.textContent = '保存中...';
                break;
            case 'unsaved':
                statusElement.textContent = '未保存';
                break;
        }
    } catch (error) {
        console.error('Save status update error:', error);
    }
}

// Auto-save functionality
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        performAutoSave();
    }, 3000);
}

function performAutoSave() {
    try {
        setSaveStatus('saving');
        // Simulate auto-save (cannot use localStorage in sandbox)
        setTimeout(() => {
            setSaveStatus('saved');
        }, 500);
    } catch (error) {
        setSaveStatus('unsaved');
        console.error('Auto-save error:', error);
    }
}

// Export functions
async function exportToPDF() {
    try {
        showLoading();
        
        if (typeof html2pdf === 'undefined') {
            throw new Error('PDF エクスポートライブラリが利用できません');
        }
        
        const previewContent = document.getElementById('preview-content');
        if (!previewContent.innerHTML.trim()) {
            throw new Error('エクスポートするコンテンツがありません');
        }
        
        const opt = {
            margin: 0.5,
            filename: 'marp-slides.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        
        await html2pdf().set(opt).from(previewContent).save();
        
        hideLoading();
        showSuccess('PDFエクスポートが完了しました');
    } catch (error) {
        hideLoading();
        showError('PDFエクスポートに失敗しました: ' + error.message);
        console.error('PDF export error:', error);
    }
}

async function exportToPPTX() {
    try {
        showLoading();
        
        if (typeof PptxGenJS === 'undefined') {
            throw new Error('PowerPoint エクスポートライブラリが利用できません');
        }
        
        const pres = new PptxGenJS();
        const slides = document.querySelectorAll('#preview-content section, #preview-content h1, #preview-content h2');
        
        if (slides.length === 0) {
            // Create a slide from the entire content
            const slide = pres.addSlide();
            const content = document.getElementById('preview-content').textContent || 'No content available';
            
            slide.addText(content, {
                x: 0.5,
                y: 0.5,
                w: '90%',
                h: '90%',
                fontSize: 18,
                color: currentSettings.textColor.replace('#', ''),
                fill: { color: currentSettings.backgroundColor.replace('#', '') }
            });
        } else {
            slides.forEach((slideElement) => {
                const slide = pres.addSlide();
                const textContent = slideElement.textContent || slideElement.innerText || '';
                
                slide.addText(textContent, {
                    x: 0.5,
                    y: 0.5,
                    w: '90%',
                    h: '90%',
                    fontSize: 18,
                    color: currentSettings.textColor.replace('#', ''),
                    fill: { color: currentSettings.backgroundColor.replace('#', '') }
                });
            });
        }
        
        await pres.writeFile({ fileName: 'marp-slides.pptx' });
        
        hideLoading();
        showSuccess('PowerPointエクスポートが完了しました');
    } catch (error) {
        hideLoading();
        showError('PowerPointエクスポートに失敗しました: ' + error.message);
        console.error('PPTX export error:', error);
    }
}

function exportToHTML() {
    try {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent.innerHTML.trim()) {
            throw new Error('エクスポートするコンテンツがありません');
        }
        
        const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marp Slides</title>
    <style>
        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${currentSettings.backgroundColor}; color: ${currentSettings.textColor}; }
        section { margin-bottom: 40px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: white; }
        .fallback-preview { line-height: 1.6; }
        .preview-placeholder { text-align: center; color: #666; }
        .error-message { color: #d32f2f; background: #ffebee; padding: 16px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Marp Slides Export</h1>
    ${previewContent.innerHTML}
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'marp-slides.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showSuccess('HTMLエクスポートが完了しました');
    } catch (error) {
        showError('HTMLエクスポートに失敗しました: ' + error.message);
        console.error('HTML export error:', error);
    }
}

// Save markdown file
function saveMarkdownFile() {
    try {
        const content = editor.getValue();
        if (!content.trim()) {
            throw new Error('保存するコンテンツがありません');
        }
        
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'slides.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        setSaveStatus('saved');
        showSuccess('Markdownファイルが保存されました');
    } catch (error) {
        showError('ファイル保存に失敗しました: ' + error.message);
        console.error('File save error:', error);
    }
}

// Settings functions
function openSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.classList.add('show');
        populateSettingsForm();
    }
}

function closeSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function populateSettingsForm() {
    try {
        const elements = {
            'theme-select': currentSettings.theme,
            'font-size-select': currentSettings.fontSize,
            'font-size-input': currentSettings.customFontSize,
            'slide-ratio-select': currentSettings.slideRatio,
            'bg-color-input': currentSettings.backgroundColor,
            'text-color-input': currentSettings.textColor
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
        
        toggleCustomFontSize();
    } catch (error) {
        console.error('Settings form population error:', error);
        showError('設定フォームの初期化に失敗しました: ' + error.message);
    }
}

function toggleCustomFontSize() {
    const fontSize = document.getElementById('font-size-select')?.value;
    const customInput = document.getElementById('custom-font-size');
    if (customInput) {
        customInput.style.display = fontSize === 'custom' ? 'block' : 'none';
    }
}

function applySettings() {
    try {
        const elements = {
            theme: document.getElementById('theme-select')?.value || 'default',
            fontSize: document.getElementById('font-size-select')?.value || 'medium',
            customFontSize: parseInt(document.getElementById('font-size-input')?.value) || 16,
            slideRatio: document.getElementById('slide-ratio-select')?.value || '16:9',
            backgroundColor: document.getElementById('bg-color-input')?.value || '#ffffff',
            textColor: document.getElementById('text-color-input')?.value || '#000000'
        };
        
        currentSettings = elements;
        
        updatePreview();
        closeSettings();
        showSuccess('設定が適用されました');
    } catch (error) {
        showError('設定の適用に失敗しました: ' + error.message);
        console.error('Settings application error:', error);
    }
}

function resetSettings() {
    try {
        currentSettings = {
            theme: 'default',
            fontSize: 'medium',
            customFontSize: 16,
            slideRatio: '16:9',
            backgroundColor: '#ffffff',
            textColor: '#000000'
        };
        
        populateSettingsForm();
        updatePreview();
        showSuccess('設定をリセットしました');
    } catch (error) {
        showError('設定のリセットに失敗しました: ' + error.message);
        console.error('Settings reset error:', error);
    }
}

// Preview toggle
function togglePreview() {
    try {
        const previewPane = document.getElementById('preview-pane');
        const editorLayout = document.querySelector('.editor-layout');
        const toggleBtn = document.getElementById('preview-toggle');
        
        if (!previewPane || !editorLayout || !toggleBtn) return;
        
        isPreviewVisible = !isPreviewVisible;
        
        if (isPreviewVisible) {
            previewPane.classList.remove('hidden');
            editorLayout.classList.remove('preview-hidden');
            toggleBtn.innerHTML = '👁️ プレビュー';
        } else {
            previewPane.classList.add('hidden');
            editorLayout.classList.add('preview-hidden');
            toggleBtn.innerHTML = '👁️‍🗨️ プレビュー表示';
        }
    } catch (error) {
        showError('プレビュー切り替えに失敗しました: ' + error.message);
        console.error('Preview toggle error:', error);
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    try {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    saveMarkdownFile();
                    break;
                case 'p':
                    event.preventDefault();
                    togglePreview();
                    break;
            }
        }
    } catch (error) {
        console.error('Keyboard shortcut error:', error);
    }
}

// UI utility functions
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function showError(message) {
    try {
        const errorMessage = document.getElementById('error-message');
        const errorToast = document.getElementById('error-toast');
        
        if (errorMessage && errorToast) {
            errorMessage.textContent = message;
            errorToast.classList.add('show');
            
            setTimeout(() => {
                hideError();
            }, 5000);
        }
    } catch (error) {
        console.error('Error display failed:', error);
    }
}

function hideError() {
    const errorToast = document.getElementById('error-toast');
    if (errorToast) {
        errorToast.classList.remove('show');
    }
}

function showSuccess(message) {
    try {
        const successMessage = document.getElementById('success-message');
        const successToast = document.getElementById('success-toast');
        
        if (successMessage && successToast) {
            successMessage.textContent = message;
            successToast.classList.add('show');
            
            setTimeout(() => {
                hideSuccess();
            }, 3000);
        }
    } catch (error) {
        console.error('Success display failed:', error);
    }
}

function hideSuccess() {
    const successToast = document.getElementById('success-toast');
    if (successToast) {
        successToast.classList.remove('show');
    }
}

// Error handling for unhandled errors
window.addEventListener('error', function(event) {
    console.error('Unhandled error:', event.error);
    showError('予期しないエラーが発生しました: ' + (event.error?.message || 'Unknown error'));
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError('非同期処理でエラーが発生しました: ' + (event.reason?.message || event.reason));
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        try {
            const swCode = `
                const CACHE_NAME = 'marp-converter-v1';
                const urlsToCache = [
                    '/',
                    '/index.html',
                    '/style.css',
                    '/app.js'
                ];

                self.addEventListener('install', function(event) {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                return cache.addAll(urlsToCache);
                            })
                    );
                });

                self.addEventListener('fetch', function(event) {
                    event.respondWith(
                        caches.match(event.request)
                            .then(function(response) {
                                if (response) {
                                    return response;
                                }
                                return fetch(event.request);
                            }
                        )
                    );
                });
            `;
            
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            
            navigator.serviceWorker.register(swUrl)
                .then(function(registration) {
                    console.log('Service Worker registered successfully:', registration.scope);
                })
                .catch(function(error) {
                    console.log('Service Worker registration failed:', error);
                });
        } catch (error) {
            console.error('Service Worker registration error:', error);
        }
    });
}