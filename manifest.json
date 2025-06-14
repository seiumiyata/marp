// 簡単で堅牢なMarp PWAエディター
(function() {
    'use strict';
    
    // アプリケーション状態
    const state = {
        isSlideMode: true,
        currentSlide: 0,
        slides: [],
        elements: {}
    };
    
    // デフォルトコンテンツ
    const defaultMarkdown = `---
marp: true
theme: default
---

# Marp PWA エディター
Markdownからスライドを作成

---

## 機能紹介
- **リアルタイムプレビュー**
- **スライド⇔Markdown表示切り替え**
- **PDF/PPTX/HTML出力**
- **自動保存**

---

## 使い方
1. 左ペインでMarkdownを編集
2. 右ペインでプレビュー確認
3. プレビューモードを切り替え
4. エクスポートで保存

---

# はじめましょう！
素晴らしいスライドを作成してください 🎉`;

    // DOM要素を取得
    function getElements() {
        const ids = [
            'loading', 'errorDisplay', 'app', 'markdownEditor', 'previewContent', 
            'previewTitle', 'charCount', 'slideCounter', 'prevSlide', 'nextSlide',
            'saveBtn', 'exportBtn', 'settingsBtn', 'previewToggle',
            'exportModal', 'settingsModal', 'closeExport', 'closeSettings',
            'exportPdf', 'exportPptx', 'exportHtml', 'exportMarkdown', 'applySettings'
        ];
        
        ids.forEach(id => {
            state.elements[id] = document.getElementById(id);
        });
    }
    
    // 文字数カウント更新
    function updateCharCount() {
        const editor = state.elements.markdownEditor;
        const counter = state.elements.charCount;
        if (editor && counter) {
            counter.textContent = `${editor.value.length}文字`;
        }
    }
    
    // MarkdownをHTMLに変換
    function markdownToHtml(markdown) {
        if (!markdown) return '';
        
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/^(.*)$/m, '<p>$1</p>')
            .replace(/<p><h([1-6])>/g, '<h$1>')
            .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
            .replace(/<p><ul>/g, '<ul>')
            .replace(/<\/ul><\/p>/g, '</ul>');
    }
    
    // スライドに分割
    function splitIntoSlides(markdown) {
        const slides = markdown.split(/^---\s*$/m);
        return slides.filter(slide => slide.trim()).map(slide => markdownToHtml(slide.trim()));
    }
    
    // プレビュー更新
    function updatePreview() {
        const editor = state.elements.markdownEditor;
        const preview = state.elements.previewContent;
        
        if (!editor || !preview) return;
        
        const markdown = editor.value;
        
        if (state.isSlideMode) {
            // スライドモード
            state.slides = splitIntoSlides(markdown);
            
            // 現在のスライドインデックス調整
            if (state.currentSlide >= state.slides.length) {
                state.currentSlide = Math.max(0, state.slides.length - 1);
            }
            
            // スライド表示
            const slideContent = state.slides[state.currentSlide] || '<p>スライドがありません</p>';
            preview.innerHTML = `<div class="slide-wrapper"><section class="basic-slide">${slideContent}</section></div>`;
            
            // スライドカウンター表示
            updateSlideCounter();
            showSlideControls();
        } else {
            // Markdownモード
            const html = markdownToHtml(markdown);
            preview.innerHTML = `<div class="markdown-preview">${html}</div>`;
            hideSlideControls();
        }
    }
    
    // スライドカウンター更新
    function updateSlideCounter() {
        const counter = state.elements.slideCounter;
        if (counter) {
            const total = Math.max(1, state.slides.length);
            const current = Math.max(1, state.currentSlide + 1);
            counter.textContent = `${current} / ${total}`;
        }
    }
    
    // スライドコントロール表示
    function showSlideControls() {
        ['slideCounter', 'prevSlide', 'nextSlide'].forEach(id => {
            const el = state.elements[id];
            if (el) el.style.display = 'inline-block';
        });
    }
    
    // スライドコントロール非表示
    function hideSlideControls() {
        ['slideCounter', 'prevSlide', 'nextSlide'].forEach(id => {
            const el = state.elements[id];
            if (el) el.style.display = 'none';
        });
    }
    
    // プレビューモード切り替え
    function togglePreviewMode() {
        state.isSlideMode = !state.isSlideMode;
        
        const toggleBtn = state.elements.previewToggle;
        const title = state.elements.previewTitle;
        
        if (toggleBtn) {
            toggleBtn.textContent = state.isSlideMode ? '📝 Markdown表示' : '🎯 スライド表示';
            toggleBtn.className = state.isSlideMode ? 'btn btn--primary btn--sm' : 'btn btn--secondary btn--sm';
        }
        
        if (title) {
            title.textContent = state.isSlideMode ? 'スライドプレビュー' : 'Markdownプレビュー';
        }
        
        updatePreview();
        showMessage(state.isSlideMode ? 'スライド表示モードに切り替えました' : 'Markdown表示モードに切り替えました');
    }
    
    // 前のスライド
    function previousSlide() {
        if (state.isSlideMode && state.currentSlide > 0) {
            state.currentSlide--;
            updatePreview();
        }
    }
    
    // 次のスライド
    function nextSlide() {
        if (state.isSlideMode && state.currentSlide < state.slides.length - 1) {
            state.currentSlide++;
            updatePreview();
        }
    }
    
    // ファイルダウンロード
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Markdown保存
    function saveMarkdown() {
        const editor = state.elements.markdownEditor;
        if (editor) {
            downloadFile(editor.value, 'slides.md', 'text/markdown');
            showMessage('Markdownファイルを保存しました');
        }
    }
    
    // PDF出力
    function exportToPDF() {
        window.print();
        showMessage('印刷ダイアログを開きました');
        hideModal('exportModal');
    }
    
    // PPTX出力（テキスト形式）
    function exportToPPTX() {
        const editor = state.elements.markdownEditor;
        if (editor) {
            const slides = editor.value.split(/^---\s*$/m).filter(s => s.trim());
            const content = slides.map((slide, i) => `===== スライド ${i + 1} =====\n${slide.trim()}\n`).join('\n');
            downloadFile(content, 'slides-content.txt', 'text/plain');
            showMessage('スライドコンテンツをテキスト形式で保存しました');
        }
        hideModal('exportModal');
    }
    
    // HTML出力
    function exportToHTML() {
        const editor = state.elements.markdownEditor;
        if (editor) {
            const slides = splitIntoSlides(editor.value);
            const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marp Slides</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 2rem; background: #f5f5f5; }
        .slide { background: white; margin: 2rem auto; padding: 3rem; border-radius: 8px; 
                 box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 900px; min-height: 500px; }
        h1 { font-size: 2.5rem; color: #333; }
        h2 { font-size: 2rem; color: #444; }
        h3 { font-size: 1.5rem; color: #555; }
        strong { color: #2c5aa0; }
        @media print { .slide { page-break-after: always; margin: 0; box-shadow: none; } }
    </style>
</head>
<body>
    ${slides.map(slide => `<div class="slide">${slide}</div>`).join('')}
</body>
</html>`;
            downloadFile(html, 'slides.html', 'text/html');
            showMessage('HTMLファイルを保存しました');
        }
        hideModal('exportModal');
    }
    
    // モーダル表示
    function showModal(id) {
        const modal = state.elements[id];
        if (modal) modal.classList.remove('hidden');
    }
    
    // モーダル非表示
    function hideModal(id) {
        const modal = state.elements[id];
        if (modal) modal.classList.add('hidden');
    }
    
    // メッセージ表示
    function showMessage(text, type = 'success') {
        const msg = document.createElement('div');
        msg.textContent = text;
        msg.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 3000;
            padding: 12px 16px; border-radius: 8px; font-size: 14px;
            background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
        `;
        document.body.appendChild(msg);
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 3000);
    }
    
    // イベントリスナー設定
    function setupEvents() {
        const { elements } = state;
        
        // エディター入力
        if (elements.markdownEditor) {
            elements.markdownEditor.addEventListener('input', () => {
                updateCharCount();
                updatePreview();
            });
        }
        
        // ボタンクリック
        if (elements.prevSlide) elements.prevSlide.addEventListener('click', previousSlide);
        if (elements.nextSlide) elements.nextSlide.addEventListener('click', nextSlide);
        if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveMarkdown);
        if (elements.exportBtn) elements.exportBtn.addEventListener('click', () => showModal('exportModal'));
        if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', () => showModal('settingsModal'));
        if (elements.previewToggle) elements.previewToggle.addEventListener('click', togglePreviewMode);
        
        // モーダル
        if (elements.closeExport) elements.closeExport.addEventListener('click', () => hideModal('exportModal'));
        if (elements.closeSettings) elements.closeSettings.addEventListener('click', () => hideModal('settingsModal'));
        
        // エクスポート
        if (elements.exportPdf) elements.exportPdf.addEventListener('click', exportToPDF);
        if (elements.exportPptx) elements.exportPptx.addEventListener('click', exportToPPTX);
        if (elements.exportHtml) elements.exportHtml.addEventListener('click', exportToHTML);
        if (elements.exportMarkdown) elements.exportMarkdown.addEventListener('click', saveMarkdown);
        
        // 設定
        if (elements.applySettings) elements.applySettings.addEventListener('click', () => {
            hideModal('settingsModal');
            showMessage('設定を適用しました');
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    saveMarkdown();
                } else if (e.key === 'p') {
                    e.preventDefault();
                    togglePreviewMode();
                }
            }
            if (e.key === 'Escape') {
                hideModal('exportModal');
                hideModal('settingsModal');
            }
        });
    }
    
    // アプリケーション初期化
    function initApp() {
        try {
            console.log('アプリケーションを初期化しています...');
            
            // DOM要素取得
            getElements();
            
            // 初期コンテンツ設定
            if (state.elements.markdownEditor) {
                state.elements.markdownEditor.value = defaultMarkdown;
                updateCharCount();
            }
            
            // イベント設定
            setupEvents();
            
            // 初期プレビュー
            updatePreview();
            
            // アプリ表示
            if (state.elements.loading) state.elements.loading.style.display = 'none';
            if (state.elements.errorDisplay) state.elements.errorDisplay.classList.add('hidden');
            if (state.elements.app) state.elements.app.style.display = 'flex';
            
            console.log('アプリケーションの初期化が完了しました');
            showMessage('アプリケーションが正常に起動しました');
            
        } catch (error) {
            console.error('初期化エラー:', error);
            
            // エラー表示
            if (state.elements.loading) state.elements.loading.style.display = 'none';
            if (state.elements.errorDisplay) {
                state.elements.errorDisplay.classList.remove('hidden');
                const errorMsg = document.getElementById('errorMessage');
                if (errorMsg) errorMsg.textContent = '初期化に失敗しました: ' + error.message;
            }
        }
    }
    
    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
    
    // グローバル参照
    window.MarpApp = { initApp, togglePreviewMode, showMessage };
    
})();
