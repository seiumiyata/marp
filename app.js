document.addEventListener('DOMContentLoaded', () => {
    // Check for necessary libraries
    if (typeof Marp === 'undefined' || typeof CodeMirror === 'undefined') {
        alert('必要なライブラリの読み込みに失敗しました。ページをリロードしてください。');
        return;
    }

    // --- State Management ---
    let marp = new Marp({ html: true });
    let currentSlide = 0;
    let slideCount = 0;
    let settings = { theme: 'default' };

    // --- DOM Elements ---
    const editorElement = document.getElementById('markdown-editor');
    const previewElement = document.getElementById('preview-content');
    const slideCounterElement = document.getElementById('slide-counter');
    const statusElement = document.getElementById('editor-status');

    // --- Initialize Editor ---
    const editor = CodeMirror.fromTextArea(editorElement, {
        mode: 'markdown',
        theme: 'material-darker',
        lineNumbers: true,
        lineWrapping: true,
    });

    // --- Core Functions ---
    const updatePreview = () => {
        const markdown = editor.getValue();
        try {
            const { html, css } = marp.render(`---\ntheme: ${settings.theme}\n---\n\n${markdown}`);
            previewElement.innerHTML = `<style>${css}</style>${html}`;

            const slides = previewElement.querySelectorAll('.marp-slide');
            slideCount = slides.length;
            
            slides.forEach((slide, index) => {
                slide.style.display = (index === currentSlide) ? '' : 'none';
            });

            updateStatus();
        } catch (e) {
            previewElement.innerHTML = `<div class="error">プレビューの生成に失敗しました: ${e.message}</div>`;
        }
    };

    const updateStatus = () => {
        slideCounterElement.textContent = `${currentSlide + 1} / ${slideCount || 1}`;
        statusElement.textContent = `${editor.getValue().length} 文字`;
    };

    const changeSlide = (delta) => {
        const newSlide = currentSlide + delta;
        if (newSlide >= 0 && newSlide < slideCount) {
            currentSlide = newSlide;
            updatePreview();
        }
    };

    // --- Event Listeners ---
    editor.on('change', updatePreview);
    
    document.getElementById('prev-slide').addEventListener('click', () => changeSlide(-1));
    document.getElementById('next-slide').addEventListener('click', () => changeSlide(1));

    // Settings Modal
    const settingsModal = document.getElementById('settings-modal');
    document.getElementById('settings-btn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('settings-close-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
    document.getElementById('apply-settings-btn').addEventListener('click', () => {
        settings.theme = document.getElementById('theme-select').value;
        updatePreview();
        settingsModal.classList.add('hidden');
    });

    // Export Logic
    const exportBtn = document.getElementById('export-btn');
    const exportOptions = document.getElementById('export-options');
    exportBtn.addEventListener('click', () => exportOptions.classList.toggle('hidden'));
    document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportOptions.contains(e.target)) {
            exportOptions.classList.add('hidden');
        }
    });

    document.getElementById('save-md-btn').addEventListener('click', () => {
        const blob = new Blob([editor.getValue()], { type: 'text/markdown' });
        downloadBlob(blob, 'presentation.md');
    });
    
    document.getElementById('export-html').addEventListener('click', () => {
        const { html, css } = marp.render(`---\ntheme: ${settings.theme}\n---\n\n${editor.getValue()}`);
        const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        downloadBlob(blob, 'presentation.html');
    });

    document.getElementById('export-pdf').addEventListener('click', () => {
        const { html, css } = marp.render(`---\ntheme: ${settings.theme}\n---\n\n${editor.getValue()}`);
        const element = document.createElement('div');
        element.innerHTML = `<style>${css}</style>${html}`;
        html2pdf().from(element).set({ filename: 'presentation.pdf' }).save();
    });

    document.getElementById('export-pptx').addEventListener('click', () => {
        const pptx = new PptxGenJS();
        const slides = previewElement.querySelectorAll('.marp-slide');
        slides.forEach(slide => {
            const pptxSlide = pptx.addSlide();
            const text = slide.innerText || ' ';
            pptxSlide.addText(text, { x: 0.5, y: 0.25, w: '90%', h: '90%', fontSize: 18 });
        });
        pptx.writeFile({ fileName: 'presentation.pptx' });
    });

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Initial Load ---
    const initialMarkdown = "# ようこそ！\n\n---\n\n## これはMarp PWAエディタです\n\n- Markdownでスライドを書けます\n- リアルタイムでプレビューされます";
    editor.setValue(initialMarkdown);
    updatePreview();

    // --- Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    }
});
